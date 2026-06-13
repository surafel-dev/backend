const mongoose = require('mongoose');

const studentAttendanceSchema = new mongoose.Schema(
  {
    // Multi-tenant isolation field
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },
    // The specific class/academic division
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true
    },
    // Optional: Section tracking (e.g., Grade 12N, Section B)
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true
    },
    // Optional: For period-by-period tracking. Leave null for daily tracking.
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null
    },
    // The specific date of the attendance (normalized to YYYY-MM-DD or start of day)
    date: {
      type: Date,
      required: true,
      index: true
    },
    // Array of student records for that specific class and day
    records: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true
        },
        status: {
          type: String,
          required: true,
          enum: ['Present', 'Absent', 'Late', 'Excused'],
          default: 'Present'
        },
        remarks: {
          type: String,
          trim: true,
          maxlength: 150
        }
      }
    ],
    // Audit trail tracking
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Refers to the Teacher or Admin who took attendance
      required: true
    }
  },
  {
    timestamps: true // Automatically manages createdAt and updatedAt
  }
);

// Compound Index to prevent duplicate attendance rosters for the same class/subject on the same day
studentAttendanceSchema.index({ tenantId: 1, classId: 1, date: 1, subjectId: 1 }, { unique: true });

const StudentAttendance = mongoose.model('StudentAttendance', studentAttendanceSchema);

module.exports = StudentAttendance;