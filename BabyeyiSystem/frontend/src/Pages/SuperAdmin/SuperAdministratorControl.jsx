// ================================================================
// SuperAdministratorControl — Full System Controller dashboard (/superadmin/control)
// ================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Power, Lock, Unlock, Users, UserPlus, RefreshCw,
  AlertTriangle, CheckCircle, Loader2, Building2, Layers, DollarSign, FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../Auth/LogoutButton';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;

const ax = (path, opts = {}) =>
  fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });

export default function SuperAdministratorControl() {
  const auth = useAuth();
  const { refresh, logout } = auth;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [cfg, setCfg] = useState(null);
  const [msg, setMsg] = useState({ type: null, text: '' });

  const [newSa, setNewSa] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [newFsc, setNewFsc] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  const [superAdmins, setSuperAdmins] = useState([]);
  const [saListLoading, setSaListLoading] = useState(false);
  const [saToggleId, setSaToggleId] = useState(null);

  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchDraft, setUserSearchDraft] = useState('');
  const [platformUsers, setPlatformUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const usersLimit = 30;
  const [usersLoading, setUsersLoading] = useState(false);
  const [userToggleId, setUserToggleId] = useState(null);

  const toast = (text, type = 'ok') => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: null, text: '' }), 6000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ax('/auth/system-config');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load');
      setCfg(json.data);
    } catch (e) {
      toast(e.message || 'Load failed', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuperAdmins = useCallback(async () => {
    setSaListLoading(true);
    try {
      const res = await ax('/auth/super-admins/list');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load Super Admins');
      setSuperAdmins(json.data || []);
    } catch (e) {
      toast(e.message || 'Could not load Super Admin list', 'err');
    } finally {
      setSaListLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(userPage),
        limit: String(usersLimit),
        search: userSearch,
      });
      const res = await ax(`/auth/platform-users?${q.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load users');
      setPlatformUsers(json.data || []);
      setUserTotal(Number(json.total) || 0);
    } catch (e) {
      toast(e.message || 'Could not load users', 'err');
    } finally {
      setUsersLoading(false);
    }
  }, [userPage, userSearch, usersLimit]);

  const myUserId = auth.user?.id != null ? Number(auth.user.id) : null;

  const setPlatformUserActive = async (row, nextActive) => {
    if (!nextActive && Number(row.id) === myUserId) {
      toast('You cannot deactivate your own account.', 'err');
      return;
    }
    setUserToggleId(row.id);
    try {
      const res = await ax(`/auth/platform-users/${row.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: nextActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Update failed');
      toast(json.message || 'Updated.');
      await loadUsers();
      await load();
      await loadSuperAdmins();
      if (!nextActive && Number(row.id) === myUserId) {
        await logout();
        window.location.href = '/login';
      } else {
        await refresh?.();
      }
    } catch (e) {
      toast(e.message || 'Could not update user', 'err');
    } finally {
      setUserToggleId(null);
    }
  };

  const setSuperAdminActive = async (row, nextActive) => {
    if (!nextActive && Number(row.id) === myUserId) {
      toast('You cannot deactivate your own account here.', 'err');
      return;
    }
    setSaToggleId(row.id);
    try {
      const res = await ax(`/auth/super-admins/${row.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: nextActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Update failed');
      toast(json.message || 'Updated.');
      await loadSuperAdmins();
      await load();
      await refresh?.();
    } catch (e) {
      toast(e.message || 'Could not update account', 'err');
    } finally {
      setSaToggleId(null);
    }
  };

  useEffect(() => {
    if (!auth.loading && auth.isLoggedIn && auth.role === 'FULL_SYSTEM_CONTROLLER') {
      load();
      loadSuperAdmins();
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, load, loadSuperAdmins]);

  useEffect(() => {
    if (!auth.loading && auth.isLoggedIn && auth.role === 'FULL_SYSTEM_CONTROLLER') {
      loadUsers();
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, loadUsers]);

  const patchConfig = async (partial) => {
    setSaving(true);
    try {
      const res = await ax('/auth/system-config', {
        method: 'PUT',
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Update failed');
      setCfg((c) => (c ? { ...c, ...json.data } : json.data));
      toast('Settings saved.');
    } catch (e) {
      toast(e.message || 'Save failed', 'err');
    } finally {
      setSaving(false);
    }
  };

  const bulk = async (which) => {
    setBulkBusy(true);
    try {
      const path =
        which === 'disable'
          ? '/auth/platform-users/bulk-disable-non-controller'
          : '/auth/platform-users/bulk-enable-non-controller';
      const res = await ax(path, { method: 'POST', body: '{}' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Request failed');
      toast(json.message || 'Done.');
      await load();
      await loadSuperAdmins();
      await loadUsers();
    } catch (e) {
      toast(e.message || 'Bulk action failed', 'err');
    } finally {
      setBulkBusy(false);
    }
  };

  const createSa = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await ax('/auth/create-super-admin', {
        method: 'POST',
        body: JSON.stringify({
          email: newSa.email.trim().toLowerCase(),
          password: newSa.password,
          first_name: newSa.first_name.trim(),
          last_name: newSa.last_name.trim(),
          phone: newSa.phone.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed');
      toast(json.message || 'Super Admin created.');
      setNewSa({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
      });
      await load();
      await loadSuperAdmins();
      await loadUsers();
    } catch (e) {
      toast(e.message || 'Could not create account', 'err');
    } finally {
      setSaving(false);
    }
  };

  const createFsc = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await ax('/auth/create-full-system-controller', {
        method: 'POST',
        body: JSON.stringify({
          email: newFsc.email.trim().toLowerCase(),
          password: newFsc.password,
          first_name: newFsc.first_name.trim(),
          last_name: newFsc.last_name.trim(),
          phone: newFsc.phone.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed');
      toast(json.message || 'Full System Controller created.');
      setNewFsc({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
      });
      await load();
      await loadSuperAdmins();
      await loadUsers();
    } catch (e) {
      toast(e.message || 'Could not create account', 'err');
    } finally {
      setSaving(false);
    }
  };

  const applyUserSearch = () => {
    setUserSearch(userSearchDraft.trim());
    setUserPage(1);
  };

  const userTotalPages = Math.max(1, Math.ceil(userTotal / usersLimit));

  if (auth.loading || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0B1D3A', fontFamily: 'Sora, system-ui, sans-serif' }}
      >
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
      </div>
    );
  }

  const inp =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-1 focus:ring-amber-400/30';

  return (
    <div
      className="min-h-screen text-slate-100"
      style={{
        background: 'linear-gradient(165deg, #0B1D3A 0%, #0f2744 45%, #0B1D3A 100%)',
        fontFamily: 'Sora, system-ui, sans-serif',
      }}
    >
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-violet-400" />
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">Full System Controller</h1>
                <p className="text-[11px] text-slate-400">
                  <code className="text-violet-300">/superadmin/control</code> — users, Super Admins, and
                  system-wide settings
                </p>
              </div>
            </div>
            <LogoutButton />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/add-school"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
            >
              <Building2 className="h-3.5 w-3.5" />
              Register school
            </Link>
            <Link
              to="/add-all-schools"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
            >
              <Layers className="h-3.5 w-3.5" />
              Quick add school
            </Link>
            <Link
              to="/manage-requirements-prices"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
            >
              <DollarSign className="h-3.5 w-3.5" />
              Set prices
            </Link>
            <Link
              to="/requirement-prices-list"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/10"
            >
              <FileText className="h-3.5 w-3.5" />
              Prices list
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {msg.text && (
          <div
            className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
              msg.type === 'err'
                ? 'border-red-400/40 bg-red-500/10 text-red-200'
                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
            }`}
          >
            {msg.type === 'err' ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Non–elevated users (active / total)
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {cfg ? `${cfg.non_super_user_active} / ${cfg.non_super_user_total}` : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Super Admin / FSC
            </p>
            <p className="mt-2 text-lg font-bold leading-snug text-white">
              {cfg
                ? `SA ${cfg.super_admin_count ?? 0} · FSC ${cfg.full_system_controller_count ?? 0}`
                : '—'}
            </p>
          </div>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                load();
                loadSuperAdmins();
                loadUsers();
              }}
              disabled={saving || bulkBusy}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh all
            </button>
          </div>
        </div>

        {/* Global switches */}
        <section className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-amber-100">
            <Power className="h-5 w-5 text-amber-400" />
            System mode
          </h2>
          <p className="mb-6 text-xs text-slate-400">
            Maintenance stops users who are not Super Admin or Full System Controller from signing in
            (existing sessions are cleared). “Lock writes” blocks POST/PUT/PATCH/DELETE on the API for
            everyone except those two roles.
          </p>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10"
                checked={!!cfg?.maintenance_mode}
                disabled={saving || !cfg}
                onChange={(e) => patchConfig({ maintenance_mode: e.target.checked })}
              />
              <div>
                <span className="font-semibold text-white">Maintenance mode</span>
                <p className="mt-1 text-xs text-slate-400">
                  Only Super Admin and Full System Controller accounts can log in. Everyone else sees
                  an error after a valid password check.
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10"
                checked={!!cfg?.block_non_super_writes}
                disabled={saving || !cfg}
                onChange={(e) => patchConfig({ block_non_super_writes: e.target.checked })}
              />
              <div>
                <span className="font-semibold text-white">Disable system actions (non–elevated)</span>
                <p className="mt-1 text-xs text-slate-400">
                  Blocks changing data over the API for all roles except Super Admin and Full System
                  Controller (GET requests still work).
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Bulk: everyone except Full System Controllers */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-white">
            <Users className="h-5 w-5 text-slate-300" />
            Bulk enable / disable (mass)
          </h2>
          <p className="mb-6 text-xs text-slate-400">
            Affects <strong className="text-slate-200">every</strong> user except accounts with the Full
            System Controller role — including Super Admins, school staff, parents, and students. Your
            controller sessions stay active. Use the tables below for one-by-one changes.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={bulkBusy || saving}
              onClick={() => bulk('disable')}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              <Lock className="h-4 w-4" />
              Disable all except controllers
            </button>
            <button
              type="button"
              disabled={bulkBusy || saving}
              onClick={() => bulk('enable')}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-600/20 px-4 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-600/30 disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" />
              Enable all except controllers
            </button>
          </div>
        </section>

        {/* All users — search & per-row enable/disable */}
        <section className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-violet-100">
                <Users className="h-5 w-5 text-violet-300" />
                All users
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {userTotal} user{userTotal !== 1 ? 's' : ''} total · page {userPage} of {userTotalPages}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Search email, name, role…"
                value={userSearchDraft}
                onChange={(e) => setUserSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyUserSearch()}
                className="w-52 min-w-[10rem] rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={applyUserSearch}
                className="rounded-xl border border-violet-400/40 bg-violet-600/30 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-600/45"
              >
                Search
              </button>
            </div>
          </div>
          {usersLoading && platformUsers.length === 0 ? (
            <p className="text-sm text-slate-400">Loading users…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {platformUsers.map((row) => {
                    const isSelf = Number(row.id) === myUserId;
                    const busy = userToggleId === row.id;
                    return (
                      <tr key={row.id} className="border-b border-white/5 text-slate-200">
                        <td className="px-3 py-2 font-mono text-xs">{row.email}</td>
                        <td className="px-3 py-2">
                          {row.first_name} {row.last_name}
                          {isSelf && (
                            <span className="ml-2 rounded-md bg-violet-500/25 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">
                              You
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-400">{row.role_code}</td>
                        <td className="px-3 py-2">
                          {row.is_active ? (
                            <span className="text-emerald-400">Active</span>
                          ) : (
                            <span className="text-red-400">Disabled</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.is_active ? (
                            <button
                              type="button"
                              disabled={busy || isSelf}
                              onClick={() => setPlatformUserActive(row, false)}
                              className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              title={isSelf ? 'Cannot disable yourself' : 'Disable'}
                            >
                              {busy ? '…' : 'Disable'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setPlatformUserActive(row, true)}
                              className="rounded-lg border border-emerald-500/40 bg-emerald-600/25 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-600/40 disabled:opacity-50"
                            >
                              {busy ? '…' : 'Enable'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={userPage <= 1 || usersLoading}
              onClick={() => setUserPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
            >
              Previous page
            </button>
            <button
              type="button"
              disabled={userPage >= userTotalPages || usersLoading}
              onClick={() => setUserPage((p) => p + 1)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-40"
            >
              Next page
            </button>
          </div>
        </section>

        {/* Super Admin accounts — enable / disable individually */}
        <section className="rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-white">
                <Shield className="h-5 w-5 text-amber-400" />
                Super Administrator accounts
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-slate-400">
                Super Admins use <code className="text-amber-200/90">/superadmin/dashboard</code>. Enable or
                disable each account here (you are not listed — you are a controller).
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadSuperAdmins()}
              disabled={saListLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${saListLoading ? 'animate-spin' : ''}`} />
              Refresh list
            </button>
          </div>
          {saListLoading && superAdmins.length === 0 ? (
            <p className="text-sm text-slate-400">Loading list…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-black/20 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {superAdmins.map((row) => {
                    const isSelf = Number(row.id) === myUserId;
                    const busy = saToggleId === row.id;
                    return (
                      <tr key={row.id} className="border-b border-white/5 text-slate-200">
                        <td className="px-3 py-2 font-mono text-xs">{row.email}</td>
                        <td className="px-3 py-2">
                          {row.first_name} {row.last_name}
                          {isSelf && (
                            <span className="ml-2 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              You
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {row.is_active ? (
                            <span className="text-emerald-400">Active</span>
                          ) : (
                            <span className="text-red-400">Disabled</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.is_active ? (
                            <button
                              type="button"
                              disabled={busy || isSelf}
                              onClick={() => setSuperAdminActive(row, false)}
                              className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                              title={isSelf ? 'Cannot disable your own account here' : 'Disable login'}
                            >
                              {busy ? '…' : 'Disable'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setSuperAdminActive(row, true)}
                              className="rounded-lg border border-emerald-500/40 bg-emerald-600/25 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-600/40 disabled:opacity-50"
                            >
                              {busy ? '…' : 'Enable'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!saListLoading && superAdmins.length === 0 && (
            <p className="text-sm text-slate-500">No Super Administrator accounts found.</p>
          )}
        </section>

        {/* Create another Super Admin */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-white">
            <UserPlus className="h-5 w-5 text-slate-300" />
            Add Super Administrator
          </h2>
          <p className="mb-6 text-xs text-slate-400">
            Creates another account with the same role. They sign in on{' '}
            <Link className="text-amber-400 underline hover:text-amber-300" to="/login">
              /login
            </Link>{' '}
            with the email and password you set here.
          </p>
          <form onSubmit={createSa} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                className={inp}
                type="email"
                required
                autoComplete="off"
                value={newSa.email}
                onChange={(e) => setNewSa((s) => ({ ...s, email: e.target.value }))}
                placeholder="admin@example.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                className={inp}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newSa.password}
                onChange={(e) => setNewSa((s) => ({ ...s, password: e.target.value }))}
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                First name
              </label>
              <input
                className={inp}
                required
                value={newSa.first_name}
                onChange={(e) => setNewSa((s) => ({ ...s, first_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Last name
              </label>
              <input
                className={inp}
                required
                value={newSa.last_name}
                onChange={(e) => setNewSa((s) => ({ ...s, last_name: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Phone (optional)
              </label>
              <input
                className={inp}
                value={newSa.phone}
                onChange={(e) => setNewSa((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || bulkBusy}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-amber-900/30 disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {saving ? 'Saving…' : 'Create Super Admin account'}
              </button>
            </div>
          </form>
        </section>

        {/* Full System Controller accounts */}
        <section className="rounded-2xl border border-violet-400/25 bg-violet-500/[0.06] p-6">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-violet-100">
            <UserPlus className="h-5 w-5 text-violet-300" />
            Add Full System Controller
          </h2>
          <p className="mb-6 text-xs text-slate-400">
            Uses the separate dashboard at{' '}
            <Link className="text-violet-300 underline hover:text-violet-200" to="/system-controller/dashboard">
              /system-controller/dashboard
            </Link>{' '}
            — not the Super Admin portal UI.
          </p>
          <form onSubmit={createFsc} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                className={inp}
                type="email"
                required
                autoComplete="off"
                value={newFsc.email}
                onChange={(e) => setNewFsc((s) => ({ ...s, email: e.target.value }))}
                placeholder="controller@example.com"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Password
              </label>
              <input
                className={inp}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newFsc.password}
                onChange={(e) => setNewFsc((s) => ({ ...s, password: e.target.value }))}
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                First name
              </label>
              <input
                className={inp}
                required
                value={newFsc.first_name}
                onChange={(e) => setNewFsc((s) => ({ ...s, first_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Last name
              </label>
              <input
                className={inp}
                required
                value={newFsc.last_name}
                onChange={(e) => setNewFsc((s) => ({ ...s, last_name: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Phone (optional)
              </label>
              <input
                className={inp}
                value={newFsc.phone}
                onChange={(e) => setNewFsc((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving || bulkBusy}
                className="w-full rounded-xl border border-violet-400/40 bg-violet-600/40 py-3 text-sm font-bold text-violet-50 hover:bg-violet-600/55 disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {saving ? 'Saving…' : 'Create Full System Controller'}
              </button>
            </div>
          </form>
        </section>

        <p className="text-center text-[11px] text-slate-500">
          First Super Admin (when none exists):{' '}
          <Link className="text-amber-400 underline" to="/superadmin/signup">
            /superadmin/signup
          </Link>
          {' · '}
          First controller (when none exists):{' '}
          <Link className="text-violet-400 underline" to="/signup/super-controller">
            /signup/super-controller
          </Link>
        </p>
      </main>
    </div>
  );
}
