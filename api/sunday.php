<?php
/**
 * Sunday/Kirchenjahr API Endpoint
 * Liefert alle relevanten Daten für einen Sonntag/Feiertag
 * Optimiert für n8n und externe Integrationen
 */

require_once 'database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

/**
 * Berechnet die aktuelle Perikopenreihe basierend auf dem Datum
 * Reihe I startete 2018/19, rotiert alle 6 Jahre
 */
function getCurrentPerikopenreihe($date) {
    $dateObj = new DateTime($date);
    $year = (int)$dateObj->format('Y');
    $month = (int)$dateObj->format('n');

    // Kirchenjahr beginnt am 1. Advent (ca. Ende November)
    // Vereinfacht: Ab Dezember = neues Kirchenjahr
    $kirchenjahrStart = $month >= 12 ? $year : $year - 1;

    // Reihe I startete 2018/19
    $reihen = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    $jahresSeit2018 = $kirchenjahrStart - 2018;
    $reiheIndex = (($jahresSeit2018 % 6) + 6) % 6;

    return [
        'reihe' => $reihen[$reiheIndex],
        'reihe_nummer' => $reiheIndex + 1,
        'kirchenjahr' => $kirchenjahrStart . '/' . ($kirchenjahrStart + 1)
    ];
}

/**
 * Findet den nächsten Sonntag ab einem gegebenen Datum
 */
function getNextSunday($date = null) {
    $dateObj = $date ? new DateTime($date) : new DateTime();
    $dayOfWeek = (int)$dateObj->format('w'); // 0 = Sonntag

    if ($dayOfWeek === 0) {
        // Heute ist Sonntag
        return $dateObj->format('Y-m-d');
    }

    // Tage bis zum nächsten Sonntag
    $daysUntilSunday = 7 - $dayOfWeek;
    $dateObj->modify("+{$daysUntilSunday} days");
    return $dateObj->format('Y-m-d');
}

/**
 * Formatiert Datum auf Deutsch
 */
function formatGermanDate($date) {
    $wochentage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    $monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    $dateObj = new DateTime($date);
    $wochentag = $wochentage[(int)$dateObj->format('w')];
    $tag = $dateObj->format('j');
    $monat = $monate[(int)$dateObj->format('n') - 1];
    $jahr = $dateObj->format('Y');

    return "$wochentag, $tag. $monat $jahr";
}

try {
    $db = getDatabase();

    // Parameter
    $action = $_GET['action'] ?? 'next_sunday';
    $date = $_GET['date'] ?? null;

    switch ($action) {
        case 'next_sunday':
            // Nächsten Sonntag finden
            $targetDate = getNextSunday($date);
            break;

        case 'date':
            // Spezifisches Datum
            if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Ungültiges Datum. Format: YYYY-MM-DD');
            }
            $targetDate = $date;
            break;

        case 'today':
            // Heute
            $targetDate = date('Y-m-d');
            break;

        default:
            throw new Exception('Ungültige Aktion. Erlaubt: next_sunday, date, today');
    }

    // Kirchenjahr-Event für das Datum laden
    $stmt = $db->prepare("
        SELECT * FROM church_events
        WHERE event_date = ?
        ORDER BY id
        LIMIT 1
    ");
    $stmt->execute([$targetDate]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$event) {
        // Kein spezielles Event - trotzdem Basis-Infos zurückgeben
        $perikopenInfo = getCurrentPerikopenreihe($targetDate);

        echo json_encode([
            'success' => true,
            'data' => [
                'datum' => $targetDate,
                'datum_formatiert' => formatGermanDate($targetDate),
                'ist_feiertag' => false,
                'name' => null,
                'perikopenreihe' => $perikopenInfo
            ],
            'message' => 'Kein liturgisches Ereignis für dieses Datum'
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        exit;
    }

    // Perikopenreihe berechnen
    $perikopenInfo = getCurrentPerikopenreihe($targetDate);
    $perikopen = $event['perikopen'] ? json_decode($event['perikopen'], true) : null;

    // Aktuellen Predigttext ermitteln
    $aktuellerPredigttext = null;
    if ($perikopen && isset($perikopen[$perikopenInfo['reihe']])) {
        $aktuellerPredigttext = $perikopen[$perikopenInfo['reihe']];
    }

    // Response zusammenbauen
    $response = [
        'success' => true,
        'data' => [
            // Basis-Infos
            'datum' => $event['event_date'],
            'datum_formatiert' => formatGermanDate($event['event_date']),
            'ist_feiertag' => true,

            // Sonntag/Feiertag
            'name' => $event['summary'],
            'liturgische_farbe' => $event['liturgical_color'],
            'kirchenjahreszeit' => $event['season'],

            // Wochenspruch
            'wochenspruch' => $event['weekly_verse'],
            'wochenspruch_referenz' => $event['weekly_verse_reference'],

            // Psalm
            'wochenpsalm' => $event['psalm'],
            'wochenpsalm_eg' => $event['psalm_eg'],

            // Lesungen
            'lesungen' => [
                'altes_testament' => $event['old_testament_reading'],
                'epistel' => $event['epistle'],
                'evangelium' => $event['gospel']
            ],

            // Perikopenreihe
            'perikopenreihe' => [
                'aktuell' => $perikopenInfo['reihe'],
                'nummer' => $perikopenInfo['reihe_nummer'],
                'kirchenjahr' => $perikopenInfo['kirchenjahr'],
                'predigttext' => $aktuellerPredigttext
            ],

            // Alle Perikopen
            'perikopen' => $perikopen,

            // Wochenlieder
            'wochenlieder' => [
                [
                    'titel' => $event['hymn1'],
                    'eg_nummer' => $event['hymn1_eg']
                ],
                [
                    'titel' => $event['hymn2'],
                    'eg_nummer' => $event['hymn2_eg']
                ]
            ],

            // Links
            'url' => $event['url']
        ],
        'timestamp' => date('c')
    ];

    // Leere Wochenlieder entfernen
    $response['data']['wochenlieder'] = array_filter(
        $response['data']['wochenlieder'],
        fn($lied) => !empty($lied['titel'])
    );
    $response['data']['wochenlieder'] = array_values($response['data']['wochenlieder']);

    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
