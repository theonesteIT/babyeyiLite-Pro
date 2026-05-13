import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

/** Same key as BabyeyiSystem/frontend Login — remember identifier + school code only. */
const STAFF_LOGIN_PREFS_KEY = 'babyeyi_staff_login_prefs';

function roleCodeFromSessionPayload(data) {
  if (!data) return '';
  const r = data.role;
  if (r && typeof r === 'object' && r.code) return String(r.code).toUpperCase();
  if (data.role_code) return String(data.role_code).toUpperCase();
  return '';
}

export const AuthProvider = ({ children }) => {
  const [teacher, setTeacher] = useState(null);
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
          const ssoUser = res.data?.user ?? res.data?.data ?? null;
          if (res.data.success && ssoUser) {
            localStorage.setItem('teacher_logged_in', 'true');
            setTeacher(ssoUser);
            setLoading(false);
            return; // Done — teacher is authenticated via SSO
          }
        } catch (err) {
          console.warn('[AuthContext] SSO verify failed:', err.response?.data?.message || err.message);
          // SSO failed — fall through to regular session check below
        }
      }

      // ── 2. Regular session check (Babyeyi httpOnly cookie + local marker) ───
      const loggedInMarker = localStorage.getItem('teacher_logged_in');
      if (!loggedInMarker) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/session/me');
        if (res.data.success) {
          const data = res.data.data ?? res.data.user;
          const rc = roleCodeFromSessionPayload(data);
          if (data && rc === 'TEACHER') {
            setTeacher(data);
          } else {
            localStorage.removeItem('teacher_logged_in');
            try {
              await api.post('/session/logout');
            } catch (_) {}
            setTeacher(null);
          }
        } else {
          localStorage.removeItem('teacher_logged_in');
        }
      } catch (err) {
        console.error('[AuthContext] Session check failed:', err.message);
        localStorage.removeItem('teacher_logged_in');
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  /**
   * Same contract as BabyeyiSystem/frontend: POST /api/auth/login with
   * identifier (email or HR staff code / staff_id), password, schoolCode (optional), remember_me.
   * Shule Teacher portal accepts only TEACHER role.
   */
  const login = async (identifier, password, { schoolCode = '', rememberMe = false } = {}) => {
    const schoolCodeTrim =
      schoolCode != null && String(schoolCode).trim() !== ''
        ? String(schoolCode).trim().toUpperCase()
        : '';

    try {
      const res = await api.post('/auth/login', {
        identifier: String(identifier || '').trim(),
        password,
        schoolCode: schoolCodeTrim || undefined,
        remember_me: rememberMe,
      });

      if (!res.data?.success) {
        return { success: false, message: res.data?.message || 'Login failed.' };
      }

      const meRes = await api.get('/session/me');
      const data = meRes.data?.data ?? meRes.data?.user;
      const rc = roleCodeFromSessionPayload(data);

      if (!data || rc !== 'TEACHER') {
        try {
          await api.post('/session/logout');
        } catch (_) {}
        return {
          success: false,
          message:
            rc && rc !== 'TEACHER'
              ? 'This portal is for teachers only. Use the main Babyeyi login for your role.'
              : 'Could not load your session after login.',
        };
      }

      if (rememberMe) {
        localStorage.setItem(
          STAFF_LOGIN_PREFS_KEY,
          JSON.stringify({
            remember: true,
            identifier: String(identifier || '').trim(),
            schoolCode: schoolCodeTrim || '',
          })
        );
      } else {
        localStorage.removeItem(STAFF_LOGIN_PREFS_KEY);
      }

      localStorage.setItem('teacher_logged_in', 'true');
      setTeacher(data);
      return { success: true };
    } catch (err) {
      const body = err.response?.data;
      const code = body?.code;
      let message = body?.message || 'Login failed. Please check your credentials.';

      if (code === 'SCHOOL_CODE_REQUIRED') {
        message = body?.message || 'Enter your school code to sign in.';
      } else if (code === 'SCHOOL_PENDING_APPROVAL') {
        message =
          body?.message ||
          'Your school registration is pending approval. Please wait before logging in.';
      } else if (code === 'SCHOOL_INACTIVE' || code === 'SCHOOL_SUSPENDED') {
        message = body?.message || 'Your school account is not active. Contact the administrator.';
      } else if (code === 'SCHOOL_NOT_LINKED') {
        message = body?.message || 'Your school account is not linked yet. Contact the administrator.';
      } else if (code === 'SYSTEM_MAINTENANCE') {
        message = body?.message || 'System maintenance — sign-in is limited.';
      }

      if (body?.locked) {
        message = body?.message || 'Account locked — try again later.';
      }

      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/session/logout');
    } catch (e) {
      console.warn('[AuthContext] Logout error:', e.message);
    }
    localStorage.removeItem('teacher_logged_in');
    setTeacher(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ teacher, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
