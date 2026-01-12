<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Database configuration
$config = require __DIR__ . '/../config/database.php';
$servername = $config['host'];
$username = $config['username'];
$password = $config['password'];
$dbname = $config['database'];

try {
    // Create connection
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get query parameters
    $truck_id = $_GET['truck_id'] ?? null;
    $station_id = $_GET['station_id'] ?? null;
    $active_only = isset($_GET['active_only']) ? (bool)$_GET['active_only'] : false;
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
    
    // Build the query
    $sql = "SELECT 
                f.truck_id,
                f.plate_number,
                f.model,
                f.current_latitude as latitude,
                f.current_longitude as longitude,
                f.last_location_update,
                f.last_online,
                f.battery_level,
                f.status,
                f.current_alarm_id,
                f.station_id,
                fs.station_name,
                fs.contact_number as station_contact,
                a.status as alarm_status,
                a.user_latitude as alarm_latitude,
                a.user_longitude as alarm_longitude,
                a.initial_alarm_level,
                a.current_alarm_level,
                u.full_name as driver_name,
                u.phone_number as driver_phone
            FROM firetrucks f
            LEFT JOIN fire_stations fs ON f.station_id = fs.station_id
            LEFT JOIN users u ON f.driver_user_id = u.user_id
            LEFT JOIN alarms a ON f.current_alarm_id = a.alarm_id
            WHERE 1=1";
    
    $params = [];
    
    // Add filters
    if ($truck_id !== null) {
        $sql .= " AND f.truck_id = :truck_id";
        $params[':truck_id'] = $truck_id;
    }
    
    if ($station_id !== null) {
        $sql .= " AND f.station_id = :station_id";
        $params[':station_id'] = $station_id;
    }
    
    if ($active_only) {
        $sql .= " AND f.status = 'on_mission' AND f.current_alarm_id IS NOT NULL";
    }
    
    // Only show trucks that are marked active, have coordinates, and checked in recently
    // This ensures markers disappear when tracking stops or the truck is set inactive.
    $sql .= " AND f.is_active = 1"
          . " AND f.current_latitude IS NOT NULL AND f.current_longitude IS NOT NULL"
          . " AND f.last_online >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)";
    
    // Order and limit
    $sql .= " ORDER BY f.last_online DESC";
    
    if ($limit > 0) {
        $sql .= " LIMIT :limit";
        $params[':limit'] = $limit;
    }
    
    // Prepare and execute the query
    $stmt = $conn->prepare($sql);
    
    // Bind parameters with proper types
    foreach ($params as $key => $value) {
        $paramType = is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR;
        $stmt->bindValue($key, $value, $paramType);
    }
    
    $stmt->execute();
    
    // Fetch all results
    $trucks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the response
    $response = [
        'success' => true,
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => array_map(function($truck) {
            // Add a status indicator based on last update time
            $lastUpdate = strtotime($truck['last_online']);
            $minutesAgo = round((time() - $lastUpdate) / 60);
            
            if ($minutesAgo > 5) {
                $truck['status'] = 'offline';
            } elseif ($truck['status'] === null) {
                $truck['status'] = 'available';
            }
            
            // Add a human-readable last update time
            $truck['last_update_ago'] = $minutesAgo . ' minutes ago';
            
            return $truck;
        }, $trucks)
    ];
    
    echo json_encode($response);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}