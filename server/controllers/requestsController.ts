import { Request, Response } from 'express';
import { getConnection } from '../config/db.ts';

export const addRequest = async (req: Request, res: Response): Promise<void> => {
  const { startLatitude, startLongitude, finishLatitude, finishLongitude, finishName } = req.body;

  if (!startLatitude || !startLongitude || !finishLatitude || !finishLongitude || !finishName) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  try {
    const connection = await getConnection();
    const [result]: any = await connection.execute(
      `INSERT INTO requests (start_latitude, start_longitude, finish_latitude, finish_longitude, finish_name)
      VALUES (?, ?, ?, ?, ?)`,
      [startLatitude, startLongitude, finishLatitude, finishLongitude, finishName]
    );

    res.status(201).json({ message: 'Request added successfully', requestId: result.insertId });
  } catch (error: any) {
    console.error('Error saving request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const connection = await getConnection();
    const [rows]: any = await connection.execute(`SELECT * FROM requests ORDER BY created_at DESC`);

    res.status(200).json(rows);
  } catch (error: any) {
    console.error('Error retrieving requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
