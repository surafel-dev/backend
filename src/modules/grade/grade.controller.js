const asyncHandler = require('express-async-handler');
const gradeService = require('./grade.service');
const Student = require('../student/student.model');

const processBulkGrades = asyncHandler(async (req, res) => {
  const { academicYear, term, classId, subjectId, gradeData } = req.body;
  const schoolId = req.schoolId;
  const teacherId = req.user._id;

  if (!academicYear || !term || !classId || !subjectId) {
    res.status(400);
    throw new Error('Academic year, term, classId, and subjectId are required properties.');
  }

  if (!gradeData || !Array.isArray(gradeData) || gradeData.length === 0) {
    res.status(400);
    throw new Error('Invalid format for grade processing dataset. A non-empty array is required.');
  }

  const metaData = {
    schoolId,
    academicYear,
    term,
    classId,
    subjectId,
    teacherId,
    requesterRole: req.user.role
  };
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
  const schoolId = req.schoolId;

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
 * @access  Private (Admin, Teacher, Student — a student may only view their own)
 */
const getReportCard = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { academicYear, term } = req.query;
  const schoolId = req.schoolId;

  if (!academicYear || !term) {
    res.status(400);
    throw new Error('AcademicYear and term query params are explicitly required.');
  }

  const staffRoles = ['admin', 'super-admin', 'teacher', 'hr', 'registrar', 'academic_vp'];
  const isStaff = staffRoles.includes(req.user.role);

  // A student may only ever view their own report card — without this,
  // any student account could view any classmate's grades just by
  // changing the :studentId in the URL, since verifySchoolAccess only
  // confirms they're in the same school, not that they ARE this student.
  //
  // NOTE: there's no parent-student link model available here, so a
  // 'parent' role currently falls through to the 403 below rather than
  // being granted access to their child's record. Wiring that up needs a
  // Parent/Guardian model with an explicit relationship to Student — flag
  // this if parent portal access to report cards is in scope.
  if (!isStaff) {
    const ownRecord = await Student.findOne({ _id: studentId, schoolId, userId: req.user._id }).select('_id');
    if (!ownRecord) {
      res.status(403);
      throw new Error('You do not have permission to view this report card.');
    }
  }

  const reportCardData = await gradeService.generateStudentReportCard(
    schoolId,
    studentId,
    academicYear,
    term,
    isStaff // only staff see Draft grades; students never do
  );

  res.status(200).json({
    success: true,
    message: 'Student terminal report card metrics extracted successfully.',
    reportCard: reportCardData
  });
});

/**
 * @desc    Fetch existing grades for a class/subject/term, keyed by studentId,
 *          so the entry UI can prefill instead of starting blank.
 * @route   GET /api/grades/class-grades
 * @access  Private (Teacher, Admin, Super Admin)
 */
const getClassGrades = asyncHandler(async (req, res) => {
  const { classId, subjectId, academicYear, term } = req.query;
  const schoolId = req.schoolId;

  if (!classId || !subjectId || !academicYear || !term) {
    res.status(400);
    throw new Error('Query parameters classId, subjectId, academicYear, and term are required.');
  }

  const existingGrades = await gradeService.getClassGrades(schoolId, classId, subjectId, academicYear, term);

  res.status(200).json({
    success: true,
    data: existingGrades
  });
});

/**
 * @desc    Publish every Draft grade for a class/subject/term, making them
 *          visible to students and locking them from teacher edits.
 * @route   POST /api/grades/publish
 * @access  Private (Admin, Super Admin)
 */
const publishGrades = asyncHandler(async (req, res) => {
  const { classId, subjectId, academicYear, term } = req.body;
  const schoolId = req.schoolId;

  if (!classId || !subjectId || !academicYear || !term) {
    res.status(400);
    throw new Error('classId, subjectId, academicYear, and term are required.');
  }

  const result = await gradeService.publishGrades(schoolId, classId, subjectId, academicYear, term);

  res.status(200).json({
    success: true,
    message: `${result.publishedCount} grade record(s) published.`,
    data: result
  });
});

/**
 * @desc    A student's percentage trend for a subject (or all subjects)
 *          across every term/year on record.
 * @route   GET /api/grades/trend/:studentId
 * @access  Private (Admin, Teacher, Student — a student may only view their own)
 */
const getStudentGradeTrend = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { subjectId } = req.query;
  const schoolId = req.schoolId;

  const staffRoles = ['admin', 'super-admin', 'teacher', 'hr', 'registrar', 'academic_vp'];
  const isStaff = staffRoles.includes(req.user.role);

  if (!isStaff) {
    const ownRecord = await Student.findOne({ _id: studentId, schoolId, userId: req.user._id }).select('_id');
    if (!ownRecord) {
      res.status(403);
      throw new Error('You do not have permission to view this data.');
    }
  }

  const trend = await gradeService.getStudentGradeTrend(schoolId, studentId, subjectId);

  res.status(200).json({
    success: true,
    data: trend
  });
});

module.exports = {
  processBulkGrades,
  getClassInsights,
  getReportCard,
  getClassGrades,
  publishGrades,
  getStudentGradeTrend
};