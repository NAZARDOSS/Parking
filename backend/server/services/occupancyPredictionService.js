import { env } from '../config/env.js';

const MAPBOX_DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox';
const MAPBOX_REVERSE_GEOCODE_URL = 'https://api.mapbox.com/search/geocode/v6/reverse';
const NAGER_PUBLIC_HOLIDAYS_URL = 'https://date.nager.at/api/v3/PublicHolidays';

const DEFAULT_WEEKEND_DAYS = [0, 6];
const COUNTRY_WEEKENDS = {
  AE: [5, 6],
  BH: [5, 6],
  DZ: [5, 6],
  EG: [5, 6],
  IL: [5, 6],
  IQ: [5, 6],
  JO: [5, 6],
  KW: [5, 6],
  LY: [5, 6],
  OM: [5, 6],
  QA: [5, 6],
  SA: [5, 6],
  SD: [5, 6],
  SY: [5, 6],
  YE: [5, 6],
};

const predictionCache = new Map();
const countryCache = new Map();
const holidayCache = new Map();

const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

const normalizeCountryCode = (value) => {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
};

const dateKey = (date) => date.toISOString().slice(0, 10);

const buildTemporalContext = (context = {}) => {
  const now = new Date();
  const date = context.localDate && /^\d{4}-\d{2}-\d{2}$/.test(context.localDate)
    ? context.localDate
    : dateKey(now);
  const hour = Number.isInteger(context.localHour) && context.localHour >= 0 && context.localHour <= 23
    ? context.localHour
    : now.getHours();
  const dayOfWeek = Number.isInteger(context.localDayOfWeek) && context.localDayOfWeek >= 0 && context.localDayOfWeek <= 6
    ? context.localDayOfWeek
    : now.getDay();

  return {
    date,
    year: Number(date.slice(0, 4)),
    hour,
    dayOfWeek,
    segment: getTimeSegment(hour),
  };
};

const getTimeSegment = (hour) => {
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 16) return 'day';
  if (hour >= 16 && hour < 20) return 'evening';
  return 'night';
};

