// academicYear.service.js
const { AcademicYear } = require('./academicYear.model');

class AcademicService {
  async createAcademicYear(schoolId, data) {
    const year = new AcademicYear({ schoolId, ...data });
    return await year.save();
  }

  async getAcademicYears(schoolId) {
    return await AcademicYear.find({ schoolId }).sort({ startDate: -1 });
  }

  async activateYear(schoolId, yearId) {
    // 1. Deactivate current active year for this tenant school context boundary
    await AcademicYear.updateMany(
      { schoolId, isActive: true },
      { $set: { isActive: false } }
    );

    // 2. Activate target year safely using modern driver configuration
    const updatedYear = await AcademicYear.findOneAndUpdate(
      { _id: yearId, schoolId },
      { $set: { isActive: true } },
      { returnDocument: 'after' }
    );

    return updatedYear;
  }
}

module.exports = new AcademicService();