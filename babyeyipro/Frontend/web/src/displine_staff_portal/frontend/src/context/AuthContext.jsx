import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { PORTAL } from '../config/portal';

const AuthContext = createContext();

const LEGACY_SESSION_KEY = 'teacher_logged_in';

const hasLoginMarker = () =>
  localStorage.getItem(PORTAL.sessionKey) === 'true' ||
  localStorage.getItem(LEGACY_SESSION_KEY) === 'true';

const setLoginMarker = () => {
  localStorage.setItem(PORTAL.sessionKey, 'true');
};

const clearLoginMarkers = () => {
  localStorage.removeItem(PORTAL.sessionKey);
  localStorage.removeItem(LEGACY_SESSION_KEY);
};

export const AuthProvider = ({ children }) => {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      const params = new URLSearchParams(window.location.search);
      const ssoToken = params.get('sso_token');

      if (ssoToken) {
        params.delete('sso_token');
        const cleanUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState({}, '', cleanUrl);

        try {
          const res = await api.post('/auth/sso-verify', { sso_token: ssoToken });
          if (res.data.success && res.data.user) {
            setLoginMarker();
            setStaff(res.data.user);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('[AuthContext] SSO verify failed:', err.response?.data?.message || err.message);
        }
      }

      if (!hasLoginMarker()) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/session/me');
        if (res.data.success) {
          setStaff(res.data.user || res.data.data);
          setLoginMarker();
        } else {
          clearLoginMarkers();
        }
      } catch (err) {
        console.error('[AuthContext] Session check failed:', err.message);
        clearLoginMarkers();
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        setLoginMarker();
        const meRes = await api.get('/session/me');
        if (meRes.data.success) {
          setStaff(meRes.data.user || meRes.data.data);
        }
        return { success: true };
      }
      return { success: false, message: 'Invalid response from server' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/session/logout');
    } catch (e) {
      console.warn('[AuthContext] Logout error:', e.message);
    }
    clearLoginMarkers();
    setStaff(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ staff, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
