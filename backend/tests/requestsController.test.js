import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

const executeMock = jest.fn();

jest.unstable_mockModule('../server/config/db.js', () => ({
  getConnection: jest.fn(async () => ({
    execute: executeMock,
  })),
}));

const app = (await import('../server/app.js')).default;

const token = jwt.sign(
  { userId: 99 },
  'test-jwt-secret-for-automated-tests-only',
  { expiresIn: '1h' }
);

const currentRequestColumns = [
  'id',
  'user_id',
  'start_latitude',
  'start_longitude',
  'finish_latitude',
  'finish_longitude',
  'finish_name',
  'created_at',
];

const mockCurrentRequestSchema = () => {
  executeMock.mockResolvedValueOnce([{}]);
  executeMock.mockResolvedValueOnce([
    currentRequestColumns.map((COLUMN_NAME) => ({ COLUMN_NAME })),
  ]);
};

const findSqlCall = (needle) =>
  executeMock.mock.calls.find(([sql]) => String(sql).includes(needle));

describe('Requests Controller', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it('requires auth for route history writes', async () => {
    const response = await request(app).post('/api/requests/routeInfo').send({});

    expect(response.status).toBe(401);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('saves a route for the authenticated user', async () => {
    mockCurrentRequestSchema();
    executeMock.mockResolvedValueOnce([{ insertId: 10 }]);

    const response = await request(app)
      .post('/api/requests/routeInfo')
      .set('Authorization', `Bearer ${token}`)
      .send({
        startLatitude: 0,
        startLongitude: 8.1,
        finishLatitude: 48.7,
        finishLongitude: 8.2,
        finishName: 'Garage',
      });

    expect(response.status).toBe(201);
    expect(response.body.requestId).toBe(10);
    expect(findSqlCall('INSERT INTO requests')[1]).toEqual([99, 0, 8.1, 48.7, 8.2, 'Garage']);
  });

  it('upgrades an old route history table before saving', async () => {
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([
      [
        { COLUMN_NAME: 'id' },
        { COLUMN_NAME: 'start_latitude' },
        { COLUMN_NAME: 'start_longitude' },
        { COLUMN_NAME: 'finish_latitude' },
        { COLUMN_NAME: 'finish_longitude' },
        { COLUMN_NAME: 'finish_name' },
      ],
    ]);
    executeMock.mockResolvedValueOnce([{}]);
    executeMock.mockResolvedValueOnce([{ insertId: 11 }]);

    const response = await request(app)
      .post('/api/requests/routeInfo')
      .set('Authorization', `Bearer ${token}`)
      .send({
        startLatitude: 0,
        startLongitude: 8.1,
        finishLatitude: 48.7,
        finishLongitude: 8.2,
        finishName: 'Garage',
      });

    expect(response.status).toBe(201);
    expect(response.body.requestId).toBe(11);
    expect(findSqlCall('ALTER TABLE requests')[0]).toContain('ADD COLUMN user_id');
    expect(findSqlCall('ALTER TABLE requests')[0]).toContain('ADD COLUMN created_at');
  });

  it('returns only the authenticated user route history', async () => {
    mockCurrentRequestSchema();
    executeMock.mockResolvedValueOnce([
      [
        {
          id: 1,
          finish_name: 'Garage',
        },
      ],
    ]);

    const response = await request(app)
      .get('/api/requests/getRoutes')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 1, finish_name: 'Garage' }]);
    expect(findSqlCall('WHERE user_id = ?')[1]).toEqual([99]);
  });
});
