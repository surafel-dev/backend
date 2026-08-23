const cron = require('node-cron');
const Student = require('../../modules/student/student.model');
const Teacher = require('../../modules/teacher/teacher.model');

// Pending students/teachers never get a `userId` set — that only happens on
// acceptance (see acceptStudentInvitation / acceptTeacherInvitation). So a
// still-Pending record past its invitationExpires has no linked User
// account to clean up; deleting the record directly is safe and complete.
const purgeExpiredInvitations = async () => {
  const now = new Date();
  const expiredFilter = { status: 'Pending', invitationExpires: { $lt: now } };

  const [expiredStudents, expiredTeachers] = await Promise.all([
    Student.find(expiredFilter).select('_id email schoolId'),
    Teacher.find(expiredFilter).select('_id email schoolId'),
  ]);

  if (expiredStudents.length > 0) {
    await Student.deleteMany({ _id: { $in: expiredStudents.map((s) => s._id) } });
    console.log(
      `🧹 Purged ${expiredStudents.length} expired student invitation(s): ` +
      expiredStudents.map((s) => s.email).join(', ')
    );
  }

  if (expiredTeachers.length > 0) {
    await Teacher.deleteMany({ _id: { $in: expiredTeachers.map((t) => t._id) } });
    console.log(
      `🧹 Purged ${expiredTeachers.length} expired teacher invitation(s): ` +
      expiredTeachers.map((t) => t.email).join(', ')
    );
  }

  return {
    studentsRemoved: expiredStudents.length,
    teachersRemoved: expiredTeachers.length,
  };
};

// Runs once an hour. Invitations last 48 hours, so there's no need for
// finer granularity — worst case, an already-expired invite sits around
// for up to an hour before being purged, which is harmless.
const startInvitationCleanupJob = () => {
  cron.schedule('0 * * * *', () => {
    purgeExpiredInvitations().catch((err) => {
      console.error('❌ Invitation cleanup job failed:', err);
    });
  });

  console.log('🧹 Invitation cleanup job scheduled (runs hourly).');
};

module.exports = { startInvitationCleanupJob, purgeExpiredInvitations };