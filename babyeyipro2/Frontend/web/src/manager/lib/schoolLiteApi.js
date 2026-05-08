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
