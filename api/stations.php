<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
    exit;
}

try {
    $dbConfig = require __DIR__ . '/../config/database.php';
    $dsn = 'mysql:host=' . $dbConfig['host'] . ';dbname=' . $dbConfig['database'] . ';charset=utf8mb4';
    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $stmt = $pdo->query('SELECT station_id, station_name, province, city, contact_number, latitude, longitude FROM fire_stations ORDER BY station_name ASC');
    $rows = $stmt->fetchAll();

    $stations = [];
    foreach ($rows as $row) {
        $stationType = ($row['station_id'] == 101) ? 'Main' : 'Substation';
        $stations[] = [
            'station_id' => (int)$row['station_id'],
            'station_name' => $row['station_name'],
            'station_type' => $stationType,
        ];
    }

    echo json_encode(['stations' => $stations]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'message' => 'Failed to retrieve stations',
        'error' => $e->getMessage(),
    ]);
}
