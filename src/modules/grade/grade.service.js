const Grade = require('./grade.model');

class GradeService {
  /**
   * Performs high-speed bulk upsert for an entire class roster's marks
   */
  async bulkUpsertGrades(metaData, gradeData) {
    const { schoolId, academicYear, term, classId, subjectId, teacherId } = metaData;

    const operations = gradeData.map((record) => {
      // Calculate running totals on the node server side for high-performance bulk payload ingestion
      const totalMarks = record.assessments.reduce((sum, item) => sum + item.scoreAchieved, 0);
      const totalWeight = record.assessments.reduce((sum, item) => sum + item.weight, 0);

      return {
        updateOne: {
          filter: {
            schoolId,
            academicYear,
            term,
            classId,
            subjectId,
            studentId: record.studentId
          },
          update: {
            $set: {
              teacherId,
              assessments: record.assessments,
              totalAccumulatedMarks: totalMarks,
              totalPossibleWeight: totalWeight
            }
          },
          upsert: true
        }
      };
    });

    return await Grade.bulkWrite(operations);
  }

  /**
   * Fetches performance records for calculating report sheets
   */
  async getStudentGradesForTerm(schoolId, academicYear, term, studentId) {
    return await Grade.find({ schoolId, academicYear, term, studentId })
      .populate('subjectId', 'name code');
  }
}

module.exports = new GradeService();