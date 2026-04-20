import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Percent,
  Wallet,
  Banknote,
  Sparkles,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const ax = { withCredentials: true, headers: { 'Content-Type': 'application/json' } };

const NAVY = '#000435';
const AMBER = '#F59E0B';

function slugify(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 64);
}

export default function ShuleAvanceTeacher() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/auth/shule-avance-teacher-catalog?include_inactive=1`, ax);
      if (data.success) setRows(Array.isArray(data.data) ? data.data : []);
      else setErr(data.message || 'Failed to load');
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const services = useMemo(() => rows.filter((r) => r.item_kind === 'service'), [rows]);
  const cashouts = useMemo(() => rows.filter((r) => r.item_kind === 'cashout'), [rows]);

  const openCreate = (kind) => {
    setModal({
      mode: 'create',
      item_kind: kind,
      slug: '',
      label: '',
      description: '',
      income_rate_percent: kind === 'service' ? '2.5' : '3',
      sort_order: '0',
      is_active: true,
    });
  };

  const openEdit = (row) => {
    setModal({
      mode: 'edit',
      id: row.id,
      item_kind: row.item_kind,
      slug: row.slug,
      label: row.label,
      description: row.description || '',
      income_rate_percent: String(row.income_rate_percent ?? '0'),
      sort_order: String(row.sort_order ?? 0),
      is_active: !!Number(row.is_active),
    });
  };

  const saveModal = async () => {
    if (!modal) return;
    setSaving(true);
    setErr('');
    try {
      const body = {
        item_kind: modal.item_kind,
        slug: modal.slug?.trim() || slugify(modal.label),
        label: modal.label.trim(),
        description: modal.description?.trim() || null,
        income_rate_percent: Number(modal.income_rate_percent),
        sort_order: Number(modal.sort_order) || 0,
        is_active: modal.is_active,
      };
      if (!body.label) throw new Error('Label is required');
      if (!body.slug) throw new Error('Slug is required');
      if (!Number.isFinite(body.income_rate_percent) || body.income_rate_percent < 0 || body.income_rate_percent > 100) {
        throw new Error('Income rate must be between 0 and 100');
      }
      if (modal.mode === 'create') {
        await axios.post(`${API}/auth/shule-avance-teacher-catalog`, body, ax);
      } else {
        await axios.patch(`${API}/auth/shule-avance-teacher-catalog/${modal.id}`, body, ax);
      }
      setModal(null);
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this catalog item? Existing requests keep their stored text.')) return;
    setErr('');
    try {
      await axios.delete(`${API}/auth/shule-avance-teacher-catalog/${id}`, ax);
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || 'Delete failed');
    }
  };

  const CatalogTable = ({ title, subtitle, kind, data, Icon }) => (
    <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/40 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl shrink-0"
            style={{ background: `${AMBER}18`, color: AMBER }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openCreate(kind)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg transition hover:opacity-95"
          style={{ background: `linear-gradient(135deg, ${AMBER}, #ea580c)` }}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/90 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Monthly rate</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400 font-semibold text-sm">
                  No items yet — add your first entry.
                </td>
              </tr>
            ) : (
              data.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{r.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.slug}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-900 border border-amber-100">
                      <Percent className="h-3 w-3" />
                      {Number(r.income_rate_percent).toFixed(2)}% / mo
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-semibold">{r.sort_order}</td>
                  <td className="px-4 py-3">
                    {Number(r.is_active) ? (
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        Off
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 hover:border-amber-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/superadmin/dashboard')}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Platform configuration</p>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 truncate">ShuleAvance Teacher Catalog</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Global rates · All schools
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div
          className="rounded-3xl p-6 sm:p-8 text-white shadow-2xl overflow-hidden relative"
          style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1e3a5f 50%, #0f172a 100%)` }}
        >
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.35),transparent_45%)]" />
          <div className="relative z-10 max-w-2xl space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Service &amp; cashout programs</h2>
            <p className="text-sm text-white/75 font-medium leading-relaxed">
              Define request types teachers and staff see in every school. Each line has a <strong>monthly income rate</strong>{' '}
              used in repayment estimates (simple interest: principal × rate × months).
            </p>
          </div>
        </div>

        {err && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {err}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="space-y-8">
            <CatalogTable
              title="Service requests"
              subtitle="Cash power, airtime, deals — vendor-style advances"
              kind="service"
              data={services}
              Icon={Wallet}
            />
            <CatalogTable
              title="Cashout requests"
              subtitle="Staff cash advances — pick a type, then describe the need"
              kind="cashout"
              data={cashouts}
              Icon={Banknote}
            />
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">
                {modal.mode === 'create' ? 'Add catalog item' : 'Edit catalog item'}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Kind</label>
                <p className="mt-1 text-sm font-bold text-slate-800 capitalize">{modal.item_kind}</p>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Label *</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-200"
                  value={modal.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setModal((m) => ({
                      ...m,
                      label,
                      slug: m.mode === 'create' ? slugify(label) : m.slug,
                    }));
                  }}
                  placeholder="e.g. Airtime & Data"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Slug *</label>
                <input
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  value={modal.slug}
                  onChange={(e) => setModal((m) => ({ ...m, slug: slugify(e.target.value) }))}
                  placeholder="airtime_data"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</label>
                <textarea
                  className="mt-1 w-full min-h-[72px] rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-200"
                  value={modal.description}
                  onChange={(e) => setModal((m) => ({ ...m, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monthly rate % *</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="100"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
                    value={modal.income_rate_percent}
                    onChange={(e) => setModal((m) => ({ ...m, income_rate_percent: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sort order</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-200"
                    value={modal.sort_order}
                    onChange={(e) => setModal((m) => ({ ...m, sort_order: e.target.value }))}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModal((m) => ({ ...m, is_active: !m.is_active }))}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800"
              >
                Active
                {modal.is_active ? (
                  <ToggleRight className="h-8 w-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-slate-300" />
                )}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveModal}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${AMBER}, #ea580c)` }}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
