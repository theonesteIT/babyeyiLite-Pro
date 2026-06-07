import axios from 'axios';
import { redirectToBabyeyiLogin } from '../../utils/postLogoutLoginPath';

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) redirectToBabyeyiLogin();
    const msg = error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

function unwrap(res) {
  const body = res?.data;
  if (body?.success === false) throw new Error(body.message || 'Request failed');
  return body?.data ?? body;
}

export async function fetchAssetReport(type, params = {}) {
  return unwrap(await api.get(`/school/assets/reports/${type}`, { params }));
}

export default { fetchAssetReport };
