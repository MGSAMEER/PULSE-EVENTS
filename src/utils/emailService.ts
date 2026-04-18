import nodemailer from 'nodemailer';
import logger from './logger';

let transporterInstance: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporterInstance) {
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = parseInt((process.env.SMTP_PORT || '465').trim()); // Default to 465 for better cloud compatibility
    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASS || '').trim();

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure: port === 465 || process.env.SMTP_SECURE === 'true', 
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false // Bypass SSL verification for cloud proxy compatibility
      },
      connectionTimeout: 20000, // 20s connection timeout
      greetingTimeout: 15000,   // 15s greeting timeout
      socketTimeout: 30000,     // 30s socket timeout
    });
  }
  return transporterInstance;
};

getTransporter().verify((error, success) => {
  if (error) {
    logger.error(`SMTP Validation Error: ${error.message}`);

  } else {
    logger.info("SMTP Server Ready for Operations");

  }
});

export const sendBookingConfirmation = async (email: string, eventName: string, bookingId: string, qrBuffer?: Buffer, pdfBuffer?: Buffer) => {
  const attachments: any[] = [];

  if (qrBuffer) {
    attachments.push({
      filename: 'qrcode.png',
      content: qrBuffer,
      cid: 'qrcode' // same cid value as in the html img src
    });
  }

  if (pdfBuffer) {
    attachments.push({
      filename: 'pulse-ticket.pdf',
      content: pdfBuffer,
    });
  }

  const mailOptions: any = {
    from: `"PULSE Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `[CONFIRMED] MISSION AUTHORIZATION: ${eventName}`,
    attachments,
    html: `
      <div style="font-family: 'Inter', system-ui, sans-serif; max-width: 600px; margin: auto; border: 1px solid rgba(185, 55, 94, 0.1); border-radius: 30px; overflow: hidden; background: #000;">
        <div style="background: linear-gradient(135deg, #B9375E 0%, #140A0D 100%); padding: 60px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">Mission Confirmed</h1>
          <p style="color: rgba(255,255,255,0.6); font-weight: 700; margin-top: 15px; font-size: 10px; text-transform: uppercase; letter-spacing: 3px;">UID: ${bookingId.slice(-12).toUpperCase()}</p>
        </div>
        <div style="padding: 50px 40px; background-color: #ffffff;">
          <h2 style="color: #140A0D; margin-top: 0; font-weight: 900; font-size: 24px;">WELCOME TO THE PULSE.</h2>
          <p style="color: #555; line-height: 1.8; font-size: 15px;">Your digital permit for <strong>${eventName}</strong> has been successfully synchronized with our central grid.</p>
          <div style="background-color: #FDF2F5; padding: 30px; border-radius: 20px; margin: 30px 0; border: 1px dashed #B9375E;">
            <p style="margin: 0; color: #B9375E; font-size: 10px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">AUTHORIZATION KEY</p>
            <p style="margin: 10px 0 0 0; color: #140A0D; font-weight: 900; font-size: 18px; font-family: monospace;">${bookingId}</p>
          </div>
          ${qrBuffer ? `
            <div style="text-align: center; margin: 30px 0; padding: 30px; background-color: #f5f5f5; border-radius: 20px;">
              <p style="margin: 0 0 15px 0; color: #B9375E; font-size: 10px; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">DYNAMIC QR CODE</p>
              <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px; border-radius: 10px; border: 2px solid #B9375E;">
              <p style="margin: 15px 0 0 0; color: #666; font-size: 12px; font-weight: 600;">Scan this code for instant entry verification</p>
            </div>
          ` : ''}
          <p style="color: #666; line-height: 1.6; font-size: 14px;">Present your dynamic QR code for uplink verification during entry. Our scan terminals are active 30 minutes prior to mission start.</p>
          <div style="text-align: center; margin-top: 50px;">
            <a href="http://localhost:3000/bookings" style="background-color: #B9375E; color: white; padding: 20px 40px; text-decoration: none; border-radius: 15px; font-weight: 900; display: inline-block; box-shadow: 0 10px 30px rgba(185, 55, 94, 0.3); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Access My Permit</a>
          </div>
        </div>
        <div style="background-color: #140A0D; padding: 30px; text-align: center;">
          <p style="color: rgba(255,255,255,0.4); font-size: 10px; font-weight: 700; margin: 0; letter-spacing: 2px; text-transform: uppercase;">&copy; ${new Date().getFullYear()} PULSE SYSTEMS // ONLINE</p>
        </div>
      </div>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    logger.info(`Confirmation email dispatched to ${email}`);
  } catch (error: any) {
    logger.error(`NodeMailer failure: ${error.message} for booking ${bookingId}`);
    throw error;
  }
};

