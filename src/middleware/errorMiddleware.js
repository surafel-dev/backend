// middleware/errorMiddleware.js

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
   let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
   let message = err.message;
   let code = err.code || 'INTERNAL_ERROR';
   let details = err.details || null;

   // Handle MongoDB duplicate key error
   if (err.code === 11000) {
      statusCode = 400;
      message = 'Duplicate field value entered.';
      code = 'DUPLICATE_KEY';
      
      // Extract the duplicate field name for better error message
      if (err.keyPattern) {
         const field = Object.keys(err.keyPattern)[0];
         const value = err.keyValue?.[field];
         message = `${field.charAt(0).toUpperCase() + field.slice(1)} "${value}" already exists.`;
      }
   }

   // Handle Mongoose validation errors
   if (err.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(err.errors).map(val => val.message).join(', ');
      code = 'VALIDATION_ERROR';
      details = err.errors;
   }

   // Handle Mongoose CastError (invalid ObjectId)
   if (err.name === 'CastError' && err.kind === 'ObjectId') {
      statusCode = 404;
      message = `Resource not found with id: ${err.value}`;
      code = 'INVALID_ID';
   }

   // Handle JWT errors
   if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token signature';
      code = 'INVALID_TOKEN';
   }
   
   if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Your session has expired. Please log in again';
      code = 'TOKEN_EXPIRED';
   }

   // Handle custom API errors with status codes
   if (err.statusCode) {
      statusCode = err.statusCode;
   }

   // Handle custom error codes
   if (err.code) {
      code = err.code;
   }

   // Handle school context errors specifically
   if (err.code === 'SCHOOL_CONTEXT_ERROR' || message.includes('school')) {
      statusCode = statusCode === 500 ? 400 : statusCode;
      code = 'SCHOOL_CONTEXT_ERROR';
   }

   // Log the error for monitoring (but don't expose sensitive info)
   console.error(`[${new Date().toISOString()}] Error:`, {
      code,
      statusCode,
      message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      userId: req.user?._id,
      role: req.user?.role
   });

   // Send response
   res.status(statusCode).json({
      success: false,
      message,
      code,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
   });
};

module.exports = { notFound, errorHandler };