import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();
const LOGIN_URL = import.meta.env.VITE_BABYEYI_LOGIN_URL || 'http://localhost:5173/login';

export const AuthProvider = ({ children }) => {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      try {
        const res = await api.get('/session/me');
        if (res.data?.success) setStaff(res.data?.data || res.data?.user || null);
        else setStaff(null);
      } catch (err) {
        console.error('[AuthContext] Session check failed:', err.message);
        setStaff(null);
      } finally { setLoading(false); }
    };
    boot();
  }, []);

  const login = async () => ({ success: false, message: 'Use the main Babyeyi login page.' });

  const logout = async () => {
    try { await api.post('/session/logout'); } catch (e) { console.warn('[AuthContext] Logout error:', e.message); }
    setStaff(null); window.location.href = LOGIN_URL;
  };

  return (
    <AuthContext.Provider value={{ staff, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
