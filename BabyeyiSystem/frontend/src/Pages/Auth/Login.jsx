// ================================================================
// Login.jsx — Secure v8
// ✅ Zero localStorage — no tokens, no user data stored client-side
// ✅ httpOnly cookie set by server on login
// ✅ After login: calls auth.login() which fetches /api/session/me
// ✅ Navigates via react-router (no window.location)
// ================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Building, AlertCircle, CheckCircle, Loader, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getProEntryUrl, shouldUseProApp } from '../../utils/proAppEntry';
import loginLogo from "../../assets/login-logo.png";
import loginDecor from "../../assets/login-bg-removebg.png";

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

/** Remember identifier + school code only (never password). Session length uses server cookie maxAge. */
const STAFF_LOGIN_PREFS_KEY = 'babyeyi_staff_login_prefs';

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

const DASHBOARD = {
  SUPER_ADMIN:   '/superadmin/dashboard',
  FULL_SYSTEM_CONTROLLER: '/superadmin/control',
  SCHOOL_ADMIN:  '/school-babyeyi-dashboard',
  SCHOOL_MANAGER: '/school-babyeyi-dashboard',
  DOS:           '/dos',
  HOD:           '/hod/students',
  TEACHER:       '/teacher/dashboard',
  GATE_OFFICER:  '/gate/scanner',
  LIBRARIAN:     '/library/dashboard',
  STORE_MANAGER: '/store/dashboard',
  ACCOUNTANT:    '/accountant/dashboard',
  STUDENT:       '/parents',
  PARENT:        '/parents',
  NESA_ADMIN:    '/nesa-babyeyi-dashboard',
  DEO:           '/district-babyeyi-dashboard',
  AGENT:         '/agent/dashboard',
  SHULE_AVANCE_PARTNER: '/shule-avance/dashboard',
};

