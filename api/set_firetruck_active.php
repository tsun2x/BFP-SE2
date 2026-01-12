<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$truckId = isset($input['truck_id']) ? (int)$input['truck_id'] : 0;
$isActive = isset($input['is_active']) ? (int)$input['is_active'] : 0;

if (!$truckId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing or invalid truck_id']);
    exit();
}

$config = require __DIR__ . '/../config/database.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $stmt = $pdo->prepare("UPDATE firetrucks SET is_active = :is_active WHERE truck_id = :truck_id");
    $stmt->execute([
        ':is_active' => $isActive,
        ':truck_id' => $truckId,
    ]);

    echo json_encode([
        'success' => true,
        'truck_id' => $truckId,
        'is_active' => $isActive,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage(),
    ]);
}
