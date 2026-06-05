/** QR payload for asset labels — scan opens asset identity */

export function buildAssetQrValue(asset = {}) {
  const code = String(asset.asset_code || asset.code || '').trim();
  const tag = String(asset.label_tag || asset.label || '').trim();
  const serial = String(asset.serial_number || asset.serial || '').trim();
  const id = asset.id != null ? String(asset.id) : '';
  return `CODE:${code}|TAG:${tag}|SN:${serial}|ID:${id}`;
}

export function parseAssetQrValue(raw) {
  const text = String(raw || '').trim();
  if (!text) return { code: '', tag: '', serial: '', id: '' };
  if (text.startsWith('{')) {
    try {
      const o = JSON.parse(text);
      return {
        code: o.code || o.asset_code || '',
        tag: o.tag || o.label_tag || '',
        serial: o.serial || o.serial_number || '',
        id: o.id || '',
      };
    } catch {
      /* fall through */
    }
  }
  const parts = {};
  text.split('|').forEach((seg) => {
    const [k, ...rest] = seg.split(':');
    if (k && rest.length) parts[k.toUpperCase()] = rest.join(':').trim();
  });
  return {
    code: parts.CODE || '',
    tag: parts.TAG || '',
    serial: parts.SN || '',
    id: parts.ID || '',
  };
}
