import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, RefreshCw, AlertCircle, Settings2, Save, Loader2, CheckCircle2, X } from 'lucide-react';
import DisciplineOchreHero from '../components/DisciplineOchreHero';

/**
 * Head of discipline — settings and summary entry point.
 * Backend: GET /api/discipline/settings, /api/discipline/students-summary (HOD role).
 */
export default function ConductOverview() {
  const [totalMarks, setTotalMarks] = useState(null);
  const [defaultMarks, setDefaultMarks] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [form, setForm] = useState({
    defaultMarks: '40',
    applyTo: 'new',
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const setRes = await api.get('/discipline/settings');
      if (setRes.data?.success && setRes.data.data?.total_marks != null) {
        setTotalMarks(Number(setRes.data.data.total_marks));
        setDefaultMarks(
          setRes.data.data?.default_marks != null ? Number(setRes.data.data.default_marks) : null
        );
        if (setRes.data.data?.default_marks != null) {
          setForm((prev) => ({ ...prev, defaultMarks: String(setRes.data.data.default_marks) }));
        }
      } else {
        setTotalMarks(null);
        setDefaultMarks(null);
        setError('Could not read conduct settings for your school.');
      }
    } catch (e) {
      setTotalMarks(null);
      setDefaultMarks(null);
      setError(
        e.response?.data?.message ||
          'Could not load conduct settings. Your account needs Head of Discipline (or school manager) access.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const parsedDefault = Number(form.defaultMarks);
  const defaultMarksValid =
    Number.isFinite(parsedDefault) && parsedDefault >= 0 && parsedDefault <= 100;

  const saveDefaultMarks = async () => {
    setSaveError('');
    setSaveSuccess('');
    if (!defaultMarksValid) {
      setSaveError('Default marks must be a number between 0 and 100.');
      return;
    }

    setSavingDefaults(true);
    try {
      const res = await api.put('/discipline/settings/default-marks', {
        default_marks: parsedDefault,
        apply_to: form.applyTo,
        confirmed_overwrite: form.applyTo === 'all',
      });
      const updated = res.data?.data?.updated_students;
      const message = res.data?.message || 'Default discipline marks saved.';
      setSaveSuccess(
        Number.isFinite(updated)
          ? `${message} Updated ${updated} student${updated === 1 ? '' : 's'}.`
          : message
      );
      await load();
    } catch (e) {
      setSaveError(e.response?.data?.message || 'Failed to save default discipline marks.');
    } finally {
      setSavingDefaults(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">
      <DisciplineOchreHero
        eyebrow="Conduct & discipline"
        titleLine="Overview"
        titleAccent="hub"
        subtitle="School conduct scale and learner summaries. Use students and attendance alongside this for full context."
        icon={Shield}
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-30">
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-sm font-medium text-re-text uppercase tracking-wide">At a glance</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSaveError('');
                  setSaveSuccess('');
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#000435] text-white text-xs font-semibold uppercase tracking-wide hover:opacity-95"
              >
                <Settings2 size={14} />
                Add default marks
              </button>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10 text-xs font-medium uppercase tracking-wide hover:bg-re-bg"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <AlertCircle className="shrink-0 w-5 h-5" />
              <p className="font-medium leading-snug">{error}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-black/10 bg-re-bg/40 p-5 shadow-inner">
              <p className="text-[9px] font-medium uppercase tracking-wide text-re-text-muted mb-1">
                Conduct scale (school)
              </p>
              <p className="text-2xl font-semibold text-re-text">
                {loading ? '…' : totalMarks != null ? `${totalMarks} marks` : '—'}
              </p>
              <p className="text-[10px] font-medium text-re-text-muted mt-2 leading-snug">
                Total marks on your school conduct scale before a learner reaches the floor. Full per-learner breakdowns
                use academic year and term (we can add filters here next).
              </p>
            </div>
            <div className="rounded-xl border border-black/10 bg-re-bg/40 p-5 shadow-inner">
              <p className="text-[9px] font-medium uppercase tracking-wide text-re-text-muted mb-1">Default marks</p>
              <p className="text-2xl font-semibold text-re-text">
                {loading ? '…' : defaultMarks != null ? `${defaultMarks} marks` : '—'}
              </p>
              <p className="text-[10px] font-medium text-re-text-muted mt-2 leading-snug">
                Set a professional default baseline for student discipline marks. You can apply it to new students
                only, or all students when needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-black/10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-black/10 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-re-text">Add Student Default Discipline Marks</h3>
                  <p className="text-xs text-re-text-muted mt-1">
                    Save default marks to the database and apply by academic context.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-black/10 inline-flex items-center justify-center text-re-text-muted hover:bg-re-bg"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="space-y-1.5 block">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-re-text-muted">Default marks</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.defaultMarks}
                    onChange={(e) => setForm((prev) => ({ ...prev, defaultMarks: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/20 px-4 text-sm font-semibold"
                  />
                </label>
                <label className="space-y-1.5 block">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-re-text-muted">Apply to</span>
                  <select
                    value={form.applyTo}
                    onChange={(e) => setForm((prev) => ({ ...prev, applyTo: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/20 px-4 text-sm font-semibold"
                  >
                    <option value="new">New students only</option>
                    <option value="all">All students (overwrite existing)</option>
                  </select>
                </label>
              </div>

              {form.applyTo === 'all' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  This will overwrite discipline marks for all students in your school.
                </div>
              )}
              {!defaultMarksValid && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  Default marks must be between 0 and 100.
                </div>
              )}
              {saveError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 inline-flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  {saveSuccess}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-black/10 bg-re-bg/20 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-10 px-4 rounded-xl border border-black/10 text-xs font-semibold uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDefaultMarks}
                disabled={savingDefaults || !defaultMarksValid}
                className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
              >
                {savingDefaults ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save to database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
