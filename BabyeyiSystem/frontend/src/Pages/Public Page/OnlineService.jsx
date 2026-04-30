import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

/* ─── Inline styles ─────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:   #000435;
    --navy-2: #00073d;
    --navy-3: rgba(0,4,53,0.92);
    --amber:  #FFBF00;
    --amber2: #e6ab00;
    --amber3: rgba(255,191,0,0.14);
    --white:  #ffffff;
    --off:    #f0f4ff;
    --muted:  rgba(0,4,53,0.45);
    --border: rgba(0,4,53,0.12);
    --font:   'Sora', system-ui, sans-serif;
    --mono:   'DM Mono', monospace;
  }

  .os-root {
    min-height: 100vh;
    display: flex;
    font-family: var(--font);
    background: var(--off);
    overflow: hidden;
  }

  /* ══ LEFT PANEL ══ */
  .os-left {
    display: none;
    position: relative;
    flex: 1;
    background: var(--navy);
    overflow: hidden;
  }

  @media (min-width: 900px) { .os-left { display: flex; flex-direction: column; } }

  /* Geometric pattern overlay */
  .os-left-pattern {
    position: absolute;
    inset: 0;
    background-image:
      repeating-linear-gradient(45deg, rgba(255,191,0,0.03) 0px, rgba(255,191,0,0.03) 1px, transparent 1px, transparent 40px),
      repeating-linear-gradient(-45deg, rgba(255,191,0,0.03) 0px, rgba(255,191,0,0.03) 1px, transparent 1px, transparent 40px);
    pointer-events: none;
  }

  /* Bottom amber gradient sweep */
  .os-left-glow {
    position: absolute;
    bottom: -120px; left: -120px;
    width: 520px; height: 520px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,191,0,0.22) 0%, transparent 65%);
    pointer-events: none;
  }
  .os-left-glow2 {
    position: absolute;
    top: -80px; right: -80px;
    width: 340px; height: 340px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,191,0,0.1) 0%, transparent 65%);
    pointer-events: none;
  }

  /* Logo at top */
  .os-left-logo {
    position: relative;
    z-index: 2;
    padding: 46px 40px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .os-left-logo-img {
    width: 84px;
    height: 84px;
    object-fit: contain;
    border-radius: 16px;
    background: rgba(255,255,255,0.06);
    padding: 7px;
  }
  .os-left-logo-text {
    font-size: 36px;
    font-weight: 800;
    color: var(--white);
    letter-spacing: -0.8px;
    line-height: 1.05;
  }
  .os-left-logo-sub {
    font-size: 13px;
    color: rgba(255,191,0,0.75);
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    margin-top: 3px;
  }

  /* Bottom caption */
  .os-left-caption {
    position: relative;
    z-index: 2;
    flex: 1;
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    padding: 24px 40px 56px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .os-left-caption-title {
    font-size: 44px;
    font-weight: 800;
    color: var(--white);
    line-height: 1.2;
    margin-bottom: 14px;
    letter-spacing: -0.7px;
  }
  .os-left-caption-title span {
    color: var(--amber);
  }
  .os-left-caption-sub {
    font-size: 19px;
    color: rgba(255,255,255,0.74);
    line-height: 1.7;
    max-width: 560px;
  }

  /* Dots row */
  .os-dots {
    display: flex;
    gap: 7px;
    margin-top: 18px;
  }
  .os-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    transition: background 0.3s;
  }
  .os-dot.active { background: var(--amber); width: 22px; border-radius: 4px; }

  /* ══ RIGHT PANEL ══ */
  .os-right {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 20px;
    background: var(--white);
    position: relative;
    overflow: hidden;
  }

  @media (min-width: 900px) {
    .os-right {
      width: 460px;
      min-width: 420px;
      flex-shrink: 0;
    }
  }

  /* Subtle top-right navy arc */
  .os-right-arc {
    position: absolute;
    top: -100px; right: -100px;
    width: 280px; height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,4,53,0.06) 0%, transparent 70%);
    pointer-events: none;
  }
  .os-right-arc2 {
    position: absolute;
    bottom: -80px; left: -80px;
    width: 240px; height: 240px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,191,0,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .os-form-wrap {
    width: 100%;
    max-width: 380px;
    position: relative;
    z-index: 1;
    animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Mobile-only logo */
  .os-mobile-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 32px;
  }
  @media (min-width: 900px) { .os-mobile-logo { display: none; } }

  .os-mobile-logo-img {
    width: 40px; height: 40px;
    object-fit: contain;
    border-radius: 10px;
    background: var(--navy);
    padding: 4px;
  }
  .os-mobile-logo-name {
    font-size: 16px;
    font-weight: 800;
    color: var(--navy);
  }

  /* Header text */
  .os-form-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255,191,0,0.12);
    border: 1px solid rgba(255,191,0,0.35);
    border-radius: 50px;
    padding: 5px 13px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #8a6400;
    margin-bottom: 18px;
  }
  .os-form-eyebrow-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--amber);
    box-shadow: 0 0 0 3px rgba(255,191,0,0.25);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 3px rgba(255,191,0,0.25); }
    50%      { box-shadow: 0 0 0 6px rgba(255,191,0,0.1); }
  }

  .os-form-title {
    font-size: 28px;
    font-weight: 800;
    color: var(--navy);
    letter-spacing: -0.6px;
    line-height: 1.2;
    margin-bottom: 6px;
  }
  .os-form-title span { color: var(--amber2); }
  .os-form-sub {
    font-size: 13px;
    color: var(--muted);
    line-height: 1.65;
    margin-bottom: 30px;
  }

  /* Alerts */
  .os-alert {
    border-radius: 12px;
    padding: 11px 14px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 16px;
    display: flex;
    align-items: flex-start;
    gap: 9px;
    animation: fadeIn 0.25s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; } }
  .os-alert-error   { background: #fff1f2; color: #991b1b; border: 1px solid #fecaca; }
  .os-alert-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }

  /* Field */
  .os-field { margin-bottom: 18px; }
  .os-label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: var(--navy);
    margin-bottom: 7px;
  }
  .os-input-wrap { position: relative; }
  .os-input-icon {
    position: absolute;
    left: 13px; top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
    display: flex;
  }
  .os-input {
    width: 100%;
    border: 1.5px solid var(--border);
    border-radius: 13px;
    height: 48px;
    padding: 0 14px 0 42px;
    font-size: 14.5px;
    font-family: var(--font);
    color: var(--navy);
    background: var(--off);
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  }
  .os-input::placeholder { color: rgba(0,4,53,0.3); }
  .os-input:focus {
    border-color: var(--amber);
    background: var(--white);
    box-shadow: 0 0 0 4px rgba(255,191,0,0.14);
  }
  .os-input:disabled { opacity: 0.55; cursor: not-allowed; }

  .os-input-mono { font-family: var(--mono); letter-spacing: 0.5px; }

  .os-eye-btn {
    position: absolute;
    right: 12px; top: 50%;
    transform: translateY(-50%);
    border: none;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    display: flex;
    padding: 4px;
    border-radius: 8px;
    transition: color 0.2s, background 0.2s;
  }
  .os-eye-btn:hover { color: var(--navy); background: rgba(0,4,53,0.06); }

  /* Hint row */
  .os-hint {
    margin-top: 6px;
    font-size: 11px;
    color: var(--muted);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .os-hint-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    background: var(--amber);
    flex-shrink: 0;
  }

  /* Submit button */
  .os-submit {
    width: 100%;
    height: 50px;
    border-radius: 13px;
    border: none;
    background: var(--navy);
    color: var(--white);
    font-family: var(--font);
    font-size: 14.5px;
    font-weight: 800;
    letter-spacing: 0.2px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    margin-top: 6px;
    box-shadow: 0 8px 24px rgba(0,4,53,0.2);
  }
  .os-submit::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255,191,0,0.12) 100%);
    transition: opacity 0.3s;
    opacity: 0;
  }
  .os-submit:hover:not(:disabled)::before { opacity: 1; }
  .os-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 32px rgba(0,4,53,0.28); }
  .os-submit:active:not(:disabled) { transform: translateY(0); }
  .os-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  /* Loading spinner in button */
  .os-spinner {
    width: 18px; height: 18px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Divider */
  .os-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 22px 0 20px;
  }
  .os-divider-line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .os-divider-text {
    font-size: 10.5px;
    font-weight: 600;
    color: rgba(0,4,53,0.35);
    letter-spacing: 0.5px;
    white-space: nowrap;
  }

  /* Info pills */
  .os-info-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .os-info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 13px;
    border-radius: 11px;
    background: var(--off);
    border: 1px solid var(--border);
  }
  .os-info-bullet {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--amber);
    flex-shrink: 0;
  }
  .os-info-text {
    font-size: 12px;
    color: rgba(0,4,53,0.65);
    line-height: 1.4;
  }

  /* Footer links */
  .os-footer-links {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 22px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .os-back-link {
    font-size: 12px;
    font-weight: 700;
    color: var(--navy);
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: opacity 0.2s;
  }
  .os-back-link:hover { opacity: 0.65; }
  .os-help-text {
    font-size: 11.5px;
    color: var(--muted);
  }

  /* Verified stamp */
  .os-stamp {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 24px;
    padding: 10px 14px;
    border-radius: 11px;
    background: rgba(0,4,53,0.04);
    border: 1px solid rgba(0,4,53,0.07);
  }
  .os-stamp-icon { color: #16a34a; flex-shrink: 0; }
  .os-stamp-text {
    font-size: 11px;
    color: rgba(0,4,53,0.5);
    line-height: 1.5;
  }
  .os-stamp-text strong { color: var(--navy); }
`;

export default function OnlineService() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ studentCode: '', password: '' });

  useEffect(() => {
    if (!auth.loading && auth.isLoggedIn && String(auth.role || '').toUpperCase() === 'STUDENT') {
      navigate('/online-service/dashboard', { replace: true });
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.studentCode.trim() || !form.password.trim()) {
      setError('Both student code and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/online-service/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentCode: form.studentCode.trim(), password: form.password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || 'Login failed. Check your credentials and try again.');
        return;
      }
      await auth.login();
      setSuccess('Welcome back! Redirecting to your dashboard…');
      setTimeout(() => navigate('/online-service/dashboard', { replace: true }), 500);
    } catch {
      setError('Cannot reach server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  /* Base path for assets */
  const base = (typeof import.meta !== 'undefined'
    ? String(import.meta.env?.BASE_URL || '/')
    : '/').replace(/\/?$/, '/');

  const babyeyiLogoSrc = `${base}1BABYEYI LOGO FINAL.png`;

  return (
    <>
      <style>{CSS}</style>
      <div className="os-root">

        {/* ══ LEFT — image panel ══ */}
        <div className="os-left">

          {/* Logo */}
          <div className="os-left-logo">
            <img
              src={babyeyiLogoSrc}
              alt="Babyeyi"
              className="os-left-logo-img"
            />
            <div>
              <div className="os-left-logo-text">Babyeyi</div>
              <div className="os-left-logo-sub">School Management System</div>
            </div>
          </div>

          {/* Caption */}
          <div className="os-left-caption">
            <div className="os-left-caption-title">
              Your academic life,<br /><span>all in one place.</span>
            </div>
            <div className="os-left-caption-sub">
              Track fees, attendance, marks, and connect with teachers — directly from your student portal.
            </div>
            <div className="os-dots">
              <div className="os-dot active" />
              <div className="os-dot" />
              <div className="os-dot" />
            </div>
          </div>
        </div>

        {/* ══ RIGHT — login form ══ */}
        <div className="os-right">
          <div className="os-right-arc" />
          <div className="os-right-arc2" />

          <div className="os-form-wrap">

            {/* Mobile-only logo */}
            <div className="os-mobile-logo">
              <img
                src={babyeyiLogoSrc}
                alt="Babyeyi"
                className="os-mobile-logo-img"
              />
              <div className="os-mobile-logo-name">Babyeyi</div>
            </div>

            {/* Eyebrow */}
            <div className="os-form-eyebrow">
              <span className="os-form-eyebrow-dot" />
              Student Portal
            </div>

            {/* Heading */}
            <h1 className="os-form-title">
              Welcome<br /><span>back.</span>
            </h1>
            <p className="os-form-sub">
              Sign in with your student code to access your personal academic dashboard.
            </p>

            {/* Alerts */}
            {error && (
              <div className="os-alert os-alert-error">
                <span>⚠</span> {error}
              </div>
            )}
            {success && (
              <div className="os-alert os-alert-success">
                <span>✓</span> {success}
              </div>
            )}

            {/* Form */}
            <form onSubmit={submit} autoComplete="on">
              {/* Student Code */}
              <div className="os-field">
                <label className="os-label" htmlFor="os-code">Student Code</label>
                <div className="os-input-wrap">
                  <span className="os-input-icon"><KeyRound size={16} /></span>
                  <input
                    id="os-code"
                    type="text"
                    autoComplete="username"
                    value={form.studentCode}
                    onChange={e => setForm(p => ({ ...p, studentCode: e.target.value }))}
                    placeholder="e.g. 010010001"
                    disabled={loading}
                    className="os-input os-input-mono"
                  />
                </div>
                <div className="os-hint">
                  <span className="os-hint-dot" />
                  Use the exact code from your school records or ID card
                </div>
              </div>

              {/* Password */}
              <div className="os-field">
                <label className="os-label" htmlFor="os-pass">Password</label>
                <div className="os-input-wrap">
                  <span className="os-input-icon"><Lock size={16} /></span>
                  <input
                    id="os-pass"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Default: your school name"
                    disabled={loading}
                    className="os-input"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="os-eye-btn"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <div className="os-hint">
                  <span className="os-hint-dot" />
                  First-time login? Default password is your school's name
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading} className="os-submit">
                {loading ? (
                  <><div className="os-spinner" /> Signing in…</>
                ) : (
                  <>Continue to Dashboard <ArrowRight size={17} /></>
                )}
              </button>
            </form>

            {/* Divider + info */}
            <div className="os-divider">
              <div className="os-divider-line" />
              <span className="os-divider-text">Quick tips</span>
              <div className="os-divider-line" />
            </div>

            <div className="os-info-list">
              {[
                'Change your password after first login for security.',
                'Your student code is printed on your ID card.',
              ].map(text => (
                <div key={text} className="os-info-item">
                  <span className="os-info-bullet" />
                  <span className="os-info-text">{text}</span>
                </div>
              ))}
            </div>

            {/* Footer links */}
            <div className="os-footer-links">
              <Link to="/" className="os-back-link">
                ← Back to Home
              </Link>
              <span className="os-help-text">Need help? Contact school office</span>
            </div>

            {/* Verified stamp */}
            <div className="os-stamp">
              <ShieldCheck size={18} className="os-stamp-icon" />
              <p className="os-stamp-text">
                <strong>Secure & Encrypted</strong> — Babyeyi Rwanda School Management System. Your data is protected.
              </p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}