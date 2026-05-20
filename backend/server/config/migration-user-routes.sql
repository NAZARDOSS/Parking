USE ParkingApp;

ALTER TABLE requests
  ADD COLUMN user_id INT NULL AFTER id;

INSERT INTO users (firstName, lastName, email, password_)
SELECT 'Migrated', 'User', 'migrated-route-owner@example.invalid', NULL
WHERE NOT EXISTS (SELECT 1 FROM users)
  AND EXISTS (SELECT 1 FROM requests);

UPDATE requests
SET user_id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE requests
  MODIFY user_id INT NOT NULL,
  ADD INDEX idx_requests_user_created_at (user_id, created_at),
  ADD CONSTRAINT fk_requests_user_id
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE;
