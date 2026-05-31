import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { performProLogout, syncPostLogoutLoginPath } from '../utils/postLogoutLoginPath'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5100') + '/api'

const MasterAuthContext = createContext(null)

export function MasterAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`${API}/session/me`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success && json.data) {
        syncPostLogoutLoginPath(json.data)
        setUser(json.data)
        return json.data
      }
      setUser(false)
      return null
    } catch (e) {
      console.error('[MasterAuth] session/me', e.message)
      setUser(false)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const patchUser = useCallback((updater) => {
    setUser((prev) => {
      if (!prev || prev === false) return prev
      return typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
    })
  }, [])

  const logout = useCallback(async () => {
    setUser(false)
    await performProLogout()
  }, [])

  const roleCode = user && user !== false ? String(user.role?.code || user.role_code || '').toUpperCase() : ''
  const school = user && user !== false ? user.school : null
  // Platform-wide roles (representatives, network reps) are not bound to a
  // single school's subscription. They oversee many schools, so Pro access
  // is granted by virtue of the role itself.
  const PLATFORM_PRO_ROLES = new Set(['SCHOOL_REPRESENTATIVE', 'NETWORK_REPRESENTATIVE'])
  const isPlatformPro = PLATFORM_PRO_ROLES.has(roleCode)
  const proAccessEffective =
    isPlatformPro ||
    school?.pro_access_effective === true ||
    school?.pro_access_effective === 1

  const value = {
    user: user && user !== false ? user : null,
    loading,
    logout,
    refresh: loadSession,
    patchUser,
    roleCode,
    school,
    proAccessEffective,
    isLoggedIn: !!(user && user !== false),
  }

  return <MasterAuthContext.Provider value={value}>{children}</MasterAuthContext.Provider>
}

export function useMasterAuth() {
  const ctx = useContext(MasterAuthContext)
  if (!ctx) throw new Error('useMasterAuth must be used inside MasterAuthProvider')
  return ctx
}
