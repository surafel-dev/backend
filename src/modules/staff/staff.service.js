const crypto = require('crypto');
const mongoose = require('mongoose');
const Staff = require('./staff.model');
const User = require('../auth/user.model');


const inviteStaff = async (schoolId, staffDetails) => {
  const { email, name, role, phoneNumber, photo, bio, address } = staffDetails || {};
    
  if (!schoolId || !email || !name || !role) {
    const error = new Error('School ID, email, name, and role are required fields.');
    error.statusCode = 400;
    throw error;
  }

  // Check for localized duplicate profile entries within the same school context
  const existingStaff = await Staff.findOne({ schoolId, email }).lean();
  if (existingStaff) {
    const error = new Error('A staff profile with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  const token = crypto.randomBytes(20).toString('hex');
  
  // Set a secure 48-hour expiration timeline
  const expirationTimeline = new Date();
  expirationTimeline.setHours(expirationTimeline.getHours() + 48);

  const newStaff = await Staff.create({
    schoolId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role,
    phoneNumber,
    photo,     // Optional: Compressed local path string from your utility
    address,   // Optional: Formatted object containing { street, city, state, zipCode }
    bio,
    invitationToken: token,
    invitationExpires: expirationTimeline,
    status: 'Pending'
  });

  return { staff: newStaff, token };
};

/**
 * Validates token expiration and executes an atomic transaction to activate the account
 */
const acceptStaffInvitation = async (token, password) => {
  if (!token || !password) {
    const error = new Error('Invitation token and password are required');
    error.statusCode = 400;
    throw error;
  }

  // Enforce validity window using MongoDB date query matching
  const staff = await Staff.findOne({ 
    invitationToken: token, 
    status: 'Pending',
    invitationExpires: { $gt: new Date() }
  });

  if (!staff) {
    const error = new Error('Invitation token is invalid or has expired.');
    error.statusCode = 404;
    throw error;
  }

  // Cross-system infrastructure duplication check on the core login registry
  const existingUser = await User.findOne({ email: staff.email }).lean();
  if (existingUser) {
    const error = new Error('An authentication account already exists for this email.');
    error.statusCode = 400;
    throw error;
  }

  // Initialize secure database atomicity across linked collections
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const newUser = await User.create([{
      name: staff.name,
      schoolId: staff.schoolId,
      email: staff.email,
      password,
      role: staff.role, // Dynamically maps to 'admin', 'hr', or 'registrar'
      isActive: true
    }], { session });

    staff.userId = newUser[0]._id;
    staff.status = 'Active';
    staff.invitationToken = null;
    staff.invitationExpires = null;

    await staff.save({ session });
    await session.commitTransaction();

    return newUser[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  inviteStaff,
  acceptStaffInvitation
};