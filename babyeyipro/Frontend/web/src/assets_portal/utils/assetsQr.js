/** QR payload — scan opens public/manager scan page */

const ASSET_ADD_TEST_PATH = '/assets/asset-add-test'
const ASSET_SCAN_PATH = '/assets/scan'

export function buildAssetScanQuery(asset = {}) {
  const id = asset.id != null ? String(asset.id) : ''
  const code = String(asset.asset_code || asset.code || '').trim()
  const params = new URLSearchParams()
  if (id) params.set('asset', id)
  if (code) params.set('code', code)
  return params
}

export function buildAssetScanPath(asset = {}) {
  const id = asset.id != null ? String(asset.id) : ''
  if (!id) return ASSET_SCAN_PATH
  const q = buildAssetScanQuery(asset).toString()
  return q ? `${ASSET_SCAN_PATH}?${q}` : ASSET_SCAN_PATH
}

export function buildAssetAddTestDetailPath(asset = {}) {
  const id = asset.id != null ? String(asset.id) : ''
  const code = String(asset.asset_code || asset.code || '').trim()
  if (!id) return ASSET_ADD_TEST_PATH
  const params = new URLSearchParams({ asset: id })
  if (code) params.set('code', code)
  return `${ASSET_ADD_TEST_PATH}?${params.toString()}`
}

export function buildAssetScanUrl(asset = {}) {
  if (typeof window !== 'undefined' && asset.id != null) {
    return `${window.location.origin}${buildAssetScanPath(asset)}`
  }
  const code = String(asset.asset_code || asset.code || '').trim()
  const tag = String(asset.label_tag || asset.label || '').trim()
  const serial = String(asset.serial_number || asset.serial || '').trim()
  const id = asset.id != null ? String(asset.id) : ''
  return `CODE:${code}|TAG:${tag}|SN:${serial}|ID:${id}`
}

export function buildAssetQrValue(asset = {}) {
  if (typeof window !== 'undefined' && asset.id != null) {
    return buildAssetScanUrl(asset)
  }
  const code = String(asset.asset_code || asset.code || '').trim()
  const tag = String(asset.label_tag || asset.label || '').trim()
  const serial = String(asset.serial_number || asset.serial || '').trim()
  const id = asset.id != null ? String(asset.id) : ''
  return `CODE:${code}|TAG:${tag}|SN:${serial}|ID:${id}`
}

function parseAssetDetailUrl(text) {
  try {
    const url = text.startsWith('http') ? new URL(text) : new URL(text, 'http://local')
    const path = url.pathname || ''
    const isRegister = path.includes('asset-add-test') || path.includes('/scan') || path.includes('/view')
    if (!isRegister && !url.searchParams.get('asset') && !url.searchParams.get('id')) return null
    return {
      code: decodeURIComponent(url.searchParams.get('code') || ''),
      id: url.searchParams.get('asset') || url.searchParams.get('id') || '',
      tag: '',
      serial: '',
      url: text,
    }
  } catch {
    return null
  }
}

export function parseAssetQrValue(raw) {
  const text = String(raw || '').trim()
  if (!text) return { code: '', tag: '', serial: '', id: '', url: '' }

  const fromUrl = parseAssetDetailUrl(text)
  if (fromUrl) return fromUrl

  if (text.startsWith('{')) {
    try {
      const o = JSON.parse(text)
      return {
        code: o.code || o.asset_code || '',
        tag: o.tag || o.label_tag || '',
        serial: o.serial || o.serial_number || '',
        id: o.id || '',
      }
    } catch {
      /* fall through */
    }
  }

  const parts = {}
  text.split('|').forEach((seg) => {
    const [k, ...rest] = seg.split(':')
    if (k && rest.length) parts[k.toUpperCase()] = rest.join(':').trim()
  })
  return {
    code: parts.CODE || '',
    tag: parts.TAG || '',
    serial: parts.SN || '',
    id: parts.ID || '',
  }
}

export function assetIdFromQrValue(raw) {
  const parsed = parseAssetQrValue(raw)
  const id = Number(parsed.id)
  return Number.isFinite(id) ? id : null
}
