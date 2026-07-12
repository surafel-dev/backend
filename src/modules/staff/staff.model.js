const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true, // Allows for null values without violating uniqueness
    default: null // Set during transaction activation
  },
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
  role: {
    type: String,
    required: true,
    enum: ['admin', 'hr', 'registrar']
  },
    phoneNumber: {
    type: String,
    trim: true
  },
  photo: {
    type: String,
    default: 'default-avatar.png'
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true }
  },
    bio: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Pending', 'Active'],
    default: 'Pending'
  },
  invitationToken: { 
  type: String, 
  select: false 
},
invitationExpires: { 
  type: Date,
  index: true 
}
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);