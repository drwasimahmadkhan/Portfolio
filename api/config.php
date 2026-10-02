<?php

declare(strict_types=1);

function loadEnv(string $path): array
{
    if ($path === '' || !file_exists($path)) {
        return [];
    }

    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') {
        return [];
    }

    // Strip UTF-8 BOM if present (common after Windows/cPanel uploads)
    if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) {
        $raw = substr($raw, 3);
    }

    $env = [];
    $lines = preg_split("/\r\n|\n|\r/", $raw) ?: [];

    foreach ($lines as $line) {
        $line = trim($line);
        // Remove UTF-8 BOM / weird spaces on a per-line basis too
        $line = preg_replace('/^\xEF\xBB\xBF/u', '', $line);
        $line = trim($line, " \t\n\r\0\x0B\xC2\xA0");

        if ($line === '' || strpos($line, '#') === 0) {
            continue;
        }

        if (stripos($line, 'export ') === 0) {
            $line = trim(substr($line, 7));
        }

        $parts = explode('=', $line, 2);
        if (count($parts) !== 2) {
            continue;
        }

        $key = trim($parts[0], " \t\n\r\0\x0B\xC2\xA0\"'");
        $value = trim($parts[1], " \t\n\r\0\x0B\xC2\xA0");

        // Strip surrounding quotes
        if (
            strlen($value) >= 2 &&
            (($value[0] === '"' && substr($value, -1) === '"') ||
             ($value[0] === "'" && substr($value, -1) === "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        if ($key !== '') {
            $env[$key] = $value;
        }
    }

    return $env;
}

function envCandidatePaths(): array
{
    $roots = [];

    // Lowest priority first — later files override earlier ones when merged
    if (!empty($_SERVER['DOCUMENT_ROOT'])) {
        $docRoot = rtrim((string) $_SERVER['DOCUMENT_ROOT'], "/\\");
        $parent = dirname($docRoot);
        if ($parent && $parent !== $docRoot) {
            $roots[] = $parent;
        }
        $roots[] = $docRoot;
    }

    $roots[] = dirname(__DIR__); // site root next to index.html
    $roots[] = __DIR__;          // api/ folder (highest among candidates)

    $roots = array_values(array_unique(array_filter($roots)));
    $names = ['.env', 'env', '.env.local', 'env.txt'];
    $paths = [];

    foreach ($roots as $root) {
        foreach ($names as $name) {
            $paths[] = $root . DIRECTORY_SEPARATOR . $name;
        }
    }

    return $paths;
}

function resolveEnvPath(): string
{
    foreach (envCandidatePaths() as $path) {
        if (file_exists($path) && is_file($path)) {
            $probe = @file_get_contents($path, false, null, 0, 8);
            if ($probe !== false) {
                return $path;
            }
        }
    }

    return dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env';
}

function loadAllEnvFiles(): array
{
    $merged = [];
    $used = [];

    foreach (envCandidatePaths() as $path) {
        if (!file_exists($path) || !is_file($path)) {
            continue;
        }
        $chunk = loadEnv($path);
        if ($chunk === []) {
            continue;
        }
        $merged = array_merge($merged, $chunk);
        $used[] = $path;
    }

    $adminEnvPath = __DIR__ . DIRECTORY_SEPARATOR . 'admin.env';
    if (file_exists($adminEnvPath)) {
        $chunk = loadEnv($adminEnvPath);
        if ($chunk !== []) {
            $merged = array_merge($merged, $chunk);
            $used[] = $adminEnvPath;
        }
    }

    // Guaranteed deployable credentials (committed PHP file → always lands on iwasim.com via FTP)
    $credPath = __DIR__ . DIRECTORY_SEPARATOR . 'admin-credentials.php';
    if (is_readable($credPath)) {
        $creds = include $credPath;
        if (is_array($creds)) {
            foreach ($creds as $key => $value) {
                if (is_string($key) && is_scalar($value) && trim((string) $value) !== '') {
                    $merged[$key] = trim((string) $value);
                }
            }
            $used[] = $credPath;
        }
    }

    return [
        'env' => $merged,
        'paths' => $used,
        'primary' => $used[0] ?? (dirname(__DIR__) . DIRECTORY_SEPARATOR . '.env'),
    ];
}

function envValue(array $env, array $keys, string $default = ''): string
{
    foreach ($keys as $key) {
        if (isset($env[$key]) && trim((string) $env[$key]) !== '') {
            return trim((string) $env[$key]);
        }
    }
    return $default;
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
    $config = getAppConfig();

    if ($config['calendar_id'] === '' || $config['api_key'] === '') {
        jsonResponse([
            'ok' => false,
            'error' => 'Calendar_ID and Calendar-Key must be set in .env (or env)',
        ], 500);
    }

    return $config;
}

function getAppConfig(): array
{
    static $cached = null;
    if (is_array($cached)) {
        return $cached;
    }

    $loaded = loadAllEnvFiles();
    $env = $loaded['env'];
    $envPath = $loaded['primary'];

    $cached = [
        'calendar_id' => envValue($env, ['Calendar_ID', 'CalendarId', 'CALENDAR_ID']),
        'api_key' => envValue($env, ['Calendar-Key', 'Calendar_Key', 'CalendarKey', 'CALENDAR_KEY']),
        'calendar_webhook' => envValue($env, ['Calendar_Webhook', 'Calendar-Webhook', 'CALENDAR_WEBHOOK']),
        'timezone' => envValue($env, ['Calendar_Timezone', 'Calendar-Timezone', 'TIMEZONE'], 'Asia/Karachi'),
        'service_account_path' => __DIR__ . DIRECTORY_SEPARATOR . 'service-account.json',
        'bookings_path' => __DIR__ . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'bookings.json',
        'env_path' => $envPath,
        'env_paths' => $loaded['paths'],
        'env_loaded' => $env !== [],
        'env_keys' => array_keys($env),
        'has_admin_password_key' => envValue($env, ['Admin_Password', 'AdminPassword', 'ADMIN_PASSWORD']) !== '',
        'admin_user' => envValue($env, ['Admin_User', 'AdminUser', 'ADMIN_USER'], 'admin'),
        'admin_password' => envValue($env, ['Admin_Password', 'AdminPassword', 'ADMIN_PASSWORD']),
        'payment_email' => envValue($env, ['Payment_Email', 'PaymentEmail', 'PAYMENT_EMAIL'], 'drwasimahmankhan@gmail.com'),
        'mail_from' => envValue($env, ['Mail_From', 'MailFrom', 'MAIL_FROM'], 'noreply@iwasim.com'),
        'mail_from_name' => envValue($env, ['Mail_From_Name', 'MailFromName', 'MAIL_FROM_NAME'], 'Dr. Wasim Ahmad Khan — Atelier'),
    ];

    return $cached;
}

function getPaymentPackages(): array
{
    return [
        [
            'id' => '30min',
            'label' => '30 minutes',
            'duration_minutes' => 30,
            'amount' => 3500,
            'currency' => 'PKR',
        ],
        [
            'id' => '1hour',
            'label' => '1 hour',
            'duration_minutes' => 60,
            'amount' => 5000,
            'currency' => 'PKR',
        ],
        [
            'id' => '2hours',
            'label' => '2 hours',
            'duration_minutes' => 120,
            'amount' => 7500,
            'currency' => 'PKR',
        ],
    ];
}

function getBankDetails(array $config = []): array
{
    return [
        'account_title' => 'WASIM AHMAD KHAN',
        'bank' => 'Meezan Bank',
        'account_number' => '02500106735016',
        'iban' => 'PK97MEZN0002500106735016',
        'screenshot_email' => $config['payment_email'] ?? 'drwasimahmankhan@gmail.com',
    ];
}

function findPaymentPackage(string $packageId): ?array
{
    foreach (getPaymentPackages() as $package) {
        if ($package['id'] === $packageId) {
            return $package;
        }
    }
    return null;
}

function startAdminSession(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
}

function isAdminAuthenticated(): bool
{
    startAdminSession();
    return !empty($_SESSION['atelier_admin']) && $_SESSION['atelier_admin'] === true;
}

function requireAdmin(): void
{
    if (!isAdminAuthenticated()) {
        jsonResponse(['ok' => false, 'error' => 'Unauthorized'], 401);
    }
}

function getHoldBookings(array $bookings): array
{
    $holds = [];
    foreach ($bookings as $booking) {
        $status = $booking['status'] ?? '';
        if (!in_array($status, ['pending', 'awaiting_payment', 'accepted'], true)) {
            continue;
        }
        if ($status === 'accepted' && !empty($booking['google_event_id'])) {
            continue;
        }
        if (empty($booking['start']) || empty($booking['end'])) {
            continue;
        }
        $holds[] = [
            'id' => $booking['id'] ?? uniqid('l_', true),
            'title' => $booking['title'] ?? 'Reserved session',
            'start' => $booking['start'],
            'end' => $booking['end'],
            'source' => 'local',
        ];
    }
    return $holds;
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

function fetchGoogleEventsViaWebhook(string $webhookUrl, string $calendarId, string $start, string $end): array
{
    if ($webhookUrl === '') {
        return ['ok' => false, 'error' => 'Calendar_Webhook not configured', 'items' => []];
    }

    $query = http_build_query([
        'action' => 'events',
        'calendarId' => $calendarId,
        'start' => $start,
        'end' => $end,
    ]);

    $separator = strpos($webhookUrl, '?') !== false ? '&' : '?';
    $url = $webhookUrl . $separator . $query;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
    ]);

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $body = json_decode($response ?: '', true);
    if ($status >= 200 && $status < 300 && is_array($body) && !empty($body['ok'])) {
        return [
            'ok' => true,
            'items' => is_array($body['items'] ?? null) ? $body['items'] : [],
            'source' => 'webhook',
        ];
    }

    return [
        'ok' => false,
        'error' => is_array($body) ? ($body['error'] ?? 'Webhook read failed') : 'Webhook read failed',
        'status' => $status,
        'items' => [],
    ];
}

function fetchGoogleEventsViaApiKey(string $calendarId, string $apiKey, string $start, string $end): array
{
    $timeMin = rawurlencode(date('c', strtotime($start)));
    $timeMax = rawurlencode(date('c', strtotime($end)));

    $url = 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calendarId) . '/events'
        . "?key={$apiKey}"
        . "&timeMin={$timeMin}"
        . "&timeMax={$timeMax}"
        . "&singleEvents=true"
        . "&orderBy=startTime"
        . "&maxResults=250";

    $response = googleCalendarRequest('GET', $url);

    if ($response['status'] >= 200 && $response['status'] < 300) {
        $items = array_values(array_filter(
            $response['body']['items'] ?? [],
            static function (array $event): bool {
                return ($event['status'] ?? 'confirmed') !== 'cancelled';
            }
        ));

        return [
            'ok' => true,
            'items' => $items,
            'source' => 'api_key',
            'status' => $response['status'],
        ];
    }

    return [
        'ok' => false,
        'items' => [],
        'source' => 'api_key',
        'status' => $response['status'],
        'error' => $response['body']['error']['message'] ?? 'Google Calendar API read failed',
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

    usort($events, function ($a, $b) {
        return strcmp($a['start'], $b['start']);
    });
    return $events;
}
