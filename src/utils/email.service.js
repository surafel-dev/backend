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
// passwordInviteLink: frontend page to set a password
const sendInvitationEmail = async (toEmail, passwordInviteLink) => {
  if (!passwordInviteLink) {
    throw new Error('sendInvitationEmail requires a passwordInviteLink');
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

  const info = await transporter.sendMail(mailOptions);

  console.log(`✉️ Fake-sent to ${toEmail} (Ethereal sandbox — nothing actually delivered)`);
  console.log(`🔗 Open this to see/click the real email: ${nodemailer.getTestMessageUrl(info)}`);
  return nodemailer.getTestMessageUrl(info);
};

module.exports = { sendInvitationEmail };