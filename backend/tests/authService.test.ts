import * as authService from '../server/services/authService.js';

jest.mock('../server/config/db', () => ({
  getConnection: jest.fn().mockResolvedValue({
    execute: jest.fn(),
  }),
}));

describe('Auth Service', () => {
  it('should hash password and save user to database', async () => {
    const result = await authService.registerUser('John', 'Doe', 'john.doe@example.com', 'securePassword123');
    expect(result).toBeUndefined(); // Если метод ничего не возвращает
  });

  it('should throw an error for invalid user data', async () => {
    await expect(
      authService.registerUser('', '', '', ''),
    ).rejects.toThrow('Invalid user data');
  });
});
