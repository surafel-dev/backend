const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const attendanceService = require('./attendance.service');
const { protect, restrictTo } = require('../../middleware/authMiddleware');

/**
 * @route   POST /api/attendance/submit
 * @desc    Submit or update daily attendance sheet for a specific section
 * @access  Private (Admin, Teacher)
 */
router.post(
  '/submit',
  protect,
  restrictTo('admin', 'teacher'), // Granting bouncer access to admins and teachers
  asyncHandler(async (req, res) => {
    const { schoolId, _id: teacherId } = req.user; // <-- FIX: Pulled correct Mongoose _id parameter mapping context from token payload
    const { sectionId, date, records } = req.body;

    if (!sectionId || !date || !Array.isArray(records) || records.length === 0) {
      res.status(400);
      throw new Error('Section ID, Date, and a valid student records array are required.');
    }

    const attendanceSheet = await attendanceService.submitAttendance(schoolId, teacherId, {
      sectionId,
      date,
      records
    });

    res.status(200).json({
      success: true,
      message: 'Attendance registry updated successfully.',
      data: attendanceSheet
    });
  })
);

module.exports = router;