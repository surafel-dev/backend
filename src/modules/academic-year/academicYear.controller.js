// academicYear.controller.js
const asyncHandler = require('express-async-handler');
const academicService = require('./academicYear.service');

// @desc    Create a new academic year with nested terms
// @route   POST /api/academic/years
// @access  Private (Admin Only)
const createYear = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId; // Securely extracted from token payload via protect middleware
  const { title, startDate, endDate } = req.body;

  if (!title || !startDate || !endDate) {
    res.status(400);
    throw new Error('Title, start date, and end date are required fields.');
  }
  
  const newYear = await academicService.createAcademicYear(schoolId, req.body);
  
  res.status(201).json({ 
    success: true, 
    message: 'Academic calendar year framework initialized successfully.',
    data: newYear 
  });
});

// @desc    Get all academic years for the current tenant school
// @route   GET /api/academic/years/list
// @access  Private (Authenticated Users)
const getYears = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  
  const years = await academicService.getAcademicYears(schoolId);
  
  res.status(200).json({ 
    success: true, 
    count: years.length,
    data: years 
  });
});

// @desc    Switch the active academic year for the school
// @route   PATCH /api/academic/years/:id/activate
// @access  Private (Admin Only)
const setActiveYear = asyncHandler(async (req, res) => {
  const schoolId = req.user.schoolId;
  const { id } = req.params;

  const activated = await academicService.activateYear(schoolId, id);
  
  if (!activated) {
    res.status(404);
    throw new Error('Requested Academic Year resource could not be found under this school branch.');
  }
  
  res.status(200).json({ 
    success: true, 
    message: `Academic year "${activated.title}" has been set to active for your institution. All other years have been deactivated.`,
    data: activated 
  });
});

module.exports = {
  createYear,
  getYears,
  setActiveYear
};