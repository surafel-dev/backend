// middleware/queryHandler.js
const asyncHandler = require('express-async-handler');

/**
 * Reusable middleware to handle pagination, limiting, and sorting on any Mongoose model.
 * Automatically respects multi-tenant schoolId scope.
 * 
 * @param {Object} model - The Mongoose Model (e.g., Student, Grade)
 * @param {Array|String} populateOptions - Optional relations to populate
 */
const queryHandler = (model, populateOptions = '') => asyncHandler(async (req, res, next) => {
  let query;

  // 1. Enforce Multi-Tenant Scope
  // Copy req.query so we can manipulate it, but always force the schoolId from the authenticated user
  const reqQuery = { ...req.query };
  reqQuery.schoolId = req.user.schoolId; 

  // Fields to exclude from direct filtering (since they are handled separately)
  const excludeFields = ['select', 'sort', 'page', 'limit'];
  excludeFields.forEach(param => delete reqQuery[param]);

  // Create query string to support advanced filters (like lte, gte, etc.)
  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // 2. Initialize Query execution
  query = model.find(JSON.parse(queryStr));

  // 3. Field Selection Projection (Only fetch what you need!)
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // 4. Sorting
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    // Default fallback sort
    query = query.sort('-createdAt');
  }

  // 5. Pagination & Safe Limits
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20; // Default size 20
  const safeLimit = Math.min(limit, 100);             // Hard ceiling cap of 100
  const skip = (page - 1) * safeLimit;

  query = query.skip(skip).limit(safeLimit);

  // 6. Dynamic Population (if needed)
  if (populateOptions) {
    query = query.populate(populateOptions);
  }

  // Execute the optimized query (using .lean() for faster, read-only performance)
  const results = await query.lean();

  // 7. Dynamic Pagination Metadata
  const totalRecords = await model.countDocuments({ schoolId: req.user.schoolId, ...reqQuery });
  const totalPages = Math.ceil(totalRecords / safeLimit);

  req.queryResults = {
    success: true,
    count: results.length,
    pagination: {
      currentPage: page,
      totalPages,
      totalRecords,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    data: results
  };

  next();
});

module.exports = queryHandler;