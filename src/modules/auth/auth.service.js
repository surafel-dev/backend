const User = require('./user.model'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, schoolId: user.schoolId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const register = async (userData) => {
  const userExists = await User.findOne({ email: userData.email });
  if (userExists) throw new Error('A user with this email already exists');

  const newUser = await User.create(userData);
  return { id: newUser._id, email: newUser.email, role: newUser.role, token: generateToken(newUser) };
};

const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid email or password');
  }

  return { id: user._id, email: user.email, role: user.role, schoolId: user.schoolId, token: generateToken(user) };
};

module.exports = { register, login };