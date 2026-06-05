import axios from 'axios';
import { redirectToBabyeyiLogin } from '../../utils/postLogoutLoginPath';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {},
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      redirectToBabyeyiLogin();
    }
    return Promise.reject(error);
  }
);

export default api;
