<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/database.php';

// API Key validation
$apiKeys = [
    $_ENV['API_KEY_1'] ?? 'ksadh8324oijcff45rfdsvcvhoids44',
    $_ENV['API_KEY_2'] ?? '',
    $_ENV['API_KEY_3'] ?? ''
];

$providedKey = $_GET['api_key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
$validKey = false;

foreach ($apiKeys as $key) {
    if (!empty($key) && $providedKey === $key) {
        $validKey = true;
        break;
    }
}

if (!$validKey) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid or missing API key',
        'message' => 'Please provide a valid API key via X-API-Key header or api_key parameter'
    ]);
    exit;
}

// Admin actions
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'status':
            echo json_encode(getSystemStatus());
            break;
            
        case 'fetch':
            $translation = $_GET['translation'] ?? 'LUT';
            echo json_encode(manualFetch($translation));
            break;
            
        case 'clear_cache':
            echo json_encode(clearCache());
            break;
            
        case 'cron_status':
            echo json_encode(getCronStatus());
            break;
            
        default:
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid action',
                'available_actions' => ['status', 'fetch', 'clear_cache', 'cron_status']
            ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Admin error: ' . $e->getMessage()
    ]);
}

function getSystemStatus() {
    $status = [
        'success' => true,
        'data' => [
            'server_time' => date('Y-m-d H:i:s'),
            'timezone' => date_default_timezone_get(),
            'php_version' => PHP_VERSION,
            'memory_usage' => memory_get_usage(true),
            'memory_limit' => ini_get('memory_limit'),
            'disk_space' => [
                'free' => disk_free_space('.'),
                'total' => disk_total_space('.')
            ]
        ]
    ];
    
    // Database status
    try {
        require_once 'database.php';
        $db = getDatabase();
        $stmt = $db->query("SELECT COUNT(*) as count FROM translation_cache");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $status['data']['database'] = [
            'connected' => true,
            'cache_entries' => $result['count']
        ];
    } catch (Exception $e) {
        $status['data']['database'] = [
            'connected' => false,
            'error' => $e->getMessage()
        ];
    }
    
    return $status;
}

function manualFetch($translation = 'LUT') {
    $startTime = microtime(true);
    
    try {
        // Execute Python scraper
        $command = "cd " . __DIR__ . " && python3 scraper.py " . escapeshellarg($translation);
        $output = shell_exec($command);
        
        $endTime = microtime(true);
        $duration = round(($endTime - $startTime) * 1000);
        
        return [
            'success' => true,
            'data' => [
                'translation' => $translation,
                'duration_ms' => $duration,
                'output' => $output,
                'timestamp' => date('Y-m-d H:i:s')
            ],
            'message' => "Manual fetch completed for $translation in {$duration}ms"
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Fetch failed: ' . $e->getMessage()
        ];
    }
}

function clearCache() {
    try {
        require_once 'database.php';
        $db = getDatabase();
        
        // Clear today's cache only
        $today = date('Y-m-d');
        $stmt = $db->prepare("DELETE FROM translation_cache WHERE date = ?");
        $stmt->execute([$today]);
        $deleted = $stmt->rowCount();
        
        return [
            'success' => true,
            'data' => [
                'deleted_entries' => $deleted,
                'date' => $today
            ],
            'message' => "Cleared $deleted cache entries for today"
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => 'Cache clear failed: ' . $e->getMessage()
        ];
    }
}

function getCronStatus() {
    $cronFile = __DIR__ . '/../scripts/cron_status.php';
    
    if (file_exists($cronFile)) {
        $lastRun = filemtime($cronFile);
        $timeSince = time() - $lastRun;
        
        return [
            'success' => true,
            'data' => [
                'last_run' => date('Y-m-d H:i:s', $lastRun),
                'seconds_ago' => $timeSince,
                'status' => $timeSince < 3600 ? 'active' : 'inactive', // 1 hour threshold
                'next_expected' => date('Y-m-d H:i:s', $lastRun + 3600) // Assuming hourly
            ]
        ];
    } else {
        return [
            'success' => true,
            'data' => [
                'last_run' => 'never',
                'status' => 'unknown',
                'message' => 'Cron status file not found'
            ]
        ];
    }
}
?>