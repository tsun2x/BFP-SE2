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

$firstName = trim($data['firstName'] ?? '');
$lastName = trim($data['lastName'] ?? '');
$idNumber = trim($data['idNumber'] ?? '');
$rank = trim($data['rank'] ?? '');
$password = $data['password'] ?? '';
$role = $data['role'] ?? 'admin';
$assignedStationId = $data['assignedStationId'] ?? null;

if ($firstName === '' || $lastName === '' || $idNumber === '' || $rank === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['message' => 'All fields are required']);
    exit;
}

try {
    $dbConfig = require __DIR__ . '/../config/database.php';
    $dsn = 'mysql:host=' . $dbConfig['host'] . ';dbname=' . $dbConfig['database'] . ';charset=utf8mb4';
    $pdo = new PDO($dsn, $dbConfig['username'], $dbConfig['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $stmt = $pdo->prepare('SELECT COUNT(*) FROM users WHERE phone_number = :phone');
    $stmt->execute([':phone' => $idNumber]);
    if ($stmt->fetchColumn() > 0) {
        http_response_code(400);
        echo json_encode(['message' => 'User with this ID already exists']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $fullName = trim($firstName . ' ' . $lastName);

    $stmt = $pdo->prepare('INSERT INTO users (full_name, phone_number, email, password_hash, role, assigned_station_id) VALUES (:full_name, :phone, :email, :password_hash, :role, :assigned_station_id)');
    $stmt->execute([
        ':full_name' => $fullName,
        ':phone' => $idNumber,
        ':email' => null,
        ':password_hash' => $passwordHash,
        ':role' => $role,
        ':assigned_station_id' => $assignedStationId ?: null,
    ]);

    http_response_code(201);
    echo json_encode(['message' => 'User registered successfully. Please login.']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'message' => 'Registration failed',
        'error' => $e->getMessage(),
    ]);
}
