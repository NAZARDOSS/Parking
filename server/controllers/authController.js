import { getConnection } from '../config/db.js';
import * as authService from '../services/authService.js';

export const register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    console.log('Registering user:', { firstName, lastName, email, password });
    await authService.registerUser(firstName, lastName, email, password);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;


  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const token = await authService.loginUser(email, password);
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(400).json({ error: error.message || 'Login failed' });
  }
};

export const loginWithGoogle = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Google token is required' });
  }

  try {
    const jwtToken = await authService.loginWithGoogle(token);
    res.status(200).json({ token: jwtToken });
  } catch (error) {
    console.error('Error during Google login:', error);
    res.status(400).json({ error: error.message || 'Google login failed' });
  }
};

export const getUserInfo = async (req, res) => {
  const userId = (req).user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const query = 'SELECT firstName, lastName, email FROM users WHERE id = ?'; //sql logic
    const connection = await getConnection();
    const [rows] = await connection.execute(query, [userId]);

    if (Array.isArray(rows) && rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(rows[0]); 
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(400).json({ error: error.message || 'Failed to retrieve user info' });
  }
};
