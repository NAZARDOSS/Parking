import { getConnection } from '../config/db.js';

const requestColumns = {
  user_id: 'ADD COLUMN user_id INT NULL AFTER id',
  start_latitude: 'ADD COLUMN start_latitude DECIMAL(10, 7) NULL',
  start_longitude: 'ADD COLUMN start_longitude DECIMAL(10, 7) NULL',
  finish_latitude: 'ADD COLUMN finish_latitude DECIMAL(10, 7) NULL',
  finish_longitude: 'ADD COLUMN finish_longitude DECIMAL(10, 7) NULL',
  finish_name: 'ADD COLUMN finish_name VARCHAR(255) NULL',
  created_at: 'ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
};

const ensureRequestsTable = async (connection) => {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      start_latitude DECIMAL(10, 7) NULL,
      start_longitude DECIMAL(10, 7) NULL,
      finish_latitude DECIMAL(10, 7) NULL,
      finish_longitude DECIMAL(10, 7) NULL,
      finish_name VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [columns] = await connection.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'requests'`
  );

  const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
  const missingAlterations = Object.entries(requestColumns)
    .filter(([columnName]) => !existingColumns.has(columnName))
    .map(([, alteration]) => alteration);

  if (missingAlterations.length > 0) {
    await connection.execute(`ALTER TABLE requests ${missingAlterations.join(', ')}`);
  }
};

const parseCoordinate = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }

  return parsed;
};

const validateRoutePayload = (body) => {
  const startLatitude = parseCoordinate(body.startLatitude, -90, 90);
  const startLongitude = parseCoordinate(body.startLongitude, -180, 180);
  const finishLatitude = parseCoordinate(body.finishLatitude, -90, 90);
  const finishLongitude = parseCoordinate(body.finishLongitude, -180, 180);
  const finishName = typeof body.finishName === 'string' ? body.finishName.trim() : '';

  if (
    startLatitude === null ||
    startLongitude === null ||
    finishLatitude === null ||
    finishLongitude === null ||
    !finishName
  ) {
    return { error: 'Valid start, finish coordinates and finish name are required' };
  }

  return {
    value: {
      startLatitude,
      startLongitude,
      finishLatitude,
      finishLongitude,
      finishName: finishName.slice(0, 255),
    },
  };
};

export const addRequest = async (req, res) => {
  const userId = req.user?.userId;
  const { value, error } = validateRoutePayload(req.body);

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const connection = await getConnection();
    await ensureRequestsTable(connection);

    const [result] = await connection.execute(
      `INSERT INTO requests
        (user_id, start_latitude, start_longitude, finish_latitude, finish_longitude, finish_name)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        value.startLatitude,
        value.startLongitude,
        value.finishLatitude,
        value.finishLongitude,
        value.finishName,
      ]
    );

    res.status(201).json({ message: 'Request added successfully', requestId: result.insertId });
  } catch (error) {
    console.error('Error saving request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRequests = async (req, res) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const connection = await getConnection();
    await ensureRequestsTable(connection);

    const [rows] = await connection.execute(
      `SELECT
        id,
        start_latitude,
        start_longitude,
        finish_latitude,
        finish_longitude,
        finish_name,
        created_at
      FROM requests
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 100`,
      [userId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error retrieving requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