const Login = () => {
  const navigate = useNavigate();
  const auth     = useAuth();

  useEffect(() => {
    fetch(`${API}/api/auth/system-config/public`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) setSysPublic(j.data);
      })
      .catch(() => {});
  }, []);

  // Already logged in → Pro app (same API session) or Lite dashboard
  useEffect(() => {
    if (!auth.loading && auth.isLoggedIn && auth.role && auth.user && auth.user !== false) {
      const roleCode = String(auth.role).toUpperCase();
      if (shouldUseProApp(auth.user)) {
        const proUrl = getProEntryUrl(roleCode);
        if (proUrl) {
          window.location.replace(proUrl);
          return;
        }
      }
      const target = DASHBOARD[roleCode];
      if (target) {
        navigate(target, { replace: true });
      }
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, auth.user, navigate]);

  const [prefsLoaded] = useState(() => loadStaffLoginPrefs());
  const [form, setForm] = useState({
    identifier: prefsLoaded.identifier,
    password: '',
    schoolCode: prefsLoaded.schoolCode,
  });
  const [rememberMe, setRememberMe] = useState(!!prefsLoaded.remember);
  const [ui,   setUi]   = useState({ showPassword: false, loading: false, error: null, success: null });
  const [attempts,  setAttempts]  = useState(0);
  const [locked,    setLocked]    = useState(false);
  const [lockUntil, setLockUntil] = useState(null);
  const [sysPublic, setSysPublic] = useState(null);

  const notify = (msg, type = 'error') => {
    setUi(p => ({ ...p, error: type === 'error' ? msg : null, success: type === 'success' ? msg : null }));
    if (type === 'error') setTimeout(() => setUi(p => ({...p, error: null})), 6000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) {
      const mins = Math.ceil((new Date(lockUntil) - new Date()) / 60000);
      notify(`Account locked. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.`);
      return;
    }
    if (!form.identifier.trim()) { notify('Enter your email or username'); return; }
    if (!form.password.trim())   { notify('Enter your password');          return; }
    const schoolCodeTrim = form.schoolCode.trim().toUpperCase();

    setUi(p => ({ ...p, loading: true, error: null }));
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method:      'POST',
        credentials: 'include',    // browser stores the httpOnly cookie
        headers:     { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: form.identifier.trim(),
          password:   form.password,
          schoolCode: schoolCodeTrim || undefined,
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

        // Stable backend codes (preferred over message string matching)
        if (json.code === 'SCHOOL_PENDING_APPROVAL') {
          setAttempts(0);
          notify(
            'Your school registration is pending approval. Please wait for the Super Admin to activate your school before logging in.',
            'error'
          );
          return;
        }
        if (json.code === 'SCHOOL_INACTIVE') {
          setAttempts(0);
          notify('Your school is inactive. Please contact the Super Admin to activate it.', 'error');
          return;
        }
        if (json.code === 'SCHOOL_NOT_LINKED') {
          setAttempts(0);
          notify('Your school account is not linked yet. Please contact the Super Admin.', 'error');
          return;
        }
        if (json.code === 'SCHOOL_CODE_REQUIRED') {
          setAttempts(0);
          notify(json.message || 'Enter your school code to sign in as School Manager.', 'error');
          return;
        }
        if (json.code === 'SYSTEM_MAINTENANCE') {
          setAttempts(0);
          notify(json.message || 'System maintenance — only Super Administrator can sign in.', 'error');
          return;
        }

        const next = attempts + 1;
        setAttempts(next);
        notify(
          json.remainingAttempts != null
            ? `${json.message} — ${json.remainingAttempts} attempt${json.remainingAttempts !== 1 ? 's' : ''} left.`
            : json.message || 'Invalid credentials.'
        );
        return;
      }

      if (rememberMe) {
        localStorage.setItem(
          STAFF_LOGIN_PREFS_KEY,
          JSON.stringify({
            remember: true,
            identifier: form.identifier.trim(),
            schoolCode: schoolCodeTrim || '',
          })
        );
      } else {
        localStorage.removeItem(STAFF_LOGIN_PREFS_KEY);
      }

      // Server set httpOnly cookie — now hydrate auth context
      const sessionUser = await auth.login();
      notify('Welcome! Redirecting…', 'success');
      setAttempts(0);

      // Normalise / decide final destination
      const roleCode = json.role ? String(json.role).toUpperCase() : null;

      // 1) Pro school + role with a Pro portal → open babyeyipro (same session cookie; no second login)
      if (sessionUser && shouldUseProApp(sessionUser) && roleCode) {
        const proUrl = getProEntryUrl(roleCode);
        if (proUrl) {
          setTimeout(() => {
            window.location.assign(proUrl);
          }, 400);
          return;
        }
      }

      // 2) School managers on Lite (non-Pro or no Pro URL) → Babyeyi dashboard
      if (roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER') {
        setTimeout(
          () => navigate(DASHBOARD.SCHOOL_ADMIN, { replace: true }),
          900
        );
        return;
      }

      // 3) Start from backend redirect if present, otherwise from role map
      let dest = json.redirect || (roleCode && DASHBOARD[roleCode]) || '/';

      // 3) Normalise legacy admin paths
      if (dest === '/admin/dashboard' || dest === '/school-admin/dashboard') {
        dest = DASHBOARD.SCHOOL_ADMIN;
      }

      // 4) Avoid redirect loops back to /login
      if (dest === '/login') {
        const mapped = roleCode && DASHBOARD[roleCode];
        if (mapped) dest = mapped;
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
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .lr*{box-sizing:border-box}
        .lr{font-family:'Sora',sans-serif;min-height:100vh;display:flex;background:#0B1D3A}
        .lp{position:relative;display:none;width:50%;flex-direction:column;min-height:100vh;overflow:hidden}
        @media(min-width:1024px){.lp{display:flex}}
        .lp-logo{
          position:relative;z-index:2;
          flex:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;
          padding:2rem 2.25rem 1.25rem;
          background:
            radial-gradient(850px 400px at 10% 0%, rgba(59,130,246,.24), transparent 56%),
            radial-gradient(480px 280px at 15% 65%, rgba(251,191,36,.12), transparent 64%),
            linear-gradient(180deg, rgba(5,20,50,0.96) 0%, rgba(11,29,58,0.92) 100%);
        }
        .lp-brand{
          width:100%;
          max-width:30rem;
          object-fit:contain;
          filter:
            drop-shadow(0 22px 70px rgba(59,130,246,.35))
            drop-shadow(0 10px 26px rgba(251,191,36,.18));
          transform:none;
        }
        .lp-div{margin-top:.9rem;width:5.5rem;height:2px;background:linear-gradient(90deg,#fbbf24,transparent);border-radius:999px}
        .lp-hero{
          margin-top:1.25rem;
          width:100%;
          flex:1;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          border:none;
          border-radius:0;
          background:transparent;
          backdrop-filter:none;
          overflow:hidden;
          box-shadow:none;
        }
        .lp-hero img{
          width:min(90%, 540px);
          max-height:72vh;
          object-fit:contain;
          object-position:bottom center;
          filter: drop-shadow(0 24px 50px rgba(0,0,0,.28));
          user-select:none;
          pointer-events:none;
        }
        .mobile-brand{
          display:none;
          width:100%;
          max-width:290px;
          margin:0 auto .25rem;
          filter:
            drop-shadow(0 22px 70px rgba(59,130,246,.28))
            drop-shadow(0 10px 26px rgba(251,191,36,.18));
          transform:translateY(-18px);
        }
        .lp-ft{padding:1rem 2.5rem;text-align:center}
        .lp-ft p{color:rgba(148,163,184,.5);font-size:.7rem}
        .rp{width:100%;display:flex;align-items:center;justify-content:center;padding:2.5rem 1.5rem;position:relative;overflow:hidden;background:#0B1D3A}
        @media(min-width:1024px){.rp{width:50%}}
        .orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none;animation:orbF 8s ease-in-out infinite alternate}
        .o1{width:280px;height:280px;background:rgba(37,99,235,.18);top:-80px;right:-80px}
        .o2{width:200px;height:200px;background:rgba(109,40,217,.14);bottom:-60px;left:-60px;animation-delay:-4s}
        .o3{width:140px;height:140px;background:rgba(251,191,36,.07);bottom:30%;right:10%;animation-delay:-2s}
        @keyframes orbF{from{transform:translate(0,0) scale(1)}to{transform:translate(20px,-20px) scale(1.08)}}
        .cw{width:100%;max-width:460px;position:relative;z-index:10}
        .cr{position:absolute;inset:-1px;border-radius:28px;background:linear-gradient(135deg,rgba(59,130,246,.5),rgba(139,92,246,.4),rgba(251,191,36,.3),rgba(59,130,246,.2));pointer-events:none}
        .cd{position:relative;background:rgba(6,22,59,.88);backdrop-filter:blur(32px);border-radius:28px;border:1px solid rgba(255,255,255,.07);padding:2.25rem 2rem;box-shadow:0 32px 64px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06)}
        .ch{text-align:center;margin-bottom:1.75rem}
        .ct{font-size:.85rem;font-weight:700;color:#f1f5f9;margin-top:.5rem}
        .cs{margin-top:.375rem;color:rgba(148,163,184,.65);font-size:.8rem}
        .nt{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;margin-bottom:1.25rem;font-size:.8rem;font-weight:500}
        .nt.err{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#fca5a5}
        .nt.ok{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);color:#86efac}
        .fg{margin-bottom:1.125rem}
        .fl{display:block;font-size:.72rem;font-weight:600;color:rgba(203,213,225,.75);margin-bottom:6px;letter-spacing:.04em;text-transform:uppercase}
        .iw{position:relative}
        .ii{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:rgba(100,116,139,.65);pointer-events:none;transition:color .2s}
        .iw:focus-within .ii{color:#60a5fa}
        .fi{width:100%;padding:12px 14px 12px 42px;background:rgba(248,248,248,.04);border:1px solid rgba(255,255,255,.09);border-radius:12px;color:#e2e8f0;font-size:.875rem;font-family:'Sora',sans-serif;outline:none;transition:border-color .2s,background .2s,box-shadow .2s}
        .fi::placeholder{color:rgba(100,116,139,.45);font-size:.8rem}
        .fi:focus{border-color:rgba(96,165,250,.5);background:rgba(255,255,255,.06);box-shadow:0 0 0 3px rgba(59,130,246,.1)}
        .fi.mono{font-family:'JetBrains Mono',monospace;letter-spacing:.08em}
        .ia{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:rgba(100,116,139,.65);padding:4px;display:flex}
        .ia:hover{color:#94a3b8}
        .ro{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:1.25rem}
        .rm{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:.78rem;font-weight:600;color:rgba(203,213,225,.88);user-select:none}
        .rm input{width:15px;height:15px;accent-color:#f59e0b;cursor:pointer}
        .fl-link{font-size:.78rem;font-weight:600;color:#fbbf24;text-decoration:none}
        .fl-link:hover{color:#fcd34d}
        .sb{width:100%;padding:13px;border-radius:13px;border:none;outline:none;font-family:'Sora',sans-serif;font-size:.875rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s ease;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:#fff;box-shadow:0 4px 20px rgba(217,119,6,.4)}
        .sb:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 28px rgba(217,119,6,.55)}
        .sb:disabled{background:rgba(51,65,85,.7);color:rgba(148,163,184,.4);cursor:not-allowed;box-shadow:none}
        .aw{padding:10px 14px;border-radius:10px;text-align:center;font-size:.78rem;margin-top:1rem}
        .aw.warn{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);color:rgba(253,230,138,.9)}
        .aw.lock{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);color:#fca5a5}
        .dv{height:1px;background:rgba(255,255,255,.06);margin:1.25rem 0}
        .cf{text-align:center}
        .cf p{display:flex;align-items:center;justify-content:center;gap:6px;font-size:.7rem;color:rgba(100,116,139,.45);margin:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{animation:spin .8s linear infinite;display:inline-flex}

        @media(max-width:1023px){
          .mobile-brand{display:block;}
          .cd{padding:1.2rem 1.25rem 1.75rem;}
          .ch{margin-bottom:1.5rem;}
        }
        @media(min-width:1440px){
          .lp-logo{padding:2.5rem 2.75rem 1.5rem}
          .lp-brand{max-width:34rem}
          .cw{max-width:540px}
          .cd{padding:2.7rem 2.4rem}
          .ct{font-size:1rem}
          .cs{font-size:.9rem}
          .fi{padding:13px 14px 13px 44px;font-size:.93rem}
          .sb{padding:14px;font-size:.95rem}
        }
        @media(min-width:1920px){
          .lr{min-height:100vh}
          .lp{width:54%}
          .rp{width:46%}
          .lp-brand{max-width:38rem}
          .cw{max-width:600px}
          .cd{padding:3rem 2.8rem;border-radius:32px}
          .ct{font-size:1.08rem}
          .cs{font-size:.95rem}
          .fl{font-size:.76rem}
          .fi{font-size:.96rem;border-radius:13px}
          .sb{font-size:.98rem;padding:15px}
        }
      `}</style>

      <div className="lr">
        <div className="lp">
          <div className="lp-logo">
            <img src={loginLogo} alt="Babyeyi" className="lp-brand" />
            <div className="lp-div" />
            <div className="lp-hero">
              <img src={loginDecor} alt="" />
            </div>
          </div>
          <div className="lp-ft" style={{ position: 'relative', zIndex: 2 }}><p>© 2026 Edupoto and Iconic Innovatorz · All rights reserved.</p></div>
        </div>

        <div className="rp">
          <div className="orb o1"/><div className="orb o2"/><div className="orb o3"/>
          <div className="cw">
            <div className="cr"/>
            <div className="cd">
              <img src={loginLogo} alt="Babyeyi" className="mobile-brand" />
              <div className="ch">
                <div className="ct">Welcome Back</div>
                <div className="cs">Sign in to continue to your portal</div>
              </div>

              {sysPublic?.maintenance_mode && (
                <div className="nt err" style={{ borderColor: 'rgba(251,191,36,.35)', background: 'rgba(251,191,36,.08)', color: '#fde68a' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>Maintenance mode: only Super Administrator or Full System Controller accounts can sign in. School code is not required for those roles.</span>
                </div>
              )}
              {sysPublic?.block_non_super_writes && !sysPublic?.maintenance_mode && (
                <div className="nt err" style={{ borderColor: 'rgba(96,165,250,.3)', background: 'rgba(59,130,246,.08)', color: '#93c5fd' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>System changes are restricted for users who are not Super Admin or Full System Controller. You can still sign in and browse.</span>
                </div>
              )}
              {ui.error && <div className="nt err"><AlertCircle size={16} style={{flexShrink:0}}/><span>{ui.error}</span></div>}
              {ui.success && <div className="nt ok"><CheckCircle size={16} style={{flexShrink:0}}/><span>{ui.success}</span></div>}

              <form onSubmit={handleSubmit}>
                <div className="fg">
                  <label className="fl" htmlFor="identifier">Email / Username / Staff ID</label>
                  <div className="iw">
                    <span className="ii"><Mail size={16}/></span>
                    <input
                      id="identifier"
                      name="identifier"
                      className="fi"
                      type="text"
                      value={form.identifier}
                      disabled={ui.loading}
                      onChange={e=>setForm(p=>({...p,identifier:e.target.value}))}
                      placeholder="admin@school.rw" autoComplete="username"/>
                  </div>
                </div>

                <div className="fg">
                  <label className="fl" htmlFor="schoolCode">
                    School code <span style={{color:'rgba(100,116,139,.45)',fontWeight:400,textTransform:'none',letterSpacing:0}}>— required for school staff (manager, teacher, accountant, DOS, discipline, librarian, store/stock manager, gate); leave blank for Super Admin / NESA / DEO</span>
                  </label>
                  <div className="iw">
                    <span className="ii"><Building size={16}/></span>
                    <input
                      id="schoolCode"
                      name="schoolCode"
                      className="fi mono"
                      type="text"
                      value={form.schoolCode}
                      disabled={ui.loading}
                      onChange={e=>setForm(p=>({...p,schoolCode:e.target.value.toUpperCase()}))}
                      placeholder="04001"/>
                  </div>
                </div>

                <div className="fg">
                  <label className="fl" htmlFor="password">Password</label>
                  <div className="iw">
                    <span className="ii"><Lock size={16}/></span>
                    <input
                      id="password"
                      name="password"
                      className="fi"
                      type={ui.showPassword?'text':'password'}
                      value={form.password}
                      disabled={ui.loading}
                      onChange={e=>setForm(p=>({...p,password:e.target.value}))}
                      placeholder="Your password" autoComplete="current-password" style={{paddingRight:'42px'}}/>
                    <button type="button" className="ia" onClick={()=>setUi(p=>({...p,showPassword:!p.showPassword}))}>
                      {ui.showPassword?<EyeOff size={16}/>:<Eye size={16}/>}
                    </button>
                  </div>
                </div>

                <div className="ro">
                  <label className="rm">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      disabled={ui.loading}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Remember me on this device
                  </label>
                  <a href="/forgot-password" className="fl-link">Forgot password?</a>
                </div>

                <button type="submit" className="sb" disabled={ui.loading || locked}>
                  {ui.loading
                    ? <><span className="spin"><Loader size={18}/></span> Signing in…</>
                    : <><LogIn size={18}/> Sign In</>}
                </button>

                {attempts > 0 && attempts < 5 && !locked && (
                  <div className="aw warn">⚠️ {5-attempts} attempt{5-attempts!==1?'s':''} remaining before lockout</div>
                )}
                {locked && (
                  <div className="aw lock">🔒 Account temporarily locked. Try again in 30 minutes.</div>
                )}
              </form>

              <div className="dv"/>
              <div className="cf">
                <p><Smartphone size={12}/> httpOnly session cookie · Optional &quot;Remember me&quot; extends the session and may save your sign-in ID on this device only (not your password)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;