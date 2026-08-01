const nodemailer = require('nodemailer');

if (process.env.NODE_ENV === 'production') {
  throw new Error(
    'email.service.js is currently hardcoded to the Ethereal sandbox and cannot send real email. ' +
    'Do not deploy to production until this is swapped for a real SMTP provider (see comment at top of file).'
  );
}

let transporterPromise = null;

const getTransporter = () => {
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  })();

  return transporterPromise;
};

// toEmail: recipient
// links.passwordInviteLink: frontend page to set a password (existing flow)
// links.googleInviteLink:   backend route that kicks off Google OAuth for this invite
const sendInvitationEmail = async (toEmail, { passwordInviteLink, googleInviteLink }) => {
  if (!passwordInviteLink || !googleInviteLink) {
    throw new Error('sendInvitationEmail requires both passwordInviteLink and googleInviteLink');
  }

  const transporter = await getTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"School Management System" <no-reply@schoolapp.com>',
    to: toEmail,
    subject: 'You have been invited to join the School Management System',
    html: `
      <h3>Welcome to the team!</h3>
      <p>An administrator has invited you to join the system. Pick either option to activate your profile:</p>

      <p style="margin: 20px 0;">
        <a href="${googleInviteLink}" target="_blank" style="padding: 10px 20px; background-color: #4285F4; color: white; text-decoration: none; display: inline-block; border-radius: 5px; margin-right: 10px;">Sign in with Google</a>
        <a href="${passwordInviteLink}" target="_blank" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; display: inline-block; border-radius: 5px;">Set a Password Instead</a>
      </p>

      <p><strong>Note:</strong> "Sign in with Google" only works if your Google account uses this exact email address: ${toEmail}.</p>
      <p>Both options expire in 48 hours.</p>
      <hr />
      <p>If the buttons don't work, copy and paste these URLs into your browser:</p>
      <p>Google: ${googleInviteLink}</p>
      <p>Password: ${passwordInviteLink}</p>
    `
  };

  const info = await transporter.sendMail(mailOptions);

  console.log(`✉️ Fake-sent to ${toEmail} (Ethereal sandbox — nothing actually delivered)`);
  console.log(`🔗 Open this to see/click the real email: ${nodemailer.getTestMessageUrl(info)}`);
  return nodemailer.getTestMessageUrl(info);
};

module.exports = { sendInvitationEmail };
