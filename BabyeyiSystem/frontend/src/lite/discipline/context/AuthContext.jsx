import React, { createContext, useContext, useMemo } from 'react';
import { useMasterAuth } from '../../../context/MasterAuthContext';

const AuthContext = createContext();

/** Session from Babyeyi master API (same cookie). `teacher` is the signed-in discipline lead. */
export const AuthProvider = ({ children }) => {
  const m = useMasterAuth();

  const value = useMemo(
    () => ({
      teacher: m.user,
      loading: m.loading,
      login: async () => ({
        success: false,
        message: 'Sign in on Babyeyi Lite with your email or username, password, and school code.',
      }),
      logout: m.logout,
      refresh: m.refresh,
    }),
    [m.user, m.loading, m.logout, m.refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
