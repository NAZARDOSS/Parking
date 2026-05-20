import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const executeMock = jest.fn();

jest.unstable_mockModule('../server/config/db.js', () => ({
  getConnection: jest.fn(async () => ({
    execute: executeMock,
  })),
}));

const authService = await import('../server/services/authService.js');

describe('Auth Service', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it('hashes the password, saves a normalized user and returns a JWT', async () => {
    executeMock
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ insertId: 42 }]);

    const result = await authService.registerUser(
      ' John ',
      ' Doe ',
      'John.Doe@Example.com',
      'Secure123'
    );

    expect(result.user).toEqual({
      id: 42,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    });
    expect(jwt.verify(result.token, 'test-jwt-secret-for-automated-tests-only')).toMatchObject({
      userId: 42,
    });

    const insertArgs = executeMock.mock.calls[1][1];
    expect(insertArgs.slice(0, 3)).toEqual(['John', 'Doe', 'john.doe@example.com']);
    expect(await bcrypt.compare('Secure123', insertArgs[3])).toBe(true);
  });

  it('rejects weak registration data', async () => {
    await expect(
      authService.registerUser('', '', 'invalid-email', '123')
    ).rejects.toThrow('All fields are required');
  });

  it('logs in with a valid password', async () => {
    const hashedPassword = await bcrypt.hash('Secure123', 10);
    executeMock.mockResolvedValueOnce([
      [{ id: 7, firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', password_: hashedPassword }],
    ]);

    const result = await authService.loginUser('JANE@example.com', 'Secure123');

    expect(result.user.email).toBe('jane@example.com');
    expect(jwt.verify(result.token, 'test-jwt-secret-for-automated-tests-only')).toMatchObject({
      userId: 7,
    });
  });

  it('does not reveal whether email or password was incorrect', async () => {
    executeMock.mockResolvedValueOnce([[]]);

    await expect(authService.loginUser('missing@example.com', 'Secure123')).rejects.toMatchObject({
      message: 'Invalid email or password',
      statusCode: 401,
    });
  });

  it('creates a password reset token for an existing user', async () => {
    executeMock
      .mockResolvedValueOnce([[{ id: 12, email: 'reset@example.com' }]])
      .mockResolvedValueOnce([{}]);

    const result = await authService.requestPasswordReset('RESET@example.com');

    expect(result.message).toBe('If an account exists, a password reset link has been sent');
    expect(result.emailSent).toBe(false);
    expect(result.devResetUrl).toContain('/reset-password?token=');
    expect(executeMock.mock.calls[1][1][0]).toHaveLength(64);
    expect(executeMock.mock.calls[1][1][2]).toBe(12);
  });

  it('keeps password reset response generic for missing users', async () => {
    executeMock.mockResolvedValueOnce([[]]);

    const result = await authService.requestPasswordReset('missing@example.com');

    expect(result).toEqual({
      message: 'If an account exists, a password reset link has been sent',
    });
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  it('resets password and clears reset token state', async () => {
    executeMock
      .mockResolvedValueOnce([
        [{ id: 5, firstName: 'Reset', lastName: 'User', email: 'reset@example.com' }],
      ])
      .mockResolvedValueOnce([{}]);

    const result = await authService.resetPassword('valid-token', 'NewSecure123');

    expect(result.user.email).toBe('reset@example.com');
    const updateArgs = executeMock.mock.calls[1][1];
    expect(await bcrypt.compare('NewSecure123', updateArgs[0])).toBe(true);
    expect(updateArgs[1]).toBe(5);
  });
});
