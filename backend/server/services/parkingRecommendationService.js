import { env } from '../config/env.js';
import { applyOccupancyPredictions } from './occupancyPredictionService.js';
import { loadCachedParkingsForBounds } from './parkingCacheService.js';

const MAPBOX_MATRIX_URL = 'https://api.mapbox.com/directions-matrix/v1/mapbox';
const DEFAULT_RADIUS_METERS = 1000;
const MAX_RADIUS_METERS = 1000;
const MAX_PREFILTERED_CANDIDATES = 20;
const MAX_MATRIX_COORDINATES = 25;

const SCORING_WEIGHTS = {
  driveTime: 0.4,
  walkTime: 0.3,
  cost: 0.2,
  preference: 0.1,
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const clampInteger = (value, fallback, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
};

export const distanceMeters = (from, to) => {
  if (!from || !to) return Number.POSITIVE_INFINITY;

  const [fromLng, fromLat] = from.map(Number);
  const [toLng, toLat] = to.map(Number);

  if (![fromLng, fromLat, toLng, toLat].every(Number.isFinite)) {
    return Number.POSITIVE_INFINITY;
  }

  const radius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) *
      Math.cos(toRadians(toLat)) *
      Math.sin(deltaLng / 2) ** 2;

  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const boundsAroundPoint = ([lng, lat], radiusMeters = DEFAULT_RADIUS_METERS) => {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));

  return {
    neLat: lat + latDelta,
    neLng: lng + lngDelta,
    swLat: lat - latDelta,
    swLng: lng - lngDelta,
  };
};

const normalizeLowerIsBetter = (values, value) => {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length || !Number.isFinite(value)) return 0;

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);

  if (min === max) return 1;

  return 1 - (value - min) / (max - min);
};

const numberFromText = (value) => {
  const match = String(value || '').match(/\d+([.,]\d+)?/);
  if (!match) return null;

  return Number(match[0].replace(',', '.'));
};

const getCostValue = (parking) => {
  const properties = parking.properties || {};
  const explicitCost = toNumber(properties.costIndex) ?? numberFromText(properties.charge || properties.fee);

  if (properties.isFree) return 0;
  if (Number.isFinite(explicitCost)) return explicitCost;
  if (properties.isPaid) return 2;

  return 1;
};

