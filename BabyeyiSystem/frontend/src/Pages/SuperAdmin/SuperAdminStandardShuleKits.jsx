// ================================================================
// Super Admin — Standard ShuleKit (pre-determined grade kits)
// API: /api/standard-shule-kits/admin/*
// ================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Loader2,
  X,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Package,
  Trash2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../Auth/LogoutButton';
import { getApiBase, getApiOrigin } from '../../utils/apiBase';

const API = getApiBase();
const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_BASE || getApiOrigin();
const axCfg = { headers: { 'Content-Type': 'application/json' }, withCredentials: true };

const ACCENT = '#1F2937';

const inp =
  'w-full bg-amber-50/80 border-2 border-amber-200 text-gray-900 rounded-xl px-4 py-3 text-sm font-medium ' +
  'focus:outline-none focus:border-[#FEBF10] focus:ring-2 focus:ring-amber-100 placeholder-amber-400 transition-all';

function toAssetUrl(p) {
  if (!p || typeof p !== 'string') return null;
  const path = p.replace(/\\/g, '/').trim();
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = UPLOADS_BASE.replace(/\/$/, '');
  return base + (path.startsWith('/') ? path : `/${path}`);
}

function formatFrw(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `${Number(n).toLocaleString('en-RW')} Frw`;
}

