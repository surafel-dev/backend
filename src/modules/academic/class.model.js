const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  schoolId: { // Aligned to your middleware
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  name: { type: String, required: true, trim: true },
  numericLevel: { type: Number, required: true },
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }]
}, { timestamps: true });

classSchema.index({ schoolId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Class', classSchema);