const getCostLabel = (parking) => {
  const properties = parking.properties || {};

  if (properties.isFree) return 'Free';
  if (properties.charge) return properties.charge;
  if (properties.isPaid) return 'Paid';
  if (properties.fee) return properties.fee;

  return 'Unknown';
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const normalizeTagValue = (value) => normalizeText(value).replace(/\s+/g, '_');

const includesText = (value, needle) => normalizeText(value).includes(normalizeText(needle));

const hasAnyText = (values, needle) =>
  !String(needle ?? '').trim() || values.some((value) => includesText(value, needle));

const hasActiveParkingFilters = (filters = {}) =>
  Object.values(filters).some((value) => {
    if (typeof value === 'boolean') return value;
    return String(value ?? '').trim() !== '';
  });

const hasParkingCategory = (parking, category) =>
  (parking.properties?.categories || []).includes(category);

const getParkingType = (parking) => normalizeTagValue(parking.properties?.parkingType);

const isStreetParking = (parking) => {
  const type = getParkingType(parking);
  return (
    hasParkingCategory(parking, 'parking.street') ||
    ['street_side', 'lane', 'on_kerb', 'half_on_kerb', 'shoulder'].includes(type)
  );
};

const matchesParkingFilters = (parking, filters = {}) => {
  if (!hasActiveParkingFilters(filters)) return true;

  const properties = parking.properties || {};
  const tags = properties.tags || {};
  const parkingType = getParkingType(parking);
  const capacity = toNumber(properties.capacity);
  const disabledCapacity = toNumber(properties.disabledCapacity);
  const maxHeight = toNumber(properties.maxHeight);
  const paymentMethods = properties.paymentMethods || {};
  const searchableValues = [
    parking.name,
    parking.address,
    properties.name,
    properties.address,
    properties.operator,
    properties.parkingType,
    properties.access,
    properties.fee,
    tags.ref,
  ];

  if (!hasAnyText(searchableValues, filters.search)) return false;
  if (!hasAnyText([properties.operator], filters.operator)) return false;

  if (filters.free && !properties.isFree) return false;
  if (filters.paid && !properties.isPaid) return false;
  if (filters.publicAccess && !properties.isPublic) return false;
  if (filters.private && !properties.private) return false;
  if (filters.customers && !properties.isCustomersOnly) return false;
  if (filters.permit && !properties.isPermitOnly) return false;

  if (filters.wheelchair && !hasParkingCategory(parking, 'wheelchair')) return false;
  if (filters.disabledSpaces && !(disabledCapacity > 0)) return false;
  if (filters.twentyFour && !properties.twentyFourHour) return false;
  if (filters.hasOpeningHours && !properties.openingHours) return false;

  if (filters.garage && !['underground', 'multistorey'].includes(parkingType)) return false;
  if (filters.underground && parkingType !== 'underground') return false;
  if (filters.multistorey && parkingType !== 'multistorey') return false;
  if (filters.surface && !['surface', ''].includes(parkingType)) return false;
  if (filters.street && !isStreetParking(parking)) return false;
  if (filters.streetSide && parkingType !== 'street_side') return false;
  if (filters.parkingSpace && !hasParkingCategory(parking, 'parking.space')) return false;

  if (filters.covered && !properties.covered) return false;
  if (filters.lit && !properties.lit) return false;
  if (filters.supervised && !properties.supervised) return false;
  if (filters.surveillance && !properties.surveillance) return false;
  if (filters.hasCapacity && !(capacity > 0)) return false;
  if (filters.minCapacity && !(capacity >= Number(filters.minCapacity))) return false;
  if (filters.hasMaxStay && !properties.maxStay) return false;
  if (filters.hasMaxHeight && !(maxHeight > 0)) return false;
  if (filters.maxHeightMeters && !(maxHeight >= Number(filters.maxHeightMeters))) return false;
  if (filters.acceptsCash && !(paymentMethods.cash || paymentMethods.coins)) return false;
  if (filters.acceptsCard && !(paymentMethods.credit_cards || paymentMethods.debit_cards)) return false;
  if (filters.acceptsContactless && !paymentMethods.contactless) return false;
  if (filters.acceptsApp && !paymentMethods.app) return false;
  if (filters.chargingSpaces && !(properties.hasChargingSpaces || properties.evCharging)) return false;

  return true;
};

const preferenceChecks = {
  free: (properties) => properties.isFree,
  paid: (properties) => properties.isPaid,
  publicAccess: (properties) => properties.isPublic,
  private: (properties) => properties.private,
  customers: (properties) => properties.isCustomersOnly,
  permit: (properties) => properties.isPermitOnly,
  wheelchair: (properties, parking) => parking.properties?.categories?.includes('wheelchair'),
  disabledSpaces: (properties) => Number(properties.disabledCapacity) > 0,
  twentyFour: (properties) => properties.twentyFourHour,
  hasOpeningHours: (properties) => Boolean(properties.openingHours),
  garage: (properties) => ['underground', 'multistorey'].includes(properties.parkingType),
  underground: (properties) => properties.parkingType === 'underground',
  multistorey: (properties) => properties.parkingType === 'multistorey',
  surface: (properties) => ['surface', null, undefined, ''].includes(properties.parkingType),
  street: (properties, parking) => parking.properties?.categories?.includes('parking.street'),
  streetSide: (properties) => properties.parkingType === 'street_side',
  parkingSpace: (properties, parking) => parking.properties?.categories?.includes('parking.space'),
  covered: (properties) => properties.covered,
  lit: (properties) => properties.lit,
  supervised: (properties) => properties.supervised,
  surveillance: (properties) => properties.surveillance,
  hasCapacity: (properties) => Number(properties.capacity) > 0,
  minCapacity: (properties, parking, filters) => Number(properties.capacity) >= Number(filters.minCapacity),
  hasMaxStay: (properties) => Boolean(properties.maxStay),
  hasMaxHeight: (properties) => Number(properties.maxHeight) > 0,
  maxHeightMeters: (properties, parking, filters) => Number(properties.maxHeight) >= Number(filters.maxHeightMeters),
  acceptsCash: (properties) => properties.paymentMethods?.cash || properties.paymentMethods?.coins,
  acceptsCard: (properties) => properties.paymentMethods?.credit_cards || properties.paymentMethods?.debit_cards,
  acceptsContactless: (properties) => properties.paymentMethods?.contactless,
  acceptsApp: (properties) => properties.paymentMethods?.app,
  chargingSpaces: (properties) => properties.hasChargingSpaces || properties.evCharging,
};

const getPreferenceScore = (parking, filters = {}) => {
  const activePreferenceKeys = Object.entries(filters)
    .filter(([key, value]) => Boolean(value) && preferenceChecks[key])
    .map(([key]) => key);

  if (!activePreferenceKeys.length) return 1;

  const properties = parking.properties || {};
  const matches = activePreferenceKeys.filter((key) => preferenceChecks[key](properties, parking, filters));

  return matches.length / activePreferenceKeys.length;
};

const safeParkingProperties = (properties = {}) => {
  const {
    tags,
    paymentMethods,
    media,
    categories,
    ...rest
  } = properties;

  return {
    ...rest,
    categories: categories || [],
    paymentMethods: paymentMethods || {},
    media: (media || []).slice(0, 2),
  };
};

const compactParking = (parking) => ({
  name: parking.name || 'Parking',
  address: parking.address || '',
  lat: parking.lat,
  lon: parking.lon,
  geometry: parking.geometry || null,
  properties: safeParkingProperties(parking.properties),
});

const fetchMatrix = async ({ profile, coordinates, sources, destinations, accessToken }) => {
  if (coordinates.length > MAX_MATRIX_COORDINATES) {
    throw new Error(`Matrix request has ${coordinates.length} coordinates, max is ${MAX_MATRIX_COORDINATES}`);
  }

  const url = new URL(`${MAPBOX_MATRIX_URL}/${profile}/${coordinates.map((coordinate) => coordinate.join(',')).join(';')}`);
  url.searchParams.set('annotations', 'duration,distance');
  url.searchParams.set('sources', sources.join(';'));
  url.searchParams.set('destinations', destinations.join(';'));
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ParkingMVP/0.1 dynamic scoring',
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.code !== 'Ok') {
    throw new Error(data?.message || data?.code || `Mapbox Matrix ${profile} request failed`);
  }

  return data;
};

