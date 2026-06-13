const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: [true, 'Student must have a linked system user account'], 
      unique: true 
    },
    school: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'School', 
      required: [true, 'Student must be explicitly mapped to a registered school'] 
    },
    studentIdNumber: { type: String, required: true, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: { type: String, required: true, enum: ['Male', 'Female'] },
    gradeLevel: { type: Number, required: true, min: 1, max: 12 },
    section: { type: String, required: true, trim: true, uppercase: true },
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

module.exports = mongoose.model('Student', studentSchema);