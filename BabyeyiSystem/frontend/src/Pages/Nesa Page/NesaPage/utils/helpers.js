import { getApiOrigin } from '../../../../utils/apiBase';
import { UPLOADS } from './api';

export const fmt = (n) => Number(n || 0).toLocaleString();
export const fmtD = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const toArray = (v) => {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'object') return [v];
  return [];
};

export const resolveUrl = (p) => {
  if (!p || typeof p !== 'string') return null;
  const normalized = p.replace(/\\/g, '/').trim();
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (import.meta.env.DEV && normalized.startsWith('/uploads') && typeof window !== 'undefined') {
    return `${window.location.origin}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }
  const base = (getApiOrigin() || UPLOADS || '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

export const profilePhotoUrl = (photo) => resolveUrl(photo);

export function mapNesaUser(user) {
  if (!user) return null;
  return {
    fullName:
      user.full_name ||
      `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
      'NESA User',
    photo: user.photo,
    role: user.role?.name || 'NESA Admin',
    email: user.email,
  };
}
