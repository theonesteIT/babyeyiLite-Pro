import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';
const BABYEYI_LOGIN = import.meta.env.VITE_BABYEYI_LOGIN_URL || 'http://localhost:5173/login';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.location.href = BABYEYI_LOGIN;
    }
    return Promise.reject(error);
  }
);

export const fetchMySchools = () => api.get('/representative/my-schools').then((r) => r.data);
export const fetchRepresentativeSummary = () => api.get('/representative/summary').then((r) => r.data);

export default api;
