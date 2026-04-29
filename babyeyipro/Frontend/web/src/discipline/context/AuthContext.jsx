import React, { createContext, useContext } from 'react'
import { useMasterAuth } from '../../context/MasterAuthContext'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const m = useMasterAuth()
  const value = {
    teacher: m.user,
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
 
