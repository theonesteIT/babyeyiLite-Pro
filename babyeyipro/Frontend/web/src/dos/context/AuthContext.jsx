import React, { createContext, useContext, useMemo } from 'react'
import { useMasterAuth } from '../../context/MasterAuthContext'
import { canAccessSchoolConsole as schoolConsoleAllowed } from '../../manager/utils/schoolConsoleAccess'

const AuthContext = createContext()

/** Session comes from Babyeyi master API (same cookie). “teacher” is legacy naming for this portal’s user object. */
export const AuthProvider = ({ children }) => {
  const m = useMasterAuth()
  const canSchoolConsole = useMemo(() => schoolConsoleAllowed(m.user), [m.user])
  const value = {
    teacher: m.user,
    canAccessSchoolConsole: canSchoolConsole,
    loading: m.loading,
    login: async () => ({
      success: false,
      message: 'Sign in on the main Babyeyi app with your email, password, and school code.',
    }),
    logout: m.logout,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
