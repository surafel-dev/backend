const express = require('express');
const router = express.Router();
const { inviteTeacher, acceptInvite, assignClassSubject, getAllTeachers, getAcceptedTeachers, revokeAccess } = require('./teacher.controller');
const { uploadPhoto } = require('../../utils/imageProcessor'); 
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// Public registration entry point
router.post('/accept-invite/:token', acceptInvite);

router.get(
  '/',
  protect,
  restrictTo('admin', 'hr', 'super-admin'),
  getAllTeachers
);

// Only teachers who have accepted their invite (status: 'Active')
router.get(
  '/accepted',
  protect,
  restrictTo('admin', 'hr', 'super-admin'),
  getAcceptedTeachers
);

// Multi-tenant authorization gateways (with photo upload middleware injected)
router.post(
  '/invite', 
  protect, 
  restrictTo('admin', 'super-admin'), 
  uploadPhoto, 
  inviteTeacher
);

router.post(
  '/:id/assign', 
  protect, 
  restrictTo('admin', 'hr', 'super-admin'), 
  assignClassSubject
);

router.post(
  '/:id/revoke',
  protect,
  restrictTo('admin', 'super-admin'),
  revokeAccess
);

module.exports = router;