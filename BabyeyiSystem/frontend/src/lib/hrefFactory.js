/**
 * Prefix SPA paths for portals mounted under /dos, /manager, etc.
 * Supports query strings: h('/operations?tab=gradebook')
 */
export function createHref(basePath) {
  return function h(raw) {
    const b = basePath || ''
    if (!raw || raw === '/') return b || '/'
    const qIndex = raw.indexOf('?')
    const pathOnly = qIndex >= 0 ? raw.slice(0, qIndex) : raw
    const query = qIndex >= 0 ? raw.slice(qIndex) : ''
    const p = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
    return `${b}${p}${query}`
  }
}
