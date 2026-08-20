const express = require('express');
const router = express.Router();
const {
  inviteTeacher,
  acceptInvite,
  assignClassSubject,
  getAllTeachers,
  getAcceptedTeachers,
  revokeAccess
} = require('./teacher.controller');
const { uploadPhoto } = require('../../utils/imageProcessor');
const { protect, restrictTo, extractSchoolId } = require('../../middleware/authMiddleware');
const { verifySchoolAccess } = require('../../middleware/schoolContextMiddleware');

// Public registration entry point
router.post('/accept-invite/:token', acceptInvite);

router.get(
  '/',
  protect,
  restrictTo('admin', 'hr', 'super-admin'),
  extractSchoolId({ required: false }),
  verifySchoolAccess,
  getAllTeachers
);

// Only teachers who have accepted their invite (status: 'Active')
router.get(
  '/accepted',
  protect,
  restrictTo('admin', 'hr', 'super-admin'),
  extractSchoolId({ required: false }),
  verifySchoolAccess,
  getAcceptedTeachers
);

// NOTE: uploadPhoto runs BEFORE extractSchoolId here on purpose. This is a
// multipart/form-data request, so req.body.schoolId doesn't exist until
// multer (uploadPhoto) has parsed the form — if extractSchoolId ran first,
// it would never see a super-admin's schoolId field and would silently fall
// through to the "no schoolId" error every time.
router.post(
  '/invite',
  protect,
  restrictTo('admin', 'super-admin'),
  uploadPhoto,
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  inviteTeacher
);

router.post(
  '/:id/assign',
  protect,
  restrictTo('admin', 'hr', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  assignClassSubject
);

router.post(
  '/:id/revoke',
  protect,
  restrictTo('admin', 'super-admin'),
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  revokeAccess
);

module.exports = router;