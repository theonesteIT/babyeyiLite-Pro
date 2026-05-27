import React, { createContext, useContext, useMemo } from 'react';
import { useMasterAuth } from '../../../../../context/MasterAuthContext';
const AuthContext = createContext();

/** Session from Babyeyi master API (same cookie). `staff` is the signed-in accountant user. */
export const AuthProvider = ({ children }) => {
  const m = useMasterAuth();

  const value = useMemo(
    () => ({
      staff: m.user,
      loading: m.loading,
      login: async () => ({
        success: false,
        message: 'Sign in on Babyeyi Lite with your email or username, password, and school code.',
      }),
      logout: m.logout,
      patchStaff: (updates) => {
        if (!m.user) return;
        m.patchUser?.(updates);
      },
      refresh: m.refresh,
    }),
    [m.user, m.loading, m.logout, m.refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
