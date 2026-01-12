<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
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

$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : 0;
$sinceId = isset($_GET['since_id']) ? (int)$_GET['since_id'] : 0;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'user_id is required']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT id, from_user_id, to_user_id, to_station_id, type, payload, created_at FROM webrtc_signals WHERE to_user_id = :user_id AND id > :since_id AND consumed = 0 ORDER BY id ASC LIMIT 100');
    $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $stmt->bindValue(':since_id', $sinceId, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $signals = [];
    $idsToMark = [];

    foreach ($rows as $row) {
        $idsToMark[] = (int)$row['id'];

        $payload = json_decode($row['payload'], true);
        if ($payload === null && json_last_error() !== JSON_ERROR_NONE) {
            $payload = $row['payload'];
        }

        $signals[] = [
            'id' => (int)$row['id'],
            'from_user_id' => $row['from_user_id'] !== null ? (int)$row['from_user_id'] : null,
            'to_user_id' => $row['to_user_id'] !== null ? (int)$row['to_user_id'] : null,
            'to_station_id' => $row['to_station_id'] !== null ? (int)$row['to_station_id'] : null,
            'type' => $row['type'],
            'payload' => $payload,
            'created_at' => $row['created_at'],
        ];
    }

    if (!empty($idsToMark)) {
        $placeholders = implode(',', array_fill(0, count($idsToMark), '?'));
        $updateSql = "UPDATE webrtc_signals SET consumed = 1 WHERE id IN ($placeholders)";
        $updateStmt = $pdo->prepare($updateSql);
        foreach ($idsToMark as $index => $id) {
            $updateStmt->bindValue($index + 1, $id, PDO::PARAM_INT);
        }
        $updateStmt->execute();
    }

    echo json_encode([
        'success' => true,
        'signals' => $signals,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error fetching user signals']);
}
