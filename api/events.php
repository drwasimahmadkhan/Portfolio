<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

$config = getCalendarConfig();
$calendarId = rawurlencode($config['calendar_id']);
$apiKey = $config['api_key'];

$start = $_GET['start'] ?? gmdate('c');
$end = $_GET['end'] ?? gmdate('c', strtotime('+60 days'));

$timeMin = rawurlencode(date('c', strtotime($start)));
$timeMax = rawurlencode(date('c', strtotime($end)));

$url = "https://www.googleapis.com/calendar/v3/calendars/{$calendarId}/events"
    . "?key={$apiKey}"
    . "&timeMin={$timeMin}"
    . "&timeMax={$timeMax}"
    . "&singleEvents=true"
    . "&orderBy=startTime"
    . "&maxResults=250";

$response = googleCalendarRequest('GET', $url);
$googleItems = [];
$googleError = null;

if ($response['status'] >= 200 && $response['status'] < 300) {
    $googleItems = array_values(array_filter(
        $response['body']['items'] ?? [],
        static fn(array $event): bool => ($event['status'] ?? 'confirmed') !== 'cancelled'
    ));
} else {
    $googleError = $response['body']['error']['message'] ?? 'Google Calendar read failed';
}

$events = normalizeEvents($googleItems, []);

jsonResponse([
    'ok' => true,
    'events' => $events,
    'source' => 'google',
    'google_status' => $response['status'],
    'google_error' => $googleError,
    'fetched_at' => gmdate('c'),
    'webhook_configured' => !empty($config['calendar_webhook']),
    'service_account_configured' => is_readable($config['service_account_path']),
]);
