import React, { createContext, useContext, useMemo } from 'react'
import { useMasterAuth } from '../../context/MasterAuthContext'
import { canAccessSchoolConsole } from '../utils/schoolConsoleAccess'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const m = useMasterAuth()
  const canSchoolConsole = useMemo(() => canAccessSchoolConsole(m.user), [m.user])
  const value = {
    manager: m.user,
    /** Alias for ported Lite school pages that call `useAuth().user`. */
    user: m.user,
    canAccessSchoolConsole: canSchoolConsole,
    setManager: (next) => m.patchUser(next),
    loading: m.loading,
    login: async () => ({
      success: false,
      message: 'Sign in on the main Babyeyi app with your email, password, and school code.',
    }),
    logout: m.logout,
    refresh: m.refresh,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
