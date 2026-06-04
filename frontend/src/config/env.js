const trimTrailingSlash = (value) => value?.replace(/\/+$/, '');

const defaultApiBaseUrl = import.meta.env.PROD ? '/api' : 'http://localhost:5005/api';

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl
);

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
