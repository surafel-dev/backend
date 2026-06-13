const express = require('express');
const router = express.Router();
const { getAllStudents, createStudent } = require('./student.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, restrictTo('admin', 'teacher'), getAllStudents)
  .post(protect, restrictTo('admin'), createStudent);


module.exports = router;
