<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
$code   = isset($data['code']) ? trim($data['code']) : '';

if (!$userId || $code === '') {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Missing user_id or code',
    ]);
    exit;
}

try {
    $config = require __DIR__ . '/../config/database.php';
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Find latest unused OTP for this user (sms)
    $stmt = $pdo->prepare("
        SELECT id, code, expires_at, is_used
        FROM user_otps
        WHERE user_id = :user_id
          AND channel = 'sms'
          AND is_used = 0
        ORDER BY created_at DESC
        LIMIT 1
    ");
    $stmt->execute([':user_id' => $userId]);
    $otp = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$otp) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'No active OTP found. Please request a new code.',
        ]);
        exit;
    }

    // Check code
    if ($otp['code'] !== $code) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid code.',
        ]);
        exit;
    }

    // Check expiry
    $now = new DateTime();
    $expiresAt = new DateTime($otp['expires_at']);
    if ($expiresAt < $now) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Code has expired. Please request a new one.',
        ]);
        exit;
    }

    // Mark OTP used + set phone_verified = 1
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        UPDATE user_otps
        SET is_used = 1
        WHERE id = :id
    ");
    $stmt->execute([':id' => $otp['id']]);

    $stmt = $pdo->prepare("
        UPDATE users
        SET phone_verified = 1
        WHERE user_id = :user_id
    ");
    $stmt->execute([':user_id' => $userId]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
    ]);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error: ' . $e->getMessage(),
    ]);
}