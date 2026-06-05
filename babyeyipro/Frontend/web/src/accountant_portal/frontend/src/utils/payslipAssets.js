const API_ORIGIN = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

export function resolvePayslipAssetUrl(path) {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
  const normalized = p.replace(/\\/g, '/');
  return `${API_ORIGIN}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

/** Load remote image as data URL (avoids html2canvas CORS / tainted canvas). */
export async function loadImageAsDataUrl(url) {
  const full = resolvePayslipAssetUrl(url) || url;
  if (!full || String(full).startsWith('data:')) return full || null;
  try {
    const res = await fetch(full, { credentials: 'include', mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function inlineImagesForPdf(root) {
  if (!root) return;
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    const dataUrl = await loadImageAsDataUrl(src);
    if (dataUrl) {
      img.src = dataUrl;
      img.removeAttribute('crossorigin');
    } else {
      img.style.display = 'none';
    }
  }));
}
