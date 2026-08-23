const express = require('express');
const router = express.Router();
const {
  inviteTeacher,
  acceptInvite,
  assignClassSubject,
  getAllTeachers,
  getAcceptedTeachers,
  revokeAccess,
  updateTeacher
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

router.put(
  '/update/:id',
  protect,
  restrictTo('admin', 'super-admin'),
  uploadPhoto,
  extractSchoolId({ required: true }),
  verifySchoolAccess,
  updateTeacher
);

module.exports = router;