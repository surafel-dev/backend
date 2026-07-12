const express = require('express');
const router = express.Router();
const { inviteStaff, acceptInvite } = require('./staff.controller');
const { uploadPhoto } = require('../../utils/imageProcessor');
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// Route for sending staff registration invitations
router.post(
  '/invite', 
  protect, 
  restrictTo('super-admin', 'admin'), 
  uploadPhoto,
  inviteStaff
);

// Public access route for resolving invitation forms
router.post('/accept-invite/:token', acceptInvite);

module.exports = router;