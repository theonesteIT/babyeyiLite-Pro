import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Loader2, Save, Trash2 } from 'lucide-react';
import api from '../services/api';

function asMoney(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function parseClasses(v) {
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr.map((x) => String(x || '').trim()).filter(Boolean);
    } catch (_) {
      return v
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export default function BabyeyiFees() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    class_name: '',
    classes_text: '',
    term: '',
    academic_year: '',
    tuition_total: 0,
    paid_at_school_total: 0,
  });
  const [termFilter, setTermFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/accountant/babyeyi-fees', {
        params: {
          term: termFilter || undefined,
          academic_year: yearFilter || undefined,
        },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load');
      setList(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load fee cards');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [termFilter, yearFilter]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const loadDetail = async (id) => {
    setSelectedId(id);
    setDetail(null);
    setErr('');
    try {
      const res = await api.get(`/accountant/babyeyi-fees/${id}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load details');
      const row = res.data.data;
      const classes = parseClasses(row.classes_json);
      setDetail(row);
      setForm({
        class_name: row.class_name || '',
        classes_text: classes.join(', '),
        term: row.term || '',
        academic_year: row.academic_year || '',
        tuition_total: asMoney(row.tuition_total),
        paid_at_school_total: asMoney(row.paid_at_school_total),
      });
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load fee card');
    }
  };

  const totalDue = useMemo(
    () => Math.max(0, asMoney(form.tuition_total) + asMoney(form.paid_at_school_total)),
    [form.tuition_total, form.paid_at_school_total]
  );

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    setErr('');
    try {
      const classesJson = form.classes_text
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      const payload = {
        class_name: form.class_name,
        classes_json: classesJson,
        term: form.term,
        academic_year: form.academic_year,
        tuition_total: asMoney(form.tuition_total),
        paid_at_school_total: asMoney(form.paid_at_school_total),
      };
      const res = await api.put(`/accountant/babyeyi-fees/${selectedId}`, payload);
      if (!res.data?.success) throw new Error(res.data?.message || 'Save failed');
      await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to save fee card');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this fee card? Student Fees will show no card for these filters.')) return;
    setDeleting(true);
    setErr('');
    try {
      const res = await api.delete(`/accountant/babyeyi-fees/${selectedId}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      setSelectedId(null);
      setDetail(null);
      await loadList();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to delete fee card');
    } finally {
      setDeleting(false);
    }
  };

  const inp =
    'w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-re-navy focus:outline-none focus:ring-2 focus:ring-re-orange/30';

  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-re-navy">
            <FileSpreadsheet size={22} />
            <h1 className="text-lg sm:text-xl font-black tracking-tight">Babyeyi fee cards (totals)</h1>
          </div>
          <p className="text-re-text-muted text-xs sm:text-sm mt-1 max-w-2xl">
            Accountant-only table for Babyeyi totals: class/classes, term, academic year, tuition and paid-at-school.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            className={`${inp} w-36`}
            placeholder="Term"
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
          />
          <input
            className={`${inp} w-36`}
            placeholder="Academic year"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          />
          <button
            type="button"
            onClick={() => loadList()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white border border-black/10 hover:bg-re-bg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">{err}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-black/6 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-black/6 bg-re-bg/80">
            <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Fee cards</p>
          </div>
          <div className="max-h-[min(70vh,640px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-re-text-muted text-sm">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
              </div>
            ) : list.length === 0 ? (
              <p className="p-4 text-sm text-re-text-muted">No fee cards found for this filter.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {list.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => loadDetail(r.id)}
                      className={`w-full text-left px-4 py-3 text-xs sm:text-sm transition-colors hover:bg-re-bg/90 ${
                        selectedId === r.id ? 'bg-re-navy/8 border-l-4 border-re-orange' : ''
                      }`}
                    >
                      <p className="font-black text-re-navy truncate">
                        {r.class_name || 'Class'} - {r.term || '—'} - {r.academic_year || '—'}
                      </p>
                      <p className="text-[10px] text-re-text-muted mt-0.5 font-mono">Babyeyi #{r.babyeyi_id}</p>
                      <p className="text-[11px] mt-1 font-bold text-re-orange">
                        Total: {asMoney(r.total_due).toLocaleString()} RWF
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 rounded-2xl border border-black/6 bg-white shadow-sm p-4 sm:p-5">
          {!selectedId && (
            <p className="text-sm text-re-text-muted">Select a fee card to view or edit totals.</p>
          )}
          {detail && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-re-text-muted tracking-widest">Editing fee card</p>
                  <p className="text-base font-black text-re-navy mt-0.5">
                    Babyeyi #{detail.babyeyi_id} - {detail.term} - {detail.academic_year}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || deleting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={removeRow}
                    disabled={saving || deleting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete card
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className={inp}
                  placeholder="Main class"
                  value={form.class_name}
                  onChange={(e) => setForm((s) => ({ ...s, class_name: e.target.value }))}
                />
                <input
                  className={inp}
                  placeholder="Classes (comma separated)"
                  value={form.classes_text}
                  onChange={(e) => setForm((s) => ({ ...s, classes_text: e.target.value }))}
                />
                <input
                  className={inp}
                  placeholder="Term"
                  value={form.term}
                  onChange={(e) => setForm((s) => ({ ...s, term: e.target.value }))}
                />
                <input
                  className={inp}
                  placeholder="Academic year"
                  value={form.academic_year}
                  onChange={(e) => setForm((s) => ({ ...s, academic_year: e.target.value }))}
                />
                <input
                  type="number"
                  className={inp}
                  placeholder="Tuition total"
                  value={form.tuition_total}
                  onChange={(e) => setForm((s) => ({ ...s, tuition_total: e.target.value }))}
                />
                <input
                  type="number"
                  className={inp}
                  placeholder="Paid at school total"
                  value={form.paid_at_school_total}
                  onChange={(e) => setForm((s) => ({ ...s, paid_at_school_total: e.target.value }))}
                />
              </div>

              <div className="mt-4 rounded-xl bg-re-bg border border-black/5 p-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Computed total due</p>
                <p className="text-xl font-black text-re-navy mt-1">{totalDue.toLocaleString()} RWF</p>
                <p className="text-xs text-re-text-muted mt-1">Student Fees uses this value for amount to pay.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
