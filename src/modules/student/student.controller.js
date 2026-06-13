const asyncHandler = require('express-async-handler');
const Student = require('./student.model'); 

const getAllStudents = asyncHandler(async (req, res) => {
  // Scoped to secure school boundaries
  const students = await Student.find({ school: req.user.schoolId }).populate('user', 'email');
  res.status(200).json({ success: true, count: students.length, data: students });
});

const createStudent = asyncHandler(async (req, res) => {
  const studentData = { ...req.body, school: req.user.schoolId };
  const newStudent = await Student.create(studentData);
  res.status(201).json({ success: true, data: newStudent });
});

const getDetailedStudentProfile = asyncHandler(async (req, res) => {
  const studentData = await Student.findById(req.params.id)
    .populate('user', 'email role isActive') // Fetches login credentials context
    .populate('school', 'name schoolCode');   // Fetches specific school branch context

  if (!studentData) {
    res.status(404);
    throw new Error('Student profile record missing');
  }

  res.status(200).json({ success: true, data: studentData });
});

module.exports = { getAllStudents, createStudent, getDetailedStudentProfile };