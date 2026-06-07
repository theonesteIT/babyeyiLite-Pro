import axios from 'axios';

const API_BASE_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

function unwrap(res) {
  const body = res?.data;
  if (body?.success === false) throw new Error(body.message || 'Request failed');
  return body?.data ?? body;
}

export async function lookupPublicAssetScan({ id, code } = {}) {
  return unwrap(await api.get('/public/school/assets/scan', {
    params: {
      ...(id != null && id !== '' ? { id } : {}),
      ...(code ? { code } : {}),
    },
  }));
}
