import api from '../services/api'

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/api\/?$/, '')

let brandingCache = null
let brandingPromise = null

export function resolveSchoolLogoUrl(logoUrl) {
  if (!logoUrl) return null
  if (/^https?:\/\//i.test(logoUrl) || logoUrl.startsWith('data:')) return logoUrl
  const path = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`
  return `${API_ORIGIN}${path}`
}

export async function loadImageDataUrl(url) {
  if (!url) return null
  try {
    const res = await fetch(url, { credentials: 'include' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function pickSchoolFromPayload(data) {
  const school = data?.school || data?.data?.school || data
  if (!school || typeof school !== 'object') return null
  return {
    name: school.school_name || school.name || '',
    logo_url: school.logo_url || school.logo || null,
    phone: school.phone || '',
    email: school.email || '',
    district: school.district || '',
    province: school.province || '',
  }
}

async function fetchSchoolBrandingFromApi() {
  const endpoints = [
    () => api.get('/babyeyi/school-info').then((r) => {
      const info = r.data?.data?.school || r.data?.school
      if (!info) return null
      return {
        name: info.school_name || '',
        logo_url: info.logo_url || null,
        phone: info.phone || '',
        email: info.email || '',
        district: info.district || '',
        province: info.province || '',
      }
    }),
    () => api.get('/procurement/school-info').then((r) => pickSchoolFromPayload(r.data?.data || r.data)),
    () => api.get('/session/me').then((r) => pickSchoolFromPayload(r.data?.data)),
  ]

  for (const load of endpoints) {
    try {
      const row = await load()
      if (row?.name || row?.logo_url) return row
    } catch {
      /* try next */
    }
  }

  try {
    const raw = localStorage.getItem('storekeeper_settings')
    if (raw) {
      const s = JSON.parse(raw)
      if (s?.schoolName) return { name: s.schoolName, logo_url: null }
    }
  } catch { /* ignore */ }

  return { name: 'School', logo_url: null }
}

/** Cached school name + logo data URL for PDF headers. */
export async function loadSchoolPdfBranding({ refresh = false } = {}) {
  if (!refresh && brandingCache) return brandingCache
  if (!refresh && brandingPromise) return brandingPromise

  brandingPromise = (async () => {
    const school = await fetchSchoolBrandingFromApi()
    const logoDataUrl = await loadImageDataUrl(resolveSchoolLogoUrl(school.logo_url))
    const orgName = school.name || 'School'
    const location = [school.district, school.province].filter(Boolean).join(', ')
    brandingCache = {
      orgName,
      schoolName: orgName,
      logoDataUrl,
      logo_url: school.logo_url,
      phone: school.phone,
      email: school.email,
      location,
    }
    return brandingCache
  })()

  try {
    return await brandingPromise
  } finally {
    brandingPromise = null
  }
}

export async function mergeSchoolPdfMeta(meta = {}) {
  const branding = await loadSchoolPdfBranding()
  return {
    ...branding,
    ...meta,
    orgName: meta.orgName || branding.orgName,
    logoDataUrl: meta.logoDataUrl || branding.logoDataUrl,
  }
}
