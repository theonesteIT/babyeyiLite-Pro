import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Sparkles, Edit3, Trash2, Users, Calendar,
} from 'lucide-react';
import api from '../services/api';
import {
  EXTRA_ACTIVITY_STYLE,
  fmt12,
  groupExtraActivities,
} from '../utils/extraActivityUtils';
import ExtraActivityFormModal from './ExtraActivityFormModal';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function ExtraActivitiesModal({
  open,
  onClose,
  classOptions = [],
  initialClass = '',
  activeDays = WEEK_DAYS,
  term = '',
  academicYear = '',
  availableTerms = ['Term 1', 'Term 2', 'Term 3'],
  availableYears = [],
  activities = [],
  onRefresh,
  flash,
}) {
  const [viewTerm, setViewTerm] = useState('');
  const [viewYear, setViewYear] = useState('');
  const [listedActivities, setListedActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);

  const yearOptions = useMemo(() => {
    const set = new Set([...(availableYears || []), academicYear, viewYear].filter(Boolean));
    return [...set];
  }, [availableYears, academicYear, viewYear]);

  // Init view filters only when main modal opens
  useEffect(() => {
    if (!open) {
      setFormOpen(false);
      setFormConfig(null);
      return;
    }
    setViewTerm(term || availableTerms[0] || 'Term 1');
    setViewYear(academicYear || yearOptions[0] || '2025-2026');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadListedActivities = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const res = await api.get('/dos/timetable-system/extra-activities', {
        params: { term: viewTerm, academic_year: viewYear },
      });
      if (res.data?.success) setListedActivities(res.data.data || []);
      else setListedActivities([]);
    } catch {
      setListedActivities([]);
    } finally {
      setLoading(false);
    }
  }, [open, viewTerm, viewYear]);

  useEffect(() => {
    if (!open || formOpen || !viewTerm || !viewYear) return;
    loadListedActivities();
  }, [open, formOpen, viewTerm, viewYear, loadListedActivities]);

  const activityGroups = useMemo(
    () => groupExtraActivities(listedActivities),
    [listedActivities]
  );

  const openAddForm = () => {
    setFormConfig({ mode: 'add' });
    setFormOpen(true);
  };

  const openEditItem = (act) => {
    setFormConfig({
      mode: 'edit',
      editingId: act.id,
      initial: {
        activity_name: act.activity_name,
        class_name: act.class_name,
        class_names: [act.class_name],
        days_json: act.days_json,
        days: act.days,
        start_time: act.start_time,
        end_time: act.end_time,
        term: act.term || viewTerm,
        academic_year: act.academic_year || viewYear,
        notes: act.notes,
      },
    });
    setFormOpen(true);
  };

  const openEditGroup = (group) => {
    setFormConfig({
      mode: 'replace',
      replacingIds: group.items.map((i) => i.id),
      initial: {
        activity_name: group.activity_name,
        class_names: group.items.map((i) => i.class_name),
        days: group.days,
        start_time: group.start_time,
        end_time: group.end_time,
        term: group.term || viewTerm,
        academic_year: group.academic_year || viewYear,
        notes: group.notes,
      },
    });
    setFormOpen(true);
  };

  const handleSaved = async () => {
    await onRefresh?.();
    await loadListedActivities();
  };

  const handleDeleteGroup = async (group) => {
    const classes = group.items.map((i) => i.class_name).join(', ');
    if (!confirm(`Remove "${group.activity_name}" for: ${classes}?`)) return;
    try {
      for (const item of group.items) {
        await api.delete(`/dos/timetable-system/extra-activities/${item.id}`);
      }
      flash?.('success', 'Removed from timetables');
      await handleSaved();
    } catch {
      flash?.('error', 'Failed to delete');
    }
  };

  if (!open) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[2700] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-black/5 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-5 border-b border-black/5 bg-gradient-to-r from-[#fdf4ff] via-white to-[#fff7ed] shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-fuchsia-700 flex items-center gap-1.5">
                    <Sparkles size={12} /> Extra Activities
                  </p>
                  <h3 className="text-lg font-black text-[#0f172a] mt-0.5">Homework, Debate & Special Periods</h3>
                </div>
                <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-black/5">
                  <X size={18} className="text-[#94a3b8]" />
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-black/5 bg-[#f8fafc] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-fuchsia-600" />
                <select
                  value={viewTerm}
                  onChange={(e) => setViewTerm(e.target.value)}
                  className="h-9 rounded-xl border border-black/10 px-3 text-[11px] font-bold bg-white"
                >
                  {availableTerms.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(e.target.value)}
                  className="h-9 rounded-xl border border-black/10 px-3 text-[11px] font-bold bg-white"
                >
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={openAddForm}
                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase bg-fuchsia-600 text-white inline-flex items-center gap-1.5 shadow-md hover:bg-fuchsia-700 transition"
              >
                <Plus size={14} /> Add activity
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-4">
              {loading ? (
                <p className="text-sm text-[#94a3b8] text-center py-12">Loading…</p>
              ) : activityGroups.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-black/10 rounded-2xl">
                  <Sparkles size={32} className="mx-auto text-fuchsia-300 mb-3" />
                  <p className="text-sm font-black text-[#0f172a] mb-1">No activities yet</p>
                  <p className="text-xs text-[#94a3b8] mb-4">{viewTerm} · {viewYear}</p>
                  <button
                    type="button"
                    onClick={openAddForm}
                    className="h-9 px-5 rounded-xl text-[10px] font-black uppercase bg-fuchsia-600 text-white inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add first activity
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityGroups.map((group) => (
                    <div
                      key={group.key}
                      className="rounded-2xl border-2 p-4"
                      style={{ backgroundColor: EXTRA_ACTIVITY_STYLE.bg, borderColor: EXTRA_ACTIVITY_STYLE.border }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-sm font-black uppercase" style={{ color: EXTRA_ACTIVITY_STYLE.title }}>
                            {group.activity_name}
                          </p>
                          <p className="text-[10px] font-bold text-[#64748b] mt-0.5">
                            {group.days.map((d) => d.slice(0, 3)).join(', ')} · {fmt12(group.start_time)}–{fmt12(group.end_time)}
                          </p>
                        </div>
                        <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-white/80 text-fuchsia-800 shrink-0">
                          {group.items.length} classes
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openEditItem(item)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-white border border-fuchsia-200 text-fuchsia-900 hover:bg-fuchsia-50 transition"
                          >
                            {item.class_name}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-fuchsia-200/50">
                        <button
                          type="button"
                          onClick={() => openEditGroup(group)}
                          className="h-8 px-3 rounded-lg text-[9px] font-black uppercase border bg-white/90 hover:bg-white inline-flex items-center gap-1"
                        >
                          <Edit3 size={11} /> Edit all
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          className="h-8 px-3 rounded-lg text-[9px] font-black uppercase border border-red-200 text-red-600 bg-white/90 hover:bg-red-50 inline-flex items-center gap-1"
                        >
                          <Trash2 size={11} /> Delete all
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t bg-[#f8fafc] text-[10px] text-[#64748b] shrink-0">
              Activities sync to class timetables and Master Timetable for the selected term & year.
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <ExtraActivityFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setFormConfig(null); }}
        onSaved={handleSaved}
        flash={flash}
        classOptions={classOptions}
        activeDays={activeDays}
        availableTerms={availableTerms}
        availableYears={yearOptions}
        defaultTerm={viewTerm}
        defaultYear={viewYear}
        defaultClass={initialClass}
        config={formConfig}
      />
    </>
  );
}
