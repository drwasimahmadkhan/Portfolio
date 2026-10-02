<?php

declare(strict_types=1);

/**
 * Atelier mailer — uses Send-Mail/PHPMailer (hosting mail), same approach as Send-Mail/*.php
 */

function atelierMailerBootstrap(): bool
{
    static $ready = null;
    if ($ready !== null) {
        return $ready;
    }

    $base = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'Send-Mail' . DIRECTORY_SEPARATOR . 'PHPMailer-6.8.0' . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR;
    $files = [
        $base . 'Exception.php',
        $base . 'PHPMailer.php',
        $base . 'SMTP.php',
    ];

    foreach ($files as $file) {
        if (!is_readable($file)) {
            $ready = false;
            return false;
        }
        require_once $file;
    }

    $ready = true;
    return true;
}

function sendAtelierMail(array $options): array
{
    if (!atelierMailerBootstrap()) {
        return ['ok' => false, 'error' => 'PHPMailer not found in Send-Mail/PHPMailer-6.8.0'];
    }

    $config = function_exists('getAppConfig') ? getAppConfig() : [];
    $fromEmail = $options['from_email'] ?? ($config['mail_from'] ?? 'noreply@iwasim.com');
    $fromName = $options['from_name'] ?? ($config['mail_from_name'] ?? 'The Catalyst Atelier');
    $to = $options['to'] ?? '';
    $subject = $options['subject'] ?? '';
    $html = $options['html'] ?? '';
    $text = $options['text'] ?? strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $html));
    $replyTo = $options['reply_to'] ?? null;
    $replyName = $options['reply_name'] ?? '';

    if ($to === '' || $subject === '' || $html === '') {
        return ['ok' => false, 'error' => 'Missing to/subject/html'];
    }

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        // Same transport as Send-Mail: hosting provider mail (sendmail)
        $mail->isMail();
        $mail->CharSet = 'UTF-8';
        $mail->setFrom($fromEmail, $fromName);
        $mail->addAddress($to);

        if ($replyTo) {
            $mail->addReplyTo($replyTo, $replyName ?: $replyTo);
        }

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $html;
        $mail->AltBody = $text;
        $mail->send();

        return ['ok' => true, 'method' => 'phpmailer_isMail'];
    } catch (Throwable $e) {
        // Fallback to PHP mail() like Send-Mail scripts do
        $headers = [
            'MIME-Version: 1.0',
            'Content-type: text/html; charset=UTF-8',
            'From: ' . $fromName . ' <' . $fromEmail . '>',
        ];
        if ($replyTo) {
            $headers[] = 'Reply-To: ' . $replyTo;
        }

        $sent = @mail($to, $subject, $html, implode("\r\n", $headers));
        if ($sent) {
            return ['ok' => true, 'method' => 'mail_fallback'];
        }

        return ['ok' => false, 'error' => $e->getMessage()];
    }
}

function bookingEmailShell(string $title, string $innerHtml): string
{
    return '
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;color:#111827;">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6366f1;font-weight:600;">The Catalyst Atelier</div>
      <h2 style="margin:8px 0 18px;font-size:22px;color:#111827;">' . htmlspecialchars($title) . '</h2>
      ' . $innerHtml . '
      <div style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
        Dr. Wasim Ahmad Khan · AI/ML Lead + Researcher
      </div>
    </div>';
}

function formatPaymentPackagesHtml(): string
{
    $rows = '';
    foreach (getPaymentPackages() as $package) {
        $rows .= '<tr>
            <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;">' . htmlspecialchars($package['label']) . '</td>
            <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">'
            . number_format((int) $package['amount']) . ' ' . htmlspecialchars($package['currency']) .
            '</td>
        </tr>';
    }

    return '<table style="width:100%;border-collapse:collapse;margin:12px 0 4px;">' . $rows . '</table>';
}

function formatBankDetailsHtml(array $bank): string
{
    return '
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-top:12px;font-size:14px;line-height:1.6;">
        <div><strong>Account Title:</strong> ' . htmlspecialchars($bank['account_title']) . '</div>
        <div><strong>Bank:</strong> ' . htmlspecialchars($bank['bank']) . '</div>
        <div><strong>Account Number:</strong> ' . htmlspecialchars($bank['account_number']) . '</div>
        <div><strong>IBAN:</strong> ' . htmlspecialchars($bank['iban']) . '</div>
      </div>';
}

