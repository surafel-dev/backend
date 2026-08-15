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

  try {

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
}  catch (err) {
  if (err.code === 11000) {
      const error = new Error('A teacher profile with this email already exists.');
      error.statusCode = 400;
      throw error;
  } 
  throw err;
 }
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
    teacher.invitationToken = null; 
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

const revokeTeacherAccess = async (schoolId, teacherId) => {
  if (!schoolId || !teacherId) {
    const error = new Error('School ID and teacher ID are required');
    error.statusCode = 400;
    throw error;
  }

  const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
  if (!teacher) {
    const error = new Error('Teacher profile not found');
    error.statusCode = 404;
    throw error;
  }

  if (teacher.status === 'Pending') {
    const error = new Error('This teacher has not accepted an invitation yet, so there is no access to revoke.');
    error.statusCode = 400;
    throw error;
  }

  if (teacher.status === 'Revoked') {
    const error = new Error('This teacher\'s access has already been revoked.');
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (teacher.userId) {
      await User.findByIdAndUpdate(
        teacher.userId,
        { isActive: false },
        { session }
      );
    }

    teacher.status = 'Revoked';
    await teacher.save({ session });

    await session.commitTransaction();
    return teacher;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getAllTeachers = async (schoolId) => {
  let filter = {};

  // If a schoolId is supplied (non super-admin cases), restrict results to that school
  if (schoolId) {
    filter.schoolId = schoolId;
  }

  const teachers = await Teacher.find(filter)
    .populate('assignments.classId', 'name')
    .populate('assignments.subjectId', 'name')
    .lean();

  return teachers;
};

// Only teachers who have accepted their invitation (status flips to 'Active'
// in acceptTeacherInvitation once they set a password and get a linked userId).
const getAcceptedTeachers = async (schoolId) => {
  let filter = { status: 'Active' };

  // If a schoolId is supplied (non super-admin cases), restrict results to that school
  if (schoolId) {
    filter.schoolId = schoolId;
  }

  const teachers = await Teacher.find(filter)
    .populate('assignments.classId', 'name')
    .populate('assignments.subjectId', 'name')
    .lean();

  return teachers;
};

module.exports = {
  inviteTeacher,
  acceptTeacherInvitation,
  allocateClassAndSubject,
  revokeTeacherAccess,
  getAllTeachers,
  getAcceptedTeachers
};