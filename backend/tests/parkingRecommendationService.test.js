import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { recommendParkings } from '../server/services/parkingRecommendationService.js';

const writeCache = async (cacheDir) => {
  await fs.writeFile(
    path.join(cacheDir, 'test.geojson'),
    JSON.stringify({
      type: 'FeatureCollection',
      bbox: [8.16, 48.72, 8.32, 48.83],
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [8.245, 48.755] },
          properties: {
            name: 'Free Covered Garage',
            centroidLat: 48.755,
            centroidLon: 8.245,
            isFree: true,
            isPaid: false,
            costIndex: 0,
            covered: true,
            hasChargingSpaces: true,
            categories: ['parking'],
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [8.247, 48.756] },
          properties: {
            name: 'Paid Surface Lot',
            centroidLat: 48.756,
            centroidLon: 8.247,
            isFree: false,
            isPaid: true,
            costIndex: 2,
            covered: false,
            categories: ['parking'],
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [8.4, 48.9] },
          properties: {
            name: 'Too Far Away',
            centroidLat: 48.9,
            centroidLon: 8.4,
            costIndex: 0,
          },
        },
      ],
    })
  );
};

describe('Parking Recommendation Service', () => {
  let cacheDir;

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'parking-reco-'));
    await writeCache(cacheDir);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  it('prefilters by radius, calls Mapbox Matrix as 1xN and Nx1, and returns scored top candidates', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          durations: [[300, 120]],
          distances: [[2000, 1200]],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          durations: [[240], [80]],
          distances: [[600], [150]],
        }),
      });

    const result = await recommendParkings({
      startPoint: [8.2, 48.75],
      finishPoint: [8.246, 48.7555],
      radiusMeters: 1000,
      enableOccupancyPrediction: false,
      accessToken: 'test-mapbox-token',
      cacheDir,
      forceCache: true,
    });

    expect(result.candidates).toHaveLength(2);
    expect(result.candidates[0]).toMatchObject({
      parking: {
        name: 'Free Covered Garage',
      },
      scoreParts: {
        costScore: 1,
        preferenceScore: 1,
      },
    });
    expect(result.meta).toMatchObject({
      radiusMeters: 1000,
      prefilteredCount: 2,
      radialCandidateCount: 2,
      filteredCandidateCount: 2,
      filtersApplied: false,
      matrixCandidateCount: 2,
      matrixRequests: {
        driving: '1xN',
        walking: 'Nx1',
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const drivingUrl = new URL(fetchMock.mock.calls[0][0]);
    const walkingUrl = new URL(fetchMock.mock.calls[1][0]);

    expect(drivingUrl.pathname).toContain('/directions-matrix/v1/mapbox/driving/');
    expect(drivingUrl.searchParams.get('sources')).toBe('0');
    expect(drivingUrl.searchParams.get('destinations')).toBe('1;2');
    expect(walkingUrl.pathname).toContain('/directions-matrix/v1/mapbox/walking/');
    expect(walkingUrl.searchParams.get('sources')).toBe('0;1');
    expect(walkingUrl.searchParams.get('destinations')).toBe('2');
  });

  it('applies active parking filters before calling Matrix', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          durations: [[300]],
          distances: [[2000]],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          durations: [[240]],
          distances: [[600]],
        }),
      });

    const result = await recommendParkings({
      startPoint: [8.2, 48.75],
      finishPoint: [8.246, 48.7555],
      radiusMeters: 1000,
      parkingFilters: { covered: true, chargingSpaces: true },
      enableOccupancyPrediction: false,
      accessToken: 'test-mapbox-token',
      cacheDir,
      forceCache: true,
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      parking: {
        name: 'Free Covered Garage',
      },
      scoreParts: {
        costScore: 1,
        preferenceScore: 1,
      },
    });
    expect(result.meta).toMatchObject({
      radiusMeters: 1000,
      prefilteredCount: 1,
      radialCandidateCount: 2,
      filteredCandidateCount: 1,
      filtersApplied: true,
      matrixCandidateCount: 1,
    });

    const drivingUrl = new URL(fetchMock.mock.calls[0][0]);
    const walkingUrl = new URL(fetchMock.mock.calls[1][0]);

    expect(drivingUrl.searchParams.get('sources')).toBe('0');
    expect(drivingUrl.searchParams.get('destinations')).toBe('1');
    expect(walkingUrl.searchParams.get('sources')).toBe('0');
    expect(walkingUrl.searchParams.get('destinations')).toBe('1');
  });

  it('uses fallback parkings when the cache does not cover the destination', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    const fallbackParkingsProvider = jest.fn(async () => [
      {
        name: 'Live Overpass Parking',
        address: '',
        lat: 52.5205,
        lon: 13.4055,
        geometry: null,
        properties: {
          source: 'openstreetmap',
          costIndex: 1,
          categories: ['parking'],
        },
      },
    ]);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          durations: [[300]],
          distances: [[1000]],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          durations: [[120]],
          distances: [[300]],
        }),
      });

    const result = await recommendParkings({
      startPoint: [13.39, 52.52],
      finishPoint: [13.405, 52.52],
      radiusMeters: 1000,
      enableOccupancyPrediction: false,
      accessToken: 'test-mapbox-token',
      cacheDir,
      forceCache: true,
      fallbackParkingsProvider,
    });

    expect(fallbackParkingsProvider).toHaveBeenCalledTimes(1);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].parking.name).toBe('Live Overpass Parking');
    expect(result.meta).toMatchObject({
      source: 'overpass-api',
      prefilteredCount: 1,
      radialCandidateCount: 1,
      filteredCandidateCount: 1,
      matrixCandidateCount: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
