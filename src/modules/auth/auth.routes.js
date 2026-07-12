// src/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const { signupSuperAdmin, loginUser } = require('./auth.controller');

// Root System Configuration Route
router.post('/register-superadmin', signupSuperAdmin);

// Standard Public Authentication Endpoint
router.post('/login', loginUser);

module.exports = router;