const createTrafficSegments = ([lng, lat]) => {
  const lngDelta = 180 / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  const latDelta = 180 / 111320;

  return [
    [
      [lng - lngDelta, lat],
      [lng + lngDelta, lat],
    ],
    [
      [lng, lat - latDelta],
      [lng, lat + latDelta],
    ],
  ];
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ParkingMVP/0.1 occupancy predictor',
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed with ${response.status}`);
  }

  return data;
};

const fetchDirectionsDuration = async ({ profile, from, to, accessToken }) => {
  const url = new URL(`${MAPBOX_DIRECTIONS_URL}/${profile}/${from.join(',')};${to.join(',')}`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('alternatives', 'false');
  url.searchParams.set('overview', 'false');
  url.searchParams.set('steps', 'false');

  const data = await fetchJson(url);
  const duration = toNumber(data?.routes?.[0]?.duration);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
};

const extractCountryCode = (data) => {
  const feature = data?.features?.[0];
  const properties = feature?.properties || {};
  const context = properties.context || {};

  return normalizeCountryCode(
    properties.country_code ||
      properties.countryCode ||
      context.country?.country_code ||
      context.country?.countryCode ||
      context.country?.short_code
  );
};

const getCountryCode = async ({ point, accessToken, predictionContext }) => {
  const contextCountryCode = normalizeCountryCode(predictionContext.countryCode);
  if (contextCountryCode) return contextCountryCode;

  if (!accessToken || !point) return null;

  const cacheKey = point.map((value) => Number(value).toFixed(3)).join(',');
  if (countryCache.has(cacheKey)) return countryCache.get(cacheKey);

  try {
    const url = new URL(MAPBOX_REVERSE_GEOCODE_URL);
    url.searchParams.set('longitude', String(point[0]));
    url.searchParams.set('latitude', String(point[1]));
    url.searchParams.set('types', 'country');
    url.searchParams.set('access_token', accessToken);

    const data = await fetchJson(url);
    const countryCode = extractCountryCode(data);
    countryCache.set(cacheKey, countryCode);
    return countryCode;
  } catch (error) {
    countryCache.set(cacheKey, null);
    return null;
  }
};

const getHolidayInfo = async ({ countryCode, year, date, predictionContext }) => {
  if (predictionContext.isHoliday === true) {
    return {
      isHoliday: true,
      holidayName: predictionContext.holidayName || 'Public holiday',
    };
  }

  if (predictionContext.isHoliday === false) {
    return { isHoliday: false, holidayName: null };
  }

  if (!countryCode || !Number.isInteger(year)) {
    return { isHoliday: false, holidayName: null };
  }

  const cacheKey = `${countryCode}:${year}`;
  if (!holidayCache.has(cacheKey)) {
    holidayCache.set(
      cacheKey,
      fetchJson(`${NAGER_PUBLIC_HOLIDAYS_URL}/${year}/${countryCode}`)
        .then((holidays) => (Array.isArray(holidays) ? holidays : []))
        .catch(() => [])
    );
  }

  const holidays = await holidayCache.get(cacheKey);
  const holiday = holidays.find((item) => item.date === date);

  return {
    isHoliday: Boolean(holiday),
    holidayName: holiday?.localName || holiday?.name || null,
  };
};

const getCongestionIndex = async ({ parking, accessToken, predictionContext }) => {
  const contextIndex = toNumber(predictionContext.congestionIndex);
  if (contextIndex) {
    return {
      index: clamp(contextIndex, 0.7, 4),
      idealDuration: null,
      trafficDuration: null,
      source: 'context',
      confidence: 'medium',
    };
  }

  if (!accessToken) {
    return {
      index: 1,
      idealDuration: null,
      trafficDuration: null,
      source: 'fallback',
      confidence: 'low',
    };
  }

  const lng = toNumber(parking.lon);
  const lat = toNumber(parking.lat);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return {
      index: 1,
      idealDuration: null,
      trafficDuration: null,
      source: 'fallback',
      confidence: 'low',
    };
  }

  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const cacheKey = `${parking.properties?.osmType || 'parking'}:${parking.properties?.osmId || `${lng.toFixed(5)},${lat.toFixed(5)}`}:${bucket}`;
  if (predictionCache.has(cacheKey)) return predictionCache.get(cacheKey);

  for (const [from, to] of createTrafficSegments([lng, lat])) {
    try {
      const [idealDuration, trafficDuration] = await Promise.all([
        fetchDirectionsDuration({
          profile: 'driving',
          from,
          to,
          accessToken,
        }),
        fetchDirectionsDuration({
          profile: 'driving-traffic',
          from,
          to,
          accessToken,
        }),
      ]);

      if (idealDuration && trafficDuration) {
        const result = {
          index: clamp(trafficDuration / idealDuration, 0.7, 4),
          idealDuration,
          trafficDuration,
          source: 'mapbox-directions',
          confidence: 'high',
        };
        predictionCache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      // Try the next local segment direction before falling back.
    }
  }

  const fallback = {
    index: 1,
    idealDuration: null,
    trafficDuration: null,
    source: 'fallback',
    confidence: 'low',
  };
  predictionCache.set(cacheKey, fallback);
  return fallback;
};

const classifyZone = (parking) => {
  const properties = parking.properties || {};
  const tags = properties.tags || {};
  const text = normalizeText([
    parking.name,
    parking.address,
    properties.operator,
    properties.amenity,
    properties.parkingType,
    tags.name,
    tags.operator,
    tags.shop,
    tags.landuse,
    tags.park_ride,
    tags.public_transport,
  ].filter(Boolean).join(' '));

  if (tags.park_ride || /\b(p\+r|park.?ride|bahnhof|station|train|metro|tram)\b/.test(text)) {
    return 'transit';
  }

  if (/\b(mall|shopping|retail|market|markt|center|centre|galerie|plaza|store)\b/.test(text)) {
    return 'retail';
  }

  if (/\b(hospital|clinic|klinik|medical|health)\b/.test(text)) {
    return 'healthcare';
  }

  if (/\b(office|business|bank|city|zentrum|downtown)\b/.test(text)) {
    return 'business';
  }

  if (['street_side', 'lane', 'on_kerb', 'half_on_kerb'].includes(properties.parkingType)) {
    return 'residential';
  }

  if (properties.isCustomersOnly) return 'retail';
  if (['underground', 'multistorey'].includes(properties.parkingType)) return 'business';

  return 'mixed';
};

const baseAvailability = (parking, zoneType) => {
  const properties = parking.properties || {};
  const capacity = toNumber(properties.capacity);
  let probability = {
    business: 0.52,
    retail: 0.48,
    transit: 0.44,
    healthcare: 0.42,
    residential: 0.5,
    mixed: 0.5,
  }[zoneType] ?? 0.5;

  if (properties.isFree) probability -= 0.08;
  if (properties.isPaid) probability += 0.07;
  if (properties.private || properties.isPermitOnly) probability -= 0.08;
  if (properties.isCustomersOnly) probability -= 0.04;
  if (properties.covered) probability -= 0.02;

  if (capacity >= 200) probability += 0.12;
  else if (capacity >= 50) probability += 0.06;
  else if (capacity > 0 && capacity < 15) probability -= 0.08;

  return probability;
};

const buildExplanation = ({ probability, zoneType, temporal, isWeekend, holidayName, congestion }) => {
  const levelText = probability >= 0.66
    ? 'high chance of finding a free spot'
    : probability >= 0.36
      ? 'medium chance of finding a free spot'
      : 'low chance of finding a free spot';
  const trafficText = congestion.index >= 1.7
    ? 'heavy nearby traffic'
    : congestion.index >= 1.25
      ? 'moderate nearby traffic'
      : 'normal nearby traffic';
  const dayText = holidayName
    ? `public holiday (${holidayName})`
    : isWeekend
      ? 'weekend pattern'
      : 'working-day pattern';

  return `Predicted ${levelText}: ${trafficText}, ${temporal.segment} period, ${zoneType} zone, ${dayText}.`;
};

const getAvailabilityLevel = (probability) => {
  if (probability >= 0.66) {
    return { level: 'high', color: 'green', label: 'Likely free' };
  }
  if (probability >= 0.36) {
    return { level: 'medium', color: 'yellow', label: 'May be busy' };
  }
  return { level: 'low', color: 'red', label: 'Likely full' };
};

const calculateProbability = ({ parking, zoneType, temporal, congestion, isWeekend, isHoliday }) => {
  let probability = baseAvailability(parking, zoneType);
  const congestionPressure = clamp((congestion.index - 1) / 1.4, 0, 1);

  if (isHoliday) {
    if (zoneType === 'business') probability += 0.18;
    if (zoneType === 'retail') probability -= 0.1;
    if (zoneType === 'transit') probability += 0.06;
  } else if (isWeekend) {
    if (zoneType === 'business') probability += 0.14;
    if (zoneType === 'retail') probability -= 0.12;
    if (zoneType === 'residential') probability -= 0.04;
  }

  if (zoneType === 'business') {
    if (temporal.segment === 'morning') probability -= 0.12 + 0.28 * congestionPressure;
    if (temporal.segment === 'day') probability -= 0.08 + 0.15 * congestionPressure;
    if (temporal.segment === 'evening') probability += 0.08 + 0.24 * congestionPressure;
    if (temporal.segment === 'night') probability += 0.18;
  } else if (zoneType === 'retail') {
    if (['day', 'evening'].includes(temporal.segment)) probability -= 0.12 + 0.3 * congestionPressure;
    if (temporal.segment === 'morning') probability += 0.08;
    if (temporal.segment === 'night') probability += 0.22;
  } else if (zoneType === 'transit') {
    if (temporal.segment === 'morning') probability -= 0.08 + 0.22 * congestionPressure;
    if (temporal.segment === 'evening') probability += 0.05 + 0.14 * congestionPressure;
    if (temporal.segment === 'night') probability -= 0.05;
  } else if (zoneType === 'residential') {
    if (['evening', 'night'].includes(temporal.segment)) probability -= 0.12 + 0.14 * congestionPressure;
    if (temporal.segment === 'day') probability += 0.12;
  } else {
    if (congestion.index >= 1.25) probability -= 0.15 * congestionPressure;
    if (temporal.segment === 'night') probability += 0.12;
    if (temporal.segment === 'evening' && zoneType !== 'retail') probability += 0.04;
  }

  return clamp(probability, 0.05, 0.95);
};

export const predictParkingOccupancy = async ({
  parking,
  accessToken = env.mapboxAccessToken,
  predictionContext = {},
} = {}) => {
  if (!parking || !Number.isFinite(Number(parking.lat)) || !Number.isFinite(Number(parking.lon))) {
    const error = new Error('Valid parking coordinates are required');
    error.statusCode = 400;
    throw error;
  }

  const temporal = buildTemporalContext(predictionContext);
  const countryCode = await getCountryCode({
    point: [Number(parking.lon), Number(parking.lat)],
    accessToken,
    predictionContext,
  });
  const weekendDays = COUNTRY_WEEKENDS[countryCode] || DEFAULT_WEEKEND_DAYS;
  const isWeekend = weekendDays.includes(temporal.dayOfWeek);
  const holiday = await getHolidayInfo({
    countryCode,
    year: temporal.year,
    date: temporal.date,
    predictionContext,
  });
  const congestion = await getCongestionIndex({
    parking,
    accessToken,
    predictionContext,
  });
  const zoneType = classifyZone(parking);
  const probability = calculateProbability({
    parking,
    zoneType,
    temporal,
    congestion,
    isWeekend,
    isHoliday: holiday.isHoliday,
  });
  const availability = getAvailabilityLevel(probability);

  return {
    probability: round(probability, 2),
    level: availability.level,
    color: availability.color,
    label: availability.label,
    explanation: buildExplanation({
      probability,
      zoneType,
      temporal,
      isWeekend,
      holidayName: holiday.holidayName,
      congestion,
    }),
    congestionIndex: round(congestion.index, 2),
    idealDuration: congestion.idealDuration,
    trafficDuration: congestion.trafficDuration,
    congestionSource: congestion.source,
    countryCode,
    isWeekend,
    isHoliday: holiday.isHoliday,
    holidayName: holiday.holidayName,
    zoneType,
    timeSegment: temporal.segment,
    localDate: temporal.date,
    localHour: temporal.hour,
    confidence: congestion.confidence,
  };
};

export const applyOccupancyPredictions = async ({
  candidates,
  accessToken = env.mapboxAccessToken,
  predictionContext = {},
  limit = 8,
}) => {
  const predictionLimit = clamp(Number(limit) || 0, 0, candidates.length);
  const predictionTargets = candidates.slice(0, predictionLimit);
  const firstParking = predictionTargets[0]?.rawParking || predictionTargets[0]?.parking;
  const sharedPredictionContext = { ...predictionContext };

  if (!normalizeCountryCode(sharedPredictionContext.countryCode) && firstParking) {
    const countryCode = await getCountryCode({
      point: [Number(firstParking.lon), Number(firstParking.lat)],
      accessToken,
      predictionContext: sharedPredictionContext,
    });

    if (countryCode) {
      sharedPredictionContext.countryCode = countryCode;
    }
  }

  const predictions = await Promise.all(
    predictionTargets.map((candidate) =>
      predictParkingOccupancy({
        parking: candidate.rawParking || candidate.parking,
        accessToken,
        predictionContext: sharedPredictionContext,
      }).catch(() => null)
    )
  );

  return predictionTargets
    .map((candidate, index) => {
      const prediction = predictions[index] || null;
      const baseUtilityScore = candidate.score;
      const probability = prediction?.probability ?? 1;
      const { rawParking, ...publicCandidate } = candidate;

      return {
        ...publicCandidate,
        score: round(baseUtilityScore * probability, 4),
        baseUtilityScore,
        scoreParts: {
          ...candidate.scoreParts,
          baseUtilityScore,
          occupancyProbability: prediction?.probability ?? null,
        },
        occupancyPrediction: prediction,
      };
    })
    .sort((a, b) => b.score - a.score);
};
