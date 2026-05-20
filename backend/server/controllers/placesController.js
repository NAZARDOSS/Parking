import { env } from '../config/env.js';
import { predictParkingOccupancy } from '../services/occupancyPredictionService.js';
import { loadCachedParkingsForBounds } from '../services/parkingCacheService.js';
import { recommendParkings } from '../services/parkingRecommendationService.js';

const PROVIDER_TIMEOUT_MS = 15000;
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const OPEN_CHARGE_MAP_API_URL = 'https://api.openchargemap.io/v3/poi/';
const MAX_PROVIDER_RESULTS = 700;

const STREET_PARKING_TAGS = [
  'parking:left',
  'parking:right',
  'parking:both',
];

const STREET_PARKING_SCOPED_KEYS = [
  'fee',
  'access',
  'maxstay',
  'orientation',
  'capacity',
  'charge',
  'payment:cash',
  'payment:coins',
  'payment:credit_cards',
  'payment:debit_cards',
  'payment:contactless',
  'payment:app',
];

const OPEN_CHARGE_MAP_ID_FILTERS = [
  'chargepointid',
  'countryid',
  'operatorid',
  'connectiontypeid',
  'levelid',
  'usagetypeid',
  'statustypeid',
  'dataproviderid',
  'submissionstatustypeid',
];

const OPEN_CHARGE_MAP_TEXT_FILTERS = [
  'countrycode',
  'postalcode',
  'title',
];

const parseCoordinate = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
};

const parseRadius = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 15000) return null;
  return parsed;
};

const parseScoringRadius = (value) => {
  const parsed = Number(value || 1000);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1000) return null;
  return parsed;
};

const parsePoint = (point) => {
  if (!Array.isArray(point) || point.length !== 2) return null;

  const lng = parseCoordinate(point[0], -180, 180);
  const lat = parseCoordinate(point[1], -90, 90);

  return lng === null || lat === null ? null : [lng, lat];
};

const parsePredictionContext = (context) =>
  context && typeof context === 'object' && !Array.isArray(context) ? context : {};

const fetchJson = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || PROVIDER_TIMEOUT_MS);

  try {
    const { timeoutMs, ...fetchOptions } = options;
    const response = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal || controller.signal,
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error || data?.message || 'External provider request failed';
      throw new Error(message);
    }

    return data;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeTagValue = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

const hasTagValue = (value, acceptedValues) => acceptedValues.includes(normalizeTagValue(value));

const firstPresentValue = (object, keys) => {
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null && object[key] !== '') {
      return object[key];
    }
  }

  return null;
};

const numberFromValue = (value) => {
  const match = String(value || '').match(/\d+([.,]\d+)?/);
  if (!match) return null;

  const number = Number(match[0].replace(',', '.'));
  return Number.isFinite(number) ? number : null;
};

const isAffirmativeTag = (value) => hasTagValue(value, ['yes', 'true', '1', 'designated', 'limited']);

const isNegativeTag = (value) => hasTagValue(value, ['no', 'false', '0']);

const scopedParkingKeys = (key) => [
  key,
  `parking:left:${key}`,
  `parking:right:${key}`,
  `parking:both:${key}`,
];

const getScopedParkingValue = (tags, key) => firstPresentValue(tags, scopedParkingKeys(key));

const getParkingType = (tags) => firstPresentValue(tags, ['parking', ...STREET_PARKING_TAGS]);

const getStreetParkingSide = (tags) => STREET_PARKING_TAGS.find((key) => tags[key])?.split(':')[1] || null;

const buildOsmAddress = (tags) => {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const city = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');

  return [street, city, tags['addr:country']].filter(Boolean).join(', ') || tags['addr:full'] || tags.address || '';
};

const splitTagList = (value) =>
  String(value || '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);

const toWikimediaFileUrl = (value) => {
  const text = String(value || '').trim();
  if (!text || text.toLowerCase().startsWith('category:')) return null;

  const fileName = text.replace(/^file:/i, '');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
};

const normalizeImageUrl = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  if (/^file:/i.test(text)) return toWikimediaFileUrl(text);

  return null;
};

