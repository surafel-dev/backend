const asyncHandler = require('express-async-handler');
const teacherService = require('./teacher.service');
const School = require('../school/school.model');
const { compressTeacherPhoto } = require('../../utils/imageProcessor');
const { sendInvitationEmail } = require('../../utils/email.service');

// req.schoolId is resolved once, upstream, by extractSchoolId + verifySchoolAccess
// (see teacher.routes.js). Nothing in this file re-derives it.

const inviteTeacher = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId;
  const { name, email, phoneNumber, bio, street, city, state, zipCode } = req.body;

  if (!name || !email) {
    res.status(400);
    throw new Error('Please provide both a name and an email address');
  }

  // Don't trust the resolved schoolId blindly — confirm the school actually exists.
  const schoolExists = await School.exists({ _id: schoolId });
  if (!schoolExists) {
    res.status(404);
    throw new Error('The specified school could not be found.');
  }

  let photoPath = 'default-avatar.png';
  if (req.file) {
    photoPath = await compressTeacherPhoto(req.file.buffer, schoolId);
  }

  const teacherDetails = {
    name,
    email,
    phoneNumber,
    photo: photoPath,
    bio,
    address: { street, city, state, zipCode }
  };

  const { teacher: newTeacher, token } = await teacherService.inviteTeacher(schoolId, teacherDetails);

  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3039'}/accept-invite/teacher/${token}`;

  // Same reasoning as student invites: bounded by email.service.js's own
  // timeouts now, and a genuine send failure is logged rather than turning
  // a successful teacher invitation into a 500. emailPreviewUrl stays in
  // the response since teacherSlice.js depends on it for the dev preview
  // link — it'll just be null if the send failed or timed out.
  let emailPreviewUrl = null;
  try {
    emailPreviewUrl = await sendInvitationEmail(newTeacher.email, inviteLink);
  } catch (err) {
    console.error(`✉️  Failed to send invitation email to ${newTeacher.email}:`, err.message);
  }

  res.status(201).json({
    success: true,
    message: 'Teacher invitation created successfully.',
    inviteToken: token,
    emailPreviewUrl,
    teacher: newTeacher
  });
});

const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error('Please provide a password to complete registration');
  }

  const newUser = await teacherService.acceptTeacherInvitation(token, password);

  res.status(200).json({
    success: true,
    message: 'Account activated successfully. You can now log in.',
    user: { id: newUser._id, email: newUser.email, role: newUser.role }
  });
});

const assignClassSubject = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId;
  const { classId, subjectId } = req.body;
  const teacherId = req.params.id;

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

const getAllTeachers = asyncHandler(async (req, res) => {
  const teachers = await teacherService.getAllTeachers(req.schoolId);

  res.status(200).json({
    success: true,
    count: teachers.length,
    teachers
  });
});

const getAcceptedTeachers = asyncHandler(async (req, res) => {
  const teachers = await teacherService.getAcceptedTeachers(req.schoolId);

  res.status(200).json({
    success: true,
    count: teachers.length,
    teachers
  });
});

const revokeAccess = asyncHandler(async (req, res) => {
  const teacherId = req.params.id;

  const teacher = await teacherService.revokeTeacherAccess(req.schoolId, teacherId);

  res.status(200).json({
    success: true,
    message: 'Teacher access revoked successfully',
    teacher: { id: teacher._id, email: teacher.email, status: teacher.status }
  });
});

const updateTeacher = asyncHandler(async (req, res) => {
  const teacherId = req.params.id;
  const { name, email, phoneNumber, bio, street, city, state, zipCode } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (bio !== undefined) updateData.bio = bio;


  const addressUpdates = {};
  if (street !== undefined) addressUpdates.street = street;
  if (city !== undefined) addressUpdates.city = city;
  if (state !== undefined) addressUpdates.state = state;
  if (zipCode !== undefined) addressUpdates.zipCode = zipCode;
  if (Object.keys(addressUpdates).length > 0) {
    updateData.address = addressUpdates;
  }

  if (req.file) {
    updateData.photo = await compressTeacherPhoto(req.file.buffer, req.schoolId);
  }

  const updatedTeacher = await teacherService.updateTeacher(req.schoolId, teacherId, updateData);

  res.status(200).json({
    success: true,
    message: 'Teacher record updated successfully.',
    data: updatedTeacher
  });
});

module.exports = {
  getAllTeachers,
  getAcceptedTeachers,
  inviteTeacher,
  acceptInvite,
  assignClassSubject,
  revokeAccess,
  updateTeacher
};