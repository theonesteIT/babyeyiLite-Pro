/** API origin without /api suffix */
function resolveOrigin() {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5100';
  return String(raw).replace(/\/api\/?$/i, '').replace(/\/$/, '');
}

/** API base always ends with /api */
export const API = `${resolveOrigin()}/api`;

export const UPLOADS = import.meta.env?.VITE_UPLOADS_BASE || resolveOrigin();

export const apiFetch = async (path, opts = {}) => {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { Accept: 'application/json', ...opts.headers },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(json.message || 'Request failed'), { status: res.status });
  }
  return json;
};

export const apiFetchMultipart = async (path, formData, method = 'PATCH') => {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json' },
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(json.message || 'Upload failed'), { status: res.status });
  }
  return json;
};
