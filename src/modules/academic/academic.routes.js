const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const academicService = require('./academic.service');

const { protect, restrictTo, extractSchoolId } = require('../../middleware/authMiddleware');
const { verifySchoolAccess } = require('../../middleware/schoolContextMiddleware');

/**
 * @route   POST /api/academic/classes
 * @desc    Create a new class tier (e.g., Grade 12)
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.post(
  '/classes',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { name, numericLevel } = req.body;

    if (!name || numericLevel === undefined) {
      res.status(400);
      throw new Error('Class name and numeric level are required fields.');
    }

    const newClass = await academicService.createClass(req.schoolId, { name, numericLevel });

    res.status(201).json({
      success: true,
      message: 'Class tier created successfully.',
      data: newClass,
    });
  })
);

/**
 * @route   GET /api/academic/classes
 * @desc    List class tiers. Super-admin can filter with ?schoolId=,
 *          or omit it to see classes across all schools.
 * @access  Private (Admin, Academic VP, Registrar, Teacher, Super Admin)
 */
router.get(
  '/classes',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin', 'registrar', 'teacher'),
  extractSchoolId({ required: false }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const classes = await academicService.getAllClasses(req.schoolId);

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes,
    });
  })
);

/**
 * @route   PUT /api/academic/classes/:classId
 * @desc    Update a class tier's name/numericLevel
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.put(
  '/classes/:classId',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { name, numericLevel } = req.body;

    const updatedClass = await academicService.updateClass(req.schoolId, classId, {
      name,
      numericLevel,
    });

    res.status(200).json({
      success: true,
      message: 'Class tier updated successfully.',
      data: updatedClass,
    });
  })
);

/**
 * @route   DELETE /api/academic/classes/:classId
 * @desc    Delete a class tier (blocked if sections still reference it)
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.delete(
  '/classes/:classId',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { classId } = req.params;

    await academicService.deleteClass(req.schoolId, classId);

    res.status(200).json({
      success: true,
      message: 'Class tier deleted successfully.',
    });
  })
);

/**
 * @route   POST /api/academic/sections
 * @desc    Create a new section under a specific class tier
 * @access  Private (Admin, Registrar, Super Admin)
 */
router.post(
  '/sections',
  protect,
  restrictTo('admin', 'registrar', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { classId, name, roomNumber, homeroomTeacherId, capacity } = req.body;

    if (!classId || !name) {
      res.status(400);
      throw new Error('Class ID and Section name are required fields.');
    }

    const newSection = await academicService.createSection(req.schoolId, classId, {
      name,
      roomNumber,
      homeroomTeacherId,
      capacity,
    });

    res.status(201).json({
      success: true,
      message: 'Section configured successfully.',
      data: newSection,
    });
  })
);

/**
 * @route   GET /api/academic/sections
 * @desc    List sections. Super-admin can filter with ?schoolId=,
 *          or omit it to see sections across all schools.
 * @access  Private (Admin, Academic VP, Registrar, Teacher, Super Admin)
 */
router.get(
  '/sections',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin', 'registrar', 'teacher'),
  extractSchoolId({ required: false }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const sections = await academicService.getAllSections(req.schoolId);

    res.status(200).json({
      success: true,
      count: sections.length,
      data: sections,
    });
  })
);

/**
 * @route   PUT /api/academic/sections/:sectionId
 * @desc    Update a section's name/roomNumber/capacity/classId/homeroomTeacherId
 * @access  Private (Admin, Registrar, Super Admin)
 */
router.put(
  '/sections/:sectionId',
  protect,
  restrictTo('admin', 'registrar', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { sectionId } = req.params;
    const { name, roomNumber, capacity, classId, homeroomTeacherId } = req.body;

    const updatedSection = await academicService.updateSection(req.schoolId, sectionId, {
      name,
      roomNumber,
      capacity,
      classId,
      homeroomTeacherId,
    });

    res.status(200).json({
      success: true,
      message: 'Section updated successfully.',
      data: updatedSection,
    });
  })
);

/**
 * @route   DELETE /api/academic/sections/:sectionId
 * @desc    Delete a section
 * @access  Private (Admin, Registrar, Super Admin)
 */
router.delete(
  '/sections/:sectionId',
  protect,
  restrictTo('admin', 'registrar', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { sectionId } = req.params;

    await academicService.deleteSection(req.schoolId, sectionId);

    res.status(200).json({
      success: true,
      message: 'Section deleted successfully.',
    });
  })
);

