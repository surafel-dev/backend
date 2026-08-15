const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const teacherService = require('./teacher.service');
const School = require('../school/school.model');
const { compressTeacherPhoto } = require('../../utils/imageProcessor');
const { sendInvitationEmail } = require('../../utils/email.service'); 

const inviteTeacher = asyncHandler(async (req, res) => {
  const { name, email, phoneNumber, bio, street, city, state, zipCode } = req.body;

  let schoolId;

  if (req.user?.role === 'super-admin') {
    // Super-admin isn't tied to one school — they must explicitly choose one.
    schoolId = req.body.schoolId;

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      res.status(400);
      throw new Error('Validation Error: A valid schoolId must be provided.');
    }

    // Don't trust the client blindly — confirm the school actually exists.
    const schoolExists = await School.exists({ _id: schoolId });
    if (!schoolExists) {
      res.status(404);
      throw new Error('The specified school could not be found.');
    }
  } else {
    // Every other role (admin, hr, etc.) is hard-pinned to their own school.
    // req.body.schoolId is intentionally ignored here — trusting it would let
    // a compromised/malicious admin invite a "teacher" into a school they
    // don't manage.
    schoolId = req.user?.schoolId;
  }

  if (!schoolId) {
    res.status(400);
    throw new Error('Validation Error: A valid schoolId context is required.');
  }

  if (!name || !email) {
    res.status(400);
    throw new Error('Please provide both a name and an email address');
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

  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3039'}/accept-invite/${token}`;
  const emailPreviewUrl = await sendInvitationEmail(newTeacher.email, inviteLink);

  res.status(201).json({
    success: true,
    message: 'Teacher invitation created successfully and email notification sent.',
    inviteToken: token,
    emailPreviewUrl,
    teacher: newTeacher
  });
});

// acceptInvite remains exactly as you had it...
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

  let schoolId;

  if (req.user?.role === 'super-admin') {
    // Super-admin isn't tied to one school — they must explicitly choose one.
    schoolId = req.body.schoolId;

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      res.status(400);
      throw new Error('Validation Error: A valid schoolId must be provided.');
    }
  } else {
    schoolId = req.user?.schoolId;
  }

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

const revokeAccess = asyncHandler(async (req, res) => {
  const teacherId = req.params.id;

  let schoolId;

  if (req.user?.role === 'super-admin') {
    // Super-admin isn't tied to one school — they must explicitly choose one.
    schoolId = req.body.schoolId;

    if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
      res.status(400);
      throw new Error('Validation Error: A valid schoolId must be provided.');
    }
  } else {
    schoolId = req.user?.schoolId;
  }

  const teacher = await teacherService.revokeTeacherAccess(schoolId, teacherId);

  res.status(200).json({
    success: true,
    message: 'Teacher access revoked successfully',
    teacher: { id: teacher._id, email: teacher.email, status: teacher.status }
  });
});

const getAllTeachers = asyncHandler(async (req, res) => {
  let schoolId;

  if (req.user?.role === 'super-admin') {
    // Super-admin can optionally filter by a query parameter 'schoolId'
    schoolId = req.query.schoolId;
  } else {
    // Other roles are locked to their own school context
    schoolId = req.user?.schoolId;
  }

  const teachers = await teacherService.getAllTeachers(schoolId);

  res.status(200).json({
    success: true,
    count: teachers.length,
    teachers
  });
});

const getAcceptedTeachers = asyncHandler(async (req, res) => {
  let schoolId;

  if (req.user?.role === 'super-admin') {
    // Super-admin can optionally filter by a query parameter 'schoolId'
    schoolId = req.query.schoolId;
  } else {
    // Other roles are locked to their own school context
    schoolId = req.user?.schoolId;
  }

  const teachers = await teacherService.getAcceptedTeachers(schoolId);

  res.status(200).json({
    success: true,
    count: teachers.length,
    teachers
  });
});

module.exports = {
  getAllTeachers,
  getAcceptedTeachers,
  inviteTeacher,
  acceptInvite,
  assignClassSubject,
  revokeAccess
};