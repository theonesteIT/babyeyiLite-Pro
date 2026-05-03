import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, AlertCircle, RefreshCw, ChevronRight, Shield } from 'lucide-react';

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

const Login = () => {
  const [prefs] = useState(() => loadStaffLoginPrefs());
  const [identifier, setIdentifier] = useState(prefs.identifier);
  const schoolCode = '';
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!prefs.remember);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, teacher, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && teacher) navigate('/', { replace: true });
  }, [teacher, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(identifier, password, { schoolCode, rememberMe });
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100svh', background: '#000435', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw style={{ color: 'rgba(255,255,255,0.85)', width: 32, height: 32, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blobDrift {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(40px, 25px) scale(1.1); }
        }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          50%       { opacity: 0.7; transform: scale(0.85); box-shadow: 0 0 0 5px rgba(245,158,11,0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Root layout ── */
        .lp-root {
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          background: #000435;
          font-family: 'Montserrat', sans-serif;
        }
        @media (min-width: 920px) {
          .lp-root { flex-direction: row; }
        }

        /* ── LEFT PANEL ── */
        .lp-left {
          display: block;
          width: 100%;
          height: 260px;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
          background: #000435;
        }
        @media (min-width: 920px) {
          .lp-left {
            display: flex;
            flex-direction: column;
            width: 52%;
            height: auto;
          }
        }

        /* Ambient blobs — left panel only */
        .lp-blob {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(90px);
        }
        .lp-blob-a {
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%);
          top: -100px; left: -80px;
          animation: blobDrift 14s ease-in-out infinite alternate;
        }
        .lp-blob-b {
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%);
          bottom: -60px; right: 20px;
          animation: blobDrift 18s ease-in-out infinite alternate-reverse;
        }
        .lp-blob-c {
          width: 160px; height: 160px;
          background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
          top: 45%; left: 55%;
          animation: blobDrift 22s ease-in-out infinite alternate;
        }

        /* Teacher image */
        .lp-img-wrap {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .lp-img-wrap img {
          width: 100%; height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
          transition: transform 8s ease;
        }
        .lp-left:hover .lp-img-wrap img {
          transform: scale(1.04);
        }
        /* Overlays to keep text readable */
        .lp-img-overlay-1 {
          position: absolute; inset: 0; z-index: 2;
          background: linear-gradient(180deg, rgba(0,4,53,0.45) 0%, rgba(0,4,53,0.1) 40%, rgba(0,4,53,0.75) 100%);
        }
        .lp-img-overlay-2 {
          position: absolute; inset: 0; z-index: 2;
          background: linear-gradient(90deg, rgba(0,4,53,0.15) 0%, rgba(0,4,53,0.05) 60%, rgba(0,4,53,0.0) 100%);
        }

        /* Top-left secure pill */
        .lp-pill {
          position: absolute;
          top: 32px; left: 36px;
          z-index: 10;
          display: flex; align-items: center; gap: 8px;
          background: rgba(0,4,53,0.55);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(245,158,11,0.25);
          border-radius: 100px;
          padding: 7px 16px;
          color: rgba(255,255,255,0.9);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.14em;
          
        }
        .lp-pill-dot {
          width: 7px; height: 7px;
          background: #F59E0B;
          border-radius: 50%;
          animation: pulseDot 2.2s ease-in-out infinite;
        }

        /* Bottom branding block */
        .lp-brand {
          position: absolute;
          bottom: 44px; left: 40px; right: 40px;
          z-index: 10;
          color: #fff;
        }
        .lp-brand-tag {
          display: flex; align-items: center; gap: 10px;
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.38em;
         
          color: #F59E0B;
          margin-bottom: 12px;
        }
        .lp-brand-tag::before {
          content: '';
          display: block;
          width: 24px; height: 2px;
          background: #F59E0B;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .lp-brand-name {
          font-family: 'Montserrat', sans-serif;
          font-size: clamp(48px, 5.5vw, 72px);
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin-bottom: 14px;
        }
        .lp-brand-desc {
          font-size: 14px;
          font-weight: 400;
          color: rgba(255,255,255,0.68);
          line-height: 1.6;
          max-width: 300px;
        }
        .lp-brand-desc b {
          color: #F59E0B;
          font-weight: 600;
        }

        /* Mobile: left hero shows only the empowering line (hide pill, headings, bottom caption strip) */
        @media (max-width: 919px) {
          .lp-pill { display: none !important; }
          .lp-brand-tag,
          .lp-brand-name { display: none !important; }
          .lp-mobile-caption { display: none !important; }
          .lp-brand {
            bottom: 28px;
            left: 22px;
            right: 22px;
            text-align: center;
          }
          .lp-brand-desc {
            max-width: none;
            margin-left: auto;
            margin-right: auto;
            font-size: 13px;
            font-weight: 500;
            color: rgba(255,255,255,0.92);
          }
        }

        /* Decorative dots grid */
        .lp-dots {
          position: absolute;
          top: 50px; right: 36px;
          z-index: 3;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 8px;
          opacity: 0.18;
        }
        .lp-dot {
          width: 3px; height: 3px;
          background: #F59E0B;
          border-radius: 50%;
        }

        /* ── RIGHT PANEL ── */
        .lp-right {
          flex: 1;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 22px 36px;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 920px) {
          .lp-right {
            padding: 52px 60px;
            min-height: 100svh;
          }
        }

        /* Subtle right-panel decorative accent — top-right corner */
        .lp-right-accent {
          position: absolute;
          top: -60px; right: -60px;
          width: 220px; height: 220px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-right-accent-2 {
          position: absolute;
          bottom: -40px; left: -40px;
          width: 160px; height: 160px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,4,53,0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .lp-form-wrap {
          width: 100%;
          max-width: 400px;
          animation: fadeSlideUp 0.5s ease both;
        }

        /* Mobile-only: top brand bar — hidden on desktop */
        .lp-mobile-top {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
        }
        @media (min-width: 920px) {
          .lp-mobile-top { display: none; }
        }

        /* Mobile image bottom caption */
        .lp-mobile-caption {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          z-index: 10;
          padding: 12px 20px 14px;
          background: linear-gradient(to top, rgba(0,4,53,0.92) 0%, transparent 100%);
          display: flex; align-items: center; justify-content: space-between;
        }
        @media (min-width: 920px) {
          .lp-mobile-caption { display: none; }
        }
        .lp-mobile-caption-left {
          display: flex; flex-direction: column; gap: 1px;
        }
        .lp-mobile-caption-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 18px; font-weight: 800;
          color: #fff; letter-spacing: -0.02em; line-height: 1;
        }
        .lp-mobile-caption-sub {
          font-size: 10px; font-weight: 600;
          color: #F59E0B; letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .lp-mobile-caption-pill {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 100px;
          padding: 5px 12px;
          font-size: 9px; font-weight: 700;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .lp-mobile-pill {
          display: flex; align-items: center; gap: 6px;
          background: #000435;
          border-radius: 100px;
          padding: 5px 14px 5px 10px;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .lp-mobile-pill-dot {
          width: 6px; height: 6px;
          background: #F59E0B;
          border-radius: 50%;
          animation: pulseDot 2s ease-in-out infinite;
        }

        /* Logo section */
        .lp-logo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 32px;
        }
        .lp-logo-ring {
          width: 88px; height: 88px;
          border-radius: 24px;
          background: #000435;
          border: 2px solid rgba(255,255,255,0.14);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          animation: logoFloat 4s ease-in-out infinite;
          box-shadow:
            0 12px 36px rgba(0, 4, 53, 0.45),
            0 4px 12px rgba(0, 0, 0, 0.12),
            inset 0 1px 0 rgba(255,255,255,0.06);
          position: relative;
        }
        .lp-logo-ring img {
          width: 62px; height: 62px;
          max-width: calc(100% - 12px);
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.35));
        }
        .lp-logo-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 32px;
          font-weight: 800;
          color: #000435;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .lp-logo-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 6px;
          background: rgba(0,4,53,0.08);
          border: 1px solid rgba(0,4,53,0.12);
          border-radius: 100px;
          padding: 3px 12px;
          font-family: 'Montserrat', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.16em;
         
          color: #000435;
        }
        .lp-logo-badge span {
          width: 5px; height: 5px;
          background: #000435;
          border-radius: 50%;
          display: inline-block;
        }
        .lp-logo-tagline {
          margin-top: 8px;
          font-size: 15px;
          color: #6B7280;
          font-weight: 400;
        }

        /* Thin divider */
        .lp-sep {
          width: 100%;
          height: 1px;
          background: linear-gradient(to right, transparent, #E5E7EB, transparent);
          margin-bottom: 28px;
        }

        /* Section heading */
        .lp-heading {
          font-family: 'Montserrat', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .lp-subheading {
          font-size: 15px;
          color: #9CA3AF;
          margin-bottom: 24px;
        }

        /* Error */
        .lp-error {
          display: flex; align-items: center; gap: 8px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          color: #DC2626;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 18px;
          animation: shake 0.35s ease;
        }

        /* Field */
        .lp-field { margin-bottom: 16px; }
        .lp-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .lp-input-wrap {
          display: flex; align-items: center;
          background: #F9FAFB;
          border: 1.5px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .lp-input-wrap:focus-within {
          border-color: #F59E0B;
          background: #FFFBEB;
          box-shadow: 0 0 0 3px rgba(245,158,11,0.12);
        }
        .lp-input-icon {
          width: 42px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          color: #D1D5DB;
          transition: color 0.2s;
        }
        .lp-input-wrap:focus-within .lp-input-icon {
          color: #F59E0B;
        }
        .lp-input {
          flex: 1;
          background: transparent;
          border: none; outline: none;
          color: #111827;
          font-size: 13.5px;
          font-family: 'Montserrat', sans-serif;
          font-weight: 400;
          padding: 13px 0;
        }
        .lp-input::placeholder { color: #C9CDD5; }
        .lp-input-btn {
          width: 42px;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none;
          cursor: pointer;
          color: #D1D5DB;
          transition: color 0.2s;
          padding: 0; flex-shrink: 0;
        }
        .lp-input-btn:hover { color: #F59E0B; }

        /* Row */
        .lp-row {
          display: flex; align-items: center;
          justify-content: space-between;
          margin: 18px 0 22px; gap: 12px;
        }
        .lp-remember {
          display: flex; align-items: center;
          gap: 8px; cursor: pointer; user-select: none;
        }
        .lp-remember input[type="checkbox"] {
          width: 15px; height: 15px;
          accent-color: #F59E0B;
          cursor: pointer;
        }
        .lp-remember span {
          font-size: 12.5px; color: #6B7280;
        }
        .lp-forgot {
          background: none; border: none;
          cursor: pointer;
          font-size: 12.5px;
          color: #F59E0B;
          font-family: 'Montserrat', sans-serif;
          font-weight: 600; padding: 0;
          white-space: nowrap;
          transition: opacity 0.2s;
        }
        .lp-forgot:hover { opacity: 0.7; }

        /* Submit */
        .lp-submit {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 14px 20px;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: #fff;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #000435 0%, #001580 100%);
          box-shadow: 0 4px 20px rgba(0,4,53,0.28), 0 1px 4px rgba(0,4,53,0.15);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          position: relative; overflow: hidden;
        }
        .lp-submit::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
          pointer-events: none;
        }
        /* Amber accent bar at bottom of button */
        .lp-submit::before {
          content: '';
          position: absolute;
          bottom: 0; left: 20%; right: 20%;
          height: 2px;
          background: #F59E0B;
          border-radius: 2px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .lp-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(0,4,53,0.35), 0 2px 8px rgba(0,4,53,0.2);
        }
        .lp-submit:hover:not(:disabled)::before { opacity: 1; }
        .lp-submit:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: 0 3px 14px rgba(0,4,53,0.22);
        }
        .lp-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .lp-arrow { transition: transform 0.2s; }
        .lp-submit:hover:not(:disabled) .lp-arrow { transform: translateX(4px); }

        /* Footer */
        .lp-footer {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #F3F4F6;
          text-align: center;
          color: #C9CDD5;
          font-size: 11px;
        }

        /* Trust badges row */
        .lp-trust {
          display: flex; align-items: center; justify-content: center;
          gap: 16px;
          margin-top: 18px;
        }
        .lp-trust-item {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px;
          color: #C9CDD5;
          font-weight: 500;
          letter-spacing: 0.04em;
        }
        .lp-trust-item svg {
          color: #D1D5DB;
        }
      `}</style>

      <div className="lp-root">

        {/* ══ LEFT — dark navy with image ══ */}
        <div className="lp-left">
          <div className="lp-blob lp-blob-a" />
          <div className="lp-blob lp-blob-b" />
          <div className="lp-blob lp-blob-c" />

          {/* Decorative dots */}
          <div className="lp-dots">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="lp-dot" />
            ))}
          </div>

          {/* Teacher image */}
          <div className="lp-img-wrap">
            <img src="/teacher.png" alt="Shule Teacher" />
            <div className="lp-img-overlay-1" />
            <div className="lp-img-overlay-2" />
          </div>

          {/* Top pill */}
          <div className="lp-pill">
            <span className="lp-pill-dot" />
            ShuleTicha · Secure
          </div>

          {/* Bottom branding — desktop only */}
          <div className="lp-brand">
            <div className="lp-brand-tag">Educators' Workspace</div>
            <div className="lp-brand-name">Babyeyi</div>
            <p className="lp-brand-desc">
              Empowering <b>Teachers</b> with smarter classroom tools built for Rwanda.
            </p>
          </div>

          {/* Mobile bottom caption strip */}
          <div className="lp-mobile-caption">
            <div className="lp-mobile-caption-left">
              <div className="lp-mobile-caption-title">Babyeyi</div>
              <div className="lp-mobile-caption-sub">ShuleTicha</div>
            </div>
            <div className="lp-mobile-caption-pill">
              <span className="lp-pill-dot" style={{ width: 5, height: 5 }} />
              Secure Portal
            </div>
          </div>
        </div>

        {/* ══ RIGHT — clean white form ══ */}
        <div className="lp-right">
          <div className="lp-right-accent" />
          <div className="lp-right-accent-2" />

          <div className="lp-form-wrap">

            {/* Mobile brand pill */}
         

            {/* Logo */}
            <div className="lp-logo-section">
              <div className="lp-logo-ring">
                <img src="/babyeyilogo.png" alt="Babyeyi" />
              </div>
              <div className="lp-logo-title">Babyeyi</div>
              <div className="lp-logo-badge">
                <span />
                ShuleTicha
              </div>
              <div className="lp-logo-tagline">Teacher sign-in portal</div>
            </div>

            <div className="lp-sep" />

            <div className="lp-heading">Welcome back</div>
            <div className="lp-subheading">Sign in to your teacher account to continue</div>

            {/* Error */}
            {error && (
              <div className="lp-error">
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="lp-field">
                <label className="lp-label">Email or Username</label>
                <div className="lp-input-wrap">
                  <span className="lp-input-icon"><Mail size={15} /></span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="Enter your email..."
                    className="lp-input"
                    required
                  />
                </div>
              </div>

              <div className="lp-field">
                <label className="lp-label">Password</label>
                <div className="lp-input-wrap">
                  <span className="lp-input-icon"><Lock size={15} /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password..."
                    className="lp-input"
                    required
                  />
                  <button
                    type="button"
                    className="lp-input-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="lp-row">
                <label className="lp-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="lp-forgot">Forgot Password?</button>
              </div>

              <button type="submit" disabled={loading} className="lp-submit">
                {loading ? (
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <>
                    Sign In
                    <ChevronRight size={16} className="lp-arrow" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="lp-footer">
              © 2026 Babyeyi Systems
              <div className="lp-trust">
                <span className="lp-trust-item">
                  <Shield size={10} />
                  SSL Encrypted
                </span>
                <span style={{ color: '#E5E7EB' }}>·</span>
                <span className="lp-trust-item">Secure Sign-in</span>
                <span style={{ color: '#E5E7EB' }}>·</span>
                <span className="lp-trust-item">Rwanda 🇷🇼</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Login;