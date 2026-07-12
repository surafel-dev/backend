const Class = require('./class.model'); //[cite: 2]
const Section = require('./section.model'); //[cite: 2]
const Subject = require('./subject.model'); //[cite: 2]

const createClass = async (schoolId, classData) => {
  // Check if a class with the same name already exists in this school[cite: 2]
  const existingClass = await Class.findOne({ schoolId, name: classData.name }); //[cite: 2]
  if (existingClass) { //[cite: 2]
    const error = new Error(`Class tier "${classData.name}" already exists in your school.`); //[cite: 2]
    error.statusCode = 400; //[cite: 2]
    throw error; //[cite: 2]
  } //[cite: 2]

  const newClass = new Class({ //[cite: 2]
    ...classData, //[cite: 2]
    schoolId //[cite: 2]
  }); //[cite: 2]

  return await newClass.save(); //[cite: 2]
};

/**
 * Create a section mapped to a verified parent class under a specific school[cite: 2]
 */
const createSection = async (schoolId, classId, sectionData) => {
  const parentClass = await Class.findOne({ _id: classId, schoolId }); //[cite: 2]
  if (!parentClass) { //[cite: 2]
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

  const newSection = new Section({ //[cite: 2]
    ...sectionData, //[cite: 2]
    classId, //[cite: 2]
    schoolId //[cite: 2]
  }); //[cite: 2]

  return await newSection.save(); //[cite: 2]
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

  const newSubject = new Subject({ //[cite: 2]
    ...subjectData, //[cite: 2]
    code: subjectData.code.toUpperCase(), // Normalize code to uppercase[cite: 2]
    schoolId //[cite: 2]
  }); //[cite: 2]

  return await newSubject.save(); //[cite: 2]
};

/**
 * Link an array of subjects to a Class tier under a specific school[cite: 2]
 */
const assignSubjectsToClass = async (schoolId, classId, subjectIds) => {
  const updatedClass = await Class.findOneAndUpdate(
    { _id: classId, schoolId }, //[cite: 2]
    { $addToSet: { subjects: { $each: subjectIds } } }, //[cite: 2]
    { returnDocument: 'after' } //[cite: 2]
  ).populate('subjects'); //[cite: 2]

  if (!updatedClass) { //[cite: 2]
    const error = new Error('Target Class tier not found.'); //[cite: 2]
    error.statusCode = 404; //[cite: 2]
    throw error; //[cite: 2]
  } //[cite: 2]

  return updatedClass; //[cite: 2]
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
 * Fetch deep populated Class and Subject references for a Section[cite: 2]
 */
const getFullSectionDetails = async (schoolId, sectionId) => {
  return await Section.findOne({ _id: sectionId, schoolId }) //[cite: 2]
    .populate('homeroomTeacherId', 'name email phoneNumber photo')
    .populate({ //[cite: 2]
      path: 'classId', //[cite: 2]
      select: 'name numericLevel subjects', //[cite: 2]
      populate: { //[cite: 2]
        path: 'subjects', //[cite: 2]
        select: 'name code category' //[cite: 2]
      } //[cite: 2]
    }) //[cite: 2]
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
  createClass, //[cite: 2]
  createSubject, //[cite: 2]
  assignSubjectsToClass, //[cite: 2]
  createSection, //[cite: 2]
  assignHomeroomTeacher,
  assignSubjectTeacher,
  getFullSectionDetails //[cite: 2]
};