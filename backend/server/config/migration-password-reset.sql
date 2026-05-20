USE ParkingApp;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(64) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at DATETIME DEFAULT NULL;
