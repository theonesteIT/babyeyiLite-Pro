// ================================================================
// schoolManagerLogin.jsx — School Manager login (email + school code + password)
// POST /api/auth/login with school code so the session binds to that school only.
// Route: /school-manager/login
// ================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, LogIn, Building2, AlertCircle, CheckCircle, Loader2,
  ArrowLeft, GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProEntryUrl, shouldUseProApp } from '../../utils/proAppEntry';
import loginLogo from '../../assets/login-logo.png';
import loginDecor from '../../assets/login-bg-removebg.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const DASHBOARD_SM = '/school-babyeyi-dashboard';

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

export default function SchoolManagerLogin({
  staffLoginHref = '/login',
  backHref = '/',
  backLabel = 'Back to home',
} = {}) {
  const navigate = useNavigate();
  const auth = useAuth();

  const [prefsLoaded] = useState(() => loadSmLoginPrefs());
  const [form, setForm] = useState({
    email: prefsLoaded.email,
    schoolCode: prefsLoaded.schoolCode,
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(!!prefsLoaded.remember);
  const [ui, setUi] = useState({ showPassword: false, loading: false, error: null, success: null });
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockUntil, setLockUntil] = useState(null);

  useEffect(() => {
    if (auth.loading || !auth.isLoggedIn || !auth.role || !auth.user || auth.user === false) return;
    const roleCode = String(auth.role).toUpperCase();
    if (roleCode !== 'SCHOOL_ADMIN' && roleCode !== 'SCHOOL_MANAGER') return;
    if (shouldUseProApp(auth.user)) {
      const proUrl = getProEntryUrl(roleCode);
      if (proUrl) {
        window.location.replace(proUrl);
        return;
      }
    }
    navigate(DASHBOARD_SM, { replace: true });
  }, [auth.loading, auth.isLoggedIn, auth.role, auth.user, navigate]);

  const notify = (msg, type = 'error') => {
    setUi((p) => ({ ...p, error: type === 'error' ? msg : null, success: type === 'success' ? msg : null }));
    if (type === 'error') setTimeout(() => setUi((p) => ({ ...p, error: null })), 7000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) {
      const mins = Math.ceil((new Date(lockUntil) - new Date()) / 60000);
      notify(`Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
      return;
    }
    const email = form.email.trim();
    const schoolCodeTrim = form.schoolCode.trim().toUpperCase();
    if (!email) {
      notify('Enter your school manager email');
      return;
    }
    if (!schoolCodeTrim) {
      notify('Enter your school code (e.g. 04001 — same as in the directory).');
      return;
    }
    if (!form.password.trim()) {
      notify('Enter your password');
      return;
    }

    setUi((p) => ({ ...p, loading: true, error: null, success: null }));
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: email,
          password: form.password,
          schoolCode: schoolCodeTrim,
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
        if (json.code === 'SCHOOL_PENDING_APPROVAL') {
          setAttempts(0);
          notify(
            'Your school registration is pending approval. Wait for Super Admin activation before logging in.',
            'error'
          );
          return;
        }
        if (json.code === 'SCHOOL_INACTIVE') {
          setAttempts(0);
          notify('Your school is inactive. Contact the Super Admin.', 'error');
          return;
        }
        if (json.code === 'SCHOOL_NOT_LINKED') {
          setAttempts(0);
          notify('Your account is not linked to a school. Contact the Super Admin.', 'error');
          return;
        }
        if (json.code === 'SCHOOL_CODE_REQUIRED') {
          setAttempts(0);
          notify(json.message || 'School code is required.');
          return;
        }
        const next = attempts + 1;
        setAttempts(next);
        notify(
          json.remainingAttempts != null
            ? `${json.message} — ${json.remainingAttempts} attempt${json.remainingAttempts !== 1 ? 's' : ''} left.`
            : json.message || 'Invalid email, school code, or password.'
        );
        return;
      }

      const roleCode = String(json.role || '').toUpperCase();
      if (roleCode !== 'SCHOOL_ADMIN' && roleCode !== 'SCHOOL_MANAGER') {
        try {
          await fetch(`${API}/api/session/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });
        } catch { /* ignore */ }
        notify(
          'This page is for school managers only. Teachers and other staff should use Staff login.',
          'error'
        );
        return;
      }

      if (rememberMe) {
        localStorage.setItem(
          SM_LOGIN_PREFS_KEY,
          JSON.stringify({
            remember: true,
            email,
            schoolCode: schoolCodeTrim,
          })
        );
      } else {
        localStorage.removeItem(SM_LOGIN_PREFS_KEY);
      }

      const sessionUser = await auth.login();
      notify('Welcome! Redirecting…', 'success');
      setAttempts(0);
      const rc = String(json.role || '').toUpperCase();
      if (sessionUser && shouldUseProApp(sessionUser) && rc) {
        const proUrl = getProEntryUrl(rc);
        if (proUrl) {
          setTimeout(() => window.location.replace(proUrl), 400);
          return;
        }
      }
      setTimeout(() => navigate(DASHBOARD_SM, { replace: true }), 600);
    } catch (err) {
      console.error('School manager login error:', err);
      notify('Cannot reach server. Check that the API is running.');
    } finally {
      setUi((p) => ({ ...p, loading: false }));
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Montserrat', sans-serif", background: '#0B1D3A' }}>
      <style>{`
        @keyframes smSpin{to{transform:rotate(360deg)}} .sm-spin{animation:smSpin .8s linear infinite;display:inline-flex}
        .sm-left{display:none}
        @media(min-width:1024px){.sm-left{display:flex;width:50%;min-height:100vh}}
        .sm-left-inner{
          width:100%;
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          padding:2rem 2.25rem 1.25rem;
          background:
            radial-gradient(850px 400px at 10% 0%, rgba(59,130,246,.24), transparent 56%),
            radial-gradient(480px 280px at 15% 65%, rgba(251,191,36,.12), transparent 64%),
            linear-gradient(180deg, rgba(5,20,50,0.96) 0%, rgba(11,29,58,0.92) 100%);
        }
        .sm-brand{width:100%;max-width:30rem;object-fit:contain;filter:drop-shadow(0 22px 70px rgba(59,130,246,.35)) drop-shadow(0 10px 26px rgba(251,191,36,.18))}
        .sm-line{margin-top:.9rem;width:5.5rem;height:2px;background:linear-gradient(90deg,#fbbf24,transparent);border-radius:999px}
        .sm-hero{
          margin-top:1.25rem;width:100%;flex:1;display:flex;align-items:flex-end;justify-content:center;
          border:none;border-radius:0;background:transparent;
          backdrop-filter:none;overflow:hidden;box-shadow:none;
        }
        .sm-hero img{width:min(90%,540px);max-height:72vh;object-fit:contain;object-position:bottom center;filter:drop-shadow(0 24px 50px rgba(0,0,0,.28))}
        .sm-right{width:100%;display:flex;flex-direction:column}
        @media(min-width:1024px){.sm-right{width:50%}}
      `}</style>
      <div className="sm-left">
        <div className="sm-left-inner">
          <img src={loginLogo} alt="Babyeyi Shulemanager" className="sm-brand" />
          <div className="sm-line" />
          <div className="sm-hero"><img src={loginDecor} alt="" /></div>
          <div className="w-full text-center py-4 text-[11px] text-white/45">© 2026 Edupoto and Iconic Innovatorz · All rights reserved.</div>
        </div>
      </div>

      <div className="sm-right">
      <header className="shrink-0 px-4 sm:px-6 py-4 flex items-center justify-between border-b border-white/10">
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-amber-300 transition-colors"
        >
          <ArrowLeft size={16} /> {backLabel}
        </Link>
        <Link to={staffLoginHref} className="text-xs sm:text-sm font-semibold text-amber-400/90 hover:text-amber-300">
          Staff &amp; accountant login
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, #FBBF24, #F59E0B)' }}>
              <GraduationCap size={28} color="#1F2937" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">School Manager login</h1>
            <p className="text-sm text-white/50 mt-2 leading-relaxed">
              Use the email and password you received after registration, plus your school’s code so you only access your school’s dashboard.
            </p>
          </div>

          <div
            className="rounded-3xl p-6 sm:p-8 border shadow-2xl"
            style={{
              background: 'rgba(6,22,59,0.88)',
              borderColor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {ui.error && (
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{ui.error}</span>
              </div>
            )}
            {ui.success && (
              <div className="flex items-start gap-2 p-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <span>{ui.success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[0.72rem] font-semibold uppercase tracking-wider text-white/55 mb-1.5" htmlFor="sm-email">
                  Manager email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="sm-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    disabled={ui.loading}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full pl-10 pr-3 py-3 rounded-xl text-white text-sm outline-none border transition-colors"
                    style={{ background: 'rgba(248,248,248,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                    placeholder="manager@school.rw"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.72rem] font-semibold uppercase tracking-wider text-white/55 mb-1.5" htmlFor="sm-code">
                  School code <span className="text-amber-400/90 normal-case font-bold">(required)</span>
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="sm-code"
                    type="text"
                    autoComplete="off"
                    value={form.schoolCode}
                    disabled={ui.loading}
                    onChange={(e) => setForm((p) => ({ ...p, schoolCode: e.target.value.toUpperCase() }))}
                    className="w-full pl-10 pr-3 py-3 rounded-xl text-white text-sm font-mono tracking-wider outline-none border transition-colors"
                    style={{ background: 'rgba(248,248,248,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                    placeholder="e.g. 04001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.72rem] font-semibold uppercase tracking-wider text-white/55 mb-1.5" htmlFor="sm-password">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="sm-password"
                    type={ui.showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    disabled={ui.loading}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-white text-sm outline-none border transition-colors"
                    style={{ background: 'rgba(248,248,248,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-white"
                    onClick={() => setUi((p) => ({ ...p, showPassword: !p.showPassword }))}
                  >
                    {ui.showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={ui.loading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/30 bg-white/5 accent-amber-400"
                />
                Remember me on this device
              </label>

              <button
                type="submit"
                disabled={ui.loading || locked}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(29,78,216,0.35)',
                }}
              >
                {ui.loading ? (
                  <>
                    <Loader2 size={18} className="sm-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    <LogIn size={18} /> Sign in to your school dashboard
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-xs text-white/35 mt-6">
              Need to register your school?{' '}
              <Link to="/register" className="text-amber-400 hover:underline font-semibold">
                Register your school
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
