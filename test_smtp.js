const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

console.log(`Connecting as: ${emailUser}`);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

console.log("Verifying connection to Gmail SMTP...");

transporter.verify()
  .then(() => {
    console.log("✅ Configuration Validated! NodeMailer has successful access to Gmail.");
    console.log(`Sending transmission to: ${emailUser}...`);
    
    return transporter.sendMail({
      from: `"PULSE Terminal" <${emailUser}>`,
      to: emailUser, // Send to self to verify
      subject: "[PULSE] SMTP Uplink Successful",
      text: "Transmission active. Email system is fully functional.",
      html: `
        <div style="font-family: Inter, sans-serif; text-align: center; padding: 50px; background: #0a0a0a; color: #fff; border-radius: 20px; border: 1px solid #333;">
            <h1 style="color: #10b981; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">Secured Uplink Established</h1>
            <p style="color: rgba(255,255,255,0.7); font-size: 16px;">This confirms your backend NodeMailer transport is successfully authenticated and functioning properly using the correct app password.</p>
            <div style="margin-top: 30px; font-family: monospace; color: #888;">
                [STATUS: ONLINE]<br/>
                [PROTOCOL: NODEMAILER // GMAIL AUTH]
            </div>
        </div>
      `
    });
  })
  .then((info) => {
    console.log("📧 Test email dispatched successfully!", info.messageId);
    console.log("Check your inbox to verify receipt.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Transmission Failed:", err.message);
    process.exit(1);
  });
