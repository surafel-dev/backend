// student.controller.js
const asyncHandler = require('express-async-handler');
const studentService = require('./student.service');
const Student = require('./student.model');
const { compressTeacherPhoto } = require('../../utils/imageProcessor');
const { sendInvitationEmail } = require('../../utils/email.service'); 

// @desc    Create a student profile with photo, and send access invite link
// @route   POST /api/students
// @access  Private (Admin, Registrar)
const createStudent = asyncHandler(async (req, res) => {
  // Gracefully handles fallback cross-role multi-tenant validation definitions[cite: 9]
  const schoolId = (req.user && req.user.role === 'admin')
    ? req.body.schoolId || req.user.schoolId
    : req.user?.schoolId;

  if (!schoolId) {
    res.status(400);
    throw new Error('Validation Error: A valid schoolId context is required.');
  }

  // Intercept, parse, and process raw multipart buffers if they exist[cite: 9]
  let photoPath = 'default-avatar.png';
  if (req.file) {
    photoPath = await compressTeacherPhoto(req.file.buffer, schoolId); // <-- Compresses image using multi-tenant isolating rules[cite: 9]
  }

  // Safely capture string field mappings from multipart boundaries
  const studentDetails = {
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    gender: req.body.gender,
    email: req.body.email,
    classId: req.body.classId,
    sectionId: req.body.sectionId,
    photo: photoPath, // <-- Assign path to profile options schema block[cite: 9]
    guardian: {
      fatherName: req.body.fatherName,
      motherName: req.body.motherName,
      primaryContactPhone: req.body.primaryContactPhone
    }
  };

  const { student: newStudent, token } = await studentService.createStudentAndInvite(schoolId, studentDetails);

  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invite/${token}`;
  const emailPreviewUrl = await sendInvitationEmail(newStudent.email, inviteLink);

  res.status(201).json({ 
    success: true, 
    message: 'Student record initialized and activation email dispatched via Nodemailer.',
    inviteToken: token,
    emailPreviewUrl,
    data: newStudent 
  });
});

// @desc    Accept invite & complete portal password registration
// @route   POST /api/students/accept-invite/:token
// @access  Public
const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error('Please provide a password to complete registration');
  }

  const newUser = await studentService.acceptStudentInvitation(token, password);

  res.status(200).json({
    success: true,
    message: 'Student portal account activated successfully.',
    user: { id: newUser._id, email: newUser.email, role: newUser.role }
  });
});

// @desc    Get all students within a school context
// @route   GET /api/students
// @access  Private (Admin, Registrar, Teacher)
const getAllStudents = asyncHandler(async (req, res) => {
  const students = await Student.find({ schoolId: req.user.schoolId })
    .populate('userId', 'email role isActive')
    .populate('classId', 'name numericLevel')
    .populate('sectionId', 'name roomNumber');

  res.status(200).json({ success: true, count: students.length, data: students });
});

module.exports = { createStudent, acceptInvite, getAllStudents };