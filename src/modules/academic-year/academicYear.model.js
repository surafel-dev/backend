// academicYear.model.js
const mongoose = require('mongoose');

const TermSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true }
});

const AcademicYearSchema = new mongoose.Schema({
  schoolId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'School', 
    required: true, 
    index: true 
  },
  title: { type: String, required: true }, 
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  terms: [TermSchema],
  isActive: { type: Boolean, default: false }
}, { timestamps: true });


AcademicYearSchema.index(
  { schoolId: 1, isActive: 1 }, 
  { unique: true, partialFilterExpression: { isActive: true } }
);

const AcademicYear = mongoose.model('AcademicYear', AcademicYearSchema);

module.exports = {
  AcademicYear
};