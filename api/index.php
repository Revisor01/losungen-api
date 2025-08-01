<?php
/**
 * Losungen API - Database Version
 * Serves daily readings from database instead of scraping
 */

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

require_once 'database.php';

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

// Simple Rate Limiting
function checkRateLimit() {
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $rateLimitFile = '/tmp/rate_limit_' . md5($clientIp);
    
    if (file_exists($rateLimitFile)) {
        $data = json_decode(file_get_contents($rateLimitFile), true);
        $now = time();
        
        // Reset nach 1 Stunde
        if ($now - $data['start'] > 3600) {
            unlink($rateLimitFile);
            return true;
        }
        
        // Maximal 100 Requests pro Stunde
        if ($data['count'] >= 100) {
            return false;
        }
        
        $data['count']++;
        file_put_contents($rateLimitFile, json_encode($data));
    } else {
        file_put_contents($rateLimitFile, json_encode(['start' => time(), 'count' => 1]));
    }
    
    return true;
}

class LosungenService {
    private $db;
    private $bibleserverApiKey;
    
    public function __construct() {
        $this->db = getDatabase();
        $this->bibleserverApiKey = $_ENV['BIBLESERVER_API_KEY'] ?? null;
    }
    
    public function getDailyLosung($date = null, $translation = 'LUT') {
        try {
            // Use today if no date specified
            if (!$date) {
                $date = date('Y-m-d');
            }
            
            // Validate date format
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                return $this->errorResponse('Invalid date format. Use YYYY-MM-DD');
            }
            
            // Get base Losung data from database
            $losungData = $this->getLosungFromDatabase($date);
            
            if (!$losungData) {
                return $this->errorResponse('Losung nicht gefunden für Datum: ' . $date);
            }
            
            // If translation requested other than LUT, enhance with scraper
            if ($translation !== 'LUT') {
                $losungData = $this->enhanceWithTranslations($losungData, $translation);
            }
            
            // Bibelstellen über ERF Bibleserver API in gewünschter Übersetzung laden
            if ($this->bibleserverApiKey) {
                $losungData = $this->enhanceWithBibleserver($losungData, $translation);
            }
            
            logDocker("Successfully served Losung for $date from database with translation $translation");
            
            return $this->successResponse($losungData);
            
        } catch (Exception $e) {
            logDocker("ERROR: " . $e->getMessage());
            return $this->errorResponse('Fehler beim Laden der Losung: ' . $e->getMessage());
        }
    }
    
    private function getLosungFromDatabase($date) {
        $stmt = $this->db->prepare("
            SELECT 
                date,
                weekday,
                holiday,
                ot_text,
                ot_reference,
                nt_text,
                nt_reference
            FROM losungen 
            WHERE date = ?
        ");
        
        $stmt->execute([$date]);
        $losung = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$losung) {
            // Try to find closest available date
            $stmt = $this->db->prepare("
                SELECT 
                    date,
                    weekday, 
                    holiday,
                    ot_text,
                    ot_reference,
                    nt_text,
                    nt_reference
                FROM losungen 
                WHERE ABS(EXTRACT(EPOCH FROM (date - ?::date))) = (
                    SELECT MIN(ABS(EXTRACT(EPOCH FROM (date - ?::date))))
                    FROM losungen
                )
                LIMIT 1
            ");
            
            $stmt->execute([$date, $date]);
            $losung = $stmt->fetch(PDO::FETCH_ASSOC);
        }
        
        if (!$losung) {
            return null;
        }
        
        // Format response to match existing API structure
        return [
            'date' => $losung['date'],
            'formatted_date' => $this->formatGermanDate($losung['date'], $losung['weekday']),
            'weekday' => $losung['weekday'],
            'holiday' => $losung['holiday'],
            
            // Old Testament (Losung)
            'losung' => [
                'text' => $losung['ot_text'],
                'reference' => $losung['ot_reference'],
                'testament' => 'AT',
                'translation_source' => 'Herrnhuter Losungen 2025'
            ],
            
            // New Testament (Lehrtext)
            'lehrtext' => [
                'text' => $losung['nt_text'],
                'reference' => $losung['nt_reference'],
                'testament' => 'NT', 
                'translation_source' => 'Herrnhuter Losungen 2025'
            ],
            
            'source' => 'Herrnhuter Losungen 2025',
            'fetched_at' => date('c')
        ];
    }
    
    private function formatGermanDate($date, $weekday) {
        $germanMonths = [
            1 => 'Januar', 2 => 'Februar', 3 => 'März', 4 => 'April',
            5 => 'Mai', 6 => 'Juni', 7 => 'Juli', 8 => 'August', 
            9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Dezember'
        ];
        
        $dateObj = new DateTime($date);
        $day = $dateObj->format('j');
        $month = $germanMonths[(int)$dateObj->format('n')];
        $year = $dateObj->format('Y');
        
        return "$weekday, $day. $month $year";
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
    
    private function enhanceWithTranslations($data, $translation) {
        // Use Python scraper for different translations
        $pythonScript = '/var/www/html/scraper.py';
        
        if (!file_exists($pythonScript)) {
            logDocker("[LOSUNGEN] WARNING: Python scraper not found, using German text only");
            return $data;
        }
        
        logDocker("[LOSUNGEN] Using Python scraper for translation: $translation");
        
        // Create temporary data in scraper format
        $tempData = [
            'losung' => [
                'reference' => $data['losung']['reference'],
                'text' => $data['losung']['text']
            ],
            'lehrtext' => [
                'reference' => $data['lehrtext']['reference'], 
                'text' => $data['lehrtext']['text']
            ]
        ];
        
        // Execute Python script with translation parameter
        $output = shell_exec("/opt/venv/bin/python3 $pythonScript " . escapeshellarg($translation) . " 2>&1");
        
        if ($output) {
            $scrapedData = json_decode($output, true);
            if ($scrapedData && !isset($scrapedData['error'])) {
                // Use scraped translations if available
                if (isset($scrapedData['losung'])) {
                    $data['losung']['text'] = $scrapedData['losung']['text'] ?? $data['losung']['text'];
                    $data['losung']['translation_source'] = $scrapedData['losung']['translation_source'] ?? $data['losung']['translation_source'];
                }
                if (isset($scrapedData['lehrtext'])) {
                    $data['lehrtext']['text'] = $scrapedData['lehrtext']['text'] ?? $data['lehrtext']['text'];
                    $data['lehrtext']['translation_source'] = $scrapedData['lehrtext']['translation_source'] ?? $data['lehrtext']['translation_source'];
                }
                
                logDocker("[LOSUNGEN] Successfully enhanced with translations from scraper");
            } else {
                logDocker("[LOSUNGEN] WARNING: Scraper failed, using German text");
            }
        }
        
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
}

// Main execution
try {
    // API-Key prüfen
    if (!validateApiKey()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Ungültiger API-Key'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Rate Limiting prüfen
    if (!checkRateLimit()) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => 'Rate Limit erreicht. Versuche es später erneut.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Service erstellen und Losung laden
    $service = new LosungenService();
    $date = $_GET['date'] ?? null;
    $translation = $_GET['translation'] ?? 'LUT';
    
    $result = $service->getDailyLosung($date, $translation);
    
    if ($result['success']) {
        echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        http_response_code(400);
        echo json_encode($result, JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    logDocker("FATAL ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal Server Error'
    ], JSON_UNESCAPED_UNICODE);
}
?>