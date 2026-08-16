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

  let updateData = { ...req.body };

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