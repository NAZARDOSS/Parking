import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE_DIR = path.resolve(__dirname, '../data/parking-cache');

const coordinateInBounds = ([lng, lat], bounds) =>
  lat <= bounds.neLat &&
  lat >= bounds.swLat &&
  lng <= bounds.neLng &&
  lng >= bounds.swLng;

const coordinateInGeoJsonBbox = ([lng, lat], bbox) => {
  if (!Array.isArray(bbox) || bbox.length !== 4) return false;

  const [west, south, east, north] = bbox.map(Number);

  if (![west, south, east, north, lng, lat].every(Number.isFinite)) return false;

  return lng >= west && lng <= east && lat >= south && lat <= north;
};

const getFeatureCenter = (feature) => {
  const properties = feature?.properties || {};
  const lat = Number(properties.centroidLat ?? properties.lat);
  const lon = Number(properties.centroidLon ?? properties.lon);

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return [lon, lat];
  }

  const coordinates = feature?.geometry?.coordinates;
  if (feature?.geometry?.type === 'Point' && Array.isArray(coordinates)) {
    return coordinates;
  }

  if (feature?.geometry?.type === 'Polygon' && Array.isArray(coordinates?.[0])) {
    const ring = coordinates[0];
    const validCoordinates = ring.filter(([lngValue, latValue]) =>
      Number.isFinite(Number(lngValue)) && Number.isFinite(Number(latValue))
    );

    if (validCoordinates.length) {
      const [sumLng, sumLat] = validCoordinates.reduce(
        ([lngTotal, latTotal], [lngValue, latValue]) => [
          lngTotal + Number(lngValue),
          latTotal + Number(latValue),
        ],
        [0, 0]
      );

      return [sumLng / validCoordinates.length, sumLat / validCoordinates.length];
    }
  }

  return null;
};

const featureToParking = (feature) => {
  const properties = feature?.properties || {};
  const center = getFeatureCenter(feature);

  if (!center) return null;

  const [lon, lat] = center;
  const {
    name,
    address,
    centroidLat,
    centroidLon,
    lat: propertyLat,
    lon: propertyLon,
    ...parkingProperties
  } = properties;

  return {
    name: name || 'Parking',
    address: address || '',
    lat: Number(propertyLat ?? centroidLat ?? lat),
    lon: Number(propertyLon ?? centroidLon ?? lon),
    geometry: feature.geometry || null,
    properties: {
      ...parkingProperties,
      cacheSource: parkingProperties.cacheSource || 'static-geojson',
    },
  };
};

const readCacheFile = async (filePath) => {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
};

const listGeoJsonFiles = async (cacheDir) => {
  try {
    const entries = await fs.readdir(cacheDir);
    return entries
      .filter((entry) => entry.endsWith('.geojson') || entry.endsWith('.json'))
      .map((entry) => path.join(cacheDir, entry));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
};

export const loadCachedParkingsForBounds = async (
  bounds,
  {
    cacheDir = process.env.PARKING_CACHE_DIR || DEFAULT_CACHE_DIR,
    force = false,
    requiredPointInsideCacheBbox = null,
  } = {}
) => {
  if (env.isTest && !force) return [];

  const files = await listGeoJsonFiles(cacheDir);
  const cachedParkings = [];

  for (const filePath of files) {
    const featureCollection = await readCacheFile(filePath);

    if (
      requiredPointInsideCacheBbox &&
      !coordinateInGeoJsonBbox(requiredPointInsideCacheBbox, featureCollection.bbox)
    ) {
      continue;
    }

    const features = Array.isArray(featureCollection.features) ? featureCollection.features : [];

    features.forEach((feature) => {
      const center = getFeatureCenter(feature);
      if (!center || !coordinateInBounds(center, bounds)) return;

      const parking = featureToParking(feature);
      if (parking) {
        cachedParkings.push(parking);
      }
    });
  }

  return cachedParkings;
};

export const parkingCacheDirectory = DEFAULT_CACHE_DIR;
