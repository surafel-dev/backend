const mongoose = require('mongoose');
const crypto = require('crypto');

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
    createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

schoolSchema.pre('save', function () {
  if (!this.schoolCode) {
    const uniqueHash = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.schoolCode = `SC-${uniqueHash}`;
  }
});

module.exports = mongoose.model('School', schoolSchema);