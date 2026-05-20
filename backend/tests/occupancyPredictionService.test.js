import { jest } from '@jest/globals';
import { predictParkingOccupancy } from '../server/services/occupancyPredictionService.js';

describe('Occupancy Prediction Service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses traffic delta, temporal context and zone type to predict free probability', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ duration: 100 }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [{ duration: 240 }],
        }),
      });

    const prediction = await predictParkingOccupancy({
      accessToken: 'test-mapbox-token',
      predictionContext: {
        countryCode: 'DE',
        isHoliday: false,
        localDate: '2026-05-14',
        localDayOfWeek: 4,
        localHour: 8,
      },
      parking: {
        name: 'City Business Garage',
        lat: 48.755,
        lon: 8.245,
        properties: {
          osmId: 123,
          osmType: 'way',
          parkingType: 'multistorey',
          capacity: 40,
          isPaid: true,
          isFree: false,
          tags: {
            name: 'City Business Garage',
          },
        },
      },
    });

    expect(prediction).toMatchObject({
      countryCode: 'DE',
      timeSegment: 'morning',
      zoneType: 'business',
      congestionIndex: 2.4,
      confidence: 'high',
    });
    expect(prediction.probability).toBeLessThan(0.35);
    expect(prediction.explanation).toContain('heavy nearby traffic');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/directions/v5/mapbox/driving/');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/directions/v5/mapbox/driving-traffic/');
  });
});
