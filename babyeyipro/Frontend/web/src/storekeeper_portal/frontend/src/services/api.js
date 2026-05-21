import axios from 'axios';
import { redirectToBabyeyiLogin } from '../../../../utils/postLogoutLoginPath';

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
      if (!window.location.pathname.includes('/login')) {
        redirectToBabyeyiLogin();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
