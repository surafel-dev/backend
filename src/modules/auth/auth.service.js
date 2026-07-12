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

module.exports = { 
  registerSuperAdmin, 
  login 
};