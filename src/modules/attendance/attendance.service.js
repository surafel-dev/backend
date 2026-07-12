const Attendance = require('./attendance.model');
const Section = require('../academic/section.model');

/**
 * Submit or completely update a daily attendance sheet for a section
 */
const submitAttendance = async (schoolId, teacherId, attendanceData) => {
  const { sectionId, date, records } = attendanceData;

  // 1. Verify the section actually belongs to this school tenant
  const sectionExists = await Section.findOne({ _id: sectionId, schoolId });
  if (!sectionExists) {
    const error = new Error('Target Section configuration not found under your school.');
    error.statusCode = 404;
    throw error;
  }

  // 2. Normalize date to strip hours/minutes/seconds for consistent daily matching
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  // 3. Perform an Upsert operation (Update if exists, Insert if new)
  const savedSheet = await Attendance.findOneAndUpdate(
    { schoolId, sectionId, date: normalizedDate },
    {
      records,
      takenBy: teacherId
    },
    {
      returnDocument: 'after', // Safe modern Mongoose standard[cite: 10]
      upsert: true
    }
  ).populate('records.studentId', 'firstName middleName lastName studentIdNumber photo'); 
  // <-- ALIGNED: Pulls the new schema field properties generated during registration[cite: 10]

  return savedSheet;
};

module.exports = {
  submitAttendance
};