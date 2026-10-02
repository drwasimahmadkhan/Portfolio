<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

startAdminSession();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    jsonResponse([
        'ok' => true,
        'authenticated' => isAdminAuthenticated(),
    ]);
}

if ($method !== 'POST') {
    jsonResponse(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    jsonResponse(['ok' => false, 'error' => 'Invalid JSON body'], 400);
}

$action = trim((string) ($payload['action'] ?? 'login'));

if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
    jsonResponse(['ok' => true, 'authenticated' => false]);
}

$config = getAppConfig();
$username = trim((string) ($payload['username'] ?? ''));
$password = (string) ($payload['password'] ?? '');

if ($config['admin_password'] === '') {
    jsonResponse([
        'ok' => false,
        'error' => 'Admin_Password is not set in .env',
    ], 500);
}

$expectedUser = $config['admin_user'] !== '' ? $config['admin_user'] : 'admin';

if (!hash_equals($expectedUser, $username) || !hash_equals($config['admin_password'], $password)) {
    jsonResponse(['ok' => false, 'error' => 'Invalid username or password'], 401);
}

$_SESSION['atelier_admin'] = true;
$_SESSION['atelier_admin_user'] = $username;

jsonResponse([
    'ok' => true,
    'authenticated' => true,
    'user' => $username,
]);