/**
 * @route   POST /api/academic/subjects
 * @desc    Create a new subject
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.post(
  '/subjects',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { name, code, category, type } = req.body;

    if (!name || !code) {
      res.status(400);
      throw new Error('Subject name and unique subject code are required fields.');
    }

    const newSubject = await academicService.createSubject(req.schoolId, {
      name,
      code,
      category,
      type,
    });

    res.status(201).json({
      success: true,
      message: 'Subject module created successfully.',
      data: newSubject,
    });
  })
);

/**
 * @route   GET /api/academic/subjects
 * @desc    List subjects. Super-admin can filter with ?schoolId=,
 *          or omit it to see subjects across all schools.
 * @access  Private (Admin, Academic VP, Registrar, Teacher, Super Admin)
 */
router.get(
  '/subjects',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin', 'registrar', 'teacher'),
  extractSchoolId({ required: false }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const subjects = await academicService.getAllSubjects(req.schoolId);

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  })
);

/**
 * @route   PUT /api/academic/subjects/:subjectId
 * @desc    Update a subject's name/code/category/type/isActive
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.put(
  '/subjects/:subjectId',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { subjectId } = req.params;
    const { name, code, category, type, isActive } = req.body;

    const updatedSubject = await academicService.updateSubject(req.schoolId, subjectId, {
      name,
      code,
      category,
      type,
      isActive,
    });

    res.status(200).json({
      success: true,
      message: 'Subject module updated successfully.',
      data: updatedSubject,
    });
  })
);

/**
 * @route   DELETE /api/academic/subjects/:subjectId
 * @desc    Delete a subject and detach it from any classes/sections referencing it
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.delete(
  '/subjects/:subjectId',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { subjectId } = req.params;

    await academicService.deleteSubject(req.schoolId, subjectId);

    res.status(200).json({
      success: true,
      message: 'Subject module deleted successfully.',
    });
  })
);

/**
 * @route   POST /api/academic/classes/:classId/subjects
 * @desc    Assign multiple existing subjects to a specific class tier
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.post(
  '/classes/:classId/subjects',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { subjectIds } = req.body;

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) {
      res.status(400);
      throw new Error('Please provide a non-empty array of subject IDs to assign.');
    }

    const updatedClass = await academicService.assignSubjectsToClass(
      req.schoolId,
      classId,
      subjectIds
    );

    res.status(200).json({
      success: true,
      message: 'Subjects updated for this class tier.',
      data: updatedClass,
    });
  })
);

/**
 * @route   PUT /api/academic/sections/:sectionId/homeroom
 * @desc    Assign a homeroom teacher to a section
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.put(
  '/sections/:sectionId/homeroom',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { sectionId } = req.params;
    const { teacherId } = req.body;

    const updatedSection = await academicService.assignHomeroomTeacher(
      req.schoolId,
      sectionId,
      teacherId
    );

    res.status(200).json({
      success: true,
      message: 'Homeroom teacher assigned successfully.',
      data: updatedSection,
    });
  })
);

/**
 * @route   POST /api/academic/sections/:sectionId/assign-teacher
 * @desc    Assign a teacher to teach a specific subject within a section
 * @access  Private (Admin, Academic VP, Super Admin)
 */
router.post(
  '/sections/:sectionId/assign-teacher',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { sectionId } = req.params;
    const { subjectId, teacherId } = req.body;

    const updatedSection = await academicService.assignSubjectTeacher(
      req.schoolId,
      sectionId,
      subjectId,
      teacherId
    );

    res.status(200).json({
      success: true,
      message: 'Teacher assigned to subject successfully within this section.',
      data: updatedSection,
    });
  })
);

/**
 * @route   GET /api/academic/sections/:sectionId/details
 * @desc    Get complete section configuration including Class & Subjects details
 * @access  Private (Admin, Academic VP, Teacher, Registrar, Super Admin)
 */
router.get(
  '/sections/:sectionId/details',
  protect,
  restrictTo('admin', 'academic_vp', 'teacher', 'registrar', 'super-admin'),
  extractSchoolId({ required: false }),
  verifySchoolAccess,
  asyncHandler(async (req, res) => {
    const { sectionId } = req.params;

    const fullDetails = await academicService.getFullSectionDetails(req.schoolId, sectionId);

    if (!fullDetails) {
      res.status(404);
      throw new Error('Requested Section configuration could not be found.');
    }

    res.status(200).json({
      success: true,
      data: fullDetails,
    });
  })
);

module.exports = router;