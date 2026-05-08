import axios from 'axios';

const ROOT = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`.replace(/\/+$/, '');

export const api = axios.create({
  baseURL: ROOT,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const uploadsBase = (import.meta.env.VITE_UPLOADS_BASE || '').replace(/\/+$/, '')
  || (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '');

export function assetUrl(path) {
  if (!path || typeof path !== 'string') return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = uploadsBase;
  return base + (path.startsWith('/') ? path : `/${path}`);
}