const metricAt = (matrix, rowIndex, columnIndex) => {
  const value = matrix?.[rowIndex]?.[columnIndex];
  return Number.isFinite(value) ? value : null;
};

const getCandidatePool = async ({
  finishPoint,
  radiusMeters,
  maxCandidates,
  parkingFilters,
  cacheDir,
  forceCache,
  fallbackParkingsProvider,
}) => {
  const bounds = boundsAroundPoint(finishPoint, radiusMeters);
  const cachedParkings = await loadCachedParkingsForBounds(bounds, {
    cacheDir,
    force: forceCache,
    requiredPointInsideCacheBbox: finishPoint,
  });

  const buildRadialCandidates = (parkings = []) =>
    parkings
      .map((parking) => ({
        parking,
        destinationDistance: distanceMeters([parking.lon, parking.lat], finishPoint),
      }))
      .filter(({ destinationDistance }) => destinationDistance <= radiusMeters)
      .sort((a, b) => a.destinationDistance - b.destinationDistance);

  let source = 'parking-cache';
  let radialCandidates = buildRadialCandidates(cachedParkings);

  if (!radialCandidates.length && typeof fallbackParkingsProvider === 'function') {
    const fallbackParkings = await fallbackParkingsProvider(bounds);
    radialCandidates = buildRadialCandidates(Array.isArray(fallbackParkings) ? fallbackParkings : []);
    source = 'overpass-api';
  }

  const filtersApplied = hasActiveParkingFilters(parkingFilters);
  const filteredCandidates = filtersApplied
    ? radialCandidates.filter(({ parking }) => matchesParkingFilters(parking, parkingFilters))
    : radialCandidates;

  return {
    candidatePool: filteredCandidates.slice(0, maxCandidates),
    filtersApplied,
    radialCandidateCount: radialCandidates.length,
    filteredCandidateCount: filteredCandidates.length,
    source,
  };
};

const buildScoredCandidates = ({ candidatePool, drivingMatrix, walkingMatrix, cyclingMatrix, parkingFilters }) => {
  const matrixCandidates = candidatePool
    .map(({ parking, destinationDistance }, index) => {
      const driveDuration = metricAt(drivingMatrix.durations, 0, index);
      const driveDistance = metricAt(drivingMatrix.distances, 0, index);
      const walkDuration = metricAt(walkingMatrix.durations, index, 0);
      const walkDistance = metricAt(walkingMatrix.distances, index, 0);
      const cyclingDuration = cyclingMatrix ? metricAt(cyclingMatrix.durations, 0, index) : null;
      const cyclingDistance = cyclingMatrix ? metricAt(cyclingMatrix.distances, 0, index) : null;

      if (!Number.isFinite(driveDuration) || !Number.isFinite(walkDuration)) return null;

      return {
        parking,
        costValue: getCostValue(parking),
        preferenceScore: getPreferenceScore(parking, parkingFilters),
        metrics: {
          driveDuration,
          driveDistance,
          walkDuration,
          walkDistance,
          cyclingDuration,
          cyclingDistance,
          costLabel: getCostLabel(parking),
          destinationDistance,
        },
      };
    })
    .filter(Boolean);

  const driveDurations = matrixCandidates.map((candidate) => candidate.metrics.driveDuration);
  const walkDurations = matrixCandidates.map((candidate) => candidate.metrics.walkDuration);
  const costValues = matrixCandidates.map((candidate) => candidate.costValue);

  return matrixCandidates
    .map((candidate) => {
      const driveScore = normalizeLowerIsBetter(driveDurations, candidate.metrics.driveDuration);
      const walkScore = normalizeLowerIsBetter(walkDurations, candidate.metrics.walkDuration);
      const costScore = normalizeLowerIsBetter(costValues, candidate.costValue);
      const preferenceScore = candidate.preferenceScore;
      const score =
        SCORING_WEIGHTS.driveTime * driveScore +
        SCORING_WEIGHTS.walkTime * walkScore +
        SCORING_WEIGHTS.cost * costScore +
        SCORING_WEIGHTS.preference * preferenceScore;

      return {
        rawParking: candidate.parking,
        parking: compactParking(candidate.parking),
        score,
        scoreParts: {
          driveScore,
          walkScore,
          costScore,
          preferenceScore,
        },
        metrics: candidate.metrics,
        weights: SCORING_WEIGHTS,
      };
    })
    .sort((a, b) => b.score - a.score);
};

