import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, GraduationCap, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

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
      setError('Student code and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/online-service/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: form.studentCode.trim(),
          password: form.password,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || 'Login failed');
        return;
      }
      await auth.login();
      setSuccess('Login successful. Redirecting...');
      setTimeout(() => navigate('/online-service/dashboard', { replace: true }), 450);
    } catch {
      setError('Cannot reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#000435 0%,#0a2f89 55%,#0b4cb7 100%)', padding: '1.25rem' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 18, alignItems: 'stretch' }}>
        <section style={{ color: '#fff', border: '1px solid rgba(255,255,255,.15)', borderRadius: 24, padding: '1.4rem 1.2rem', background: 'rgba(2,8,35,.35)', backdropFilter: 'blur(8px)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid rgba(251,191,36,.5)', color: '#fbbf24', padding: '6px 11px', fontWeight: 700, fontSize: 12 }}>
            <ShieldCheck size={14} /> Secure Student Access
          </div>
          <h1 style={{ margin: '1rem 0 .55rem', fontSize: 'clamp(1.5rem,4vw,2.3rem)', lineHeight: 1.15 }}>OnlineService</h1>
          <p style={{ margin: 0, color: 'rgba(241,245,249,.9)', lineHeight: 1.7 }}>
            Students sign in using their <b>Student Code</b>. Default password is your <b>School Name</b>.
            For safety, change your password immediately after first login.
          </p>
          <div style={{ marginTop: '1rem', display: 'grid', gap: 9 }}>
            {[
              'Use exact student code from school records',
              'First-time default password: school name',
              'Password change available in student dashboard',
            ].map((item) => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e2e8f0', fontSize: 14 }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: '#fbbf24', flexShrink: 0 }} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={{ borderRadius: 24, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.94)', padding: '1.3rem', boxShadow: '0 30px 70px rgba(0,0,0,.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: '#000435', color: '#fbbf24', display: 'grid', placeItems: 'center' }}>
              <GraduationCap size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: 17 }}>Student Login</p>
              <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>Modern and secure</p>
            </div>
          </div>

          {error ? <div style={{ marginBottom: 10, borderRadius: 10, padding: '8px 10px', background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>{error}</div> : null}
          {success ? <div style={{ marginBottom: 10, borderRadius: 10, padding: '8px 10px', background: '#dcfce7', color: '#166534', fontSize: 13 }}>{success}</div> : null}

          <form onSubmit={submit}>
            <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 5 }}>Student Code</label>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <KeyRound size={15} style={{ position: 'absolute', left: 11, top: 12, color: '#64748b' }} />
              <input
                type="text"
                value={form.studentCode}
                onChange={(e) => setForm((p) => ({ ...p, studentCode: e.target.value }))}
                placeholder="Example: 010010001"
                disabled={loading}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 11, minHeight: 40, padding: '8px 10px 8px 36px', fontSize: 14 }}
              />
            </div>

            <label style={{ display: 'block', fontSize: 12, color: '#334155', fontWeight: 700, marginBottom: 5 }}>Password</label>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Lock size={15} style={{ position: 'absolute', left: 11, top: 12, color: '#64748b' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Default: your school name"
                disabled={loading}
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: 11, minHeight: 40, padding: '8px 40px 8px 36px', fontSize: 14 }}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={{ position: 'absolute', right: 8, top: 8, border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', minHeight: 42, borderRadius: 11, border: 'none', background: '#000435', color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Signing in...' : 'Continue to Dashboard'}
            </button>
          </form>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
            <Link to="/" style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>Back to Home</Link>
            <span style={{ color: '#64748b' }}>Need help? Contact school office</span>
          </div>
        </section>
      </div>
    </div>
  );
}
