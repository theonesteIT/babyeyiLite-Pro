import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const boot = async () => {
      // ── 1. Check for SSO handoff token in URL (?sso_token=xxx) ────────────
      // This is set by the main Babyeyi platform after a successful Teacher login.
      // We exchange it silently for a real session — no password needed.
      const params   = new URLSearchParams(window.location.search);
      const ssoToken = params.get('sso_token');

      if (ssoToken) {
        // Remove the token from the URL immediately (security hygiene)
        params.delete('sso_token');
        const cleanUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState({}, '', cleanUrl);

        try {
          const res = await api.post('/auth/sso-verify', { sso_token: ssoToken });
          if (res.data.success && res.data.user) {
            localStorage.setItem('manager_logged_in', 'true');
            setManager(res.data.user);
            setLoading(false);
            return; // Done — manager is authenticated via SSO
          }
        } catch (err) {
          console.warn('[AuthContext] SSO verify failed:', err.response?.data?.message || err.message);
          // SSO failed — fall through to regular session check below
        }
      }

      // ── 2. Regular session check (existing cookie / local marker) ──────────
      const loggedInMarker = localStorage.getItem('manager_logged_in');
      if (!loggedInMarker) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/session/me');
        if (res.data.success) {
          setManager(res.data.user || res.data.data);
        } else {
          localStorage.removeItem('manager_logged_in');
        }
      } catch (err) {
        console.error('[AuthContext] Session check failed:', err.message);
        localStorage.removeItem('manager_logged_in');
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  // Direct login (used by the Manager Portal's own Login page)
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('manager_logged_in', 'true');
        const meRes = await api.get('/session/me');
        if (meRes.data.success) {
          setManager(meRes.data.user || meRes.data.data);
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
    localStorage.removeItem('manager_logged_in');
    setManager(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ manager, setManager, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
