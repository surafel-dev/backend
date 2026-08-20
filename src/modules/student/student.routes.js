const express = require('express');
const router = express.Router();
const { 
  getAllStudents, 
  createStudent, 
  acceptInvite, 
  updateStudent, 
  deleteStudent 
} = require('./student.controller');
const Student = require('./student.model');
const { uploadPhoto } = require('../../utils/imageProcessor');
const queryHandler = require('../../middleware/queryHandler');
const { protect, restrictTo, extractSchoolId } = require('../../middleware/authMiddleware');
const { verifySchoolAccess } = require('../../middleware/schoolContextMiddleware');

// Public route for students claiming accounts
router.post('/accept-invite/:token', acceptInvite);

// Administrative roster controls
router.route('/')
  .get(
    protect, 
    restrictTo('admin', 'registrar', 'teacher', 'super-admin'), 
    extractSchoolId({ required: false }), 
    verifySchoolAccess, 
    queryHandler(Student, 'classId'), 
    getAllStudents
  )
  .post(
    protect, 
    restrictTo('admin', 'registrar', 'super-admin'), 
    uploadPhoto, 
    extractSchoolId({ required: true }), 
    verifySchoolAccess, 
    createStudent
  );

router.route('/:studentId')
  .put(
    protect, 
    restrictTo('admin', 'registrar', 'super-admin'), 
    uploadPhoto, 
    extractSchoolId({ required: true }), 
    verifySchoolAccess, 
    updateStudent
  )
  .delete(
    protect, 
    restrictTo('admin', 'registrar', 'super-admin'), 
    extractSchoolId({ required: true }), 
    verifySchoolAccess, 
    deleteStudent
  );

module.exports = router;