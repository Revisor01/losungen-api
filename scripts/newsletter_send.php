#!/usr/bin/env php
<?php
/**
 * Newsletter Versand Cron-Job
 * Wird stündlich ausgeführt und prüft welche Subscriber eine E-Mail bekommen sollen
 *
 * Verwendung:
 *   php newsletter_send.php              # Normale Ausführung (aktuelle Stunde)
 *   php newsletter_send.php --hour=6     # Für spezifische Stunde (Testing)
 *   php newsletter_send.php --dry-run    # Nur anzeigen, nichts senden
 */

// Pfade für CLI-Ausführung
define('BASE_PATH', '/var/www/html');
require_once BASE_PATH . '/database.php';
require_once BASE_PATH . '/newsletter/NewsletterService.php';
require_once BASE_PATH . '/newsletter/EmailService.php';

class NewsletterSender {
    private $db;
    private $newsletterService;
    private $emailService;
    private $dryRun = false;
    private $stats = [
        'tageslosung_sent' => 0,
        'tageslosung_failed' => 0,
        'sonntag_sent' => 0,
        'sonntag_failed' => 0,
        'skipped' => 0
    ];

    public function __construct(bool $dryRun = false) {
        $this->db = getDatabase();
        $this->newsletterService = new NewsletterService();
        $this->emailService = new EmailService();
        $this->dryRun = $dryRun;
    }

    /**
     * Hauptversand-Funktion
     */
    public function run(?int $forceHour = null): void {
        $now = new DateTime('now', new DateTimeZone('Europe/Berlin'));
        $dayOfWeek = (int)$now->format('w'); // 0=So, 1=Mo, ..., 6=Sa
        $currentHour = $forceHour ?? (int)$now->format('G');

        $this->log("=== Newsletter Versand gestartet ===");
        $this->log("Zeit: " . $now->format('Y-m-d H:i:s') . " (Europe/Berlin)");
        $this->log("Wochentag: {$dayOfWeek}, Stunde: {$currentHour}");
        if ($this->dryRun) {
            $this->log("*** DRY-RUN MODUS - Keine E-Mails werden gesendet ***");
        }
        $this->log("");

        // 1. Tageslosung versenden
        $this->sendDailyLosungen($now->format('Y-m-d'), $dayOfWeek, $currentHour);

        // 2. Sonntagsvorschau versenden
        $this->sendSundayPreviews($now, $dayOfWeek, $currentHour);

        // Statistiken ausgeben
        $this->log("");
        $this->log("=== Versand abgeschlossen ===");
        $this->log("Tageslosung: {$this->stats['tageslosung_sent']} gesendet, {$this->stats['tageslosung_failed']} fehlgeschlagen");
        $this->log("Sonntagsvorschau: {$this->stats['sonntag_sent']} gesendet, {$this->stats['sonntag_failed']} fehlgeschlagen");
        $this->log("Übersprungen: {$this->stats['skipped']}");
    }

    /**
     * Versendet Tageslosungen
     */
    private function sendDailyLosungen(string $date, int $dayOfWeek, int $hour): void {
        $this->log("--- Tageslosung für {$date} ---");

        // Hole alle Subscriber die jetzt Tageslosung bekommen sollen
        $subscribers = $this->newsletterService->getSubscribersForSending('tageslosung', $dayOfWeek, $hour);
        $this->log("Gefundene Subscriber: " . count($subscribers));

        if (empty($subscribers)) {
            return;
        }

        // Lade Tageslosung aus der API
        $losungData = $this->fetchTageslosung($date);
        if (!$losungData) {
            $this->log("FEHLER: Konnte Tageslosung nicht laden");
            return;
        }

        foreach ($subscribers as $subscriber) {
            // Prüfen ob bereits gesendet
            if ($this->newsletterService->hasAlreadySent($subscriber['id'], 'tageslosung', $date)) {
                $this->log("  [{$subscriber['email']}] Bereits gesendet - übersprungen");
                $this->stats['skipped']++;
                continue;
            }

            // Übersetzungen für diesen Subscriber
            $translations = json_decode($subscriber['translations'], true) ?: ['LUT'];
            $subscriberLosungData = $this->enrichLosungWithTranslations($losungData, $translations, $date);

            if ($this->dryRun) {
                $this->log("  [{$subscriber['email']}] WÜRDE senden (Übersetzungen: " . implode(', ', $translations) . ")");
                $this->stats['tageslosung_sent']++;
                continue;
            }

            // E-Mail senden
            $success = $this->emailService->sendTageslosung($subscriber, $subscriberLosungData);

            if ($success) {
                $this->newsletterService->logSend($subscriber['id'], 'tageslosung', $date, 'sent');
                $this->log("  [{$subscriber['email']}] Gesendet");
                $this->stats['tageslosung_sent']++;
            } else {
                $this->newsletterService->logSend($subscriber['id'], 'tageslosung', $date, 'failed', 'SMTP Fehler');
                $this->log("  [{$subscriber['email']}] FEHLER beim Senden");
                $this->stats['tageslosung_failed']++;
            }
        }
    }

