const express = require('express');
const router = express.Router();
const { createSchool, getSchoolDetails, getAllSchools } = require('./school.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// Only a top-level platform 'admin' can initialize a new school tenant branch
router.route('/school')
  .post(protect, restrictTo('super-admin'), createSchool);

router.route('/')
  .get(protect, restrictTo('super-admin'), getAllSchools);
  
router.route('/:id')
  .get(protect, restrictTo('super-admin'), getSchoolDetails);

module.exports = router;