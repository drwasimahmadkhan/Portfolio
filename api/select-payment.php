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

$bookingId = trim((string) ($payload['booking_id'] ?? ''));
$packageId = trim((string) ($payload['payment_package_id'] ?? ''));

if ($bookingId === '' || $packageId === '') {
    jsonResponse(['ok' => false, 'error' => 'booking_id and payment_package_id are required'], 400);
}

$package = findPaymentPackage($packageId);
if (!$package) {
    jsonResponse(['ok' => false, 'error' => 'Invalid payment package'], 400);
}

$config = getAppConfig();
$bookings = readBookings($config['bookings_path']);
$found = false;

foreach ($bookings as &$booking) {
    if (($booking['id'] ?? '') !== $bookingId) {
        continue;
    }

    if (($booking['status'] ?? '') === 'accepted') {
        jsonResponse(['ok' => false, 'error' => 'This booking is already accepted'], 400);
    }
    if (($booking['status'] ?? '') === 'rejected') {
        jsonResponse(['ok' => false, 'error' => 'This booking was rejected'], 400);
    }

    $timezone = $booking['timezone'] ?? $config['timezone'];
    $dateTime = buildIsoDateTime(
        (string) $booking['preferred_date'],
        (string) $booking['preferred_time'],
        $timezone
    );

    if (empty($dateTime['ok'])) {
        jsonResponse(['ok' => false, 'error' => 'Invalid booking schedule'], 400);
    }

    /** @var DateTime $startDate */
    $startDate = $dateTime['start'];
    $endDate = clone $startDate;
    $endDate->modify('+' . (int) $package['duration_minutes'] . ' minutes');

    $booking['payment_package_id'] = $package['id'];
    $booking['payment_label'] = $package['label'];
    $booking['payment_amount'] = $package['amount'];
    $booking['payment_currency'] = $package['currency'];
    $booking['duration_minutes'] = $package['duration_minutes'];
    $booking['start'] = $startDate->format('c');
    $booking['end'] = $endDate->format('c');
    $booking['status'] = 'awaiting_payment';
    $booking['updated_at'] = gmdate('c');
    $found = true;
    $updated = $booking;
    break;
}
unset($booking);

if (!$found) {
    jsonResponse(['ok' => false, 'error' => 'Booking not found'], 404);
}

if (!writeBookings($config['bookings_path'], $bookings)) {
    jsonResponse(['ok' => false, 'error' => 'Could not update booking'], 500);
}

$mail = sendPaymentSelectedEmails($updated, $config);

jsonResponse([
    'ok' => true,
    'booking' => $updated,
    'bank' => getBankDetails($config),
    'mail' => $mail,
    'message' => 'Payment package selected. Transfer the amount and email your screenshot.',
]);
