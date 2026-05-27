function resolveOrigin() {
  const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5100';
  return String(raw).replace(/\/api\/?$/i, '').replace(/\/$/, '');
}

export const API = `${resolveOrigin()}/api`;
export const API_BASE = API;
export const NESA_API = `${API}/nesa/babyeyi`;
export const FEE_API = `${API}/fee-limits`;
export const SCHOOLS_API = `${API}/schools`;
export const AUTH_API = `${API}/auth`;
export const UPLOADS = import.meta.env?.VITE_UPLOADS_BASE || resolveOrigin();

export const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(json.message || 'Request failed'), { status: res.status });
  }
  return json;
};

export const apiFetchForm = async (url, method, formData) => {
  const res = await fetch(url, { method, credentials: 'include', body: formData });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(json.message || 'Upload failed'), { status: res.status });
  }
  return json;
};
