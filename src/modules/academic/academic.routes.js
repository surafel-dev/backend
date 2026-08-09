const express = require('express'); 
const router = express.Router(); 
const asyncHandler = require('express-async-handler'); 
const academicService = require('./academic.service'); 
const mongoose = require('mongoose');

const { protect, restrictTo } = require('../../middleware/authMiddleware'); 

/**
 * @route   POST /api/academic/classesyarn install
 * @desc    Create a new class tier (e.g., Grade 12)
 * @access  Private (Admin, Registrar)
 */
router.post( 
  '/classes', 
  protect, 
  restrictTo('admin', 'academic_vp', 'super-admin'),
  asyncHandler(async (req, res) => { 
    let schoolId;
    
      if (req.user?.role === 'super-admin') {
        // Super-admin isn't tied to one school — they must explicitly choose one.
        schoolId = req.body.schoolId;
    
        if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
          res.status(400);
          throw new Error('Validation Error: A valid schoolId must be provided.');
        }
      }  
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
 * @route   GET /api/academic/classes
 * @desc    List class tiers. Super-admin can filter with ?schoolId=,
 *          or omit it to see classes across all schools.
 * @access  Private (Admin, Academic_VP, Registrar, Teacher, Super Admin)
 */
router.get(
  '/classes',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin', 'registrar', 'teacher'),
  asyncHandler(async (req, res) => {
    let schoolId;

    if (req.user?.role === 'super-admin') {
      schoolId = req.query.schoolId; // optional — omitted means "all schools"
    } else {
      schoolId = req.user?.schoolId;
    }

    const classes = await academicService.getAllClasses(schoolId);

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes
    });
  })
);

/**
 * @route   POST /api/academic/sections
 * @desc    Create a new section under a specific class tier
 * @access  Private (Admin, Registrar)
 */
router.post(
  '/sections',
  protect, 
  restrictTo('admin', 'registrar', 'super-admin'), // Utilizing your custom authorization name[cite: 1]
  asyncHandler(async (req, res) => { 
    let schoolId;
    
      if (req.user?.role === 'super-admin') {
        // Super-admin isn't tied to one school — they must explicitly choose one.
        schoolId = req.body.schoolId;
    
        if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
          res.status(400);
          throw new Error('Validation Error: A valid schoolId must be provided.');
        }
      }  
    const { classId, name, roomNumber, homeroomTeacherId, capacity } = req.body; //[cite: 1]

    if (!classId || !name) { 
      res.status(400); 
      throw new Error('Class ID and Section name are required fields.'); //[cite: 1]
    } //[cite: 1]

    const sectionData = { name, roomNumber, homeroomTeacherId, capacity }; //[cite: 1]
    const newSection = await academicService.createSection(schoolId, classId, sectionData); //[cite: 1]

    res.status(201).json({ 
      success: true, 
      message: 'Section configured successfully.', 
      data: newSection 
    }); 
  }) 
); 

/**
 * @route   GET /api/academic/sections
 * @desc    List sections. Super-admin can filter with ?schoolId=,
 *          or omit it to see sections across all schools.
 * @access  Private (Admin, Academic_VP, Registrar, Teacher, Super Admin)
 */
router.get(
  '/sections',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin', 'registrar', 'teacher'),
  asyncHandler(async (req, res) => {
    let schoolId;

    if (req.user?.role === 'super-admin') {
      schoolId = req.query.schoolId; // optional — omitted means "all schools"
    } else {
      schoolId = req.user?.schoolId;
    }

    const sections = await academicService.getAllSections(schoolId);

    res.status(200).json({
      success: true,
      count: sections.length,
      data: sections
    });
  })
);

router.post( 
  '/subjects', 
  protect, 
  restrictTo('admin', 'academic_vp', 'super-admin'),
  asyncHandler(async (req, res) => {

    let schoolId;
    
      if (req.user?.role === 'super-admin') {
        // Super-admin isn't tied to one school — they must explicitly choose one.
        schoolId = req.body.schoolId;
    
        if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
          res.status(400);
          throw new Error('Validation Error: A valid schoolId must be provided.');
        }
      }  

    const { name, code, category, type } = req.body; 

    // Validation
    if (!name || !code) { 
      res.status(400); 
      throw new Error('Subject name and unique subject code are required fields.'); 
    } 

    const subjectData = { name, code, category, type }; 
    const newSubject = await academicService.createSubject(schoolId, subjectData);

    res.status(201).json({ 
      success: true, 
      message: 'Subject module created successfully.', 
      data: newSubject 
    }); 
  }) 
); 

/**
 * @route   GET /api/academic/subjects
 * @desc    List subjects. Super-admin can filter with ?schoolId=,
 *          or omit it to see subjects across all schools.
 * @access  Private (Admin, Academic_VP, Registrar, Teacher, Super Admin)
 */
router.get(
  '/subjects',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin', 'registrar', 'teacher'),
  asyncHandler(async (req, res) => {
    let schoolId;

    if (req.user?.role === 'super-admin') {
      schoolId = req.query.schoolId; // optional — omitted means "all schools"
    } else {
      schoolId = req.user?.schoolId;
    }

    const subjects = await academicService.getAllSubjects(schoolId);

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects
    });
  })
);

/**
 * @route   POST /api/academic/classes/:classId/subjects
 * @desc    Assign multiple existing subjects to a specific class tier
 * @access  Private (Admin, Academic_VP)
 */
router.post( //[cite: 1]
  '/classes/:classId/subjects',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'), 
  asyncHandler(async (req, res) => { 
    let schoolId;

    if (req.user?.role === 'super-admin') {
      // Super-admin isn't tied to one school — they must explicitly choose one.
      schoolId = req.body.schoolId;

      if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
        res.status(400);
        throw new Error('Validation Error: A valid schoolId must be provided.');
      }
    } else {
      schoolId = req.user?.schoolId;
    }

    const { classId } = req.params; 
    const { subjectIds } = req.body; 

    if (!Array.isArray(subjectIds) || subjectIds.length === 0) { 
      res.status(400); 
      throw new Error('Please provide a non-empty array of subject IDs to assign.'); 
    } //[cite: 1]

    const updatedClass = await academicService.assignSubjectsToClass(schoolId, classId, subjectIds); 

    res.status(200).json({
      success: true, 
      message: 'Subjects updated for this class tier.', 
      data: updatedClass 
    }); 
  }) 
); 

/**
 * @route   PUT /api/academic/sections/:sectionId/homeroom
 * @desc    Assign a homeroom teacher to a section
 * @access  Private (Admin, Academic_VP)
 */
router.put(
  '/sections/:sectionId/homeroom',
  protect,
  restrictTo('admin', 'academic_vp', 'super-admin'),
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
  restrictTo('admin', 'academic_vp', 'super-admin'),
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