import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import disciplineService from '../services/disciplineService';
import DisciplineOchreHero from '../components/DisciplineOchreHero';

const APPLY_TARGETS = [
  { value: 'new', label: 'New students only' },
  { value: 'all', label: 'All students (overwrite existing)' },
];

function Toast({ toast }) {
  if (!toast.message) return null;
  const isError = toast.type === 'error';
  return (
    <div
      className={`fixed top-4 right-4 z-[400] px-4 py-3 rounded-xl text-sm font-bold text-white shadow-xl ${
        isError ? 'bg-red-600' : 'bg-emerald-600'
      }`}
    >
      {toast.message}
    </div>
  );
}

export default function DisciplineSettings() {
  const [defaultMarks, setDefaultMarks] = useState('40');
  const [applyTarget, setApplyTarget] = useState('new');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  const notify = (type, message) => {
    setToast({ type, message });
    clearTimeout(window.__disciplineSettingsToast);
    window.__disciplineSettingsToast = setTimeout(() => setToast({ type: '', message: '' }), 3000);
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await disciplineService.getSettings();
      const data = res.data?.data || {};
      if (data.default_marks != null) setDefaultMarks(String(data.default_marks));
      setSettings(data);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const parsedMarks = Number(defaultMarks);
  const marksValid = Number.isFinite(parsedMarks) && parsedMarks >= 0 && parsedMarks <= 100;

  const runApply = async (confirmedAll = false) => {
    if (!marksValid) {
      notify('error', 'Default marks must be a number between 0 and 100.');
      return;
    }

    if (applyTarget === 'all' && !confirmedAll) {
      setConfirmOpen(true);
      return;
    }

    setSaving(true);
    try {
      await disciplineService.updateDefaultMarks({
        default_marks: parsedMarks,
        apply_to: applyTarget === 'all' ? 'all' : 'new',
        confirmed_overwrite: applyTarget === 'all',
      });
      notify('success', 'Discipline settings updated successfully.');
      setConfirmOpen(false);
      fetchSettings();
    } catch (e) {
      notify('error', e.response?.data?.message || 'Failed to update discipline settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-re-bg pb-10">
      <Toast toast={toast} />
      <DisciplineOchreHero
        eyebrow="Module configuration"
        titleLine="Discipline"
        titleAccent="settings"
        subtitle="Configure default discipline marks and apply rules with a cleaner manager-style experience."
        icon={Settings2}
      />

      {confirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-black/10 shadow-2xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-re-text uppercase tracking-wide">Confirm overwrite</h3>
                <p className="text-sm text-re-text-muted mt-2 leading-relaxed">
                  You are about to set discipline marks = <strong>{parsedMarks}</strong> for all students.
                  This will overwrite existing values.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-10 px-4 rounded-xl border border-black/10 text-xs font-black uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => runApply(true)}
                disabled={saving}
                className="h-10 px-4 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 space-y-5">
        <div className="rounded-2xl bg-white border border-black/10 p-5 md:p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Settings2 size={18} />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-re-text-muted">Discipline module</p>
                <h1 className="text-lg md:text-xl font-semibold text-re-text">Default Discipline Marks</h1>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchSettings}
              className="h-10 px-3 rounded-xl border border-black/10 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-black/5 p-5 md:p-6 shadow-sm space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Default marks</span>
              <input
                type="number"
                min="0"
                max="100"
                value={defaultMarks}
                onChange={(e) => setDefaultMarks(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-black/10 bg-re-bg/30 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </label>

            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-re-text-muted">Apply to</p>
              <div className="space-y-2">
                {APPLY_TARGETS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 rounded-xl border border-black/10 bg-re-bg/20 px-3 py-2">
                    <input
                      type="radio"
                      className="accent-orange-500"
                      checked={applyTarget === opt.value}
                      onChange={() => setApplyTarget(opt.value)}
                    />
                    <span className="text-sm font-semibold text-re-text">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || !marksValid}
              onClick={() => runApply(false)}
              className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Apply to students
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={fetchSettings}
              className="h-10 px-4 rounded-xl border border-black/10 text-xs font-black uppercase tracking-widest"
            >
              Reset / Update
            </button>
          </div>

          {!marksValid && (
            <p className="text-xs font-bold text-red-600">Use marks between 0 and 100.</p>
          )}
        </div>

        <div className="rounded-2xl bg-white border border-black/5 p-5 md:p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-re-text-muted mb-3">Current backend values</h2>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl border border-black/10 bg-re-bg/30 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Default marks</p>
              <p className="font-black text-re-text mt-1">{settings?.default_marks ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-re-bg/30 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Last updated</p>
              <p className="font-black text-re-text mt-1">{settings?.last_updated ? new Date(settings.last_updated).toLocaleString() : '—'}</p>
            </div>
            <div className="rounded-xl border border-black/10 bg-re-bg/30 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted">Updated by</p>
              <p className="font-black text-re-text mt-1">{settings?.updated_by || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
