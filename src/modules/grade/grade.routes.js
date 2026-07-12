const express = require('express');
const router = express.Router();
const { processBulkGrades } = require('./grade.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');


router.post('/bulk-upsert',protect, restrictTo('teacher', 'admin'), processBulkGrades);

module.exports = router;