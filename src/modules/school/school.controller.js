const asyncHandler = require('express-async-handler');
const School = require('./school.model');

/**
 * @desc    Create a new school campus
 * @route   POST /api/schools
 * @access  Private (Super Admin)
 */
const createSchool = asyncHandler(async (req, res) => {
  const { name, schoolCode, address } = req.body;

  // Validate required inputs
  if (!name) {
    res.status(400);
    throw new Error('School name is required');
  }

  if (!address || !address.city || !address.region) {
    res.status(400);
    throw new Error('Please provide a complete address including both city and region');
  }

  const trimmedName = name.trim();
  const normalizedCode = schoolCode ? schoolCode.toUpperCase().trim() : null;

  // Check for existing school name or code (if code provided manually)
  const existingQuery = [{ name: trimmedName }];
  if (normalizedCode) {
    existingQuery.push({ schoolCode: normalizedCode });
  }

  const schoolExists = await School.findOne({ $or: existingQuery });

  if (schoolExists) {
    res.status(400);
    throw new Error('A school with this name or school code already exists');
  }

  // Create school object. Notice schoolCode is optional because pre('save') hook handles fallback!
  const newSchool = await School.create({
    name: trimmedName,
    ...(normalizedCode && { schoolCode: normalizedCode }),
    address: {
      city: address.city.trim(),
      region: address.region.trim(),
    },
    createdBy: req.user._id, // Set from authenticated Super Admin user context
  });

  res.status(201).json({
    success: true,
    data: newSchool,
  });
});

/**
 * @desc    Get all active school campuses owned by the logged-in Super Admin
 * @route   GET /api/schools
 * @access  Private (Super Admin)
 */
const getAllSchools = asyncHandler(async (req, res) => {
  // Return only schools created by the authenticated Super Admin
  const schools = await School.find({ 
    createdBy: req.user._id,
    isActive: true 
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: schools.length,
    data: schools,
  });
});

/**
 * @desc    Get details of a specific school campus
 * @route   GET /api/schools/:id
 * @access  Private (Super Admin)
 */
const getSchoolDetails = asyncHandler(async (req, res) => {
  const school = await School.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
  });

  if (!school) {
    res.status(404);
    throw new Error('School campus not found or unauthorized access');
  }

  res.status(200).json({
    success: true,
    data: school,
  });
});

module.exports = {
  createSchool,
  getAllSchools,
  getSchoolDetails,
};