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

$stationId = isset($_GET['station_id']) ? (int)$_GET['station_id'] : 0;
$sinceId   = isset($_GET['since_id']) ? (int)$_GET['since_id'] : 0;

if (!$stationId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'station_id is required']);
    exit;
}

try {
    // Only fetch offer signals for this station so that
    // answers/ICE destined for a specific user are not consumed here.
    $stmt = $pdo->prepare('SELECT id, from_user_id, type, payload, created_at FROM webrtc_signals WHERE to_station_id = :station_id AND id > :since_id AND consumed = 0 AND type = "offer" ORDER BY id ASC LIMIT 100');
    $stmt->bindValue(':station_id', $stationId, PDO::PARAM_INT);
    $stmt->bindValue(':since_id', $sinceId, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $signals = [];
    $idsToMark = [];

    foreach ($rows as $row) {
        $idsToMark[] = (int)$row['id'];

        $payload = json_decode($row['payload'], true);
        if ($payload === null && json_last_error() !== JSON_ERROR_NONE) {
            $payload = $row['payload']; // fallback raw string
        }

        $signals[] = [
            'id' => (int)$row['id'],
            'from_user_id' => $row['from_user_id'] !== null ? (int)$row['from_user_id'] : null,
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
    echo json_encode(['success' => false, 'error' => 'Database error fetching signals']);
}
