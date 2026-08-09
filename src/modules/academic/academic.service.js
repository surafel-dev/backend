const Class = require('./class.model'); 
const Section = require('./section.model'); 
const Subject = require('./subject.model'); 

const createClass = async (schoolId, classData) => {
  // Check if a class with the same name already exists in this school
  const existingClass = await Class.findOne({ schoolId, name: classData.name });
  if (existingClass) {
    const error = new Error(`Class tier "${classData.name}" already exists in your school.`);
    error.statusCode = 400;
    throw error;
  }

  const newClass = new Class({
    ...classData,
    schoolId
  });

  return await newClass.save();
};


const getAllClasses = async (schoolId) => {
  const filter = {};
  if (schoolId) {
    filter.schoolId = schoolId;
  }

  return await Class.find(filter)
    .populate('subjects', 'name code')
    .sort({ numericLevel: 1, name: 1 });
};

/**
 * Create a section mapped to a verified parent class under a specific school[cite: 2]
 */
const createSection = async (schoolId, classId, sectionData) => {
  const parentClass = await Class.findOne({ _id: classId, schoolId }); 
  if (!parentClass) { 
    const error = new Error('Parent Class tier does not exist under your institution.'); //[cite: 2]
    error.statusCode = 404; //[cite: 2]
    throw error; //[cite: 2]
  } //[cite: 2]

  const existingSection = await Section.findOne({ schoolId, classId, name: sectionData.name }); //[cite: 2]
  if (existingSection) { //[cite: 2]
    const error = new Error(`Section "${sectionData.name}" is already taken in this class tier.`); //[cite: 2]
    error.statusCode = 400; //[cite: 2]
    throw error; //[cite: 2]
  } //[cite: 2]

  const newSection = new Section({ 
    ...sectionData,
    classId,
    schoolId 
  }); //[cite: 2]

  return await newSection.save(); 
};

/**
 * List sections. If schoolId is provided, results are scoped to that
 * school; if omitted (super-admin browsing all schools), all sections are
 * returned.
 */
const getAllSections = async (schoolId) => {
  const filter = {};
  if (schoolId) {
    filter.schoolId = schoolId;
  }

  return await Section.find(filter)
    .populate('classId', 'name numericLevel')
    .populate('homeroomTeacherId', 'name email photo')
    .sort({ createdAt: -1 });
};

const createSubject = async (schoolId, subjectData) => {
  // Check for duplicate subject codes within the same school[cite: 2]
  const existingCode = await Subject.findOne({ schoolId, code: subjectData.code.toUpperCase() }); //[cite: 2]
  if (existingCode) { //[cite: 2]
    const error = new Error(`Subject with code "${subjectData.code}" already exists.`); //[cite: 2]
    error.statusCode = 400; //[cite: 2]
    throw error; //[cite: 2]
  } //[cite: 2]

  // Check for duplicate subject names within the same school[cite: 2]
  const existingName = await Subject.findOne({ schoolId, name: subjectData.name }); //[cite: 2]
  if (existingName) { //[cite: 2]
    const error = new Error(`Subject named "${subjectData.name}" already exists.`); //[cite: 2]
    error.statusCode = 400; //[cite: 2]
    throw error; //[cite: 2]
  } //[cite: 2]

  const newSubject = new Subject({ 
    ...subjectData, 
    code: subjectData.code.toUpperCase(), 
    schoolId 
  }); 

  return await newSubject.save(); 
};

/**
 * List subjects. If schoolId is provided, results are scoped to that
 * school; if omitted (super-admin browsing all schools), all subjects are
 * returned.
 */
const getAllSubjects = async (schoolId) => {
  const filter = {};
  if (schoolId) {
    filter.schoolId = schoolId;
  }

  return await Subject.find(filter).sort({ name: 1 });
};

/**
 * Link an array of subjects to a Class tier under a specific school
 */
const assignSubjectsToClass = async (schoolId, classId, subjectIds) => {
  const updatedClass = await Class.findOneAndUpdate(
    { _id: classId, schoolId }, 
    { $addToSet: { subjects: { $each: subjectIds } } }, 
    { returnDocument: 'after' } 
  ).populate('subjects'); 

  if (!updatedClass) { 
    const error = new Error('Target Class tier not found.'); 
    error.statusCode = 404; 
    throw error; 
  } 

  return updatedClass; 
};

/**
 * Assigns a Homeroom Teacher to a specific Section
 */
const assignHomeroomTeacher = async (schoolId, sectionId, teacherId) => {
  if (!schoolId || !sectionId || !teacherId) {
    const error = new Error('School ID, Section ID, and Teacher ID are required.');
    error.statusCode = 400;
    throw error;
  }

  const updatedSection = await Section.findOneAndUpdate(
    { _id: sectionId, schoolId },
    { homeroomTeacherId: teacherId },
    { returnDocument: 'after' }
  ).populate('homeroomTeacherId', 'name email');

  if (!updatedSection) {
    const error = new Error('Section not found.');
    error.statusCode = 404;
    throw error;
  }

  return updatedSection;
};

/**
 * Assigns a teacher to a specific subject within a section execution context
 */
const assignSubjectTeacher = async (schoolId, sectionId, subjectId, teacherId) => {
  if (!schoolId || !sectionId || !subjectId || !teacherId) {
    const error = new Error('All fields (schoolId, sectionId, subjectId, teacherId) are required.');
    error.statusCode = 400;
    throw error;
  }

  const section = await Section.findOne({ _id: sectionId, schoolId });
  if (!section) {
    const error = new Error('Section not found.');
    error.statusCode = 404;
    throw error;
  }

  // Atomically pull out old mappings for this subject inside this section if they conflict
  await Section.updateOne(
    { _id: sectionId, schoolId },
    { $pull: { subjectTeachers: { subjectId } } }
  );

  const updatedSection = await Section.findOneAndUpdate(
    { _id: sectionId, schoolId },
    { $push: { subjectTeachers: { subjectId, teacherId } } },
    { returnDocument: 'after' }
  ).populate({
    path: 'subjectTeachers.teacherId',
    select: 'name email photo'
  }).populate({
    path: 'subjectTeachers.subjectId',
    select: 'name code'
  });

  return updatedSection;
};

/**
 * Fetch deep populated Class and Subject references for a Section
 */
const getFullSectionDetails = async (schoolId, sectionId) => {
  return await Section.findOne({ _id: sectionId, schoolId }) 
    .populate('homeroomTeacherId', 'name email phoneNumber photo')
    .populate({
      path: 'classId', 
      select: 'name numericLevel subjects', 
      populate: { 
        path: 'subjects', 
        select: 'name code category' 
      }
    }) 
    .populate({
      path: 'subjectTeachers.subjectId',
      select: 'name code'
    })
    .populate({
      path: 'subjectTeachers.teacherId',
      select: 'name email photo'
    });
};

module.exports = {
  createClass, 
  getAllClasses,
  createSubject,
  getAllSubjects,
  assignSubjectsToClass, 
  createSection, 
  getAllSections,
  assignHomeroomTeacher,
  assignSubjectTeacher,
  getFullSectionDetails 
};