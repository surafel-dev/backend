const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  schoolId: { // Aligned to your middleware[cite: 4]
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true, index: true }, //[cite: 4]
  name: { type: String, required: true, trim: true }, // e.g., "N"[cite: 4]
  roomNumber: { type: String, trim: true }, //[cite: 4]
  homeroomTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null }, // Linked directly to Teacher profile container
  capacity: { type: Number, default: 40 }, //[cite: 4]
  // Map subjects to specific teachers cleanly for this section execution framework
  subjectTeachers: [{
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true }
  }]
}, { timestamps: true });

// Prevent duplicate structural indexing allocations
sectionSchema.index({ "subjectTeachers.subjectId": 1 });
sectionSchema.index({ schoolId: 1, classId: 1, name: 1 }, { unique: true }); //[cite: 4]

module.exports = mongoose.model('Section', sectionSchema); 