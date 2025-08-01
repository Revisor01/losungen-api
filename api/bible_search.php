<?php
/**
 * Bible Search API - Erweiterte Bibeltext-Suche
 * Unterstützt Einzelverse, Versbereiche und verschiedene Übersetzungen
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once 'auth.php';
require_once 'database.php';

/**
 * Testament-Erkennung basierend auf Buchnamen
 */
function detectTestament($bookName) {
    $ntBooks = [
        'matthäus', 'markus', 'lukas', 'johannes',
        'apostelgeschichte', 'apg', 'römer', 'rö', 'röm',
        '1 korinther', '1kor', '1. korinther', '1 kor', '1. kor',
        '2 korinther', '2kor', '2. korinther', '2 kor', '2. kor',
        'galater', 'gal', 'epheser', 'eph', 'philipper', 'phil',
        'kolosser', 'kol', '1 thessalonicher', '1thess', '1. thessalonicher',
        '1 thess', '1. thess', '2 thessalonicher', '2thess', '2. thessalonicher',
        '2 thess', '2. thess', '1 timotheus', '1tim', '1. timotheus',
        '1 tim', '1. tim', '2 timotheus', '2tim', '2. timotheus',
        '2 tim', '2. tim', 'titus', 'tit', 'philemon', 'phlm',
        'hebräer', 'hebr', 'jakobus', 'jak', '1 petrus', '1petr',
        '1. petrus', '1 petr', '1. petr', '2 petrus', '2petr',
        '2. petrus', '2 petr', '2. petr', '1 johannes', '1joh',
        '1. johannes', '1 joh', '1. joh', '2 johannes', '2joh',
        '2. johannes', '2 joh', '2. joh', '3 johannes', '3joh',
        '3. johannes', '3 joh', '3. joh', 'judas', 'jud',
        'offenbarung', 'offb', 'off'
    ];
    
    $cleanBook = strtolower(str_replace(['.', ' '], '', $bookName));
    
    foreach ($ntBooks as $ntBook) {
        $cleanNt = strtolower(str_replace(['.', ' '], '', $ntBook));
        if ($cleanBook === $cleanNt || strpos($cleanBook, $cleanNt) === 0) {
            return 'NT';
        }
    }
    
    return 'AT';
}

// API-Key validieren
if (!validateApiKey()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid or missing API key',
        'timestamp' => date('c')
    ]);
    exit;
}

class BibleSearchAPI {
    private $db;
    private $supportedTranslations = [
        // Deutsche Übersetzungen  
        'LUT', 'ELB', 'HFA', 'SLT', 'ZB', 'GNB', 'NGÜ', 'EU', 'NLB', 'VXB', 'NeÜ', 'BIGS',
        // Funktionierende Fremdsprachen
        'NIV', 'ESV', 'LSG',
        // Weitere Fremdsprachen
        'NLT', 'MSG', 'CEV', 'GNT', 'NKJV', 'KJV', 'NASB', 'CSB', 
        'BDS', 'S21', 'RVR60', 'NVI', 'DHH', 'RVR95', 'LBLA', 'NVT'
    ];
    
    public function __construct() {
        $this->db = new LosungenDatabase();
    }
    
