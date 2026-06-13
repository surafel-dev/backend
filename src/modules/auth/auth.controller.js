const asyncHandler = require('express-async-handler');
const authService = require('./auth.service');

const registerUser = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({ success: true, data: result });
});

module.exports = { registerUser, loginUser };