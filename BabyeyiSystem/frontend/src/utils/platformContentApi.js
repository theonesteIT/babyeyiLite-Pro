const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api/platform-content`;
const ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export const MAX_NEWS_IMAGES = 5;
export const MAX_NEWS_GALLERY_EXTRA = 4;

/** Cover + gallery paths for article display (deduped, max 5). */
export function newsDisplayImages(article) {
  const urls = [];
  const featured = article?.featured_image;
  if (featured) urls.push(featured);
  const gallery = Array.isArray(article?.gallery) ? article.gallery : [];
  for (const g of gallery) {
    if (g && g !== featured && !urls.includes(g)) urls.push(g);
  }
  return urls.slice(0, MAX_NEWS_IMAGES);
}

export function newsDisplayImageUrls(article) {
  return newsDisplayImages(article).map((p) => mediaUrl(p)).filter(Boolean);
}

async function pubGet(path, lang) {
  const r = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}lang=${encodeURIComponent(lang || 'en')}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(j.message || 'Request failed');
  return j.data;
}

async function adminFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(j.message || 'Request failed');
  return j;
}

export const platformContentApi = {
  getTopBanners: (lang) => pubGet('/public/top-banners', lang),
  trackBannerClick: (id) => fetch(`${API}/public/top-banners/${id}/click`, { method: 'POST' }),
  getNews: (lang, params = {}) => {
    const q = new URLSearchParams({ lang: lang || 'en', ...params });
    return fetch(`${API}/public/news?${q}`).then((r) => r.json()).then((j) => {
      if (!j.success) throw new Error(j.message);
      return j.data;
    });
  },
  getNewsBySlug: (slug, lang) => pubGet(`/public/news/${encodeURIComponent(slug)}`, lang),
  trackNewsView: (id) => fetch(`${API}/public/news/${id}/view`, { method: 'POST' }),
  likeNews: (id) => fetch(`${API}/public/news/${id}/like`, { method: 'POST' }).then((r) => r.json()),
  shareNews: (id) => fetch(`${API}/public/news/${id}/share`, { method: 'POST' }).then((r) => r.json()),
  getPopularNews: (lang, limit = 5) => {
    const q = new URLSearchParams({ lang: lang || 'en', limit: String(limit), sort: 'popular' });
    return fetch(`${API}/public/news?${q}`).then((r) => r.json()).then((j) => {
      if (!j.success) throw new Error(j.message);
      return j.data;
    });
  },
  getActivePopup: (lang, device = 'desktop') =>
    fetch(`${API}/public/popups/active?lang=${lang}&device=${device}`).then((r) => r.json()).then((j) => j.data),
  trackPopupClick: (id) => fetch(`${API}/public/popups/${id}/click`, { method: 'POST' }),

  adminStats: () => adminFetch('/admin/stats').then((j) => j.data),
  adminListNews: () => adminFetch('/admin/news').then((j) => j.data),
  adminListBanners: () => adminFetch('/admin/top-banners').then((j) => j.data),
  adminListPopups: () => adminFetch('/admin/popups').then((j) => j.data),

  adminSaveNews: (id, formData) =>
    adminFetch(id ? `/admin/news/${id}` : '/admin/news', {
      method: id ? 'PUT' : 'POST',
      body: formData,
    }),
  adminDeleteNews: (id) => adminFetch(`/admin/news/${id}`, { method: 'DELETE' }),

  adminSaveBanner: (id, body) =>
    adminFetch(id ? `/admin/top-banners/${id}` : '/admin/top-banners', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  adminDeleteBanner: (id) => adminFetch(`/admin/top-banners/${id}`, { method: 'DELETE' }),

  adminSavePopup: (id, formData) =>
    adminFetch(id ? `/admin/popups/${id}` : '/admin/popups', {
      method: id ? 'PUT' : 'POST',
      body: formData,
    }),
  adminDeletePopup: (id) => adminFetch(`/admin/popups/${id}`, { method: 'DELETE' }),
};

export const NEWS_CATEGORIES = [
  { id: 'announcements', label: 'Announcements' },
  { id: 'payments', label: 'Payments' },
  { id: 'events', label: 'Events' },
  { id: 'new_features', label: 'New Features' },
  { id: 'education', label: 'Education' },
  { id: 'system_updates', label: 'System Updates' },
  { id: 'promotions', label: 'Promotions' },
  { id: 'government', label: 'Government Updates' },
];

export const POPUP_TYPES = [
  { id: 'find_agent', label: 'Find Agent' },
  { id: 'promotion', label: 'Promotion' },
  { id: 'registration', label: 'School Registration' },
  { id: 'event', label: 'Event' },
  { id: 'alert', label: 'Alert / Maintenance' },
];

export function emptyTranslations() {
  return { en: { title: '', excerpt: '', body: '' }, rw: { title: '', excerpt: '', body: '' }, fr: { title: '', excerpt: '', body: '' } };
}

export function emptyBannerTranslations() {
  return { en: { title: '', message: '', cta_text: '' }, rw: { title: '', message: '', cta_text: '' }, fr: { title: '', message: '', cta_text: '' } };
}

export function emptyPopupTranslations() {
  return { en: { title: '', description: '', cta_text: '' }, rw: { title: '', description: '', cta_text: '' }, fr: { title: '', description: '', cta_text: '' } };
}

/** Format DB / ISO datetime for `<input type="datetime-local">`. */
export function formatDateTimeLocal(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    const raw = String(value).trim().replace(' ', 'T').slice(0, 16);
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? raw : '';
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function categoryLabel(id) {
  return NEWS_CATEGORIES.find((c) => c.id === id)?.label || id;
}

export function badgeStyle(category) {
  const map = {
    announcements: { bg: 'rgba(251,191,36,0.15)', color: '#F59E0B', border: 'rgba(251,191,36,0.35)' },
    payments: { bg: 'rgba(59,130,246,0.12)', color: '#2563EB', border: 'rgba(59,130,246,0.3)' },
    new_features: { bg: 'rgba(139,92,246,0.12)', color: '#7C3AED', border: 'rgba(139,92,246,0.3)' },
    promotions: { bg: 'rgba(139,92,246,0.12)', color: '#7C3AED', border: 'rgba(139,92,246,0.3)' },
    events: { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.3)' },
  };
  return map[category] || { bg: 'rgba(16,185,129,0.12)', color: '#059669', border: 'rgba(16,185,129,0.3)' };
}
