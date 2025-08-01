<?php
/**
 * Church Events API
 * Returns liturgical events from database
 */

require_once 'database.php';
require_once 'auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

try {
    $db = getDatabase();
    
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'today':
            $today = date('Y-m-d');
            $stmt = $db->prepare("
                SELECT * FROM church_events 
                WHERE event_date = ? 
                ORDER BY summary
            ");
            $stmt->execute([$today]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        case 'next':
            $today = date('Y-m-d');
            $stmt = $db->prepare("
                SELECT * FROM church_events 
                WHERE event_date >= ? 
                ORDER BY event_date ASC 
                LIMIT 1
            ");
            $stmt->execute([$today]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        case 'upcoming':
            $today = date('Y-m-d');
            $limit = (int)($_GET['limit'] ?? 10);
            $stmt = $db->prepare("
                SELECT * FROM church_events 
                WHERE event_date >= ? 
                ORDER BY event_date ASC 
                LIMIT ?
            ");
            $stmt->execute([$today, $limit]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        case 'date':
            $date = $_GET['date'] ?? date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Invalid date format. Use YYYY-MM-DD');
            }
            
            $stmt = $db->prepare("
                SELECT * FROM church_events 
                WHERE event_date = ? 
                ORDER BY summary
            ");
            $stmt->execute([$date]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        case 'range':
            $startDate = $_GET['start'] ?? date('Y-m-d');
            $endDate = $_GET['end'] ?? date('Y-m-d', strtotime('+1 year'));
            
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || 
                !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
                throw new Exception('Invalid date format. Use YYYY-MM-DD');
            }
            
            $stmt = $db->prepare("
                SELECT * FROM church_events 
                WHERE event_date BETWEEN ? AND ? 
                ORDER BY event_date ASC
            ");
            $stmt->execute([$startDate, $endDate]);
            $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
            break;
            
        default:
            throw new Exception('Invalid action. Use: today, next, upcoming, date, or range');
    }
    
    // Process events data
    foreach ($events as &$event) {
        // Convert perikopen JSON strings back to objects
        if ($event['perikopen']) {
            $event['perikopen'] = json_decode($event['perikopen'], true);
        }
        
        // Format date for German locale
        if ($event['event_date']) {
            $date = new DateTime($event['event_date']);
            $event['formatted_date'] = $date->format('l, d.m.Y');
            $event['formatted_date_german'] = $date->format('l, d.m.Y');
        }
        
        // Add hymn fields if available
        if ($event['hymn1'] || $event['hymn2']) {
            $event['hymns'] = [];
            if ($event['hymn1']) {
                $event['hymns'][] = [
                    'title' => $event['hymn1'],
                    'eg_number' => $event['hymn1_eg']
                ];
            }
            if ($event['hymn2']) {
                $event['hymns'][] = [
                    'title' => $event['hymn2'],
                    'eg_number' => $event['hymn2_eg']
                ];
            }
        }
        
        // Remove any null/empty values for cleaner JSON
        $event = array_filter($event, function($value) {
            return $value !== null && $value !== '';
        });
    }
    
    echo json_encode([
        'success' => true,
        'data' => $events,
        'count' => count($events),
        'action' => $action
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>