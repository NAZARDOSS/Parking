#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const MAPILLARY_IMAGES_URL = 'https://graph.mapillary.com/images';
const DEFAULT_PLACEHOLDER_IMAGE_URL = 'https://placehold.co/1024x576/e5edf7/0f2a4f?text=No+parking+photo';
const DEFAULT_BADEN_BADEN_BBOX = [8.16, 48.72, 8.32, 48.83];
const DEFAULT_OUTPUT = path.join(backendRoot, 'server/data/parking-cache/baden-baden.geojson');

const truthyValues = ['yes', 'true', '1', 'designated', 'limited'];
const falsyValues = ['no', 'false', '0'];

const parseArgs = (argv) =>
  argv.reduce((args, item) => {
    if (!item.startsWith('--')) return args;

    const [key, ...valueParts] = item.slice(2).split('=');
    args[key] = valueParts.length ? valueParts.join('=') : true;
    return args;
  }, {});

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const numberFromValue = (value) => {
  const match = String(value || '').match(/\d+([.,]\d+)?/);
  if (!match) return null;

  const number = Number(match[0].replace(',', '.'));
  return Number.isFinite(number) ? number : null;
};

const normalizeTagValue = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');

const hasTagValue = (value, acceptedValues) => acceptedValues.includes(normalizeTagValue(value));

const isAffirmativeTag = (value) => hasTagValue(value, truthyValues);

const isNegativeTag = (value) => hasTagValue(value, falsyValues);

const scopedParkingKeys = (key) => [
  key,
  `parking:left:${key}`,
  `parking:right:${key}`,
  `parking:both:${key}`,
];

const firstPresentValue = (object, keys) => {
  for (const key of keys) {
    if (object[key] !== undefined && object[key] !== null && object[key] !== '') {
      return object[key];
    }
  }

  return null;
};

const getScopedParkingValue = (tags, key) => firstPresentValue(tags, scopedParkingKeys(key));

const buildAddress = (tags) => {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const city = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');

  return [street, city, tags['addr:country']].filter(Boolean).join(', ') || tags['addr:full'] || tags.address || '';
};

const buildPaymentMethods = (tags) => ({
  cash: isAffirmativeTag(getScopedParkingValue(tags, 'payment:cash')),
  coins: isAffirmativeTag(getScopedParkingValue(tags, 'payment:coins')),
  credit_cards: isAffirmativeTag(getScopedParkingValue(tags, 'payment:credit_cards')),
  debit_cards: isAffirmativeTag(getScopedParkingValue(tags, 'payment:debit_cards')),
  contactless: isAffirmativeTag(getScopedParkingValue(tags, 'payment:contactless')),
  app: isAffirmativeTag(getScopedParkingValue(tags, 'payment:app')),
});

const normalizeParkingType = (tags) => {
  const parkingType = normalizeTagValue(tags.parking);
  return ['multi_storey', 'multi-storey'].includes(parkingType) ? 'multistorey' : parkingType;
};

const buildCategories = (tags) => {
  const categories = ['parking'];
  const parkingType = normalizeParkingType(tags);

  if (parkingType) {
    categories.push(`parking.${parkingType}`);
  }

  if (isAffirmativeTag(tags.wheelchair) || numberFromValue(tags['capacity:disabled']) > 0) {
    categories.push('wheelchair');
  }

  if (isNegativeTag(getScopedParkingValue(tags, 'fee'))) {
    categories.push('no_fee');
  }

  return categories;
};

const costIndexFromTags = (tags) => {
  const fee = getScopedParkingValue(tags, 'fee');
  const charge = getScopedParkingValue(tags, 'charge');
  const numericCharge = numberFromValue(charge);

  if (isNegativeTag(fee)) return 0;
  if (Number.isFinite(numericCharge)) return numericCharge;
  if (isAffirmativeTag(fee)) return 2;

  return 1;
};

const closeRing = (ring) => {
  if (ring.length === 0) return ring;

  const first = ring[0];
  const last = ring[ring.length - 1];

  if (first[0] === last[0] && first[1] === last[1]) return ring;

  return [...ring, first];
};

