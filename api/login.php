<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$idNumber = $data['idNumber'] ?? null;
$password = $data['password'] ?? null;

if (!$idNumber || !$password) {
    http_response_code(400);
    echo json_encode(['message' => 'ID Number and password are required']);
    exit;
}

try {
    $dbConfig = require __DIR__ . '/../config/database.php';
    $dsn = 'mysql:host=' . $dbConfig['host'] . ';dbname=' . $dbConfig['database'] . ';charset=utf8mb4';
    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $stmt = $pdo->prepare('SELECT * FROM users WHERE phone_number = :idNumber LIMIT 1');
    $stmt->execute([':idNumber' => $idNumber]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['message' => 'Invalid ID Number or password']);
        exit;
    }

    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['message' => 'Invalid ID Number or password']);
        exit;
    }

    $tokenPayload = base64_encode(random_bytes(24));

    echo json_encode([
        'token' => $tokenPayload,
        'user' => [
            'id' => (int)$user['user_id'],
            'idNumber' => $idNumber,
            'name' => $user['full_name'],
            'firstName' => $user['full_name'],
            'lastName' => '',
            'rank' => null,
            'substation' => null,
            'assignedStationId' => $user['assigned_station_id'],
            'stationInfo' => null,
            'role' => $user['role'],
            'assigned' => $user['assigned_station_id'] !== null,
        ],
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'message' => 'Login failed',
        'error' => $e->getMessage(),
    ]);
}
