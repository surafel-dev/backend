// academicYear.routes.js
const express = require('express');
const router = express.Router();
const { createYear, getYears, setActiveYear } = require('./academicYear.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// Base route mappings matching your architecture gateways
router.post('/years', protect, restrictTo('admin'), createYear);
router.get('/years/list', protect, getYears);
router.patch('/years/:id/activate', protect, restrictTo('admin'), setActiveYear);

module.exports = router;