function sendBookingThankYouEmail(array $booking, array $config): array
{
    $bank = getBankDetails($config);
    $name = htmlspecialchars($booking['full_name'] ?? '');
    $passId = htmlspecialchars($booking['id'] ?? '');
    $session = htmlspecialchars($booking['selected_package'] ?? '');
    $when = htmlspecialchars(trim(($booking['preferred_date'] ?? '') . ' ' . ($booking['preferred_time'] ?? '')));
    $emailTo = $bank['screenshot_email'];

    $inner = '
      <p style="font-size:15px;line-height:1.6;">Hi ' . $name . ',</p>
      <p style="font-size:15px;line-height:1.6;">Thank you for your Atelier request. Your Pass ID is <strong>' . $passId . '</strong>.</p>
      <p style="font-size:15px;line-height:1.6;"><strong>Session:</strong> ' . $session . '<br>
      <strong>Preferred schedule:</strong> ' . $when . '</p>
      <p style="font-size:15px;line-height:1.6;">Please select one payment package, transfer the matching amount, then email your payment screenshot to
      <a href="mailto:' . htmlspecialchars($emailTo) . '">' . htmlspecialchars($emailTo) . '</a>
      with your Pass ID in the subject.</p>
      <h3 style="font-size:15px;margin:18px 0 0;">Payment packages</h3>
      ' . formatPaymentPackagesHtml() . '
      <h3 style="font-size:15px;margin:18px 0 0;">Bank transfer details</h3>
      ' . formatBankDetailsHtml($bank) . '
      <p style="font-size:14px;line-height:1.6;color:#4b5563;margin-top:16px;">Your Google Meet / calendar invite is created only after payment is verified and accepted.</p>
    ';

    return sendAtelierMail([
        'to' => $booking['email'],
        'subject' => 'Thank you — complete payment for Atelier request ' . ($booking['id'] ?? ''),
        'html' => bookingEmailShell('Thank you for your request', $inner),
        'reply_to' => $emailTo,
        'reply_name' => 'Dr. Wasim Ahmad Khan',
    ]);
}

function sendBookingAdminNotifyEmail(array $booking, array $config): array
{
    $bank = getBankDetails($config);
    $inner = '
      <p style="font-size:15px;line-height:1.6;">A new Atelier booking is awaiting payment verification.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;font-size:14px;line-height:1.7;">
        <div><strong>Pass ID:</strong> ' . htmlspecialchars($booking['id'] ?? '') . '</div>
        <div><strong>Name:</strong> ' . htmlspecialchars($booking['full_name'] ?? '') . '</div>
        <div><strong>Email:</strong> ' . htmlspecialchars($booking['email'] ?? '') . '</div>
        <div><strong>Phone:</strong> ' . htmlspecialchars($booking['phone'] ?? '') . '</div>
        <div><strong>Organization:</strong> ' . htmlspecialchars($booking['organization'] ?? '') . '</div>
        <div><strong>Session:</strong> ' . htmlspecialchars($booking['selected_package'] ?? '') . '</div>
        <div><strong>Schedule:</strong> ' . htmlspecialchars(trim(($booking['preferred_date'] ?? '') . ' ' . ($booking['preferred_time'] ?? ''))) . '</div>
        <div><strong>Mode:</strong> ' . htmlspecialchars($booking['mode'] ?? '') . '</div>
        <div><strong>Topic:</strong> ' . htmlspecialchars($booking['topic'] ?? '') . '</div>
      </div>
      <p style="font-size:14px;color:#4b5563;">Open <strong>admin.html</strong> to accept after you receive the payment screenshot.</p>
    ';

    return sendAtelierMail([
        'to' => $bank['screenshot_email'],
        'subject' => 'New Atelier booking ' . ($booking['id'] ?? '') . ' — awaiting payment',
        'html' => bookingEmailShell('New booking request', $inner),
        'reply_to' => $booking['email'] ?? null,
        'reply_name' => $booking['full_name'] ?? '',
    ]);
}

