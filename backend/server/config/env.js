import dotenv from 'dotenv';

dotenv.config();

const envName = process.env.NODE_ENV || 'development';
const isTest = envName === 'test';

const parseOrigins = (value) => {
  if (!value) {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const readNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
};

const testJwtSecret = 'test-jwt-secret-for-automated-tests-only';

export const env = {
  nodeEnv: envName,
  isProduction: envName === 'production',
  isTest,
  port: readNumber(process.env.PORT, 5005),
  clientOrigins: parseOrigins(process.env.CLIENT_ORIGINS),
  frontendUrl: process.env.FRONTEND_URL || parseOrigins(process.env.CLIENT_ORIGINS)[0] || 'http://localhost:3000',
  jwtSecret: isTest ? testJwtSecret : process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  passwordResetExpiresMinutes: readNumber(process.env.PASSWORD_RESET_EXPIRES_MINUTES, 30),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  mapboxAccessToken: process.env.MAPBOX_ACCESS_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  openChargeMapApiKey: process.env.OPEN_CHARGE_MAP_API_KEY || '',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: readNumber(process.env.SMTP_PORT, 587),
    secure: readBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: readNumber(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || (isTest ? 'test' : ''),
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || (isTest ? 'ParkingAppTest' : ''),
    waitForConnections: true,
    connectionLimit: readNumber(process.env.DB_CONNECTION_LIMIT, 10),
    queueLimit: 0,
  },
};

export const validateRuntimeEnv = () => {
  if (env.isTest) return;

  const missing = [];

  if (!env.jwtSecret) missing.push('JWT_SECRET');
  if (!env.db.user) missing.push('DB_USER');
  if (!env.db.database) missing.push('DB_NAME');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (env.isProduction && env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
};
