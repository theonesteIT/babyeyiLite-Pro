import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { redirectToBabyeyiLogin } from '../../../../utils/postLogoutLoginPath';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/session/me');
      if (res.data?.success) setStaff(res.data?.data || res.data?.user || null);
      else setStaff(null);
    } catch (err) {
      console.error('[AuthContext] Session refresh failed:', err.message);
      setStaff(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const patchStaff = useCallback((updates) => {
    setStaff((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const login = async () => ({ success: false, message: 'Use the main Babyeyi login page.' });

  const logout = async () => {
    try { await api.post('/session/logout'); } catch (e) { console.warn('[AuthContext] Logout error:', e.message); }
    setStaff(null);
    redirectToBabyeyiLogin();
  };

  return (
    <AuthContext.Provider value={{ staff, loading, login, logout, patchStaff, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
