const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    password: { 
      type: String, 
      required: false, // Remains false to allow invitation creation before password setup
      minlength: 6, 
      select: false 
    },
    role: { 
      type: String, 
      required: true, 
      enum: ['super-admin', 'admin', 'hr', 'registrar', 'teacher', 'student', 'parent'] 
    },
    schoolId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'School', 
      required: false // Stays false so the global super-admin can be null
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { timestamps: true }
);

// Password hashing pre-save hook
userSchema.pre('save', async function () {
  // If password isn't modified or doesn't exist, exit early 
  if (!this.isModified('password') || !this.password) {
    return; 
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to check password validity during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);