const bboxPolygon = (bounds) => {
  const west = toNumber(bounds?.minlon);
  const south = toNumber(bounds?.minlat);
  const east = toNumber(bounds?.maxlon);
  const north = toNumber(bounds?.maxlat);

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

const polygonCentroid = (ring) => {
  const coordinates = closeRing(ring);
  let area = 0;
  let centroidLng = 0;
  let centroidLat = 0;

  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const [lng1, lat1] = coordinates[index];
    const [lng2, lat2] = coordinates[index + 1];
    const factor = lng1 * lat2 - lng2 * lat1;
    area += factor;
    centroidLng += (lng1 + lng2) * factor;
    centroidLat += (lat1 + lat2) * factor;
  }

  area *= 0.5;

  if (area === 0) {
    const [sumLng, sumLat] = coordinates.reduce(
      ([lngTotal, latTotal], [lng, lat]) => [lngTotal + lng, latTotal + lat],
      [0, 0]
    );

    return [sumLng / coordinates.length, sumLat / coordinates.length];
  }

  return [centroidLng / (6 * area), centroidLat / (6 * area)];
};

const getElementGeometry = (element) => {
  if (Array.isArray(element.geometry) && element.geometry.length >= 3) {
    const ring = closeRing(
      element.geometry
        .map((coordinate) => [toNumber(coordinate.lon), toNumber(coordinate.lat)])
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

const createMicroBbox = ([lng, lat], meters = 35) => {
  const latDelta = meters / 111320;
  const lngDelta = meters / (111320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));

  return [
    lng - lngDelta,
    lat - latDelta,
    lng + lngDelta,
    lat + latDelta,
  ];
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || `Request failed with ${response.status}`);
  }

  return data;
};

const fetchOverpassParkings = async ([west, south, east, north]) => {
  const query = `
[out:json][timeout:60];
(
  way["amenity"="parking"](${south},${west},${north},${east});
  relation["amenity"="parking"](${south},${west},${north},${east});
);
out tags center geom;
`;

  return fetchJson(OVERPASS_API_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'User-Agent': 'ParkingMVP/0.1 cache builder',
    },
    body: `data=${encodeURIComponent(query)}`,
  });
};

const fetchMapillaryImage = async ({ center, accessToken, microBboxMeters }) => {
  if (!accessToken) {
    return {
      id: null,
      url: DEFAULT_PLACEHOLDER_IMAGE_URL,
      source: 'placeholder',
    };
  }

  try {
    const url = new URL(MAPILLARY_IMAGES_URL);
    url.searchParams.set('fields', 'id,thumb_1024_url');
    url.searchParams.set('limit', '1');
    url.searchParams.set('bbox', createMicroBbox(center, microBboxMeters).join(','));
    url.searchParams.set('access_token', accessToken);

    const data = await fetchJson(url);
    const image = data?.data?.[0];

    if (!image?.thumb_1024_url) {
      return {
        id: null,
        url: DEFAULT_PLACEHOLDER_IMAGE_URL,
        source: 'placeholder',
      };
    }

    return {
      id: image.id || null,
      url: image.thumb_1024_url,
      source: 'mapillary',
    };
  } catch (error) {
    return {
      id: null,
      url: DEFAULT_PLACEHOLDER_IMAGE_URL,
      source: 'placeholder',
      error: error.message,
    };
  }
};

