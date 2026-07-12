const express = require('express'); //[cite: 1]
const router = express.Router(); //[cite: 1]
const asyncHandler = require('express-async-handler'); //[cite: 1]
const academicService = require('./academic.service'); //[cite: 1]

// Importing your exact middleware functions[cite: 1]
const { protect, restrictTo } = require('../../middleware/authMiddleware'); //[cite: 1]

/**
 * @route   POST /api/academic/classes
 * @desc    Create a new class tier (e.g., Grade 12)
 * @access  Private (Admin, Registrar)
 */
router.post( 
  '/classes', 
  protect, 
  restrictTo('admin'),
  asyncHandler(async (req, res) => { 
    const { schoolId } = req.user; 
    const { name, numericLevel } = req.body;

    if (!name || numericLevel === undefined) { //[cite: 1]
      res.status(400); //[cite: 1]
      throw new Error('Class name and numeric level are required fields.'); //[cite: 1]
    } //[cite: 1]

    const classData = { name, numericLevel }; //[cite: 1]
    const newClass = await academicService.createClass(schoolId, classData); //[cite: 1]

    res.status(201).json({ //[cite: 1]
      success: true, //[cite: 1]
      message: 'Class tier created successfully.', //[cite: 1]
      data: newClass //[cite: 1]
    }); //[cite: 1]
  }) //[cite: 1]
); //[cite: 1]

/**
 * @route   POST /api/academic/sections
 * @desc    Create a new section under a specific class tier
 * @access  Private (Admin, Registrar)
 */
router.post( //[cite: 1]
  '/sections', //[cite: 1]
  protect, //[cite: 1]
  restrictTo('admin', 'registrar'), // Utilizing your custom authorization name[cite: 1]
  asyncHandler(async (req, res) => { //[cite: 1]
    const { schoolId } = req.user; // Cleanly aligned to your decoded token key[cite: 1]
    const { classId, name, roomNumber, homeroomTeacherId, capacity } = req.body; //[cite: 1]

    if (!classId || !name) { //[cite: 1]
      res.status(400); //[cite: 1]
      throw new Error('Class ID and Section name are required fields.'); //[cite: 1]
    } //[cite: 1]

    const sectionData = { name, roomNumber, homeroomTeacherId, capacity }; //[cite: 1]
    const newSection = await academicService.createSection(schoolId, classId, sectionData); //[cite: 1]

    res.status(201).json({ //[cite: 1]
      success: true, //[cite: 1]
      message: 'Section configured successfully.', //[cite: 1]
      data: newSection //[cite: 1]
    }); //[cite: 1]
  }) //[cite: 1]
); //[cite: 1]

router.post( //[cite: 1]
  '/subjects', //[cite: 1]
  protect, //[cite: 1]
  restrictTo('admin'), 
  asyncHandler(async (req, res) => { //[cite: 1]
    const { schoolId } = req.user; //[cite: 1]
    const { name, code, category, type } = req.body; //[cite: 1]

    // Validation[cite: 1]
    if (!name || !code) { //[cite: 1]
      res.status(400); //[cite: 1]
      throw new Error('Subject name and unique subject code are required fields.'); //[cite: 1]
    } //[cite: 1]

    const subjectData = { name, code, category, type }; //[cite: 1]
    const newSubject = await academicService.createSubject(schoolId, subjectData); //[cite: 1]

    res.status(201).json({ //[cite: 1]
      success: true, //[cite: 1]
      message: 'Subject module created successfully.', //[cite: 1]
      data: newSubject //[cite: 1]
    }); //[cite: 1]
  }) //[cite: 1]
); //[cite: 1]

/**
 * @route   POST /api/academic/classes/:classId/subjects
 * @desc    Assign multiple existing subjects to a specific class tier
 * @access  Private (Admin, Academic_VP)
 */
router.post( //[cite: 1]
  '/classes/:classId/subjects', //[cite: 1]
  protect, //[cite: 1]
  restrictTo('admin'), //[cite: 1]
  asyncHandler(async (req, res) => { //[cite: 1]
    const { schoolId } = req.user; //[cite: 1]
    const { classId } = req.params; //[cite: 1]
    const { subjectIds } = req.body; //[cite: 1]

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) { //[cite: 1]
      res.status(400); //[cite: 1]
      throw new Error('Please provide a non-empty array of subject IDs to assign.'); //[cite: 1]
    } //[cite: 1]

    const updatedClass = await academicService.assignSubjectsToClass(schoolId, classId, subjectIds); //[cite: 1]

    res.status(200).json({ //[cite: 1]
      success: true, //[cite: 1]
      message: 'Subjects updated for this class tier.', //[cite: 1]
      data: updatedClass //[cite: 1]
    }); //[cite: 1]
  }) //[cite: 1]
); //[cite: 1]

/**
 * @route   PUT /api/academic/sections/:sectionId/homeroom
 * @desc    Assign a homeroom teacher to a section
 * @access  Private (Admin, Academic_VP)
 */
router.put(
  '/sections/:sectionId/homeroom',
  protect,
  restrictTo('admin'),
  asyncHandler(async (req, res) => {
    const { schoolId } = req.user;
    const { sectionId } = req.params;
    const { teacherId } = req.body;

    const updatedSection = await academicService.assignHomeroomTeacher(schoolId, sectionId, teacherId);

    res.status(200).json({
      success: true,
      message: 'Homeroom teacher assigned successfully.',
      data: updatedSection
    });
  })
);

/**
 * @route   POST /api/academic/sections/:sectionId/assign-teacher
 * @desc    Assign a teacher to teach a specific subject within a section
 * @access  Private (Admin, Academic_VP)
 */
router.post(
  '/sections/:sectionId/assign-teacher',
  protect,
  restrictTo('admin', 'academic_vp'),
  asyncHandler(async (req, res) => {
    const { schoolId } = req.user;
    const { sectionId } = req.params;
    const { subjectId, teacherId } = req.body;

    const updatedSection = await academicService.assignSubjectTeacher(
      schoolId,
      sectionId,
      subjectId,
      teacherId
    );

    res.status(200).json({
      success: true,
      message: 'Teacher assigned to subject successfully within this section.',
      data: updatedSection
    });
  })
);

/**
 * @route   GET /api/academic/sections/:sectionId/details
 * @desc    Get complete section configuration including Class & Subjects details
 * @access  Private (Admin, Teacher, Registrar)
 */
router.get( //[cite: 1]
  '/sections/:sectionId/details', //[cite: 1]
  protect, //[cite: 1]
  restrictTo('admin', 'teacher', 'registrar'), //[cite: 1]
  asyncHandler(async (req, res) => { //[cite: 1]
    const { schoolId } = req.user; //[cite: 1]
    const { sectionId } = req.params; //[cite: 1]

    const fullDetails = await academicService.getFullSectionDetails(schoolId, sectionId); //[cite: 1]

    if (!fullDetails) { //[cite: 1]
      res.status(404); //[cite: 1]
      throw new Error('Requested Section configuration could not be found.'); //[cite: 1]
    } //[cite: 1]

    res.status(200).json({ //[cite: 1]
      success: true, //[cite: 1]
      data: fullDetails //[cite: 1]
    }); //[cite: 1]
  }) //[cite: 1]
); //[cite: 1]

module.exports = router; //[cite: 1]