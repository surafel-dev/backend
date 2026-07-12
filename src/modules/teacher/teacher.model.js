const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  // Changed to optional initially with sparse: true for the pending invitation state
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phoneNumber: { type: String, trim: true },
  
  photo: { type: String, default: 'default-avatar.png' },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true }
  },
  bio: { type: String, trim: true },
  
  status: { type: String, enum: ['Pending', 'Active'], default: 'Pending' },
  invitationToken: { 
  type: String, 
  select: false 
},
invitationExpires: { 
  type: Date,
  index: true 
},
  
  assignments: [
    {
      classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
      subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true }
    }
  ]
}, { timestamps: true });

TeacherSchema.index({ schoolId: 1, email: 1 }, { unique: true });
TeacherSchema.index({ "assignments.classId": 1, "assignments.subjectId": 1 });

module.exports = mongoose.model('Teacher', TeacherSchema);