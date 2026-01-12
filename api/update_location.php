<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

$data = json_decode(file_get_contents('php://input'), true);

// Required fields
$required = ['truck_id', 'latitude', 'longitude'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

// Connect to database
$host = 'localhost';
$dbname = 'bfp_emergency_system';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Update firetruck location
    $stmt = $pdo->prepare("
        UPDATE firetrucks 
        SET current_latitude = :latitude, 
            current_longitude = :longitude,
            last_location_update = CURRENT_TIMESTAMP
        WHERE truck_id = :truck_id
    ");

    $stmt->execute([
        ':truck_id' => $data['truck_id'],
        ':latitude' => $data['latitude'],
        ':longitude' => $data['longitude']
    ]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Location updated successfully']);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Truck not found']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
