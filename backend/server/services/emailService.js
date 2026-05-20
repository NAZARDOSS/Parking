import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const isSmtpConfigured = () => {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass && env.smtp.from);
};

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  if (!isSmtpConfigured()) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject: 'Reset your Parking MVP password',
    text: `Open this link to reset your password: ${resetUrl}`,
    html: `
      <p>Open this link to reset your Parking MVP password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in ${env.passwordResetExpiresMinutes} minutes.</p>
    `,
  });

  return true;
};
