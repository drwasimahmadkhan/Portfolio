<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mailer.php';

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

$config = getAppConfig();
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

$bookingId = 'AT-' . random_int(100000, 999999);
$now = gmdate('c');

$booking = [
    'id' => $bookingId,
    'status' => 'awaiting_payment',
    'full_name' => trim((string) $payload['full_name']),
    'email' => trim((string) $payload['email']),
    'phone' => trim((string) $payload['phone']),
    'organization' => trim((string) $payload['organization']),
    'selected_package' => trim((string) $payload['selected_package']),
    'preferred_date' => trim((string) $payload['preferred_date']),
    'preferred_time' => trim((string) $payload['preferred_time']),
    'mode' => trim((string) $payload['mode']),
    'topic' => trim((string) ($payload['topic'] ?? '')),
    'participants' => trim((string) ($payload['participants'] ?? '')),
    'additional_notes' => trim((string) ($payload['additional_notes'] ?? '')),
    'timezone' => $timezone,
    'duration_minutes' => $durationMinutes,
    'start' => $startIso,
    'end' => $endIso,
    'title' => trim((string) $payload['selected_package']) . ' — ' . trim((string) $payload['full_name']),
    'payment_package_id' => null,
    'payment_label' => null,
    'payment_amount' => null,
    'payment_currency' => 'PKR',
    'google_event_id' => null,
    'google_synced' => false,
    'created_at' => $now,
    'updated_at' => $now,
    'accepted_at' => null,
];

$bookings = readBookings($config['bookings_path']);
$bookings[] = $booking;

if (!writeBookings($config['bookings_path'], $bookings)) {
    jsonResponse(['ok' => false, 'error' => 'Could not save booking request'], 500);
}

$bank = getBankDetails($config);

$clientMail = sendBookingThankYouEmail($booking, $config);
$adminMail = sendBookingAdminNotifyEmail($booking, $config);

jsonResponse([
    'ok' => true,
    'booking_id' => $bookingId,
    'status' => 'awaiting_payment',
    'start' => $startIso,
    'end' => $endIso,
    'google_synced' => false,
    'payment_packages' => getPaymentPackages(),
    'bank' => $bank,
    'mail' => [
        'client' => $clientMail,
        'admin' => $adminMail,
    ],
    'message' => 'Thank you. Check your email for payment instructions, then send your transfer screenshot.',
]);
