import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMasterAuth } from '../../context/MasterAuthContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user, loading: masterLoading, logout: masterLogout } = useMasterAuth();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (masterLoading) return;
    setStaff(user || null);
    setLoading(false);
  }, [user, masterLoading]);

  const patchStaff = useCallback((updates) => {
    setStaff((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const logout = async () => {
    setStaff(null);
    await masterLogout();
  };

  return (
    <AuthContext.Provider value={{ staff, loading, logout, patchStaff }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
