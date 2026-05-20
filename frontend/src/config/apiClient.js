import { API_BASE_URL } from './env.js';

export const getAuthToken = () => localStorage.getItem('token');

export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};

export const clearAuthToken = () => {
  localStorage.removeItem('token');
};

export const apiRequest = async (path, options = {}) => {
  const { body, headers = {}, auth = true, ...restOptions } = options;
  const requestHeaders = { ...headers };

  if (body !== undefined && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuthToken();
    }

    throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
  }

  return data;
};
