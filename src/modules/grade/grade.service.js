const Grade = require('./grade.model');
const Student = require('../student/student.model');

class GradeService {
  /**
   * High-performance bulk upsert for class roster grades
   * - Uses ordered: false for better throughput and fault tolerance
   * - Pre-computes totals in a single pass
   */
  async bulkUpsertGrades(metaData, gradeData) {
    const { schoolId, academicYear, term, classId, subjectId, teacherId } = metaData;

    if (!gradeData?.length) return { modifiedCount: 0, upsertedCount: 0 };

    const operations = gradeData.map((record) => {
      const totalAccumulatedMarks = record.assessments.reduce((sum, item) => sum + (item.scoreAchieved || 0), 0);
      const totalPossibleWeight = record.assessments.reduce((sum, item) => sum + (item.weight || 0), 0);

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
              totalAccumulatedMarks,
              totalPossibleWeight
            }
          },
          upsert: true
        }
      };
    });

    // ordered: false allows parallel execution and continues on errors
    return await Grade.bulkWrite(operations, { ordered: false });
  }

  /**
   * Optimized class performance report
   * - Single aggregation for stats + comparison where possible
   * - Reduced memory usage by avoiding unnecessary in-memory arrays when possible
   */
  async getClassPerformanceReport(schoolId, classId, subjectId, academicYear, term) {
    const grades = await Grade.find({
      schoolId, classId, subjectId, academicYear, term
    })
      .populate('studentId', 'firstName middleName lastName gender studentIdNumber photo')
      .lean();

    if (grades.length === 0) {
      return {
        totalStudentsAssessed: 0,
        classAveragePercentage: 0,
        brackets: this._getEmptyBrackets(),
        flaggedStudents: [],
        topPerformers: []
      };
    }

    const stats = {
      totalStudentsAssessed: grades.length,
      classAveragePercentage: 0,
      brackets: this._getEmptyBrackets(),
      flaggedStudents: [],
      topPerformers: []
    };

    let totalClassPercentageSum = 0;
    const trackingList = [];

    for (const grade of grades) {
      const student = grade.studentId;
      if (!student) continue;

      const gender = (student.gender || 'male').toLowerCase();
      const finalPercentage = grade.totalPossibleWeight > 0
        ? (grade.totalAccumulatedMarks / grade.totalPossibleWeight) * 100
        : 0;

      const roundedPercentage = Math.round(finalPercentage * 10) / 10;

      totalClassPercentageSum += finalPercentage;

      const studentSummary = {
        studentId: student.studentIdNumber,
        fullName: `${student.firstName} ${student.lastName}`,
        photo: student.photo,
        scorePercentage: roundedPercentage
      };

      trackingList.push(studentSummary);

      this._updateBracketsAndFlags(stats, gender, finalPercentage, studentSummary);
    }

    stats.classAveragePercentage = Math.round((totalClassPercentageSum / grades.length) * 10) / 10;
    stats.topPerformers = trackingList
      .sort((a, b) => b.scorePercentage - a.scorePercentage)
      .slice(0, 3);

    // School-wide comparison via aggregation (more efficient than full find)
    const comparison = await Grade.aggregate([
      { $match: { schoolId, classId, subjectId, academicYear, term } },
      {
        $group: {
          _id: null,
          avgMarks: { $avg: "$totalAccumulatedMarks" },
          avgWeight: { $avg: "$totalPossibleWeight" }
        }
      }
    ]);

    if (comparison.length > 0) {
      const globalAvg = comparison[0].avgWeight > 0
        ? (comparison[0].avgMarks / comparison[0].avgWeight) * 100
        : 0;

      stats.gradeTierComparison = {
        currentSectionAverage: stats.classAveragePercentage,
        schoolWideSubjectAverage: Math.round(globalAvg * 10) / 10,
        performanceStatus: stats.classAveragePercentage >= globalAvg ? 'Above Average' : 'Below Average'
      };
    }

    return stats;
  }

  _getEmptyBrackets() {
    return {
      under50: { male: 0, female: 0, total: 0 },
      from50to69: { male: 0, female: 0, total: 0 },
      from70to89: { male: 0, female: 0, total: 0 },
      above90: { male: 0, female: 0, total: 0 }
    };
  }

  _updateBracketsAndFlags(stats, gender, percentage, studentSummary) {
    if (percentage < 50) {
      stats.brackets.under50[gender]++;
      stats.brackets.under50.total++;
      stats.flaggedStudents.push({
        ...studentSummary,
        status: 'Needs Immediate Academic Attention'
      });
    } else if (percentage <= 69) {
      stats.brackets.from50to69[gender]++;
      stats.brackets.from50to69.total++;
    } else if (percentage <= 89) {
      stats.brackets.from70to89[gender]++;
      stats.brackets.from70to89.total++;
    } else {
      stats.brackets.above90[gender]++;
      stats.brackets.above90.total++;
    }
  }

  /**
   * Unified student terminal report card
   * - Single query for all needed data
   * - Early validation
   * - Cleaner percentage/letter grade logic
   */
  async generateStudentReportCard(schoolId, studentId, academicYear, term) {
    const studentInfo = await Student.findOne({ _id: studentId, schoolId })
      .select('studentIdNumber firstName middleName lastName gender photo')
      .lean();

    if (!studentInfo) {
      const error = new Error('Student record not found under your institution.');
      error.statusCode = 404;
      throw error;
    }

    const subjectGrades = await Grade.find({
      schoolId, studentId, academicYear, term
    })
      .populate('subjectId', 'name code')
      .populate('teacherId', 'firstName lastName')
      .lean();

    let accumulatedMarksSum = 0;
    let possibleWeightSum = 0;

    const gradesSummary = subjectGrades.map((grade) => {
      const finalPercentage = grade.totalPossibleWeight > 0
        ? (grade.totalAccumulatedMarks / grade.totalPossibleWeight) * 100
        : 0;

      accumulatedMarksSum += grade.totalAccumulatedMarks;
      possibleWeightSum += grade.totalPossibleWeight;

      const letterGrade = this._getLetterGrade(finalPercentage);

      return {
        subjectCode: grade.subjectId?.code || 'N/A',
        subjectName: grade.subjectId?.name || 'Unknown Subject',
        teacherName: grade.teacherId 
          ? `${grade.teacherId.firstName} ${grade.teacherId.lastName}` 
          : 'Assigned Staff',
        assessmentsRaw: grade.assessments,
        totalScore: Math.round(grade.totalAccumulatedMarks * 10) / 10,
        maxWeight: grade.totalPossibleWeight,
        percentageScore: Math.round(finalPercentage * 10) / 10,
        letterGrade
      };
    });

    const overallPercentage = possibleWeightSum > 0
      ? (accumulatedMarksSum / possibleWeightSum) * 100
      : 0;

    return {
      studentDetails: {
        studentIdNumber: studentInfo.studentIdNumber,
        fullName: `${studentInfo.firstName} ${studentInfo.middleName || ''} ${studentInfo.lastName}`.trim(),
        gender: studentInfo.gender,
        photo: studentInfo.photo
      },
      academicTimeline: { academicYear, term },
      gradesSummary,
      finalMetrics: {
        totalEarnedMarks: Math.round(accumulatedMarksSum * 10) / 10,
        totalPossibleWeight: possibleWeightSum,
        terminalAveragePercentage: Math.round(overallPercentage * 10) / 10,
        academicStatus: overallPercentage >= 50 ? 'Passed' : 'Promotional Review Required'
      }
    };
  }

  _getLetterGrade(percentage) {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }

  async getStudentGradesForTerm(schoolId, academicYear, term, studentId) {
    return await Grade.find({ schoolId, academicYear, term, studentId })
      .populate('subjectId', 'name code')
      .lean(); // lean() is usually sufficient and faster
  }
}

module.exports = new GradeService();