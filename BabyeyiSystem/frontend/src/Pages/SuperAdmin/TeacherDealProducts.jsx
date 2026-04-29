import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Edit3, Eye, Loader2, Package, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { BABYEYI_FONT_STACK, BABYEYI_PAGE_BG } from '../../theme/babyeyiDashboardTheme';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const UPLOADS_BASE = (import.meta.env.VITE_UPLOADS_BASE || import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/$/, '');

const emptyForm = {
  name: '',
  price_rwf: '',
  description: '',
  is_active: true,
  image: null,
  media: [],
  partner_org_id: '',
};

const emptyPartnerForm = {
  org_name: '',
  login_username: '',
  contact_email: '',
  contact_phone: '',
  password: '',
  description: '',
  is_active: true,
};

function toErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function fmtMoney(v) {
  return `${Number(v || 0).toLocaleString()} RWF`;
}

function toAssetUrl(pathLike) {
  if (!pathLike || typeof pathLike !== 'string') return null;
  if (pathLike.startsWith('http://') || pathLike.startsWith('https://')) return pathLike;
  const clean = pathLike.replace(/\\/g, '/');
  return `${UPLOADS_BASE}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

export default function TeacherDealProducts() {
  const [rows, setRows] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [partnerForm, setPartnerForm] = useState(emptyPartnerForm);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [partnerError, setPartnerError] = useState('');
  const [partnerOk, setPartnerOk] = useState('');
  const [partnerSaving, setPartnerSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/services/shule-avance/admin/teacher-deal-products`, {
        params: { include_inactive: 1 },
        withCredentials: true,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not load products');
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setRows(data);
    } catch (e) {
      setRows([]);
      setError(toErrorMessage(e, 'Could not load Teacher Deal products.'));
    } finally {
      setLoading(false);
    }
  };

  const loadPartners = async () => {
    setPartnersLoading(true);
    setPartnerError('');
    try {
      const res = await axios.get(`${API}/auth/shule-avance-organizations`, { withCredentials: true });
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not load partners');
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setPartners(data);
    } catch (e) {
      setPartners([]);
      setPartnerError(toErrorMessage(e, 'Could not load partner organizations.'));
    } finally {
      setPartnersLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadPartners();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const resetPartnerForm = () => {
    setPartnerForm(emptyPartnerForm);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setOk('');
    try {
      const fd = new FormData();
      fd.append('name', String(form.name || '').trim());
      fd.append('price_rwf', String(form.price_rwf || '').trim());
      fd.append('description', String(form.description || '').trim());
      fd.append('is_active', form.is_active ? '1' : '0');
      if (form.partner_org_id) fd.append('partner_org_id', String(form.partner_org_id));
      if (form.image) fd.append('image', form.image);
      if (form.media?.length) {
        form.media.forEach((file) => {
          fd.append('media', file);
        });
      }

      if (editingId) {
        const res = await axios.put(`${API}/services/shule-avance/admin/teacher-deal-products/${editingId}`, fd, {
          withCredentials: true,
        });
        if (!res.data?.success) throw new Error(res.data?.message || 'Update failed');
        setOk('Product updated.');
      } else {
        const res = await axios.post(`${API}/services/shule-avance/admin/teacher-deal-products`, fd, {
          withCredentials: true,
        });
        if (!res.data?.success) throw new Error(res.data?.message || 'Create failed');
        setOk('Product created.');
      }
      resetForm();
      await load();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not save Teacher Deal product.'));
    } finally {
      setSaving(false);
    }
  };

  const submitPartner = async (e) => {
    e.preventDefault();
    setPartnerSaving(true);
    setPartnerError('');
    setPartnerOk('');
    try {
      const res = await axios.post(`${API}/auth/create-shule-avance-organization`, partnerForm, {
        withCredentials: true,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Could not create partner');
      setPartnerOk('Partner account created.');
      resetPartnerForm();
      await loadPartners();
    } catch (e) {
      setPartnerError(toErrorMessage(e, 'Could not create partner account.'));
    } finally {
      setPartnerSaving(false);
    }
  };

  const togglePartnerActive = async (partner) => {
    setPartnerError('');
    setPartnerOk('');
    try {
      await axios.put(`${API}/auth/shule-avance-organization/${partner.id}`, { is_active: !partner.is_active }, { withCredentials: true });
      setPartnerOk(`Partner ${partner.is_active ? 'deactivated' : 'activated'}.`);
      await loadPartners();
    } catch (e) {
      setPartnerError(toErrorMessage(e, 'Could not update partner status.'));
    }
  };

  const deletePartner = async (partner) => {
    if (!window.confirm(`Delete partner ${partner.org_name}? This will disable their login.`)) return;
    setPartnerError('');
    setPartnerOk('');
    try {
      const res = await axios.delete(`${API}/auth/shule-avance-organization/${partner.id}`, {
        withCredentials: true,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      setPartnerOk('Partner disabled.');
      await loadPartners();
    } catch (e) {
      setPartnerError(toErrorMessage(e, 'Could not remove partner.'));
    }
  };

  const onEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      price_rwf: String(Number(row.price_rwf || 0)),
      description: row.description || '',
      is_active: !!row.is_active,
      image: null,
      media: [],
      partner_org_id: row.partner_org_id || '',
    });
    setError('');
    setOk('');
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this Teacher Deal product?')) return;
    setError('');
    setOk('');
    try {
      const res = await axios.delete(`${API}/services/shule-avance/admin/teacher-deal-products/${id}`, {
        withCredentials: true,
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      setOk('Product deleted.');
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not delete product.'));
    }
  };

  const activeCount = useMemo(() => rows.filter((r) => r.is_active).length, [rows]);
  const activePartnerOptions = partners.filter((p) => p.is_active);

  return (
    <div
      className="min-h-screen p-5 md:p-8 space-y-5"
      style={{ background: BABYEYI_PAGE_BG, fontFamily: BABYEYI_FONT_STACK }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">SuperAdmin Catalog</p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1F2937] tracking-tight">
            Teacher Deal Products
          </h1>
          <p className="text-xs font-bold text-amber-800/80 mt-1">
            Manage products, partners, and rich product media for Shule Avance Teacher Deals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            load();
            loadPartners();
          }}
          className="h-10 px-4 rounded-xl border border-amber-300 bg-white text-[10px] font-black uppercase tracking-widest text-amber-800 inline-flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading || partnersLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {partnerOk ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{partnerOk}</div> : null}
      {ok ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{ok}</div> : null}
      {partnerError ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{partnerError}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-1 bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={16} className="text-amber-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1F2937]">
              {editingId ? 'Edit Product' : 'New Product'}
            </h2>
          </div>
          <form className="space-y-3" onSubmit={submit}>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-800">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full h-10 rounded-lg border border-amber-200 px-3 text-sm font-semibold outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-800">Price (RWF)</label>
              <input
                required
                type="number"
                min="1"
                value={form.price_rwf}
                onChange={(e) => setForm((f) => ({ ...f, price_rwf: e.target.value }))}
                className="w-full h-10 rounded-lg border border-amber-200 px-3 text-sm font-semibold outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-800">Description</label>
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-amber-200 p-3 text-sm font-semibold outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-800">Partner (optional)</label>
              <select
                value={form.partner_org_id || ''}
                onChange={(e) => setForm((f) => ({ ...f, partner_org_id: e.target.value || '' }))}
                className="w-full h-10 rounded-lg border border-amber-200 bg-white px-3 text-sm font-semibold outline-none focus:border-amber-400"
              >
                <option value="">No partner</option>
                {activePartnerOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.org_name} ({p.login_username})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-amber-800">Media</label>
              <input
                type="file"
                accept="image/*,video/*,application/pdf"
                multiple
                onChange={(e) => setForm((f) => ({ ...f, media: Array.from(e.target.files || []) }))}
                className="w-full text-xs font-bold"
              />
              {form.media?.length ? (
                <p className="text-[10px] text-slate-500">{form.media.length} file(s) selected.</p>
              ) : null}
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-black text-amber-900 uppercase tracking-wide">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              />
              Active
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-[#000435] text-[10px] font-black uppercase tracking-widest disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editingId ? 'Update Product' : 'Create Product'}
              </button>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-10 px-4 rounded-lg border border-amber-200 bg-white text-[10px] font-black uppercase tracking-widest text-amber-700"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="xl:col-span-2 bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1F2937]">Products</h2>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
              Active: {activeCount}
            </span>
          </div>
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-bold">Loading products...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm font-bold text-slate-400">No products added yet.</div>
          ) : (
            <div className="divide-y divide-amber-100">
              {rows.map((r) => (
                <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl border border-amber-100 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                      {r.media?.length ? (
                        <img src={toAssetUrl(r.media[0].url)} alt={r.name} className="w-full h-full object-cover" />
                      ) : r.image_url ? (
                        <img src={toAssetUrl(r.image_url)} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={16} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#1F2937] truncate">{r.name}</p>
                      <p className="text-xs font-bold text-slate-500 mt-0.5 truncate">{fmtMoney(r.price_rwf)}</p>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{r.description || 'No description.'}</p>
                      {r.partner_org_name ? (
                        <p className="text-[10px] font-semibold text-slate-500 mt-1">Partner: {r.partner_org_name}</p>
                      ) : null}
                      {r.media?.length ? (
                        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400 mt-1">Media: {r.media.length} item{r.media.length > 1 ? 's' : ''}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        r.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {r.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreview(r)}
                      className="h-9 px-3 rounded-lg border border-amber-200 bg-white text-[10px] font-black uppercase tracking-wider text-amber-800 inline-flex items-center gap-1"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(r)}
                      className="h-9 px-3 rounded-lg border border-amber-200 bg-white text-[10px] font-black uppercase tracking-wider text-slate-700 inline-flex items-center gap-1"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(r.id)}
                      className="h-9 px-3 rounded-lg border border-red-200 bg-red-50 text-[10px] font-black uppercase tracking-wider text-red-700 inline-flex items-center gap-1"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={16} className="text-amber-600" />
          <h2 className="text-sm font-black uppercase tracking-wider text-[#1F2937]">Teacher Deal Partners</h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3">Create Partner Account</h3>
            <form className="space-y-3" onSubmit={submitPartner}>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Organization Name</label>
                <input
                  required
                  value={partnerForm.org_name}
                  onChange={(e) => setPartnerForm((f) => ({ ...f, org_name: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-400"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Login username</label>
                  <input
                    required
                    value={partnerForm.login_username}
                    onChange={(e) => setPartnerForm((f) => ({ ...f, login_username: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Email</label>
                  <input
                    required
                    type="email"
                    value={partnerForm.contact_email}
                    onChange={(e) => setPartnerForm((f) => ({ ...f, contact_email: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Phone</label>
                  <input
                    value={partnerForm.contact_phone}
                    onChange={(e) => setPartnerForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Password</label>
                  <input
                    required
                    type="password"
                    value={partnerForm.password}
                    onChange={(e) => setPartnerForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Description</label>
                <textarea
                  rows={3}
                  value={partnerForm.description}
                  onChange={(e) => setPartnerForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-amber-400"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wide">
                <input
                  type="checkbox"
                  checked={partnerForm.is_active}
                  onChange={(e) => setPartnerForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Active partner account
              </label>
              <button
                type="submit"
                disabled={partnerSaving}
                className="w-full h-10 rounded-lg bg-amber-500 text-[#000435] text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
              >
                {partnerSaving ? <Loader2 size={14} className="animate-spin inline-block mr-2" /> : null}
                Create Partner
              </button>
            </form>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-3">Partner list</h3>
            {partnersLoading ? (
              <div className="text-sm text-slate-500">Loading partners...</div>
            ) : partners.length === 0 ? (
              <div className="text-sm text-slate-500">No partners created yet.</div>
            ) : (
              <div className="space-y-3">
                {partners.map((partner) => (
                  <div key={partner.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-slate-900">{partner.org_name}</p>
                        <p className="text-[10px] text-slate-500">{partner.login_username} · {partner.contact_email}</p>
                        <p className="text-[10px] text-slate-500">{partner.contact_phone || 'No phone provided'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => togglePartnerActive(partner)}
                          className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wider text-slate-700"
                        >
                          {partner.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePartner(partner)}
                          className="h-8 px-3 rounded-lg border border-red-200 bg-red-50 text-[10px] font-black uppercase tracking-wider text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {preview ? (
        <div className="fixed inset-0 z-[260] p-4 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/45" onClick={() => setPreview(null)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-amber-100 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1F2937]">Product detail</h3>
              <button onClick={() => setPreview(null)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="h-52 rounded-xl bg-slate-50 border border-amber-100 overflow-hidden flex items-center justify-center">
                {preview.media?.length ? (
                  <img src={toAssetUrl(preview.media[0].url)} alt={preview.name} className="w-full h-full object-cover" />
                ) : preview.image_url ? (
                  <img src={toAssetUrl(preview.image_url)} alt={preview.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={22} className="text-slate-400" />
                )}
              </div>
              <p className="text-lg font-black text-[#1F2937]">{preview.name}</p>
              <p className="text-sm font-black text-amber-700">{fmtMoney(preview.price_rwf)}</p>
              <p className="text-sm font-semibold text-slate-600">{preview.description || 'No description.'}</p>
              {preview.partner_org_name ? (
                <p className="text-sm font-semibold text-slate-500">Partner: {preview.partner_org_name}</p>
              ) : null}
              {preview.media?.length ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Media items</p>
                  <ul className="list-disc list-inside text-[11px] text-slate-500">
                    {preview.media.map((item, idx) => (
                      <li key={idx}>{item.url}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
