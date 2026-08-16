// middleware/schoolContextMiddleware.js

const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const { APIError } = require('./authMiddleware');

/**
 * Middleware to verify user has access to the requested school
 * Must be used after protect and extractSchoolId
 */
const verifySchoolAccess = asyncHandler(async (req, res, next) => {
   const user = req.user;
   const schoolId = req.schoolId;

   // Super-admin can access any school
   if (user.role === 'super-admin') {
      return next();
   }

   // Non-super-admin must have a schoolId
   if (!user.schoolId) {
      res.status(400);
      throw new APIError(
         'User is not associated with any school.',
         400,
         'SCHOOL_CONTEXT_ERROR'
      );
   }

   // Verify user belongs to the requested school
   if (schoolId && user.schoolId.toString() !== schoolId.toString()) {
      res.status(403);
      throw new APIError(
         'You do not have permission to access this school\'s data.',
         403,
         'SCHOOL_ACCESS_DENIED'
      );
   }

   // If no schoolId was specified, use user's schoolId
   if (!schoolId) {
      req.schoolId = user.schoolId;
   }

   next();
});

/**
 * Middleware to ensure school exists in the database
 * Optional - use if you want to verify school existence
 */
const ensureSchoolExists = asyncHandler(async (req, res, next) => {
   const schoolId = req.schoolId;
   
   if (!schoolId) {
      return next();
   }

   // Dynamic import to avoid circular dependencies
   const School = require('../modules/school/school.model');
   const school = await School.findById(schoolId);
   
   if (!school) {
      res.status(404);
      throw new APIError('School not found', 404, 'SCHOOL_NOT_FOUND');
   }

   req.school = school;
   next();
});

module.exports = {
   verifySchoolAccess,
   ensureSchoolExists
};