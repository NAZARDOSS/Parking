import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { loadCachedParkingsForBounds } from '../server/services/parkingCacheService.js';

describe('Parking Cache Service', () => {
  let cacheDir;

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'parking-cache-'));
  });

  afterEach(async () => {
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  it('loads cached GeoJSON parkings inside requested bounds', async () => {
    await fs.writeFile(
      path.join(cacheDir, 'test.geojson'),
      JSON.stringify({
        type: 'FeatureCollection',
        bbox: [8.16, 48.72, 8.32, 48.83],
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [8.24, 48.75],
                  [8.25, 48.75],
                  [8.25, 48.76],
                  [8.24, 48.76],
                  [8.24, 48.75],
                ],
              ],
            },
            properties: {
              name: 'Cached Garage',
              address: 'Cache Street 1',
              centroidLat: 48.755,
              centroidLon: 8.245,
              isFree: true,
              costIndex: 0,
              covered: true,
              evCharging: true,
              media: [
                {
                  type: 'image',
                  source: 'placeholder',
                  url: 'https://placehold.co/1024x576',
                },
              ],
            },
          },
        ],
      })
    );

    const parkings = await loadCachedParkingsForBounds(
      {
        neLat: 48.76,
        neLng: 8.25,
        swLat: 48.75,
        swLng: 8.24,
      },
      { cacheDir, force: true }
    );

    expect(parkings).toEqual([
      expect.objectContaining({
        name: 'Cached Garage',
        address: 'Cache Street 1',
        lat: 48.755,
        lon: 8.245,
        geometry: expect.objectContaining({
          type: 'Polygon',
        }),
        properties: expect.objectContaining({
          isFree: true,
          costIndex: 0,
          covered: true,
          evCharging: true,
          cacheSource: 'static-geojson',
        }),
      }),
    ]);
  });

  it('skips a cache file when the required point is outside the cache bbox', async () => {
    await fs.writeFile(
      path.join(cacheDir, 'baden-baden.geojson'),
      JSON.stringify({
        type: 'FeatureCollection',
        bbox: [8.16, 48.72, 8.32, 48.83],
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [8.245, 48.755],
            },
            properties: {
              name: 'Cached Garage',
              centroidLat: 48.755,
              centroidLon: 8.245,
            },
          },
        ],
      })
    );

    const parkings = await loadCachedParkingsForBounds(
      {
        neLat: 48.76,
        neLng: 8.25,
        swLat: 48.75,
        swLng: 8.24,
      },
      {
        cacheDir,
        force: true,
        requiredPointInsideCacheBbox: [13.405, 52.52],
      }
    );

    expect(parkings).toEqual([]);
  });
});