const buildOsmMedia = (tags) => {
  const media = [];

  ['image', 'image:0', 'image:1', 'image:2'].forEach((key) => {
    splitTagList(tags[key]).forEach((value) => {
      const url = normalizeImageUrl(value);
      if (url) {
        media.push({ type: 'image', source: 'osm', url, label: key });
      }
    });
  });

  splitTagList(tags.wikimedia_commons || tags.wikimedia).forEach((value) => {
    const url = /^https?:\/\//i.test(value) ? value : toWikimediaFileUrl(value);
    if (url) {
      media.push({ type: 'image', source: 'wikimedia', url, label: 'Wikimedia Commons' });
    }
  });

  if (tags.mapillary) {
    media.push({
      type: 'link',
      source: 'mapillary',
      url: `https://www.mapillary.com/app/?pKey=${encodeURIComponent(tags.mapillary)}`,
      label: 'Mapillary',
    });
  }

  return media.filter(
    (item, index, items) => items.findIndex((candidate) => candidate.url === item.url) === index
  );
};

const buildParkingCategories = (tags) => {
  const categories = ['parking'];
  const amenity = normalizeTagValue(tags.amenity);
  const parkingType = normalizeTagValue(getParkingType(tags));

  if (parkingType) {
    categories.push(`parking.${parkingType === 'multi_storey' ? 'multistorey' : parkingType}`);
  }

  if (amenity === 'parking_space') {
    categories.push('parking.space');
  }

  if (STREET_PARKING_TAGS.some((key) => tags[key])) {
    categories.push('parking.street');
  }

  if (hasTagValue(tags.wheelchair, ['yes', 'designated', 'limited']) || numberFromValue(tags['capacity:disabled']) > 0) {
    categories.push('wheelchair');
  }

  if (isNegativeTag(getScopedParkingValue(tags, 'fee'))) {
    categories.push('no_fee');
  }

  return categories;
};

const isPrivateParking = (tags) => {
  const access = normalizeTagValue(getScopedParkingValue(tags, 'access'));
  return ['private', 'customers', 'permit', 'residents'].includes(access);
};

const buildPaymentMethods = (tags) => {
  const methods = {};

  STREET_PARKING_SCOPED_KEYS.filter((key) => key.startsWith('payment:')).forEach((key) => {
    const method = key.replace('payment:', '');
    methods[method] = isAffirmativeTag(getScopedParkingValue(tags, key));
  });

  return methods;
};

const normalizeParkingType = (tags) => {
  const parkingType = normalizeTagValue(getParkingType(tags));
  return ['multi_storey', 'multi-storey'].includes(parkingType) ? 'multistorey' : parkingType;
};

const closeRing = (ring) => {
  if (!ring.length) return ring;

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) return ring;

  return [...ring, first];
};

const bboxPolygon = (bounds) => {
  const west = Number(bounds?.minlon);
  const south = Number(bounds?.minlat);
  const east = Number(bounds?.maxlon);
  const north = Number(bounds?.maxlat);

  if (![west, south, east, north].every(Number.isFinite)) return null;

  return [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ];
};

const getElementGeometry = (element) => {
  if (Array.isArray(element.geometry) && element.geometry.length >= 3) {
    const ring = closeRing(
      element.geometry
        .map((coordinate) => [Number(coordinate.lon), Number(coordinate.lat)])
        .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
    );

    if (ring.length >= 4) {
      return {
        type: 'Polygon',
        coordinates: [ring],
      };
    }
  }

  const boundsGeometry = bboxPolygon(element.bounds);
  if (boundsGeometry) {
    return {
      type: 'Polygon',
      coordinates: boundsGeometry,
    };
  }

  return null;
};

