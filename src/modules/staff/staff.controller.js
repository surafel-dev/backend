const asyncHandler = require('express-async-handler');
const staffService = require('./staff.service');
const { compressTeacherPhoto } = require('../../utils/imageProcessor');
const { sendInvitationEmail } = require('../../utils/email.service'); 

// @desc    Invite a new administrative staff member (Admin, HR, Registrar)
const inviteStaff = asyncHandler(async (req, res) => {
  const { name, email, role, phoneNumber, bio, street, city, state, zipCode } = req.body; //[cite: 5]

  const schoolId = (req.user && req.user.role === 'super-admin') //[cite: 5]
    ? req.body.schoolId //[cite: 5]
    : req.user?.schoolId; //[cite: 5]

  if (!schoolId) { //[cite: 5]
    res.status(400); //[cite: 5]
    throw new Error('Validation Error: A valid school context is required.'); //[cite: 5]
  }

  if (!name || !email || !role) { //[cite: 5]
    res.status(400); //[cite: 5]
    throw new Error('Please provide name, email, and target role.'); //[cite: 5]
  }

  let photoPath = 'default-avatar.png'; //[cite: 5]
  if (req.file) { //[cite: 5]
    photoPath = await compressTeacherPhoto(req.file.buffer, schoolId); //[cite: 5]
  }

  const staffDetails = { //[cite: 5]
    name, //[cite: 5]
    email, //[cite: 5]
    role, //[cite: 5]
    phoneNumber, //[cite: 5]
    photo: photoPath, //[cite: 5]
    bio, //[cite: 5]
    address: { street, city, state, zipCode } //[cite: 5]
  }; //[cite: 5]
  
  const { staff: newStaff, token } = await staffService.inviteStaff(schoolId, staffDetails); //[cite: 5]

  // <-- ADDED EMAIL FLOW LAYER
  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite/${token}`; //[cite: 2]
  const emailPreviewUrl = await sendInvitationEmail(newStaff.email, inviteLink); //[cite: 2, 11]

  res.status(201).json({
    success: true,
    message: `${role.toUpperCase()} invitation created and email dispatched. Link expires in 48 hours.`, //[cite: 5]
    inviteToken: token, //[cite: 5]
    emailPreviewUrl, // Displays the ethereal test environment URL directly in Postman[cite: 2]
    staff: newStaff //[cite: 5]
  });
});

// acceptInvite remains exactly the same as you had it...
const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.params; //[cite: 5]
  const { password } = req.body; //[cite: 5]

  if (!password) { //[cite: 5]
    res.status(400); //[cite: 5]
    throw new Error('Please provide a password to finalize your profile setup.'); //[cite: 5]
  }

  const newUser = await staffService.acceptStaffInvitation(token, password); //[cite: 5]

  res.status(200).json({
    success: true,
    message: 'Staff account activated successfully. You can now log in.', //[cite: 5]
    user: { id: newUser._id, email: newUser.email, role: newUser.role } //[cite: 5]
  });
});

module.exports = { inviteStaff, acceptInvite }; //[cite: 5]
  