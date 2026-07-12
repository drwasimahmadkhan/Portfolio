<?php

declare(strict_types=1);

function loadEnv(string $path): array
{
    if (!is_readable($path)) {
        return [];
    }

    $env = [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $env[trim($parts[0])] = trim($parts[1]);
    }

    return $env;
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload);
    exit;
}

function getCalendarConfig(): array
{
    $envPath = dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
    $env = loadEnv($envPath);

    $calendarId = $env['Calendar_ID'] ?? '';
    $apiKey = $env['Calendar-Key'] ?? ($env['Calendar_Key'] ?? '');
    $webhook = $env['Calendar_Webhook'] ?? ($env['Calendar-Webhook'] ?? '');

    if ($calendarId === '' || $apiKey === '') {
        jsonResponse([
            'ok' => false,
            'error' => 'Calendar_ID and Calendar-Key must be set in .env',
        ], 500);
    }

    return [
        'calendar_id' => $calendarId,
        'api_key' => $apiKey,
        'calendar_webhook' => $webhook,
        'timezone' => $env['Calendar_Timezone'] ?? 'Asia/Karachi',
        'service_account_path' => __DIR__ . DIRECTORY_SEPARATOR . 'service-account.json',
        'bookings_path' => __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'bookings.json',
        'env_path' => $envPath,
    ];
}

function ensureBookingsStore(string $path): bool
{
    $dir = dirname($path);
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        return false;
    }

    if (!is_file($path)) {
        return file_put_contents($path, json_encode([], JSON_PRETTY_PRINT)) !== false;
    }

    return is_writable($path);
}

function readBookings(string $path): array
{
    if (!ensureBookingsStore($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

function writeBookings(string $path, array $bookings): bool
{
    if (!ensureBookingsStore($path)) {
        return false;
    }

    return file_put_contents(
        $path,
        json_encode(array_values($bookings), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
    ) !== false;
}

function base64UrlEncode(string $value): string
{
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function getServiceAccountAccessToken(?string $jsonPath = null): ?string
{
    $serviceAccount = null;

    if ($jsonPath && is_readable($jsonPath)) {
        $serviceAccount = json_decode(file_get_contents($jsonPath) ?: '', true);
    }

    if (!is_array($serviceAccount)) {
        return null;
    }

    if (empty($serviceAccount['client_email']) || empty($serviceAccount['private_key'])) {
        return null;
    }

    $now = time();
    $header = base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $claim = base64UrlEncode(json_encode([
        'iss' => $serviceAccount['client_email'],
        'scope' => 'https://www.googleapis.com/auth/calendar',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ]));

    $unsigned = $header . '.' . $claim;
    $signature = '';
    $privateKey = openssl_pkey_get_private($serviceAccount['private_key']);
    if (!$privateKey) {
        return null;
    }

    openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256);
    $jwt = $unsigned . '.' . base64UrlEncode($signature);

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]),
    ]);

    $response = curl_exec($ch);
    curl_close($ch);
    $tokenData = json_decode($response ?: '', true);

    return $tokenData['access_token'] ?? null;
}

function createGoogleEventViaWebhook(string $webhookUrl, array $payload): array
{
    if ($webhookUrl === '') {
        return ['ok' => false, 'error' => 'Calendar_Webhook not configured'];
    }

    $ch = curl_init($webhookUrl);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $body = json_decode($response ?: '', true);
    if ($status >= 200 && $status < 300 && is_array($body) && !empty($body['ok'])) {
        return ['ok' => true, 'event_id' => $body['eventId'] ?? null];
    }

    return [
        'ok' => false,
        'error' => is_array($body) ? ($body['error'] ?? 'Webhook request failed') : 'Webhook request failed',
        'status' => $status,
    ];
}

function createGoogleEventViaServiceAccount(string $calendarId, string $serviceAccountPath, array $eventBody): array
{
    $accessToken = getServiceAccountAccessToken($serviceAccountPath);
    if (!$accessToken) {
        return ['ok' => false, 'error' => 'Service account not configured'];
    }

    $url = 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calendarId) . '/events';
    $googleResponse = googleCalendarRequest('POST', $url, $accessToken, $eventBody);

    if ($googleResponse['status'] >= 200 && $googleResponse['status'] < 300) {
        return [
            'ok' => true,
            'event_id' => $googleResponse['body']['id'] ?? null,
        ];
    }

    $error = $googleResponse['body']['error']['message'] ?? 'Google Calendar API error';
    return ['ok' => false, 'error' => $error, 'status' => $googleResponse['status']];
}

function buildIsoDateTime(string $date, string $time, string $timezone): array
{
    $dateTime = DateTime::createFromFormat('Y-m-d H:i', $date . ' ' . $time, new DateTimeZone($timezone));
    if (!$dateTime) {
        return ['ok' => false, 'error' => 'Invalid date or time'];
    }

    $startIso = $dateTime->format('c');
    return ['ok' => true, 'start' => $dateTime, 'start_iso' => $startIso];
}

function googleCalendarRequest(string $method, string $url, ?string $accessToken = null, ?array $body = null): array
{
    $headers = ['Content-Type: application/json'];
    if ($accessToken) {
        $headers[] = 'Authorization: Bearer ' . $accessToken;
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
    ]);

    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'status' => $status,
        'body' => json_decode($response ?: '', true),
        'raw' => $response,
    ];
}

function normalizeEvents(array $googleEvents, array $localBookings): array
{
    $events = [];
    $seen = [];

    foreach ($googleEvents as $event) {
        $start = $event['start']['dateTime'] ?? ($event['start']['date'] ?? null);
        $end = $event['end']['dateTime'] ?? ($event['end']['date'] ?? null);
        if (!$start || !$end) {
            continue;
        }

        $key = $start . '|' . $end . '|' . ($event['summary'] ?? '');
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;

        $events[] = [
            'id' => $event['id'] ?? uniqid('g_', true),
            'title' => $event['summary'] ?? 'Booked session',
            'start' => $start,
            'end' => $end,
            'source' => 'google',
        ];
    }

    foreach ($localBookings as $booking) {
        if (empty($booking['start']) || empty($booking['end'])) {
            continue;
        }

        $key = $booking['start'] . '|' . $booking['end'] . '|' . ($booking['title'] ?? '');
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;

        $events[] = [
            'id' => $booking['id'] ?? uniqid('l_', true),
            'title' => $booking['title'] ?? 'Atelier session',
            'start' => $booking['start'],
            'end' => $booking['end'],
            'source' => 'local',
        ];
    }

    usort($events, fn($a, $b) => strcmp($a['start'], $b['start']));
    return $events;
}
