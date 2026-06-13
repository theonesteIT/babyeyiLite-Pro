import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Check, AlertTriangle, Edit3, Plus,
} from 'lucide-react';
import api from '../services/api';
import { fmt12, normalizeTime, parseActivityDays } from '../utils/extraActivityUtils';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function ExtraActivityFormModal({
  open,
  onClose,
  onSaved,
  flash,
  classOptions = [],
  activeDays = WEEK_DAYS,
  availableTerms = ['Term 1', 'Term 2', 'Term 3'],
  availableYears = [],
  defaultTerm = '',
  defaultYear = '',
  defaultClass = '',
  /** { mode: 'add'|'edit'|'replace', editingId?, replacingIds?, initial? } */
  config = null,
}) {
  const [form, setForm] = useState({
    activity_name: '',
    class_names: [],
    days: [],
    start_time: '14:30',
    end_time: '15:10',
    notes: '',
    term: '',
    academic_year: '',
  });
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);

  const yearOptions = useMemo(() => {
    const set = new Set([...(availableYears || []), defaultYear, form.academic_year].filter(Boolean));
    return [...set];
  }, [availableYears, defaultYear, form.academic_year]);

  const editingId = config?.mode === 'edit' ? config.editingId : null;
  const replacingIds = config?.mode === 'replace' ? (config.replacingIds || []) : [];
  const isEdit = config?.mode === 'edit';
  const isReplace = config?.mode === 'replace';

  const initKeyRef = useRef('');
  const configSessionKey = open
    ? `${config?.mode || 'add'}-${config?.editingId || ''}-${(config?.replacingIds || []).join(',')}`
    : '';

  // Init form once per open session — never reset while user is editing
  useEffect(() => {
    if (!open) {
      initKeyRef.current = '';
      return;
    }
    if (initKeyRef.current === configSessionKey) return;
    initKeyRef.current = configSessionKey;

    const t = config?.initial?.term || defaultTerm || availableTerms[0] || 'Term 1';
    const y = config?.initial?.academic_year || defaultYear || yearOptions[0] || '2025-2026';

    if (config?.initial) {
      const init = config.initial;
      setForm({
        activity_name: init.activity_name || '',
        class_names: init.class_names?.length ? [...init.class_names] : (init.class_name ? [init.class_name] : []),
        days: init.days?.length ? [...init.days] : parseActivityDays(init),
        start_time: normalizeTime(init.start_time) || '14:30',
        end_time: normalizeTime(init.end_time) || '15:10',
        notes: init.notes || '',
        term: init.term || t,
        academic_year: init.academic_year || y,
      });
    } else {
      const cls = defaultClass || '';
      setForm({
        activity_name: '',
        class_names: cls ? [cls] : [],
        days: [],
        start_time: '14:30',
        end_time: '15:10',
        notes: '',
        term: t,
        academic_year: y,
      });
    }
    setValidation(null);
  }, [open, configSessionKey, config, defaultTerm, defaultYear, defaultClass, availableTerms, yearOptions]);

  const schedulePayload = useMemo(() => ({
    class_names: form.class_names,
    days: form.days,
    start_time: form.start_time,
    end_time: form.end_time,
    term: form.term,
    academic_year: form.academic_year,
  }), [
    form.class_names,
    form.days,
    form.start_time,
    form.end_time,
    form.term,
    form.academic_year,
  ]);

  const runValidate = useCallback(async (payload) => {
    if (!payload.class_names?.length || !payload.days?.length || !payload.start_time || !payload.end_time) {
      setValidation(null);
      return null;
    }
    setValidating(true);
    try {
      const res = await api.post('/dos/timetable-system/extra-activities/validate', {
        class_names: payload.class_names,
        days: payload.days,
        start_time: payload.start_time,
        end_time: payload.end_time,
        term: payload.term,
        academic_year: payload.academic_year,
        exclude_id: editingId || undefined,
        exclude_ids: replacingIds.length ? replacingIds : undefined,
      });
      const data = res.data?.data || null;
      setValidation(data);
      return data;
    } catch {
      setValidation(null);
      return null;
    } finally {
      setValidating(false);
    }
  }, [editingId, replacingIds]);

  const canCheckSlots = schedulePayload.class_names.length > 0
    && schedulePayload.days.length > 0
    && schedulePayload.start_time
    && schedulePayload.end_time;

  const scheduleKey = JSON.stringify(schedulePayload);
  const lastCheckedScheduleKeyRef = useRef('');

  // Clear stale validation when times/classes/days change (no API call)
  useEffect(() => {
    if (!open) {
      lastCheckedScheduleKeyRef.current = '';
      return;
    }
    if (lastCheckedScheduleKeyRef.current && lastCheckedScheduleKeyRef.current !== scheduleKey) {
      setValidation(null);
    }
  }, [open, scheduleKey]);

  const handleCheckSlots = async () => {
    const result = await runValidate(schedulePayload);
    if (result) lastCheckedScheduleKeyRef.current = scheduleKey;
  };

  const toggleClass = (cls) => {
    if (isEdit) return;
    setForm((p) => ({
      ...p,
      class_names: p.class_names.includes(cls)
        ? p.class_names.filter((c) => c !== cls)
        : [...p.class_names, cls],
    }));
  };

  const toggleDay = (day) => {
    setForm((p) => ({
      ...p,
      days: p.days.includes(day) ? p.days.filter((d) => d !== day) : [...p.days, day],
    }));
  };

  const classStatus = (cls) => validation?.by_class?.[cls];

  const handleSave = async () => {
    if (!form.activity_name?.trim() || !form.class_names.length || !form.days.length) {
      flash?.('error', 'Activity name, at least one class, and at least one day are required');
      return;
    }
    if (!form.term || !form.academic_year) {
      flash?.('error', 'Select academic term and year');
      return;
    }
    setSaving(true);
    try {
      const latestValidation = await runValidate(schedulePayload);
      if (latestValidation && !latestValidation.ok) {
        flash?.('error', latestValidation.messages?.join(' ') || 'Fix conflicts first');
        return;
      }

      const payload = {
        activity_name: form.activity_name.trim(),
        days: form.days,
        start_time: form.start_time,
        end_time: form.end_time,
        term: form.term,
        academic_year: form.academic_year,
        notes: form.notes,
      };

      if (isEdit && editingId) {
        await api.put(`/dos/timetable-system/extra-activities/${editingId}`, {
          ...payload,
          class_name: form.class_names[0],
        });
        flash?.('success', 'Updated — synced to timetables');
      } else {
        if (replacingIds.length) {
          for (const id of replacingIds) {
            await api.delete(`/dos/timetable-system/extra-activities/${id}`);
          }
        }
        const res = await api.post('/dos/timetable-system/extra-activities', {
          ...payload,
          class_names: form.class_names,
        });
        const count = res.data?.data?.class_names?.length || form.class_names.length;
        flash?.('success', `Added for ${count} class(es) — synced to timetables`);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      if (err.response?.data?.validation) setValidation(err.response.data.validation);
      flash?.('error', err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const applySuggestion = (s) => {
    setForm((p) => ({
      ...p,
      days: [s.day],
      start_time: normalizeTime(s.start_time),
      end_time: normalizeTime(s.end_time),
    }));
  };

  if (!open) return null;

  const title = isEdit ? 'Edit activity' : isReplace ? `Edit ${replacingIds.length} classes` : 'Add extra activity';
  const multiClass = !isEdit && form.class_names.length > 1;
  const displayDays = activeDays?.length ? activeDays : WEEK_DAYS;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2800] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-black/5 overflow-hidden max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-black/5 bg-gradient-to-r from-fuchsia-600 to-purple-600 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isEdit ? <Edit3 size={16} className="text-white/90" /> : <Plus size={16} className="text-white/90" />}
                <h3 className="text-base font-black text-white">{title}</h3>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10">
                <X size={18} className="text-white" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {/* Step 1: Basics */}
            <section>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">1 · Details</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#94a3b8] mb-1">Activity name</label>
                  <input
                    value={form.activity_name}
                    onChange={(e) => setForm((p) => ({ ...p, activity_name: e.target.value }))}
                    placeholder="HOMEWORK, Debate…"
                    className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-fuchsia-300"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#94a3b8] mb-1">Term</label>
                    <select
                      value={form.term}
                      onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"
                    >
                      {availableTerms.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#94a3b8] mb-1">Year</label>
                    <select
                      value={form.academic_year}
                      onChange={(e) => setForm((p) => ({ ...p, academic_year: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"
                    >
                      {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#94a3b8] mb-1">Start</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#94a3b8] mb-1">End</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                      className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Step 2: Days */}
            <section>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8] mb-2">
                2 · Days {form.days.length > 0 && <span className="text-fuchsia-600">({form.days.length} selected)</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {displayDays.map((d) => {
                  const on = form.days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      className={`min-w-[52px] px-3 py-2.5 rounded-xl text-[11px] font-black uppercase transition-all ${
                        on
                          ? 'bg-fuchsia-600 text-white shadow-md scale-105'
                          : 'bg-[#f8fafc] border border-black/10 text-[#64748b] hover:border-fuchsia-300'
                      }`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 3: Classes */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#94a3b8]">
                  3 · Classes {form.class_names.length > 0 && <span className="text-fuchsia-600">({form.class_names.length})</span>}
                </p>
                {!isEdit && classOptions.length > 1 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, class_names: [...classOptions] }))}
                      className="text-[9px] font-black uppercase text-fuchsia-700 hover:underline"
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, class_names: [] }))}
                      className="text-[9px] font-black uppercase text-[#94a3b8] hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              {isEdit && (
                <p className="text-[10px] text-[#64748b] font-semibold mb-2">{form.class_names[0]}</p>
              )}
              {!isEdit && (
                <div className="max-h-[160px] overflow-y-auto rounded-xl border border-black/5 p-2 bg-[#f8fafc]">
                  <div className="flex flex-wrap gap-1.5">
                    {classOptions.map((c) => {
                      const selected = form.class_names.includes(c);
                      const status = classStatus(c);
                      let cls = 'bg-white border border-black/10 text-[#64748b] hover:border-fuchsia-200';
                      if (selected && status?.ok) cls = 'bg-emerald-50 border-emerald-400 text-emerald-800';
                      else if (selected && status && !status.ok) cls = 'bg-red-50 border-red-400 text-red-800';
                      else if (selected) cls = 'bg-fuchsia-600 text-white border-fuchsia-600';
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleClass(c)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase transition-colors ${cls}`}
                          title={status && !status.ok ? status.messages?.join(' ') : undefined}
                        >
                          {c}{selected && status ? (status.ok ? ' ✓' : ' ✕') : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Validation — manual check only (no auto-refresh on every keystroke) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCheckSlots}
                disabled={!canCheckSlots || validating}
                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase border border-fuchsia-200 text-fuchsia-700 bg-fuchsia-50 hover:bg-fuchsia-100 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {validating ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Check slots
              </button>
              {!canCheckSlots && (
                <span className="text-[10px] text-[#94a3b8]">Select class(es), day(s), and times to check.</span>
              )}
            </div>
            {validation && !validating && (
              <div className={`rounded-xl border p-3 ${validation.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className={`text-[10px] font-black flex items-center gap-1 ${validation.ok ? 'text-emerald-800' : 'text-amber-900'}`}>
                  {validation.ok ? <Check size={12} /> : <AlertTriangle size={12} />}
                  {validation.ok
                    ? (multiClass
                      ? `All ${validation.ok_count} classes OK — ${validation.slots_needed} slot(s)/week`
                      : `${validation.slots_needed} slot(s)/week — OK`)
                    : validation.messages?.[0]}
                </p>
                {validation.failed_classes?.map((cls) => (
                  <p key={cls} className="text-[9px] text-red-700 mt-1">• {cls}: {validation.by_class?.[cls]?.messages?.[0]}</p>
                ))}
                {!validation.ok && validation.suggestions?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {validation.suggestions.slice(0, 6).map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applySuggestion(s)}
                        className="text-[9px] font-bold px-2 py-1 rounded-lg bg-white border border-amber-200"
                      >
                        {s.label || `${s.day} ${fmt12(s.start_time)}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-black/5 bg-[#f8fafc] flex gap-2 justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-xl text-[10px] font-black uppercase border border-black/10 text-[#64748b]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || validating || !form.class_names.length || !form.days.length}
              className="h-10 px-6 rounded-xl text-[10px] font-black uppercase bg-fuchsia-600 text-white disabled:opacity-50 inline-flex items-center gap-1.5 shadow-md"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {isEdit ? 'Save changes' : form.class_names.length > 1 ? `Add ${form.class_names.length} classes` : 'Add activity'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
