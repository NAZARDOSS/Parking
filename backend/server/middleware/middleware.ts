import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: string | any;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  jwt.verify(token, 'secretKey', (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = user;
    next();
  });
};