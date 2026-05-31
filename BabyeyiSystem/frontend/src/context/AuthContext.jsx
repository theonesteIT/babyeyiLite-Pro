// ================================================================
// src/context/AuthContext.jsx
//
// SECURE SESSION-ONLY AUTH
// ✅ Zero localStorage — all user data lives in server session
// ✅ On every page load, calls /api/session/me to hydrate user
// ✅ httpOnly cookie is sent automatically by browser (never readable by JS)
// ✅ Any component can call useAuth() to get the current user
// ✅ useRequireAuth(role?) redirects to /login if not authenticated
// ================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { getPostLogoutLoginPath, syncPostLogoutLoginPath } from '../utils/postLogoutLoginPath';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);   // null = not loaded yet
  const [loading, setLoading] = useState(true);   // true during initial check
  const [error,   setError]   = useState(null);

  // Called once on app mount — fetches session from server
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/session/me`, {
        credentials: 'include',   // required for cookie to be sent cross-origin
        headers:     { 'Content-Type': 'application/json' },
      });
      const json = await res.json().catch(() => ({}));
      // Server returns 200 with data: null when not logged in (no 401)
      if (res.ok && json.success && json.data) {
        setUser(json.data);
        syncPostLogoutLoginPath(json.data);
        return json.data;
      }
      setUser(false);  // not logged in or error
      return null;
    } catch (e) {
      console.error('[AuthContext] session check failed:', e.message);
      setError('Cannot reach server');
      setUser(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  // ── Login — called after POST /api/auth/login succeeds ──────
  // Re-fetches session to populate user state
  const login = useCallback(async () => {
    setLoading(true);
    return loadSession();
  }, [loadSession]);

  // ── Logout ───────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/api/session/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch { /* ignore network errors on logout */ }
    try {
      localStorage.removeItem('teacher_logged_in');
    } catch { /* ignore */ }
    setUser(false);
  }, []);

  // ── Refresh (re-fetch user from server) ─────────────────────
  const refresh = useCallback(() => loadSession(), [loadSession]);

  const schoolObj = user && user !== false ? user?.school ?? null : null;
  const proAccessEffective =
    schoolObj?.pro_access_effective === true || schoolObj?.pro_access_effective === 1;

  const value = {
    user,        // object | false | null (null = still loading) — full session payload
    loading,     // true while initial fetch pending
    error,       // string | null
    login,       // call after successful login POST — returns session user or null
    logout,      // call to log out
    refresh,     // call to re-sync with server
    isLoggedIn:  !!user,
    role:        user?.role?.code || null,
    // School context (for SCHOOL_ADMIN / staff) — from session/me
    schoolId:    user?.school?.id ?? user?.school_id ?? null,
    school:      user?.school ?? null,
    proAccessEffective,
    subscriptionPlan: schoolObj?.subscription_plan || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ── Route guard hook ─────────────────────────────────────────
// Usage: const { user } = useRequireAuth('SUPER_ADMIN');
// Redirects to /login if not authenticated or wrong role
export function useRequireAuth(requiredRole = null) {
  const auth     = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.loading) return;                  // wait for session check
    if (!auth.isLoggedIn) {
      navigate(getPostLogoutLoginPath(), { replace: true });
      return;
    }
    if (requiredRole && auth.role !== requiredRole) {
      navigate('/unauthorized', { replace: true });
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, requiredRole, navigate]);

  return auth;
}