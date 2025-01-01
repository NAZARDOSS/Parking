import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { getConnection } from '../config/db.js';

const client = new OAuth2Client('YOUR_GOOGLE_CLIENT_ID');

const generateToken = (userId: number): string => {
  return jwt.sign({ userId }, 'secretKey', { expiresIn: '1h' });
};

export const registerUser = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string
): Promise<void> => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = 'INSERT INTO users (firstName, lastName, email, password_) VALUES (?, ?, ?, ?)';
  const connection = await getConnection();
  await connection.execute(query, [firstName, lastName, email, hashedPassword]);
};

export const loginUser = async (email: string, password: string): Promise<string> => {
  const query = 'SELECT * FROM users WHERE email = ?';
  const connection = await getConnection();
  const [rows]: any = await connection.execute(query, [email]);

  if (rows.length === 0) throw new Error('User not found');
  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_);
  if (!isMatch) throw new Error('Invalid password');
  return generateToken(user.id);
};

export const loginWithGoogle = async (tokenFromGoogle: string): Promise<string> => {
  const ticket = await client.verifyIdToken({
    idToken: tokenFromGoogle,
    audience: '758165492852-17poav9i7hlee4vj9hrg8125sttlfltd.apps.googleusercontent.com',
  });

  const payload = ticket.getPayload();
  if (!payload) throw new Error('Invalid Google token');

  const email = payload.email!;
  const connection = await getConnection();
  const query = 'SELECT * FROM users WHERE email = ?';
  const [rows]: any = await connection.execute(query, [email]);

  let user;
  if (rows.length === 0) {
    user = {
      firstName: payload.given_name!,
      lastName: payload.family_name!,
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
