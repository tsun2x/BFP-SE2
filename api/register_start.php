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

$required = ['last_name', 'first_name', 'phone', 'email', 'password'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Missing required field: $field"
        ]);
        exit;
    }
}

$pdo = null;

try {
    // Load DB config
    $config = require __DIR__ . '/../config/database.php';
    $pdo = new PDO(
        "mysql:host={$config['host']};dbname={$config['database']};charset=utf8mb4",
        $config['username'],
        $config['password'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    // Check if email or phone already used
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = :email OR phone_number = :phone");
    $stmt->execute([
        ':email' => $data['email'],
        ':phone' => $data['phone'],
    ]);
    if ($stmt->fetchColumn() > 0) {
        http_response_code(409);
        echo json_encode([
            'success' => false,
            'error' => 'Email or phone already registered.'
        ]);
        exit;
    }

    // Hash password
    $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT);

    // Start transaction
    $pdo->beginTransaction();

    // Insert user (adapt field names to your users table)
    // Your current `users` table has a `password` column (not `password_hash`),
    // so we store the bcrypt hash into `password` and omit verification flags.
    $stmt = $pdo->prepare("
        INSERT INTO users 
          (full_name, phone_number, email, password, role)
        VALUES 
          (:full_name, :phone, :email, :password_hash, 'end_user')
    ");

    $fullName = trim($data['last_name'] . ' ' . $data['first_name'] . ' ' . ($data['middle_name'] ?? ''));
    $stmt->execute([
        ':full_name'     => $fullName,
        ':phone'         => $data['phone'],
        ':email'         => $data['email'],
        ':password_hash' => $passwordHash,
    ]);

    $userId = (int)$pdo->lastInsertId();

    // Generate 6‑digit OTP
    $otpCode = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = (new DateTime('+5 minutes'))->format('Y-m-d H:i:s');

    // Insert into user_otps
    $stmt = $pdo->prepare("
        INSERT INTO user_otps (user_id, channel, code, expires_at, is_used)
        VALUES (:user_id, 'sms', :code, :expires_at, 0)
    ");
    $stmt->execute([
        ':user_id'   => $userId,
        ':code'      => $otpCode,
        ':expires_at'=> $expiresAt,
    ]);

    $pdo->commit();

    // TODO: integrate real SMS provider here (Twilio, etc.)
    // For now, you can log or echo the OTP for testing:
    // error_log(\"OTP for user {$userId}: {$otpCode}\");

    echo json_encode([
        'success' => true,
        'user_id' => $userId,
        // 'debug_otp' => $otpCode, // ONLY for local testing, remove in production
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