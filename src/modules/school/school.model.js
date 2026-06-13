const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'School name is required'],
      unique: true,
      trim: true
    },
    schoolCode: {
      type: String,
      required: [true, 'Unique school code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    address: {
      city: { type: String, required: true },
      region: { type: String, required: true }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('School', schoolSchema);