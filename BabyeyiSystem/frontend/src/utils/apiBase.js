/**
 * VITE_API_URL should be the API origin only, e.g. http://localhost:5100
 * (not .../api). If /api was appended by mistake, strip it so we don't get /api/api/...
 */
export function getApiOrigin() {
  const raw = String(import.meta.env.VITE_API_URL || 'http://localhost:5100')
    .trim()
    .replace(/\/+$/, '');
  const withoutApi = raw.replace(/\/api\/?$/i, '');
  return withoutApi || 'http://localhost:5100';
}

export function getApiBase() {
  return `${getApiOrigin()}/api`;
}
