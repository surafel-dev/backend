// email.service.js
const nodemailer = require('nodemailer');

const sendInvitationEmail = async (toEmail, inviteLink) => {

  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, 
    auth: {
      user: testAccount.user, 
      pass: testAccount.pass,
    },
  });

  // 3. Define the email content
  const mailOptions = {
    from: '"School Management System" <no-reply@schoolapp.com>',
    to: toEmail,
    subject: 'You have been invited to join the School Management System',
    html: `
      <h3>Welcome to the team!</h3>
      <p>An administrator has invited you to join the system.</p>
      <p>Please click the link below to set up your account password and activate your profile:</p>
      <a href="${inviteLink}" target="_blank" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; display: inline-block; border-radius: 5px;">Accept Invitation</a>
      <p>This link will expire in 48 hours.</p>
      <hr />
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p>${inviteLink}</p>
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  console.log(`✉️ Email sent to ${toEmail}`);
  console.log(`🔗 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  
  return nodemailer.getTestMessageUrl(info);
};

module.exports = { sendInvitationEmail };