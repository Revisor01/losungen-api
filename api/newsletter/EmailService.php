<?php
/**
 * Email Service für Newsletter-Versand
 * Verwendet PHPMailer mit SMTP
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once '/var/www/html/vendor/autoload.php';

class EmailService {
    private $mailer;
    private $templatePath;
    private $baseUrl;

    public function __construct() {
        $this->mailer = new PHPMailer(true);
        $this->templatePath = __DIR__ . '/templates/';
        $this->baseUrl = $_ENV['APP_URL'] ?? 'https://losung.konfi-quest.de';

        // SMTP-Konfiguration
        $this->mailer->isSMTP();
        $this->mailer->Host = $_ENV['SMTP_HOST'] ?? 'server.godsapp.de';
        $this->mailer->SMTPAuth = true;
        $this->mailer->Username = $_ENV['SMTP_USER'] ?? '';
        $this->mailer->Password = $_ENV['SMTP_PASSWORD'] ?? '';
        $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $this->mailer->Port = (int)($_ENV['SMTP_PORT'] ?? 587);

        // SSL-Optionen für lokale Docker-Verbindung (Zertifikat ist auf server.godsapp.de ausgestellt)
        $this->mailer->SMTPOptions = [
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ];

        // Absender
        $this->mailer->setFrom(
            $_ENV['NEWSLETTER_FROM_EMAIL'] ?? 'losung@godsapp.de',
            $_ENV['NEWSLETTER_FROM_NAME'] ?? 'Losungen Newsletter'
        );

        $this->mailer->CharSet = 'UTF-8';
        $this->mailer->isHTML(true);
    }

    /**
     * Sendet Bestätigungs-Email (Double Opt-In)
     */
    public function sendConfirmation(string $email, ?string $name, string $token): bool {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->addAddress($email, $name ?? '');

            $this->mailer->Subject = 'Bitte bestätige deine Newsletter-Anmeldung';

            $confirmUrl = "{$this->baseUrl}/newsletter/confirm/{$token}";

            $html = $this->loadTemplate('confirmation.html', [
                'name' => $name ?: 'Liebe/r Leser/in',
                'confirm_url' => $confirmUrl,
                'base_url' => $this->baseUrl
            ]);

            $this->mailer->Body = $html;
            $this->mailer->AltBody = $this->htmlToText($html);

            return $this->mailer->send();
        } catch (Exception $e) {
            error_log("Email send failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Sendet Willkommens-Email nach Bestätigung
     */
    public function sendWelcome(string $email, ?string $name, string $unsubscribeToken): bool {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->addAddress($email, $name ?? '');

            $this->mailer->Subject = 'Willkommen beim Losungen Newsletter!';

            $preferencesUrl = "{$this->baseUrl}/newsletter/preferences/{$unsubscribeToken}";
            $unsubscribeUrl = "{$this->baseUrl}/newsletter/unsubscribe/{$unsubscribeToken}";

            $html = $this->loadTemplate('welcome.html', [
                'name' => $name ?: 'Liebe/r Leser/in',
                'preferences_url' => $preferencesUrl,
                'unsubscribe_url' => $unsubscribeUrl,
                'base_url' => $this->baseUrl
            ]);

            $this->mailer->Body = $html;
            $this->mailer->AltBody = $this->htmlToText($html);

            return $this->mailer->send();
        } catch (Exception $e) {
            error_log("Email send failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Sendet Tageslosung
     */
    public function sendTageslosung(array $subscriber, array $losungData): bool {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->addAddress($subscriber['email'], $subscriber['name'] ?? '');

            $dateFormatted = $this->formatGermanDate($losungData['date']);
            $this->mailer->Subject = "Losung für {$dateFormatted}";

            $unsubscribeUrl = "{$this->baseUrl}/newsletter/unsubscribe/{$subscriber['unsubscribe_token']}";
            $preferencesUrl = "{$this->baseUrl}/newsletter/preferences/{$subscriber['unsubscribe_token']}";

            $html = $this->loadTemplate('tageslosung.html', [
                'name' => $subscriber['name'] ?: 'Liebe/r Leser/in',
                'date' => $losungData['date'],
                'date_formatted' => $dateFormatted,
                'losung' => $losungData['losung'] ?? [],
                'lehrtext' => $losungData['lehrtext'] ?? [],
                'translations' => $losungData['translations'] ?? [],
                'preferences_url' => $preferencesUrl,
                'unsubscribe_url' => $unsubscribeUrl,
                'base_url' => $this->baseUrl
            ]);

            $this->mailer->Body = $html;
            $this->mailer->AltBody = $this->htmlToText($html);

            // List-Unsubscribe Header für bessere Zustellbarkeit
            $this->mailer->addCustomHeader('List-Unsubscribe', "<{$unsubscribeUrl}>");
            $this->mailer->addCustomHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');

            return $this->mailer->send();
        } catch (Exception $e) {
            error_log("Email send failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Sendet Sonntagsvorschau
     */
    public function sendSonntagsvorschau(array $subscriber, array $sundayData): bool {
        try {
            $this->mailer->clearAddresses();
            $this->mailer->addAddress($subscriber['email'], $subscriber['name'] ?? '');

            $sundayName = $sundayData['name'] ?? 'Sonntag';
            $dateFormatted = $this->formatGermanDate($sundayData['datum']);
            $this->mailer->Subject = "Gottesdienst-Texte: {$sundayName} ({$dateFormatted})";

            $unsubscribeUrl = "{$this->baseUrl}/newsletter/unsubscribe/{$subscriber['unsubscribe_token']}";
            $preferencesUrl = "{$this->baseUrl}/newsletter/preferences/{$subscriber['unsubscribe_token']}";

            $html = $this->loadTemplate('sonntagsvorschau.html', [
                'name' => $subscriber['name'] ?: 'Liebe/r Leser/in',
                'sunday_name' => $sundayName,
                'sunday_date' => $sundayData['datum'],
                'sunday_date_formatted' => $dateFormatted,
                'liturgical_color' => $sundayData['liturgische_farbe'] ?? null,
                'season' => $sundayData['kirchenjahreszeit'] ?? null,
                'perikope_reihe' => $sundayData['perikopenreihe']['aktuell'] ?? null,
                'kirchenjahr' => $sundayData['perikopenreihe']['kirchenjahr'] ?? null,
                'wochenspruch' => $sundayData['wochenspruch'] ?? null,
                'wochenpsalm' => $sundayData['wochenpsalm'] ?? null,
                'predigttext' => $sundayData['predigttext'] ?? null,
                'lesungen' => $sundayData['lesungen'] ?? null,
                'wochenlieder' => $sundayData['wochenlieder'] ?? [],
                'include_predigttext' => $subscriber['include_predigttext'] ?? true,
                'include_lesungen' => $subscriber['include_lesungen'] ?? true,
                'include_psalm' => $subscriber['include_psalm'] ?? true,
                'include_wochenspruch' => $subscriber['include_wochenspruch'] ?? true,
                'preferences_url' => $preferencesUrl,
                'unsubscribe_url' => $unsubscribeUrl,
                'base_url' => $this->baseUrl
            ]);

            $this->mailer->Body = $html;
            $this->mailer->AltBody = $this->htmlToText($html);

            $this->mailer->addCustomHeader('List-Unsubscribe', "<{$unsubscribeUrl}>");
            $this->mailer->addCustomHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');

            return $this->mailer->send();
        } catch (Exception $e) {
            error_log("Email send failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Lädt und füllt ein Template
     */
    private function loadTemplate(string $filename, array $data): string {
        $templateFile = $this->templatePath . $filename;

        if (!file_exists($templateFile)) {
            throw new Exception("Template not found: {$filename}");
        }

        $html = file_get_contents($templateFile);

        // Einfaches Template-Replacement
        foreach ($data as $key => $value) {
            if (is_string($value) || is_numeric($value)) {
                $html = str_replace('{{' . $key . '}}', htmlspecialchars((string)$value), $html);
            }
        }

        // Conditional blocks: {{#if key}}...{{/if}}
        $html = preg_replace_callback('/\{\{#if (\w+)\}\}(.*?)\{\{\/if\}\}/s', function($matches) use ($data) {
            $key = $matches[1];
            $content = $matches[2];
            return !empty($data[$key]) ? $content : '';
        }, $html);

        return $html;
    }

    /**
     * Konvertiert HTML zu Plain-Text
     */
    private function htmlToText(string $html): string {
        $text = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>', '</div>'], "\n", $html));
        $text = html_entity_decode($text);
        $text = preg_replace('/\n{3,}/', "\n\n", $text);
        return trim($text);
    }

    /**
     * Formatiert Datum auf Deutsch
     */
    private function formatGermanDate(string $date): string {
        $wochentage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        $monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

        $dateObj = new DateTime($date);
        $wochentag = $wochentage[(int)$dateObj->format('w')];
        $tag = $dateObj->format('j');
        $monat = $monate[(int)$dateObj->format('n') - 1];
        $jahr = $dateObj->format('Y');

        return "{$wochentag}, {$tag}. {$monat} {$jahr}";
    }
}
