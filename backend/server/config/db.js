// config/db.js
const mysql = require('mysql2/promise'); // Используем mysql2 с поддержкой промисов

// Конфигурация подключения
const connectionConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root', // Используйте ваш пользователь
  password: 'nazardosik9W', // Ваш пароль
  database: 'ParkingApp' // База данных
};

// Создаем подключение с поддержкой промисов
let connection;

async function connect() {
  try {
    connection = await mysql.createConnection(connectionConfig); // Подключаемся асинхронно
    console.log('Connected to the database!');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error; // Перехватываем ошибку
  }
}

// Функция для получения соединения
async function getConnection() {
  if (!connection) {
    await connect(); // Если соединение не установлено, пытаемся подключиться
  }
  return connection; // Возвращаем подключение
}

module.exports = { getConnection };
