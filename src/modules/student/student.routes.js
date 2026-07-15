// student.routes.js
const express = require('express');
const router = express.Router();
const { getAllStudents, createStudent, acceptInvite } = require('./student.controller');
const { uploadPhoto } = require('../../utils/imageProcessor');
const { queryHandler } = require('../../middleware/queryHandler');
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// Public route for students claiming accounts
router.post('/accept-invite/:token', acceptInvite);

// Administrative roster controls
router.route('/')
  .get(protect, restrictTo('admin', 'registrar', 'teacher'), queryHandler(Student, 'classId'), getAllStudents)
  // Mounted photo multipart intercept chain middleware here[cite: 11]
  .post(protect, restrictTo('admin', 'registrar'), uploadPhoto, createStudent);

module.exports = router;