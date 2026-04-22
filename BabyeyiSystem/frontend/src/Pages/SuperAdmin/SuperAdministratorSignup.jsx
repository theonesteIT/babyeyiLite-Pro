// ================================================================
// SuperAdministratorSignup — first Super Admin only (email + password for /login)
// If an account already exists, directs users to /login or System Control.
// ================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Mail, Lock, Eye, EyeOff, Loader, CheckCircle, AlertCircle,
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export default function SuperAdministratorSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [publicCfg, setPublicCfg] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/auth/system-config/public`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.data) setPublicCfg(j.data);
      })
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/signup-super-admin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Signup failed');
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const inp =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/30';

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'linear-gradient(165deg, #0B1D3A 0%, #0f2744 50%, #0B1D3A 100%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 ring-1 ring-amber-400/30">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Administrator signup</h1>
          <p className="mt-2 text-sm text-slate-400">
            Set the email and password you will use on the main{' '}
            <Link to="/login" className="text-amber-400 underline hover:text-amber-300">
              login
            </Link>{' '}
            page.
          </p>
        </div>

        {publicCfg?.maintenance_mode && (
          <div className="mb-4 flex gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Maintenance mode may be on — only Super Admins can sign in after setup.
          </div>
        )}

        {success ? (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
            <p className="font-semibold text-emerald-100">Account created. Redirecting to login…</p>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl"
          >
            {error && (
              <div className="flex gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className={`${inp} pl-10`}
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  First name
                </label>
                <input
                  className={inp}
                  required
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Last name
                </label>
                <input
                  className={inp}
                  required
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Phone (optional)
              </label>
              <input
                className={inp}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className={`${inp} pl-10 pr-11`}
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Confirm password
              </label>
              <input
                className={inp}
                type={showPw ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-slate-900 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Super Admin & go to login'
              )}
            </button>

            <p className="text-center text-[11px] text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-amber-400 underline">
                Sign in
              </Link>
              {' · '}
              <Link to="/signup/super-controller" className="text-amber-400/80 underline">
                Full System Controller signup
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
