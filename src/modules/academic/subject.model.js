const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    // Multi-tenant isolation
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },
    // e.g., "Mathematics", "Amharic", "Introduction to Marketing"
    name: {
      type: String,
      required: true,
      trim: true
    },
    // unique code identification (e.g., "MATH-G9", "AMH-G12")
    code: {
      type: String,
      required: true,
      trim: true
    },
    // Classification of the subject (helps with report card grouping)
    category: {
      type: String,
      enum: ['Natural Science', 'Social Science', 'Language', 'Commercial/Vocational', 'General'],
      default: 'General'
    },
    // Optional: Is this a core requirement or an elective?
    type: {
      type: String,
      enum: ['Core', 'Elective'],
      default: 'Core'
    },
    // Useful for academic tracking systems to toggle active curriculum without deleting data
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate subject codes within the same school
subjectSchema.index({ tenantId: 1, code: 1 }, { unique: true });
// Prevent identical subject names within the same school
subjectSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Subject = mongoose.model('Subject', subjectSchema);

module.exports = Subject;