import { getConnection } from '../config/db.js';
import * as authService from '../services/authService.js';

const sendError = (res, error, fallbackMessage, fallbackStatus = 400) => {
  const statusCode = error.statusCode || fallbackStatus;
  res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export const register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const authResult = await authService.registerUser(firstName, lastName, email, password);
    res.status(201).json({
      message: 'User registered successfully',
      ...authResult,
    });
  } catch (error) {
    sendError(res, error, 'Registration failed');
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const authResult = await authService.loginUser(email, password);
    res.status(200).json(authResult);
  } catch (error) {
    sendError(res, error, 'Login failed', 401);
  }
};

export const loginWithGoogle = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Google token is required' });
  }

  try {
    const authResult = await authService.loginWithGoogle(token);
    res.status(200).json(authResult);
  } catch (error) {
    sendError(res, error, 'Google login failed');
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await authService.requestPasswordReset(email);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error, 'Password reset request failed');
  }
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Reset token and password are required' });
  }

  try {
    const authResult = await authService.resetPassword(token, password);
    res.status(200).json({
      message: 'Password reset successfully',
      ...authResult,
    });
  } catch (error) {
    sendError(res, error, 'Password reset failed');
  }
};

export const getUserInfo = async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const query = 'SELECT id, firstName, lastName, email FROM users WHERE id = ?';
    const connection = await getConnection();
    const [rows] = await connection.execute(query, [userId]);

    if (Array.isArray(rows) && rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    sendError(res, error, 'Failed to retrieve user info', 500);
  }
};
