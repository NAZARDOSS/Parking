// services/authService.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../config/db'); // Импортируем getConnection

// Регистрация пользователя
const registerUser = async (email, password, firstName, lastName) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = 'INSERT INTO users (email, password, firstName, lastName) VALUES (?, ?, ?, ?)';
  const connection = await getConnection(); // Получаем соединение

  return connection.execute(query, [email, hashedPassword, firstName, lastName]); // Выполняем запрос
};

// Авторизация пользователя
const loginUser = async (email, password) => {
  const query = 'SELECT * FROM users WHERE email = ?';
  const connection = await getConnection(); // Получаем соединение

  const [rows] = await connection.execute(query, [email]); // Выполняем запрос и получаем результат
  if (rows.length === 0) throw new Error('User not found');

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid password');

  const token = jwt.sign({ userId: user.id }, 'secretKey', { expiresIn: '1h' });
  return token;
};

module.exports = { registerUser, loginUser };
