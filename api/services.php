<?php
/**
 * Gottesdienst-Management API
 * Endpoints für CRUD-Operationen der Gottesdienste
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// API-Key Validierung
if (!validateApiKey()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid or missing API key',
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_GET['path'] ?? '';

try {
    $pdo = new PDO($dsn, $username, $password, $options);
    
    switch ($method) {
        case 'GET':
            handleGet($pdo, $path);
            break;
        case 'POST':
            handlePost($pdo, $path);
            break;
        case 'PUT':
            handlePut($pdo, $path);
            break;
        case 'DELETE':
            handleDelete($pdo, $path);
            break;
        default:
            throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/**
 * GET Requests
 */
function handleGet($pdo, $path) {
    switch ($path) {
        case 'perikopes':
            getPerikopes($pdo);
            break;
        case 'services':
            getServices($pdo);
            break;
        case 'service':
            getService($pdo, $_GET['id'] ?? null);
            break;
        case 'services/by-perikope':
            getServicesByPerikope($pdo, $_GET['perikope_id'] ?? null);
            break;
        case 'services/calendar':
            getServicesCalendar($pdo, $_GET['year'] ?? date('Y'), $_GET['month'] ?? null);
            break;
        case 'search':
            searchServices($pdo, $_GET['q'] ?? '');
            break;
        default:
            throw new Exception('Endpoint not found');
    }
}

/**
 * POST Requests
 */
function handlePost($pdo, $path) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    switch ($path) {
        case 'service':
            createService($pdo, $input);
            break;
        case 'service/component':
            createServiceComponent($pdo, $input);
            break;
        default:
            throw new Exception('Endpoint not found');
    }
}

// =========================
// GET Endpoint Functions
// =========================

/**
 * Alle Perikopen abrufen
 */
