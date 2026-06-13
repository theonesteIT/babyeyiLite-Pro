export function resolveCertificateAssetUrl(path) {
  if (!path) return '';
  const p = String(path).trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
  const origin = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');
  const normalized = p.replace(/\\/g, '/');
  return `${origin}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

export async function loadImageAsDataUrl(url) {
  const full = resolveCertificateAssetUrl(url) || url;
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