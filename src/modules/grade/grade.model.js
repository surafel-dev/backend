const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'School',
    required: true,
    index: true
  },
  academicYear: { 
    type: String, 
    required: true 
  },
  term: { 
    type: String, 
    required: true 
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },
  assessments: [
    {
      assessmentName: { type: String, required: true },
      weight: {
        type: Number,
        required: true,
        min: [0, 'Assessment weight cannot be negative']
      },
      scoreAchieved: {
        type: Number,
        required: true,
        min: [0, 'Score cannot be negative'],
        validate: {
          validator: function (value) {
            // `this` is the assessment subdocument, so its own `weight` is
            // already resolved here — no need to reach into the parent.
            return value <= this.weight;
          },
          message: (props) => `Score achieved (${props.value}) cannot exceed the assessment's weight.`
        }
      }
    }
  ],
  totalAccumulatedMarks: { 
    type: Number, 
    default: 0 
  },
  totalPossibleWeight: { 
    type: Number, 
    default: 0 
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Draft grades are only visible to staff (teacher/admin/etc.) — students
  // and parents only ever see Published grades via the report card. Once
  // Published, only an admin/super-admin can edit (see grade.service.js);
  // a teacher would need an admin to unlock it first.
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Draft',
    index: true
  },
  remarks: {
    type: String,
    trim: true,
    maxlength: 500
  },
  // Append-only audit trail. Populated automatically whenever an existing
  // grade record is overwritten via bulkUpsertGrades — never written to
  // directly.
  history: [
    {
      _id: false,
      editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      editedAt: { type: Date, default: Date.now },
      previousAssessments: { type: mongoose.Schema.Types.Mixed },
      previousTotalAccumulatedMarks: Number,
      previousTotalPossibleWeight: Number
    }
  ]
}, { timestamps: true });

// Enforce a strict multi-tenant unique rule: a student can only have one grade profile sheet per subject, per term, per year
GradeSchema.index({ schoolId: 1, academicYear: 1, term: 1, studentId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model('Grade', GradeSchema);