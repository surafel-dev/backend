const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db.js');
const {notFound, errorHandler} = require('./src/middleware/errorMiddleware.js');

const authRoutes = require('./src/modules/auth/auth.routes.js');
const schoolRoutes = require('./src/modules/school/school.routes.js');
const studentRoutes = require('./src/modules/student/student.routes.js');

const port = process.env.PORT || 5000;


connectDB();

const app = express();
app.use(express.json());

app.use('/api/user', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/schools', schoolRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = app;