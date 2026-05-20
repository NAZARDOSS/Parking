import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { getConnection } from '../config/db.js';
import { env } from '../config/env.js';
import { sendPasswordResetEmail } from './emailService.js';

export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const generateToken = (userId) => {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const normalizeName = (value) => value.trim().replace(/\s+/g, ' ');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isStrongPassword = (password) => {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password)
  );
};

const getGoogleClient = () => {
  if (!env.googleClientId) {
    throw new AppError('Google login is not configured', 503);
  }

  return new OAuth2Client(env.googleClientId);
};

const toPublicUser = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
});

const createAuthResponse = (user) => ({
  token: generateToken(user.id),
  user: toPublicUser(user),
});

const createResetToken = () => crypto.randomBytes(32).toString('hex');

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createResetUrl = (token) => {
  const url = new URL('/reset-password', env.frontendUrl);
  url.searchParams.set('token', token);
  return url.toString();
};

export const registerUser = async (
  firstName,
  lastName,
  email,
  password
) => {
  if (!firstName || !lastName || !email || !password) {
    throw new AppError('All fields are required', 400);
  }

  const cleanFirstName = normalizeName(firstName);
  const cleanLastName = normalizeName(lastName);
  const normalizedEmail = normalizeEmail(email);

  if (!cleanFirstName || !cleanLastName) {
    throw new AppError('First name and last name are required', 400);
  }

  if (!isValidEmail(normalizedEmail)) {
    throw new AppError('Please provide a valid email address', 400);
  }

  if (!isStrongPassword(password)) {
    throw new AppError(
      'Password must be at least 8 characters and include uppercase, lowercase, and a number',
      400
    );
  }

  const connection = await getConnection();
  const [existingUsers] = await connection.execute(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [normalizedEmail]
  );

  if (existingUsers.length > 0) {
    throw new AppError('Email is already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const query = 'INSERT INTO users (firstName, lastName, email, password_) VALUES (?, ?, ?, ?)';
  const [result] = await connection.execute(query, [
    cleanFirstName,
    cleanLastName,
    normalizedEmail,
    hashedPassword,
  ]);

  return createAuthResponse({
    id: result.insertId,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    email: normalizedEmail,
  });
};

export const loginUser = async (email, password) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  const query = 'SELECT * FROM users WHERE email = ?';
  const connection = await getConnection();
  const [rows] = await connection.execute(query, [normalizedEmail]);

  if (rows.length === 0) throw new AppError('Invalid email or password', 401);
  const user = rows[0];

  if (!user.password_) {
    throw new AppError('Please log in with Google for this account', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password_);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  return createAuthResponse(user);
};

export const loginWithGoogle = async (tokenFromGoogle) => {
  if (!tokenFromGoogle) {
    throw new AppError('Google token is required', 400);
  }

  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken: tokenFromGoogle,
    audience: env.googleClientId,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) throw new AppError('Invalid Google token', 401);
  if (payload.email_verified === false) {
    throw new AppError('Google email is not verified', 401);
  }

  const email = normalizeEmail(payload.email);
  const fallbackName = email.split('@')[0];
  const connection = await getConnection();
  const query = 'SELECT * FROM users WHERE email = ?';
  const [rows] = await connection.execute(query, [email]);

  let user;
  if (rows.length === 0) {
    user = {
      firstName: payload.given_name || fallbackName,
      lastName: payload.family_name || '',
      email,
      password_: null,
    };
    const insertQuery = 'INSERT INTO users (firstName, lastName, email) VALUES (?, ?, ?)';
    const [result] = await connection.execute(insertQuery, [
      user.firstName,
      user.lastName,
      user.email,
    ]);
    user.id = result.insertId;
  } else {
    user = rows[0];
  }

  return createAuthResponse(user);
};

export const requestPasswordReset = async (email) => {
  if (!email) {
    throw new AppError('Email is required', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new AppError('Please provide a valid email address', 400);
  }

  const connection = await getConnection();
  const [rows] = await connection.execute(
    'SELECT id, email FROM users WHERE email = ? LIMIT 1',
    [normalizedEmail]
  );

  if (rows.length === 0) {
    return { message: 'If an account exists, a password reset link has been sent' };
  }

  const resetToken = createResetToken();
  const resetTokenHash = hashResetToken(resetToken);
  const expiresAt = new Date(Date.now() + env.passwordResetExpiresMinutes * 60 * 1000);

  await connection.execute(
    `UPDATE users
     SET password_reset_token_hash = ?, password_reset_expires_at = ?
     WHERE id = ?`,
    [resetTokenHash, expiresAt, rows[0].id]
  );

  const resetUrl = createResetUrl(resetToken);
  const emailSent = await sendPasswordResetEmail({
    to: rows[0].email,
    resetUrl,
  });

  return {
    message: 'If an account exists, a password reset link has been sent',
    emailSent,
    devResetUrl: env.isProduction ? undefined : resetUrl,
  };
};

export const resetPassword = async (token, password) => {
  if (!token || !password) {
    throw new AppError('Reset token and password are required', 400);
  }

  if (!isStrongPassword(password)) {
    throw new AppError(
      'Password must be at least 8 characters and include uppercase, lowercase, and a number',
      400
    );
  }

  const tokenHash = hashResetToken(token);
  const connection = await getConnection();
  const [rows] = await connection.execute(
    `SELECT id, firstName, lastName, email
     FROM users
     WHERE password_reset_token_hash = ?
       AND password_reset_expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    throw new AppError('Reset link is invalid or expired', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await connection.execute(
    `UPDATE users
     SET password_ = ?, password_reset_token_hash = NULL, password_reset_expires_at = NULL
     WHERE id = ?`,
    [hashedPassword, rows[0].id]
  );

  return createAuthResponse(rows[0]);
};
