const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../modules/auth/user.model');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in the Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extract token from header ("Bearer <token>")
    token = req.headers.authorization.split(' ')[1];

    // Verify token signatures against your environment secret
    // If jwt.verify fails, it throws an error which asyncHandler catches instantly
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id).select('-password');
    req.user = currentUser;
    
    if (!currentUser) {
      res.status(401);
      throw new Error('The user belonging to this token no longer exists.');
    }

    if (!currentUser.isActive) {
      res.status(401);
      throw new Error('This user account has been deactivated.');
    }

    // Attach the actual, clean database document to req.user
    req.user = currentUser;

    return next();
  }

  // If no token was found in the header at all
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
});


const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403); // Forbidden
      throw new Error(`Forbidden: Your role (${req.user?.role || 'Guest'}) does not have permission`);
    }
    next();
  };
};

module.exports = { protect, restrictTo };