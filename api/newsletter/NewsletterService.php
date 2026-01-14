<?php
/**
 * Newsletter Service - Kernlogik für Abonnentenverwaltung
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/EmailService.php';

class NewsletterService {
    private $db;
    private $emailService;

    public function __construct() {
        $this->db = getDatabase();
        $this->emailService = new EmailService();
    }

    /**
     * Neue Newsletter-Anmeldung
     */
    public function subscribe(array $data): array {
        // Validierung
        $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
        if (!$email) {
            throw new Exception('Ungültige E-Mail-Adresse');
        }

        $name = trim($data['name'] ?? '');

        // Prüfen ob bereits existiert
        $existing = $this->getSubscriberByEmail($email);

        if ($existing) {
            if ($existing['status'] === 'confirmed') {
                throw new Exception('Diese E-Mail-Adresse ist bereits angemeldet');
            }
            if ($existing['status'] === 'pending') {
                // Erneut Bestätigungsmail senden
                $this->emailService->sendConfirmation($email, $name, $existing['confirmation_token']);
                return [
                    'success' => true,
                    'message' => 'Bestätigungsmail wurde erneut gesendet'
                ];
            }
            if ($existing['status'] === 'unsubscribed') {
                // Reaktivieren
                return $this->reactivate($existing['id'], $data);
            }
        }

        // Neuen Subscriber anlegen
        $stmt = $this->db->prepare("
            INSERT INTO newsletter_subscribers (email, name, ip_address, user_agent, source)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, confirmation_token
        ");

        $stmt->execute([
            $email,
            $name ?: null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null,
            $data['source'] ?? 'website'
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $subscriberId = $result['id'];
        $confirmationToken = $result['confirmation_token'];

        // Präferenzen anlegen
        $this->createPreferences($subscriberId, $data);

        // Bestätigungsmail senden
        $this->emailService->sendConfirmation($email, $name, $confirmationToken);

        // Log
        $this->logSend($subscriberId, 'confirmation', null, 'sent');

        // confirmation_sent_at aktualisieren
        $stmt = $this->db->prepare("
            UPDATE newsletter_subscribers SET confirmation_sent_at = NOW() WHERE id = ?
        ");
        $stmt->execute([$subscriberId]);

        return [
            'success' => true,
            'message' => 'Bitte bestätige deine Anmeldung über den Link in der E-Mail'
        ];
    }

    /**
     * Bestätigt Newsletter-Anmeldung (Double Opt-In)
     */
    public function confirm(string $token): array {
        if (empty($token)) {
            throw new Exception('Ungültiger Bestätigungslink');
        }

        $stmt = $this->db->prepare("
            SELECT * FROM newsletter_subscribers WHERE confirmation_token = ?
        ");
        $stmt->execute([$token]);
        $subscriber = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$subscriber) {
            throw new Exception('Bestätigungslink nicht gefunden oder abgelaufen');
        }

        if ($subscriber['status'] === 'confirmed') {
            return [
                'success' => true,
                'message' => 'Deine Anmeldung wurde bereits bestätigt'
            ];
        }

        // Bestätigen
        $stmt = $this->db->prepare("
            UPDATE newsletter_subscribers
            SET status = 'confirmed', confirmed_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$subscriber['id']]);

        // Willkommensmail senden
        $this->emailService->sendWelcome(
            $subscriber['email'],
            $subscriber['name'],
            $subscriber['unsubscribe_token']
        );
        $this->logSend($subscriber['id'], 'welcome', null, 'sent');

        return [
            'success' => true,
            'message' => 'Deine Anmeldung wurde bestätigt! Du erhältst ab sofort den Newsletter.',
            'data' => [
                'email' => $subscriber['email'],
                'preferences_token' => $subscriber['unsubscribe_token']
            ]
        ];
    }

    /**
     * Abmeldung vom Newsletter
     */
    public function unsubscribe(string $token): array {
        if (empty($token)) {
            throw new Exception('Ungültiger Abmeldelink');
        }

        $stmt = $this->db->prepare("
            SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = ?
        ");
        $stmt->execute([$token]);
        $subscriber = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$subscriber) {
            throw new Exception('Abmeldelink nicht gefunden');
        }

        if ($subscriber['status'] === 'unsubscribed') {
            return [
                'success' => true,
                'message' => 'Du bist bereits abgemeldet'
            ];
        }

        $stmt = $this->db->prepare("
            UPDATE newsletter_subscribers
            SET status = 'unsubscribed', unsubscribed_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$subscriber['id']]);

        $this->logSend($subscriber['id'], 'unsubscribe', null, 'sent');

        return [
            'success' => true,
            'message' => 'Du wurdest erfolgreich abgemeldet'
        ];
    }

    /**
     * Holt Präferenzen eines Subscribers
     */
    public function getPreferences(string $token): array {
        $subscriber = $this->getSubscriberByToken($token);

        if (!$subscriber) {
            throw new Exception('Subscriber nicht gefunden');
        }

        $stmt = $this->db->prepare("
            SELECT * FROM newsletter_preferences WHERE subscriber_id = ?
        ");
        $stmt->execute([$subscriber['id']]);
        $prefs = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'data' => [
                'email' => $subscriber['email'],
                'name' => $subscriber['name'],
                'status' => $subscriber['status'],
                'preferences' => [
                    'include_tageslosung' => $prefs['include_tageslosung'] ?? true,
                    'include_sonntagstexte' => $prefs['include_sonntagstexte'] ?? false,
                    'include_predigttext' => $prefs['include_predigttext'] ?? true,
                    'include_lesungen' => $prefs['include_lesungen'] ?? true,
                    'include_psalm' => $prefs['include_psalm'] ?? true,
                    'include_wochenspruch' => $prefs['include_wochenspruch'] ?? true,
                    'translations' => json_decode($prefs['translations'] ?? '["LUT"]', true),
                    'delivery_days_tageslosung' => json_decode($prefs['delivery_days_tageslosung'] ?? '[1,2,3,4,5,6]', true),
                    'delivery_days_sonntag' => json_decode($prefs['delivery_days_sonntag'] ?? '[4,6]', true),
                    'delivery_hour' => $prefs['delivery_hour'] ?? 6
                ]
            ]
        ];
    }

    /**
     * Aktualisiert Präferenzen
     */
    public function updatePreferences(string $token, array $data): array {
        $subscriber = $this->getSubscriberByToken($token);

        if (!$subscriber) {
            throw new Exception('Subscriber nicht gefunden');
        }

        // Name aktualisieren falls angegeben
        if (isset($data['name'])) {
            $stmt = $this->db->prepare("UPDATE newsletter_subscribers SET name = ? WHERE id = ?");
            $stmt->execute([trim($data['name']) ?: null, $subscriber['id']]);
        }

        // Präferenzen aktualisieren (UPSERT - falls noch keine existieren)
        $stmt = $this->db->prepare("
            INSERT INTO newsletter_preferences (
                subscriber_id,
                include_tageslosung,
                include_sonntagstexte,
                include_predigttext,
                include_lesungen,
                include_psalm,
                include_wochenspruch,
                translations,
                delivery_days_tageslosung,
                delivery_days_sonntag,
                delivery_hour
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (subscriber_id) DO UPDATE SET
                include_tageslosung = EXCLUDED.include_tageslosung,
                include_sonntagstexte = EXCLUDED.include_sonntagstexte,
                include_predigttext = EXCLUDED.include_predigttext,
                include_lesungen = EXCLUDED.include_lesungen,
                include_psalm = EXCLUDED.include_psalm,
                include_wochenspruch = EXCLUDED.include_wochenspruch,
                translations = EXCLUDED.translations,
                delivery_days_tageslosung = EXCLUDED.delivery_days_tageslosung,
                delivery_days_sonntag = EXCLUDED.delivery_days_sonntag,
                delivery_hour = EXCLUDED.delivery_hour,
                updated_at = NOW()
        ");

        $stmt->execute([
            $subscriber['id'],
            $this->toBool($data['include_tageslosung'] ?? true),
            $this->toBool($data['include_sonntagstexte'] ?? false),
            $this->toBool($data['include_predigttext'] ?? true),
            $this->toBool($data['include_lesungen'] ?? true),
            $this->toBool($data['include_psalm'] ?? true),
            $this->toBool($data['include_wochenspruch'] ?? true),
            json_encode($data['translations'] ?? ['LUT']),
            json_encode($data['delivery_days_tageslosung'] ?? [1,2,3,4,5,6]),
            json_encode($data['delivery_days_sonntag'] ?? [4,6]),
            (int)($data['delivery_hour'] ?? 6)
        ]);

        return [
            'success' => true,
            'message' => 'Einstellungen wurden gespeichert'
        ];
    }

    /**
     * Holt alle Subscribers für Versand (für Cron-Job)
     */
    public function getSubscribersForSending(string $type, int $dayOfWeek, int $hour): array {
        $dayColumn = $type === 'tageslosung' ? 'delivery_days_tageslosung' : 'delivery_days_sonntag';
        $includeColumn = $type === 'tageslosung' ? 'include_tageslosung' : 'include_sonntagstexte';

        $stmt = $this->db->prepare("
            SELECT
                s.id, s.email, s.name, s.unsubscribe_token,
                p.include_predigttext, p.include_lesungen, p.include_psalm, p.include_wochenspruch,
                p.translations
            FROM newsletter_subscribers s
            JOIN newsletter_preferences p ON s.id = p.subscriber_id
            WHERE s.status = 'confirmed'
            AND p.{$includeColumn} = true
            AND p.{$dayColumn} @> ?::jsonb
            AND p.delivery_hour = ?
        ");

        $stmt->execute([json_encode($dayOfWeek), $hour]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Prüft ob bereits gesendet wurde (für Cron-Job)
     */
    public function hasAlreadySent(string $subscriberId, string $type, string $date): bool {
        $stmt = $this->db->prepare("
            SELECT 1 FROM newsletter_send_log
            WHERE subscriber_id = ?
            AND email_type = ?
            AND content_date = ?
            AND status = 'sent'
        ");
        $stmt->execute([$subscriberId, $type, $date]);
        return (bool)$stmt->fetch();
    }

    /**
     * Loggt einen Versand
     */
    public function logSend(string $subscriberId, string $type, ?string $date, string $status, ?string $error = null): void {
        $stmt = $this->db->prepare("
            INSERT INTO newsletter_send_log (subscriber_id, email_type, content_date, status, sent_at, error_message)
            VALUES (?, ?, ?, ?, NOW(), ?)
        ");
        $stmt->execute([$subscriberId, $type, $date, $status, $error]);
    }

    /**
     * Admin: Subscriber-Liste
     */
    public function listSubscribers(array $params = []): array {
        $status = $params['status'] ?? null;
        $limit = min((int)($params['limit'] ?? 50), 100);
        $offset = (int)($params['offset'] ?? 0);

        $sql = "SELECT s.*, p.include_tageslosung, p.include_sonntagstexte, p.translations
                FROM newsletter_subscribers s
                LEFT JOIN newsletter_preferences p ON s.id = p.subscriber_id";

        if ($status) {
            $sql .= " WHERE s.status = ?";
        }
        $sql .= " ORDER BY s.created_at DESC LIMIT ? OFFSET ?";

        $stmt = $this->db->prepare($sql);
        if ($status) {
            $stmt->execute([$status, $limit, $offset]);
        } else {
            $stmt->execute([$limit, $offset]);
        }

        $subscribers = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Zähle Gesamt
        $countSql = "SELECT COUNT(*) FROM newsletter_subscribers";
        if ($status) {
            $countSql .= " WHERE status = ?";
            $stmt = $this->db->prepare($countSql);
            $stmt->execute([$status]);
        } else {
            $stmt = $this->db->query($countSql);
        }
        $total = (int)$stmt->fetchColumn();

        return [
            'success' => true,
            'data' => [
                'subscribers' => $subscribers,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset
            ]
        ];
    }

    /**
     * Admin: Statistiken
     */
    public function getStats(): array {
        // Subscriber-Statistiken
        $stmt = $this->db->query("
            SELECT
                COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
                COUNT(*) FILTER (WHERE status = 'pending') as pending,
                COUNT(*) FILTER (WHERE status = 'unsubscribed') as unsubscribed,
                COUNT(*) as total
            FROM newsletter_subscribers
        ");
        $subscriberStats = $stmt->fetch(PDO::FETCH_ASSOC);

        // Versand-Statistiken (letzte 7 Tage)
        $stmt = $this->db->query("
            SELECT * FROM newsletter_stats
            WHERE date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY date DESC, email_type
        ");
        $sendStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Inhaltspräferenzen
        $stmt = $this->db->query("
            SELECT
                COUNT(*) FILTER (WHERE include_tageslosung = true) as with_tageslosung,
                COUNT(*) FILTER (WHERE include_sonntagstexte = true) as with_sonntagstexte
            FROM newsletter_preferences p
            JOIN newsletter_subscribers s ON p.subscriber_id = s.id
            WHERE s.status = 'confirmed'
        ");
        $contentStats = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'success' => true,
            'data' => [
                'subscribers' => $subscriberStats,
                'sends' => $sendStats,
                'content_preferences' => $contentStats
            ]
        ];
    }

    /**
     * Admin: Test-Email senden
     */
    public function sendTestEmail(array $data): array {
        $email = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
        if (!$email) {
            throw new Exception('Ungültige E-Mail-Adresse');
        }

        $type = $data['type'] ?? 'tageslosung';

        // Dummy-Subscriber für Test
        $testSubscriber = [
            'email' => $email,
            'name' => 'Test-Empfänger',
            'unsubscribe_token' => 'test-token',
            'include_predigttext' => true,
            'include_lesungen' => true,
            'include_psalm' => true,
            'include_wochenspruch' => true
        ];

        if ($type === 'tageslosung') {
            // Test-Losung laden
            $testData = [
                'date' => date('Y-m-d'),
                'losung' => ['reference' => 'Psalm 23,1', 'text' => 'Der HERR ist mein Hirte, mir wird nichts mangeln.'],
                'lehrtext' => ['reference' => 'Johannes 10,11', 'text' => 'Ich bin der gute Hirte. Der gute Hirte lässt sein Leben für die Schafe.'],
                'translations' => [['code' => 'LUT', 'name' => 'Lutherbibel 2017']]
            ];
            $result = $this->emailService->sendTageslosung($testSubscriber, $testData);
        } else {
            // Test-Sonntagsdaten
            $testData = [
                'datum' => date('Y-m-d', strtotime('next sunday')),
                'name' => '2. Sonntag nach Epiphanias',
                'liturgische_farbe' => 'grün',
                'kirchenjahreszeit' => 'Epiphanias',
                'perikopenreihe' => ['aktuell' => 'II', 'kirchenjahr' => '2025/2026'],
                'wochenspruch' => ['referenz' => 'Joh 1,16', 'text' => 'Von seiner Fülle haben wir alle genommen Gnade um Gnade.'],
                'predigttext' => ['referenz' => 'Röm 12,9-16'],
                'lesungen' => [
                    'altes_testament' => ['referenz' => '2. Mose 33,17b-23'],
                    'epistel' => ['referenz' => 'Röm 12,9-16'],
                    'evangelium' => ['referenz' => 'Joh 2,1-11']
                ]
            ];
            $result = $this->emailService->sendSonntagsvorschau($testSubscriber, $testData);
        }

        return [
            'success' => $result,
            'message' => $result ? 'Test-E-Mail wurde gesendet' : 'Fehler beim Senden'
        ];
    }

    // === Private Hilfsmethoden ===

    private function getSubscriberByEmail(string $email): ?array {
        $stmt = $this->db->prepare("SELECT * FROM newsletter_subscribers WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function getSubscriberByToken(string $token): ?array {
        $stmt = $this->db->prepare("SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = ?");
        $stmt->execute([$token]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function createPreferences(string $subscriberId, array $data): void {
        $stmt = $this->db->prepare("
            INSERT INTO newsletter_preferences (
                subscriber_id,
                include_tageslosung,
                include_sonntagstexte,
                include_predigttext,
                include_lesungen,
                include_psalm,
                include_wochenspruch,
                translations,
                delivery_days_tageslosung,
                delivery_days_sonntag,
                delivery_hour
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $subscriberId,
            $this->toBool($data['include_tageslosung'] ?? true),
            $this->toBool($data['include_sonntagstexte'] ?? false),
            $this->toBool($data['include_predigttext'] ?? true),
            $this->toBool($data['include_lesungen'] ?? true),
            $this->toBool($data['include_psalm'] ?? true),
            $this->toBool($data['include_wochenspruch'] ?? true),
            json_encode($data['translations'] ?? ['LUT']),
            json_encode($data['delivery_days_tageslosung'] ?? [1,2,3,4,5,6]),
            json_encode($data['delivery_days_sonntag'] ?? [4,6]),
            (int)($data['delivery_hour'] ?? 6)
        ]);
    }

    private function reactivate(string $subscriberId, array $data): array {
        // Status zurücksetzen
        $stmt = $this->db->prepare("
            UPDATE newsletter_subscribers
            SET status = 'pending',
                confirmation_token = uuid_generate_v4(),
                unsubscribed_at = NULL
            WHERE id = ?
            RETURNING confirmation_token
        ");
        $stmt->execute([$subscriberId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        // Präferenzen aktualisieren
        $this->updatePreferencesById($subscriberId, $data);

        // Neue Bestätigungsmail
        $subscriber = $this->getSubscriberById($subscriberId);
        $this->emailService->sendConfirmation($subscriber['email'], $subscriber['name'], $result['confirmation_token']);

        return [
            'success' => true,
            'message' => 'Bitte bestätige deine erneute Anmeldung über den Link in der E-Mail'
        ];
    }

    private function getSubscriberById(string $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM newsletter_subscribers WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Konvertiert verschiedene Werte zu Boolean für PostgreSQL
     */
    private function toBool($value): bool {
        if (is_bool($value)) return $value;
        if ($value === '' || $value === null) return false;
        if (is_string($value)) {
            return in_array(strtolower($value), ['true', '1', 'yes', 'on'], true);
        }
        return (bool)$value;
    }

    private function updatePreferencesById(string $subscriberId, array $data): void {
        $stmt = $this->db->prepare("
            UPDATE newsletter_preferences SET
                include_tageslosung = COALESCE(?, include_tageslosung),
                include_sonntagstexte = COALESCE(?, include_sonntagstexte),
                translations = COALESCE(?, translations)
            WHERE subscriber_id = ?
        ");

        $stmt->execute([
            $data['include_tageslosung'] ?? null,
            $data['include_sonntagstexte'] ?? null,
            isset($data['translations']) ? json_encode($data['translations']) : null,
            $subscriberId
        ]);
    }
}
