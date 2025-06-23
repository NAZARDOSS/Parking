## 1 Навігаційний веб-застосунок

## 2 Ідея
Навігаційний веб-застосунок, що надає детальну інформацію про паркувальні місця та дозволяє працювати з ними.

## 3 Стиль коду
- Вибраний стиль коду.
- Лінтер налаштований.
- Git hook налаштований (мінімальний функціонал у папці `.husky`).


## 5 База даних (Database)

```sql
# drop database ParkingApp;
CREATE DATABASE IF NOT EXISTS ParkingApp;

USE ParkingApp;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(255) NOT NULL,
  lastName VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_ VARCHAR(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_latitude DECIMAL(10, 7) NOT NULL,
  start_longitude DECIMAL(10, 7) NOT NULL,
  finish_latitude DECIMAL(10, 7) NOT NULL,
  finish_longitude DECIMAL(10, 7) NOT NULL,
  finish_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

select * from users;
select * from requests;
```
## 6. Імплементація інтеграції з віддаленими джерелами даних - /backend/server ... 
## 7. Тестування програмного забезпечення: тест на реєстрацію та на хеш пароля - /backend/tests/ (тести проходять успішно)
## 8. Фронт зроблений, протестований, все працює