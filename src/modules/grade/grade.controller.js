const asyncHandler = require('express-async-handler');
const gradeService = require('./grade.service');

const processBulkGrades = asyncHandler(async (req, res) => {
  const { academicYear, term, classId, subjectId, gradeData } = req.body;
  const schoolId = req.user.schoolId; 
  const teacherId = req.user._id;

  if (!academicYear || !term || !classId || !subjectId) {
    res.status(400);
    throw new Error('Academic year, term, classId, and subjectId are required properties.');
  }

  if (!gradeData || !Array.isArray(gradeData) || gradeData.length === 0) {
    res.status(400);
    throw new Error('Invalid format for grade processing dataset. A non-empty array is required.');
  }

  const metaData = { schoolId, academicYear, term, classId, subjectId, teacherId };
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

const getClassInsights = asyncHandler(async (req, res) => {
  const { classId, subjectId, academicYear, term } = req.query;
  const schoolId = req.user.schoolId;

  if (!classId || !subjectId || !academicYear || !term) {
    res.status(400);
    throw new Error('Query parameters classId, subjectId, academicYear, and term are required.');
  }

  const analyticsReport = await gradeService.getClassPerformanceReport(
    schoolId,
    classId,
    subjectId,
    academicYear,
    term
  );

  res.status(200).json({
    success: true,
    message: 'Performance metrics computed successfully.',
    analytics: analyticsReport
  });
});

/**
 * @desc    Generate a clean consolidated single student terminal report card compilation
 * @route   GET /api/v1/grades/report-card/:studentId
 * @access  Private (Admin, Teacher, Student)
 */
const getReportCard = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { academicYear, term } = req.query;
  const schoolId = req.user.schoolId;

  if (!academicYear || !term) {
    res.status(400);
    throw new Error('AcademicYear and term query params are explicitly required.');
  }

  const reportCardData = await gradeService.generateStudentReportCard(
    schoolId,
    studentId,
    academicYear,
    term
  );

  res.status(200).json({
    success: true,
    message: 'Student terminal report card metrics extracted successfully.',
    reportCard: reportCardData
  });
});

module.exports = {
  processBulkGrades,
  getClassInsights,
  getReportCard
};