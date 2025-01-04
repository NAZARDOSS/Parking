import mysql, { Connection } from 'mysql2/promise';

const connectionConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'nazardosik9W',
  database: 'ParkingApp'
};

let connection: Connection | null = null;

async function connect(): Promise<void> {
  try {
    connection = await mysql.createConnection(connectionConfig);
    console.log('Connected to the database!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

export async function getConnection(): Promise<Connection> {
  if (!connection) {
    await connect();
  }
  return connection!;
}
