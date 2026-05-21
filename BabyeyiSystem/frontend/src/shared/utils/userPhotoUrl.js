/** Build absolute URL for a user profile photo path from session (e.g. /uploads/profile-photos/…). */
export function resolveUserPhotoUrl(photo) {
  if (!photo || typeof photo !== 'string') return null;
  const path = photo.replace(/\\/g, '/').trim();
  if (/^https?:\/\//i.test(path)) return path;
  const base = String(import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
