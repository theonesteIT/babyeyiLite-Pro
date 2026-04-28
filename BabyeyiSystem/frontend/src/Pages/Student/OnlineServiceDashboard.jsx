import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export default function OnlineServiceDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!auth.loading && (!auth.isLoggedIn || String(auth.role || '').toUpperCase() !== 'STUDENT')) {
      navigate('/online-service', { replace: true });
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, navigate]);

  const doLogout = async () => {
    await auth.logout();
    navigate('/online-service', { replace: true });
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/online-service/change-password`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.message || 'Failed to change password');
        return;
      }
      setSuccess('Password changed successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await auth.refresh();
    } catch {
      setError('Cannot reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const user = auth.user || {};
  const mustChange = !!user?.force_password_change;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '1rem' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ background: '#000435', color: '#fff', borderRadius: 20, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCircle2 size={28} color="#fbbf24" />
            <div>
              <p style={{ margin: 0, fontWeight: 900 }}>Welcome, {user.full_name || 'Student'}</p>
              <p style={{ margin: 0, opacity: 0.9, fontSize: 12 }}>
                {user?.school?.name || 'School'} • Code: {user.student_code || user.student_uid || '-'}
              </p>
            </div>
          </div>
          <button type="button" onClick={doLogout} style={{ border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: '#fff', borderRadius: 10, minHeight: 38, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div style={{ marginTop: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#eef2ff', color: '#1e3a8a', display: 'grid', placeItems: 'center' }}>
              <KeyRound size={16} />
            </div>
            <div>
              <p style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Change Password</p>
              <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>Keep your account secure</p>
            </div>
          </div>

          {mustChange ? (
            <div style={{ marginBottom: 10, borderRadius: 10, padding: '8px 10px', background: '#fef3c7', color: '#92400e', fontSize: 13 }}>
              First login detected. Please set your own private password now.
            </div>
          ) : null}
          {error ? <div style={{ marginBottom: 10, borderRadius: 10, padding: '8px 10px', background: '#fee2e2', color: '#991b1b', fontSize: 13 }}>{error}</div> : null}
          {success ? <div style={{ marginBottom: 10, borderRadius: 10, padding: '8px 10px', background: '#dcfce7', color: '#166534', fontSize: 13 }}>{success}</div> : null}

          <form onSubmit={changePassword} style={{ display: 'grid', gap: 9 }}>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))}
              placeholder={mustChange ? 'Current password (optional on first change)' : 'Current password'}
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, minHeight: 40, padding: '8px 10px', fontSize: 14 }}
            />
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="New password (min 8 characters)"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, minHeight: 40, padding: '8px 10px', fontSize: 14 }}
            />
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="Confirm new password"
              style={{ border: '1px solid #cbd5e1', borderRadius: 10, minHeight: 40, padding: '8px 10px', fontSize: 14 }}
            />
            <button type="submit" disabled={loading} style={{ border: 'none', borderRadius: 11, minHeight: 42, background: '#000435', color: '#fff', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
