const asyncHandler = require('express-async-handler');
const teacherService = require('./teacher.service');
const { compressTeacherPhoto } = require('../../utils/imageProcessor');
const { sendInvitationEmail } = require('../../utils/email.service'); 

const inviteTeacher = asyncHandler(async (req, res) => {
  const { name, email, phoneNumber, bio, street, city, state, zipCode } = req.body; //[cite: 7]

  const schoolId = (req.user && req.user.role === 'admin')
    ? req.body.schoolId //[cite: 7]
    : req.user?.schoolId; //[cite: 7]

  if (!schoolId) { //[cite: 7]
    res.status(400); //[cite: 7]
    throw new Error('Validation Error: A valid schoolId context is required.'); //[cite: 7]
  }

  if (!name || !email) { //[cite: 7]
    res.status(400); //[cite: 7]
    throw new Error('Please provide both a name and an email address'); //[cite: 7]
  }

  let photoPath = 'default-avatar.png'; //[cite: 7]
  if (req.file) { //[cite: 7]
    photoPath = await compressTeacherPhoto(req.file.buffer, schoolId); //[cite: 7]
  }

  const teacherDetails = { //[cite: 7]
    name, //[cite: 7]
    email, //[cite: 7]
    phoneNumber, //[cite: 7]
    photo: photoPath, //[cite: 7]
    bio, //[cite: 7]
    address: { street, city, state, zipCode } //[cite: 7]
  }; //[cite: 7]

  const { teacher: newTeacher, token } = await teacherService.inviteTeacher(schoolId, teacherDetails); //[cite: 7]

  // <-- ADDED EMAIL FLOW LAYER[cite: 2]
  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite/${token}`; //[cite: 2]
  const emailPreviewUrl = await sendInvitationEmail(newTeacher.email, inviteLink); //[cite: 2, 11]

  res.status(201).json({
    success: true,
    message: 'Teacher invitation created successfully and email notification sent.', //[cite: 7]
    inviteToken: token, //[cite: 7]
    emailPreviewUrl, // Backed via ethereal sandbox link out for debugging[cite: 2]
    teacher: newTeacher //[cite: 7]
  });
});

// acceptInvite and assignClassSubject remain exactly as you had them...
const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.params; //[cite: 7]
  const { password } = req.body; //[cite: 7]

  if (!password) { //[cite: 7]
    res.status(400); //[cite: 7]
    throw new Error('Please provide a password to complete registration'); //[cite: 7]
  }

  const newUser = await teacherService.acceptTeacherInvitation(token, password); //[cite: 7]

  res.status(200).json({
    success: true,
    message: 'Account activated successfully. You can now log in.', //[cite: 7]
    user: { id: newUser._id, email: newUser.email, role: newUser.role } //[cite: 7]
  });
});

const assignClassSubject = asyncHandler(async (req, res) => {
  const { classId, subjectId } = req.body;
  const teacherId = req.params.id;
  const schoolId = req.user.schoolId;

  if (!classId || !subjectId) {
    res.status(400);
    throw new Error('Please provide both classId and subjectId');
  }

  const updatedTeacher = await teacherService.allocateClassAndSubject(
    schoolId,
    teacherId,
    classId,
    subjectId
  );

  res.status(200).json({
    success: true,
    message: 'Assignment updated successfully',
    assignments: updatedTeacher.assignments
  });
});

module.exports = {
  inviteTeacher,
  acceptInvite,
  assignClassSubject
};