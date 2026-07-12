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

module.exports = { 
  signupSuperAdmin, 
  loginUser 
};