const getGeometryCenter = (geometry) => {
  const ring = geometry?.coordinates?.[0];
  if (!Array.isArray(ring) || !ring.length) return null;

  const validCoordinates = ring.filter(([lng, lat]) =>
    Number.isFinite(Number(lng)) && Number.isFinite(Number(lat))
  );

  if (!validCoordinates.length) return null;

  const [sumLng, sumLat] = validCoordinates.reduce(
    ([lngTotal, latTotal], [lng, lat]) => [
      lngTotal + Number(lng),
      latTotal + Number(lat),
    ],
    [0, 0]
  );

  return [sumLng / validCoordinates.length, sumLat / validCoordinates.length];
};

const normalizeOsmParking = (element) => {
  const tags = element.tags || {};
  const geometry = getElementGeometry(element);
  const geometryCenter = getGeometryCenter(geometry);
  const lat = Number(element.lat ?? element.center?.lat ?? geometryCenter?.[1]);
  const lon = Number(element.lon ?? element.center?.lon ?? geometryCenter?.[0]);
  const access = normalizeTagValue(getScopedParkingValue(tags, 'access'));
  const fee = normalizeTagValue(getScopedParkingValue(tags, 'fee'));
  const parkingType = normalizeParkingType(tags);
  const capacity = numberFromValue(getScopedParkingValue(tags, 'capacity'));
  const disabledCapacity = numberFromValue(tags['capacity:disabled']);
  const maxHeight = numberFromValue(tags.maxheight || tags.max_height);
  const maxStay = getScopedParkingValue(tags, 'maxstay');

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    name: tags.name || tags.operator || tags.ref || (tags.highway ? 'Street parking' : 'Parking'),
    address: buildOsmAddress(tags),
    lat,
    lon,
    geometry,
    properties: {
      source: 'openstreetmap',
      osmId: element.id,
      osmType: element.type,
      categories: buildParkingCategories(tags),
      amenity: tags.amenity || null,
      parkingType: parkingType || null,
      streetParkingSide: getStreetParkingSide(tags),
      capacity,
      disabledCapacity,
      fee: fee || null,
      isFree: isNegativeTag(fee),
      isPaid: hasTagValue(fee, ['yes', 'true', '1']),
      access: access || null,
      isPublic: !access || ['yes', 'public', 'permissive', 'destination'].includes(access),
      isCustomersOnly: access === 'customers',
      isPermitOnly: ['permit', 'residents'].includes(access),
      operator: tags.operator || null,
      website: tags.website || tags['contact:website'] || null,
      phone: tags.phone || tags['contact:phone'] || null,
      email: tags.email || tags['contact:email'] || null,
      openingHours: tags.opening_hours || null,
      twentyFourHour: normalizeTagValue(tags.opening_hours) === '24/7',
      private: isPrivateParking(tags),
      covered: isAffirmativeTag(tags.covered),
      lit: isAffirmativeTag(tags.lit),
      supervised: isAffirmativeTag(tags.supervised),
      surveillance: isAffirmativeTag(tags.surveillance),
      maxHeight,
      maxStay: maxStay || null,
      orientation: normalizeTagValue(getScopedParkingValue(tags, 'orientation')) || null,
      charge: getScopedParkingValue(tags, 'charge') || null,
      paymentMethods: buildPaymentMethods(tags),
      hasChargingSpaces: numberFromValue(tags['capacity:charging']) > 0 || isAffirmativeTag(tags.charging_station),
      media: buildOsmMedia(tags),
      tags,
    },
  };
};

const buildOverpassParkingQuery = ({ neLat, neLng, swLat, swLng }) => `
[out:json][timeout:25];
(
  node["amenity"="parking"](${swLat},${swLng},${neLat},${neLng});
  way["amenity"="parking"](${swLat},${swLng},${neLat},${neLng});
  relation["amenity"="parking"](${swLat},${swLng},${neLat},${neLng});
  node["amenity"="parking_space"](${swLat},${swLng},${neLat},${neLng});
  way["amenity"="parking_space"](${swLat},${swLng},${neLat},${neLng});
  way["parking:left"](${swLat},${swLng},${neLat},${neLng});
  way["parking:right"](${swLat},${swLng},${neLat},${neLng});
  way["parking:both"](${swLat},${swLng},${neLat},${neLng});
);
out tags center geom ${MAX_PROVIDER_RESULTS};
`;

