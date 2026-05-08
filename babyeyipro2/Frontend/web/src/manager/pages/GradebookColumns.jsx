import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Table2, Plus, Trash2, Save, RefreshCw, Loader2,
} from 'lucide-react';
import {
  operationsInnerFieldCls,
  operationsInnerFieldMonoCls,
  operationsInnerTableInputCls,
} from '../utils/operationsFormUi';

function slugifyLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export default function GradebookColumns({ embedded = false }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    label: '',
    slug: '',
    sort_order: 0,
    default_max_score: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dos/gradebook-columns');
      if (res.data.success) setRows(res.data.data || []);
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.message || 'Failed to load gradebook columns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const slug = (form.slug && form.slug.trim()) ? form.slug.trim() : slugifyLabel(form.label);
    if (!form.label.trim() || !slug) {
      alert('Enter a column label (and optional slug).');
      return;
    }
    setAdding(true);
    try {
      const res = await api.post('/dos/gradebook-columns', {
        slug,
        label: form.label.trim(),
        sort_order: Number(form.sort_order) || 0,
        default_max_score: form.default_max_score === '' ? null : Number(form.default_max_score),
      });
      if (res.data.success) {
        setForm({ label: '', slug: '', sort_order: 0, default_max_score: '' });
        await load();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Could not add column');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (row) => {
    setSavingId(row.id);
    try {
      await api.put(`/dos/gradebook-columns/${row.id}`, {
        label: row.label,
        sort_order: Number(row.sort_order) || 0,
        default_max_score: row.default_max_score === '' || row.default_max_score == null
          ? null
          : Number(row.default_max_score),
      });
      await load();
    } catch (e) {
      alert(e.response?.data?.message || 'Update failed');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove column "${row.label}"? Teachers can no longer tag assessments to this slot until you add it again.`)) return;
    try {
      await api.delete(`/dos/gradebook-columns/${row.id}`);
      await load();
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const patchRow = (id, patch) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const shell = embedded
    ? 'max-w-none mx-0 p-0 space-y-5 animate-in fade-in duration-300'
    : 'max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500';

  return (
    <div className={shell}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-re-navy">
            <Table2 className={`${embedded ? 'w-6 h-6' : 'w-7 h-7'}`} />
            {embedded ? (
              <h2 className="text-lg font-black tracking-tight text-[#1E3A5F] uppercase">Gradebook columns</h2>
            ) : (
              <h1 className="text-xl md:text-2xl font-black tracking-tight">Gradebook columns</h1>
            )}
          </div>
          <p className={`text-re-text-muted mt-1 max-w-xl ${embedded ? 'text-[11px]' : 'text-sm'}`}>
            Define the score slots your school uses (for example CAT 1, CAT 2, Examination). Teachers attach each assessment to one of these columns when they record marks.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10 text-xs font-black uppercase tracking-widest hover:bg-re-bg transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <form onSubmit={handleAdd} className="rounded-2xl border border-black/5 bg-re-bg/40 p-4 md:p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-re-navy">Add column</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted block mb-1">Label</label>
            <input
              className={operationsInnerFieldCls}
              placeholder="e.g. CAT 1"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted block mb-1">Slug (optional)</label>
            <input
              className={operationsInnerFieldMonoCls}
              placeholder="auto from label"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted block mb-1">Sort order</label>
            <input
              type="number"
              className={operationsInnerFieldCls}
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-re-text-muted block mb-1">Default max score</label>
            <input
              type="number"
              className={operationsInnerFieldCls}
              placeholder="e.g. 30"
              value={form.default_max_score}
              onChange={(e) => setForm((f) => ({ ...f, default_max_score: e.target.value }))}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-re-navy text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
        >
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add column
        </button>
      </form>

      <div className="rounded-2xl border border-black/5 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-black/5 bg-re-bg/30 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-re-text-muted">Configured columns</h2>
          {loading && <Loader2 size={16} className="animate-spin text-re-navy" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-re-text-muted border-b border-black/5">
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 w-24">Order</th>
                <th className="px-4 py-3 w-28">Max</th>
                <th className="px-4 py-3 w-40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-re-text-muted font-bold text-xs">
                    No columns yet. Defaults are created on first use; add your own above.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-re-bg/20">
                  <td className="px-4 py-3">
                    <input
                      className={`${operationsInnerTableInputCls} min-w-[140px]`}
                      value={row.label}
                      onChange={(e) => patchRow(row.id, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-re-text-muted">{row.slug}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className={operationsInnerTableInputCls}
                      value={row.sort_order}
                      onChange={(e) => patchRow(row.id, { sort_order: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className={operationsInnerTableInputCls}
                      value={row.default_max_score ?? ''}
                      onChange={(e) => patchRow(row.id, { default_max_score: e.target.value })}
                    />
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => handleUpdate(row)}
                      disabled={savingId === row.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider"
                    >
                      <Save size={12} />
                      {savingId === row.id ? '…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
