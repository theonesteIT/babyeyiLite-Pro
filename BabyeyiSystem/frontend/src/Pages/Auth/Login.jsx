// ================================================================
// Login.jsx — White LEFT: #000435 header strip + shulemanager logo, form
// Amber RIGHT: SMART SCHOOL MANAGEMENT (navy text), hero image (login-bg-removebg)
// httpOnly cookie auth — no tokens in localStorage
// ================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, LogIn, Building,
  AlertCircle, CheckCircle, Loader, ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProEntryUrl, shouldUseProApp } from '../../utils/proAppEntry';
import { getTeacherPortalUrl, isInternalTeacherPortalUrl, shouldUseTeacherPortal } from '../../utils/teacherPortalEntry';
import { setPostLogoutLoginPath } from '../../utils/postLogoutLoginPath';
import {
  getLiteStaffHomePath,
  isLiteDisciplineStaff,
  LITE_DISCIPLINE_HOME,
  LITE_ROLE_HOME,
  LITE_SHULE_AVANCE_ONLY,
} from '../../utils/liteStaffEntry';
import loginShulemanagerLogo from '../../assets/login-logo.png';
import loginDecor from '../../assets/login-bg-removebg.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const STAFF_LOGIN_PREFS_KEY = 'babyeyi_staff_login_prefs';
const SM_LOGIN_PREFS_KEY = 'babyeyi_school_manager_login_prefs';

function loadSmLoginPrefs() {
  try {
    const raw = localStorage.getItem(SM_LOGIN_PREFS_KEY);
    if (!raw) return { remember: false, email: '', schoolCode: '' };
    const p = JSON.parse(raw);
    return {
      remember: !!p.remember,
      email: typeof p.email === 'string' ? p.email : '',
      schoolCode: typeof p.schoolCode === 'string' ? p.schoolCode : '',
    };
  } catch {
    return { remember: false, email: '', schoolCode: '' };
  }
}

function loadStaffLoginPrefs() {
  try {
    const raw = localStorage.getItem(STAFF_LOGIN_PREFS_KEY);
    if (!raw) return { remember: false, identifier: '', schoolCode: '' };
    const p = JSON.parse(raw);
    return {
      remember: !!p.remember,
      identifier: typeof p.identifier === 'string' ? p.identifier : '',
      schoolCode: typeof p.schoolCode === 'string' ? p.schoolCode : '',
    };
  } catch {
    return { remember: false, identifier: '', schoolCode: '' };
  }
}

/** Lite portal staff — role-specific shells; teachers use teacher-portal instead. */
function liteStaffDestination(roleCode, sessionUser) {
  const rc = String(roleCode || '').toUpperCase();
  if (shouldUseTeacherPortal(sessionUser, rc)) {
    const url = getTeacherPortalUrl('/');
    if (!url) return null;
    return isInternalTeacherPortalUrl(url) ? { path: url } : { external: url };
  }
  const home = getLiteStaffHomePath(rc, sessionUser);
  if (home) return { path: home };
  return null;
}

const DASHBOARD = {
  SUPER_ADMIN:            '/superadmin/dashboard',
  FULL_SYSTEM_CONTROLLER: '/superadmin/control',
  SCHOOL_ADMIN:           '/school-babyeyi-dashboard',
  SCHOOL_MANAGER:         '/school-babyeyi-dashboard',
  DOS:                    '/lite/dos',
  HOD:                    '/hod/students',
  TEACHER:                '/teacher/dashboard',
  GATE_OFFICER:           '/gate/scanner',
  LIBRARIAN:              '/library/dashboard',
  STORE_MANAGER:          '/store/dashboard',
  ACCOUNTANT:             '/lite/accountant',
  DISCIPLINE:             LITE_DISCIPLINE_HOME,
  DISCIPLINE_STAFF:       LITE_DISCIPLINE_HOME,
  HEAD_OF_DISCIPLINE:     LITE_DISCIPLINE_HOME,
  STUDENT:                '/parents',
  PARENT:                 '/parents',
  NESA_ADMIN:             '/nesa-babyeyi-dashboard',
  DEO:                    '/district-babyeyi-dashboard',
  AGENT:                  '/agent/dashboard',
  SHULE_AVANCE_PARTNER:   '/shule-avance/dashboard',
};

