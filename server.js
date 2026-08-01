const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');


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

app.use(cors({
  origin: 'http://localhost:3039', // Replace with your frontend URL/port
  credentials: true,               // Enable if passing cookies/authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(helmet());

app.use(express.json());

app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);

  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  standardHeaders: true, 
  legacyHeaders: false,  
  message: {
    success: false,
    message: 'Too many requests from this IP address. Please try again after 15 minutes.'
  }
});

app.use('/api', apiLimiter);


app.use('/api/auth', superadminRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/academic', academicYearRoutes);
app.use('/api/teachers', teacherRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = app;