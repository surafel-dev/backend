const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db.js');
const {notFound, errorHandler} = require('./src/middleware/errorMiddleware.js');

const superadminRoutes = require('./src/modules/auth/auth.routes.js');
const schoolRoutes = require('./src/modules/school/school.routes.js');
const staffRoutes = require('./src/modules/staff/staff.routes.js');
const studentRoutes = require('./src/modules/student/student.routes.js');
const academicRoutes = require('./src/modules/academic/academic.routes.js');
const attendanceRoutes = require('./src/modules/attendance/attendance.routes.js');
const gradeRoutes = require('./src/modules/grade/grade.routes.js');
const academicYearRoutes = require('./src/modules/academic-year/academicYear.routes.js');
const teacherRoutes = require('./src/modules/teacher/teacher.routes.js');

const port = process.env.PORT || 5000;


connectDB();

const app = express();
app.use(express.json());

app.use('/api/auth', superadminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/academic-years', academicYearRoutes);
app.use('/api/teachers', teacherRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = app;