function getPerikopes($pdo) {
    $stmt = $pdo->prepare("
        SELECT 
            id, event_name, event_type, liturgical_color, season,
            perikope_I, perikope_II, perikope_III, perikope_IV, perikope_V, perikope_VI,
            psalm, weekly_verse, weekly_verse_reference
        FROM perikopes 
        ORDER BY 
            CASE event_type 
                WHEN 'holiday' THEN 1 
                WHEN 'sunday' THEN 2 
                WHEN 'season_start' THEN 3 
                ELSE 4 
            END,
            event_name
    ");
    
    $stmt->execute();
    $perikopes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $perikopes,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/**
 * Gottesdienste abrufen (mit Filtern)
 */
function getServices($pdo) {
    $limit = min(100, max(1, intval($_GET['limit'] ?? 20)));
    $offset = max(0, intval($_GET['offset'] ?? 0));
    $year = $_GET['year'] ?? null;
    $service_type = $_GET['type'] ?? null;
    
    $whereConditions = [];
    $params = [];
    
    if ($year) {
        $whereConditions[] = "EXTRACT(YEAR FROM s.date) = :year";
        $params['year'] = $year;
    }
    
    if ($service_type) {
        $whereConditions[] = "s.service_type = :service_type";
        $params['service_type'] = $service_type;
    }
    
    $whereClause = empty($whereConditions) ? '' : 'WHERE ' . implode(' AND ', $whereConditions);
    
    $stmt = $pdo->prepare("
        SELECT 
            s.id, s.title, s.service_type, s.date, s.time, s.location,
            s.chosen_perikope, s.congregation_size, s.notes,
            p.event_name, p.liturgical_color, p.season,
            COUNT(sc.id) as component_count
        FROM services s
        LEFT JOIN perikopes p ON s.perikope_id = p.id
        LEFT JOIN service_components sc ON s.id = sc.service_id
        $whereClause
        GROUP BY s.id, p.id
        ORDER BY s.date DESC, s.time DESC
        LIMIT :limit OFFSET :offset
    ");
    
    foreach ($params as $key => $value) {
        $stmt->bindValue(":$key", $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    
    $stmt->execute();
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Formatiere Daten
    foreach ($services as &$service) {
        $service['date'] = date('Y-m-d', strtotime($service['date']));
        $service['component_count'] = intval($service['component_count']);
        $service['congregation_size'] = $service['congregation_size'] ? intval($service['congregation_size']) : null;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $services,
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => count($services) === $limit
        ],
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/**
 * Einzelnen Gottesdienst abrufen
 */
function getService($pdo, $serviceId) {
    if (!$serviceId) {
        throw new Exception('Service ID required');
    }
    
    // Gottesdienst-Grunddaten
    $stmt = $pdo->prepare("
        SELECT 
            s.*,
            p.event_name, p.liturgical_color, p.season, p.event_type,
            p.perikope_I, p.perikope_II, p.perikope_III, p.perikope_IV, p.perikope_V, p.perikope_VI,
            p.psalm, p.weekly_verse, p.weekly_verse_reference
        FROM services s
        LEFT JOIN perikopes p ON s.perikope_id = p.id
        WHERE s.id = :id
    ");
    
    $stmt->execute(['id' => $serviceId]);
    $service = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$service) {
        throw new Exception('Service not found');
    }
    
    // Komponenten abrufen
    $stmt = $pdo->prepare("
        SELECT * FROM service_components 
        WHERE service_id = :service_id 
        ORDER BY order_position ASC, created_at ASC
    ");
    
    $stmt->execute(['service_id' => $serviceId]);
    $service['components'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Tags abrufen
    $stmt = $pdo->prepare("
        SELECT tag FROM service_tags 
        WHERE service_id = :service_id 
        ORDER BY tag
    ");
    
    $stmt->execute(['service_id' => $serviceId]);
    $service['tags'] = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'tag');
    
    echo json_encode([
        'success' => true,
        'data' => $service,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/**
 * Gottesdienste nach Perikope (historische Übersicht)
 */
function getServicesByPerikope($pdo, $perikopeId) {
    if (!$perikopeId) {
        throw new Exception('Perikope ID required');
    }
    
    $stmt = $pdo->prepare("
        SELECT 
            s.id, s.title, s.date, s.time, s.chosen_perikope,
            s.congregation_size, s.notes,
            EXTRACT(YEAR FROM s.date) as year,
            COUNT(sc.id) as component_count
        FROM services s
        LEFT JOIN service_components sc ON s.id = sc.service_id AND sc.component_type = 'sermon'
        WHERE s.perikope_id = :perikope_id
        GROUP BY s.id
        ORDER BY s.date DESC
    ");
    
    $stmt->execute(['perikope_id' => $perikopeId]);
    $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'data' => $services,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// =========================
// POST Endpoint Functions
// =========================

/**
 * Neuen Gottesdienst erstellen
 */
function createService($pdo, $input) {
    $requiredFields = ['title', 'date', 'service_type'];
    
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Field '$field' is required");
        }
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO services (
            title, service_type, date, time, location, 
            perikope_id, chosen_perikope, congregation_size, notes
        ) VALUES (
            :title, :service_type, :date, :time, :location,
            :perikope_id, :chosen_perikope, :congregation_size, :notes
        ) RETURNING id
    ");
    
    $params = [
        'title' => $input['title'],
        'service_type' => $input['service_type'],
        'date' => $input['date'],
        'time' => $input['time'] ?? '10:00',
        'location' => $input['location'] ?? 'Hauptkirche',
        'perikope_id' => $input['perikope_id'] ?? null,
        'chosen_perikope' => $input['chosen_perikope'] ?? null,
        'congregation_size' => $input['congregation_size'] ?? null,
        'notes' => $input['notes'] ?? null
    ];
    
    $stmt->execute($params);
    $serviceId = $stmt->fetchColumn();
    
    // Tags hinzufügen falls vorhanden
    if (!empty($input['tags']) && is_array($input['tags'])) {
        $tagStmt = $pdo->prepare("
            INSERT INTO service_tags (service_id, tag) 
            VALUES (:service_id, :tag)
            ON CONFLICT (service_id, tag) DO NOTHING
        ");
        
        foreach ($input['tags'] as $tag) {
            $tagStmt->execute([
                'service_id' => $serviceId,
                'tag' => trim(strtolower($tag))
            ]);
        }
    }
    
    echo json_encode([
        'success' => true,
        'data' => ['id' => $serviceId],
        'message' => 'Service created successfully',
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/**
 * Gottesdienst-Komponente erstellen
 */
function createServiceComponent($pdo, $input) {
    $requiredFields = ['service_id', 'component_type', 'title'];
    
    foreach ($requiredFields as $field) {
        if (empty($input[$field])) {
            throw new Exception("Field '$field' is required");
        }
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO service_components (
            service_id, component_type, title, content, bible_reference,
            hymn_number, order_position, duration_minutes, notes
        ) VALUES (
            :service_id, :component_type, :title, :content, :bible_reference,
            :hymn_number, :order_position, :duration_minutes, :notes
        ) RETURNING id
    ");
    
    $params = [
        'service_id' => $input['service_id'],
        'component_type' => $input['component_type'],
        'title' => $input['title'],
        'content' => $input['content'] ?? null,
        'bible_reference' => $input['bible_reference'] ?? null,
        'hymn_number' => $input['hymn_number'] ?? null,
        'order_position' => $input['order_position'] ?? 0,
        'duration_minutes' => $input['duration_minutes'] ?? null,
        'notes' => $input['notes'] ?? null
    ];
    
    $stmt->execute($params);
    $componentId = $stmt->fetchColumn();
    
    echo json_encode([
        'success' => true,
        'data' => ['id' => $componentId],
        'message' => 'Component created successfully',
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/**
 * Handle DELETE requests
 */
function handleDelete($pdo, $path) {
    if ($path === 'service' && isset($_GET['id'])) {
        $serviceId = (int)$_GET['id'];
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Delete service components first (foreign key constraint)
            $stmt = $pdo->prepare("DELETE FROM service_components WHERE service_id = ?");
            $stmt->execute([$serviceId]);
            
            // Delete service tags
            $stmt = $pdo->prepare("DELETE FROM service_tags WHERE service_id = ?");
            $stmt->execute([$serviceId]);
            
            // Delete the service itself
            $stmt = $pdo->prepare("DELETE FROM services WHERE id = ?");
            $stmt->execute([$serviceId]);
            
            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'Service not found',
                    'timestamp' => date('c')
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                return;
            }
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Service deleted successfully',
                'timestamp' => date('c')
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    } else {
        throw new Exception('Invalid DELETE request');
    }
}
?>