    /**
     * Hauptsuchfunktion für Bibeltexte
     */
    public function searchBibleText($reference, $translation = 'LUT', $format = 'json') {
        try {
            // Parameter validieren
            if (!$reference || !$translation) {
                return $this->errorResponse('Missing required parameters: reference and translation');
            }
            
            if (!in_array($translation, $this->supportedTranslations)) {
                return $this->errorResponse('Unsupported translation: ' . $translation);
            }
            
            // Parse Bibelstelle
            $parsedRef = $this->parseReference($reference);
            if (!$parsedRef) {
                return $this->errorResponse('Invalid reference format: ' . $reference);
            }
            
            // Suche in Cache (für heutige Losungen)
            $cachedResult = $this->searchInCache($parsedRef, $translation);
            if ($cachedResult) {
                // Formatierung auch für Cache-Ergebnisse anwenden
                $formattedCached = $this->formatResult($cachedResult, $format);
                
                // Für text/markdown/html Formate: direkte Ausgabe ohne JSON wrapper
                if (in_array($format, ['text', 'markdown', 'html'])) {
                    // Header für entsprechendes Format setzen
                    if ($format === 'html') {
                        header('Content-Type: text/html; charset=utf-8');
                    } else {
                        header('Content-Type: text/plain; charset=utf-8');
                    }
                    echo $formattedCached;
                    exit;
                }
                
                return $this->successResponse($formattedCached, 'database_cache');
            }
            
            // Live-Scraping ausführen
            $scrapedResult = $this->scrapeReference($parsedRef, $translation);
            if (!$scrapedResult) {
                return $this->errorResponse('Failed to retrieve text for: ' . $reference);
            }
            
            // Testament-Erkennung für Live-Scraping
            if (isset($scrapedResult['testament'])) {
                $scrapedResult['testament'] = detectTestament($parsedRef['book']);
            }
            
            // Formatierung anwenden
            $formattedResult = $this->formatResult($scrapedResult, $format);
            
            // Für text/markdown/html Formate: direkte Ausgabe ohne JSON wrapper
            if (in_array($format, ['text', 'markdown', 'html'])) {
                // Header für entsprechendes Format setzen
                if ($format === 'html') {
                    header('Content-Type: text/html; charset=utf-8');
                } else {
                    header('Content-Type: text/plain; charset=utf-8');
                }
                echo $formattedResult;
                exit;
            }
            
            return $this->successResponse($formattedResult, 'live_scraping');
            
        } catch (Exception $e) {
            return $this->errorResponse('Search failed: ' . $e->getMessage());
        }
    }
    
    /**
     * Parse Bibelstellen-Referenz
     */
    private function parseReference($reference) {
        // Unterstützte Formate:
        // - "Johannes 3,16"
        // - "1. Korinther 13,4-8"  
        // - "Psalm 23,1-6"
        // - "Römer 8,28-29"
        
        $pattern = '/^(.+?)\s+(\d+),(\d+)(?:-(\d+))?$/u';
        if (preg_match($pattern, trim($reference), $matches)) {
            return [
                'book' => trim($matches[1]),
                'chapter' => (int)$matches[2],
                'start_verse' => (int)$matches[3],
                'end_verse' => isset($matches[4]) ? (int)$matches[4] : (int)$matches[3],
                'original' => $reference
            ];
        }
        
        return null;
    }
    
    /**
     * Suche im Cache (translation_cache Tabelle)
     */
    private function searchInCache($parsedRef, $translation) {
        // Nur für heutige Losungen verfügbar
        $today = date('Y-m-d');
        
        // Suche nach passendem Eintrag
        $cacheResult = $this->db->getTranslation($today, $translation);
        if (!$cacheResult) {
            return null;
        }
        
        // Prüfe ob die Referenz mit Losung oder Lehrtext übereinstimmt
        $losungRef = $this->parseReference($cacheResult['losung_reference'] ?? '');
        $lehrtextRef = $this->parseReference($cacheResult['lehrtext_reference'] ?? '');
        
        if ($this->referencesMatch($parsedRef, $losungRef)) {
            return [
                'reference' => $parsedRef['original'],
                'text' => $cacheResult['losung_text'],
                'translation' => [
                    'code' => $translation,
                    'name' => $cacheResult['translation_name'],
                    'language' => $cacheResult['language']
                ],
                'source' => $cacheResult['losung_source'] ?? 'Database Cache',
                'url' => $cacheResult['losung_url'],
                'testament' => detectTestament($parsedRef['book']),
                'cached_at' => $cacheResult['created_at']
            ];
        }
        
        if ($this->referencesMatch($parsedRef, $lehrtextRef)) {
            return [
                'reference' => $parsedRef['original'],
                'text' => $cacheResult['lehrtext_text'],
                'translation' => [
                    'code' => $translation,
                    'name' => $cacheResult['translation_name'],
                    'language' => $cacheResult['language']
                ],
                'source' => $cacheResult['lehrtext_source'] ?? 'Database Cache',
                'url' => $cacheResult['lehrtext_url'],
                'testament' => detectTestament($parsedRef['book']),
                'cached_at' => $cacheResult['created_at']
            ];
        }
        
        return null;
    }
    
