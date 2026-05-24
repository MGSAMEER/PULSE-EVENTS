import logger from './logger';

// --------------------------------------------------------------------------
// Brevo (Sendinblue) REST API
// No SMTP transport — everything goes through the JSON-over-HTTPS API.
// https://developers.brevo.com/reference/sendtransacionalemail
// --------------------------------------------------------------------------

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@pulse-events.com';
const SENDER_NAME  = 'PULSE Events';

/**
 * Low-level Brevo HTTP sender with COMPREHENSIVE DEBUGGING.
 * Returns `true` on 2xx, `false` otherwise.
 */
async function sendViaBrevo(payload: Record<string, any>): Promise<boolean> {
  // ✅ DEBUG START
  console.log('🚀 [sendViaBrevo] FUNCTION STARTED');

  // ✅ DEBUG: Check API key existence
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  console.log('🔑 [sendViaBrevo] API KEY EXISTS:', !!apiKey, `(length: ${apiKey.length})`);

  if (!apiKey) {
    const errMsg = '❌ [brevo] BREVO_API_KEY is not set in environment variables';
    console.error(errMsg);
    logger.error(errMsg);
    return false;
  }

  try {
    // ✅ DEBUG: Log request details
    console.log('📡 [sendViaBrevo] Sending POST request to:', BREVO_API_URL);
    console.log('📡 [sendViaBrevo] Request headers:', {
      'Content-Type': 'application/json',
      'api-key': `***${apiKey.slice(-4)}`, // Show last 4 chars only
      'Accept': 'application/json',
    });
    console.log('📡 [sendViaBrevo] Payload keys:', Object.keys(payload));

    // ✅ DEBUG: Execute fetch
    console.log('📡 [sendViaBrevo] Initiating fetch...');
    const res = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // ✅ DEBUG: Log response status
    console.log('📬 [sendViaBrevo] Response status:', res.status, res.statusText);
    console.log('📬 [sendViaBrevo] Response headers:', {
      'content-type': res.headers.get('content-type'),
      'content-length': res.headers.get('content-length'),
    });

    // ✅ DEBUG: Capture response body as text first
    const responseText = await res.text();
    console.log('📬 [sendViaBrevo] Response body (raw):', responseText);

    // ✅ DEBUG: Try to parse JSON for additional details
    let jsonBody: Record<string, any> = {};
    try {
      jsonBody = JSON.parse(responseText);
      console.log('📬 [sendViaBrevo] Response body (parsed):', JSON.stringify(jsonBody, null, 2));
    } catch (parseErr) {
      console.log('📬 [sendViaBrevo] Response body is not JSON');
    }

    // ✅ DEBUG: Check HTTP status
    if (!res.ok) {
      const errMsg = `❌ [brevo] API responded ${res.status} ${res.statusText} | ${responseText}`;
      console.error(errMsg);
      logger.error(errMsg);
      if (jsonBody.message) {
        console.error('❌ [brevo] Brevo error message:', jsonBody.message);
      }
      if (jsonBody.code) {
        console.error('❌ [brevo] Brevo error code:', jsonBody.code);
      }
      return false;
    }

    // ✅ DEBUG: Success
    console.log('✅ [sendViaBrevo] Request succeeded (2xx status)');
    return true;
  } catch (err: any) {
    console.error('❌ [sendViaBrevo] FETCH ERROR:', err?.message || err);
    console.error('❌ [sendViaBrevo] Error stack:', err?.stack || 'No stack');
    logger.error(`❌ [brevo] HTTP error: ${err?.message || err}`);
    return false;
  }
}

