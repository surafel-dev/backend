const asyncHandler = require('express-async-handler');
const School = require('./school.model');

const createSchool = asyncHandler(async (req, res) => {
  const { name, schoolCode, address } = req.body;

  // Check if school code or name already exists
  const schoolExists = await School.findOne({ 
    $or: [{ schoolCode: schoolCode.toUpperCase() }, { name }] 
  });

  if (schoolExists) {
    res.status(400);
    throw new Error('A school with this name or school code already exists');
  }

  const newSchool = await School.create({
    name,
    schoolCode,
    address
  });

  res.status(201).json({ success: true, data: newSchool });
});

/**
 * @desc    Get details of a specific school
 * @route   GET /api/schools/:id
 * @access  Private
 */
const getSchoolDetails = asyncHandler(async (req, res) => {
  const school = await School.findById(req.params.id);

  if (!school) {
    res.status(404);
    throw new Error('School campus not found');
  }

  res.status(200).json({ success: true, data: school });
});

module.exports = { createSchool, getSchoolDetails };