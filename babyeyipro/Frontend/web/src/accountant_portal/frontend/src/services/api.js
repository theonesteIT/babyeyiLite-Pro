import axios from 'axios';

// Supports both:
// - JWT backends (Authorization header)
// - Session-cookie backends (withCredentials)
// Set VITE_API_URL to your backend origin (no trailing /api).
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle token expiration/unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const loginUrl = import.meta.env.VITE_BABYEYI_LOGIN_URL || 'http://localhost:5173/login';
      if (!window.location.pathname.includes('/login')) {
        window.location.href = loginUrl;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
