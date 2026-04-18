import { Resend } from 'resend';
import logger from './logger';

const resend = new Resend((process.env.RESEND_API_KEY || '').trim());

// From Address - Note: For testing, Resend only allows 'onboarding@resend.dev' 
// unless a domain is verified.
const FROM_ADDRESS = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verificationUrl = `${frontendUrl}/verify-email/${token}`;
    
    const { data, error } = await resend.emails.send({
      from: `Pulse Platform <${FROM_ADDRESS}>`,
      to: [email],
      subject: 'Verify your PULSE Account',
      html: `
        <div style="font-family: sans-serif; background: #0a0a0a; color: white; padding: 40px; border-radius: 12px; max-width: 600px;">
          <h1 style="color: #6366f1;">Welcome to PULSE</h1>
          <p>You're almost there! Click the button below to activate your account and join the mission.</p>
          <a href="${verificationUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Verify Account</a>
          <p style="color: #666; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      logger.error('Resend Verification Error:', error);
      return false;
    }

    logger.info(`Verification email dispatched to ${email} via Resend [${data?.id}]`);
    return true;
  } catch (error: any) {
    logger.error(`Resend failure for ${email}: ${error.message}`);
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
    const { data, error } = await resend.emails.send({
      from: `Pulse Orders <${FROM_ADDRESS}>`,
      to: [email],
      subject: `Your Mission Pass: ${eventName}`,
      html: `
        <div style="font-family: sans-serif; background: #0a0a0a; color: white; padding: 40px; border-radius: 12px; max-width: 600px;">
          <h1 style="color: #6366f1;">Mission Confirmed</h1>
          <p>Your booking for <strong>${eventName}</strong> is secured.</p>
          <p>Booking ID: <code style="background: #1a1a1a; padding: 4px 8px; border-radius: 4px;">${bookingId}</code></p>
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
        }
      ],
    });

    if (error) {
      logger.error('Resend Confirmation Error:', error);
      throw error;
    }

    logger.info(`Confirmation email dispatched for booking ${bookingId} [${data?.id}]`);
  } catch (error: any) {
    logger.error(`Resend failure for ${bookingId}: ${error.message}`);
    throw error;
  }
};

export const sendEventReminder = async (email: string, eventName: string, eventDate: string) => {
  try {
    await resend.emails.send({
      from: `Pulse Reminders <${FROM_ADDRESS}>`,
      to: [email],
      subject: `Reminder: ${eventName} is coming up!`,
      html: `<p>Your mission for <strong>${eventName}</strong> starts on ${eventDate}. Check your tickets in the portal.</p>`,
    });
  } catch (error: any) {
    logger.error(`Reminder failure for ${email}: ${error.message}`);
  }
};

export const sendBulkAnnouncement = async (emails: string[], subject: string, message: string) => {
  try {
    // Resend allows batching or sending to multiple recipients in the 'to' array (limitations apply)
    await resend.emails.send({
      from: `Pulse Broadcast <${FROM_ADDRESS}>`,
      to: emails,
      subject: `[Pulse Announcement] ${subject}`,
      html: `<div>${message}</div>`,
    });
    logger.info(`Bulk announcement dispatched to ${emails.length} nodes`);
  } catch (error: any) {
    logger.error(`Bulk failure: ${error.message}`);
  }
};

export const sendForgotPasswordEmail = async (email: string, token: string) => {

  try {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    
    await resend.emails.send({
      from: `Pulse Security <${FROM_ADDRESS}>`,
      to: [email],
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
    logger.error(`Resend reset failure for ${email}: ${error.message}`);
    return false;
  }
};