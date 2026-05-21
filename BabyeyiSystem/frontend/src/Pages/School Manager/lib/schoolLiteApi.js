/**
 * API origin for Lite school-manager modules embedded in the Pro manager portal.
 * Same session cookie as the rest of Pro when VITE_API_URL matches the main app.
 */
const origin = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

export const SERVER_BASE = origin;
export const API_BASE = `${origin}/api`;
/** Public app origin (verify links, etc.) */
export const FRONTEND_ORIGIN =
  typeof window !== 'undefined' ? window.location.origin : origin;

const stripTrailingSlashes = (s) => String(s || '').trim().replace(/\/+$/, '');

/**
 * Base URL for Babyeyi verify / QR links.
 * Dev: uses current app origin (e.g. http://localhost:5173). Production: set VITE_BABYEYI_VERIFY_PUBLIC_URL=https://babyeyi.rw
 */
export const BABYEYI_VERIFY_PUBLIC_ORIGIN =
  stripTrailingSlashes(import.meta.env.VITE_BABYEYI_VERIFY_PUBLIC_URL)
  || stripTrailingSlashes(FRONTEND_ORIGIN)
  || 'http://localhost:5173';

/** First 16 hex chars of stored integrity hash (matches server QR / ?h=). */
export function normalizeBabyeyiIntegrityHash16(h) {
  if (h == null || h === '') return null;
  const s = String(h).trim().toLowerCase();
  if (/^[0-9a-f]{16}$/.test(s)) return s;
  if (/^[0-9a-f]+$/.test(s) && s.length >= 16) return s.slice(0, 16);
  return null;
}

/** Full URL opened when someone scans the document QR (optional ?h= for integrity). */
export function babyeyiVerifyScanUrl(docId, integrityHash) {
  if (!docId) return '';
  const base = BABYEYI_VERIFY_PUBLIC_ORIGIN;
  const h = normalizeBabyeyiIntegrityHash16(integrityHash);
  const id = encodeURIComponent(String(docId).trim());
  return h ? `${base}/babyeyi/verify/${id}?h=${encodeURIComponent(h)}` : `${base}/babyeyi/verify/${id}`;
}
