<?php
/**
 * Newsletter API Endpoint
 * Handles subscription, confirmation, preferences, and unsubscription
 */

require_once __DIR__ . '/database.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/newsletter/NewsletterService.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

try {
    $newsletterService = new NewsletterService();

    // Action aus GET oder POST
    $action = $_GET['action'] ?? $_POST['action'] ?? '';

    // JSON Body parsen falls POST mit JSON
    $inputData = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $rawInput = file_get_contents('php://input');
        if ($rawInput) {
            $inputData = json_decode($rawInput, true) ?? [];
        }
        $inputData = array_merge($_POST, $inputData);
    }

    switch ($action) {
        // === Öffentliche Endpunkte (kein API-Key) ===

        case 'subscribe':
            // Neue Anmeldung
            $result = $newsletterService->subscribe($inputData);
            break;

        case 'confirm':
            // Double Opt-In Bestätigung
            $token = $_GET['token'] ?? '';
            $result = $newsletterService->confirm($token);
            break;

        case 'unsubscribe':
            // Abmeldung
            $token = $_GET['token'] ?? '';
            $result = $newsletterService->unsubscribe($token);
            break;

        case 'preferences':
            // Präferenzen abrufen oder aktualisieren
            $token = $_GET['token'] ?? '';
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                $result = $newsletterService->getPreferences($token);
            } else {
                $result = $newsletterService->updatePreferences($token, $inputData);
            }
            break;

        // === Admin-Endpunkte (API-Key erforderlich) ===

        case 'admin_list':
            requireAuth();
            $result = $newsletterService->listSubscribers($_GET);
            break;

        case 'admin_stats':
            requireAuth();
            $result = $newsletterService->getStats();
            break;

        case 'admin_send_test':
            requireAuth();
            $result = $newsletterService->sendTestEmail($inputData);
            break;

        default:
            throw new Exception('Ungültige Aktion. Erlaubt: subscribe, confirm, unsubscribe, preferences');
    }

    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
