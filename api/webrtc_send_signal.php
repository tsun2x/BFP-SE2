<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$config = require __DIR__ . '/../config/database.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON body']);
    exit;
}

$fromUserId   = isset($data['from_user_id']) ? (int)$data['from_user_id'] : null;
$toUserId     = isset($data['to_user_id']) ? (int)$data['to_user_id'] : null;
$toStationId  = isset($data['to_station_id']) ? (int)$data['to_station_id'] : null;
$type         = isset($data['type']) ? trim($data['type']) : '';
$payload      = isset($data['payload']) ? $data['payload'] : null;

// Require at least one destination (station or user), plus type and payload.
if ((!$toStationId && !$toUserId) || !$type || $payload === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

// Only allow known types
$allowedTypes = ['offer', 'answer', 'ice', 'bye'];
if (!in_array($type, $allowedTypes, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid signal type']);
    exit;
}

try {
    $stmt = $pdo->prepare('INSERT INTO webrtc_signals (from_user_id, to_user_id, to_station_id, type, payload) VALUES (:from_user_id, :to_user_id, :to_station_id, :type, :payload)');

    $payloadJson = json_encode($payload);

    $stmt->bindValue(':from_user_id', $fromUserId !== null ? $fromUserId : null, $fromUserId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $stmt->bindValue(':to_user_id', $toUserId !== null ? $toUserId : null, $toUserId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $stmt->bindValue(':to_station_id', $toStationId, PDO::PARAM_INT);
    $stmt->bindValue(':type', $type, PDO::PARAM_STR);
    $stmt->bindValue(':payload', $payloadJson, PDO::PARAM_STR);

    $stmt->execute();

    echo json_encode([
        'success' => true,
        'id' => (int)$pdo->lastInsertId(),
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    // NOTE: Exposing the raw DB error is fine for local development,
    // but should be removed or sanitized in production.
    echo json_encode([
        'success' => false,
        'error' => 'Database error inserting signal',
        'detail' => $e->getMessage(),
    ]);
}
