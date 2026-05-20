import request from 'supertest';
import { jest } from '@jest/globals';

const registerUserMock = jest.fn();
const loginUserMock = jest.fn();
const loginWithGoogleMock = jest.fn();
const requestPasswordResetMock = jest.fn();
const resetPasswordMock = jest.fn();

jest.unstable_mockModule('../server/services/authService.js', () => ({
  registerUser: registerUserMock,
  loginUser: loginUserMock,
  loginWithGoogle: loginWithGoogleMock,
  requestPasswordReset: requestPasswordResetMock,
  resetPassword: resetPasswordMock,
}));

const app = (await import('../server/app.js')).default;

describe('Auth Controller', () => {
  beforeEach(() => {
    registerUserMock.mockReset();
    loginUserMock.mockReset();
    loginWithGoogleMock.mockReset();
    requestPasswordResetMock.mockReset();
    resetPasswordMock.mockReset();
  });

  it('registers a user and returns the auth payload', async () => {
    registerUserMock.mockResolvedValueOnce({
      token: 'jwt-token',
      user: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    });

    const response = await request(app).post('/api/auth/signin').send({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Secure123',
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      message: 'User registered successfully',
      token: 'jwt-token',
      user: {
        email: 'john@example.com',
      },
    });
  });

  it('returns validation error for incomplete registration', async () => {
    const response = await request(app).post('/api/auth/signin').send({
      firstName: '',
      lastName: '',
      email: 'invalid-email',
      password: '',
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('All fields are required');
    expect(registerUserMock).not.toHaveBeenCalled();
  });

  it('starts forgot password flow', async () => {
    requestPasswordResetMock.mockResolvedValueOnce({
      message: 'If an account exists, a password reset link has been sent',
      devResetUrl: 'http://localhost:3000/reset-password?token=abc',
    });

    const response = await request(app).post('/api/auth/forgot-password').send({
      email: 'john@example.com',
    });

    expect(response.status).toBe(200);
    expect(response.body.devResetUrl).toContain('/reset-password?token=');
    expect(requestPasswordResetMock).toHaveBeenCalledWith('john@example.com');
  });

  it('resets password and returns the auth payload', async () => {
    resetPasswordMock.mockResolvedValueOnce({
      token: 'new-jwt-token',
      user: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      },
    });

    const response = await request(app).post('/api/auth/reset-password').send({
      token: 'reset-token',
      password: 'NewSecure123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: 'Password reset successfully',
      token: 'new-jwt-token',
    });
    expect(resetPasswordMock).toHaveBeenCalledWith('reset-token', 'NewSecure123');
  });
});