    /**
     * Live-Scraping ausführen
     */
    private function scrapeReference($parsedRef, $translation) {
        $pythonScript = '/var/www/html/bible_scraper.py';
        
        if (!file_exists($pythonScript)) {
            throw new Exception('Bible scraper not found');
        }
        
        // Python-Scraper mit erweiterten Parametern aufrufen
        $command = "/opt/venv/bin/python3 $pythonScript " . 
                  escapeshellarg($parsedRef['original']) . " " .
                  escapeshellarg($translation) . " 2>&1";
        
        $output = shell_exec($command);
        
        if (!$output) {
            throw new Exception('No output from bible scraper');
        }
        
        $data = json_decode($output, true);
        
        if (!$data || isset($data['error'])) {
            $error = isset($data['error']) ? $data['error'] : 'JSON decode failed';
            throw new Exception($error);
        }
        
        return $data;
    }
    
    /**
     * Vergleiche zwei Referenzen
     */
    private function referencesMatch($ref1, $ref2) {
        if (!$ref1 || !$ref2) return false;
        
        return $ref1['book'] === $ref2['book'] &&
               $ref1['chapter'] === $ref2['chapter'] &&
               $ref1['start_verse'] === $ref2['start_verse'] &&
               $ref1['end_verse'] === $ref2['end_verse'];
    }
    
    /**
     * Formatiere Ergebnis je nach gewünschtem Format
     */
    private function formatResult($result, $format) {
        switch ($format) {
            case 'text':
                return $result['text'];
                
            case 'markdown':
                $text = $result['text'] ?? 'Kein Text verfügbar';
                $ref = $result['reference'] ?? 'Unbekannte Referenz';
                $translation = $result['translation']['name'] ?? $result['translation']['code'] ?? 'Unbekannte Übersetzung';
                
                return "## {$ref}\n\n> {$text}\n\n*— {$translation}*";
                
            case 'html':
                $text = htmlspecialchars($result['text']);
                $ref = htmlspecialchars($result['reference']);
                $translation = htmlspecialchars($result['translation']['name'] ?? $result['translation']['code']);
                
                return "<div class=\"bible-verse\">\n" .
                       "  <h3 class=\"reference\">{$ref}</h3>\n" .
                       "  <blockquote class=\"text\">{$text}</blockquote>\n" .
                       "  <footer class=\"translation\">{$translation}</footer>\n" .
                       "</div>";
                
            case 'json':
            default:
                return $result;
        }
    }
    
    private function successResponse($data, $source = null) {
        $response = [
            'success' => true,
            'data' => $data,
            'timestamp' => date('c')
        ];
        
        if ($source) {
            $response['source'] = $source;
        }
        
        return $response;
    }
    
    private function errorResponse($message) {
        return [
            'success' => false,
            'error' => $message,
            'timestamp' => date('c')
        ];
    }
}

// API Endpunkt verarbeiten
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $reference = $_GET['reference'] ?? null;
    $translation = $_GET['translation'] ?? 'LUT';
    $format = $_GET['format'] ?? 'json';
    
    if (!$reference) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Missing required parameter: reference',
            'timestamp' => date('c'),
            'usage' => 'GET /bible_search.php?reference=Johannes 3,16&translation=LUT&format=json'
        ]);
        exit;
    }
    
    $api = new BibleSearchAPI();
    $result = $api->searchBibleText($reference, $translation, $format);
    
    // Für text/markdown/html Format, Content-Type anpassen
    if ($format === 'text') {
        header('Content-Type: text/plain; charset=utf-8');
        echo $result['success'] ? $result['data'] : $result['error'];
    } elseif ($format === 'markdown') {
        header('Content-Type: text/markdown; charset=utf-8');
        echo $result['success'] ? $result['data'] : '# Error\n\n' . $result['error'];
    } elseif ($format === 'html') {
        header('Content-Type: text/html; charset=utf-8');
        echo $result['success'] ? $result['data'] : '<p>Error: ' . htmlspecialchars($result['error']) . '</p>';
    } else {
        http_response_code($result['success'] ? 200 : 500);
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['reference'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid JSON or missing reference',
            'timestamp' => date('c')
        ]);
        exit;
    }
    
    $api = new BibleSearchAPI();
    $result = $api->searchBibleText(
        $input['reference'],
        $input['translation'] ?? 'LUT',
        $input['format'] ?? 'json'
    );
    
    http_response_code($result['success'] ? 200 : 500);
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed',
        'timestamp' => date('c')
    ]);
}
?>