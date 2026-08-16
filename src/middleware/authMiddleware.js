const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../modules/auth/user.model');
const mongoose = require('mongoose');

/**
 * Custom error class for consistent error handling
 */
class APIError extends Error {
   constructor(message, statusCode, code = 'API_ERROR', details = null) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
      this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
   }
}

/**
 * Protect middleware - authenticates user and attaches to req
 */
const protect = asyncHandler(async (req, res, next) => {
   let token;

   // Check for token in the Authorization header
   if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
   ) {
      token = req.headers.authorization.split(' ')[1];
   }

   // Also check cookies (optional, for additional security)
   if (!token && req.cookies?.token) {
      token = req.cookies.token;
   }

   if (!token) {
      res.status(401);
      throw new APIError('Not authorized, no token provided', 401, 'AUTH_TOKEN_MISSING');
   }

   try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const currentUser = await User.findById(decoded.id).select('-password');
      
      if (!currentUser) {
         res.status(401);
         throw new APIError('The user belonging to this token no longer exists.', 401, 'USER_NOT_FOUND');
      }

      if (!currentUser.isActive) {
         res.status(401);
         throw new APIError('This user account has been deactivated.', 401, 'USER_DEACTIVATED');
      }

      // Attach user to request
      req.user = currentUser;

      // --- SCHOOL CONTEXT VALIDATION ---
      // For non-super-admin users, validate they have a schoolId
      if (currentUser.role !== 'super-admin') {
         if (!currentUser.schoolId) {
            // Log this for monitoring
            console.warn(`User ${currentUser._id} (${currentUser.email}) has no schoolId assigned`);
            
            // Throw error if schoolId is required
            res.status(400);
            throw new APIError(
               'User account is not associated with any school. Please contact your administrator.',
               400,
               'SCHOOL_CONTEXT_ERROR'
            );
         }

         // Validate schoolId format
         if (!mongoose.Types.ObjectId.isValid(currentUser.schoolId)) {
            res.status(400);
            throw new APIError(
               'Invalid school ID format in user profile. Please contact your administrator.',
               400,
               'SCHOOL_CONTEXT_ERROR'
            );
         }

         // Optional: Verify school actually exists (would need School model)
         // const school = await School.findById(currentUser.schoolId);
         // if (!school) {
         //    res.status(400);
         //    throw new APIError('Associated school not found.', 400, 'SCHOOL_NOT_FOUND');
         // }
      }

      // Attach validated schoolId to request for easy access
      req.schoolId = currentUser.schoolId || null;
      req.userSchoolId = currentUser.schoolId || null;

      return next();
   } catch (error) {
      // Handle JWT specific errors
      if (error.name === 'JsonWebTokenError') {
         res.status(401);
         throw new APIError('Invalid token signature', 401, 'INVALID_TOKEN');
      }
      if (error.name === 'TokenExpiredError') {
         res.status(401);
         throw new APIError('Your session has expired. Please log in again', 401, 'TOKEN_EXPIRED');
      }
      
      // Re-throw other errors
      throw error;
   }
});

/**
 * Restrict to specific roles
 * @param {...string} allowedRoles - List of allowed roles
 */
const restrictTo = (...allowedRoles) => {
   return (req, res, next) => {
      if (!req.user) {
         res.status(401);
         throw new APIError('Not authorized, user not found', 401, 'UNAUTHORIZED');
      }

      if (!allowedRoles.includes(req.user.role)) {
         res.status(403);
         throw new APIError(
            `Forbidden: Your role (${req.user?.role || 'Guest'}) does not have permission. Required roles: ${allowedRoles.join(', ')}`,
            403,
            'INSUFFICIENT_ROLE'
         );
      }
      next();
   };
};

/**
 * Validate school context for routes that need it
 * This middleware should be used after protect
 */
const validateSchoolContext = asyncHandler(async (req, res, next) => {
   const user = req.user;
   
   // Super-admin can bypass school validation
   if (user.role === 'super-admin') {
      return next();
   }

   // Check if user has a schoolId
   if (!user.schoolId) {
      res.status(400);
      throw new APIError(
         'User is not associated with any school. Please contact your administrator.',
         400,
         'SCHOOL_CONTEXT_ERROR'
      );
   }

   // Validate schoolId format
   if (!mongoose.Types.ObjectId.isValid(user.schoolId)) {
      res.status(400);
      throw new APIError(
         'Invalid school ID format. Please contact your administrator.',
         400,
         'SCHOOL_CONTEXT_ERROR'
      );
   }

   // Optional: Check if school exists
   // const School = require('../modules/school/school.model');
   // const school = await School.findById(user.schoolId);
   // if (!school) {
   //    res.status(400);
   //    throw new APIError('Associated school not found.', 400, 'SCHOOL_NOT_FOUND');
   // }

   // Attach validated schoolId to request
   req.schoolId = user.schoolId;
   req.validatedSchoolId = user.schoolId;
   
   next();
});

/**
 * Resolves req.schoolId for a request, once, in one place.
 *
 * Resolution order:
 *   1. Look through `priority` sources (body/query/params) for a valid ObjectId.
 *   2. If none found and the caller isn't a super-admin, fall back to their
 *      own account's schoolId (fallbackToUser).
 *   3. If still unresolved and `required` is true, reject with a clear,
 *      role-aware message. If `required` is false, req.schoolId is left
 *      `undefined` — NOT `null` — so downstream Mongoose queries that build
 *      `{ schoolId }` filters simply omit the key instead of matching
 *      documents where schoolId is literally null.
 *
 * Use `required: true` for anything that creates/updates/deletes a single
 * record. Use `required: false` for list/browse endpoints where a
 * super-admin omitting schoolId legitimately means "show me everything".
 */
const extractSchoolId = (options = {}) => {
  const {
    required = true,
    fallbackToUser = true,
    priority = ['body', 'query', 'params'],
  } = options;

  return asyncHandler(async (req, res, next) => {
    const user = req.user;
    let schoolId;

    for (const sourceType of priority) {
      const candidate = req[sourceType]?.schoolId;
      if (candidate && mongoose.Types.ObjectId.isValid(candidate)) {
        schoolId = candidate;
        break;
      }
    }

    if (!schoolId && fallbackToUser && user && user.role !== 'super-admin') {
      schoolId = user.schoolId || undefined;
    }

    if (required && (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId))) {
      const isSuperAdmin = user?.role === 'super-admin';
      const message = isSuperAdmin
        ? 'Super-admin must specify a valid schoolId in the request body, query string, or route params.'
        : !user?.schoolId
          ? 'User is not associated with any school. Please contact your administrator.'
          : 'A valid school ID is required.';

      res.status(400);
      throw new APIError(message, 400, 'SCHOOL_CONTEXT_ERROR');
    }

    req.schoolId = schoolId;
    req.schoolContext = {
      id: schoolId,
      isSuperAdmin: user?.role === 'super-admin',
      source: schoolId && user?.schoolId && schoolId.toString() === user.schoolId.toString()
        ? 'user'
        : 'request',
    };

    next();
  });
};

module.exports = { 
   protect, 
   restrictTo, 
   validateSchoolContext,
   extractSchoolId,
   APIError 
};