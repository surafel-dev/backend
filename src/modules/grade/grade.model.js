// modules/grade/grade.model.js
const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  academicYear: { 
    type: String, 
    required: true 
  },
  term: { 
    type: String, 
    required: true 
  },
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
      assessmentName: { type: String, required: true },
      weight: { type: Number, required: true },          
      scoreAchieved: { type: Number, required: true }    
    }
  ],
  totalAccumulatedMarks: { 
    type: Number, 
    default: 0 
  },
  totalPossibleWeight: { 
    type: Number, 
    default: 0 
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Enforce a strict multi-tenant unique rule: a student can only have one grade profile sheet per subject, per term, per year
GradeSchema.index({ schoolId: 1, academicYear: 1, term: 1, studentId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('Grade', GradeSchema);