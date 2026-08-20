const asyncHandler = require('express-async-handler');
const studentService = require('./student.service');
const Student = require('./student.model');
const { APIError } = require('../../middleware/authMiddleware');
const { compressTeacherPhoto } = require('../../utils/imageProcessor');
const { sendInvitationEmail } = require('../../utils/email.service'); 

// @desc    Create a student profile with photo, and send access invite link
// @route   POST /api/students
// @access  Private (Admin, Registrar, Super Admin)
const createStudent = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId;

  let photoPath = 'default-avatar.png';
  if (req.file) {
    photoPath = await compressTeacherPhoto(req.file.buffer, schoolId);
  }

  const studentDetails = {
    firstName: req.body.firstName,
    middleName: req.body.middleName,
    lastName: req.body.lastName,
    gender: req.body.gender,
    email: req.body.email,
    classId: req.body.classId,
    sectionId: req.body.sectionId,
    photo: photoPath,
    guardian: {
      fatherName: req.body.fatherName,
      motherName: req.body.motherName,
      primaryContactPhone: req.body.primaryContactPhone
    }
  };

  const { student: newStudent, token } = await studentService.createStudentAndInvite(schoolId, studentDetails);

  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3039'}/accept-invite/student/${token}`;

  // The student record is already committed by this point. Email delivery
  // is now bounded by email.service.js's own connection/greeting/socket
  // timeouts, so a broken SMTP path fails within ~10-15s instead of
  // hanging indefinitely — but we still don't want a genuinely failed
  // send (vs. just a slow one) to turn a successful student creation into
  // a 500 for the caller, so failures are caught and logged instead of
  // thrown.
  let emailPreviewUrl = null;
  try {
    emailPreviewUrl = await sendInvitationEmail(newStudent.email, inviteLink);
  } catch (err) {
    console.error(`✉️  Failed to send invitation email to ${newStudent.email}:`, err.message);
  }

  res.status(201).json({ 
    success: true, 
    message: 'Student record initialized successfully.',
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
    throw new APIError('Please provide a password to complete registration.', 400, 'INVALID_INPUT');
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
// @access  Private (Admin, Registrar, Teacher, Super Admin)
const getAllStudents = asyncHandler(async (req, res) => {
  const filter = req.schoolId ? { schoolId: req.schoolId } : {};

  const students = await Student.find(filter)
    .populate('userId', 'email role isActive')
    .populate('classId', 'name numericLevel')
    .populate('sectionId', 'name roomNumber');

  res.status(200).json({ success: true, count: students.length, data: students });
});

// @desc    Update a student profile
// @route   PUT /api/students/:studentId
// @access  Private (Admin, Registrar, Super Admin)
const updateStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const {
    firstName,
    middleName,
    lastName,
    gender,
    email,
    classId,
    sectionId,
    fatherName,
    motherName,
    primaryContactPhone,
  } = req.body;

  // Explicit whitelist — req.body may also carry schoolId (sent by the
  // frontend so extractSchoolId can authorize the request) and possibly
  // other fields that were never meant to be directly writable here
  // (status, invitationToken, userId, etc.). Only these known,
  // student-editable fields are ever passed through to the service layer.
  const updateData = {
    ...(firstName !== undefined && { firstName }),
    ...(middleName !== undefined && { middleName }),
    ...(lastName !== undefined && { lastName }),
    ...(gender !== undefined && { gender }),
    ...(email !== undefined && { email }),
    ...(classId !== undefined && { classId }),
    ...(sectionId !== undefined && { sectionId }),
  };

  // The Student schema nests these under `guardian`, but the edit form
  // sends them flat — reshape here the same way createStudent already
  // does, so studentService.updateStudent's `{ ...student.guardian,
  // ...updateData.guardian }` merge actually has something to merge.
  if (fatherName !== undefined || motherName !== undefined || primaryContactPhone !== undefined) {
    updateData.guardian = {
      ...(fatherName !== undefined && { fatherName }),
      ...(motherName !== undefined && { motherName }),
      ...(primaryContactPhone !== undefined && { primaryContactPhone }),
    };
  }

  if (req.file) {
    updateData.photo = await compressTeacherPhoto(req.file.buffer, req.schoolId);
  }

  const updatedStudent = await studentService.updateStudent(req.schoolId, studentId, updateData);

  res.status(200).json({
    success: true,
    message: 'Student record updated successfully.',
    data: updatedStudent
  });
});

// @desc    Delete a student record and user account
// @route   DELETE /api/students/:studentId
// @access  Private (Admin, Registrar, Super Admin)
const deleteStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  await studentService.deleteStudent(req.schoolId, studentId);

  res.status(200).json({
    success: true,
    message: 'Student record and associated user account deleted successfully.'
  });
});

module.exports = { 
  createStudent, 
  acceptInvite, 
  getAllStudents,
  updateStudent,
  deleteStudent
};