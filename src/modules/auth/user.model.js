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
      required: false,
      minlength: 6, 
      select: false 
    },
    googleId: { 
      type: String, 
      unique: true, 
      sparse: true
    },
    role: { 
      type: String, 
      required: true, 
      enum: ['super-admin', 'admin', 'academic_vp', 'hr', 'registrar', 'teacher', 'student', 'parent'] 
    },
    schoolId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'School',
      required: false,
      // Custom validation: schoolId is required for all roles except super-admin
      validate: {
        validator: function(value) {
          // If user is super-admin, schoolId can be null
          if (this.role === 'super-admin') {
            return true;
          }
          // For all other roles, schoolId must be a valid ObjectId
          return value && mongoose.Types.ObjectId.isValid(value);
        },
        message: 'School ID is required for non-super-admin users'
      }
    },
    isActive: { 
      type: Boolean, 
      default: true 
    }
  },
  { 
    timestamps: true,
    // Add index for better query performance
    indexes: [
      { fields: { schoolId: 1, role: 1 } },
      { fields: { email: 1 } }
    ]
  }
);

// Password hashing pre-save hook
userSchema.pre('save', async function () {
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

// Static method to find users by school
userSchema.statics.findBySchool = function(schoolId) {
  return this.find({ schoolId, isActive: true });
};

// Method to check if user belongs to a school
userSchema.methods.belongsToSchool = function(schoolId) {
  if (this.role === 'super-admin') return true;
  return this.schoolId && this.schoolId.toString() === schoolId.toString();
};

module.exports = mongoose.model('User', userSchema);