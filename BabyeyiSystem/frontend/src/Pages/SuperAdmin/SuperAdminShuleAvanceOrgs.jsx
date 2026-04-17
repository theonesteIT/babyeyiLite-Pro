import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, Building2, Eye, Loader2, Pencil, Save, Shield, Trash2, X,
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const ax = { withCredentials: true, headers: { 'Content-Type': 'application/json' } };

const NAVY = '#000435';
const AMBER = '#F59E0B';

function splitApplicantCategoriesText(t) {
  return String(t || '')
    .split(/[,;\n\r]+/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .slice(0, 30);
}

export default function SuperAdminShuleAvanceOrgs() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [pwRowId, setPwRowId] = useState(null);
  const [pwVal, setPwVal] = useState('');
  const [metaEditId, setMetaEditId] = useState(null);
  const [metaName, setMetaName] = useState('');
  const [metaEmail, setMetaEmail] = useState('');
  const [viewId, setViewId] = useState(null);
  const [viewData, setViewData] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [form, setForm] = useState({
    org_name: '',
    org_type: 'INTERNAL_PARTNER',
    rate_percent: '12',
    rate_is_monthly: false,
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    login_username: '',
    password: '',
    address: '',
    description: '',
    notes: '',
    is_active: true,
    applicant_categories_text: 'Parent, Teacher, Director',
  });

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

  const patchOrg = async (id, body) => {
    setBusyId(id);
    setErr('');
    try {
      const { data } = await axios.put(`${API}/auth/shule-avance-organization/${id}`, body, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      await load();
      return true;
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Update failed');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const applicant_categories = splitApplicantCategoriesText(form.applicant_categories_text);
    if (!applicant_categories.length) {
      setErr('Enter at least one applicant category (comma-separated).');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const { applicant_categories_text, ...rest } = form;
      const { data } = await axios.post(
        `${API}/auth/create-shule-avance-organization`,
        { ...rest, applicant_categories },
        ax,
      );
      if (!data.success) throw new Error(data.message || 'Failed');
      setForm({
        org_name: '',
        org_type: 'INTERNAL_PARTNER',
        rate_percent: '12',
        rate_is_monthly: false,
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        login_username: '',
        password: '',
        address: '',
        description: '',
        notes: '',
        is_active: true,
        applicant_categories_text: 'Parent, Teacher, Director',
      });
      await load();
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const openView = async (id) => {
    setViewId(id);
    setViewData(null);
    setViewLoading(true);
    setErr('');
    try {
      const { data } = await axios.get(`${API}/auth/shule-avance-organization/${id}`, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      setViewData(data.data);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Load failed');
      setViewId(null);
    } finally {
      setViewLoading(false);
    }
  };

  const openEdit = async (id) => {
    setEditId(id);
    setEditForm(null);
    setEditSaving(false);
    setErr('');
    try {
      const { data } = await axios.get(`${API}/auth/shule-avance-organization/${id}`, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      const d = data.data;
      setEditForm({
        org_name: d.org_name || '',
        org_type: d.org_type || 'INTERNAL_PARTNER',
        rate_percent: d.rate_percent == null ? '12' : String(d.rate_percent),
        rate_is_monthly: !!d.rate_is_monthly,
        contact_person: d.contact_person || '',
        contact_email: d.contact_email || '',
        contact_phone: d.contact_phone || '',
        login_username: d.login_username || '',
        address: d.address || '',
        description: d.description || '',
        notes: d.notes || '',
        is_active: !!d.is_active,
        applicant_categories_text: Array.isArray(d.applicant_categories) && d.applicant_categories.length
          ? d.applicant_categories.join(', ')
          : 'Parent, Teacher, Director',
        password: '',
      });
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Load failed');
      setEditId(null);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editId || !editForm) return;
    const applicant_categories = splitApplicantCategoriesText(editForm.applicant_categories_text);
    if (!applicant_categories.length) {
      setErr('Enter at least one applicant category (comma-separated).');
      return;
    }
    setEditSaving(true);
    setErr('');
    try {
      const { applicant_categories_text, ...rest } = editForm;
      const body = { ...rest, applicant_categories };
      if (!body.password?.trim()) delete body.password;
      const { data } = await axios.put(`${API}/auth/shule-avance-organization/${editId}`, body, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      setEditId(null);
      setEditForm(null);
      await load();
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message || 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const deleteOrg = async (id) => {
    if (!window.confirm('Remove this ShuleAvance organization? Partner login will be disabled and the account soft-deleted.')) return;
    setBusyId(id);
    setErr('');
    try {
      const { data } = await axios.delete(`${API}/auth/shule-avance-organization/${id}`, ax);
      if (!data.success) throw new Error(data.message || 'Failed');
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  const inp = 'w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-amber-400/60';
  const sel = `${inp} sa-select`;

  return (
    <div className="min-h-screen" style={{ background: NAVY, fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .sa-select, .sa-select option {
          background-color: #061a3a !important;
          color: #fef3c7 !important;
        }
        .sa-select option:checked, .sa-select option:hover {
          background-color: #000435 !important;
          color: #fcd34d !important;
        }
      `}</style>
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

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl">
          <h2 className="text-lg font-bold text-amber-300 mb-1 flex items-center gap-2">
            <Building2 size={20} /> Create organization
          </h2>
          <p className="text-xs text-white/60 mb-5">
            Creates a platform login (email + username) and partner dashboard access. Password is hashed on the server.
          </p>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Organization name</label>
              <input className={inp} value={form.org_name} onChange={(e) => setForm((f) => ({ ...f, org_name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Type</label>
              <select className={sel} value={form.org_type} onChange={(e) => setForm((f) => ({ ...f, org_type: e.target.value }))}>
                <option value="BANK">Bank</option>
                <option value="MFI">Microfinance</option>
                <option value="SACCO">SACCO</option>
                <option value="INTERNAL_PARTNER">Internal partner</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Income rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step="0.001"
                className={inp}
                value={form.rate_percent}
                onChange={(e) => setForm((f) => ({ ...f, rate_percent: e.target.value }))}
                placeholder="12"
              />
              <p className="text-[11px] text-white/50 mt-1">Example: 12 = 12% per year.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/80 mt-6">
              <input
                type="checkbox"
                checked={!!form.rate_is_monthly}
                onChange={(e) => setForm((f) => ({ ...f, rate_is_monthly: e.target.checked }))}
              />
              Rate is monthly (if unchecked, rate is annual)
            </label>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Applicant categories accepted</label>
              <textarea
                className={`${inp} min-h-[80px] font-sans`}
                value={form.applicant_categories_text}
                onChange={(e) => setForm((f) => ({ ...f, applicant_categories_text: e.target.value }))}
                placeholder="e.g. Parent, Teacher, Director, School bursar — separate with commas or new lines"
              />
              <p className="text-[11px] text-white/50 mt-2">
                Type any labels you want. Parents see exactly this list when they choose an applicant type at checkout (matched case-insensitively).
              </p>
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
              <input type="password" className={inp} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required minLength={8} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Address</label>
              <input className={inp} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Description</label>
              <textarea className={`${inp} min-h-[72px]`} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Internal notes</label>
              <textarea className={`${inp} min-h-[56px]`} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <label className="md:col-span-2 flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Active (inactive partners do not appear in public school pay picker)
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50"
                style={{ background: AMBER }}
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Create organization
              </button>
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
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Categories</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Active</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-white/10 hover:bg-white/[0.03]">
                      <td className="px-4 py-3 font-semibold">
                        {metaEditId === r.id ? (
                          <input
                            className={inp}
                            value={metaName}
                            onChange={(e) => setMetaName(e.target.value)}
                            aria-label="Organization name"
                          />
                        ) : (
                          r.org_name
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/70">{r.org_type}</td>
                      <td className="px-4 py-3 text-white/80">
                        {r.rate_percent == null ? '—' : `${Number(r.rate_percent).toFixed(2)}% ${r.rate_is_monthly ? '/ month' : '/ year'}`}
                      </td>
                      <td className="px-4 py-3 text-[10px] text-amber-100/90 max-w-[140px]">
                        {(r.applicant_categories || []).map((c) => (
                          <span key={c} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded bg-white/10">{c}</span>
                        ))}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.login_username}</td>
                      <td className="px-4 py-3 text-xs">
                        {metaEditId === r.id ? (
                          <input
                            type="email"
                            className={inp}
                            value={metaEmail}
                            onChange={(e) => setMetaEmail(e.target.value)}
                            aria-label="Contact email"
                          />
                        ) : (
                          r.contact_email
                        )}
                      </td>
                      <td className="px-4 py-3">{r.is_active ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2 min-w-[220px]">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => openView(r.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold rounded-md border border-white/20 px-2 py-1 text-white/90 hover:bg-white/10 disabled:opacity-40"
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => openEdit(r.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold rounded-md border border-amber-400/50 px-2 py-1 text-amber-100 hover:bg-white/5 disabled:opacity-40"
                            >
                              <Pencil size={12} /> Update
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => deleteOrg(r.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold rounded-md border border-red-400/50 px-2 py-1 text-red-200 hover:bg-red-500/10 disabled:opacity-40"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                          {metaEditId === r.id ? (
                            <div className="flex flex-wrap gap-1 mb-1">
                              <button
                                type="button"
                                disabled={busyId === r.id}
                                className="text-xs font-bold rounded-lg px-2 py-1 text-slate-900 disabled:opacity-40"
                                style={{ background: AMBER }}
                                onClick={async () => {
                                  const name = metaName.trim();
                                  const email = metaEmail.trim().toLowerCase();
                                  if (!name) {
                                    setErr('Organization name is required.');
                                    return;
                                  }
                                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                                    setErr('Enter a valid contact email.');
                                    return;
                                  }
                                  setErr('');
                                  const ok = await patchOrg(r.id, { org_name: name, contact_email: email });
                                  if (ok) setMetaEditId(null);
                                }}
                              >
                                {busyId === r.id ? '…' : 'Save name & email'}
                              </button>
                              <button
                                type="button"
                                disabled={busyId === r.id}
                                className="text-xs text-white/70 underline"
                                onClick={() => { setMetaEditId(null); setErr(''); }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => {
                                setPwRowId(null);
                                setPwVal('');
                                setMetaEditId(r.id);
                                setMetaName(String(r.org_name || ''));
                                setMetaEmail(String(r.contact_email || ''));
                                setErr('');
                              }}
                              className="text-left text-xs font-semibold text-amber-200/90 hover:underline disabled:opacity-40"
                            >
                              Edit name & email
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => patchOrg(r.id, { is_active: !r.is_active })}
                            className="text-left text-xs font-bold rounded-lg border border-amber-400/50 px-2 py-1.5 text-amber-100 hover:bg-white/5 disabled:opacity-40"
                          >
                            {busyId === r.id ? '…' : r.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {pwRowId === r.id ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="password"
                                className={inp}
                                placeholder="New password (min 8)"
                                value={pwVal}
                                onChange={(e) => setPwVal(e.target.value)}
                                minLength={8}
                              />
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  disabled={busyId === r.id || pwVal.length < 8}
                                  className="text-xs font-bold rounded-lg px-2 py-1 text-slate-900 disabled:opacity-40"
                                  style={{ background: AMBER }}
                                  onClick={async () => {
                                    const ok = await patchOrg(r.id, { password: pwVal });
                                    if (ok) {
                                      setPwRowId(null);
                                      setPwVal('');
                                    }
                                  }}
                                >
                                  Save password
                                </button>
                                <button
                                  type="button"
                                  className="text-xs text-white/70 underline"
                                  onClick={() => { setPwRowId(null); setPwVal(''); }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setMetaEditId(null);
                                setPwRowId(r.id);
                                setPwVal('');
                                setErr('');
                              }}
                              className="text-left text-xs font-semibold text-white/80 hover:text-amber-200 underline"
                            >
                              Set new password
                            </button>
                          )}
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

        {viewId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="w-full max-w-lg rounded-2xl border border-amber-400/30 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: '#061a3a' }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-amber-200">View organization</h3>
                <button
                  type="button"
                  onClick={() => { setViewId(null); setViewData(null); }}
                  className="p-1.5 rounded-lg text-white/70 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              {viewLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-amber-300" size={32} /></div>
              ) : viewData ? (
                <dl className="space-y-3 text-sm text-white/90">
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Name</dt><dd className="font-semibold">{viewData.org_name}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Type</dt><dd>{viewData.org_type}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Income rate</dt><dd>{viewData.rate_percent == null ? '—' : `${Number(viewData.rate_percent).toFixed(2)}% ${viewData.rate_is_monthly ? '/ month' : '/ year'}`}</dd></div>
                  <div>
                    <dt className="text-[10px] uppercase text-amber-200/70">Applicant categories</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {(viewData.applicant_categories || []).map((c) => (
                        <span key={c} className="text-xs px-2 py-0.5 rounded bg-white/10">{c}</span>
                      ))}
                    </dd>
                  </div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Contact</dt><dd>{viewData.contact_person || '—'}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Email</dt><dd className="break-all">{viewData.contact_email}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Phone</dt><dd>{viewData.contact_phone || '—'}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Username</dt><dd className="font-mono text-xs">{viewData.login_username}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Address</dt><dd className="whitespace-pre-wrap">{viewData.address || '—'}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Description</dt><dd className="whitespace-pre-wrap text-white/80">{viewData.description || '—'}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Notes</dt><dd className="whitespace-pre-wrap text-white/70 text-xs">{viewData.notes || '—'}</dd></div>
                  <div><dt className="text-[10px] uppercase text-amber-200/70">Active</dt><dd>{viewData.is_active ? 'Yes' : 'No'}</dd></div>
                </dl>
              ) : null}
            </div>
          </div>
        )}

        {editId && editForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
            role="dialog"
            aria-modal="true"
          >
            <form
              onSubmit={saveEdit}
              className="w-full max-w-2xl rounded-2xl border border-amber-400/30 p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
              style={{ background: '#061a3a' }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-amber-200">Update organization</h3>
                <button
                  type="button"
                  onClick={() => { setEditId(null); setEditForm(null); }}
                  className="p-1.5 rounded-lg text-white/70 hover:bg-white/10"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Organization name</label>
                  <input className={inp} value={editForm.org_name} onChange={(e) => setEditForm((f) => ({ ...f, org_name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Type</label>
                  <select className={sel} value={editForm.org_type} onChange={(e) => setEditForm((f) => ({ ...f, org_type: e.target.value }))}>
                    <option value="BANK">Bank</option>
                    <option value="MFI">Microfinance</option>
                    <option value="SACCO">SACCO</option>
                    <option value="INTERNAL_PARTNER">Internal partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Income rate (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.001"
                    className={inp}
                    value={editForm.rate_percent}
                    onChange={(e) => setEditForm((f) => ({ ...f, rate_percent: e.target.value }))}
                    placeholder="12"
                  />
                  <p className="text-[11px] text-white/50 mt-1">Example: 12 = 12% per year.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-white/80 mt-6">
                  <input
                    type="checkbox"
                    checked={!!editForm.rate_is_monthly}
                    onChange={(e) => setEditForm((f) => ({ ...f, rate_is_monthly: e.target.checked }))}
                  />
                  Rate is monthly (if unchecked, rate is annual)
                </label>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Applicant categories accepted</label>
                  <textarea
                    className={`${inp} min-h-[80px] font-sans`}
                    value={editForm.applicant_categories_text}
                    onChange={(e) => setEditForm((f) => ({ ...f, applicant_categories_text: e.target.value }))}
                    placeholder="Comma or new line separated"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Contact person</label>
                  <input className={inp} value={editForm.contact_person} onChange={(e) => setEditForm((f) => ({ ...f, contact_person: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Contact email</label>
                  <input type="email" className={inp} value={editForm.contact_email} onChange={(e) => setEditForm((f) => ({ ...f, contact_email: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Phone</label>
                  <input className={inp} value={editForm.contact_phone} onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Username</label>
                  <input className={inp} value={editForm.login_username} onChange={(e) => setEditForm((f) => ({ ...f, login_username: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">New password (optional)</label>
                  <input type="password" className={inp} value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} minLength={8} placeholder="Leave blank to keep" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Address</label>
                  <input className={inp} value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Description</label>
                  <textarea className={`${inp} min-h-[72px]`} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-1">Internal notes</label>
                  <textarea className={`${inp} min-h-[56px]`} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <label className="md:col-span-2 flex items-center gap-2 text-sm text-white/80">
                  <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  Active
                </label>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-slate-900 disabled:opacity-50"
                  style={{ background: AMBER }}
                >
                  {editSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Save changes
                </button>
                <button type="button" className="text-sm text-white/70 underline" onClick={() => { setEditId(null); setEditForm(null); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
