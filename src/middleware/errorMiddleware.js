const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
   let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
   let message = err.message;

   if (err.name === 'CastError' && err.kind === 'ObjectId') {
       statusCode = 404;
       message = 'Resource not found';
   }

   // Explicit overrides for native JWT library errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token signature';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please log in again';
  }

   res.status(statusCode).json({
       message,
       stack: process.env.NODE_ENV === 'production' ? null : err.stack,
   });
};

module.exports = { notFound, errorHandler };