function sendPaymentSelectedEmails(array $booking, array $config): array
{
    $bank = getBankDetails($config);
    $amount = number_format((int) ($booking['payment_amount'] ?? 0)) . ' ' . ($booking['payment_currency'] ?? 'PKR');
    $label = htmlspecialchars($booking['payment_label'] ?? '');
    $passId = htmlspecialchars($booking['id'] ?? '');

    $clientInner = '
      <p style="font-size:15px;line-height:1.6;">Hi ' . htmlspecialchars($booking['full_name'] ?? '') . ',</p>
      <p style="font-size:15px;line-height:1.6;">You selected <strong>' . $label . '</strong> for <strong>' . htmlspecialchars($amount) . '</strong>.</p>
      <p style="font-size:15px;line-height:1.6;">Please transfer that amount using the bank details below, then email your screenshot to
      <a href="mailto:' . htmlspecialchars($bank['screenshot_email']) . '?subject=' . rawurlencode('Payment screenshot ' . ($booking['id'] ?? '')) . '">'
      . htmlspecialchars($bank['screenshot_email']) . '</a>
      with Pass ID <strong>' . $passId . '</strong>.</p>
      ' . formatBankDetailsHtml($bank);

    $adminInner = '
      <p style="font-size:15px;line-height:1.6;">Payment package selected for <strong>' . $passId . '</strong>.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;font-size:14px;line-height:1.7;">
        <div><strong>Name:</strong> ' . htmlspecialchars($booking['full_name'] ?? '') . '</div>
        <div><strong>Package:</strong> ' . $label . ' — ' . htmlspecialchars($amount) . '</div>
        <div><strong>Email:</strong> ' . htmlspecialchars($booking['email'] ?? '') . '</div>
      </div>';

    $client = sendAtelierMail([
        'to' => $booking['email'],
        'subject' => 'Payment selected for Atelier ' . ($booking['id'] ?? ''),
        'html' => bookingEmailShell('Complete your transfer', $clientInner),
        'reply_to' => $bank['screenshot_email'],
        'reply_name' => 'Dr. Wasim Ahmad Khan',
    ]);

    $admin = sendAtelierMail([
        'to' => $bank['screenshot_email'],
        'subject' => 'Payment package selected — ' . ($booking['id'] ?? ''),
        'html' => bookingEmailShell('Payment package selected', $adminInner),
        'reply_to' => $booking['email'] ?? null,
        'reply_name' => $booking['full_name'] ?? '',
    ]);

    return ['client' => $client, 'admin' => $admin];
}

function sendBookingAcceptedEmail(array $booking, array $config): array
{
    $bank = getBankDetails($config);
    $inner = '
      <p style="font-size:15px;line-height:1.6;">Hi ' . htmlspecialchars($booking['full_name'] ?? '') . ',</p>
      <p style="font-size:15px;line-height:1.6;">Your payment has been verified and your Atelier session is confirmed.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;font-size:14px;line-height:1.7;">
        <div><strong>Pass ID:</strong> ' . htmlspecialchars($booking['id'] ?? '') . '</div>
        <div><strong>Session:</strong> ' . htmlspecialchars($booking['selected_package'] ?? '') . '</div>
        <div><strong>Schedule:</strong> ' . htmlspecialchars(trim(($booking['preferred_date'] ?? '') . ' ' . ($booking['preferred_time'] ?? ''))) . '</div>
        <div><strong>Duration:</strong> ' . htmlspecialchars($booking['payment_label'] ?? '') . '</div>
      </div>
      <p style="font-size:15px;line-height:1.6;margin-top:14px;">A Google Calendar / Meet invite has been created for this session.</p>
    ';

    return sendAtelierMail([
        'to' => $booking['email'],
        'subject' => 'Confirmed — Atelier session ' . ($booking['id'] ?? ''),
        'html' => bookingEmailShell('Your session is confirmed', $inner),
        'reply_to' => $bank['screenshot_email'],
        'reply_name' => 'Dr. Wasim Ahmad Khan',
    ]);
}