export const recommendParkings = async ({
  startPoint,
  finishPoint,
  parkingFilters = {},
  radiusMeters = DEFAULT_RADIUS_METERS,
  maxCandidates = MAX_PREFILTERED_CANDIDATES,
  limit = 3,
  includeCycling = false,
  enableOccupancyPrediction = true,
  occupancyPredictionLimit = 8,
  predictionContext = {},
  accessToken = env.mapboxAccessToken,
  cacheDir,
  forceCache = false,
  fallbackParkingsProvider,
}) => {
  if (!accessToken) {
    const error = new Error('Mapbox access token is not configured');
    error.statusCode = 503;
    throw error;
  }

  const safeRadius = Math.min(MAX_RADIUS_METERS, Math.max(1, Number(radiusMeters) || DEFAULT_RADIUS_METERS));
  const safeMaxCandidates = clampInteger(maxCandidates, MAX_PREFILTERED_CANDIDATES, 1, MAX_MATRIX_COORDINATES - 1);
  const safeLimit = clampInteger(limit, 3, 1, 10);
  const {
    candidatePool,
    filtersApplied,
    radialCandidateCount,
    filteredCandidateCount,
    source,
  } = await getCandidatePool({
    finishPoint,
    radiusMeters: safeRadius,
    maxCandidates: safeMaxCandidates,
    parkingFilters,
    cacheDir,
    forceCache,
    fallbackParkingsProvider,
  });

  if (!candidatePool.length) {
    return {
      candidates: [],
      meta: {
        radiusMeters: safeRadius,
        prefilteredCount: 0,
        radialCandidateCount,
        filteredCandidateCount,
        filtersApplied,
        matrixCandidateCount: 0,
        matrixCoordinateLimit: MAX_MATRIX_COORDINATES,
        source,
      },
    };
  }

  const candidateCoordinates = candidatePool.map(({ parking }) => [parking.lon, parking.lat]);
  const destinations = candidateCoordinates.map((_, index) => index + 1);
  const sources = candidateCoordinates.map((_, index) => index);

  const drivingRequest = fetchMatrix({
    profile: 'driving',
    coordinates: [startPoint, ...candidateCoordinates],
    sources: [0],
    destinations,
    accessToken,
  });

  const walkingRequest = fetchMatrix({
    profile: 'walking',
    coordinates: [...candidateCoordinates, finishPoint],
    sources,
    destinations: [candidateCoordinates.length],
    accessToken,
  });

  const [drivingMatrix, walkingMatrix, cyclingMatrix] = await Promise.all([
    drivingRequest,
    walkingRequest,
    includeCycling
      ? fetchMatrix({
          profile: 'cycling',
          coordinates: [startPoint, ...candidateCoordinates],
          sources: [0],
          destinations,
          accessToken,
        })
      : Promise.resolve(null),
  ]);

  const baseScoredCandidates = buildScoredCandidates({
    candidatePool,
    drivingMatrix,
    walkingMatrix,
    cyclingMatrix,
    parkingFilters,
  });
  const scoredCandidates = enableOccupancyPrediction
    ? await applyOccupancyPredictions({
        candidates: baseScoredCandidates,
        accessToken,
        predictionContext,
        limit: occupancyPredictionLimit,
      })
    : baseScoredCandidates.map(({ rawParking, ...candidate }) => candidate);

  return {
    candidates: scoredCandidates.slice(0, safeLimit),
    meta: {
      radiusMeters: safeRadius,
      prefilteredCount: candidatePool.length,
      radialCandidateCount,
      filteredCandidateCount,
      filtersApplied,
      matrixCandidateCount: scoredCandidates.length,
      occupancyPrediction: {
        enabled: Boolean(enableOccupancyPrediction),
        predictedCount: enableOccupancyPrediction
          ? Math.min(Number(occupancyPredictionLimit) || 0, baseScoredCandidates.length)
          : 0,
      },
      matrixCoordinateLimit: MAX_MATRIX_COORDINATES,
      matrixRequests: {
        driving: '1xN',
        walking: 'Nx1',
        cycling: includeCycling ? '1xN' : null,
      },
      source,
    },
  };
};
