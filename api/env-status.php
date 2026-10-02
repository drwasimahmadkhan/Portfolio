<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

$config = getAppConfig();

jsonResponse([
    'ok' => true,
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? null,
    'api_dir' => __DIR__,
    'site_root' => dirname(__DIR__),
    'env_loaded' => !empty($config['env_loaded']),
    'env_files' => array_map(static function ($path) {
        return [
            'name' => basename((string) $path),
            'path' => (string) $path,
            'exists' => file_exists((string) $path),
        ];
    }, $config['env_paths'] ?? []),
    'has_admin_user' => ($config['admin_user'] ?? '') !== '',
    'has_admin_password' => ($config['admin_password'] ?? '') !== '',
    'has_calendar_id' => ($config['calendar_id'] ?? '') !== '',
    'has_calendar_key' => ($config['api_key'] ?? '') !== '',
    'has_payment_email' => ($config['payment_email'] ?? '') !== '',
    'keys_found' => $config['env_keys'] ?? [],
    'hint' => 'Live site is iwasim.com — upload files into the iwasim.com folder, not scentview.pk/portfolio.',
]);
