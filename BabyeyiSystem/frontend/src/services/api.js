import axios from 'axios';

function resolveRawApiUrl() {
  const v = import.meta.env.VITE_API_URL;
  if (v != null && String(v).trim() !== '') {
    return String(v).trim().replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return '';
  }
  return 'http://localhost:5100';
}

const rawBaseUrl = resolveRawApiUrl();
export const API_BASE_URL =
  rawBaseUrl === ''
    ? '/api'
    : rawBaseUrl.endsWith('/api')
      ? rawBaseUrl
      : `${rawBaseUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname || '';
      if (!path.includes('/login')) {
        window.location.href = path.startsWith('/lite') ? '/login/lite' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