const buildOpenChargeMapAddress = (addressInfo = {}) => {
  return [
    addressInfo.AddressLine1,
    addressInfo.AddressLine2,
    addressInfo.Town,
    addressInfo.StateOrProvince,
    addressInfo.Postcode,
    addressInfo.Country?.Title,
  ]
    .filter(Boolean)
    .join(', ');
};

const normalizeOpenChargeMapMedia = (items = []) =>
  items
    .map((item) => ({
      id: item.ID || null,
      url: item.ItemURL || item.ItemThumbnailURL || null,
      thumbnailUrl: item.ItemThumbnailURL || item.ItemURL || null,
      title: item.Title || item.Comment || null,
      comment: item.Comment || null,
      dateCreated: item.DateCreated || null,
    }))
    .filter((item) => item.url);

const normalizeOpenChargeMapComments = (items = []) =>
  items
    .map((item) => {
      const rating = Number(item.Rating);

      return {
        id: item.ID || null,
        text: item.Comment || null,
        rating: Number.isFinite(rating) ? rating : null,
        userName: item.UserName || item.User?.Username || null,
        dateCreated: item.DateCreated || null,
      };
    })
    .filter((item) => item.text || item.rating);

const normalizeOpenChargeMapCheckins = (items = []) =>
  items.map((item) => ({
    id: item.ID || null,
    status: item.CheckinStatusType?.Title || item.CheckinStatusType || null,
    comment: item.Comment || null,
    dateCreated: item.DateCreated || null,
    userName: item.UserName || item.User?.Username || null,
  }));

const averageRating = (comments) => {
  const ratings = comments.map((comment) => Number(comment.rating)).filter(Number.isFinite);
  if (!ratings.length) return null;

  return Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1));
};

