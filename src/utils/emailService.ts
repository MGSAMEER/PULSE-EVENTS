import dns from 'dns';
import nodemailer from 'nodemailer';
import logger from './logger';

// Hardened Transporter with IPv4 preference (via global server fix)
// and strict Port 465 SSL settings for Railway compatibility.
const getTransporter = () => {
  // Check for credentials under both common naming patterns
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
  
  // Honor Railway variables but fallback to 587 if not specified
  const port = parseInt(process.env.SMTP_PORT || '587');
  const isSecure = process.env.SMTP_SECURE === 'true' || port === 465;

  logger.info(`[DIAGNOSTIC] Initializing SMTP: smtp.googlemail.com:${port} | Secure: ${isSecure} | User: ${user ? 'SET' : 'MISSING'} | Pass: ${pass ? 'SET' : 'MISSING'}`);

  return nodemailer.createTransport({
    host: 'smtp.googlemail.com', 
    port: port,
    secure: isSecure, 
    auth: { user, pass },
    // THE NUCLEAR FIX: Force NodeMailer to use the IPv4 address instead of failing on IPv6
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, callback);
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 20000, 
    greetingTimeout: 20000,   
    socketTimeout: 40000      
  });
};

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const transporter = getTransporter();
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verificationUrl = `${frontendUrl}/verify-email/${token}`;

    const mailOptions = {
      from: `"PULSE Platform" <${process.env.EMAIL_USER}>`,
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

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email} [${result.messageId}]`);
    return true;
  } catch (error: any) {
    logger.error(`SMTP Verification failure for ${email}: ${error.message}`);
    return false;
  }
};

export const sendBookingConfirmation = async (
  email: string,
  eventName: string,
  bookingId: string,
  qrCodeBuffer: Buffer,
  pdfBuffer: Buffer
) => {
  try {
    const transporter = getTransporter();

    const mailOptions = {
      from: `"PULSE Orders" <${process.env.EMAIL_USER}>`,
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

    const result = await transporter.sendMail(mailOptions);
    logger.info(`Booking confirmation sent to ${email} [${result.messageId}]`);
  } catch (error: any) {
    logger.error(`SMTP Booking failure for ${bookingId}: ${error.message}`);
    throw error;
  }
};

export const sendEventReminder = async (email: string, eventName: string, eventDate: string) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"PULSE Reminders" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Reminder: ${eventName} is coming up!`,
      html: `<p>Your mission for <strong>${eventName}</strong> starts on ${eventDate}. Check your tickets in the portal.</p>`,
    });
  } catch (error: any) {
    logger.error(`SMTP Reminder failure for ${email}: ${error.message}`);
  }
};

export const sendBulkAnnouncement = async (emails: string[], subject: string, message: string) => {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"PULSE Broadcast" <${process.env.EMAIL_USER}>`,
      to: emails.join(','),
      subject: `[Pulse Announcement] ${subject}`,
      html: `<div>${message}</div>`,
    });
    logger.info(`Bulk announcement dispatched to ${emails.length} nodes`);
  } catch (error: any) {
    logger.error(`SMTP Bulk failure: ${error.message}`);
  }
};

export const sendForgotPasswordEmail = async (email: string, token: string) => {
  try {
    const transporter = getTransporter();
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    
    await transporter.sendMail({
      from: `"PULSE Security" <${process.env.EMAIL_USER}>`,
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
    });
    
    return true;
  } catch (error: any) {
    logger.error(`SMTP Reset failure for ${email}: ${error.message}`);
    return false;
  }
};