import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'ParkingApp'
};

let connection = null;

async function connect() {
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to the database!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

export async function getConnection() {
  if (!connection) {
    await connect();
  }
  return connection;
}
