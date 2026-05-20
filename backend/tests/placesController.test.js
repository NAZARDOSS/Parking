import request from 'supertest';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { env } from '../server/config/env.js';

const app = (await import('../server/app.js')).default;

const token = jwt.sign(
  { userId: 99 },
  'test-jwt-secret-for-automated-tests-only',
  { expiresIn: '1h' }
);

const mockProviderResponse = (payload) => {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  });
};

describe('Places Controller', () => {
  beforeEach(() => {
    env.openChargeMapApiKey = 'test-open-charge-map-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    env.openChargeMapApiKey = '';
  });

  it('requires auth before proxying provider requests', async () => {
    const response = await request(app).get('/api/places/parkings');

    expect(response.status).toBe(401);
  });

  it('loads and normalizes parking data from Overpass API', async () => {
    mockProviderResponse({
      elements: [
        {
          type: 'node',
          id: 123,
          lat: 48.755,
          lon: 8.244,
          tags: {
            name: 'City Garage',
            parking: 'multi_storey',
            fee: 'no',
            wheelchair: 'yes',
            opening_hours: '24/7',
            access: 'private',
            capacity: '120',
            covered: 'yes',
            lit: 'yes',
            supervised: 'yes',
            maxheight: '2.1',
            website: 'https://parking.example.com',
            phone: '+491234',
            image: 'https://images.example.com/parking.jpg',
            'payment:credit_cards': 'yes',
            'addr:street': 'Main Street',
            'addr:housenumber': '1',
          },
        },
      ],
    });

    const response = await request(app)
      .get('/api/places/parkings?neLat=48.76&neLng=8.25&swLat=48.75&swLng=8.24&radius=1000')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      name: 'City Garage',
      address: 'Main Street 1',
      lat: 48.755,
      lon: 8.244,
      properties: {
        source: 'openstreetmap',
        osmId: 123,
        osmType: 'node',
        parkingType: 'multistorey',
        capacity: 120,
        covered: true,
        lit: true,
        supervised: true,
        maxHeight: 2.1,
        website: 'https://parking.example.com',
        phone: '+491234',
        twentyFourHour: true,
        private: true,
        paymentMethods: {
          credit_cards: true,
        },
      },
    });
    expect(response.body[0].properties.media[0]).toMatchObject({
      type: 'image',
      source: 'osm',
      url: 'https://images.example.com/parking.jpg',
    });
    expect(response.body[0].properties.categories).toEqual(
      expect.arrayContaining(['parking', 'parking.multistorey', 'wheelchair', 'no_fee'])
    );
    expect(global.fetch.mock.calls[0][0]).toBe('https://overpass-api.de/api/interpreter');
    expect(global.fetch.mock.calls[0][1].method).toBe('POST');
    expect(global.fetch.mock.calls[0][1].body).toContain('parking%3Aleft');
  });

  it('loads and normalizes EV charger data from Open Charge Map', async () => {
    mockProviderResponse([
      {
        ID: 456,
        UUID: 'station-uuid',
        AddressInfo: {
          Title: 'Fast Charger',
          Latitude: 48.755,
          Longitude: 8.244,
          AddressLine1: 'Main Street 2',
          Town: 'Baden-Baden',
        },
        OperatorInfo: {
          Title: 'Tesla',
        },
        UsageTypeID: 1,
        UsageType: {
          Title: 'Public',
          IsPayAtLocation: true,
          IsMembershipRequired: false,
          IsAccessKeyRequired: false,
        },
        StatusTypeID: 50,
        StatusType: {
          Title: 'Operational',
          IsOperational: true,
        },
        NumberOfPoints: 2,
        UsageCost: '0.50 EUR/kWh',
        IsRecentlyVerified: true,
        GeneralComments: 'Near the main entrance',
        UserComments: [
          {
            ID: 1,
            Comment: 'Worked well',
            Rating: 4,
            UserName: 'Alex',
            DateCreated: '2026-01-01T00:00:00Z',
          },
          {
            ID: 2,
            Comment: 'Busy',
            Rating: 5,
          },
        ],
        MediaItems: [
          {
            ID: 3,
            ItemURL: 'https://images.example.com/charger.jpg',
            ItemThumbnailURL: 'https://images.example.com/charger-thumb.jpg',
            Comment: 'Front view',
          },
        ],
        UserCheckins: [
          {
            ID: 4,
            CheckinStatusType: {
              Title: 'Successful',
            },
          },
        ],
        Connections: [
          {
            ID: 789,
            ConnectionTypeID: 25,
            PowerKW: 150,
            Quantity: 2,
            ConnectionType: {
              Title: 'Type 2',
            },
            CurrentTypeID: 30,
            CurrentType: {
              Title: 'DC',
            },
            LevelID: 3,
            Level: {
              Title: 'Level 3: High',
            },
          },
        ],
      },
    ]);

    const response = await request(app)
      .get('/api/places/ev-chargers?lat=48.755&lng=8.244&radius=1000')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body[0]).toMatchObject({
      name: 'Fast Charger',
      address: 'Main Street 2, Baden-Baden',
      position: {
        latitude: 48.755,
        longitude: 8.244,
      },
      properties: {
        source: 'openchargemap',
        id: 456,
        uuid: 'station-uuid',
        operator: 'Tesla',
        usageTypeId: 1,
        usageType: 'Public',
        statusTypeId: 50,
        status: 'Operational',
        isOperational: true,
        numberOfPoints: 2,
        usageCost: '0.50 EUR/kWh',
        recentlyVerified: true,
        generalComments: 'Near the main entrance',
        averageRating: 4.5,
        hasComments: true,
        hasMedia: true,
        hasCheckins: true,
        maxPowerKw: 150,
      },
    });
    expect(response.body[0].properties.userComments[0]).toMatchObject({
      text: 'Worked well',
      rating: 4,
      userName: 'Alex',
    });
    expect(response.body[0].properties.mediaItems[0]).toMatchObject({
      url: 'https://images.example.com/charger.jpg',
      thumbnailUrl: 'https://images.example.com/charger-thumb.jpg',
    });
    expect(response.body[0].properties.userCheckins[0]).toMatchObject({
      status: 'Successful',
    });
    expect(response.body[0].properties.connections[0]).toMatchObject({
      id: 789,
      connectionTypeId: 25,
      connectionType: 'Type 2',
      currentTypeId: 30,
      currentType: 'DC',
      levelId: 3,
      level: 'Level 3: High',
      powerKw: 150,
      quantity: 2,
    });
    expect(global.fetch.mock.calls[0][0].toString()).toContain('https://api.openchargemap.io/v3/poi/');
    expect(global.fetch.mock.calls[0][0].searchParams.get('key')).toBe('test-open-charge-map-key');
    expect(global.fetch.mock.calls[0][0].searchParams.get('distance')).toBe('1');
    expect(global.fetch.mock.calls[0][0].searchParams.get('compact')).toBe('false');
    expect(global.fetch.mock.calls[0][0].searchParams.get('includecomments')).toBe('true');
  });

  it('passes safe Open Charge Map provider filters through to the API', async () => {
    mockProviderResponse([]);

    const response = await request(app)
      .get('/api/places/ev-chargers?lat=48.755&lng=8.244&radius=1000&connectiontypeid=25,33,x&levelid=3&operatorid=23&title=garage')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(global.fetch.mock.calls[0][0].searchParams.get('connectiontypeid')).toBe('25,33');
    expect(global.fetch.mock.calls[0][0].searchParams.get('levelid')).toBe('3');
    expect(global.fetch.mock.calls[0][0].searchParams.get('operatorid')).toBe('23');
    expect(global.fetch.mock.calls[0][0].searchParams.get('title')).toBe('garage');
  });

  it('returns a clear error when the Open Charge Map key is missing', async () => {
    env.openChargeMapApiKey = '';

    const response = await request(app)
      .get('/api/places/ev-chargers?lat=48.755&lng=8.244&radius=1000')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('Open Charge Map API key is not configured');
  });
});
