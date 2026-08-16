const crypto = require('crypto');
const mongoose = require('mongoose');
const Student = require('./student.model');
const User = require('../auth/user.model');

const createStudentAndInvite = async (schoolId, studentDetails) => {
  const { email, firstName, middleName, lastName, gender, classId, sectionId, guardian, photo } = studentDetails || {};

  if (!schoolId || !email || !firstName || !lastName) {
    const error = new Error('School ID, student email, first name, and last name are required');
    error.statusCode = 400;
    throw error;
  }

  const existingStudent = await Student.findOne({ schoolId, email }).lean();
  if (existingStudent) {
    const error = new Error('A student profile with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  const token = crypto.randomBytes(20).toString('hex');
  const expirationTimeline = new Date();
  expirationTimeline.setHours(expirationTimeline.getHours() + 48);

  const newStudent = await Student.create({
    schoolId,
    firstName: firstName?.trim(),
    middleName: middleName?.trim(),
    lastName: lastName?.trim(),
    gender,
    email: email.toLowerCase().trim(),
    photo,
    classId,
    sectionId,
    guardian,
    invitationToken: token,
    invitationExpires: expirationTimeline,
    status: 'Pending'
  });

  return { student: newStudent, token };
};

const acceptStudentInvitation = async (token, password) => {
  if (!token || !password) {
    const error = new Error('Invitation token and password are required');
    error.statusCode = 400;
    throw error;
  }

  const student = await Student.findOne({ 
    invitationToken: token, 
    status: 'Pending', 
    invitationExpires: { $gt: new Date() } 
  });

  if (!student) {
    const error = new Error('Invitation token is invalid or has expired.');
    error.statusCode = 404;
    throw error;
  }

  const existingUser = await User.findOne({ email: student.email }).lean();
  if (existingUser) {
    const error = new Error('An authentication account already exists for this email.');
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newUser = await User.create([{
      name: `${student.firstName} ${student.lastName}`,
      schoolId: student.schoolId,
      email: student.email,
      password,
      role: 'student',
      isActive: true
    }], { session });

    student.userId = newUser[0]._id;
    student.status = 'Active';
    student.invitationToken = null;
    student.invitationExpires = null;

    await student.save({ session });
    await session.commitTransaction();

    return newUser[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const updateStudent = async (schoolId, studentId, updateData) => {
  const query = schoolId ? { _id: studentId, schoolId } : { _id: studentId };

  const student = await Student.findOne(query);
  if (!student) {
    const error = new Error('Student record not found.');
    error.statusCode = 404;
    throw error;
  }

  // Handle nested object updates safely
  if (updateData.guardian) {
    updateData.guardian = { ...student.guardian, ...updateData.guardian };
  }

  const updatedStudent = await Student.findByIdAndUpdate(
    studentId,
    { $set: updateData },
    { new: true, runValidators: true }
  )
    .populate('userId', 'email role isActive')
    .populate('classId', 'name numericLevel')
    .populate('sectionId', 'name roomNumber');

  return updatedStudent;
};

const deleteStudent = async (schoolId, studentId) => {
  const query = schoolId ? { _id: studentId, schoolId } : { _id: studentId };

  const student = await Student.findOne(query);
  if (!student) {
    const error = new Error('Student record not found.');
    error.statusCode = 404;
    throw error;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // If student has an associated User account, delete it as well
    if (student.userId) {
      await User.findByIdAndDelete(student.userId, { session });
    }

    await Student.findByIdAndDelete(studentId, { session });
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  createStudentAndInvite,
  acceptStudentInvitation,
  updateStudent,
  deleteStudent
};