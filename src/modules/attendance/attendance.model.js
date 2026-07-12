const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true
  },
  records: [
    {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
      },
      status: {
        type: String,
        enum: ['Present', 'Absent', 'Late', 'Excused'],
        required: true
      },
      remarks: {
        type: String,
        trim: true
      }
    }
  ],
  takenBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Enforce that a section can only have one attendance log sheet per day
attendanceSchema.index({ schoolId: 1, sectionId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);