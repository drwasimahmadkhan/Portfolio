<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mailer.php';

requireAdmin();

$config = getAppConfig();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $bookings = readBookings($config['bookings_path']);
    usort($bookings, function ($a, $b) {
        return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
    });

    jsonResponse([
        'ok' => true,
        'bookings' => $bookings,
        'payment_packages' => getPaymentPackages(),
        'bank' => getBankDetails($config),
    ]);
}

if ($method !== 'POST') {
    jsonResponse(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    jsonResponse(['ok' => false, 'error' => 'Invalid JSON body'], 400);
}

$action = trim((string) ($payload['action'] ?? ''));
$bookingId = trim((string) ($payload['booking_id'] ?? ''));

if ($bookingId === '' || !in_array($action, ['accept', 'reject'], true)) {
    jsonResponse(['ok' => false, 'error' => 'action (accept|reject) and booking_id are required'], 400);
}

$bookings = readBookings($config['bookings_path']);
$index = null;

foreach ($bookings as $i => $booking) {
    if (($booking['id'] ?? '') === $bookingId) {
        $index = $i;
        break;
    }
}

if ($index === null) {
    jsonResponse(['ok' => false, 'error' => 'Booking not found'], 404);
}

$booking = $bookings[$index];

if ($action === 'reject') {
    $booking['status'] = 'rejected';
    $booking['updated_at'] = gmdate('c');
    $booking['rejected_at'] = gmdate('c');
    $bookings[$index] = $booking;

    if (!writeBookings($config['bookings_path'], $bookings)) {
        jsonResponse(['ok' => false, 'error' => 'Could not update booking'], 500);
    }

    jsonResponse(['ok' => true, 'booking' => $booking, 'message' => 'Booking rejected.']);
}

// Accept → create calendar event now
if (($booking['status'] ?? '') === 'accepted' && !empty($booking['google_synced'])) {
    jsonResponse(['ok' => true, 'booking' => $booking, 'message' => 'Already accepted and synced.']);
}

if (empty($booking['payment_package_id'])) {
    // Allow admin to set package at accept time
    $packageId = trim((string) ($payload['payment_package_id'] ?? ''));
    if ($packageId !== '') {
        $package = findPaymentPackage($packageId);
        if (!$package) {
            jsonResponse(['ok' => false, 'error' => 'Invalid payment package'], 400);
        }
        $booking['payment_package_id'] = $package['id'];
        $booking['payment_label'] = $package['label'];
        $booking['payment_amount'] = $package['amount'];
        $booking['payment_currency'] = $package['currency'];
        $booking['duration_minutes'] = $package['duration_minutes'];
    }
}

$durationMinutes = max(30, (int) ($booking['duration_minutes'] ?? 60));
$timezone = $booking['timezone'] ?? $config['timezone'];

$dateTime = buildIsoDateTime(
    (string) $booking['preferred_date'],
    (string) $booking['preferred_time'],
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

$summary = ($booking['selected_package'] ?? 'Atelier session') . ' — ' . ($booking['full_name'] ?? '');
$descriptionLines = [
    'Session: ' . ($booking['selected_package'] ?? ''),
    'Name: ' . ($booking['full_name'] ?? ''),
    'Email: ' . ($booking['email'] ?? ''),
    'Phone: ' . ($booking['phone'] ?? ''),
    'Organization: ' . ($booking['organization'] ?? ''),
    'Mode: ' . ($booking['mode'] ?? ''),
    'Payment: ' . ($booking['payment_label'] ?? 'n/a') . ' — ' . ($booking['payment_amount'] ?? '') . ' ' . ($booking['payment_currency'] ?? 'PKR'),
    'Booking ID: ' . ($booking['id'] ?? ''),
];

if (!empty($booking['topic'])) {
    $descriptionLines[] = 'Topic: ' . $booking['topic'];
}
if (!empty($booking['participants'])) {
    $descriptionLines[] = 'Participants: ' . $booking['participants'];
}
if (!empty($booking['additional_notes'])) {
    $descriptionLines[] = 'Notes: ' . $booking['additional_notes'];
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
        ['email' => $booking['email']],
    ],
];

$calendarConfig = getCalendarConfig();
$googleEventId = null;
$googleSynced = false;
$syncMethod = null;
$syncError = null;

if (!empty($calendarConfig['calendar_webhook'])) {
    $webhookResult = createGoogleEventViaWebhook($calendarConfig['calendar_webhook'], [
        'calendarId' => $calendarConfig['calendar_id'],
        'summary' => $summary,
        'description' => $description,
        'start' => $startIso,
        'end' => $endIso,
        'email' => $booking['email'],
        'location' => $booking['mode'] ?? '',
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
        $calendarConfig['calendar_id'],
        $calendarConfig['service_account_path'],
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

if (!$googleSynced) {
    jsonResponse([
        'ok' => false,
        'error' => $syncError ?: 'Could not create calendar event',
        'booking' => $booking,
    ], 502);
}

$booking['status'] = 'accepted';
$booking['start'] = $startIso;
$booking['end'] = $endIso;
$booking['duration_minutes'] = $durationMinutes;
$booking['title'] = $summary;
$booking['google_synced'] = true;
$booking['google_event_id'] = $googleEventId;
$booking['sync_method'] = $syncMethod;
$booking['accepted_at'] = gmdate('c');
$booking['updated_at'] = gmdate('c');
$bookings[$index] = $booking;

if (!writeBookings($config['bookings_path'], $bookings)) {
    jsonResponse(['ok' => false, 'error' => 'Calendar created but local save failed', 'booking' => $booking], 500);
}

$mail = sendBookingAcceptedEmail($booking, $config);

jsonResponse([
    'ok' => true,
    'booking' => $booking,
    'mail' => $mail,
    'message' => 'Booking accepted and added to Google Calendar.',
]);
