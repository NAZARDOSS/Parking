import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  jwt.verify(token, env.jwtSecret, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    if (!user?.userId) {
      res.status(403).json({ error: 'Invalid token payload' });
      return;
    }

    req.user = { userId: user.userId };
    next();
  });
};
