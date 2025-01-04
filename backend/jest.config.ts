import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'], // Директория с тестами
  testMatch: ['**/*.test.ts'], // Шаблон для поиска тестов
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest', // Трансформация TypeScript в JS
  },
  setupFiles: ['<rootDir>/tests/SetupTest.js'], // Файл для предварительной настройки (если нужен)
};

export default config;
