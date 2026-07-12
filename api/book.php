<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    jsonResponse(['ok' => false, 'error' => 'Invalid JSON body'], 400);
}

$required = ['full_name', 'email', 'phone', 'organization', 'selected_package', 'preferred_date', 'preferred_time', 'mode'];
foreach ($required as $field) {
    if (empty(trim((string) ($payload[$field] ?? '')))) {
        jsonResponse(['ok' => false, 'error' => "Missing required field: {$field}"], 400);
    }
}

$config = getCalendarConfig();
$calendarId = $config['calendar_id'];
$durationMinutes = max(30, (int) ($payload['duration_minutes'] ?? 120));

$startDateTime = $payload['preferred_date'] . 'T' . $payload['preferred_time'] . ':00';
$startTs = strtotime($startDateTime);
if ($startTs === false) {
    jsonResponse(['ok' => false, 'error' => 'Invalid date or time'], 400);
}

$endDateTime = date('c', $startTs + ($durationMinutes * 60));
$startIso = date('c', $startTs);

$topic = trim((string) ($payload['topic'] ?? ''));
$participants = trim((string) ($payload['participants'] ?? ''));
$notes = trim((string) ($payload['additional_notes'] ?? ''));

$summary = trim((string) $payload['selected_package']) . ' — ' . trim((string) $payload['full_name']);
$descriptionLines = [
    'Session: ' . $payload['selected_package'],
    'Name: ' . $payload['full_name'],
    'Email: ' . $payload['email'],
    'Phone: ' . $payload['phone'],
    'Organization: ' . $payload['organization'],
    'Mode: ' . $payload['mode'],
];

if ($topic !== '') {
    $descriptionLines[] = 'Topic: ' . $topic;
}
if ($participants !== '') {
    $descriptionLines[] = 'Participants: ' . $participants;
}
if ($notes !== '') {
    $descriptionLines[] = 'Notes: ' . $notes;
}

$eventBody = [
    'summary' => $summary,
    'description' => implode("\n", $descriptionLines),
    'start' => [
        'dateTime' => $startIso,
        'timeZone' => $payload['timezone'] ?? 'Asia/Karachi',
    ],
    'end' => [
        'dateTime' => $endDateTime,
        'timeZone' => $payload['timezone'] ?? 'Asia/Karachi',
    ],
    'attendees' => [
        ['email' => $payload['email']],
    ],
];

$bookingId = 'AT-' . random_int(100000, 999999);
$googleEventId = null;
$googleSynced = false;

$accessToken = getServiceAccountAccessToken($config['service_account_path']);
if ($accessToken) {
    $url = 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($calendarId) . '/events';
    $googleResponse = googleCalendarRequest('POST', $url, $accessToken, $eventBody);

    if ($googleResponse['status'] >= 200 && $googleResponse['status'] < 300) {
        $googleSynced = true;
        $googleEventId = $googleResponse['body']['id'] ?? null;
    }
}

$bookings = readBookings($config['bookings_path']);
$bookings[] = [
    'id' => $bookingId,
    'google_event_id' => $googleEventId,
    'title' => $summary,
    'start' => $startIso,
    'end' => $endDateTime,
    'payload' => $payload,
    'created_at' => gmdate('c'),
];
writeBookings($config['bookings_path'], $bookings);

jsonResponse([
    'ok' => true,
    'booking_id' => $bookingId,
    'google_synced' => $googleSynced,
    'google_event_id' => $googleEventId,
    'start' => $startIso,
    'end' => $endDateTime,
    'message' => $googleSynced
        ? 'Session booked and added to the calendar.'
        : 'Session booked. Add api/service-account.json to sync directly with Google Calendar.',
]);
