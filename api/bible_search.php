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
require_once 'redis_cache.php';

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
    private $cache;
    private $supportedTranslations = [
        // Deutsche Übersetzungen  
        'LUT', 'ELB', 'HFA', 'SLT', 'ZB', 'GNB', 'NGÜ', 'EU', 'NLB', 'VXB', 'NeÜ', 'BIGS',
        // Funktionierende Fremdsprachen
        'NIV', 'ESV', 'LSG',
        // Weitere Fremdsprachen
        'NLT', 'MSG', 'CEV', 'GNT', 'NKJV', 'KJV', 'NASB', 'CSB', 
        'BDS', 'S21', 'RVR60', 'NVI', 'DHH', 'RVR95', 'LBLA'
    ];
    
    public function __construct() {
        $this->db = new LosungenDatabase();
        $this->cache = new RedisCache();
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
                // Bei Parsing-Fehlern nicht cachen - könnte später behoben werden
                return $this->errorResponse('Invalid reference format: ' . $reference);
            }
            
            // 1. Redis Cache-Suche
            $redisResult = $this->cache->get($reference, $translation);
            if ($redisResult) {
                // Formatierung für Redis-Cache-Ergebnisse anwenden
                $formattedRedis = $this->formatResult($redisResult, $format);
                
                // Für text/markdown/html Formate: direkte Ausgabe ohne JSON wrapper
                if (in_array($format, ['text', 'markdown', 'html'])) {
                    if ($format === 'html') {
                        header('Content-Type: text/html; charset=utf-8');
                    } else {
                        header('Content-Type: text/plain; charset=utf-8');
                    }
                    echo $formattedRedis;
                    exit;
                }
                
                // Für JSON: normale Antwort
                echo json_encode([
                    'success' => true,
                    'data' => $formattedRedis,
                    'source' => 'Redis Cache',
                    'timestamp' => date('c')
                ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                exit;
            }
            
            // 2. Suche in PostgreSQL Cache (für heutige Losungen)
            $cachedResult = $this->searchInCache($parsedRef, $translation);
            if ($cachedResult) {
                // Speichere auch im Redis Cache für nächstes Mal (nur bei erfolgreichen Ergebnissen)
                if (!isset($cachedResult['error']) && !empty($cachedResult['text'])) {
                    $this->cache->set($reference, $translation, $cachedResult);
                }
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
            
            // Testament-Erkennung für Live-Scraping - verwende Testament aus parsedRef falls vorhanden
            if (!isset($scrapedResult['testament']) || empty($scrapedResult['testament'])) {
                $scrapedResult['testament'] = $parsedRef['testament'] ?? detectTestament($parsedRef['book']);
            }
            
            // Speichere nur erfolgreiche Ergebnisse im Redis Cache
            if ($scrapedResult && !isset($scrapedResult['error']) && !empty($scrapedResult['text'])) {
                $this->cache->set($reference, $translation, $scrapedResult);
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
     * Parse Bibelstellen-Referenz mit DB-Abkürzungen
     */
    private function parseReference($reference) {
        // Unterstützte Formate:
        // - "Johannes 3,16"
        // - "1. Korinther 13,4-8"  
        // - "Psalm 23,1-6"
        // - "Römer 8,28-29"
        // - "Mt 5,1" (mit DB-Abkürzungen)
        // - "2. Mose 16,2–3.11–18" (komplexere Referenzen)
        // - "Phil 3,(4b–6)7–14" (mit optionalen Versen in Klammern)
        // - "2. Sam 12,1–10.13–15a" (mit Buchstaben-Suffixen)
        
        $originalReference = $reference;
        
        // Finde optionale Verse in Klammern mit a/b-Suffixen
        $optionalVerses = [];
        $optionalSuffixes = []; // z.B. ['19' => 'b'] für 19b
        
        if (preg_match_all('/\(([^)]+)\)/', $reference, $parenthesesMatches)) {
            foreach ($parenthesesMatches[1] as $match) {
                // Extrahiere Verse mit Suffixen aus Klammern (z.B. "19b-22" aus "(19b-22)")
                if (preg_match_all('/(\d+)([a-z])?(?:[-–](\d+)([a-z])?)?/', $match, $verseMatches)) {
                    foreach ($verseMatches[0] as $idx => $vm) {
                        $start = (int)$verseMatches[1][$idx];
                        $startSuffix = $verseMatches[2][$idx] ?? '';
                        $end = !empty($verseMatches[3][$idx]) ? (int)$verseMatches[3][$idx] : $start;
                        $endSuffix = $verseMatches[4][$idx] ?? '';
                        
                        // Behandle Verse mit Suffixen
                        if ($startSuffix) {
                            $optionalSuffixes[$start] = $startSuffix;
                            $optionalVerses[] = $start;
                        }
                        
                        for ($v = $start; $v <= $end; $v++) {
                            if ($v == $start && $startSuffix) continue; // Bereits hinzugefügt
                            $optionalVerses[] = $v;
                            if ($v == $end && $endSuffix) {
                                $optionalSuffixes[$v] = $endSuffix;
                            }
                        }
                    }
                }
            }
            
            // Behandle verschiedene Klammer-Positionen
            
            // Fall 1: Klammern in der Mitte "(4b-6)7-14" -> wird zu "4-14"
            if (preg_match('/\((\d+)[a-z]?[-–](\d+)[a-z]?\)(\d+)[-–](\d+)/', $reference, $matches)) {
                $klammerStart = (int)$matches[1];
                $klammerEnd = (int)$matches[2];
                $restStart = (int)$matches[3];
                $restEnd = (int)$matches[4];
                
                $newStart = min($klammerStart, $restStart);
                $newEnd = max($klammerEnd, $restEnd);
                
                $reference = preg_replace('/\(\d+[a-z]?[-–]\d+[a-z]?\)\d+[-–]\d+/', $newStart . '-' . $newEnd, $reference);
            }
            // Fall 2: Klammern mit weiterem Vers "7-14(15-18)19" -> wird zu "7-19"
            elseif (preg_match('/(\d+)[-–](\d+)\((\d+)[-–](\d+)\)(\d+)/', $reference, $matches)) {
                $firstStart = (int)$matches[1];  // 7
                $firstEnd = (int)$matches[2];    // 14
                $klammerStart = (int)$matches[3]; // 15
                $klammerEnd = (int)$matches[4];   // 18
                $lastVerse = (int)$matches[5];    // 19
                
                $newStart = min($firstStart, $klammerStart, $lastVerse);
                $newEnd = max($firstEnd, $klammerEnd, $lastVerse);
                
                $reference = preg_replace('/\d+[-–]\d+\(\d+[-–]\d+\)\d+/', $newStart . '-' . $newEnd, $reference);
            }
            // Fall 3: Klammern am Ende "1-8(9-12)" -> wird zu "1-12" 
            elseif (preg_match('/(\d+)[-–](\d+)\((\d+)[-–](\d+)\)/', $reference, $matches)) {
                $mainStart = (int)$matches[1];  // 1
                $mainEnd = (int)$matches[2];    // 8
                $klammerStart = (int)$matches[3]; // 9
                $klammerEnd = (int)$matches[4];   // 12
                
                // Die Klammern enthalten weitere Verse, also erweitere den Bereich
                $newStart = min($mainStart, $klammerStart);
                $newEnd = max($mainEnd, $klammerEnd);
                
                $reference = preg_replace('/\d+[-–]\d+\(\d+[-–]\d+\)/', $newStart . '-' . $newEnd, $reference);
            }
            // Fall 3: Klammern am Anfang "(1-3)4-8" -> wird zu "1-8"
            elseif (preg_match('/\((\d+)[-–](\d+)\)(\d+)[-–](\d+)/', $reference, $matches)) {
                $klammerStart = (int)$matches[1];
                $klammerEnd = (int)$matches[2];
                $mainStart = (int)$matches[3];
                $mainEnd = (int)$matches[4];
                
                $newStart = min($klammerStart, $mainStart);
                $newEnd = max($klammerEnd, $mainEnd);
                
                $reference = preg_replace('/\(\d+[-–]\d+\)\d+[-–]\d+/', $newStart . '-' . $newEnd, $reference);
            }
            else {
                // Für andere Fälle, entferne einfach die Klammern
                $reference = preg_replace('/\([^)]+\)/', '', $reference);
            }
        }
        
        // Behandle speziellen Fall: Punkt vor Klammern "1-3.6-8.(10-12)"
        $reference = preg_replace('/\.(\([\d\-–]+\))/', '$1', $reference);
        
        // Erfasse Buchstaben-Suffixe bevor wir sie entfernen (für Johannes 3,16a-19.21b-24)
        // Suffixe in regulären Bereichen (nicht in Klammern)
        $suffixes = []; // Speichert alle Suffixe inkl. der aus Klammern
        
        // Finde alle Verse mit Suffixen außerhalb von Klammern
        preg_match_all('/(\d+)([a-z])(?=[-–\.]|$)/', $reference, $suffixMatches, PREG_SET_ORDER);
        foreach ($suffixMatches as $match) {
            $verseNum = (int)$match[1];
            $suffix = $match[2];
            $suffixes[$verseNum] = $suffix;
        }
        
        // Kombiniere mit optionalen Suffixen aus Klammern
        $suffixes = array_merge($suffixes, $optionalSuffixes);
        
        // Entferne Buchstaben-Suffixe von Versen (z.B. 15a → 15)
        $reference = preg_replace('/(\d+)[a-z]/', '$1', $reference);
        
        // Normalisiere Leerzeichen
        $reference = preg_replace('/\s+/', ' ', trim($reference));
        
        // Prüfe zuerst auf mehrfache Punkt-getrennte Bereiche (Mt 1, 1-3.5-8.12-16)
        if (preg_match('/^(.+?)\s+(\d+),\s*(.+)$/u', $reference, $baseMatch)) {
            $bookInput = trim($baseMatch[1]);
            $chapter = (int)$baseMatch[2];
            $versePart = trim($baseMatch[3]);
            
            // Prüfe ob es mehrere Punkt-getrennte Bereiche gibt
            if (strpos($versePart, '.') !== false && preg_match_all('/(\d+)(?:[-–](\d+))?/', $versePart, $rangeMatches, PREG_SET_ORDER)) {
                if (count($rangeMatches) > 2) {
                    // Mehrfache Bereiche gefunden
                    $resolvedBook = $this->resolveBookAbbreviation($bookInput);
                    $allVerses = [];
                    $excludedVerses = [];
                    
                    // Sammle alle Verse aus allen Bereichen
                    $lastEnd = 0;
                    foreach ($rangeMatches as $range) {
                        $start = (int)$range[1];
                        $end = isset($range[2]) && $range[2] !== '' ? (int)$range[2] : $start;
                        
                        // Füge ausgeschlossene Verse zwischen Bereichen hinzu
                        if ($lastEnd > 0) {
                            for ($v = $lastEnd + 1; $v < $start; $v++) {
                                $excludedVerses[] = $v;
                            }
                        }
                        
                        // Füge Verse des aktuellen Bereichs hinzu
                        for ($v = $start; $v <= $end; $v++) {
                            $allVerses[] = $v;
                        }
                        
                        $lastEnd = $end;
                    }
                    
                    return [
                        'book' => $resolvedBook['name'],
                        'testament' => $resolvedBook['testament'],
                        'chapter' => $chapter,
                        'start_verse' => min($allVerses),
                        'end_verse' => max($allVerses),
                        'excluded_verses' => $excludedVerses,
                        'optional_verses' => $optionalVerses,
                        'optional_suffixes' => $optionalSuffixes,
                        'suffixes' => $suffixes,
                        'original' => $originalReference,
                        'original_book' => $bookInput
                    ];
                }
            }
        }
        
        // Prüfe zuerst auf ganzes Kapitel (Röm 3) 
        if (preg_match('/^(.+?)\s+(\d+)$/u', $reference, $chapterMatch)) {
            $bookInput = trim($chapterMatch[1]);
            $chapter = (int)$chapterMatch[2];
            $resolvedBook = $this->resolveBookAbbreviation($bookInput);
            
            // Für ganze Kapitel verwenden wir 1-999 (wird vom Scraper begrenzt)
            return [
                'book' => $resolvedBook['name'],
                'testament' => $resolvedBook['testament'],
                'chapter' => $chapter,
                'start_verse' => 1,
                'end_verse' => 999, // Scraper wird die tatsächliche Anzahl begrenzen
                'excluded_verses' => [],
                'optional_verses' => $optionalVerses,
                'optional_suffixes' => $optionalSuffixes,
                'suffixes' => $suffixes,
                'original' => $originalReference,
                'original_book' => $bookInput,
                'whole_chapter' => true
            ];
        }
        
        // Erweiterte Patterns für normale Referenzen - Reihenfolge wichtig!
        $patterns = [
            // Komplexe Referenzen mit Punkten und Leerzeichen: "Joh 8, 8-12.14-17"
            '/^(.+?)\s+(\d+),\s*(\d+)[-–](\d+)\.(\d+)[-–](\d+)$/u',
            // Komplexe Referenzen mit Punkten ohne Leerzeichen: "Johannes 3,16-18.20-22"
            '/^(.+?)\s+(\d+),(\d+)[-–](\d+)\.(\d+)[-–](\d+)$/u',
            // Ohne Leerzeichen zwischen Buch und Kapitel, komplex: "Mt4,1-3.6-9"
            '/^([^\d]+)(\d+),(\d+)[-–](\d+)\.(\d+)[-–](\d+)$/u',
            // Mit Leerzeichen nach Komma und Bindestrich: "Ps 107, 1-9"
            '/^(.+?)\s+(\d+),\s+(\d+)[-–](\d+)$/u',
            // Mit Leerzeichen nach Komma: "Markus 3, 16"
            '/^(.+?)\s+(\d+),\s+(\d+)$/u',
            // Standard mit Bindestrich: "Buch Kapitel,Vers-Vers"  
            '/^(.+?)\s+(\d+),(\d+)[-–](\d+)$/u',
            // Ohne Leerzeichen zwischen Buch und Kapitel: "Mt4,1-9"
            '/^([^\d]+)(\d+),(\d+)[-–](\d+)$/u',
            // Standard einzeln: "Buch Kapitel,Vers"
            '/^(.+?)\s+(\d+),(\d+)$/u',
            // Ohne Leerzeichen einzeln: "Mt4,1"
            '/^([^\d]+)(\d+),(\d+)$/u',
            // Fallback für alles andere
            '/^(.+?)\s+(\d+),(.+)$/u'
        ];
        
        foreach ($patterns as $pattern) {
            if (preg_match($pattern, trim($reference), $matches)) {
                $bookInput = trim($matches[1]);
                $resolvedBook = $this->resolveBookAbbreviation($bookInput);
                
                $chapter = (int)$matches[2];
                
                // Für alle Formate - bestimme Start- und Endvers
                if (isset($matches[3]) && is_numeric($matches[3])) {
                    $startVerse = (int)$matches[3];
                    $endVerse = $startVerse; // Default: nur ein Vers
                    
                    // Schaue nach Endvers in match[4], [5] oder [6]
                    $excludedVerses = [];
                    if (isset($matches[6]) && is_numeric($matches[6])) {
                        // Komplexe Pattern wie "1-3.6-9" 
                        $firstEnd = (int)$matches[4];   // 3
                        $secondStart = (int)$matches[5]; // 6  
                        $endVerse = (int)$matches[6];   // 9
                        
                        // Berechne ausgelassene Verse (4,5 in diesem Fall)
                        for ($v = $firstEnd + 1; $v < $secondStart; $v++) {
                            $excludedVerses[] = $v;
                        }
                        
                    } elseif (isset($matches[4]) && is_numeric($matches[4])) {
                        // Einfacher Bereich ohne ausgeschlossene Verse
                        $endVerse = (int)$matches[4];
                    }
                    
                    return [
                        'book' => $resolvedBook['name'],
                        'testament' => $resolvedBook['testament'],
                        'chapter' => $chapter,
                        'start_verse' => $startVerse,
                        'end_verse' => $endVerse,
                        'excluded_verses' => $excludedVerses,
                        'optional_verses' => $optionalVerses,
                        'optional_suffixes' => $optionalSuffixes,
                        'suffixes' => $suffixes,
                        'original' => $originalReference,
                        'original_book' => $bookInput
                    ];
                }
                
                // Fallback für nicht-numerische Inhalte
                if (isset($matches[3])) {
                    $versePart = $matches[3];
                    // Extrahiere ersten Vers
                    if (preg_match('/^(\d+)/', $versePart, $verseMatch)) {
                        return [
                            'book' => $resolvedBook['name'],
                            'testament' => $resolvedBook['testament'],
                            'chapter' => $chapter,
                            'start_verse' => (int)$verseMatch[1],
                            'end_verse' => (int)$verseMatch[1],
                            'excluded_verses' => [],
                            'optional_verses' => $optionalVerses,
                            'optional_suffixes' => $optionalSuffixes,
                            'suffixes' => $suffixes,
                            'original' => $originalReference,
                            'original_book' => $bookInput
                        ];
                    }
                }
            }
        }
        
        return null;
    }
    
    /**
     * Löse Buchabkürzung über Datenbank auf und gebe auch Testament zurück
     */
    private function resolveBookAbbreviation($bookInput) {
        try {
            $pdo = getDatabase();
            $stmt = $pdo->prepare("SELECT german_name, testament FROM bible_abbreviations WHERE LOWER(abbreviation) = LOWER(?) OR LOWER(german_name) = LOWER(?)");
            $stmt->execute([$bookInput, $bookInput]);
            $result = $stmt->fetch();
            
            if ($result) {
                return [
                    'name' => $result['german_name'],
                    'testament' => $result['testament']
                ];
            }
            
            return [
                'name' => $bookInput,
                'testament' => detectTestament($bookInput)
            ];
        } catch (Exception $e) {
            error_log("Bible abbreviation resolution failed: " . $e->getMessage());
            return [
                'name' => $bookInput,
                'testament' => detectTestament($bookInput)
            ];
        }
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
                'testament' => $parsedRef['testament'] ?? detectTestament($parsedRef['book']),
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
                'testament' => $parsedRef['testament'] ?? detectTestament($parsedRef['book']),
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
        
        // Für komplexe Referenzen mit ausgeschlossenen Versen
        if (!empty($parsedRef['excluded_verses'])) {
            return $this->scrapeComplexReference($parsedRef, $translation);
        }
        
        // Für Referenzen mit optionalen Versen
        if (!empty($parsedRef['optional_verses'])) {
            return $this->scrapeOptionalReference($parsedRef, $translation);
        }
        
        // Normalisiere Referenz für Python-Scraper (füge Leerzeichen hinzu falls nötig)
        $normalizedRef = $this->normalizeReferenceForScraper($parsedRef);
        
        // Python-Scraper mit normalisierten Parametern aufrufen (inkl. Testament)
        $command = "/opt/venv/bin/python3 $pythonScript " . 
                  escapeshellarg($normalizedRef) . " " .
                  escapeshellarg($translation) . " " .
                  escapeshellarg($parsedRef['testament']) . " 2>&1";
        
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
     * Verarbeite Referenzen mit optionalen Versen in Klammern
     */
    private function scrapeOptionalReference($parsedRef, $translation) {
        $book = $parsedRef['book'];
        $chapter = $parsedRef['chapter'];
        $startVerse = $parsedRef['start_verse'];
        $endVerse = $parsedRef['end_verse'];
        $optionalVerses = $parsedRef['optional_verses'];
        
        // Erstelle Referenz ohne Klammern für Python-Scraper
        $normalizedRef = $this->normalizeReferenceForScraper($parsedRef);
        
        // Python-Scraper aufrufen (inkl. Testament)
        $pythonScript = '/var/www/html/bible_scraper.py';
        $command = "/opt/venv/bin/python3 $pythonScript " . 
                  escapeshellarg($normalizedRef) . " " .
                  escapeshellarg($translation) . " " .
                  escapeshellarg($parsedRef['testament']) . " 2>&1";
        
        $output = shell_exec($command);
        $data = json_decode($output, true);
        
        if (!$data || isset($data['error'])) {
            throw new Exception('Failed to scrape optional reference');
        }
        
        // Markiere optionale Verse in den Daten (ohne Tags im Text)
        if (isset($data['verses']) && is_array($data['verses'])) {
            foreach ($data['verses'] as &$verse) {
                if (in_array($verse['number'], $optionalVerses)) {
                    $verse['optional'] = true;
                } else {
                    $verse['optional'] = false;
                }
            }
        }
        
        // Entferne [OPTIONAL] Tags aus kombiniertem Text - Frontend macht sie kursiv
        if (isset($data['text'])) {
            $data['text'] = preg_replace('/\[OPTIONAL\](.*?)\[\/OPTIONAL\]/s', '$1', $data['text']);
        }
        
        return $data;
    }
    
    /**
     * Verarbeite komplexe Referenzen mit ausgeschlossenen Versen
     */
    private function scrapeComplexReference($parsedRef, $translation) {
        
        $book = $parsedRef['book'];
        $chapter = $parsedRef['chapter'];
        $startVerse = $parsedRef['start_verse'];
        $endVerse = $parsedRef['end_verse'];
        $excludedVerses = $parsedRef['excluded_verses'];
        
        $allVerses = [];
        $combinedText = '';
        
        // Bestimme Vers-Bereiche ohne ausgeschlossene Verse
        $ranges = $this->calculateVerseRanges($startVerse, $endVerse, $excludedVerses);
        
        foreach ($ranges as $range) {
            $simpleRef = "$book $chapter,{$range['start']}";
            if ($range['start'] != $range['end']) {
                $simpleRef .= "-{$range['end']}";
            }
            
            
            // Scrape einzelnen Bereich (inkl. Testament)
            $command = "/opt/venv/bin/python3 /var/www/html/bible_scraper.py " . 
                      escapeshellarg($simpleRef) . " " .
                      escapeshellarg($translation) . " " .
                      escapeshellarg($parsedRef['testament']) . " 2>&1";
            
            $output = shell_exec($command);
            $data = json_decode($output, true);
            
            if ($data && !isset($data['error'])) {
                if (isset($data['verses'])) {
                    foreach ($data['verses'] as $verse) {
                        $verse['excluded'] = false; // Diese Verse sind nicht ausgeschlossen
                        $allVerses[] = $verse;
                    }
                }
                if (!empty($data['text'])) {
                    $combinedText .= ($combinedText ? ' ' : '') . $data['text'];
                }
            }
        }
        
        // Hole auch die ausgeschlossenen Verse vom Scraper
        foreach ($excludedVerses as $excludedVerse) {
            $simpleRef = "$book $chapter,$excludedVerse";
            
            // Scrape einzelnen ausgeschlossenen Vers
            $command = "/opt/venv/bin/python3 /var/www/html/bible_scraper.py " . 
                      escapeshellarg($simpleRef) . " " .
                      escapeshellarg($translation) . " " .
                      escapeshellarg($parsedRef['testament']) . " 2>&1";
            
            $output = shell_exec($command);
            $data = json_decode($output, true);
            
            $verseText = '';
            if ($data && !isset($data['error']) && isset($data['text'])) {
                $verseText = $data['text'];
            }
            
            $verseEntry = [
                'number' => $excludedVerse,
                'text' => $verseText,
                'excluded' => true
            ];
            
            // Füge Suffix hinzu wenn vorhanden
            if (isset($parsedRef['suffixes'][$excludedVerse])) {
                $verseEntry['suffix'] = $parsedRef['suffixes'][$excludedVerse];
            }
            
            $allVerses[] = $verseEntry;
        }
        
        // Sortiere Verse nach Nummer
        usort($allVerses, function($a, $b) {
            return $a['number'] - $b['number'];
        });
        
        return [
            'reference' => $parsedRef['original'],
            'text' => $combinedText,
            'translation' => [
                'code' => $translation,
                'name' => $this->getTranslationName($translation),
                'language' => 'German'
            ],
            'source' => 'ERF Bibleserver (Complex)',
            'url' => $this->generateBibleserverUrl($parsedRef['original'], $translation),
            'testament' => $parsedRef['testament'],
            'verses' => $allVerses
        ];
    }
    
    /**
     * Berechne Vers-Bereiche ohne ausgeschlossene Verse
     */
    private function calculateVerseRanges($startVerse, $endVerse, $excludedVerses) {
        $ranges = [];
        $current = $startVerse;
        
        while ($current <= $endVerse) {
            if (in_array($current, $excludedVerses)) {
                $current++;
                continue;
            }
            
            $rangeStart = $current;
            $rangeEnd = $current;
            
            // Erweitere Bereich bis zum nächsten ausgeschlossenen Vers
            while ($rangeEnd + 1 <= $endVerse && !in_array($rangeEnd + 1, $excludedVerses)) {
                $rangeEnd++;
            }
            
            $ranges[] = ['start' => $rangeStart, 'end' => $rangeEnd];
            $current = $rangeEnd + 1;
        }
        
        return $ranges;
    }
    
    /**
     * Normalisiere Referenz für Python-Scraper (füge Leerzeichen zwischen Buch und Kapitel hinzu)
     */
    private function normalizeReferenceForScraper($parsedRef) {
        $book = $parsedRef['book'];
        $chapter = $parsedRef['chapter'];
        $startVerse = $parsedRef['start_verse'];
        $endVerse = $parsedRef['end_verse'];
        
        // Erstelle normalisierte Referenz mit Leerzeichen
        $normalized = "$book $chapter,$startVerse";
        if ($startVerse != $endVerse) {
            $normalized .= "-$endVerse";
        }
        
        return $normalized;
    }
    
    /**
     * Generiere korrekte Bibleserver-URL (PHP-Port der Python-Funktion)
     */
    private function generateBibleserverUrl($reference, $translation) {
        // Spezialbehandlung für BIGS
        if ($translation === 'BIGS') {
            return $this->generateBigsUrl($reference);
        }
        
        // Parse Referenz
        $pattern = '/^(.+?)\s+(\d+),(\d+)(?:-(\d+))?$/';
        if (!preg_match($pattern, trim($reference), $matches)) {
            // Fallback für ungültige Referenzen
            return "https://www.bibleserver.com/$translation/" . urlencode($reference);
        }
        
        $book = trim($matches[1]);
        $chapter = $matches[2];
        $verse_start = $matches[3];
        $verse_end = isset($matches[4]) ? $matches[4] : null;
        
        // Buchname normalisieren
        $book_normalized = $this->normalizeBibleserverBookName($book);
        
        // Verse-Teil zusammenbauen
        if ($verse_end) {
            $verse_part = "$chapter,$verse_start-$verse_end";
        } else {
            $verse_part = "$chapter,$verse_start";
        }
        
        // URL zusammenbauen
        return "https://www.bibleserver.com/$translation/$book_normalized$verse_part";
    }
    
    /**
     * Normalisiert Buchname für ERF Bibleserver URLs
     */
    private function normalizeBibleserverBookName($book) {
        $book_mappings = [
            // Altes Testament
            '1. Mose' => '1.Mose',
            '2. Mose' => '2.Mose', 
            '3. Mose' => '3.Mose',
            '4. Mose' => '4.Mose',
            '5. Mose' => '5.Mose',
            'Richter' => 'Richter',
            '1. Samuel' => '1.Samuel',
            '2. Samuel' => '2.Samuel', 
            '1. Könige' => '1.Koenige',
            '2. Könige' => '2.Koenige',
            '1. Chronik' => '1.Chronik',
            '2. Chronik' => '2.Chronik',
            'Esra' => 'Esra',
            'Nehemia' => 'Nehemia',
            'Ester' => 'Ester',
            'Hiob' => 'Hiob',
            'Psalm' => 'Psalm',
            'Sprüche' => 'Sprueche',
            'Prediger' => 'Prediger',
            'Hohelied' => 'Hohelied',
            'Jesaja' => 'Jesaja',
            'Jeremia' => 'Jeremia',
            'Klagelieder' => 'Klagelieder',
            'Hesekiel' => 'Hesekiel',
            'Daniel' => 'Daniel',
            'Hosea' => 'Hosea',
            'Joel' => 'Joel',
            'Amos' => 'Amos',
            'Obadja' => 'Obadja',
            'Jona' => 'Jona',
            'Micha' => 'Micha',
            'Nahum' => 'Nahum',
            'Habakuk' => 'Habakuk',
            'Zefanja' => 'Zefanja',
            'Haggai' => 'Haggai',
            'Sacharja' => 'Sacharja',
            'Maleachi' => 'Maleachi',
            
            // Neues Testament
            'Matthäus' => 'Matthaeus',
            'Markus' => 'Markus',
            'Lukas' => 'Lukas',
            'Johannes' => 'Johannes',
            'Apostelgeschichte' => 'Apostelgeschichte',
            'Römer' => 'Roemer',
            '1. Korinther' => '1.Korinther',
            '2. Korinther' => '2.Korinther',
            'Galater' => 'Galater',
            'Epheser' => 'Epheser',
            'Philipper' => 'Philipper',
            'Kolosser' => 'Kolosser',
            '1. Thessalonicher' => '1.Thessalonicher',
            '2. Thessalonicher' => '2.Thessalonicher',
            '1. Timotheus' => '1.Timotheus',
            '2. Timotheus' => '2.Timotheus',
            'Titus' => 'Titus',
            'Philemon' => 'Philemon',
            'Hebräer' => 'Hebraeer',
            'Jakobus' => 'Jakobus',
            '1. Petrus' => '1.Petrus',
            '2. Petrus' => '2.Petrus',
            '1. Johannes' => '1.Johannes',
            '2. Johannes' => '2.Johannes',
            '3. Johannes' => '3.Johannes',
            'Judas' => 'Judas',
            'Offenbarung' => 'Offenbarung'
        ];
        
        return $book_mappings[$book] ?? $book;
    }
    
    /**
     * Generiere BIGS-URL
     */
    private function generateBigsUrl($reference) {
        // Parse Referenz für BIGS
        $pattern = '/^(.+?)\s+(\d+),(\d+)(?:-(\d+))?$/';
        if (!preg_match($pattern, trim($reference), $matches)) {
            return "https://www.bibel-in-gerechter-sprache.de/";
        }
        
        $book = trim($matches[1]);
        $chapter = $matches[2];
        $verse = $matches[3];
        
        // BIGS Buchkürzel
        $book_mappings = [
            'Genesis' => 'Gen', '1. Mose' => 'Gen', 'Exodus' => 'Ex', '2. Mose' => 'Ex',
            'Levitikus' => 'Lev', '3. Mose' => 'Lev', 'Numeri' => 'Num', '4. Mose' => 'Num',
            'Deuteronomium' => 'Dtn', '5. Mose' => 'Dtn', 'Josua' => 'Jos', 'Richter' => 'Ri',
            'Rut' => 'Rut', '1. Samuel' => '1-Sam', '2. Samuel' => '2-Sam',
            '1. Könige' => '1-Koen', '2. Könige' => '2-Koen', '1. Chronik' => '1-Chr', '2. Chronik' => '2-Chr',
            'Esra' => 'Esr', 'Nehemia' => 'Neh', 'Ester' => 'Est', 'Hiob' => 'Hiob', 'Job' => 'Hiob',
            'Psalm' => 'Ps', 'Psalmen' => 'Ps', 'Sprichwörter' => 'Spr', 'Prediger' => 'Koh',
            'Hoheslied' => 'Hld', 'Jesaja' => 'Jes', 'Jeremia' => 'Jer', 'Klagelieder' => 'Klgl',
            'Hesekiel' => 'Ez-Hes', 'Ezechiel' => 'Ez-Hes', 'Daniel' => 'Dan', 'Hosea' => 'Hos',
            'Joel' => 'Joel', 'Amos' => 'Am', 'Obadja' => 'Ob', 'Jona' => 'Jona', 'Micha' => 'Mi',
            'Nahum' => 'Nah', 'Habakuk' => 'Hab', 'Zefanja' => 'Zef', 'Haggai' => 'Hag',
            'Sacharja' => 'Sach', 'Maleachi' => 'Mal',
            'Matthäus' => 'Mt', 'Markus' => 'Mk', 'Lukas' => 'Lk', 'Johannes' => 'Joh',
            'Apostelgeschichte' => 'Apg', 'Römer' => 'Roem', '1. Korinther' => '1-Kor',
            '2. Korinther' => '2-Kor', 'Galater' => 'Gal', 'Epheser' => 'Eph', 'Philipper' => 'Phil',
            'Kolosser' => 'Kol', '1. Thessalonicher' => '1-Thess', '2. Thessalonicher' => '2-Thess',
            '1. Timotheus' => '1-Tim', '2. Timotheus' => '2-Tim', 'Titus' => 'Tit',
            'Philemon' => 'Phlm', 'Hebräer' => 'Hebr', 'Jakobus' => 'Jak', '1. Petrus' => '1-Petr',
            '2. Petrus' => '2-Petr', '1. Johannes' => '1-Joh', '2. Johannes' => '2-Joh',
            '3. Johannes' => '3-Joh', 'Judas' => 'Jud', 'Offenbarung' => 'Offb-Apk'
        ];
        
        $book_abbrev = $book_mappings[$book] ?? $book;
        return "https://www.bibel-in-gerechter-sprache.de/die-bibel/bigs-online/?$book_abbrev/$chapter/$verse/";
    }

    /**
     * Get translation name from code
     */
    private function getTranslationName($code) {
        $translations = [
            'LUT' => 'Lutherbibel 2017',
            'ELB' => 'Elberfelder Bibel',
            'HFA' => 'Hoffnung für Alle',
            'SLT' => 'Schlachter 2000',
            'ZB' => 'Zürcher Bibel',
            'GNB' => 'Gute Nachricht Bibel',
            'NGÜ' => 'Neue Genfer Übersetzung',
            'EU' => 'Einheitsübersetzung 2016',
            'NLB' => 'Neues Leben Bibel',
            'VXB' => 'VolxBibel',
            'NeÜ' => 'Neue evangelistische Übersetzung',
            'BIGS' => 'Bibel in gerechter Sprache',
            'NIV' => 'New International Version',
            'ESV' => 'English Standard Version',
            'LSG' => 'Louis Segond'
        ];
        
        return $translations[$code] ?? $code;
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