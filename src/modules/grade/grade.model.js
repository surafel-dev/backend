const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  academicYear: { type: String, required: true }, // e.g., "2018 E.C."
  term: { type: String, required: true },         // e.g., "Semester 1"
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  assessments: [
    {
      assessmentName: { type: String, required: true }, // e.g., "Quiz 1"
      weight: { type: Number, required: true },          // Max marks allocation %
      scoreAchieved: { type: Number, required: true }    // Student's score
    }
  ],
  totalAccumulatedMarks: { type: Number, default: 0 },
  totalPossibleWeight: { type: Number, default: 0 },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Strict multi-tenant compound unique index
GradeSchema.index({ schoolId: 1, academicYear: 1, term: 1, studentId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('Grade', GradeSchema);