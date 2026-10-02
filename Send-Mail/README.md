# 📧 Send Mail - PHP Email System

A simple and elegant PHP-based email system for handling customer orders and inquiries. This system includes two main files for different email functionality.

## 🎯 Purpose

This system is designed to handle customer order forms with automated email notifications. It's perfect for small businesses, e-commerce sites, or any application that needs to collect customer information and send confirmation emails.

## 📁 Project Structure

```
Send-Mail/
├── only send mail to us.php    # Sends emails only to business owner
├── send mail to both.php       # Sends emails to both business owner and customer
├── PHPMailer-6.8.0/           # PHPMailer library for email functionality
├── .env                       # Environment variables (ignored by git)
├── index.php                  # Main application file (ignored by git)
├── .gitignore                # Git ignore file
└── README.md                 # This file
```

## 📋 File Descriptions

### 1. `only send mail to us.php`
**Purpose**: Sends order notifications only to the business owner/company email.

**What it does**:
- Collects customer information (name, email, phone, city, address, order notes)
- Validates all required fields
- Sends a beautifully formatted HTML email to the business owner with customer details
- Shows a success confirmation to the customer
- **Does NOT send any email to the customer**

**Best for**:
- Simple contact forms
- Internal order processing
- When you want to handle customer communication manually

### 2. `send mail to both.php`
**Purpose**: Sends emails to both the business owner AND the customer.

**What it does**:
- Collects customer information (same as above)
- Validates all required fields
- Sends order details to the business owner
- **Additionally sends a thank you confirmation email to the customer**
- Provides customers with their order details and next steps

**Best for**:
- Full customer experience
- Automated order confirmations
- Professional e-commerce workflows
- Better customer service

## ⚙️ Setup Instructions

### 1. **Configure Your Email Address**

Before using this system, you **MUST** replace the placeholder email with your actual email address:

1. Open both PHP files
2. Find this line in each file:
   ```php
   $mail->addAddress('your-email@example.com'); // Replace with your email address
   ```
3. Replace `your-email@example.com` with your actual email address
4. Also update the fallback mail function:
   ```php
   $to = 'your-email@example.com';
   ```

### 2. **Environment Setup**

1. Ensure you have PHP installed with mail functionality
2. Make sure your web server can send emails
3. The system uses PHPMailer for reliable email delivery
4. Update the `setFrom` email address to match your domain:
   ```php
   $mail->setFrom('noreply@yourdomain.com', 'Your Business Name');
   ```

### 3. **Upload to Web Server**

1. Upload all files to your web server
2. Ensure proper file permissions
3. Test the email functionality

## 🎨 Features

### ✨ Email Features
- **Beautiful HTML email templates** with responsive design
- **Fallback to plain text** if HTML fails
- **Multiple sending methods** (PHPMailer + PHP mail fallback)
- **Input validation** and sanitization
- **Professional styling** with your brand colors

### 🔧 Technical Features
- **Session management** for form handling
- **Error handling** and logging
- **Mobile-responsive** form design
- **XSS protection** with htmlspecialchars()
- **Environment variable support** (.env file)

## 📱 Form Fields

Both files collect the following information:
- **Full Name** (required)
- **Email Address** (required)
- **Phone Number** (required)
- **City** (required)
- **Delivery Address** (required)
- **Order Notes** (optional)

## 🎉 Customer Experience

### With `only send mail to us.php`:
1. Customer fills out the form
2. Customer sees success message: "Your order has been placed successfully! We will contact you soon."
3. Business owner receives detailed email with customer information
4. **Customer receives no email**

### With `send mail to both.php`:
1. Customer fills out the form
2. Customer sees success message: "Your order has been placed successfully! We will contact you soon."
3. Business owner receives detailed email with customer information
4. **Customer receives thank you email with:**
   - Order confirmation
   - Summary of their details
   - What happens next
   - Professional branding

## 🔒 Security Features

- Input validation and sanitization
- Email address validation
- XSS protection
- Error logging (not displayed to users)
- Secure email headers

## 🚀 Usage Tips

1. **Choose the right file for your needs:**
   - Use `only send mail to us.php` for simple contact forms
   - Use `send mail to both.php` for better customer experience

2. **Customize the branding:**
   - Update company name in email headers
   - Change the `setFrom` address to your domain
   - Modify the color scheme in the CSS

3. **Test thoroughly:**
   - Test with different email providers
   - Verify emails don't go to spam
   - Check mobile responsiveness

## 📧 Email Configuration

The system is configured to work with most hosting providers out of the box. If you need SMTP configuration, you can modify the PHPMailer settings in the PHP files.

## 🤝 Contributing

If you use this system:
1. Replace `your-email@example.com` with your actual email
2. Update the domain in `setFrom` to match your website
3. Customize the styling to match your brand
4. Test thoroughly before going live

## 📄 License

This is an open-source project. Feel free to use, modify, and distribute as needed.

---

**Important**: Remember to update all email addresses from the placeholder `your-email@example.com` to your actual email address before using this system!