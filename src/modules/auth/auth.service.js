// src/modules/auth/auth.service.js
const User = require('./user.model'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, schoolId: user.schoolId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const registerSuperAdmin = async (adminData) => {
  const userExists = await User.findOne({ email: adminData.email.toLowerCase().trim() });
  if (userExists) throw new Error('A user with this email already exists.');

  const superAdmin = await User.create({
    name: adminData.name.trim(),
    email: adminData.email.toLowerCase().trim(),
    password: adminData.password,
    role: 'super-admin',
    schoolId: null, // Super-Admins occupy the platform root layer
    isActive: true 
  });

  return {
    id: superAdmin._id,
    name: superAdmin.name,
    email: superAdmin.email,
    role: superAdmin.role,
    token: generateToken(superAdmin)
  };
};

const login = async (email, password) => {
  // Pull core auth data along with hidden password field
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid email or password');
  }

  if (!user.isActive) {
    throw new Error('Account inactive. You must claim your profile invitation email first.');
  }

  return { 
    id: user._id, 
    name: user.name,
    email: user.email, 
    role: user.role, 
    schoolId: user.schoolId,
    token: generateToken(user) 
  };
};

// Generate a short-lived token for password resets (expires in 15 minutes)
const generateResetToken = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw new Error('No account found with that email address.');
  }

  // Signs a specialized payload containing only user ID and an isolated secret key prefix
  return jwt.sign(
    { id: user._id }, 
    process.env.JWT_SECRET, 
    { expiresIn: '15m' }
  );
};

// Reset password using the verified temporary token
const resetPasswordWithToken = async (token, newPassword) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new Error('User no longer exists.');
    }

    user.password = newPassword;
    await user.save(); // Triggers the pre-save password hashing hook automatically
  } catch (error) {
    throw new Error('Password reset token is invalid or has expired.');
  }
};

// Verify old credentials and replace with a fresh password
const updateUserPassword = async (userId, currentPassword, newPassword) => {
  // Must explicitly select '+password' because it's hidden by default in your schema
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new Error('User not found.');
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    throw new Error('The current password you entered is incorrect.');
  }

  user.password = newPassword;
  await user.save(); // Triggers the pre-save password hashing hook automatically
};

module.exports = { 
  registerSuperAdmin, 
  login, 
  generateResetToken, 
  resetPasswordWithToken, 
  updateUserPassword 
};