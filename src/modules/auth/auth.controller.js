// src/modules/auth/auth.controller.js
const asyncHandler = require('express-async-handler');
const authService = require('./auth.service');

// @desc    Register a global root Platform Owner
// @route   POST /api/auth/register-superadmin
// @access  Public (Or locked down by system variables)
const signupSuperAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email, and password are required fields.');
  }

  const result = await authService.registerSuperAdmin({ name, email, password });
  
  res.status(201).json({ 
    success: true, 
    message: 'Super-Admin account initialized successfully.',
    data: result 
  });
});

// @desc    Universal Login Route for all application accounts
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please provide both email and password.');
  }

  const result = await authService.login(email, password);
  
  res.status(200).json({ 
    success: true, 
    message: 'Login successful.',
    data: result 
  });
});

// @desc    Logout user / Clear session or cookies
// @route   POST /api/auth/logout
// @access  Public (or Protected)
const logoutUser = asyncHandler(async (req, res) => {
  // If you decide to use HTTP-only cookies later, clear them here:
  // res.cookie('token', '', { httpOnly: true, expires: new Date(0) });

  res.status(200).json({ 
    success: true, 
    message: 'Logged out successfully. Securely discard your token on the client side.' 
  });
});

// @desc    Initiate password reset via email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('Please provide an email address.');
  }

  const resetToken = await authService.generateResetToken(email);

  // NOTE: Integrate your email provider here (Nodemailer, SendGrid, etc.)
  // For now, we return the token in the response so you can test it directly in Postman
  res.status(200).json({
    success: true,
    message: 'Password reset link generated.',
    resetToken: resetToken // Hide this once email transporter is configured
  });
});

// @desc    Reset password using token from email
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    res.status(400);
    throw new Error('Please provide a new password.');
  }

  await authService.resetPasswordWithToken(token, newPassword);

  res.status(200).json({
    success: true,
    message: 'Password has been reset successfully.'
  });
});

// @desc    Change password while logged in
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id; // Assumes req.user is populated by your protect middleware

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('Both current and new passwords are required.');
  }

  await authService.updateUserPassword(userId, currentPassword, newPassword);

  res.status(200).json({
    success: true,
    message: 'Password updated successfully.'
  });
});

module.exports = { 
  signupSuperAdmin, 
  loginUser, 
  logoutUser, 
  forgotPassword, 
  resetPassword, 
  changePassword 
};