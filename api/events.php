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

if ($response['status'] >= 200 && $response['status'] < 300) {
    $googleItems = $response['body']['items'] ?? [];
}

$localBookings = readBookings($config['bookings_path']);
$events = normalizeEvents($googleItems, $localBookings);

jsonResponse([
    'ok' => true,
    'events' => $events,
    'google_status' => $response['status'],
]);