const GOOGLE_AUTH_URL = `${API}/api/auth/google`;

/**
 * @param {{
 *   forceLitePortal?: boolean;
 *   variant?: 'staff' | 'schoolManager';
 *   portalBrand?: null | 'lite' | 'pro';
 *   portalNav?: null | { backHref: string; backLabel: string; secondaryHref?: string; secondaryLabel?: string };
 * }} [props]
 * `forceLitePortal`: Lite URL only — no Pro web redirect; Pro-enabled schools are blocked here.
 * `variant="schoolManager"`: email + required school code (same API as legacy school manager login).
 */
const Login = ({
  forceLitePortal = false,
  variant = 'staff',
  portalBrand = null,
  portalNav = null,
} = {}) => {
  const navigate = useNavigate();
  const auth = useAuth();
  const isSchoolManager = variant === 'schoolManager';
  const isProPortal = portalBrand === 'pro' && isSchoolManager;

  useEffect(() => {
    fetch(`${API}/api/auth/system-config/public`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success && j.data) setSysPublic(j.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (forceLitePortal) {
      setPostLogoutLoginPath('/login/lite');
    } else if (isSchoolManager && portalBrand === 'pro') {
      setPostLogoutLoginPath('/login/pro');
    }
  }, [forceLitePortal, isSchoolManager, portalBrand]);

  useEffect(() => {
    if (auth.loading || !auth.isLoggedIn || !auth.role || !auth.user || auth.user === false) return;
    const roleCode = String(auth.role).toUpperCase();

    if (forceLitePortal && shouldUseProApp(auth.user) && roleCode) {
      navigate('/login/pro', { replace: true });
      return;
    }
    if (isProPortal && !shouldUseProApp(auth.user)) {
      navigate('/login/lite', { replace: true });
      return;
    }
    if (isProPortal && shouldUseProApp(auth.user)) {
      const proUrl = getProEntryUrl(roleCode);
      if (proUrl) {
        setPostLogoutLoginPath('/login/pro');
        window.location.replace(proUrl);
        return;
      }
    }
    if (!forceLitePortal && !isProPortal && shouldUseProApp(auth.user)) {
      const proUrl = getProEntryUrl(roleCode);
      if (proUrl) {
        setPostLogoutLoginPath('/login/pro');
        window.location.replace(proUrl);
        return;
      }
    }
    if (forceLitePortal || isLiteDisciplineStaff(auth.user)) {
      const liteDest = liteStaffDestination(roleCode, auth.user);
      if (liteDest?.external) {
        window.location.replace(liteDest.external);
        return;
      }
      if (liteDest?.path) {
        navigate(liteDest.path, { replace: true });
        return;
      }
    }
    if (!forceLitePortal && shouldUseTeacherPortal(auth.user, roleCode)) {
      const url = getTeacherPortalUrl('/');
      if (url) {
        if (isInternalTeacherPortalUrl(url)) {
          navigate(url, { replace: true });
        } else {
          window.location.replace(url);
        }
        return;
      }
    }
    const target = DASHBOARD[roleCode];
    if (target) navigate(target, { replace: true });
  }, [auth.loading, auth.isLoggedIn, auth.role, auth.user, navigate, forceLitePortal, isProPortal, isSchoolManager, portalBrand]);

  const [prefsLoaded] = useState(() => {
    if (isSchoolManager) {
      const sm = loadSmLoginPrefs();
      return { remember: sm.remember, identifier: sm.email, schoolCode: sm.schoolCode };
    }
    return loadStaffLoginPrefs();
  });
  const [form, setForm] = useState({
    identifier: prefsLoaded.identifier,
    password: '',
    schoolCode: prefsLoaded.schoolCode,
  });
  const [rememberMe, setRememberMe] = useState(!!prefsLoaded.remember);
  const [ui, setUi] = useState({ showPassword: false, loading: false, error: null, success: null });
  const [attempts, setAttempts]   = useState(0);
  const [locked, setLocked]       = useState(false);
  const [lockUntil, setLockUntil] = useState(null);
  const [sysPublic, setSysPublic] = useState(null);

  const notify = (msg, type = 'error') => {
    setUi(p => ({ ...p, error: type === 'error' ? msg : null, success: type === 'success' ? msg : null }));
    if (type === 'error') setTimeout(() => setUi(p => ({ ...p, error: null })), 6000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) {
      const mins = Math.ceil((new Date(lockUntil) - new Date()) / 60000);
      notify(`Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
      return;
    }
    const schoolCodeTrim = form.schoolCode.trim().toUpperCase();
    if (isSchoolManager) {
      if (!form.identifier.trim()) {
        notify(isProPortal ? 'Enter your work email' : 'Enter your school manager email');
        return;
      }
      if (!schoolCodeTrim) { notify('Enter your school code (e.g. 04001 — same as in the directory).'); return; }
    } else if (!form.identifier.trim()) {
      notify('Enter your email or username');
      return;
    }
    if (!form.password.trim()) { notify('Enter your password'); return; }

    setUi(p => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: form.identifier.trim(),
          password: form.password,
          schoolCode: isSchoolManager ? schoolCodeTrim : (schoolCodeTrim || undefined),
          remember_me: rememberMe,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.locked) {
          setLocked(true);
          setLockUntil(new Date(Date.now() + 30 * 60 * 1000));
          notify(json.message || 'Account locked.');
          return;
        }
        const codeMessages = {
          SCHOOL_PENDING_APPROVAL: 'Your school registration is pending approval. Please wait for the Super Admin to activate your school.',
          SCHOOL_INACTIVE:         'Your school is inactive. Please contact the Super Admin to activate it.',
          SCHOOL_NOT_LINKED:       'Your school account is not linked yet. Please contact the Super Admin.',
          SCHOOL_CODE_REQUIRED:    json.message || 'Enter your school code to sign in as School Manager.',
          SYSTEM_MAINTENANCE:      json.message || 'System maintenance — only Super Administrator can sign in.',
        };
        if (codeMessages[json.code]) { setAttempts(0); notify(codeMessages[json.code]); return; }
        const next = attempts + 1;
        setAttempts(next);
        notify(
          json.remainingAttempts != null
            ? `${json.message} — ${json.remainingAttempts} attempt${json.remainingAttempts !== 1 ? 's' : ''} left.`
            : json.message || 'Invalid credentials.'
        );
        return;
      }

      const roleCode = json.role ? String(json.role).toUpperCase() : null;

      if (rememberMe) {
        if (isSchoolManager) {
          localStorage.setItem(SM_LOGIN_PREFS_KEY, JSON.stringify({
            remember: true,
            email: form.identifier.trim(),
            schoolCode: schoolCodeTrim,
          }));
        } else {
          localStorage.setItem(STAFF_LOGIN_PREFS_KEY, JSON.stringify({
            remember: true, identifier: form.identifier.trim(), schoolCode: schoolCodeTrim || '',
          }));
        }
      } else {
        localStorage.removeItem(isSchoolManager ? SM_LOGIN_PREFS_KEY : STAFF_LOGIN_PREFS_KEY);
      }

      const sessionUser = await auth.login();
      setAttempts(0);

      if (roleCode === 'TEACHER') {
        try {
          localStorage.setItem('teacher_logged_in', 'true');
        } catch { /* ignore */ }
      }

      if (forceLitePortal && sessionUser && shouldUseProApp(sessionUser) && roleCode) {
        await auth.logout();
        notify('Your school uses ShuleManager Pro. Sign in from the Pro portal.');
        return;
      }

      if (isProPortal && sessionUser && !shouldUseProApp(sessionUser)) {
        await auth.logout();
        notify('Your school is on ShuleManager Lite. Use the Lite portal to sign in.');
        return;
      }

      if (forceLitePortal) {
        setPostLogoutLoginPath('/login/lite');
      } else if (isProPortal) {
        setPostLogoutLoginPath('/login/pro');
      } else {
        setPostLogoutLoginPath('/login');
      }

      notify('Welcome! Redirecting…', 'success');

      if (isProPortal && sessionUser && shouldUseProApp(sessionUser) && roleCode) {
        const proUrl = getProEntryUrl(roleCode);
        if (proUrl) {
          setTimeout(() => window.location.assign(proUrl), 400);
          return;
        }
        await auth.logout();
        notify('This account cannot sign in through ShuleManager Pro.');
        return;
      }

      if (!forceLitePortal && !isProPortal && sessionUser && shouldUseProApp(sessionUser) && roleCode) {
        const proUrl = getProEntryUrl(roleCode);
        if (proUrl) {
          setPostLogoutLoginPath('/login/pro');
          setTimeout(() => window.location.assign(proUrl), 400);
          return;
        }
      }
      if (roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER') {
        setTimeout(() => navigate(DASHBOARD.SCHOOL_ADMIN, { replace: true }), 900);
        return;
      }
      if (forceLitePortal || isLiteDisciplineStaff(sessionUser)) {
        const liteDest = liteStaffDestination(roleCode, sessionUser);
        if (liteDest?.external) {
          setTimeout(() => window.location.assign(liteDest.external), 400);
          return;
        }
        if (liteDest?.path) {
          setPostLogoutLoginPath('/login/lite');
          setTimeout(() => navigate(liteDest.path, { replace: true }), 900);
          return;
        }
      }
      if (shouldUseTeacherPortal(sessionUser, roleCode)) {
        const url = getTeacherPortalUrl('/');
        if (url) {
          if (isInternalTeacherPortalUrl(url)) {
            setTimeout(() => navigate(url, { replace: true }), 900);
          } else {
            setTimeout(() => window.location.assign(url), 400);
          }
          return;
        }
      }
      let dest = json.redirect || (roleCode && DASHBOARD[roleCode]) || '/';
      if (dest === '/admin/dashboard' || dest === '/school-admin/dashboard') dest = DASHBOARD.SCHOOL_ADMIN;
      if (dest === '/accountant/dashboard' || dest === '/accountant' || String(dest).startsWith('/accountant/')) {
        dest = DASHBOARD.ACCOUNTANT;
      }
      if (dest === '/discipline' || String(dest).startsWith('/discipline/')) {
        dest = DASHBOARD.DISCIPLINE;
      }
      if (dest === '/login') { const mapped = roleCode && DASHBOARD[roleCode]; if (mapped) dest = mapped; }
      if (roleCode === 'ACCOUNTANT' || dest === DASHBOARD.ACCOUNTANT) {
        setPostLogoutLoginPath('/login/lite');
      }
      if (isLiteDisciplineStaff(sessionUser) || dest === DASHBOARD.DISCIPLINE) {
        setPostLogoutLoginPath('/login/lite');
      }
      setTimeout(() => navigate(dest, { replace: true }), 900);

    } catch (err) {
      console.error('Login error:', err);
      notify('Cannot connect to server. Is it running on port 5100?');
    } finally {
      setUi(p => ({ ...p, loading: false }));
    }
  };

  return (
    <>
      <style>{`
       

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── PAGE ── */
        .lx-page {
          font-family: 'Plus Jakarta Sans', sans-serif;
          min-height: 100vh;
          background: #ede8df;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }

        /* ── CARD ── */
        .lx-card {
          display: flex;
          width: 100%;
          max-width: 1140px;
          min-height: 640px;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 28px 90px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.07);
        }

        /* ══ LEFT — white form ══ */
        .lx-left {
          background: #fff;
          width: 43%;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          padding: 0;
          min-height: 100%;
        }

        /* Navy header — logo bar flush above white form (matches card top-left radius via parent overflow) */
        .lx-left-header {
          background: linear-gradient(135deg, #000435 0%, #0a1a4a 100%);
          padding: 1.15rem 1.75rem 1.2rem;
          flex-shrink: 0;
          border-radius: 24px 0 0 0;
          border-bottom: 1px solid rgba(251, 191, 36, 0.12);
        }
        .lx-header-logo {
          width: 100%;
          max-width: 300px;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .lx-left-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 2.5rem 2.75rem 2rem;
          min-height: 0;
        }

        .lx-h1 {
          font-size: 1.9rem;
          font-weight: 800;
          color: #000435;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: 0.3rem;
        }
        .lx-h1-grad {
          background: linear-gradient(135deg, #FBBF24, #FDE68A, #F59E0B);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lx-portal-nav {
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding: 0 clamp(1rem, 4vw, 2.5rem);
          min-height: 56px;
          background: #000435;
          border-bottom: 1px solid rgba(251,191,36,0.2);
        }
        .lx-portal-nav-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.78);
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 10px;
          padding: 8px 14px;
          background: rgba(255,255,255,0.05);
        }
        .lx-portal-nav-back:hover { color: #FBBF24; border-color: rgba(251,191,36,0.45); }
        .lx-portal-nav-secondary {
          font-size: 11px;
          font-weight: 800;
          color: #FBBF24;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .lx-portal-nav-secondary:hover { color: #fff; }
        .lx-reg-note {
          margin-top: 1.1rem;
          font-size: 0.72rem;
          color: #777;
          text-align: center;
          line-height: 1.45;
        }
        .lx-reg-note a { color: #f59e0b; font-weight: 700; text-decoration: none; }
        .lx-reg-note a:hover { text-decoration: underline; }
        .lx-sub {
          font-size: 0.84rem;
          color: #999;
          font-weight: 500;
          margin-bottom: 1.5rem;
        }

        /* Alerts */
        .lx-alert {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          padding: 10px 13px;
          border-radius: 10px;
          font-size: 0.77rem;
          font-weight: 600;
          line-height: 1.4;
          margin-bottom: 1rem;
        }
        .lx-alert svg { flex-shrink: 0; margin-top: 1px; }
        .lx-alert.err  { background: #fff0f0; border: 1px solid #fca5a5; color: #b91c1c; }
        .lx-alert.ok   { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; }
        .lx-alert.warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }

        /* Fields */
        .lx-field { margin-bottom: 0.9rem; }
        .lx-label {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          color: #666;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .lx-label-note {
          display: block;
          font-size: 0.67rem;
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
          color: #bbb;
          margin-top: 1px;
        }
        .lx-iw { position: relative; }
        .lx-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #ccc;
          pointer-events: none;
          display: flex;
          transition: color 0.2s;
        }
        .lx-iw:focus-within .lx-icon { color: #f59e0b; }
        .lx-input {
          width: 100%;
          padding: 11px 13px 11px 38px;
          background: #f8f8f8;
          border: 1.5px solid #eee;
          border-radius: 10px;
          color: #111;
          font-size: 0.86rem;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .lx-input::placeholder { color: #ccc; font-size: 0.8rem; }
        .lx-input:focus {
          border-color: #f59e0b;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.1);
        }
        .lx-input:disabled { opacity: 0.5; cursor: not-allowed; }
        .lx-input.mono { font-family: 'Montserrat', monospace; letter-spacing: 0.08em; }
        .lx-eye {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #ccc;
          padding: 4px;
          display: flex;
          transition: color 0.2s;
        }
        .lx-eye:hover { color: #888; }

        /* Row */
        .lx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.2rem;
          flex-wrap: wrap;
          gap: 8px;
        }
        .lx-remember {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #555;
          cursor: pointer;
          user-select: none;
        }
        .lx-remember input { width: 15px; height: 15px; accent-color: #f59e0b; cursor: pointer; }
        .lx-forgot {
          font-size: 0.8rem;
          font-weight: 700;
          color: #f59e0b;
          text-decoration: none;
          transition: color 0.15s;
        }
        .lx-forgot:hover { color: #d97706; }

        /* Submit — orange gradient */
        .lx-btn {
          width: 100%;
          padding: 13px;
          border-radius: 10px;
          border: none;
          outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
          color: #fff;
          box-shadow: 0 4px 18px rgba(245,158,11,0.38);
          transition: transform 0.18s, box-shadow 0.18s, filter 0.18s;
        }
        .lx-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 26px rgba(245,158,11,0.48);
          filter: brightness(1.04);
        }
        .lx-btn:disabled { background: #eee; color: #bbb; cursor: not-allowed; box-shadow: none; }

        /* Attempt warning */
        .lx-warn {
          margin-top: 0.75rem;
          padding: 9px 13px;
          border-radius: 9px;
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
        }
        .lx-warn.caution { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        .lx-warn.locked  { background: #fff0f0; border: 1px solid #fca5a5; color: #b91c1c; }

        /* Divider */
        .lx-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 1.2rem 0;
        }
        .lx-divider::before, .lx-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #eee;
        }
        .lx-divider span { font-size: 0.74rem; color: #bbb; font-weight: 500; white-space: nowrap; }

        /* Google */
        .lx-google {
          width: 100%;
          padding: 11px 14px;
          border-radius: 10px;
          border: 1.5px solid #e8e8e8;
          background: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          color: #333;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .lx-google:hover {
          border-color: #ddd;
          background: #fafafa;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        /* Footer */
        .lx-footer {
          margin-top: auto;
          padding-top: 1.5rem;
          font-size: 0.71rem;
          color: #ccc;
          font-weight: 500;
        }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; display: inline-flex; }

        /* ══ RIGHT — amber panel ══ */
        .lx-right {
          flex: 1;
          background: linear-gradient(165deg, #fbbf24 0%, #f59e0b 55%, #ea580c 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;
          overflow: hidden;
          padding: 1.35rem 1.5rem 1.25rem;
        }

        /* Dot grids */
        // .lx-dots-tr {
        //   position: absolute;
        //   top: 1.25rem;
        //   right: 1.25rem;
        //   width: 120px;
        //   height: 120px;
        //   background-image: radial-gradient(circle, rgba(0,0,0,0.18) 1.5px, transparent 1.5px);
        //   background-size: 15px 15px;
        //   pointer-events: none;
        //   z-index: 1;
        // }
        // .lx-dots-bl {
        //   position: absolute;
        //   bottom: 1.25rem;
        //   left: 1.25rem;
        //   width: 90px;
        //   height: 90px;
        //   background-image: radial-gradient(circle, rgba(0,0,0,0.12) 1.5px, transparent 1.5px);
        //   background-size: 15px 15px;
        //   pointer-events: none;
        //   z-index: 1;
        // }

        /* Arch circle */
        .lx-arch {
          position: absolute;
          top: 32%;
          left: 50%;
          transform: translateX(-50%);
          width: 560px;
          height: 560px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          pointer-events: none;
          z-index: 0;
        }
        .lx-arch-sm {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          pointer-events: none;
          z-index: 0;
        }

        /* Right text + image — text high, compact type, large hero below */
        .lx-rc {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          max-width: 100%;
          margin: 0;
        }
        .lx-headline {
          font-size: 1.55rem;
          font-weight: 900;
          color: #000435;
          line-height: 1.12;
          letter-spacing: -0.02em;
          max-width: 100%;
          margin: 0 0 0.4rem;
        }
        .lx-line {
          width: 36px;
          height: 3px;
          background: #000435;
          border-radius: 2px;
          margin-bottom: 0.55rem;
        }
        .lx-tagline-lead {
          font-size: 0.82rem;
          font-weight: 700;
          color: rgba(0, 4, 53, 0.88);
          line-height: 1.4;
          margin: 0 0 0.35rem;
        }
        .lx-tagline-sub {
          font-size: 0.74rem;
          font-weight: 500;
          color: rgba(0, 4, 53, 0.62);
          line-height: 1.45;
          margin: 0;
          max-width: 280px;
        }

        .lx-hero-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          margin-top: -0.65rem;
          flex: 0 0 auto;
        }
        .lx-hero {
          width: 100%;
          max-width: 520px;
          min-width: 280px;
          height: auto;
          object-fit: contain;
          object-position: center top;
          transform: translateY(-10px);
          filter: drop-shadow(0 18px 44px rgba(0, 4, 53, 0.24));
          user-select: none;
          pointer-events: none;
        }

        /* Responsive — mobile: form only, hide hero panel */
        @media (max-width: 860px) {
          .lx-page { padding: 1rem; }
          .lx-card {
            flex-direction: column;
            max-width: 440px;
            min-height: auto;
            border-radius: 20px;
          }
          .lx-left { width: 100%; }
          .lx-left-header { border-radius: 20px 20px 0 0; }
          .lx-left-body { padding: 2rem 1.5rem 1.75rem; }
          .lx-right { display: none !important; }
        }
        @media (min-width: 1280px) {
          .lx-left-body { padding: 3rem 3.25rem 2.25rem; }
          .lx-right { padding: 1.5rem 2rem 1rem; }
          .lx-headline { font-size: 1.72rem; }
          .lx-tagline-lead { font-size: 0.88rem; }
          .lx-tagline-sub { font-size: 0.8rem; }
          .lx-hero { max-width: 580px; }
        }
      `}</style>

      {portalNav && (
        <nav className="lx-portal-nav">
          <Link to={portalNav.backHref} className="lx-portal-nav-back">
            <ArrowLeft size={16} strokeWidth={2.5} /> {portalNav.backLabel}
          </Link>
          {portalNav.secondaryHref && portalNav.secondaryLabel ? (
            <Link to={portalNav.secondaryHref} className="lx-portal-nav-secondary">{portalNav.secondaryLabel}</Link>
          ) : <span aria-hidden="true" />}
        </nav>
      )}

      <div className="lx-page">
        <div className="lx-card">

          {/* ════ LEFT ════ */}
          <div className="lx-left">

            <div className="lx-left-header">
              <img
                src={loginShulemanagerLogo}
                alt="Babyeyi shulemanager"
                className="lx-header-logo"
              />
            </div>

            <div className="lx-left-body">
            <h1 className="lx-h1">
              {portalBrand ? (
                <>ShuleManager <span className="lx-h1-grad">{portalBrand === 'lite' ? 'Lite' : 'Pro'}</span></>
              ) : (
                'Welcome Back'
              )}
            </h1>
            <p className="lx-sub">
              {portalBrand === 'lite' && ''}
              {portalBrand === 'pro' && ''}
              {!portalBrand && 'Sign in to continue to your portal'}
            </p>

            {sysPublic?.maintenance_mode && (
              <div className="lx-alert warn">
                <AlertCircle size={15}/>
                <span>Maintenance mode: only Super Administrator or Full System Controller accounts can sign in.</span>
              </div>
            )}
            {sysPublic?.block_non_super_writes && !sysPublic?.maintenance_mode && (
              <div className="lx-alert warn">
                <AlertCircle size={15}/>
                <span>System changes are restricted. You can still sign in and browse.</span>
              </div>
            )}
            {ui.error   && <div className="lx-alert err"><AlertCircle size={15}/><span>{ui.error}</span></div>}
            {ui.success && <div className="lx-alert ok"><CheckCircle size={15}/><span>{ui.success}</span></div>}

            <form onSubmit={handleSubmit}>

              <div className="lx-field">
                <label className="lx-label" htmlFor="identifier">
                  {isProPortal ? 'Work email' : isSchoolManager ? 'Manager email' : 'Email / Username / Staff ID'}
                </label>
                <div className="lx-iw">
                  <span className="lx-icon"><Mail size={15}/></span>
                  <input
                    id="identifier" name="identifier" className="lx-input" type={isSchoolManager ? 'email' : 'text'}
                    value={form.identifier} disabled={ui.loading}
                    onChange={e => setForm(p => ({...p, identifier: e.target.value}))}
                    placeholder={isProPortal ? 'staff@school.rw' : isSchoolManager ? 'manager@school.rw' : 'admin@school.rw'}
                    autoComplete={isSchoolManager ? 'email' : 'username'}
                  />
                </div>
              </div>

              <div className="lx-field">
                <label className="lx-label" htmlFor="schoolCode">
                  School code
                  {!isSchoolManager && (
                    <span className="lx-label-note">Required for school staff; leave blank for Super Admin / NESA / DEO</span>
                  )}
                  {isSchoolManager && (
                    <span className="lx-label-note">Required — same code as in the school directory</span>
                  )}
                </label>
                <div className="lx-iw">
                  <span className="lx-icon"><Building size={15}/></span>
                  <input
                    id="schoolCode" name="schoolCode" className="lx-input mono" type="text"
                    value={form.schoolCode} disabled={ui.loading}
                    onChange={e => setForm(p => ({...p, schoolCode: e.target.value.toUpperCase()}))}
                    placeholder="04001"
                  />
                </div>
              </div>

              <div className="lx-field">
                <label className="lx-label" htmlFor="password">Password</label>
                <div className="lx-iw">
                  <span className="lx-icon"><Lock size={15}/></span>
                  <input
                    id="password" name="password" className="lx-input"
                    type={ui.showPassword ? 'text' : 'password'}
                    value={form.password} disabled={ui.loading}
                    onChange={e => setForm(p => ({...p, password: e.target.value}))}
                    placeholder="Your password" autoComplete="current-password"
                    style={{ paddingRight: '42px' }}
                  />
                  <button type="button" className="lx-eye"
                    onClick={() => setUi(p => ({...p, showPassword: !p.showPassword}))}
                    aria-label={ui.showPassword ? 'Hide password' : 'Show password'}
                  >
                    {ui.showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>

              <div className="lx-row">
                <label className="lx-remember">
                  <input type="checkbox" checked={rememberMe} disabled={ui.loading}
                    onChange={e => setRememberMe(e.target.checked)} />
                  Remember me on this device
                </label>
                {!isSchoolManager && (
                  <a href="/forgot-password" className="lx-forgot">Forgot password?</a>
                )}
              </div>

              <button type="submit" className="lx-btn" disabled={ui.loading || locked}>
                {ui.loading
                  ? <><span className="spin"><Loader size={18}/></span> Signing in…</>
                  : <><LogIn size={18}/> Sign In</>
                }
              </button>

              {attempts > 0 && attempts < 5 && !locked && (
                <div className="lx-warn caution">⚠️ {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining</div>
              )}
              {locked && (
                <div className="lx-warn locked">🔒 Account temporarily locked. Try again in 30 minutes.</div>
              )}
            </form>

            {/* <div className="lx-divider"><span>or continue with</span></div>

            <a href={GOOGLE_AUTH_URL} className="lx-google">
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </a> */}

            <p className="lx-footer">© 2026 Edupoto · All rights reserved</p>
            {isSchoolManager && (
              <p className="lx-reg-note">
                Need to register your school?{' '}
                <Link to="/register">Register your school</Link>
              </p>
            )}
            </div>
          </div>

          {/* ════ RIGHT ════ */}
          <div className="lx-right" aria-hidden="false">
            <div className="lx-arch"/>
            <div className="lx-arch-sm"/>

            <div className="lx-rc">
              <h2 className="lx-headline">SMART SCHOOL MANAGEMENT</h2>
              <div className="lx-line"/>
              <p className="lx-tagline-lead">Manage. Monitor. Empower.</p>
              <p className="lx-tagline-sub">All in one platform for smarter education.</p>
              <div className="lx-hero-wrap">
                <img src={loginDecor} alt="" className="lx-hero" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Login;