const normalizeOpenChargeMapStation = (station) => {
  const addressInfo = station.AddressInfo || {};
  const latitude = Number(addressInfo.Latitude);
  const longitude = Number(addressInfo.Longitude);
  const connections = station.Connections || [];
  const mediaItems = normalizeOpenChargeMapMedia(station.MediaItems || []);
  const userComments = normalizeOpenChargeMapComments(station.UserComments || []);
  const userCheckins = normalizeOpenChargeMapCheckins(station.UserCheckins || []);
  const connectionPowerValues = connections
    .map((connection) => Number(connection.PowerKW))
    .filter(Number.isFinite);
  const connectionQuantities = connections
    .map((connection) => Number(connection.Quantity))
    .filter(Number.isFinite);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    name: addressInfo.Title || station.OperatorInfo?.Title || 'EV charger',
    address: buildOpenChargeMapAddress(addressInfo),
    position: {
      latitude,
      longitude,
    },
    properties: {
      source: 'openchargemap',
      id: station.ID,
      uuid: station.UUID || null,
      dataProviderId: station.DataProviderID || null,
      dataProvider: station.DataProvider?.Title || null,
      operatorId: station.OperatorID || null,
      operator: station.OperatorInfo?.Title || null,
      usageTypeId: station.UsageTypeID || null,
      usageType: station.UsageType?.Title || null,
      statusTypeId: station.StatusTypeID || null,
      status: station.StatusType?.Title || null,
      isOperational: station.StatusType?.IsOperational ?? null,
      submissionStatusTypeId: station.SubmissionStatusTypeID || null,
      submissionStatus: station.SubmissionStatus?.Title || null,
      usageCost: station.UsageCost || null,
      numberOfPoints: station.NumberOfPoints || null,
      recentlyVerified: station.IsRecentlyVerified ?? false,
      dateLastVerified: station.DateLastVerified || null,
      generalComments: station.GeneralComments || null,
      averageRating: averageRating(userComments),
      hasComments: userComments.length > 0 || Boolean(station.GeneralComments),
      hasMedia: mediaItems.length > 0,
      hasCheckins: userCheckins.length > 0,
      mediaItems,
      userComments,
      userCheckins,
      isPayAtLocation: station.UsageType?.IsPayAtLocation ?? null,
      isMembershipRequired: station.UsageType?.IsMembershipRequired ?? null,
      isAccessKeyRequired: station.UsageType?.IsAccessKeyRequired ?? null,
      minPowerKw: connectionPowerValues.length ? Math.min(...connectionPowerValues) : null,
      maxPowerKw: connectionPowerValues.length ? Math.max(...connectionPowerValues) : null,
      totalConnectorQuantity: connectionQuantities.length ? connectionQuantities.reduce((sum, value) => sum + value, 0) : null,
      connectionTypeIds: [...new Set(connections.map((connection) => connection.ConnectionTypeID).filter(Boolean))],
      connectionTypes: [...new Set(connections.map((connection) => connection.ConnectionType?.Title).filter(Boolean))],
      currentTypeIds: [...new Set(connections.map((connection) => connection.CurrentTypeID).filter(Boolean))],
      currentTypes: [...new Set(connections.map((connection) => connection.CurrentType?.Title).filter(Boolean))],
      levelIds: [...new Set(connections.map((connection) => connection.LevelID).filter(Boolean))],
      levels: [...new Set(connections.map((connection) => connection.Level?.Title).filter(Boolean))],
      connections: connections.map((connection) => ({
        id: connection.ID || null,
        connectionTypeId: connection.ConnectionTypeID || null,
        connectionType: connection.ConnectionType?.Title || null,
        currentTypeId: connection.CurrentTypeID || null,
        currentType: connection.CurrentType?.Title || null,
        levelId: connection.LevelID || null,
        level: connection.Level?.Title || null,
        powerKw: connection.PowerKW || null,
        quantity: connection.Quantity || null,
        voltage: connection.Voltage || null,
        amps: connection.Amps || null,
        status: connection.StatusType?.Title || null,
      })),
    },
  };
};

