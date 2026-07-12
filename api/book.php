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
$timezone = $payload['timezone'] ?? $config['timezone'];
$durationMinutes = max(30, (int) ($payload['duration_minutes'] ?? 120));

$dateTime = buildIsoDateTime(
    trim((string) $payload['preferred_date']),
    trim((string) $payload['preferred_time']),
    $timezone
);

if (empty($dateTime['ok'])) {
    jsonResponse(['ok' => false, 'error' => $dateTime['error'] ?? 'Invalid date or time'], 400);
}

/** @var DateTime $startDate */
$startDate = $dateTime['start'];
$endDate = clone $startDate;
$endDate->modify('+' . $durationMinutes . ' minutes');

$startIso = $startDate->format('c');
$endIso = $endDate->format('c');

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

$description = implode("\n", $descriptionLines);

$eventBody = [
    'summary' => $summary,
    'description' => $description,
    'start' => [
        'dateTime' => $startIso,
        'timeZone' => $timezone,
    ],
    'end' => [
        'dateTime' => $endIso,
        'timeZone' => $timezone,
    ],
    'attendees' => [
        ['email' => $payload['email']],
    ],
];

$bookingId = 'AT-' . random_int(100000, 999999);
$googleEventId = null;
$googleSynced = false;
$syncMethod = null;
$syncError = null;

if (!empty($config['calendar_webhook'])) {
    $webhookResult = createGoogleEventViaWebhook($config['calendar_webhook'], [
        'calendarId' => $calendarId,
        'summary' => $summary,
        'description' => $description,
        'start' => $startIso,
        'end' => $endIso,
        'email' => $payload['email'],
        'location' => $payload['mode'],
    ]);

    if (!empty($webhookResult['ok'])) {
        $googleSynced = true;
        $googleEventId = $webhookResult['event_id'] ?? null;
        $syncMethod = 'webhook';
    } else {
        $syncError = $webhookResult['error'] ?? 'Webhook sync failed';
    }
}

if (!$googleSynced) {
    $serviceResult = createGoogleEventViaServiceAccount(
        $calendarId,
        $config['service_account_path'],
        $eventBody
    );

    if (!empty($serviceResult['ok'])) {
        $googleSynced = true;
        $googleEventId = $serviceResult['event_id'] ?? null;
        $syncMethod = 'service_account';
        $syncError = null;
    } elseif ($syncError === null) {
        $syncError = $serviceResult['error'] ?? 'Google sync not configured';
    }
}

$bookings = readBookings($config['bookings_path']);
$bookings[] = [
    'id' => $bookingId,
    'google_event_id' => $googleEventId,
    'title' => $summary,
    'start' => $startIso,
    'end' => $endIso,
    'payload' => $payload,
    'created_at' => gmdate('c'),
];

$storedLocally = writeBookings($config['bookings_path'], $bookings);
if (!$storedLocally) {
    jsonResponse([
        'ok' => false,
        'error' => 'Could not save booking on server. Check permissions for api/data/',
    ], 500);
}

$message = $googleSynced
    ? 'Session booked and added to your Google Calendar.'
    : 'Session saved on site. Add Calendar_Webhook to .env to sync with Google Calendar (see api/google-calendar.gs).';

jsonResponse([
    'ok' => true,
    'booking_id' => $bookingId,
    'google_synced' => $googleSynced,
    'google_event_id' => $googleEventId,
    'sync_method' => $syncMethod,
    'sync_error' => $syncError,
    'start' => $startIso,
    'end' => $endIso,
    'message' => $message,
]);
