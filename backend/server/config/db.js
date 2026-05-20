import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool = null;

export async function getConnection() {
  if (!pool) {
    pool = mysql.createPool(env.db);
  }

  return pool;
}

export async function verifyDatabaseConnection() {
  const connection = await getConnection();
  await connection.query('SELECT 1');
}

export async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
