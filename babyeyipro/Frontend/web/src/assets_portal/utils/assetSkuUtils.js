/** School abbreviation + auto SKU helpers for asset register */

export function abbreviateSchoolName(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'SCH'
}

export function sanitizeSkuSegment(value, fallback = 'X') {
  const cleaned = String(value || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .toUpperCase()
  return cleaned || fallback
}

export function buildAutoSkuPrefix(schoolAbbr, locationLabel, assetLabel) {
  return [
    sanitizeSkuSegment(schoolAbbr, 'SCH'),
    sanitizeSkuSegment(locationLabel, 'LOC'),
    sanitizeSkuSegment(assetLabel, 'AST'),
  ].join('/')
}

export function formatSkuWithSequence(prefix, sequence) {
  return `${prefix}/${String(sequence).padStart(5, '0')}`
}

export function previewAutoSku({
  schoolName = '',
  locationLabel = '',
  assetLabel = '',
  sequence = 1,
}) {
  const prefix = buildAutoSkuPrefix(
    abbreviateSchoolName(schoolName),
    locationLabel,
    assetLabel,
  )
  return formatSkuWithSequence(prefix, sequence)
}

export function manualSkuForIndex(baseSku, index, total) {
  const base = String(baseSku || '').trim()
  if (!base) return ''
  if (total <= 1) return base
  return `${base}-${String(index).padStart(5, '0')}`
}
