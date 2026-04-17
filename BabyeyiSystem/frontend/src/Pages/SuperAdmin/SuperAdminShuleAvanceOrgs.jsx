import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Building2,
  Edit3,
  KeyRound,
  Loader2,
  Save,
  Shield,
  Trash2,
  X,
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const ax = { withCredentials: true, headers: { 'Content-Type': 'application/json' } };

const NAVY = '#000435';
const AMBER = '#F59E0B';

export default function SuperAdminShuleAvanceOrgs() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [passwordOrg, setPasswordOrg] = useState(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [lastCredentials, setLastCredentials] = useState(null);
  const [form, setForm] = useState({
    org_name: '',
    org_type: 'INTERNAL_PARTNER',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    login_username: '',
    password: '',
    address: '',
    description: '',
    notes: '',
    rate_percent: '',
    rate_is_monthly: false,
    is_active: true,
  });

  const emptyForm = () => ({
    org_name: '',
    org_type: 'INTERNAL_PARTNER',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    login_username: '',
    password: '',
    address: '',
    description: '',
    notes: '',
    rate_percent: '',
    rate_is_monthly: false,
    is_active: true,
  });

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const load = async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/auth/shule-avance-organizations`, ax);
      if (data.success) setRows(data.data || []);
      else setErr(data.message || 'Failed to load');
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    setOk('');
    try {
      const payload = {
        ...form,
      };
      if (editingId && !String(form.password || '').trim()) {
        delete payload.password;
      }
      const { data } = editingId
        ? await axios.put(`${API}/auth/shule-avance-organization/${editingId}`, payload, ax)
        : await axios.post(`${API}/auth/create-shule-avance-organization`, payload, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      setLastCredentials({
        email: form.contact_email,
        username: form.login_username,
        password: form.password || null,
      });
      setOk(editingId ? 'Organization updated successfully.' : 'Organization created successfully.');
      resetForm();
      await load();
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = async (row) => {
    setErr('');
    setOk('');
    try {
      const { data } = await axios.get(`${API}/auth/shule-avance-organization/${row.id}`, ax);
      if (!data.success) throw new Error(data.message || 'Failed to load organization');
      const r = data.data || row;
      setEditingId(r.id);
      setForm({
        org_name: r.org_name || '',
        org_type: r.org_type || 'INTERNAL_PARTNER',
        contact_person: r.contact_person || '',
        contact_email: r.contact_email || '',
        contact_phone: r.contact_phone || '',
        login_username: r.login_username || '',
        password: '',
        address: r.address || '',
        description: r.description || '',
        notes: r.notes || '',
        rate_percent: r.rate_percent != null ? String(r.rate_percent) : '',
        rate_is_monthly: !!r.rate_is_monthly,
        is_active: !!r.is_active,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not load organization details');
    }
  };

  const removeOrg = async (row) => {
    const yes = window.confirm(
      `Delete "${row.org_name}"?\n\nThis disables partner login immediately.`
    );
    if (!yes) return;
    setErr('');
    setOk('');
    setDeletingId(row.id);
    try {
      const { data } = await axios.delete(`${API}/auth/shule-avance-organization/${row.id}`, ax);
      if (!data.success) throw new Error(data.message || 'Delete failed');
      setOk('Organization deleted and partner login disabled.');
      await load();
      if (editingId === row.id) resetForm();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const openPasswordModal = (row) => {
    setErr('');
    setOk('');
    setPasswordOrg(row);
    setPasswordDraft('');
    setPasswordConfirm('');
  };

  const closePasswordModal = (force = false) => {
    if (passwordSaving && !force) return;
    setPasswordOrg(null);
    setPasswordDraft('');
    setPasswordConfirm('');
  };

  const saveOrganizationPassword = async () => {
    if (!passwordOrg?.id) return;
    const pwd = String(passwordDraft || '');
    const confirm = String(passwordConfirm || '');
    if (pwd.length < 8) {
      setErr('New password must be at least 8 characters.');
      return;
    }
    if (pwd !== confirm) {
      setErr('Password confirmation does not match.');
      return;
    }
    setErr('');
    setOk('');
    setPasswordSaving(true);
    try {
      const { data } = await axios.put(`${API}/auth/shule-avance-organization/${passwordOrg.id}`, { password: pwd }, ax);
      if (!data.success) throw new Error(data.message || 'Could not update password');
      setLastCredentials({
        email: passwordOrg.contact_email,
        username: passwordOrg.login_username,
        password: pwd,
      });
      setOk(`Password updated for "${passwordOrg.org_name}".`);
      closePasswordModal(true);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const cardTitle = editingId ? 'Update organization' : 'Create organization';
  const submitLabel = editingId ? 'Update organization' : 'Create organization';
  const credentialsHint = useMemo(() => {
    if (editingId) {
      return 'Leave password blank to keep current password. Set a new password only when rotating credentials.';
    }
    return 'Password is hashed on the server. You can use either email or username to log in.';
  }, [editingId]);

  const inp = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-amber-400/60';

  return (
    <div className="min-h-screen" style={{ background: NAVY, fontFamily: 'system-ui, sans-serif' }}>
      <header className="border-b border-amber-400/30 px-4 py-4 flex items-center justify-between" style={{ background: '#061a3a' }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/superadmin/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:bg-white/5"
          >
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="flex items-center gap-2 text-white/90">
            <Shield size={18} className="text-amber-400" />
            <span className="font-bold text-sm tracking-wide">ShuleAvance organizations</span>
          </div>
        </div>
        <img src="/1BABYEYI LOGO FINAL.png" alt="" className="h-9 w-9 object-contain rounded-lg border border-amber-400/30" />
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {err && (
          <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}
        {ok && (
          <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {ok}
          </div>
        )}
        {lastCredentials && (
          <div className="rounded-xl border border-amber-300/35 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 space-y-1">
            <div className="font-bold uppercase tracking-wide text-[10px]">Latest login credentials set</div>
            <div>Email: <span className="font-mono">{lastCredentials.email}</span></div>
            <div>Username: <span className="font-mono">{lastCredentials.username}</span></div>
            {lastCredentials.password ? (
              <div>Password: <span className="font-mono">{lastCredentials.password}</span></div>
            ) : (
              <div>Password: <span className="font-semibold">Not changed</span></div>
            )}
            <div className="pt-1 text-amber-100/80">
              Partner sign-in page: <span className="font-mono">/login</span> → redirects to <span className="font-mono">/shule-avance/dashboard</span>.
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
          <h2 className="text-lg font-bold text-amber-300 mb-1 flex items-center gap-2">
            <Building2 size={20} /> {cardTitle}
          </h2>
          <p className="text-xs text-white/60 mb-5">
            Creates and manages partner login for the ShuleAvance dashboard.
          </p>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Organization name</label>
              <input className={inp} value={form.org_name} onChange={(e) => setForm((f) => ({ ...f, org_name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Type</label>
              <select className={inp} value={form.org_type} onChange={(e) => setForm((f) => ({ ...f, org_type: e.target.value }))}>
                <option value="BANK">Bank</option>
                <option value="MFI">Microfinance</option>
                <option value="SACCO">SACCO</option>
                <option value="INTERNAL_PARTNER">Internal partner</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Contact person</label>
              <input className={inp} value={form.contact_person} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Contact email (login)</label>
              <input type="email" className={inp} value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Phone</label>
              <input className={inp} value={form.contact_phone} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Username (alternate login)</label>
              <input className={inp} value={form.login_username} onChange={(e) => setForm((f) => ({ ...f, login_username: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Password (min 8)</label>
              <input
                type="password"
                className={inp}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required={!editingId}
                minLength={editingId && !form.password ? undefined : 8}
                placeholder={editingId ? 'Leave blank to keep current password' : ''}
              />
              <div className="mt-1 text-[10px] text-white/50">{credentialsHint}</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Address</label>
              <input className={inp} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Description</label>
              <textarea className={`${inp} min-h-[72px]`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">
                Organization rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.001"
                className={inp}
                value={form.rate_percent}
                onChange={(e) => setForm((f) => ({ ...f, rate_percent: e.target.value }))}
                required
              />
              <div className="mt-1 text-[10px] text-white/50">Used by ShuleAvance payment schedule calculations.</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/80 mt-5">
              <input
                type="checkbox"
                checked={form.rate_is_monthly}
                onChange={(e) => setForm((f) => ({ ...f, rate_is_monthly: e.target.checked }))}
              />
              Rate entered above is monthly (will be converted to annual in payments)
            </label>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Internal notes</label>
              <textarea className={`${inp} min-h-[56px]`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Active (inactive partners do not appear in public school pay picker)
            </label>
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50"
                  style={{ background: AMBER }}
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {submitLabel}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold text-white/90 hover:bg-white/5"
                  >
                    <X size={16} /> Cancel edit
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Organizations</h2>
            <button type="button" onClick={load} className="text-xs font-semibold text-amber-300 hover:underline">Refresh</button>
          </div>
          {loading ? (
            <div className="p-10 flex justify-center text-amber-200"><Loader2 className="animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-white/90">
                <thead className="text-[10px] uppercase tracking-wider text-amber-200/90 bg-black/20">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-semibold">{r.org_name}</td>
                      <td className="px-4 py-3 text-white/70">{r.org_type}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.login_username}</td>
                      <td className="px-4 py-3 text-xs">{r.contact_email}</td>
                      <td className="px-4 py-3 text-xs">
                        {r.rate_percent != null ? `${Number(r.rate_percent).toFixed(3)}%` : '—'}
                        {Number(r.rate_is_monthly || 0) ? ' / month' : ' / year'}
                      </td>
                      <td className="px-4 py-3">{r.is_active ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1 text-[11px] font-semibold text-white/85 hover:bg-white/10"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openPasswordModal(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300/35 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-300/10"
                            title="Edit and set a new password"
                          >
                            <KeyRound size={12} /> Password
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === r.id}
                            onClick={() => removeOrg(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300/35 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-300/10 disabled:opacity-60"
                          >
                            {deletingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div className="p-8 text-center text-white/50 text-sm">No organizations yet.</div>}
            </div>
          )}
        </section>
      </main>

      {passwordOrg && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#061a3a] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                  <KeyRound size={16} /> Set new password
                </h3>
                <p className="text-xs text-white/70 mt-1">
                  {passwordOrg.org_name}
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                className="rounded-lg border border-white/20 p-1.5 text-white/80 hover:bg-white/10"
                disabled={passwordSaving}
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">
                  New password (min 8)
                </label>
                <input
                  type="password"
                  className={inp}
                  value={passwordDraft}
                  onChange={(e) => setPasswordDraft(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">
                  Confirm password
                </label>
                <input
                  type="password"
                  className={inp}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveOrganizationPassword}
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
                  style={{ background: AMBER }}
                >
                  {passwordSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save password
                </button>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  disabled={passwordSaving}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/5 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
