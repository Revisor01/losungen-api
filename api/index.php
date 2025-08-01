<?php

    function logDocker($message) {
        file_put_contents('php://stdout', "[LOSUNGEN API] $message\n");
    }
    
// Startup logging - only once per process
static $startup_logged = false;
if (!$startup_logged) {
    logDocker("Process started - PID: " . getmypid());
    $startup_logged = true;
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// API-Key Validierung
function validateApiKey() {
    $validApiKeys = [
        $_ENV['API_KEY_1'] ?? 'default-key-1',
        $_ENV['API_KEY_2'] ?? 'default-key-2',
        $_ENV['API_KEY_3'] ?? 'default-key-3'
    ];
    
    // API-Key aus Header oder Query-Parameter
    $providedKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? null;
    
    if (!$providedKey) {
        return false;
    }
    
    return in_array($providedKey, $validApiKeys);
}

// Simple Rate Limiting (verhindert Missbrauch)
function checkRateLimit() {
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateLimitFile = '/tmp/rate_limit_' . md5($clientIp);
    
    if (file_exists($rateLimitFile)) {
        $data = json_decode(file_get_contents($rateLimitFile), true);
        $now = time();
        
        // Reset nach 1 Stunde
        if ($now - $data['timestamp'] > 3600) {
            $data = ['count' => 0, 'timestamp' => $now];
        }
        
        // Max 100 Requests pro Stunde
        if ($data['count'] > 100) {
            return false;
        }
        
        $data['count']++;
    } else {
        $data = ['count' => 1, 'timestamp' => time()];
    }
    
    file_put_contents($rateLimitFile, json_encode($data));
    return true;
}

// Rate Limiting prüfen
if (!checkRateLimit()) {
    
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error' => 'Rate limit exceeded',
        'message' => 'Maximum 100 requests per hour per IP. Please wait.',
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);
    exit;
}

