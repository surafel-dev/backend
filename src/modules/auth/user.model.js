const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, required: true, enum: ['admin', 'teacher', 'student', 'parent'] },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Automatic password hashing hook run right before save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);