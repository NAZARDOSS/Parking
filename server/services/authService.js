import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { getConnection } from '../config/db.js';

if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.config();
}


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
console.log('Google Client ID:', process.env.GOOGLE_CLIENT_ID);


const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

export const registerUser = async (
  firstName,
  lastName,
  email,
  password
) => {
  if (!firstName || !lastName || !email || !password) {
    throw new Error('Invalid user data');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const query = 'INSERT INTO users (firstName, lastName, email, password_) VALUES (?, ?, ?, ?)';
  const connection = await getConnection();
  await connection.execute(query, [firstName, lastName, email, hashedPassword]);
};

export const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  const connection = await getConnection();
  const [rows] = await connection.execute(query, [email]);

  if (rows.length === 0) throw new Error('User not found');
  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_);
  if (!isMatch) throw new Error('Invalid password');
  return generateToken(user.id);
};

export const loginWithGoogle = async (tokenFromGoogle) => {
  if (!tokenFromGoogle) {
    throw new Error('Google token is required');
  }

  const ticket = await client.verifyIdToken({
    idToken: tokenFromGoogle,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error('Invalid Google token');

  const email = payload.email;
  const connection = await getConnection();
  const query = 'SELECT * FROM users WHERE email = ?';
  const [rows] = await connection.execute(query, [email]);

  let user;
  if (rows.length === 0) {
    user = {
      firstName: payload.given_name,
      lastName: payload.family_name,
      email,
      password_: null,
    };
    const insertQuery = 'INSERT INTO users (firstName, lastName, email) VALUES (?, ?, ?)';
    await connection.execute(insertQuery, [user.firstName, user.lastName, user.email]);
  } else {
    user = rows[0];
  }

  return generateToken(user.id);
};
