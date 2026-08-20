const nodemailer = require('nodemailer');

// ----------------------------------------------------------------------
// DEV MODE (default): no SMTP server involved at all — not Ethereal
// (needs internet), not Maildev (needs a second local process running).
// The invite link is already generated before this function is even
// called, so in development we just log it straight to the console and
// return it, instead of routing it through email infrastructure that has
// nothing to do with what you're actually trying to test.
//
// PRODUCTION: set EMAIL_TRANSPORT=smtp and provide SMTP_HOST / SMTP_PORT /
// SMTP_USER / SMTP_PASS (or swap this block for your provider's SDK —
// SendGrid, Postmark, SES, etc. all work fine here). The guard below stops
// this file from silently no-op'ing in production and pretending emails
// went out when they didn't.
// ----------------------------------------------------------------------

const useRealSmtp = process.env.EMAIL_TRANSPORT === 'smtp';

if (process.env.NODE_ENV === 'production' && !useRealSmtp) {
  throw new Error(
    'email.service.js has no real email transport configured. ' +
    'Set EMAIL_TRANSPORT=smtp and SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS before deploying to production.'
  );
}

let transporterPromise = null;

const getTransporter = () => {
  if (!useRealSmtp) return null; // dev mode never needs a transporter

  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () =>
    nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000
    })
  )();

  transporterPromise.catch(() => {
    transporterPromise = null;
  });

  return transporterPromise;
};

// toEmail: recipient
// passwordInviteLink: frontend page to set a password
const sendInvitationEmail = async (toEmail, passwordInviteLink) => {
  if (!passwordInviteLink) {
    throw new Error('sendInvitationEmail requires a passwordInviteLink');
  }

  if (!useRealSmtp) {
    // Nothing to send, nothing to fail. Just surface the link.
    console.log(`✉️  [DEV] Invite for ${toEmail}: ${passwordInviteLink}`);
    return passwordInviteLink;
  }

  const transporter = await getTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"School Management System" <no-reply@schoolapp.com>',
    to: toEmail,
    subject: 'You have been invited to join the School Management System',
    html: `
      <h3>Welcome to the team!</h3>
      <p>An administrator has invited you to join the system. Click below to activate your profile:</p>

      <p style="margin: 20px 0;">
        <a href="${passwordInviteLink}" target="_blank" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; display: inline-block; border-radius: 5px;">Set Your Password</a>
      </p>

      <p>This link expires in 48 hours.</p>
      <hr />
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p>${passwordInviteLink}</p>
    `
  };

  await transporter.sendMail(mailOptions);

  console.log(`✉️  Sent to ${toEmail} via ${process.env.SMTP_HOST}`);
  return null; // no preview URL for real SMTP — it actually went out
};

module.exports = { sendInvitationEmail };