    /**
     * Versendet Sonntagsvorschauen
     */
    private function sendSundayPreviews(DateTime $today, int $dayOfWeek, int $hour): void {
        // Berechne nächsten Sonntag
        $nextSunday = clone $today;
        $daysUntilSunday = (7 - $dayOfWeek) % 7;
        if ($daysUntilSunday === 0) {
            $daysUntilSunday = 7; // Am Sonntag selbst: nächste Woche
        }
        $nextSunday->modify("+{$daysUntilSunday} days");
        $sundayDate = $nextSunday->format('Y-m-d');

        $this->log("");
        $this->log("--- Sonntagsvorschau für {$sundayDate} ---");

        // Hole alle Subscriber die jetzt Sonntagsvorschau bekommen sollen
        $subscribers = $this->newsletterService->getSubscribersForSending('sonntagstexte', $dayOfWeek, $hour);
        $this->log("Gefundene Subscriber: " . count($subscribers));

        if (empty($subscribers)) {
            return;
        }

        // Lade Sonntagsdaten aus der API
        $sundayData = $this->fetchSundayData($sundayDate);
        if (!$sundayData) {
            $this->log("FEHLER: Konnte Sonntagsdaten nicht laden");
            return;
        }

        $this->log("Sonntag: " . ($sundayData['name'] ?? 'Unbekannt'));

        foreach ($subscribers as $subscriber) {
            // Prüfen ob bereits gesendet
            if ($this->newsletterService->hasAlreadySent($subscriber['id'], 'sonntagsvorschau', $sundayDate)) {
                $this->log("  [{$subscriber['email']}] Bereits gesendet - übersprungen");
                $this->stats['skipped']++;
                continue;
            }

            if ($this->dryRun) {
                $this->log("  [{$subscriber['email']}] WÜRDE senden");
                $this->stats['sonntag_sent']++;
                continue;
            }

            // E-Mail senden
            $success = $this->emailService->sendSonntagsvorschau($subscriber, $sundayData);

            if ($success) {
                $this->newsletterService->logSend($subscriber['id'], 'sonntagsvorschau', $sundayDate, 'sent');
                $this->log("  [{$subscriber['email']}] Gesendet");
                $this->stats['sonntag_sent']++;
            } else {
                $this->newsletterService->logSend($subscriber['id'], 'sonntagsvorschau', $sundayDate, 'failed', 'SMTP Fehler');
                $this->log("  [{$subscriber['email']}] FEHLER beim Senden");
                $this->stats['sonntag_failed']++;
            }
        }
    }

    /**
     * Holt Tageslosung aus der API
     */
    private function fetchTageslosung(string $date): ?array {
        $apiKey = $_ENV['API_KEY_1'] ?? 'ksadh8324oijcff45rfdsvcvhoids44';
        $url = "http://localhost/index.php?api_key={$apiKey}&date={$date}&translation=LUT";

        $response = @file_get_contents($url);
        if (!$response) {
            return null;
        }

        $data = json_decode($response, true);
        if (!$data || !$data['success']) {
            return null;
        }

        return [
            'date' => $date,
            'losung' => [
                'reference' => $data['data']['losung']['reference'] ?? '',
                'text' => $data['data']['losung']['text'] ?? ''
            ],
            'lehrtext' => [
                'reference' => $data['data']['lehrtext']['reference'] ?? '',
                'text' => $data['data']['lehrtext']['text'] ?? ''
            ]
        ];
    }

    /**
     * Erweitert Losung mit mehreren Übersetzungen
     */
    private function enrichLosungWithTranslations(array $baseLosungData, array $translations, string $date): array {
        $result = $baseLosungData;
        $result['translations'] = [];

        $apiKey = $_ENV['API_KEY_1'] ?? 'ksadh8324oijcff45rfdsvcvhoids44';

        foreach ($translations as $trans) {
            $url = "http://localhost/index.php?api_key={$apiKey}&date={$date}&translation={$trans}";
            $response = @file_get_contents($url);

            if ($response) {
                $data = json_decode($response, true);
                if ($data && $data['success']) {
                    $result['translations'][] = [
                        'code' => $trans,
                        'name' => $data['data']['translation']['name'] ?? $trans,
                        'losung_text' => $data['data']['losung']['text'] ?? '',
                        'lehrtext_text' => $data['data']['lehrtext']['text'] ?? ''
                    ];
                }
            }
        }

        // Falls nur eine Übersetzung, nutze diese als Haupttext
        if (count($result['translations']) === 1) {
            $result['losung']['text'] = $result['translations'][0]['losung_text'];
            $result['lehrtext']['text'] = $result['translations'][0]['lehrtext_text'];
        }

        return $result;
    }

    /**
     * Holt Sonntagsdaten aus der sunday.php API
     */
    private function fetchSundayData(string $date): ?array {
        $apiKey = $_ENV['API_KEY_1'] ?? 'ksadh8324oijcff45rfdsvcvhoids44';
        $url = "http://localhost/sunday.php?action=date&date={$date}&api_key={$apiKey}";

        $response = @file_get_contents($url);
        if (!$response) {
            return null;
        }

        $data = json_decode($response, true);
        if (!$data || !$data['success']) {
            return null;
        }

        return $data['data'];
    }

    /**
     * Log-Ausgabe
     */
    private function log(string $message): void {
        $timestamp = date('Y-m-d H:i:s');
        echo "[{$timestamp}] {$message}\n";
    }
}

// === CLI-Ausführung ===
if (php_sapi_name() === 'cli') {
    $options = getopt('', ['hour::', 'dry-run']);
    $hour = isset($options['hour']) ? (int)$options['hour'] : null;
    $dryRun = isset($options['dry-run']);

    $sender = new NewsletterSender($dryRun);
    $sender->run($hour);
}
