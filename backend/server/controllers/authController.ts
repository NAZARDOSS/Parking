import { Request, Response } from 'express';
import { getConnection } from '../config/db.js';
import { RowDataPacket } from 'mysql2';
import * as authService from '../services/authService.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, email, password } = req.body;
  try {
    console.log('Registering user:', { firstName, lastName, email, password });
    await authService.registerUser(firstName, lastName, email, password);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  try {
    const token = await authService.loginUser(email, password);
    res.status(200).json({ token });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const loginWithGoogle = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;
  try {
    const jwtToken = await authService.loginWithGoogle(token);
    res.status(200).json({ token: jwtToken });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const getUserInfo = async (req: Request, res: Response): Promise<any> => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const query = 'SELECT firstName, lastName, email FROM users WHERE id = ?';
    const connection = await getConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(query, [userId]);

    if (Array.isArray(rows) && rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

