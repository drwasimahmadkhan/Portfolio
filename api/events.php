<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

$config = getCalendarConfig();
$start = $_GET['start'] ?? gmdate('c');
$end = $_GET['end'] ?? gmdate('c', strtotime('+60 days'));

$googleItems = [];
$readSource = null;
$readError = null;
$readStatus = null;

if (!empty($config['calendar_webhook'])) {
    $webhookResult = fetchGoogleEventsViaWebhook(
        $config['calendar_webhook'],
        $config['calendar_id'],
        $start,
        $end
    );

    if (!empty($webhookResult['ok'])) {
        $googleItems = $webhookResult['items'];
        $readSource = $webhookResult['source'] ?? 'webhook';
    } else {
        $readError = $webhookResult['error'] ?? 'Webhook read failed';
        $readStatus = $webhookResult['status'] ?? null;
    }
}

if ($googleItems === [] && $readSource === null) {
    $apiResult = fetchGoogleEventsViaApiKey(
        $config['calendar_id'],
        $config['api_key'],
        $start,
        $end
    );

    if (!empty($apiResult['ok'])) {
        $googleItems = $apiResult['items'];
        $readSource = $apiResult['source'] ?? 'api_key';
        $readStatus = $apiResult['status'] ?? null;
        $readError = null;
    } elseif ($readError === null) {
        $readError = $apiResult['error'] ?? 'Google Calendar read failed';
        $readStatus = $apiResult['status'] ?? null;
    }
}

$events = normalizeEvents($googleItems, []);

jsonResponse([
    'ok' => true,
    'events' => $events,
    'source' => $readSource ?? 'none',
    'read_status' => $readStatus,
    'read_error' => $readError,
    'fetched_at' => gmdate('c'),
    'webhook_configured' => !empty($config['calendar_webhook']),
    'service_account_configured' => is_readable($config['service_account_path']),
]);