// API-Key prüfen
if (!validateApiKey()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid or missing API key',
        'message' => 'Please provide a valid API key via X-API-Key header or api_key parameter',
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

class LosungenAPI {
    private $losungenUrl = 'https://www.losungen.de/';
    private $bibleserverApiUrl = 'https://www.bibleserver.com/api/parser';
    private $bibleserverApiKey = null; // Wird später über ENV Variable gesetzt
    
    public function __construct() {
        $this->bibleserverApiKey = $_ENV['BIBLESERVER_API_KEY'] ?? null;
    }
    
    public function getDailyLosung($date = null, $translation = 'LUT') {
        try {
            // Losung von der Website scrapen
            $losungData = $this->scrapeLosungFromWebsite($date);
            
            if (!$losungData) {
                return $this->errorResponse('Losung konnte nicht extrahiert werden');
            }
            
            // Bibelstellen über ERF Bibleserver API in gewünschter Übersetzung laden
            if ($this->bibleserverApiKey) {
                $losungData = $this->enhanceWithBibleserver($losungData, $translation);
            }
            
            return $this->successResponse($losungData);
            
        } catch (Exception $e) {
            return $this->errorResponse('Fehler beim Laden der Losung: ' . $e->getMessage());
        }
    }
    
    private function scrapeLosungFromWebsite($date = null) {
        // Use Python scraper instead of PHP DOM parsing
        $pythonScript = '/var/www/html/scraper.py';
        
        if (!file_exists($pythonScript)) {
            logDocker("[LOSUNGEN] ERROR: Python scraper not found: $pythonScript");
            return null;
        }
        
        // Execute Python script with translation parameter
        $translation = $_GET['translation'] ?? 'LUT';
        logDocker("[LOSUNGEN] Executing Python scraper for $translation");
        
        $output = shell_exec("/opt/venv/bin/python3 $pythonScript " . escapeshellarg($translation) . " 2>&1");
        
        if (!$output) {
            logDocker("[LOSUNGEN] ERROR: No output from Python scraper for $translation");
            return null;
        }
        
        // Parse JSON output from Python script
        $data = json_decode($output, true);
        
        if (!$data || isset($data['error'])) {
            $error = isset($data['error']) ? $data['error'] : 'JSON decode failed';
            logDocker("[LOSUNGEN] ERROR: Scraping failed for $translation: $error");
            return null;
        }
        
        // Log successful scraping with data source
        $sources = [];
        if (isset($data['losung']['translation_source'])) {
            $sources[] = $data['losung']['translation_source'];
        }
        if (isset($data['lehrtext']['translation_source'])) {
            $sources[] = $data['lehrtext']['translation_source'];
        }
        
        $sourceInfo = implode(', ', array_unique($sources));
        logDocker("[LOSUNGEN] Successfully scraped $translation from: $sourceInfo");
        
        return $data;
    }
    
    private function enhanceWithBibleserver($data, $translation) {
        if (!$this->bibleserverApiKey) {
            return $data;
        }
        
        // Losung über Bibleserver API in gewünschter Übersetzung laden
        if (!empty($data['losung']['reference'])) {
            $losungUrl = $this->buildBibleserverUrl($data['losung']['reference'], $translation);
            $data['losung']['bibleserver_url'] = $losungUrl;
        }
        
        // Lehrtext über Bibleserver API in gewünschter Übersetzung laden
        if (!empty($data['lehrtext']['reference'])) {
            $lehrtextUrl = $this->buildBibleserverUrl($data['lehrtext']['reference'], $translation);
            $data['lehrtext']['bibleserver_url'] = $lehrtextUrl;
        }
        
        $data['translation'] = $translation;
        
        return $data;
    }
    
    private function buildBibleserverUrl($reference, $translation) {
        // Bibelstelle für URL formatieren
        $reference = str_replace(' ', '', $reference);
        $reference = str_replace(',', ',', $reference);
        
        // Umlaute für URL kodieren
        $reference = str_replace('ä', 'ae', $reference);
        $reference = str_replace('ö', 'oe', $reference);
        $reference = str_replace('ü', 'ue', $reference);
        $reference = str_replace('Ä', 'Ae', $reference);
        $reference = str_replace('Ö', 'Oe', $reference);
        $reference = str_replace('Ü', 'Ue', $reference);
        $reference = str_replace('ß', 'ss', $reference);
        
        // URL-encode für Sonderzeichen
        $reference = urlencode($reference);
        
        return "https://www.bibleserver.com/{$translation}/{$reference}";
    }
    
    
    private function successResponse($data) {
        return [
            'success' => true,
            'data' => $data,
            'timestamp' => date('c')
        ];
    }
    
    private function errorResponse($message) {
        return [
            'success' => false,
            'error' => $message,
            'timestamp' => date('c')
        ];
    }
}

// API Endpunkt
$method = $_SERVER['REQUEST_METHOD'];
$translation = $_GET['translation'] ?? 'LUT';
$date = $_GET['date'] ?? null;
$debug = $_GET['debug'] ?? false;
$all = $_GET['all'] ?? false;
$fetch = $_GET['fetch'] ?? false;

// Alle verfügbaren Übersetzungen (werden vom Python-Script validiert)
$validTranslations = [
    // Deutsche Übersetzungen  
    'LUT', 'ELB', 'HFA', 'SLT', 'ZB', 'GNB', 'NGÜ', 'EU', 'NLB', 'VXB', 'NeÜ', 'BIGS',
    // Funktionierende Fremdsprachen
    'NIV', 'ESV', 'LSG',
    // Weitere Fremdsprachen
    'NLT', 'MSG', 'CEV', 'GNT', 'NKJV', 'KJV', 'NASB', 'CSB', 
    'BDS', 'S21', 'RVR60', 'NVI', 'DHH', 'RVR95', 'LBLA', 'NVT'
];

// Validierung erfolgt im Python-Script, hier nur Fallback
if (!in_array($translation, $validTranslations)) {
    $translation = 'LUT';
}

if ($method === 'GET') {
    $api = new LosungenAPI();
    
    // Debug-Modus: HTML-Quelltext anzeigen
    if ($debug) {
        $html = file_get_contents('https://www.losungen.de/', false, stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => [
                    'User-Agent: Mozilla/5.0 (compatible; LosungenAPI/1.0)',
                    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                ]
            ]
        ]));
        
        header('Content-Type: text/html; charset=utf-8');
        echo htmlspecialchars($html);
        exit;
    }
    
    
    // Manueller Fetch-Trigger
    if ($fetch) {
        $fetchDate = $date ?? date('Y-m-d');
        
        // Führe das Daily-Fetch Skript aus
        $startTime = microtime(true);
        $command = "/usr/local/bin/php /var/www/html/scripts/daily_fetch.php " . escapeshellarg($fetchDate) . " 2>&1";
        $output = shell_exec($command);
        $duration = round((microtime(true) - $startTime), 2);
        
        $result = [
            'success' => true,
            'action' => 'manual_fetch',
            'date' => $fetchDate,
            'duration_seconds' => $duration,
            'output' => $output,
            'timestamp' => date('c')
        ];
        
        // Log manual fetch
        logDocker("[LOSUNGEN] Manual Fetch triggered for date: $fetchDate");
        
        http_response_code(200);
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    // Alle Übersetzungen abrufen
    if ($all || $translation === 'all') {
        $allResults = [];
        $errors = [];
        
        foreach ($validTranslations as $trans) {
            try {
                $result = $api->getDailyLosung($date, $trans);
                if ($result['success']) {
                    $allResults[$trans] = $result['data'];
                } else {
                    $errors[$trans] = $result['error'];
                }
                
                // Kurze Pause zwischen Anfragen um Server zu schonen
                usleep(500000); // 0.5 Sekunden
                
            } catch (Exception $e) {
                $errors[$trans] = $e->getMessage();
            }
        }
        
        $finalResult = [
            'success' => true,
            'data' => [
                'date' => $allResults['LUT']['date'] ?? date('Y-m-d'),
                'translations' => $allResults,
                'total_translations' => count($allResults),
                'errors' => $errors
            ],
            'timestamp' => date('c')
        ];
        
        // All translations request
        logDocker("[LOSUNGEN] All translations requested - got " . count($allResults) . " translations");
        
        http_response_code(200);
        echo json_encode($finalResult, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    } else {
        // Einzelne Übersetzung abrufen
        // Prüfe zuerst Datenbank, dann Live-Fetch
        $checkDate = $date ?? date('Y-m-d'); // Use today if no date specified
        if ($checkDate) {
            require_once 'database.php';
            $db = new LosungenDatabase();
            $cachedResult = $db->getTranslation($checkDate, $translation);
            
            if ($cachedResult) {
                // Database cache hit
                logDocker("[LOSUNGEN] Cache hit from database for $translation on $checkDate");
                
                $result = [
                    'success' => true,
                    'data' => $cachedResult,
                    'source' => 'database_cache',
                    'timestamp' => date('c')
                ];
                
                http_response_code(200);
                echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                exit;
            }
        }
        
        // Fallback: Live-Fetch von Websites
        logDocker("[LOSUNGEN] No cache found - triggering live fetch for $translation on $checkDate");
        $result = $api->getDailyLosung($date, $translation);
        
        http_response_code($result['success'] ? 200 : 500);
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed',
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);
}
?>