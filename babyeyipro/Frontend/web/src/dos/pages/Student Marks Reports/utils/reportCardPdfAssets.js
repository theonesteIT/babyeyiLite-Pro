const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '');

export function resolveReportAssetUrl(path) {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p) || p.startsWith('data:')) return p;
  const normalized = p.replace(/\\/g, '/');
  return `${API_ORIGIN}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

export async function loadImageAsDataUrl(url) {
  const full = resolveReportAssetUrl(url) || url;
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
    }
  }));

  const svgs = [...root.querySelectorAll('svg')];
  for (const svg of svgs) {
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      const img = document.createElement('img');
      img.width = svg.clientWidth || 80;
      img.height = svg.clientHeight || 80;
      img.src = url;
      img.className = svg.getAttribute('class') || '';
      img.style.cssText = svg.getAttribute('style') || '';
      svg.replaceWith(img);
    } catch {
      /* keep svg */
    }
  }
}
