<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only process POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get the raw POST data
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validate required fields
$required_fields = ['truck_id', 'latitude', 'longitude'];
foreach ($required_fields as $field) {
    if (!isset($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit();
    }
}

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
    
    // Prepare and execute the stored procedure
    $stmt = $conn->prepare("CALL UpdateFiretruckLocation(
        :truck_id, :latitude, :longitude, :speed, :heading, 
        :battery_level, :accuracy, :alarm_id
    )");

    // Bind parameters (bindParam requires variables passed by reference)
    $truckId = (int)$data['truck_id'];
    $latitude = $data['latitude'];
    $longitude = $data['longitude'];
    $speed = $data['speed'] ?? null;
    $heading = $data['heading'] ?? null;
    $batteryLevel = $data['battery_level'] ?? null;
    $accuracy = $data['accuracy'] ?? null;
    $alarmId = $data['alarm_id'] ?? null;

    $stmt->bindParam(':truck_id', $truckId, PDO::PARAM_INT);
    $stmt->bindParam(':latitude', $latitude);
    $stmt->bindParam(':longitude', $longitude);
    $stmt->bindParam(':speed', $speed);
    $stmt->bindParam(':heading', $heading);
    $stmt->bindParam(':battery_level', $batteryLevel, PDO::PARAM_INT);
    $stmt->bindParam(':accuracy', $accuracy);
    $stmt->bindParam(':alarm_id', $alarmId, PDO::PARAM_INT);
    
    // Execute the query
    $stmt->execute();
    
    // Get the result
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => $result['message'] ?? 'Location updated successfully',
        'truck_id' => $data['truck_id'],
        'updated_at' => date('Y-m-d H:i:s')
    ]);
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}