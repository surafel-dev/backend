// student.routes.js
const express = require('express');
const router = express.Router();
const { getAllStudents, createStudent, acceptInvite } = require('./student.controller');
const { uploadPhoto } = require('../../utils/imageProcessor'); // <-- IMAGEMAGICK / MULTER WRAPPER INJECTION[cite: 11]
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// Public route for students claiming accounts
router.post('/accept-invite/:token', acceptInvite);

// Administrative roster controls
router.route('/')
  .get(protect, restrictTo('admin', 'registrar', 'teacher'), getAllStudents)
  // Mounted photo multipart intercept chain middleware here[cite: 11]
  .post(protect, restrictTo('admin', 'registrar'), uploadPhoto, createStudent);

module.exports = router;