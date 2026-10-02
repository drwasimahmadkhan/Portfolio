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
    $keys = implode(', ', $config['env_keys'] ?? []);
    $paths = implode(' | ', array_map('basename', $config['env_paths'] ?? []));
    jsonResponse([
        'ok' => false,
        'error' => 'Admin_Password missing from loaded env. Upload api/admin.env (see api/admin.env.example) OR add Admin_Password to the .env next to index.html. Loaded files: '
            . ($paths !== '' ? $paths : 'none')
            . '. Keys found: ' . ($keys !== '' ? $keys : 'none'),
        'env_loaded' => !empty($config['env_loaded']),
        'has_admin_password_key' => !empty($config['has_admin_password_key']),
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
