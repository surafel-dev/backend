// modules/grade/grade.controller.js
const asyncHandler = require('express-async-handler');
const gradeService = require('./grade.service');

/**
 * @desc    Bulk Insert or Update student grades for a class/subject
 * @route   POST /api/v1/grades/bulk-upsert
 * @access  Private (Teacher/Admin)
 */
const processBulkGrades = asyncHandler(async (req, res, next) => {
  const { academicYear, term, classId, subjectId, gradeData } = req.body;
  
  // Extract multi-tenant scope variables from your auth context
  const schoolId = req.user.schoolId; 
  const teacherId = req.user._id;

  if (!gradeData || !Array.isArray(gradeData)) {
    res.status(400);
    throw new Error('Invalid format for grade processing dataset.');
  }

  const metaData = { schoolId, academicYear, term, classId, subjectId, teacherId };
  
  // Hand off to the service layer for heavy database bulkWrite operations
  const result = await gradeService.bulkUpsertGrades(metaData, gradeData);

  res.status(200).json({
    success: true,
    message: 'Class grades successfully committed to the database.',
    data: {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      created: result.upsertedCount
    }
  });
});

module.exports = {
  processBulkGrades
};