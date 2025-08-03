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
        'matthäus', 'mt', 'markus', 'mk', 'lukas', 'lk', 'johannes', 'joh',
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
        $originalReference = $reference;

        // 1. Initialer Split: Buch/Kapitel vom Rest trennen
        if (!preg_match('/^(.+?)\s+(\d+),?\s*(.*)$/u', trim($reference), $matches)) {
            // Fallback für ganze Kapitel wie "Römer 8"
            if (preg_match('/^(.+?)\s+(\d+)$/u', trim($reference), $chapterMatch)) {
                $bookInput = trim($chapterMatch[1]);
                $resolvedBook = $this->resolveBookAbbreviation($bookInput);
                return [
                    'book' => $resolvedBook['name'],
                    'testament' => $resolvedBook['testament'],
                    'chapter' => (int)$chapterMatch[2],
                    'start_verse' => 1,
                    'end_verse' => 999, // Scraper wird das begrenzen
                    'excluded_verses' => [],
                    'optional_verses' => [],
                    'suffixes' => [],
                    'optional_suffixes' => [],
                    'original' => $originalReference,
                    'original_book' => $bookInput,
                    'whole_chapter' => true
                ];
            }
            return null; // Ungültiges Format
        }

        $bookInput = trim($matches[1]);
        $chapter = (int)$matches[2];
        $verseStr = $matches[3];

        // 2. Tokenizer: Zerlege den Vers-String in seine Bestandteile
        // Verbessertes Regex: Unterstützt verschiedene Bindestrich-Arten (-, –, —)
        $tokenRegex = '/(?<paren>[\(\)])|(?<range>(\d+)([a-z])?(?:[\-–—](\d+)([a-z])?)?)|(?<sep>[\.,;])/u';
        preg_match_all($tokenRegex, $verseStr, $tokens, PREG_SET_ORDER | PREG_UNMATCHED_AS_NULL);

        $allVerses = [];
        $optionalVerses = [];
        $suffixes = [];
        $optionalSuffixes = [];

        $isOptional = false; // Zustandsautomat: Sind wir innerhalb einer Klammer?

        // 3. Parser: Verarbeite die Tokens
        foreach ($tokens as $token) {
            if (!is_null($token['paren'])) {
                // Zustand ändern bei Klammern
                if ($token['paren'] === '(') {
                    $isOptional = true;
                } else {
                    $isOptional = false;
                }
            } elseif (!is_null($token['range'])) {
                // Verarbeite einen Vers oder einen Versbereich
                preg_match('/(\d+)([a-z])?(?:[\-–—](\d+)([a-z])?)?/u', $token['range'], $rangeMatches);
                
                $startNum = (int)$rangeMatches[1];
                $startSuffix = $rangeMatches[2] ?? null;
                $endNum = isset($rangeMatches[3]) && $rangeMatches[3] !== '' ? (int)$rangeMatches[3] : $startNum;
                $endSuffix = $rangeMatches[4] ?? null;

                // Verse innerhalb des Bereichs durchgehen
                for ($v = $startNum; $v <= $endNum; $v++) {
                    if ($isOptional) {
                        if (!in_array($v, $optionalVerses)) {
                            $optionalVerses[] = $v;
                        }
                        // Suffixe zuordnen
                        if ($v === $startNum && $startSuffix) {
                            $optionalSuffixes[$v] = $startSuffix;
                        }
                        if ($v === $endNum && $endSuffix) {
                            $optionalSuffixes[$v] = $endSuffix;
                        }
                    } else {
                        if (!in_array($v, $allVerses)) {
                            $allVerses[] = $v;
                        }
                        // Suffixe zuordnen
                        if ($v === $startNum && $startSuffix) {
                            $suffixes[$v] = $startSuffix;
                        }
                        if ($v === $endNum && $endSuffix) {
                            $suffixes[$v] = $endSuffix;
                        }
                    }
                }
            }
            // Trenner (sep) werden einfach ignoriert, sie haben ihren Zweck beim Tokenizing erfüllt.
        }
        
        // 4. Ergebnis zusammenbauen
        if (empty($allVerses) && empty($optionalVerses)) {
            return null; // Kein Vers gefunden
        }

        $allVerseNumbers = array_merge($allVerses, $optionalVerses);
        sort($allVerseNumbers);
        $allVerseNumbers = array_unique($allVerseNumbers);
        
        // Ausgeschlossene Verse berechnen
        $excludedVerses = [];
        if (!empty($allVerseNumbers)) {
            $min = min($allVerseNumbers);
            $max = max($allVerseNumbers);
            $fullRange = range($min, $max);
            // Ausgeschlossen ist, was im Gesamtbereich liegt, aber weder in allVerses noch optionalVerses ist
            $excludedVerses = array_diff($fullRange, $allVerseNumbers);
        }
        
        $resolvedBook = $this->resolveBookAbbreviation($bookInput);

        return [
            'book' => $resolvedBook['name'],
            'testament' => $resolvedBook['testament'],
            'chapter' => $chapter,
            'start_verse' => !empty($allVerseNumbers) ? min($allVerseNumbers) : 0,
            'end_verse' => !empty($allVerseNumbers) ? max($allVerseNumbers) : 0,
            'excluded_verses' => array_values($excludedVerses),
            'optional_verses' => array_values(array_unique($optionalVerses)),
            'suffixes' => $suffixes,
            'optional_suffixes' => $optionalSuffixes,
            'original' => $originalReference,
            'original_book' => $bookInput
        ];
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
        
        // NEU: Logik zur Auswahl der Scraping-Methode korrigiert
        // scrapeComplexReference ist robuster und kann sowohl ausgeschlossene als auch optionale Verse verarbeiten.
        // Wir leiten alle komplexen Fälle an diese Funktion weiter.
        if (!empty($parsedRef['excluded_verses']) || !empty($parsedRef['optional_verses'])) {
            // Diese Funktion wird nun für alle komplexen Fälle verwendet.
            // Sie ist angepasst, damit sie auch optionale Verse korrekt verarbeitet.
            return $this->scrapeComplexReference($parsedRef, $translation);
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
        
        // Füge Suffixe zu den Versen hinzu, falls vorhanden
        if (isset($data['verses']) && is_array($data['verses'])) {
            foreach ($data['verses'] as &$verse) {
                // Füge Suffixe hinzu - nur aus dem normalen suffixes Array
                $suffixes = $parsedRef['suffixes'] ?? [];
                
                if (isset($suffixes[$verse['number']])) {
                    $verse['suffix'] = $suffixes[$verse['number']];
                }
                
                // Für normale Referenzen sind alle Verse optional=false und excluded=false
                $verse['optional'] = false;
                $verse['excluded'] = false;
            }
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
        $pythonScript = '/var/www/html/bible_scraper.py';
        
        // Hole die korrekten Verse-Listen aus parseReference
        $excludedVerses = $parsedRef['excluded_verses'] ?? [];
        
        // parseReference hat bereits die korrekte Berechnung gemacht
        // Wir müssen nur die normalen Verse (ohne ausgeschlossene) und optionalen Verse kombinieren
        $normalVerses = [];
        for ($v = $parsedRef['start_verse']; $v <= $parsedRef['end_verse']; $v++) {
            if (!in_array($v, $excludedVerses)) {
                $normalVerses[] = $v;
            }
        }
        
        // Alle Verse die wir tatsächlich wollen (normale + optionale)
        $allNeededVerses = array_merge($normalVerses, $optionalVerses);
        $allNeededVerses = array_unique($allNeededVerses);
        sort($allNeededVerses);
        
        // Alle Verse die wir scrapen müssen (inklusive ausgeschlossene für komplette Darstellung)
        $allVerseNumbers = array_merge($normalVerses, $optionalVerses, $excludedVerses);
        $allVerseNumbers = array_unique($allVerseNumbers);
        sort($allVerseNumbers);
        
        // Für Scraper: hole den gesamten Bereich (inklusive ausgeschlossene für vollständiges Scraping)
        $minVerse = min($allVerseNumbers);
        $maxVerse = max($allVerseNumbers);
        $fullRef = "$book $chapter,$minVerse-$maxVerse";
        
        // Python-Scraper aufrufen für den gesamten Bereich
        $command = "/opt/venv/bin/python3 $pythonScript " . 
                  escapeshellarg($fullRef) . " " .
                  escapeshellarg($translation) . " " .
                  escapeshellarg($parsedRef['testament']) . " 2>&1";
        
        $output = shell_exec($command);
        $data = json_decode($output, true);
        
        if (!$data || isset($data['error'])) {
            throw new Exception('Failed to scrape optional reference');
        }
        
        // Filtere nur die gewünschten Verse und markiere sie
        $filteredVerses = [];
        $combinedText = '';
        
        if (isset($data['verses']) && is_array($data['verses'])) {
            foreach ($data['verses'] as $verse) {
                $verseNum = $verse['number'];
                
                // Prüfe ob dieser Vers gewünscht ist (normal oder optional)
                $isOptional = in_array($verseNum, $optionalVerses);
                $isExcluded = in_array($verseNum, $excludedVerses);
                $isNormallyIncluded = in_array($verseNum, $allNeededVerses);
                
                // Nehme ALLE Verse im Bereich für vollständige Darstellung
                if ($verseNum >= $minVerse && $verseNum <= $maxVerse) {
                    $verse['optional'] = $isOptional;
                    $verse['excluded'] = $isExcluded;
                    
                    // Füge Suffixe aus dem Parsing hinzu - abhängig davon ob der Vers optional ist
                    $suffixes = $parsedRef['suffixes'] ?? [];
                    $optionalSuffixes = $parsedRef['optional_suffixes'] ?? [];
                    
                    if ($isOptional && isset($optionalSuffixes[$verseNum])) {
                        $verse['suffix'] = $optionalSuffixes[$verseNum];
                    } elseif (!$isOptional && isset($suffixes[$verseNum])) {
                        $verse['suffix'] = $suffixes[$verseNum];
                    }
                    
                    $filteredVerses[] = $verse;
                    
                    // Füge nur nicht-ausgeschlossene Verse zum Text hinzu
                    if (!$isExcluded && !empty($verse['text'])) {
                        $combinedText .= ($combinedText ? ' ' : '') . $verse['text'];
                    }
                }
            }
        }
        
        $data['verses'] = $filteredVerses;
        $data['text'] = $combinedText;
        
        return $data;
    }
    
    /**
     * Verarbeite komplexe Referenzen mit ausgeschlossenen und/oder optionalen Versen.
     * Diese Methode ist robuster, da sie die Referenz in kleinere Teile zerlegt und einzeln anfragt.
     */
    private function scrapeComplexReference($parsedRef, $translation) {
        
        $book = $parsedRef['book'];
        $chapter = $parsedRef['chapter'];
        $startVerse = $parsedRef['start_verse'];
        $endVerse = $parsedRef['end_verse'];
        
        // Alle Verse, die wir scrapen und im Ergebnis haben wollen (inkl. der ausgeschlossenen für die Anzeige)
        $allVerseNumbersInScope = range($startVerse, $endVerse);
        
        $scrapedVerses = [];
        $combinedText = '';

        // Wir rufen den Scraper für jeden einzelnen Vers im Gesamtbereich auf.
        // Das ist weniger effizient, aber extrem robust gegen Parsing-Fehler auf der Scraper-Seite.
        foreach ($allVerseNumbersInScope as $verseNum) {
            $simpleRef = "$book $chapter,$verseNum";
            
            // Scrape einzelnen Vers (inkl. Testament)
            $command = "/opt/venv/bin/python3 /var/www/html/bible_scraper.py " .
                      escapeshellarg($simpleRef) . " " .
                      escapeshellarg($translation) . " " .
                      escapeshellarg($parsedRef['testament']) . " 2>&1";
            
            $output = shell_exec($command);
            $data = json_decode($output, true);
            
            $verseText = '';
            // Erfolgreich gescraped?
            if ($data && !isset($data['error']) && isset($data['text'])) {
                $verseText = $data['text'];
            } else {
                // Logge einen Fehler, wenn ein Vers nicht gefunden werden konnte
                error_log("Scraping failed for verse: " . $simpleRef);
            }

            // Flags aus dem Parsing holen
            $isExcluded = in_array($verseNum, $parsedRef['excluded_verses']);
            $isOptional = in_array($verseNum, $parsedRef['optional_verses']);

            $verseEntry = [
                'number' => $verseNum,
                'text' => $verseText,
                'optional' => $isOptional,
                'excluded' => $isExcluded,
            ];

            // --- KORRIGIERTE SUFFIX-LOGIK ---
            // Behandelt Fälle wie 8a(8b...), bei denen ein Vers beide Arten von Suffixen hat.
            $finalSuffix = '';
            $suffixes = $parsedRef['suffixes'] ?? [];
            $optionalSuffixes = $parsedRef['optional_suffixes'] ?? [];
            
            // Hat der Vers einen normalen Suffix?
            if (isset($suffixes[$verseNum])) {
                $finalSuffix .= $suffixes[$verseNum];
            }
            // Hat der Vers einen optionalen Suffix?
            // (Ein Vers kann in beiden Kontexten vorkommen, z.B. 8a und (8b))
            if (isset($optionalSuffixes[$verseNum])) {
                $finalSuffix .= $optionalSuffixes[$verseNum];
            }
            
            if (!empty($finalSuffix)) {
                $verseEntry['suffix'] = $finalSuffix;
            }
            
            $scrapedVerses[] = $verseEntry;

            // Füge Text nur hinzu, wenn der Vers nicht ausgeschlossen ist
            if (!$isExcluded && !empty($verseText)) {
                $combinedText .= ($combinedText ? ' ' : '') . $verseText;
            }
        }
        
        // Sortiere die Verse am Ende nach ihrer Nummer, falls die Verarbeitung durcheinander geraten ist
        usort($scrapedVerses, function($a, $b) {
            return $a['number'] <=> $b['number'];
        });

        // Filtere am Ende die wirklich ausgeschlossenen Verse aus der finalen Ausgabe, falls gewünscht.
        // Aktuell bleiben sie mit 'excluded: true' drin, was für die Anzeige besser ist.
        
        return [
            'reference' => $parsedRef['original'],
            'text' => trim($combinedText),
            'translation' => [
                'code' => $translation,
                'name' => $this->getTranslationName($translation),
                'language' => 'German' // sollte dynamisch sein, aber für den Moment ok
            ],
            'source' => 'Live Scraper (Complex)',
            'url' => $this->generateBibleserverUrl($parsedRef['original'], $translation),
            'testament' => $parsedRef['testament'],
            'verses' => $scrapedVerses // enthält jetzt alle Verse, korrekt markiert
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