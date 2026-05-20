CREATE DATABASE IF NOT EXISTS ParkingApp;

USE ParkingApp;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_ VARCHAR(255) DEFAULT NULL,
  password_reset_token_hash VARCHAR(64) DEFAULT NULL,
  password_reset_expires_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  start_latitude DECIMAL(10, 7) NOT NULL,
  start_longitude DECIMAL(10, 7) NOT NULL,
  finish_latitude DECIMAL(10, 7) NOT NULL,
  finish_longitude DECIMAL(10, 7) NOT NULL,
  finish_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_requests_user_created_at (user_id, created_at),
  CONSTRAINT fk_requests_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);
