const crypto = require('crypto');
const mongoose = require('mongoose');
const Teacher = require('./teacher.model');
const User = require('../auth/user.model');

const inviteTeacher = async (schoolId, teacherDetails) => {
  const { email, name, phoneNumber, photo, address, bio } = teacherDetails || {};

  if (!schoolId || !email || !name) {
    const error = new Error('School ID, email, and name are required');
    error.statusCode = 400;
    throw error;
  }

  const existingTeacher = await Teacher.findOne({ schoolId, email }).lean();
  if (existingTeacher) {
    const error = new Error('A teacher profile with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  const token = crypto.randomBytes(20).toString('hex');

  const expirationTimeline = new Date();
  expirationTimeline.setHours(expirationTimeline.getHours() + 48);

  const newTeacher = await Teacher.create({
    schoolId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phoneNumber,
    photo,     
    address,   
    bio,
    invitationToken: token, 
    invitationExpires: expirationTimeline,
    status: 'Pending'
  });

  return { teacher: newTeacher, token };
};

const acceptTeacherInvitation = async (token, password) => {
  if (!token || !password) {
    const error = new Error('Invitation token and password are required');
    error.statusCode = 400;
    throw error;
  }

  // <-- FIX: Changed query from inviteToken to invitationToken
  const teacher = await Teacher.findOne({ 
    invitationToken: token, 
    status: 'Pending', 
    invitationExpires: { $gt: new Date() } 
  });

  if (!teacher) {
    const error = new Error('Invitation token is invalid or has expired.');
    error.statusCode = 404;
    throw error;
  }

  const existingUser = await User.findOne({ email: teacher.email }).lean();
  if (existingUser) {
    const error = new Error('An authentication account already exists for this email.');
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newUser = await User.create([{
      name: teacher.name, 
      schoolId: teacher.schoolId,
      email: teacher.email,
      password,
      role: 'teacher',
      isActive: true
    }], { session });

    teacher.userId = newUser[0]._id;
    teacher.status = 'Active';
    teacher.invitationToken = null; // <-- FIX: Clear the correct field
    teacher.invitationExpires = null; 

    await teacher.save({ session: session });
    await session.commitTransaction();

    return newUser[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
const allocateClassAndSubject = async (schoolId, teacherId, classId, subjectId) => {
  if (!schoolId || !teacherId || !classId || !subjectId) {
    const error = new Error('School ID, teacher ID, class ID, and subject ID are required');
    error.statusCode = 400;
    throw error;
  }

  const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
  if (!teacher) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }

  // Active validation boundary tracking check
  const alreadyAssigned = teacher.assignments.some((assign) =>
    assign.classId.toString() === classId.toString() &&
    assign.subjectId.toString() === subjectId.toString()
  );

  if (alreadyAssigned) {
    const error = new Error('This teacher is already assigned to this subject in this class');
    error.statusCode = 400;
    throw error;
  }

  teacher.assignments.push({ classId, subjectId });
  await teacher.save(); // Relying on model schema-level hook modifications to keep arrays unique

  return teacher;
};

module.exports = {
  inviteTeacher,
  acceptTeacherInvitation,
  allocateClassAndSubject
};