export const sendEventReminder = async (email: string, eventName: string, eventDate: string) => {
  const mailOptions = {
    from: `"PULSE Reminders" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `[ALERT] MISSION STARTING SOON: ${eventName}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border-radius: 30px; overflow: hidden; background: #140A0D; border: 1px solid #B9375E;">
        <div style="padding: 60px 40px; text-align: center;">
          <h1 style="color: #B9375E; margin: 0; font-weight: 900; font-size: 28px; text-transform: uppercase;">Prepare for Uplink</h1>
          <p style="color: white; line-height: 1.6; margin-top: 20px;">Your upcoming mission <strong>${eventName}</strong> is about to go live.</p>
          <div style="margin: 30px 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px;">
            <p style="color: #B9375E; font-weight: 900; font-size: 24px;">${eventDate}</p>
          </div>
          <p style="color: rgba(255,255,255,0.5); font-size: 14px;">Ensure your terminal is charged and digital permit is accessible.</p>
        </div>
      </div>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
  } catch (error: any) {
    logger.error(`Reminder failure: ${error.message} for ${email}`);
  }
};

export const sendBulkAnnouncement = async (emails: string[], subject: string, message: string) => {
  const mailOptions = {
    from: `"PULSE Broadcast" <${process.env.EMAIL_USER}>`,
    to: emails.join(','),
    subject: `[SYSTEM BROADCAST] ${subject}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #B9375E; border-radius: 30px; overflow: hidden; background: #fff;">
        <div style="background-color: #B9375E; padding: 30px; color: white; text-align: center;">
          <h2 style="margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Official Broadcast</h2>
        </div>
        <div style="padding: 50px 40px;">
          <p style="color: #140A0D; line-height: 1.8; font-size: 16px;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center;">
          <p style="color: #aaa; font-size: 10px; font-weight: 700; letter-spacing: 1px;">SENDER: SYSTEM_ADMIN_CORE</p>
        </div>
      </div>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    logger.info(`Broadcast mission complete to ${emails.length} nodes`);
  } catch (error: any) {
    logger.error(`Broadcast failure: ${error.message}`);
  }
};

export const sendVerificationEmail = async (email: string, link: string) => {
  const mailOptions = {
    from: `"PULSE Identity" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `[ACTION REQUIRED] VERIFY YOUR PULSE IDENTITY`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #B9375E; border-radius: 30px; overflow: hidden; background: #000; color: #fff;">
        <div style="padding: 60px 40px; text-align: center; background: linear-gradient(to bottom, #140A0D, #000);">
           <h1 style="font-weight: 900; letter-spacing: -1px; text-transform: uppercase; margin: 0; font-size: 28px;">Identify Yourself.</h1>
           <p style="color: #666; margin-top: 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">Identity Synchronization Required</p>
        </div>
        <div style="padding: 40px; background: #fff; color: #000;">
           <p style="font-size: 16px; line-height: 1.6;">Welcome to the grid. To activate your account and access permit allocations, you must verify your electronic mail address.</p>
           <div style="text-align: center; margin: 40px 0;">
              <a href="${link}" style="background: #B9375E; color: white; padding: 20px 40px; text-decoration: none; border-radius: 15px; font-weight: 900; display: inline-block; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Authorize Account</a>
           </div>
           <p style="color: #999; font-size: 12px; text-align: center;">If the button above does not work, copy this link: <br/> ${link}</p>
        </div>
      </div>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}`);
  } catch (error: any) {
    logger.error(`Verification email failure: ${error.message}`);
  }
};

export const sendPasswordResetEmail = async (email: string, link: string) => {
  const mailOptions = {
    from: `"PULSE Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `[SECURITY] PASSWORD RESET PROTOCOL INITIATED`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: auto; border: 1px solid #B9375E; border-radius: 30px; overflow: hidden; background: #000;">
        <div style="padding: 40px; background: #fff; color: #000;">
           <h2 style="font-weight: 900; text-transform: uppercase;">Reset Protocol</h2>
           <p>A request was made to override your account password. If this was you, click the button below to establish new credentials.</p>
           <div style="text-align: center; margin: 40px 0;">
              <a href="${link}" style="background: #000; color: white; padding: 20px 40px; text-decoration: none; border-radius: 15px; font-weight: 900; display: inline-block; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Reset Password</a>
           </div>
           <p style="color: #B9375E; font-size: 10px; font-weight: 900; text-transform: uppercase;">This request expires in 1 hour.</p>
        </div>
      </div>
    `,
  };

  try {
    await getTransporter().sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
  } catch (error: any) {
    logger.error(`Password reset email failure: ${error.message}`);
  }
};