const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

export function resolveAssetUrl(path) {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:')) return p;
  const normalized = p.replace(/\\/g, '/');
  return `${API_ORIGIN}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}

/**
 * Load remote image as data URL for jsPDF (credentials for same-origin API uploads).
 */
export async function loadImageAsDataUrl(url) {
  const full = resolveAssetUrl(url);
  if (!full) return null;
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

export async function prepareCertificateImageAssets(branding = {}) {
  const signatureDataUrl = await loadImageAsDataUrl(branding.head_signature_url);
  return { signatureDataUrl };
}
