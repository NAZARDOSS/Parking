import { apiRequest } from "../../../config/apiClient.js";

export const buildPredictionContext = () => {
  const now = new Date();
  const localDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return {
    localTimestamp: now.toISOString(),
    localDate,
    localHour: now.getHours(),
    localDayOfWeek: now.getDay(),
    timezoneOffsetMinutes: now.getTimezoneOffset(),
  };
};

export const fetchEVChargers = async (centerCoords, radius) => {
  if (radius > 15000) return [];

  const [lat, lng] = String(centerCoords).split(",");
  return apiRequest(
    `/places/ev-chargers?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=${encodeURIComponent(radius)}`
  );
};

export const getRoute = async (start, end, travelMode, mapboxAccessToken) => {
  const query = new URLSearchParams({
    access_token: mapboxAccessToken,
    alternatives: "false",
    annotations: "duration,distance",
    geometries: "geojson",
    language: "en",
    overview: "full",
    steps: "false",
  });

  const url = `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${start[0]},${start[1]};${end[0]},${end[1]}?${query.toString()}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("Маршрут не найден");
  }

  return data.routes[0];
};

export const getParkingRecommendations = async ({
  startPoint,
  finishPoint,
  parkingFilters,
  radiusMeters = 1000,
  maxCandidates = 20,
  limit = 3,
  includeCycling = false,
  enableOccupancyPrediction = true,
  occupancyPredictionLimit = 8,
  predictionContext = buildPredictionContext(),
}) =>
  apiRequest("/places/parking-recommendations", {
    method: "POST",
    body: {
      startPoint,
      finishPoint,
      parkingFilters,
      radiusMeters,
      maxCandidates,
      limit,
      includeCycling,
      enableOccupancyPrediction,
      occupancyPredictionLimit,
      predictionContext,
    },
  });

export const getParkingOccupancyPrediction = async ({
  parking,
  predictionContext = buildPredictionContext(),
}) =>
  apiRequest("/places/parking-occupancy-prediction", {
    method: "POST",
    body: {
      parking,
      predictionContext,
    },
  });

export const fetchParkingData = async (northEast, southWest, radius) => {
  if (radius > 15000) return [];

  const query = new URLSearchParams({
    neLat: String(northEast.lat),
    neLng: String(northEast.lng),
    swLat: String(southWest.lat),
    swLng: String(southWest.lng),
    radius: String(radius),
  });

  return apiRequest(`/places/parkings?${query.toString()}`);
};