const normalizeElement = async (element, options) => {
  const tags = element.tags || {};
  const geometry = getElementGeometry(element);

  if (!geometry) return null;

  const center = element.center
    ? [toNumber(element.center.lon), toNumber(element.center.lat)]
    : polygonCentroid(geometry.coordinates[0]);

  if (!center.every(Number.isFinite)) return null;

  const fee = normalizeTagValue(getScopedParkingValue(tags, 'fee'));
  const parkingType = normalizeParkingType(tags);
  const evCharging = numberFromValue(tags['capacity:charging']) > 0 || isAffirmativeTag(tags.charging_station);
  const mapillaryImage = await fetchMapillaryImage({
    center,
    accessToken: options.mapillaryToken,
    microBboxMeters: options.microBboxMeters,
  });

  return {
    type: 'Feature',
    id: `${element.type}/${element.id}`,
    geometry,
    properties: {
      source: 'openstreetmap',
      cacheSource: 'static-geojson',
      osmId: element.id,
      osmType: element.type,
      name: tags.name || tags.operator || tags.ref || 'Parking',
      address: buildAddress(tags),
      lat: center[1],
      lon: center[0],
      centroidLat: center[1],
      centroidLon: center[0],
      categories: buildCategories(tags),
      amenity: tags.amenity || null,
      parkingType: parkingType || null,
      capacity: numberFromValue(getScopedParkingValue(tags, 'capacity')),
      disabledCapacity: numberFromValue(tags['capacity:disabled']),
      fee: fee || null,
      feeBoolean: isAffirmativeTag(fee),
      isFree: isNegativeTag(fee),
      isPaid: isAffirmativeTag(fee),
      costIndex: costIndexFromTags(tags),
      covered: isAffirmativeTag(tags.covered),
      evCharging,
      hasChargingSpaces: evCharging,
      access: normalizeTagValue(getScopedParkingValue(tags, 'access')) || null,
      isPublic: !getScopedParkingValue(tags, 'access') || hasTagValue(getScopedParkingValue(tags, 'access'), ['yes', 'public', 'permissive', 'destination']),
      operator: tags.operator || null,
      openingHours: tags.opening_hours || null,
      twentyFourHour: normalizeTagValue(tags.opening_hours) === '24/7',
      maxHeight: numberFromValue(tags.maxheight || tags.max_height),
      charge: getScopedParkingValue(tags, 'charge') || null,
      paymentMethods: buildPaymentMethods(tags),
      mapillaryImageId: mapillaryImage.id,
      mapillaryImageUrl: mapillaryImage.url,
      mapillaryImageSource: mapillaryImage.source,
      media: [
        {
          type: 'image',
          source: mapillaryImage.source,
          url: mapillaryImage.url,
          label: mapillaryImage.source === 'mapillary' ? 'Mapillary' : 'No parking photo',
        },
      ],
      tags,
    },
  };
};

const parseBbox = (value) => {
  if (!value) return DEFAULT_BADEN_BADEN_BBOX;

  const parts = String(value)
    .split(',')
    .map((item) => Number(item.trim()));

  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error('Invalid --bbox. Use --bbox=west,south,east,north');
  }

  return parts;
};

const buildCache = async () => {
  const args = parseArgs(process.argv.slice(2));
  const bbox = parseBbox(args.bbox);
  const output = path.resolve(backendRoot, args.output || DEFAULT_OUTPUT);
  const mapillaryToken = args['mapillary-token'] || process.env.MAPILLARY_ACCESS_TOKEN || '';
  const microBboxMeters = Number(args['micro-bbox-meters'] || 35);

  console.log(`Fetching OSM parking polygons for bbox ${bbox.join(',')}`);
  const overpassData = await fetchOverpassParkings(bbox);
  const elements = Array.isArray(overpassData.elements) ? overpassData.elements : [];
  const features = [];

  for (const element of elements) {
    const feature = await normalizeElement(element, {
      mapillaryToken,
      microBboxMeters,
    });

    if (feature) {
      features.push(feature);
    }
  }

  const featureCollection = {
    type: 'FeatureCollection',
    name: args.name || 'baden-baden-parkings',
    bbox,
    properties: {
      generatedAt: new Date().toISOString(),
      source: 'overpass-api',
      imageSource: mapillaryToken ? 'mapillary' : 'placeholder',
      placeholderImageUrl: DEFAULT_PLACEHOLDER_IMAGE_URL,
    },
    features,
  };

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(featureCollection, null, 2)}\n`);

  console.log(`Saved ${features.length} parking features to ${output}`);
};

buildCache().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
