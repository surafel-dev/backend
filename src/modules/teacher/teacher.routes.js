const express = require('express');
const router = express.Router();
const { inviteTeacher, acceptInvite, assignClassSubject  } = require('./teacher.controller');
const { uploadPhoto } = require('../../utils/imageProcessor'); 
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// Public registration entry point
router.post('/accept-invite/:token', acceptInvite);

// Multi-tenant authorization gateways (with photo upload middleware injected)
router.post(
  '/invite', 
  protect, 
  restrictTo('admin', 'hr', 'super-admin'), 
  uploadPhoto, 
  inviteTeacher
);

router.post(
  '/:id/assign', 
  protect, 
  restrictTo('admin', 'hr', 'super-admin'), 
  assignClassSubject
);

module.exports = router;