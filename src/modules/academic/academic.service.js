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
 * Update a Class tier's editable fields (name, numericLevel)
 */
const updateClass = async (schoolId, classId, updates) => {
  const allowedUpdates = {};
  if (updates.name !== undefined) allowedUpdates.name = updates.name;
  if (updates.numericLevel !== undefined) allowedUpdates.numericLevel = updates.numericLevel;

  if (Object.keys(allowedUpdates).length === 0) {
    const error = new Error('No valid fields provided to update.');
    error.statusCode = 400;
    throw error;
  }

  // If renaming, make sure the new name doesn't collide with another class in this school
  if (allowedUpdates.name) {
    const duplicate = await Class.findOne({
      schoolId,
      name: allowedUpdates.name,
      _id: { $ne: classId }
    });
    if (duplicate) {
      const error = new Error(`Class tier "${allowedUpdates.name}" already exists in your school.`);
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedClass = await Class.findOneAndUpdate(
    { _id: classId, schoolId },
    { $set: allowedUpdates },
    { returnDocument: 'after', runValidators: true }
  ).populate('subjects', 'name code');

  if (!updatedClass) {
    const error = new Error('Class tier not found.');
    error.statusCode = 404;
    throw error;
  }

  return updatedClass;
};

/**
 * Delete a Class tier, blocking the operation if Sections still reference it
 */
const deleteClass = async (schoolId, classId) => {
  const dependentSection = await Section.findOne({ schoolId, classId });
  if (dependentSection) {
    const error = new Error('Cannot delete this class tier while sections are still assigned to it.');
    error.statusCode = 400;
    throw error;
  }

  const deletedClass = await Class.findOneAndDelete({ _id: classId, schoolId });

  if (!deletedClass) {
    const error = new Error('Class tier not found.');
    error.statusCode = 404;
    throw error;
  }

  return deletedClass;
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

/**
 * Update a Section's editable fields (name, roomNumber, capacity, classId, homeroomTeacherId)
 */
const updateSection = async (schoolId, sectionId, updates) => {
  const allowedFields = ['name', 'roomNumber', 'capacity', 'classId', 'homeroomTeacherId'];
  const allowedUpdates = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) allowedUpdates[field] = updates[field];
  });

  if (Object.keys(allowedUpdates).length === 0) {
    const error = new Error('No valid fields provided to update.');
    error.statusCode = 400;
    throw error;
  }

  // If moving to a different class, confirm the new class actually exists in this school
  if (allowedUpdates.classId) {
    const parentClass = await Class.findOne({ _id: allowedUpdates.classId, schoolId });
    if (!parentClass) {
      const error = new Error('Target Class tier does not exist under your institution.');
      error.statusCode = 404;
      throw error;
    }
  }

  // If renaming or reassigning class, make sure name stays unique within the class tier
  if (allowedUpdates.name || allowedUpdates.classId) {
    const existingSection = await Section.findOne({ _id: sectionId, schoolId });
    if (!existingSection) {
      const error = new Error('Section not found.');
      error.statusCode = 404;
      throw error;
    }
    const nameToCheck = allowedUpdates.name || existingSection.name;
    const classToCheck = allowedUpdates.classId || existingSection.classId;
    const duplicate = await Section.findOne({
      schoolId,
      classId: classToCheck,
      name: nameToCheck,
      _id: { $ne: sectionId }
    });
    if (duplicate) {
      const error = new Error(`Section "${nameToCheck}" is already taken in this class tier.`);
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedSection = await Section.findOneAndUpdate(
    { _id: sectionId, schoolId },
    { $set: allowedUpdates },
    { returnDocument: 'after', runValidators: true }
  )
    .populate('classId', 'name numericLevel')
    .populate('homeroomTeacherId', 'name email photo');

  if (!updatedSection) {
    const error = new Error('Section not found.');
    error.statusCode = 404;
    throw error;
  }

  return updatedSection;
};

/**
 * Delete a Section
 */
const deleteSection = async (schoolId, sectionId) => {
  const deletedSection = await Section.findOneAndDelete({ _id: sectionId, schoolId });

  if (!deletedSection) {
    const error = new Error('Section not found.');
    error.statusCode = 404;
    throw error;
  }

  return deletedSection;
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
 * Update a Subject's editable fields (name, code, category, type, isActive)
 */
const updateSubject = async (schoolId, subjectId, updates) => {
  const allowedFields = ['name', 'code', 'category', 'type', 'isActive'];
  const allowedUpdates = {};
  allowedFields.forEach((field) => {
    if (updates[field] !== undefined) allowedUpdates[field] = updates[field];
  });

  if (allowedUpdates.code) {
    allowedUpdates.code = allowedUpdates.code.toUpperCase();
  }

  if (Object.keys(allowedUpdates).length === 0) {
    const error = new Error('No valid fields provided to update.');
    error.statusCode = 400;
    throw error;
  }

  if (allowedUpdates.code) {
    const duplicateCode = await Subject.findOne({
      schoolId,
      code: allowedUpdates.code,
      _id: { $ne: subjectId }
    });
    if (duplicateCode) {
      const error = new Error(`Subject with code "${allowedUpdates.code}" already exists.`);
      error.statusCode = 400;
      throw error;
    }
  }

  if (allowedUpdates.name) {
    const duplicateName = await Subject.findOne({
      schoolId,
      name: allowedUpdates.name,
      _id: { $ne: subjectId }
    });
    if (duplicateName) {
      const error = new Error(`Subject named "${allowedUpdates.name}" already exists.`);
      error.statusCode = 400;
      throw error;
    }
  }

  const updatedSubject = await Subject.findOneAndUpdate(
    { _id: subjectId, schoolId },
    { $set: allowedUpdates },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updatedSubject) {
    const error = new Error('Subject not found.');
    error.statusCode = 404;
    throw error;
  }

  return updatedSubject;
};

/**
 * Delete a Subject and detach it from any Class tiers and Section subjectTeachers
 * that currently reference it
 */
const deleteSubject = async (schoolId, subjectId) => {
  const deletedSubject = await Subject.findOneAndDelete({ _id: subjectId, schoolId });

  if (!deletedSubject) {
    const error = new Error('Subject not found.');
    error.statusCode = 404;
    throw error;
  }

  // Clean up references so no dangling ObjectIds are left behind
  await Class.updateMany(
    { schoolId, subjects: subjectId },
    { $pull: { subjects: subjectId } }
  );
  await Section.updateMany(
    { schoolId, 'subjectTeachers.subjectId': subjectId },
    { $pull: { subjectTeachers: { subjectId } } }
  );

  return deletedSubject;
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
  updateClass,
  deleteClass,
  createSubject,
  getAllSubjects,
  updateSubject,
  deleteSubject,
  assignSubjectsToClass, 
  createSection, 
  getAllSections,
  updateSection,
  deleteSection,
  assignHomeroomTeacher,
  assignSubjectTeacher,
  getFullSectionDetails 
};