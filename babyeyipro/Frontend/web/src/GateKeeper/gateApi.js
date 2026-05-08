const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '')
const API_BASE = `${API_ORIGIN}/api`

async function parseJsonSafe(res) {
  try {
    return await res.json()
  } catch (_err) {
    return {}
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const json = await parseJsonSafe(res)
  if (!res.ok) {
    const err = new Error(json?.message || `Request failed (${res.status})`)
    err.status = res.status
    err.payload = json
    throw err
  }
  return json
}

export async function verifyGateScan({ raw, deviceId, gatePoint, actionType = 'EXIT' }) {
  return request('/gate/scan/verify', {
    method: 'POST',
    body: JSON.stringify({
      raw,
      device_id: deviceId || null,
      gate_point: gatePoint || null,
      action_type: actionType,
      device_type: typeof navigator !== 'undefined' && /mobile|android|iphone|ipad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    }),
  })
}

export async function fetchGateScanLogs(limit = 120) {
  return request(`/gate/scan/logs?limit=${encodeURIComponent(String(limit))}`)
}

