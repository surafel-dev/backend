const asyncHandler = require('express-async-handler');
const { AcademicYear } = require('../academic-year/academicYear.model');

// Injects current active year details into the request cycle dynamically
const injectCurrentPeriod = asyncHandler(async (req, res, next) => {
  // If user isn't logged in yet or no tenant context exists, skip quietly
  if (!req.user || !req.user.schoolId) {
    return next();
  }

  const activePeriod = await AcademicYear.findOne({ 
    schoolId: req.user.schoolId, 
    isActive: true 
  });

  if (activePeriod) {
    req.currentYearId = activePeriod._id;
    
    // Pinpoint exactly which sub-term today fits inside
    const today = new Date();
    const currentTerm = activePeriod.terms.find(term => 
      today >= term.startDate && today <= term.endDate
    );
    
    req.currentTermId = currentTerm ? currentTerm._id : null;
  }
  
  // Always call next() to pass control to the subsequent route handler
  next();
});

module.exports = injectCurrentPeriod;