function statusBadge(status) {
  const map = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    inactive: 'bg-amber-100 text-amber-900 border-amber-300',
  };
  const cls = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border capitalize ${cls}`}>
      {status}
    </span>
  );
}

const emptyRequirement = () => ({
  title: '',
  amount_frw: '',
  quantity: '1',
  imageFile: null,
  existing_image_url: null,
  clear_image: false,
});

const emptyForm = () => ({
  grade_level: '',
  description: '',
  status: 'draft',
  sort_order: '0',
  requirements: [emptyRequirement(), emptyRequirement()],
});

export default function SuperAdminStandardShuleKits() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [gradeLevels, setGradeLevels] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/standard-shule-kits/admin/kits`, axCfg);
      if (res.data?.success) {
        setRows(res.data.data || []);
        setGradeLevels(res.data.grade_levels || []);
      } else showToast(res.data?.message || 'Failed to load', 'error');
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load kits', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const takenGrades = useMemo(() => new Set(rows.map((r) => r.grade_level)), [rows]);

  const openCreate = () => {
    setForm(emptyForm());
    setStep(1);
    setModal({ mode: 'create' });
  };

  const openEdit = async (kit) => {
    setSaving(false);
    try {
      const res = await axios.get(`${API}/standard-shule-kits/admin/kits/${kit.id}`, axCfg);
      if (!res.data?.success) throw new Error(res.data?.message || 'Load failed');
      const k = res.data.data;
      const reqs =
        k.requirements?.length > 0
          ? k.requirements.map((r) => ({
              title: r.title || '',
              amount_frw: r.amount_frw != null ? String(r.amount_frw) : '',
              quantity: r.quantity != null ? String(r.quantity) : '1',
              imageFile: null,
              existing_image_url: r.image_url || null,
              clear_image: false,
            }))
          : [emptyRequirement()];
      setForm({
        id: k.id,
        grade_level: k.grade_level,
        description: k.description || '',
        status: k.status,
        sort_order: String(k.sort_order ?? 0),
        requirements: reqs,
      });
      setStep(1);
      setModal({ mode: 'edit' });
    } catch (e) {
      showToast(e.message || 'Could not open kit', 'error');
    }
  };

  const addRequirementRow = () => {
    setForm((f) => ({ ...f, requirements: [...f.requirements, emptyRequirement()] }));
  };

  const removeRequirementRow = (idx) => {
    setForm((f) => ({
      ...f,
      requirements: f.requirements.length > 1 ? f.requirements.filter((_, i) => i !== idx) : f.requirements,
    }));
  };

  const updateRequirement = (idx, field, val) => {
    setForm((f) => {
      const next = [...f.requirements];
      next[idx] = { ...next[idx], [field]: val };
      return { ...f, requirements: next };
    });
  };

  /** Valid rows in order; returns { payload, fileSlots: orig indices } */
  const buildRequirementsSubmit = () => {
    const payload = [];
    const fileSlots = [];
    form.requirements.forEach((r, i) => {
      const title = String(r.title || '').trim();
      if (!title) return;
      const qty = Math.max(1, parseInt(String(r.quantity), 10) || 1);
      const unit = Math.max(0, parseFloat(String(r.amount_frw).replace(/,/g, '')) || 0);
      payload.push({
        title,
        amount_frw: unit,
        quantity: qty,
        clear_image: !!r.clear_image,
        ...(r.clear_image || r.imageFile
          ? {}
          : r.existing_image_url
            ? { image_url: r.existing_image_url }
            : {}),
      });
      fileSlots.push(i);
    });
    return { payload, fileSlots };
  };

  const computedTotal = useMemo(() => {
    return form.requirements.reduce((s, r) => {
      const title = String(r.title || '').trim();
      if (!title) return s;
      const qty = Math.max(1, parseInt(String(r.quantity), 10) || 1);
      const unit = Math.max(0, parseFloat(String(r.amount_frw).replace(/,/g, '')) || 0);
      return s + unit * qty;
    }, 0);
  }, [form.requirements]);

  const submit = async () => {
    const { payload, fileSlots } = buildRequirementsSubmit();
    if (!form.grade_level) {
      showToast('Choose a grade level', 'error');
      setStep(1);
      return;
    }
    if (payload.length === 0) {
      showToast('Add at least one requirement with a title and price', 'error');
      setStep(2);
      return;
    }

    const fd = new FormData();
    fd.append('grade_level', form.grade_level);
    fd.append('description', form.description || '');
    fd.append('status', form.status);
    fd.append('sort_order', String(parseInt(form.sort_order, 10) || 0));
    fd.append('requirements', JSON.stringify(payload));
    fileSlots.forEach((origIdx, j) => {
      const f = form.requirements[origIdx]?.imageFile;
      if (f) fd.append(`req_image_${j}`, f);
    });

    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await axios.post(`${API}/standard-shule-kits/admin/kits`, fd, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Standard ShuleKit created', 'success');
      } else {
        await axios.put(`${API}/standard-shule-kits/admin/kits/${form.id}`, fd, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Saved', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      showToast(e.response?.data?.message || e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (kit) => {
    if (!window.confirm(`Delete standard kit for “${kit.grade_level}”? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/standard-shule-kits/admin/kits/${kit.id}`, axCfg);
      showToast('Deleted', 'success');
      load();
    } catch (e) {
      showToast(e.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.grade_level?.toLowerCase().includes(q) ||
        String(r.description || '')
          .toLowerCase()
          .includes(q)
    );
  }, [rows, search]);

  const canProceedStep1 = form.grade_level && (modal.mode === 'edit' || !takenGrades.has(form.grade_level));

  if (auth.loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(160deg,#fffbeb 0%,#fef3c7 40%,#fde68a 100%)',
        }}
      >
        <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-gray-900"
      style={{
        background: 'linear-gradient(160deg,#fffbeb 0%,#fef3c7 40%,#fde68a 100%)',
      }}
    >
      {toast ? (
        <div
          className={`fixed bottom-4 left-4 right-4 z-[300] sm:left-auto sm:right-4 sm:max-w-sm flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl border pointer-events-auto ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : toast.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-800'
                : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          )}
          <p className="text-xs font-medium">{toast.message}</p>
        </div>
      ) : null}

      <header className="sticky top-0 z-20 border-b-2 border-amber-100 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/superadmin/dashboard')}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-amber-800 hover:bg-amber-50 border border-amber-200 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">Dashboard</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-gray-900 truncate flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600 shrink-0 hidden sm:block" />
                Standard ShuleKit
              </h1>
              <p className="text-[10px] text-amber-700">
                Pre-determined kits: Nursery → A-Level. One active kit per grade band.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link
              to="/services/standard-shulekit"
              className="text-xs font-bold text-amber-800 hover:underline px-2 py-1"
            >
              Public page
            </Link>
            <LogoutButton variant="default" size="sm" className="hidden sm:flex text-xs rounded-xl" />
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-[#FEBF10] shadow-lg active:scale-[0.98] transition"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
            >
              <Plus className="w-4 h-4" />
              New kit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <input
            className={inp + ' sm:max-w-xs'}
            placeholder="Search grade or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="text-xs text-amber-800 font-medium sm:ml-auto">
            {rows.length} kit{rows.length === 1 ? '' : 's'} · Set status to <strong>active</strong> to show on the public page
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-amber-600" />
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-amber-200 bg-white/80 p-10 text-center">
            <Package className="w-12 h-12 text-amber-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700">No standard kits yet</p>
            <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
              Create one kit per grade (Nursery, Pre-primary, Upper-Primary, O-Level, A-Level) with line items and total price.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-[#FEBF10]"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
            >
              <Plus className="w-4 h-4" /> Create first kit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRows.map((k) => (
              <article
                key={k.id}
                className="rounded-2xl border-2 border-amber-100 bg-white shadow-lg shadow-amber-900/5 overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="sm:w-36 h-40 sm:h-auto bg-amber-50 shrink-0 relative">
                  {k.cover_image_url || k.image_url ? (
                    <img
                      src={toAssetUrl(k.cover_image_url || k.image_url)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-amber-200">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-black text-gray-900">{k.grade_level}</h2>
                      {statusBadge(k.status)}
                    </div>
                    <p className="text-sm font-black text-amber-900 whitespace-nowrap">{formatFrw(k.total_frw)}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2">{k.description || '—'}</p>
                  <p className="text-[10px] text-amber-600 mt-1">
                    {k.requirements?.length || 0} requirement{(k.requirements?.length || 0) === 1 ? '' : 's'}
                  </p>
                  <div className="mt-auto pt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(k)}
                      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-amber-200 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50 min-h-[40px]"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(k)}
                      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-red-100 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 min-h-[40px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {modal ? (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setModal(null)}
          />
          <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col rounded-t-3xl sm:rounded-3xl border-2 border-amber-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-amber-50/80 shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  Step {step} of 2
                </p>
                <h3 className="text-sm font-black text-gray-900">
                  {modal.mode === 'create' ? 'New standard kit' : 'Edit kit'}
                </h3>
              </div>
              <button
                type="button"
                disabled={saving}
                className="p-2 rounded-xl hover:bg-white/80 disabled:opacity-50"
                onClick={() => setModal(null)}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 py-4">
              {step === 1 ? (
                <div className="space-y-4">
                  <p className="text-xs text-gray-600">
                    Choose the grade band for this pre-determined ShuleKit. Each grade can only have one kit.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {(gradeLevels.length ? gradeLevels : ['Nursery', 'Pre-primary', 'Upper-Primary', 'O-Level', 'A-Level']).map(
                      (g) => {
                        const taken = takenGrades.has(g) && !(modal.mode === 'edit' && form.grade_level === g);
                        return (
                          <label
                            key={g}
                            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition ${
                              form.grade_level === g
                                ? 'border-[#FEBF10] bg-amber-50'
                                : taken
                                  ? 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                                  : 'border-amber-100 hover:border-amber-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name="grade"
                              className="accent-amber-600 w-4 h-4 shrink-0"
                              checked={form.grade_level === g}
                              disabled={taken}
                              onChange={() => setForm((f) => ({ ...f, grade_level: g }))}
                            />
                            <span className="text-sm font-bold text-gray-900">{g}</span>
                            {taken ? (
                              <span className="text-[10px] font-semibold text-slate-500 ml-auto">Already defined</span>
                            ) : null}
                          </label>
                        );
                      }
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-amber-700 mb-1">Description</label>
                    <textarea
                      className={inp + ' min-h-[88px] resize-y'}
                      rows={3}
                      placeholder="What parents get in this kit…"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-amber-700 mb-1">Status</label>
                      <select
                        className={inp}
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-amber-700 mb-1">Sort order</label>
                      <input
                        type="number"
                        min={0}
                        className={inp}
                        value={form.sort_order}
                        onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold uppercase text-amber-700">
                        Requirements (unit price × qty; image optional per line)
                      </label>
                      <button
                        type="button"
                        onClick={addRequirementRow}
                        className="text-xs font-bold text-amber-800 underline"
                      >
                        + Add line
                      </button>
                    </div>
                    <div className="space-y-4">
                      {form.requirements.map((r, idx) => {
                        const qty = Math.max(1, parseInt(String(r.quantity), 10) || 1);
                        const unit = Math.max(0, parseFloat(String(r.amount_frw).replace(/,/g, '')) || 0);
                        const lineTot = String(r.title || '').trim() ? unit * qty : 0;
                        return (
                          <div
                            key={idx}
                            className="rounded-2xl border border-amber-100 bg-amber-50/30 p-3 space-y-2"
                          >
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                className={inp + ' flex-1'}
                                placeholder="Item / requirement name"
                                value={r.title}
                                onChange={(e) => updateRequirement(idx, 'title', e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => removeRequirementRow(idx)}
                                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50 min-h-[44px] sm:self-start"
                                aria-label="Remove row"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-amber-600 mb-0.5">
                                  Unit (Frw)
                                </label>
                                <input
                                  className={inp + ' py-2.5'}
                                  type="number"
                                  min={0}
                                  step="1"
                                  placeholder="0"
                                  value={r.amount_frw}
                                  onChange={(e) => updateRequirement(idx, 'amount_frw', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold uppercase text-amber-600 mb-0.5">
                                  Qty
                                </label>
                                <input
                                  className={inp + ' py-2.5'}
                                  type="number"
                                  min={1}
                                  step="1"
                                  value={r.quantity}
                                  onChange={(e) => updateRequirement(idx, 'quantity', e.target.value)}
                                />
                              </div>
                              <div className="col-span-2 sm:col-span-1 flex items-end">
                                <div className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs">
                                  <span className="text-amber-600 font-bold">Line</span>{' '}
                                  <span className="font-black text-gray-900">{formatFrw(lineTot)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
                              <label className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-amber-200 px-3 py-2 text-[11px] font-bold text-amber-800 hover:bg-amber-50 cursor-pointer min-h-[40px]">
                                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                                {r.imageFile ? r.imageFile.name : 'Optional image'}
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/gif"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setForm((f) => {
                                      const next = [...f.requirements];
                                      next[idx] = { ...next[idx], imageFile: file, clear_image: false };
                                      return { ...f, requirements: next };
                                    });
                                  }}
                                />
                              </label>
                              {r.imageFile && !r.clear_image ? (
                                <span className="text-[10px] font-semibold text-emerald-700 self-center">
                                  New image selected
                                </span>
                              ) : null}
                              {r.existing_image_url && !r.imageFile && !r.clear_image ? (
                                <img
                                  src={toAssetUrl(r.existing_image_url)}
                                  alt=""
                                  className="h-14 w-14 rounded-lg object-cover border border-amber-100 shrink-0"
                                />
                              ) : null}
                              {(r.existing_image_url || r.imageFile) && (
                                <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="rounded border-amber-300 accent-amber-600"
                                    checked={!!r.clear_image}
                                    onChange={(e) =>
                                      setForm((f) => {
                                        const next = [...f.requirements];
                                        next[idx] = {
                                          ...next[idx],
                                          clear_image: e.target.checked,
                                          imageFile: e.target.checked ? null : next[idx].imageFile,
                                        };
                                        return { ...f, requirements: next };
                                      })
                                    }
                                  />
                                  Remove image
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 rounded-2xl bg-gradient-to-r from-amber-50 to-white border border-amber-100 px-4 py-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-amber-800">Kit total</span>
                      <span className="text-sm font-black text-gray-900">{formatFrw(computedTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-amber-100 p-4 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between bg-white shrink-0">
              {step === 2 ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setStep(1)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-amber-200 px-4 py-3 text-sm font-bold text-amber-900 min-h-[48px]"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <span />
              )}
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end flex-1">
                {step === 1 ? (
                  <button
                    type="button"
                    disabled={!canProceedStep1}
                    onClick={() => setStep(2)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-[#FEBF10] min-h-[48px] disabled:opacity-40"
                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={submit}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black text-[#FEBF10] min-h-[48px] disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      'Save kit'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
