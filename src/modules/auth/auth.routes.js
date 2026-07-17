// src/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const { signupSuperAdmin, loginUser, logoutUser, forgotPassword, resetPassword, changePassword } = require('./auth.controller');

// Root System Configuration Route
router.post('/register-superadmin', signupSuperAdmin);

// Standard Public Authentication Endpoint
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// Protected Authentication Endpoints
router.put('/change-password', protect, changePassword);

module.exports = router;