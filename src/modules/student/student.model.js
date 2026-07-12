// student.model.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const studentSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      unique: true,
      sparse: true 
    },
    schoolId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'School', 
      required: [true, 'Student must be explicitly mapped to a registered school'],
      index: true
    },
    studentIdNumber: { type: String, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: ['Male', 'Female'] },
      
    photo: { type: String, default: 'default-avatar.png' },
    email: { 
      type: String, 
      required: [true, 'Student email address is required'], 
      trim: true, 
      lowercase: true 
    },
    classId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Class', 
      required: [true, 'Student must be assigned to an academic class tier'] 
    },
    sectionId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Section', 
      required: [true, 'Student must be mapped to a specific active class section'] 
    },
    status: { type: String, enum: ['Pending', 'Active'], default: 'Pending' },
    invitationToken: { type: String, select: false },
    invitationExpires: { type: Date, index: true },
    guardian: {
      fatherName: { type: String, trim: true },
      motherName: { type: String, trim: true },
      primaryContactPhone: {
        type: String,
        required: true,
        validate: {
          validator: function(v) { return /^0[1-9]\d{8}$/.test(v); },
          message: props => `${props.value} must be a 10-digit number starting with 0.`
        }
      }
    }
  },
  { timestamps: true }
);

studentSchema.index({ schoolId: 1, email: 1 }, { unique: true });
studentSchema.index({ schoolId: 1, classId: 1, sectionId: 1 });

studentSchema.pre('save', function () {
  if (!this.studentIdNumber) {
    const uniqueHash = crypto.randomBytes(4).toString('hex').toUpperCase();
    this.studentIdNumber = `ST-${uniqueHash}`;
  }
});

module.exports = mongoose.model('Student', studentSchema);