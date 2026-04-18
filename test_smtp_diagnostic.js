#!/usr/bin/env node

/**
 * 🔍 COMPREHENSIVE SMTP DIAGNOSTIC TOOL
 * Helps identify what's wrong with email configuration and SMTP connection
 */

const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
const emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

console.log('\n' + '='.repeat(70));
console.log('🔍 PULSE EMAIL SYSTEM DIAGNOSTIC');
console.log('='.repeat(70) + '\n');

// 1. Check environment variables
console.log('📋 STEP 1: Environment Configuration Check');
console.log('-'.repeat(70));

if (!emailUser) {
  console.error('❌ ERROR: EMAIL_USER or SMTP_USER not set in .env');
  process.exit(1);
}

if (!emailPass) {
  console.error('❌ ERROR: EMAIL_PASS or SMTP_PASS not set in .env');
  process.exit(1);
}

console.log(`✅ Email User: ${emailUser}`);
console.log(`✅ Email Password: ${emailPass ? '[MASKED]' : 'NOT SET'}`);
console.log(`✅ Frontend URL: ${frontendUrl}`);
console.log(`✅ DNS IPv4 Priority: Enabled\n`);

// 2. DNS Configuration
console.log('🌐 STEP 2: DNS Configuration');
console.log('-'.repeat(70));
dns.setDefaultResultOrder('ipv4first');
console.log('✅ DNS configured to prefer IPv4 (Railway fix)\n');

// 3. Create transporter
console.log('⚙️  STEP 3: Creating Nodemailer Transporter');
console.log('-'.repeat(70));

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: emailUser.trim(),
    pass: emailPass.trim(),
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  }
});

console.log('✅ Transporter created with configuration:');
console.log('   - Host: smtp.gmail.com');
console.log('   - Port: 587');
console.log('   - Secure: false (STARTTLS)');
console.log('   - Connection Timeout: 10000ms\n');

// 4. Verify transporter connection
console.log('🔗 STEP 4: Verifying SMTP Connection');
console.log('-'.repeat(70));

transporter.verify()
  .then(() => {
    console.log('✅ SMTP Connection Verified Successfully!\n');
    
    // 5. Send test email
    console.log('📧 STEP 5: Sending Test Email');
    console.log('-'.repeat(70));
    
    const mailOptions = {
      from: `"PULSE Diagnostic" <${emailUser}>`,
      to: emailUser,
      subject: '[PULSE] SMTP Configuration Test - ' + new Date().toLocaleString(),
      html: `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: #fff; border-radius: 20px; border: 1px solid #333; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #10b981; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">✅ SMTP Configuration Valid</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6;">
              This email confirms your backend SMTP configuration is working correctly.
              <br /><br />
              <strong>System Details:</strong><br />
              User: ${emailUser}<br />
              Timestamp: ${new Date().toLocaleString()}<br />
              Email Service: Gmail SMTP (587 STARTTLS)
            </p>
            <div style="margin-top: 30px; font-family: monospace; color: #888; background: #1a1a1a; padding: 15px; border-radius: 8px;">
                [STATUS: ✅ OPERATIONAL]<br/>
                [PROTOCOL: NODEMAILER // GMAIL AUTH v2.0]<br/>
                [CONNECTION: VERIFIED AND HEALTHY]
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Your booking confirmation emails should now be working properly.
            </p>
        </div>
      `,
      text: 'PULSE SMTP Test Email - If you received this, your email system is working!'
    };
    
    return transporter.sendMail(mailOptions);
  })
  .then((info) => {
    console.log('✅ Test Email Sent Successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Response: ${info.response}\n`);
    
    console.log('='.repeat(70));
    console.log('🎉 ALL CHECKS PASSED - SMTP IS WORKING CORRECTLY');
    console.log('='.repeat(70));
    console.log('\n📋 Summary:');
    console.log('   ✅ Credentials loaded from .env');
    console.log('   ✅ SMTP connection verified');
    console.log('   ✅ Test email sent successfully');
    console.log('   ✅ Gmail SMTP server responding correctly\n');
    console.log('💡 Next Steps:');
    console.log('   1. Check your email inbox for the test message');
    console.log('   2. If you received it, SMTP is fully operational');
    console.log('   3. Restart your backend server: npm run dev');
    console.log('   4. Process a test payment to verify booking emails\n');
    
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ SMTP Connection Failed!\n');
    console.error('Error Details:');
    console.error(`   Code: ${err.code}`);
    console.error(`   Message: ${err.message}\n`);
    
    console.log('='.repeat(70));
    console.log('🔧 TROUBLESHOOTING GUIDE');
    console.log('='.repeat(70) + '\n');
    
    if (err.code === 'EAUTH') {
      console.log('❌ Authentication Failed - Credential Issue\n');
      console.log('✅ SOLUTIONS:');
      console.log('   1. Verify EMAIL_USER and EMAIL_PASS in .env are correct');
      console.log('   2. For Gmail: Use an App Password, not your regular password');
      console.log('   3. Generate App Password at: https://myaccount.google.com/apppasswords');
      console.log('   4. Enable 2FA first if not already enabled');
      console.log('   5. Make sure there are no extra spaces in credentials\n');
    } else if (err.code === 'ECONNREFUSED') {
      console.log('❌ Connection Refused\n');
      console.log('✅ SOLUTIONS:');
      console.log('   1. Check internet connectivity');
      console.log('   2. Verify SMTP host is smtp.gmail.com');
      console.log('   3. Verify port is 587 (not 465)');
      console.log('   4. Check if ISP is blocking port 587');
      console.log('   5. Try: telnet smtp.gmail.com 587\n');
    } else if (err.code === 'ETIMEDOUT' || err.code === 'EHOSTUNREACH') {
      console.log('❌ Network Timeout - Cannot Reach SMTP Server\n');
      console.log('✅ SOLUTIONS:');
      console.log('   1. Check network connectivity');
      console.log('   2. Check firewall settings');
      console.log('   3. On Railway: Ensure DNS is set to IPv4 first');
      console.log('   4. Check if ISP blocks outbound port 587');
      console.log('   5. Try switching to port 465 (secure) as alternative\n');
    } else {
      console.log('❌ Unknown SMTP Error\n');
      console.log('✅ SOLUTIONS:');
      console.log('   1. Verify all credentials are correct');
      console.log('   2. Check internet connection');
      console.log('   3. Verify Gmail account security settings');
      console.log('   4. Check for IP bans or suspicious login attempts');
      console.log('   5. Use App Password instead of regular password\n');
    }
    
    console.log('📝 Error Code Reference:');
    console.log('   EAUTH: Authentication error (wrong credentials)');
    console.log('   ECONNREFUSED: Server refused connection');
    console.log('   ETIMEDOUT: Connection timeout');
    console.log('   EHOSTUNREACH: Cannot reach the host\n');
    
    console.log('Full error details:');
    console.error(err);
    
    process.exit(1);
  });

// Handle uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});
