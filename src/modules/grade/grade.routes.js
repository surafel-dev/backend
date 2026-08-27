const express = require('express');
const router = express.Router();
const {
  processBulkGrades,
  getClassInsights,
  getReportCard,
  getClassGrades,
  publishGrades,
  getStudentGradeTrend
} = require('./grade.controller');
const { protect, restrictTo, extractSchoolId } = require('../../middleware/authMiddleware');
const { verifySchoolAccess } = require('../../middleware/schoolContextMiddleware');

// Inputs and calculations
router.post(
    '/bulk-upsert', 
     protect, 
     restrictTo('teacher', 'admin', 'super-admin'),
     extractSchoolId({ required: true }),
     verifySchoolAccess, 
     processBulkGrades);
router.get(
    '/insights', 
    protect, 
    restrictTo('teacher', 'admin', 'super-admin'),
    extractSchoolId({ required: true }), 
    verifySchoolAccess, 
    getClassInsights);

// Prefill for the entry UI — same access as bulk-upsert, since this is
// only ever used right before editing.
router.get(
    '/class-grades',
    protect,
    restrictTo('teacher', 'admin', 'super-admin'),
    extractSchoolId({ required: true }),
    verifySchoolAccess,
    getClassGrades);

// Only admins publish — a teacher can enter/edit but shouldn't be able to
// self-certify their own grades as final without a review step.
router.post(
    '/publish',
    protect,
    restrictTo('admin', 'super-admin'),
    extractSchoolId({ required: true }),
    verifySchoolAccess,
    publishGrades);

// Student Single Report Card Route
router.get(
    '/report-card/:studentId', 
    protect, 
    extractSchoolId({ required: true }), 
    verifySchoolAccess, 
    getReportCard);

// Term-over-term trend for a student — same open-to-any-authenticated-role
// shape as report-card, with the same controller-level ownership check.
router.get(
    '/trend/:studentId',
    protect,
    extractSchoolId({ required: true }),
    verifySchoolAccess,
    getStudentGradeTrend);

module.exports = router;