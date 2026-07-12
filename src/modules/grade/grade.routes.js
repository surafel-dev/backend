const express = require('express');
const router = express.Router();
const { processBulkGrades, getClassInsights, getReportCard } = require('./grade.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// Inputs and calculations
router.post('/bulk-upsert', protect, restrictTo('teacher', 'admin'), processBulkGrades);
router.get('/insights', protect, restrictTo('teacher', 'admin'), getClassInsights);

// Student Single Report Card Route
router.get('/report-card/:studentId', protect, getReportCard);

module.exports = router;