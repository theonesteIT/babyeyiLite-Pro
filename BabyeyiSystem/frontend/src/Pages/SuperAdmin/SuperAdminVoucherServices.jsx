// ================================================================
// Super Admin — Voucher & student services catalog (professional UI)
// API: /api/student-services/admin/*
// Branding: amber + slate (matches SuperAdminPage)
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
  Layers,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LogoutButton from '../Auth/LogoutButton';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_BASE || 'http://localhost:5100';
const axCfg = { headers: { 'Content-Type': 'application/json' }, withCredentials: true };

const ACCENT = '#1F2937';
/** Must match backend inferLevelFromClass() + public quote pricing */
const LEVEL_OPTIONS = ['Nursery', 'Pre-primary', 'Upper-Primary', 'O-Level', 'A-Level'];

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
    archived: 'bg-red-50 text-red-700 border-red-200',
  };
  const cls = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border capitalize ${cls}`}>
      {status}
    </span>
  );
}

const emptyForm = () => ({
  service_code: '',
  name: '',
  category: 'Voucher',
  description: '',
  short_tagline: '',
  academic_year: '2026-2027',
  eligibility_levels: ['Pre-primary', 'Upper-Primary'],
  default_pricing_type: 'global',
  global_amount: '15000',
  level_prices: LEVEL_OPTIONS.map((level) => ({ level, amount: '' })),
  school_prices: [],
  validity_start: '',
  validity_end: '',
  redemption_method: 'School pickup',
  delivery_method: 'School pickup',
  stock_quantity: '',
  payment_rules: '',
  terms_conditions: '',
  status: 'draft',
  iconFile: null,
});

export default function SuperAdminVoucherServices() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [schoolQuery, setSchoolQuery] = useState('');
  const [schoolHits, setSchoolHits] = useState([]);
  const [schoolPickLoading, setSchoolPickLoading] = useState(false);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4200);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/student-services/admin/services`, axCfg);
      if (res.data?.success) setRows(res.data.data || []);
      else showToast(res.data?.message || 'Failed to load', 'error');
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to load services', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!schoolQuery.trim() || schoolQuery.trim().length < 2) {
      setSchoolHits([]);
      return;
    }
    const t = setTimeout(async () => {
      setSchoolPickLoading(true);
      try {
        const res = await axios.get(`${API}/schools`, {
          ...axCfg,
          params: { search: schoolQuery.trim(), limit: 40, page: 1 },
        });
        if (res.data?.success) setSchoolHits(res.data.data || []);
      } catch {
        setSchoolHits([]);
      } finally {
        setSchoolPickLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [schoolQuery]);

  const openCreate = () => {
    setForm(emptyForm());
    setModal({ mode: 'create' });
  };

  const openEdit = async (svc) => {
    setSaving(false);
    try {
      const res = await axios.get(`${API}/student-services/admin/services/${svc.id}`, axCfg);
      if (!res.data?.success) throw new Error(res.data?.message || 'Load failed');
      const s = res.data.data;
      const prices = s.prices || [];
      const globalRow = prices.find((p) => p.pricing_type === 'global');
      const levelRows = LEVEL_OPTIONS.map((level) => {
        const hit = prices.find((p) => p.pricing_type === 'level' && p.level === level);
        return { level, amount: hit ? String(hit.amount) : '' };
      });
      const schRows = prices
        .filter((p) => p.pricing_type === 'school')
        .map((p) => ({
          school_id: p.school_id,
          school_name: `School #${p.school_id}`,
          amount: String(p.amount),
        }));

      setForm({
        id: s.id,
        service_code: s.service_code,
        name: s.name,
        category: s.category,
        description: s.description || '',
        short_tagline: s.short_tagline || '',
        academic_year: s.academic_year,
        eligibility_levels: Array.isArray(s.eligibility_levels) ? s.eligibility_levels : [],
        default_pricing_type: s.default_pricing_type || 'global',
        global_amount: globalRow ? String(globalRow.amount) : '0',
        level_prices: levelRows,
        school_prices: schRows,
        validity_start: s.validity_start ? String(s.validity_start).slice(0, 10) : '',
        validity_end: s.validity_end ? String(s.validity_end).slice(0, 10) : '',
        redemption_method: s.redemption_method || '',
        delivery_method: s.delivery_method || '',
        stock_quantity: s.stock_quantity != null ? String(s.stock_quantity) : '',
        payment_rules: s.payment_rules || '',
        terms_conditions: s.terms_conditions || '',
        status: s.status,
        iconFile: null,
        existing_icon_url: s.icon_url,
      });
      setModal({ mode: 'edit' });
    } catch (e) {
      showToast(e.message || 'Could not open service', 'error');
    }
  };

  const buildPricesPayload = () => {
    const ay = form.academic_year;
    if (form.default_pricing_type === 'global') {
      return [{ pricing_type: 'global', amount: parseFloat(String(form.global_amount)), academic_year: ay }];
    }
    if (form.default_pricing_type === 'by_level') {
      return form.level_prices
        .filter((r) => r.amount !== '' && !Number.isNaN(parseFloat(String(r.amount))))
        .map((r) => ({
          pricing_type: 'level',
          level: r.level,
          amount: parseFloat(String(r.amount)),
          academic_year: ay,
        }));
    }
    return form.school_prices
      .filter((r) => r.school_id && r.amount !== '' && !Number.isNaN(parseFloat(String(r.amount))))
      .map((r) => ({
        pricing_type: 'school',
        school_id: r.school_id,
        amount: parseFloat(String(r.amount)),
        academic_year: ay,
      }));
  };

  const submit = async () => {
    if (!form.service_code?.trim() || !form.name?.trim()) {
      showToast('Service code and name are required', 'error');
      return;
    }
    let prices;
    try {
      prices = buildPricesPayload();
    } catch {
      showToast('Check price fields', 'error');
      return;
    }
    const fd = new FormData();
    fd.append('service_code', form.service_code.trim());
    fd.append('name', form.name.trim());
    fd.append('category', form.category);
    fd.append('description', form.description || '');
    fd.append('short_tagline', form.short_tagline || '');
    fd.append('academic_year', form.academic_year);
    fd.append('eligibility_levels', JSON.stringify(form.eligibility_levels || []));
    fd.append('default_pricing_type', form.default_pricing_type);
    fd.append('validity_start', form.validity_start || '');
    fd.append('validity_end', form.validity_end || '');
    fd.append('redemption_method', form.redemption_method || '');
    fd.append('delivery_method', form.delivery_method || '');
    fd.append('stock_quantity', form.stock_quantity === '' ? '' : String(form.stock_quantity));
    fd.append('payment_rules', form.payment_rules || '');
    fd.append('terms_conditions', form.terms_conditions || '');
    fd.append('status', form.status);
    fd.append('prices', JSON.stringify(prices));
    if (form.iconFile) fd.append('icon', form.iconFile);

    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await axios.post(`${API}/student-services/admin/services`, fd, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Service created', 'success');
      } else {
        await axios.put(`${API}/student-services/admin/services/${form.id}`, fd, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Service updated', 'success');
      }
      setModal(null);
      load();
    } catch (e) {
      showToast(e.response?.data?.message || e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const archive = async (svc) => {
    if (!window.confirm(`Archive “${svc.name}”?`)) return;
    try {
      await axios.delete(`${API}/student-services/admin/services/${svc.id}`, axCfg);
      showToast('Archived', 'success');
      load();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed', 'error');
    }
  };

  const toggleLevel = (level) => {
    setForm((f) => {
      const set = new Set(f.eligibility_levels || []);
      if (set.has(level)) set.delete(level);
      else set.add(level);
      return { ...f, eligibility_levels: Array.from(set) };
    });
  };

  const addSchoolRow = (school) => {
    if (!school?.id) return;
    setForm((f) => {
      if (f.school_prices.some((r) => r.school_id === school.id)) return f;
      return {
        ...f,
        school_prices: [
          ...f.school_prices,
          { school_id: school.id, school_name: school.school_name, amount: '' },
        ],
      };
    });
    setSchoolQuery('');
    setSchoolHits([]);
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.service_code?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  if (auth.loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(160deg,#fffbeb 0%,#fef3c7 40%,#fde68a 100%)',
          fontFamily: 'Montserrat, sans-serif',
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
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

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
                Voucher Services
              </h1>
              <p className="text-[10px] text-amber-700">Configure ShuleShoes, Uniform, ShuleKit, and future student support</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <LogoutButton variant="default" size="sm" className="hidden sm:flex text-xs rounded-xl" />
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-[#FEBF10] shadow-lg active:scale-[0.98] transition"
              style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
            >
              <Plus className="w-4 h-4" /> Add service
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        <div className="rounded-2xl border-2 border-amber-100 bg-white/90 shadow-lg p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between mb-4">
            <div>
              <h2 className="text-sm font-black text-gray-900">Service catalog</h2>
              <p className="text-xs text-amber-800 mt-0.5">Global, by level, or by school pricing · professional voucher workflow</p>
            </div>
            <input
              className={`${inp} max-w-full sm:max-w-xs`}
              placeholder="Search name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-amber-100">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-amber-50/90 border-b-2 border-amber-100">
                  <th className="text-left py-3 px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider">Service</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider">Category</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider">From</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider">Levels</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider">Year</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider">Status</th>
                  <th className="text-right py-3 px-3 text-[10px] font-bold text-amber-800 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-amber-700">
                      <Loader2 className="w-7 h-7 animate-spin inline text-amber-500" />
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-amber-700 text-sm font-medium">
                      No services yet. Add ShuleShoes or Uniform voucher to get started.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.id} className="border-b border-amber-50 hover:bg-amber-50/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{r.name}</div>
                        <div className="text-[10px] text-amber-700 font-mono">{r.service_code}</div>
                      </td>
                      <td className="py-3 px-3 text-xs">{r.category}</td>
                      <td className="py-3 px-3 text-xs font-semibold text-gray-800 whitespace-nowrap">
                        {r.price_from != null ? (
                          <>
                            From {formatFrw(r.price_from)}
                            {r.price_to != null && Number(r.price_to) !== Number(r.price_from) ? (
                              <span className="text-amber-700 font-normal"> · up to {formatFrw(r.price_to)}</span>
                            ) : null}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-700 max-w-[140px]">
                        {Array.isArray(r.eligibility_levels) && r.eligibility_levels.length
                          ? r.eligibility_levels.join(', ')
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-xs whitespace-nowrap">{r.academic_year}</td>
                      <td className="py-3 px-3">{statusBadge(r.status)}</td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: ACCENT }}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        {r.status !== 'archived' ? (
                          <button
                            type="button"
                            onClick={() => archive(r)}
                            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            Archive
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-amber-700 mt-3">
            Tip: set status to <strong>Active</strong> when pricing and dates are final. Parents will see active catalog entries on public flows.
          </p>
        </div>

        <p className="text-center text-[11px] text-amber-800/80">
          <Link to="/superadmin/dashboard" className="font-bold underline underline-offset-2 hover:text-gray-900">
            Back to Super Admin
          </Link>
        </p>
      </main>

      {modal ? (
        <div className="fixed inset-0 z-[200] bg-gray-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col border-2 border-amber-100">
            <div className="flex items-center justify-between px-5 py-4 border-b-2 border-amber-100 shrink-0">
              <h3 className="text-base font-black text-gray-900">
                {modal.mode === 'create' ? 'Add voucher service' : 'Edit service'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-amber-50 text-amber-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Service name *</label>
                  <input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Service code *</label>
                  <input
                    className={inp}
                    value={form.service_code}
                    onChange={(e) => setForm({ ...form, service_code: e.target.value })}
                    placeholder="e.g. SHULESHOES_2026"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Category</label>
                  <select className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="Voucher">Voucher</option>
                    <option value="Kit">Kit</option>
                    <option value="Stationery">Stationery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Academic year *</label>
                  <input
                    className={inp}
                    value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                    placeholder="2026-2027"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Short benefit line</label>
                <input
                  className={inp}
                  value={form.short_tagline}
                  onChange={(e) => setForm({ ...form, short_tagline: e.target.value })}
                  placeholder="e.g. Approved footwear support for the school year"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Description</label>
                <textarea
                  className={`${inp} min-h-[88px]`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-800 uppercase mb-2">Eligible levels</label>
                <div className="flex flex-wrap gap-2">
                  {LEVEL_OPTIONS.map((lvl) => {
                    const on = (form.eligibility_levels || []).includes(lvl);
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => toggleLevel(lvl)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition ${
                          on
                            ? 'border-amber-400 bg-amber-100 text-gray-900'
                            : 'border-amber-100 bg-white text-amber-800 hover:bg-amber-50'
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-amber-800/90 leading-snug bg-amber-50/80 border border-amber-100 rounded-xl px-3 py-2">
                <strong>Level bands (student class):</strong> Nursery = N1–N3 · Pre-primary = P1–P3 · Upper-Primary = P4–P6 ·
                O-Level = S1–S3 · A-Level = S4–S6. Set one price per row for &quot;By school level&quot; pricing.
              </p>

              <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-black text-gray-900">
                  <Layers className="w-4 h-4 text-amber-600" /> Pricing model
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'global', label: 'Fixed (global)' },
                    { id: 'by_level', label: 'By school level' },
                    { id: 'by_school', label: 'By school' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm({ ...form, default_pricing_type: opt.id })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border-2 ${
                        form.default_pricing_type === opt.id
                          ? 'border-[#FEBF10] bg-[#1F2937] text-[#FEBF10]'
                          : 'border-amber-200 bg-white text-amber-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.default_pricing_type === 'global' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Amount (FRW)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className={inp}
                      value={form.global_amount}
                      onChange={(e) => setForm({ ...form, global_amount: e.target.value })}
                    />
                  </div>
                ) : null}

                {form.default_pricing_type === 'by_level' ? (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {form.level_prices.map((row, idx) => (
                      <div key={row.level} className="flex gap-2 items-center">
                        <span className="text-xs font-bold text-gray-700 w-24 shrink-0">{row.level}</span>
                        <input
                          type="number"
                          min="0"
                          className={`${inp} flex-1`}
                          placeholder="Frw"
                          value={row.amount}
                          onChange={(e) => {
                            const next = [...form.level_prices];
                            next[idx] = { ...next[idx], amount: e.target.value };
                            setForm({ ...form, level_prices: next });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {form.default_pricing_type === 'by_school' ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Add school</label>
                      <input
                        className={inp}
                        value={schoolQuery}
                        onChange={(e) => setSchoolQuery(e.target.value)}
                        placeholder="Type school name or code…"
                      />
                      {schoolPickLoading ? (
                        <Loader2 className="absolute right-3 top-9 w-4 h-4 animate-spin text-amber-500" />
                      ) : null}
                      {schoolHits.length > 0 ? (
                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border-2 border-amber-100 bg-white shadow-xl">
                          {schoolHits.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 border-b border-amber-50 last:border-0"
                              onClick={() => addSchoolRow(s)}
                            >
                              <span className="font-bold text-gray-900">{s.school_name}</span>
                              <span className="text-amber-700 ml-2">{s.school_code}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {form.school_prices.map((row, idx) => (
                      <div key={`${row.school_id}-${idx}`} className="flex flex-wrap gap-2 items-center">
                        <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-semibold flex-1 min-w-[120px]">{row.school_name}</span>
                        <input
                          type="number"
                          min="0"
                          className={`${inp} w-36`}
                          placeholder="Frw"
                          value={row.amount}
                          onChange={(e) => {
                            const next = [...form.school_prices];
                            next[idx] = { ...next[idx], amount: e.target.value };
                            setForm({ ...form, school_prices: next });
                          }}
                        />
                        <button
                          type="button"
                          className="text-xs font-bold text-red-600 px-2"
                          onClick={() =>
                            setForm({
                              ...form,
                              school_prices: form.school_prices.filter((_, i) => i !== idx),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Validity start</label>
                  <input
                    type="date"
                    className={inp}
                    value={form.validity_start}
                    onChange={(e) => setForm({ ...form, validity_start: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Validity end</label>
                  <input
                    type="date"
                    className={inp}
                    value={form.validity_end}
                    onChange={(e) => setForm({ ...form, validity_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Redemption</label>
                  <input
                    className={inp}
                    value={form.redemption_method}
                    onChange={(e) => setForm({ ...form, redemption_method: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Delivery / collection</label>
                  <input
                    className={inp}
                    value={form.delivery_method}
                    onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Stock (leave empty = unlimited)</label>
                  <input
                    type="number"
                    min="0"
                    className={inp}
                    value={form.stock_quantity}
                    onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Status</label>
                  <select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Payment / approval rules</label>
                <textarea
                  className={`${inp} min-h-[72px]`}
                  value={form.payment_rules}
                  onChange={(e) => setForm({ ...form, payment_rules: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">Terms & conditions</label>
                <textarea
                  className={`${inp} min-h-[72px]`}
                  value={form.terms_conditions}
                  onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1 flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5" /> Service image / icon
                </label>
                {(form.existing_icon_url || form.iconFile) && (
                  <div className="mb-2 flex items-center gap-3">
                    {form.iconFile ? (
                      <img
                        src={URL.createObjectURL(form.iconFile)}
                        alt=""
                        className="h-14 w-14 rounded-xl object-cover border border-amber-100"
                      />
                    ) : form.existing_icon_url ? (
                      <img
                        src={toAssetUrl(form.existing_icon_url)}
                        alt=""
                        className="h-14 w-14 rounded-xl object-cover border border-amber-100"
                      />
                    ) : null}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="text-xs text-amber-900 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1F2937] file:text-[#FEBF10]"
                  onChange={(e) => setForm({ ...form, iconFile: e.target.files?.[0] || null })}
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t-2 border-amber-100 flex gap-2 justify-end shrink-0 bg-amber-50/30">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-amber-200 text-amber-900 bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={submit}
                className="px-5 py-2.5 rounded-xl text-sm font-black text-[#FEBF10] disabled:opacity-50 flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #111827 100%)` }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {modal.mode === 'create' ? 'Create service' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