const sanitizeCsvNumbers = (value) => {
  const numbers = String(value || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((number) => Number.isInteger(number) && number > 0);

  return numbers.length ? numbers.join(',') : null;
};

const sanitizeProviderText = (value) => {
  const text = String(value || '').trim();
  return text.length > 0 && text.length <= 100 ? text : null;
};

const appendOpenChargeMapFilters = (query, url) => {
  OPEN_CHARGE_MAP_ID_FILTERS.forEach((key) => {
    const value = sanitizeCsvNumbers(query[key]);
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  OPEN_CHARGE_MAP_TEXT_FILTERS.forEach((key) => {
    const value = sanitizeProviderText(query[key]);
    if (value) {
      url.searchParams.set(key, value);
    }
  });
};

export const getParkings = async (req, res) => {
  const neLat = parseCoordinate(req.query.neLat, -90, 90);
  const neLng = parseCoordinate(req.query.neLng, -180, 180);
  const swLat = parseCoordinate(req.query.swLat, -90, 90);
  const swLng = parseCoordinate(req.query.swLng, -180, 180);
  const radius = parseRadius(req.query.radius);

  if ([neLat, neLng, swLat, swLng, radius].some((value) => value === null)) {
    return res.status(400).json({ error: 'Valid bounds and radius are required' });
  }

  try {
    const cachedParkings = await loadCachedParkingsForBounds({
      neLat,
      neLng,
      swLat,
      swLng,
    });

    if (cachedParkings.length > 0) {
      return res.status(200).json(cachedParkings);
    }

    const query = buildOverpassParkingQuery({ neLat, neLng, swLat, swLng });
    const data = await fetchJson(OVERPASS_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': 'ParkingMVP/0.1 (local development)',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    const parkings = (data.elements || []).map(normalizeOsmParking).filter(Boolean);

    res.status(200).json(parkings);
  } catch (error) {
    console.error('Error fetching parking data:', error);
    res.status(502).json({ error: 'Failed to load parking data' });
  }
};

export const getParkingRecommendations = async (req, res) => {
  const startPoint = parsePoint(req.body.startPoint);
  const finishPoint = parsePoint(req.body.finishPoint);
  const radiusMeters = parseScoringRadius(req.body.radiusMeters);
  const limit = Number(req.body.limit || 3);
  const maxCandidates = Number(req.body.maxCandidates || 20);
  const includeCycling = Boolean(req.body.includeCycling);
  const enableOccupancyPrediction = req.body.enableOccupancyPrediction !== false;
  const occupancyPredictionLimit = Number(req.body.occupancyPredictionLimit || 8);
  const predictionContext = parsePredictionContext(req.body.predictionContext);
  const parkingFilters = req.body.parkingFilters && typeof req.body.parkingFilters === 'object'
    ? req.body.parkingFilters
    : {};

  if (!startPoint || !finishPoint || radiusMeters === null) {
    return res.status(400).json({
      error: 'Valid startPoint, finishPoint and radiusMeters <= 1000 are required',
    });
  }

  try {
    const result = await recommendParkings({
      startPoint,
      finishPoint,
      radiusMeters,
      limit,
      maxCandidates,
      includeCycling,
      parkingFilters,
      enableOccupancyPrediction,
      occupancyPredictionLimit,
      predictionContext,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error scoring parking recommendations:', error);
    res.status(error.statusCode || 502).json({
      error: error.statusCode === 503 ? error.message : 'Failed to score parking recommendations',
    });
  }
};

export const getParkingOccupancyPrediction = async (req, res) => {
  const parking = req.body.parking && typeof req.body.parking === 'object' ? req.body.parking : null;
  const predictionContext = parsePredictionContext(req.body.predictionContext);

  if (!parking || parseCoordinate(parking.lat, -90, 90) === null || parseCoordinate(parking.lon, -180, 180) === null) {
    return res.status(400).json({ error: 'Valid parking payload with lat and lon is required' });
  }

  try {
    const prediction = await predictParkingOccupancy({
      parking,
      predictionContext,
    });

    res.status(200).json({ prediction });
  } catch (error) {
    console.error('Error predicting parking occupancy:', error);
    res.status(error.statusCode || 502).json({
      error: error.statusCode === 400 ? error.message : 'Failed to predict parking occupancy',
    });
  }
};

export const getEvChargers = async (req, res) => {
  const lat = parseCoordinate(req.query.lat, -90, 90);
  const lng = parseCoordinate(req.query.lng, -180, 180);
  const radius = parseRadius(req.query.radius);

  if ([lat, lng, radius].some((value) => value === null)) {
    return res.status(400).json({ error: 'Valid center coordinates and radius are required' });
  }

  if (!env.openChargeMapApiKey) {
    return res.status(503).json({ error: 'Open Charge Map API key is not configured' });
  }

  try {
    const url = new URL(OPEN_CHARGE_MAP_API_URL);
    url.searchParams.set('output', 'json');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('distance', String(radius / 1000));
    url.searchParams.set('distanceunit', 'KM');
    url.searchParams.set('maxresults', '100');
    url.searchParams.set('compact', 'false');
    url.searchParams.set('verbose', 'false');
    url.searchParams.set('includecomments', 'true');
    url.searchParams.set('includecheckins', 'true');
    url.searchParams.set('includeusermedia', 'true');
    appendOpenChargeMapFilters(req.query, url);

    if (env.openChargeMapApiKey) {
      url.searchParams.set('key', env.openChargeMapApiKey);
    }

    const data = await fetchJson(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ParkingMVP/0.1 (local development)',
      },
    });
    const stations = (Array.isArray(data) ? data : []).map(normalizeOpenChargeMapStation).filter(Boolean);

    res.status(200).json(stations);
  } catch (error) {
    console.error('Error fetching EV charger data:', error);
    res.status(502).json({ error: 'Failed to load EV charger data' });
  }
};