// --------------------------------------------------------------------------
// Helper — convert Buffer → base64 data-URI string for Brevo's
// `content.disposition` inline-attachment field.
// --------------------------------------------------------------------------
function bufferToBase64DataUri(buf: Buffer, mimeType: string): string {
  const b64 = buf.toString('base64');
  return `data:${mimeType};base64,${b64}`;
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

interface SendBookingConfirmationParams {
  email:      string;
  eventName:  string;
  bookingId:  string;
  qrBuffer:   Buffer;
  pdfBuffer:  Buffer;
}

/**
 * Sends a booking-confirmation email via Brevo.
 *
 * Attachments
 *   ticket.pdf   – the PDF boarding pass (inline-listed, binary)
 *   qrcode.png   – the QR code image embedded in the HTML body
 *
 * Returns `true` on HTTP 2xx, `false` on any failure.
 */
export async function sendBookingConfirmation({
  email,
  eventName,
  bookingId,
  qrBuffer,
  pdfBuffer,
}: SendBookingConfirmationParams): Promise<boolean> {
  console.log('📧 Brevo email function called: sendBookingConfirmation');
  logger.info(`📧 [brevo] Sending booking confirmation → ${email} | booking=${bookingId}`);

  const qrBase64  = qrBuffer.toString('base64');
  const pdfBase64 = pdfBuffer.toString('base64');

  const payload: Record<string, any> = {
    sender:      { email: SENDER_EMAIL, name: SENDER_NAME },
    to:          [{ email }],
    subject:     `Your Mission Pass: ${eventName}`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#0a0a0a;color:white;padding:40px;
                  border-radius:12px;max-width:600px">
        <h1 style="color:#6366f1">Mission Confirmed</h1>
        <p>Your booking for <strong>${eventName}</strong> is secured.</p>
        <p>Booking ID:
          <code style="background:#1a1a1a;padding:4px 8px;border-radius:4px">
            ${bookingId}
          </code>
        </p>
        <div style="background:#fff;padding:20px;display:inline-block;border-radius:8px;
                    margin:20px 0">
          <img src="cid:qrcode" alt="QR Code" width="150" height="150"/>
        </div>
        <p>Your QR code is embedded above. Your E-Ticket PDF is attached to
           this email.</p>
        <p style="color:#666;font-size:12px">
          See you at the drop-off point.
        </p>
      </div>`,
    // Inline QR image — rendered inside the HTML via cid:qrcode
    inlineImage: [
      {
        filename: 'qrcode.png',
        content:  qrBase64,
        cid:      'qrcode',
      } as any,
    ],
    // PDF ticket as a file attachment
    attachment: [
      {
        name:     'ticket.pdf',
        content:  pdfBase64,
        mimetype: 'application/pdf',
      } as any,
    ],
  };

  const ok = await sendViaBrevo(payload);

  if (ok) {
    logger.info(`✅ [brevo] Booking confirmation sent → ${email}`);
    console.log('✅ Email sent');
  } else {
    logger.error(`❌ [brevo] Booking confirmation FAILED → ${email}`);
    console.error('❌ Email failed: booking confirmation');
  }

  return ok;
}

// --------------------------------------------------------------------------
interface VerificationEmailParams {
  email:    string;
  userName: string;
  token:    string;
}

/**
 * Sends an account-verification email via Brevo.
 */
export async function sendVerificationEmail({
  email,
  userName,
  token,
}: VerificationEmailParams): Promise<boolean> {
  // ✅ DEBUG: Log function entry
  console.log('📧 [sendVerificationEmail] TRIGGERED for email:', email);
  console.log('📧 [sendVerificationEmail] userName:', userName);
  console.log('📧 [sendVerificationEmail] token exists:', !!token, `(length: ${token?.length})`);

  // ✅ CRITICAL DEBUG: Check FRONTEND_URL environment variable
  const rawFrontendUrl = process.env.FRONTEND_URL;
  console.log('🔍 [sendVerificationEmail] RAW FRONTEND_URL from env:', rawFrontendUrl);
  console.log('🔍 [sendVerificationEmail] NODE_ENV:', process.env.NODE_ENV);
  
  if (!rawFrontendUrl) {
    console.warn('⚠️ [sendVerificationEmail] FRONTEND_URL is NOT SET - using fallback localhost');
    console.warn('⚠️ [sendVerificationEmail] This should NOT happen in production!');
    console.warn('⚠️ [sendVerificationEmail] Verify FRONTEND_URL is set in Render environment variables');
  }

  const frontendUrl =
    (rawFrontendUrl || 'http://localhost:3000').replace(/\/$/, '');
  const verifyUrl = `${frontendUrl}/verify-email/${token}`;

  console.log('✅ [sendVerificationEmail] Resolved Frontend URL:', frontendUrl);
  console.log('✅ [sendVerificationEmail] Verify URL:', verifyUrl);
  console.log('📧 Brevo email function called: sendVerificationEmail');
  logger.info(`📧 [brevo] Sending verification email → ${email} with URL: ${verifyUrl}`);

  const payload: Record<string, any> = {
    sender:      { email: SENDER_EMAIL, name: SENDER_NAME },
    to:          [{ email }],
    subject:     'Verify your PULSE Account',
    htmlContent: `
      <div style="font-family:sans-serif;background:#0a0a0a;color:white;padding:40px;
                  border-radius:12px;max-width:600px">
        <h1 style="color:#6366f1">Welcome to PULSE, ${userName}!</h1>
        <p>Click the button below to activate your account and join the mission.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;
                  text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0">
          Verify Account
        </a>
        <p style="color:#666;font-size:12px">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>`,
  };

  console.log('📧 [sendVerificationEmail] Payload constructed, sender email:', SENDER_EMAIL);
  console.log('📧 [sendVerificationEmail] Calling sendViaBrevo()...');

  const ok = await sendViaBrevo(payload);

  if (ok) {
    console.log('✅ [sendVerificationEmail] SUCCESS - Brevo accepted the email');
    logger.info(`✅ [brevo] Verification email sent → ${email}`);
    console.log('✅ Email sent');
  } else {
    console.error('❌ [sendVerificationEmail] FAILED - Brevo returned false');
    logger.error(`❌ [brevo] Verification email FAILED → ${email}`);
    console.error('❌ Email failed: verification email');
  }

  return ok;
}

// --------------------------------------------------------------------------
interface ForgotPasswordEmailParams {
  email:    string;
  userName: string;
  token:    string;
}

/**
 * Sends a password-reset email via Brevo.
 */
export async function sendForgotPasswordEmail({
  email,
  userName,
  token,
}: ForgotPasswordEmailParams): Promise<boolean> {
  // ✅ CRITICAL DEBUG: Check FRONTEND_URL environment variable
  const rawFrontendUrl = process.env.FRONTEND_URL;
  console.log('🔍 [sendForgotPasswordEmail] RAW FRONTEND_URL from env:', rawFrontendUrl);
  
  if (!rawFrontendUrl) {
    console.warn('⚠️ [sendForgotPasswordEmail] FRONTEND_URL is NOT SET - using fallback localhost');
  }

  const frontendUrl =
    (rawFrontendUrl || 'http://localhost:3000').replace(/\/$/, '');
  const resetUrl = `${frontendUrl}/reset-password/${token}`;

  console.log('✅ [sendForgotPasswordEmail] Resolved Frontend URL:', frontendUrl);
  console.log('📧 Brevo email function called: sendForgotPasswordEmail');
  logger.info(`📧 [brevo] Sending password-reset email → ${email} with URL: ${resetUrl}`);

  const payload: Record<string, any> = {
    sender:      { email: SENDER_EMAIL, name: SENDER_NAME },
    to:          [{ email }],
    subject:     ' Password Reset Request',
    htmlContent: `
      <div style="font-family:sans-serif;background:#0a0a0a;color:white;padding:40px;
                  border-radius:12px;max-width:600px">
        <h1 style="color:#6366f1">Access Recovery, ${userName}</h1>
        <p>We received a request to reset your password. Click the button below
           to proceed.</p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;
                  text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0">
          Reset Password
        </a>
        <p style="color:#666;font-size:12px">This link will expire in 1 hour.</p>
      </div>`,
  };

  const ok = await sendViaBrevo(payload);

  if (ok) {
    logger.info(`✅ [brevo] Password-reset email sent → ${email}`);
    console.log('✅ Email sent');
  } else {
    logger.error(`❌ [brevo] Password-reset email FAILED → ${email}`);
    console.error('❌ Email failed: password-reset');
  }

  return ok;
}

// --------------------------------------------------------------------------
interface BulkAnnouncementParams {
  emails:    string[];
  subject:   string;
  message:   string;
}

/**
 * Sends a one-to-many broadcast announcement via Brevo.
 * Upserts recipients individually so a partial failure does not cancel
 * the whole batch.
 */
export async function sendBulkAnnouncement({
  emails,
  subject,
  message,
}: BulkAnnouncementParams): Promise<{ sent: number; failed: number }> {
  logger.info(
    `📧 [brevo] Broadcasting to ${emails.length} recipients | subject="${subject}"`,
  );

  let sent = 0;
  let failed = 0;

  for (const email of emails) {
    const payload: Record<string, any> = {
      sender:    { email: SENDER_EMAIL, name: SENDER_NAME },
      to:        [{ email }],
      subject:   `[Pulse Announcement] ${subject}`,
      htmlContent: `<div style="font-family:sans-serif;padding:20px">${message}</div>`,
    };

    const ok = await sendViaBrevo(payload);
    ok ? sent++ : failed++;
  }

  logger.info(`📧 [brevo] Broadcast complete | sent=${sent} failed=${failed}`);
  return { sent, failed };
}

// --------------------------------------------------------------------------
interface EventReminderParams {
  email:    string;
  eventName: string;
  eventDate: string;
}

/**
 * Sends an event-reminder email via Brevo. Kept here so the scheduler
 * (utils/scheduler.ts) can import it without changing its call-site.
 */
export async function sendEventReminder({
  email,
  eventName,
  eventDate,
}: EventReminderParams): Promise<boolean> {
  logger.info(
    `📧 [brevo] Sending event reminder → ${email} | event=${eventName}`,
  );

  const payload = {
    sender:      { email: SENDER_EMAIL, name: SENDER_NAME },
    to: [{ email }],
    subject: `Reminder: ${eventName} is coming up!`,
    htmlContent: `
      <div style="font-family:sans-serif;background:#0a0a0a;color:white;padding:40px;
                  border-radius:12px;max-width:600px">
        <h1 style="color:#6366f1">See you soon!</h1>
        <p>Your mission for <strong>${eventName}</strong> starts on ${eventDate}.
           Check your ticket in the portal.</p>
        <p style="color:#666;font-size:12px">
          This is an automated reminder from PULSE Events.
        </p>
      </div>`,
  };

  const ok = await sendViaBrevo(payload);
  ok
    ? logger.info(
        `✅ [brevo] Event reminder sent → ${email} | event=${eventName}`,
      )
    : logger.error(
        `❌ [brevo] Event reminder FAILED → ${email} | event=${eventName}`,
      );
  return ok;
}
