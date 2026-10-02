<?php
session_start();

// Load environment variables
function loadEnv($file) {
    if (!file_exists($file)) {
        return [];
    }
    
    $env = [];
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        
        list($key, $value) = explode('=', $line, 2);
        $env[trim($key)] = trim($value);
    }
    
    return $env;
}

$env = loadEnv('.env');

// Include PHPMailer
require_once 'PHPMailer-6.8.0/src/PHPMailer.php';
require_once 'PHPMailer-6.8.0/src/SMTP.php';
require_once 'PHPMailer-6.8.0/src/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$message = '';
$messageType = '';

// Process form submission
if ($_POST) {
    $fullName = trim($_POST['fullName'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $city = trim($_POST['city'] ?? '');
    $address = trim($_POST['address'] ?? '');
    $orderNotes = trim($_POST['orderNotes'] ?? '');
    
    // Validation
    $errors = [];
    
    if (empty($fullName)) $errors[] = "Full Name is required";
    if (empty($email)) $errors[] = "Email Address is required";
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = "Valid Email Address is required";
    if (empty($phone)) $errors[] = "Phone Number is required";
    if (empty($city)) $errors[] = "City is required";
    if (empty($address)) $errors[] = "Delivery Address is required";
    
    if (empty($errors)) {
        $sent = false;
        $method = '';
        
        // Configuration: Use hosting server mail only
        $mail = new PHPMailer(true);

        try {
            // Use hosting provider's mail server (no authentication)
            $mail->isMail();
            $method = 'hosting_mail';
                
            // Recipients
            $mail->setFrom('noreply@scentview.pk', 'Perfume Store Order');
            $mail->addAddress('your-email@example.com'); // Replace with your email address
            $mail->addReplyTo($email, $fullName);
                
                // Content
                $mail->isHTML(true);
                $mail->Subject = 'New Perfume Order from ' . $fullName;
            
            $emailBody = "
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>
                <h2 style='color: #8B4513; text-align: center; margin-bottom: 30px;'>🌸 New Perfume Order 🌸</h2>
                
                <div style='background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;'>
                    <h3 style='color: #8B4513; margin-top: 0;'>Customer Information</h3>
                    <table style='width: 100%; border-collapse: collapse;'>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #8B4513; width: 150px;'>Full Name:</td>
                            <td style='padding: 8px 0;'>" . htmlspecialchars($fullName) . "</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #8B4513;'>Email:</td>
                            <td style='padding: 8px 0;'>" . htmlspecialchars($email) . "</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #8B4513;'>Phone:</td>
                            <td style='padding: 8px 0;'>" . htmlspecialchars($phone) . "</td>
                        </tr>
                        <tr>
                            <td style='padding: 8px 0; font-weight: bold; color: #8B4513;'>City:</td>
                            <td style='padding: 8px 0;'>" . htmlspecialchars($city) . "</td>
                        </tr>
                    </table>
                </div>
                
                <div style='background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;'>
                    <h3 style='color: #8B4513; margin-top: 0;'>Delivery Information</h3>
                    <p><strong style='color: #8B4513;'>Address:</strong><br>" . nl2br(htmlspecialchars($address)) . "</p>
                </div>";
                
            if (!empty($orderNotes)) {
                $emailBody .= "
                <div style='background: #fff8dc; padding: 20px; border-radius: 8px; margin-bottom: 20px;'>
                    <h3 style='color: #8B4513; margin-top: 0;'>Order Notes</h3>
                    <p>" . nl2br(htmlspecialchars($orderNotes)) . "</p>
                </div>";
            }
            
            $emailBody .= "
                <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #8B4513;'>
                    <p style='color: #8B4513; font-style: italic;'>Order received on " . date('F j, Y \a\t g:i A') . "</p>
                </div>
            </div>";
            
                $mail->Body = $emailBody;
                
            $mail->send();
            $sent = true;

            // Send thank you email to customer
            $thankYouMail = new PHPMailer(true);
            try {
                $thankYouMail->isMail();
                $thankYouMail->setFrom('noreply@scentview.pk', 'Perfume Store');
                $thankYouMail->addAddress($email, $fullName);
                $thankYouMail->isHTML(true);
                $thankYouMail->Subject = 'Thank You for Your Order - Perfume Store';

                $thankYouBody = "
                <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;'>
                    <h2 style='color: #8B4513; text-align: center; margin-bottom: 30px;'>🌸 Thank You for Your Order! 🌸</h2>

                    <div style='background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;'>
                        <p style='font-size: 16px; color: #333; margin-bottom: 15px;'>Dear <strong>" . htmlspecialchars($fullName) . "</strong>,</p>
                        <p style='font-size: 16px; color: #333; margin-bottom: 15px;'>Thank you for placing an order with our Perfume Store! We have received your order details and will contact you soon to confirm and process your order.</p>
                    </div>

                    <div style='background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;'>
                        <h3 style='color: #8B4513; margin-top: 0;'>Your Order Details</h3>
                        <table style='width: 100%; border-collapse: collapse;'>
                            <tr>
                                <td style='padding: 8px 0; font-weight: bold; color: #8B4513; width: 150px;'>Name:</td>
                                <td style='padding: 8px 0;'>" . htmlspecialchars($fullName) . "</td>
                            </tr>
                            <tr>
                                <td style='padding: 8px 0; font-weight: bold; color: #8B4513;'>Email:</td>
                                <td style='padding: 8px 0;'>" . htmlspecialchars($email) . "</td>
                            </tr>
                            <tr>
                                <td style='padding: 8px 0; font-weight: bold; color: #8B4513;'>Phone:</td>
                                <td style='padding: 8px 0;'>" . htmlspecialchars($phone) . "</td>
                            </tr>
                            <tr>
                                <td style='padding: 8px 0; font-weight: bold; color: #8B4513;'>City:</td>
                                <td style='padding: 8px 0;'>" . htmlspecialchars($city) . "</td>
                            </tr>
                            <tr>
                                <td style='padding: 8px 0; font-weight: bold; color: #8B4513;'>Delivery Address:</td>
                                <td style='padding: 8px 0;'>" . nl2br(htmlspecialchars($address)) . "</td>
                            </tr>
                        </table>
                    </div>";

                if (!empty($orderNotes)) {
                    $thankYouBody .= "
                    <div style='background: #fff8dc; padding: 20px; border-radius: 8px; margin-bottom: 20px;'>
                        <h3 style='color: #8B4513; margin-top: 0;'>Your Notes</h3>
                        <p>" . nl2br(htmlspecialchars($orderNotes)) . "</p>
                    </div>";
                }

                $thankYouBody .= "
                    <div style='background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px;'>
                        <h3 style='color: #8B4513; margin-top: 0;'>What's Next?</h3>
                        <ul style='color: #333; margin: 10px 0; padding-left: 20px;'>
                            <li style='margin-bottom: 8px;'>We will review your order details</li>
                            <li style='margin-bottom: 8px;'>Our team will contact you within 24 hours to confirm your order</li>
                            <li style='margin-bottom: 8px;'>We'll arrange delivery to your specified address</li>
                            <li style='margin-bottom: 8px;'>You'll receive tracking information once your order is dispatched</li>
                        </ul>
                    </div>

                    <div style='text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #8B4513;'>
                        <p style='color: #8B4513; font-style: italic; margin-bottom: 10px;'>Thank you for choosing our Perfume Store!</p>
                        <p style='color: #666; font-size: 14px;'>Order placed on " . date('F j, Y \a\t g:i A') . "</p>
                        <p style='color: #666; font-size: 12px; margin-top: 15px;'>If you have any questions, please don't hesitate to contact us.</p>
                    </div>
                </div>";

                $thankYouMail->Body = $thankYouBody;
                $thankYouMail->send();

            } catch (Exception $e) {
                error_log("Thank you email sending failed: " . $e->getMessage());
            }

        } catch (Exception $e) {
            // Log error
            error_log("Email sending failed: " . $e->getMessage());
        }
        
        // Final fallback: Use pure PHP mail() function
        if (!$sent) {
            try {
                $to = 'your-email@example.com';
                $subject = 'New Perfume Order from ' . $fullName;
                $plainTextBody = strip_tags(str_replace('<br>', "\n", $emailBody));
                
                $headers = [
                    'From: ' . $fullName . ' <noreply@scentview.pk>',
                    'Reply-To: ' . $email,
                    'X-Mailer: PHP/' . phpversion(),
                    'Content-Type: text/plain; charset=UTF-8'
                ];
                
                $sent = mail($to, $subject, $plainTextBody, implode("\r\n", $headers));
                $method = 'php_mail';

                // Send thank you email to customer using PHP mail
                if ($sent) {
                    $thankYouSubject = 'Thank You for Your Order - Perfume Store';
                    $thankYouMessage = "Dear " . $fullName . ",\n\n";
                    $thankYouMessage .= "Thank you for placing an order with our Perfume Store! We have received your order details and will contact you soon to confirm and process your order.\n\n";
                    $thankYouMessage .= "ORDER DETAILS:\n";
                    $thankYouMessage .= "Name: " . $fullName . "\n";
                    $thankYouMessage .= "Email: " . $email . "\n";
                    $thankYouMessage .= "Phone: " . $phone . "\n";
                    $thankYouMessage .= "City: " . $city . "\n";
                    $thankYouMessage .= "Delivery Address: " . $address . "\n";
                    if (!empty($orderNotes)) {
                        $thankYouMessage .= "Order Notes: " . $orderNotes . "\n";
                    }
                    $thankYouMessage .= "\nWHAT'S NEXT?\n";
                    $thankYouMessage .= "- We will review your order details\n";
                    $thankYouMessage .= "- Our team will contact you within 24 hours to confirm your order\n";
                    $thankYouMessage .= "- We'll arrange delivery to your specified address\n";
                    $thankYouMessage .= "- You'll receive tracking information once your order is dispatched\n\n";
                    $thankYouMessage .= "Thank you for choosing our Perfume Store!\n";
                    $thankYouMessage .= "Order placed on " . date('F j, Y \a\t g:i A') . "\n\n";
                    $thankYouMessage .= "If you have any questions, please don't hesitate to contact us.";

                    $thankYouHeaders = [
                        'From: Perfume Store <noreply@scentview.pk>',
                        'X-Mailer: PHP/' . phpversion(),
                        'Content-Type: text/plain; charset=UTF-8'
                    ];

                    mail($email, $thankYouSubject, $thankYouMessage, implode("\r\n", $thankYouHeaders));
                }
                
            } catch (Exception $e) {
                error_log("PHP mail fallback failed: " . $e->getMessage());
            }
        }
        
        if ($sent) {
            $message = 'Your order has been placed successfully! We will contact you soon.';
            $messageType = 'success';
            // Clear form data after successful submission
            $_POST = [];
        } else {
            $message = "Order could not be placed. Please try again or contact us directly.";
            $messageType = 'error';
        }
    } else {
        $message = implode('<br>', $errors);
        $messageType = 'error';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Perfume Order - Place Your Order</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Georgia', serif;
            background: linear-gradient(135deg, #f5f3f0 0%, #e8e4e1 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.2em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .form-container {
            padding: 40px;
        }
        
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            font-weight: bold;
            text-align: center;
        }
        
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #8B4513;
            font-size: 1.1em;
        }
        
        .required {
            color: #dc3545;
        }
        
        input[type="text"],
        input[type="email"],
        input[type="tel"],
        textarea {
            width: 100%;
            padding: 15px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
            font-family: inherit;
        }
        
        input[type="text"]:focus,
        input[type="email"]:focus,
        input[type="tel"]:focus,
        textarea:focus {
            outline: none;
            border-color: #8B4513;
            box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.1);
        }
        
        textarea {
            resize: vertical;
            min-height: 100px;
        }
        
        .submit-btn {
            background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
            color: white;
            padding: 18px 40px;
            border: none;
            border-radius: 8px;
            font-size: 1.2em;
            font-weight: bold;
            cursor: pointer;
            width: 100%;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .submit-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(139, 69, 19, 0.3);
        }
        
        .submit-btn:active {
            transform: translateY(0);
        }
        
        .perfume-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        @media (max-width: 480px) {
            .form-container {
                padding: 25px;
            }
            
            .header {
                padding: 25px 20px;
            }
            
            .header h1 {
                font-size: 1.8em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="perfume-icon">🌸</div>
            <h1>Place Your Order</h1>
            <p>Premium Perfumes Delivered to Your Door</p>
        </div>
        
        <div class="form-container">
            <?php if (!empty($message)): ?>
                <div class="message <?= $messageType ?>">
                    <?= $message ?>
                </div>
            <?php endif; ?>
            
            <form method="POST" action="">
                <div class="form-group">
                    <label for="fullName">Full Name <span class="required">*</span></label>
                    <input type="text" id="fullName" name="fullName" value="<?= htmlspecialchars($_POST['fullName'] ?? '') ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="email">Email Address <span class="required">*</span></label>
                    <input type="email" id="email" name="email" value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="phone">Phone Number <span class="required">*</span></label>
                    <input type="tel" id="phone" name="phone" value="<?= htmlspecialchars($_POST['phone'] ?? '') ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="city">City <span class="required">*</span></label>
                    <input type="text" id="city" name="city" value="<?= htmlspecialchars($_POST['city'] ?? '') ?>" required>
                </div>
                
                <div class="form-group">
                    <label for="address">Delivery Address <span class="required">*</span></label>
                    <textarea id="address" name="address" placeholder="Enter your complete delivery address..." required><?= htmlspecialchars($_POST['address'] ?? '') ?></textarea>
                </div>
                
                <div class="form-group">
                    <label for="orderNotes">Order Notes (Optional)</label>
                    <textarea id="orderNotes" name="orderNotes" placeholder="Any special instructions or preferences..."><?= htmlspecialchars($_POST['orderNotes'] ?? '') ?></textarea>
                </div>
                
                <button type="submit" class="submit-btn">
                    🛒 Place Order
                </button>
            </form>
        </div>
    </div>
</body>
</html>