import dns from 'dns';
import { promisify } from 'util';
import nodemailer from 'nodemailer';
import logger from './logger';

const lookup = promisify(dns.lookup);

// 🔥 FORCE IPV4 GLOBALLY (CRITICAL FIX FOR RAILWAY ENETUNREACH ERROR)
dns.setDefaultResultOrder('ipv4first');

// ✅ CONFIGURE SIMPLIFIED TRANSPORTER
export const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
  // 🔥 CRITICAL: Force IPv4
  family: 4,
  // 🔥 Stability configs
  connectionTimeout: 10000,
  socketTimeout: 10000,
  greetingTimeout: 5000,
  // TLS
  requireTLS: true,
  tls: {
    rejectUnauthorized: false,
  },
  logger: true,
  debug: true,
} as any);

/**
 * 🔍 Verify SMTP transporter is properly configured
 */
export async function verifyTransporter(): Promise<boolean> {
  try {
    const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const emailPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      logger.error('❌ SMTP credentials missing!');
      return false;
    }

    // Task 4: Debug Validation
    const result = await lookup('smtp.gmail.com', { family: 4 });
    logger.info(`📡 Resolved SMTP IPv4: ${result.address}`);

    await transporter.verify();
    logger.info('✅ SMTP Transporter verified successfully');
    return true;
  } catch (error: any) {
    logger.error(`❌ SMTP Transporter verification failed: ${error.message}`);
    return false;
  }
}

/**
 * Sends an email with basic retry logic
 */
export async function sendWithRetry(mailOptions: any, retries = 2) {
  try {
    // Task 4: Debug Validation before every send
    const result = await lookup('smtp.gmail.com', { family: 4 });
    logger.debug(`📡 Pre-send DNS Check: smtp.gmail.com -> ${result.address}`);

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✅ Email sent successfully. Message ID: ${info.messageId}`);
    return info;
  } catch (err: any) {
    if (retries > 0) {
      logger.warn(`⚠️ Email send failed, retrying... (${retries} attempts left). Error: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendWithRetry(mailOptions, retries - 1);
    }
    logger.error(`❌ Final email send failure: ${err.message}`);
    throw err;
  }
}

/**
 * Asynchronous non-blocking wrapper for email dispatch
 */
export async function sendEmailSafe(mailOptions: any): Promise<boolean> {
  try {
    await sendWithRetry(mailOptions);
    return true;
  } catch (error: any) {
    logger.error(`❌ Email dispatch FAILED for ${mailOptions.to}: ${error.message}`);
    return false;
  }
}

export const sendVerificationEmail = async (email: string, token: string) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const verificationUrl = `${frontendUrl}/verify-email/${token}`;

  const mailOptions = {
    from: `"PULSE Platform" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your PULSE Account',
    html: `
      <div style="font-family: sans-serif; background: #0a0a0a; color: white; padding: 40px; border-radius: 12px; max-width: 600px;">
        <h1 style="color: #6366f1;">Welcome to PULSE</h1>
        <p>Click the button below to activate your account and join the mission.</p>
        <a href="${verificationUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Verify Account</a>
        <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  logger.info(`📧 Sending verification email to ${email}`);
  return sendEmailSafe(mailOptions);
};

export const sendBookingConfirmation = async (
  email: string,
  eventName: string,
  bookingId: string,
  qrCodeBuffer: Buffer,
  pdfBuffer: Buffer
) => {
  const mailOptions = {
    from: `"PULSE Orders" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your Mission Pass: ${eventName}`,
    html: `
      <div style="font-family: sans-serif; background: #0a0a0a; color: white; padding: 40px; border-radius: 12px; max-width: 600px;">
        <h1 style="color: #6366f1;">Mission Confirmed</h1>
        <p>Your booking for <strong>${eventName}</strong> is secured.</p>
        <p>Booking ID: <code style="background: #1a1a1a; padding: 4px 8px; border-radius: 4px;">${bookingId}</code></p>
        <div style="background: #ffffff; padding: 20px; display: inline-block; border-radius: 8px; margin: 20px 0;">
           <img src="cid:qrcode" alt="QR Code" width="150" height="150" />
        </div>
        <p>Find your E-Ticket attached as a PDF to this email.</p>
        <p style="color: #666; font-size: 12px;">See you at the drop-off point.</p>
      </div>
    `,
    attachments: [
      {
        filename: 'ticket.pdf',
        content: pdfBuffer,
      },
      {
        filename: 'qrcode.png',
        content: qrCodeBuffer,
        cid: 'qrcode'
      }
    ],
  };

  logger.info(`📧 Sending booking confirmation to ${email} for event: ${eventName} (Booking ID: ${bookingId})`);
  return sendEmailSafe(mailOptions);
};

export const sendEventReminder = async (email: string, eventName: string, eventDate: string) => {
  const mailOptions = {
    from: `"PULSE Reminders" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: `Reminder: ${eventName} is coming up!`,
    html: `<p>Your mission for <strong>${eventName}</strong> starts on ${eventDate}. Check your tickets in the portal.</p>`,
  };
  
  logger.info(`📧 Sending event reminder to ${email} for event: ${eventName}`);
  return sendEmailSafe(mailOptions);
};

export const sendBulkAnnouncement = async (emails: string[], subject: string, message: string) => {
  const mailOptions = {
    from: `"PULSE Broadcast" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: emails.join(','),
    subject: `[Pulse Announcement] ${subject}`,
    html: `<div>${message}</div>`,
  };

  logger.info(`📧 Sending bulk announcement to ${emails.length} recipients with subject: ${subject}`);
  return sendEmailSafe(mailOptions);
};

export const sendForgotPasswordEmail = async (email: string, token: string) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${frontendUrl}/reset-password/${token}`;
  
  const mailOptions = {
    from: `"PULSE Security" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: sans-serif; background: #0a0a0a; color: white; padding: 40px; border-radius: 12px; max-width: 600px;">
        <h1 style="color: #6366f1;">Access Recovery</h1>
        <p>We received a request to reset your password. Click the button below to proceed.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Reset Password</a>
        <p style="color: #666; font-size: 12px;">This link will expire in 1 hour.</p>
      </div>
    `,
  };
  
  logger.info(`📧 Sending password reset email to ${email}`);
  return sendEmailSafe(mailOptions);
};