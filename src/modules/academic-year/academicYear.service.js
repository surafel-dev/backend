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
    // 1. Deactivate current active year for this tenant
    await AcademicYear.updateMany(
      { schoolId, isActive: true },
      { $set: { isActive: false } }
    );

    // 2. Activate target year safely
    const updatedYear = await AcademicYear.findOneAndUpdate(
      { _id: yearId, schoolId },
      { $set: { isActive: true } },
      { new: true }
    );

    return updatedYear;
  }
}

module.exports = new AcademicService();