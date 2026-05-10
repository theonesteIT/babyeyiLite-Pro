import React, { createContext, useContext, useMemo } from 'react'
import { useMasterAuth } from '../../context/MasterAuthContext'

const AuthContext = createContext()

export const RepresentativeAuthProvider = ({ children }) => {
  const m = useMasterAuth()
  const value = useMemo(
    () => ({
      manager: m.user,
      user: m.user,
      canAccessSchoolConsole: false,
      setManager: (next) => m.patchUser(next),
      loading: m.loading,
      login: async () => ({
        success: false,
        message: 'Sign in on the main Babyeyi app with your email, password, and school code.',
      }),
      logout: m.logout,
      refresh: m.refresh,
    }),
    [m]
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
