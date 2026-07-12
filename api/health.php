<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

$config = getCalendarConfig();
$bookings = readBookings($config['bookings_path']);

$calendarId = rawurlencode($config['calendar_id']);
$testUrl = "https://www.googleapis.com/calendar/v3/calendars/{$calendarId}/events"
    . "?key={$config['api_key']}"
    . "&maxResults=1"
    . "&timeMin=" . rawurlencode(gmdate('c'))
    . "&timeMax=" . rawurlencode(gmdate('c', strtotime('+1 day')));

$googleTest = googleCalendarRequest('GET', $testUrl);

jsonResponse([
    'ok' => true,
    'env_loaded' => is_readable($config['env_path']),
    'bookings_file' => $config['bookings_path'],
    'bookings_writable' => is_writable(dirname($config['bookings_path'])) || is_writable($config['bookings_path']),
    'local_bookings_count' => count($bookings),
    'webhook_configured' => !empty($config['calendar_webhook']),
    'service_account_configured' => is_readable($config['service_account_path']),
    'google_read_status' => $googleTest['status'],
    'google_read_error' => $googleTest['body']['error']['message'] ?? null,
    'php_curl' => function_exists('curl_init'),
    'php_openssl' => function_exists('openssl_sign'),
]);
