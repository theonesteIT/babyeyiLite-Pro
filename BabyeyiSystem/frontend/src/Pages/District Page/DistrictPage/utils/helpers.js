import { getApiOrigin } from '../../../../utils/apiBase';
import { UPLOADS } from './api';

export const fmt = (n) => Number(n || 0).toLocaleString();
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Absolute URL for uploaded files (district / NESA documents). */
export const resolveUrl = (p) => {
  if (!p || typeof p !== 'string') return null;
  const normalized = p.replace(/\\/g, '/').trim();
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  // Dev: Vite proxies /uploads → API server (same-origin preview)
  if (import.meta.env.DEV && normalized.startsWith('/uploads') && typeof window !== 'undefined') {
    return `${window.location.origin}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }
  const base = (getApiOrigin() || UPLOADS || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

export const profilePhotoUrl = (photo) => resolveUrl(photo);

export function fileKind(url, title = '') {
  const probe = `${url || ''} ${title || ''}`.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i.test(probe)) return 'image';
  if (/\.pdf(\?|$)/i.test(probe)) return 'pdf';
  return 'other';
}
