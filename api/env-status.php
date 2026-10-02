<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

$config = getAppConfig();

jsonResponse([
    'ok' => true,
    'env_loaded' => !empty($config['env_loaded']),
    'env_files' => array_map('basename', $config['env_paths'] ?? []),
    'has_admin_user' => ($config['admin_user'] ?? '') !== '',
    'has_admin_password' => ($config['admin_password'] ?? '') !== '',
    'has_calendar_id' => ($config['calendar_id'] ?? '') !== '',
    'has_calendar_key' => ($config['api_key'] ?? '') !== '',
    'has_payment_email' => ($config['payment_email'] ?? '') !== '',
    'keys_found' => $config['env_keys'] ?? [],
]);
