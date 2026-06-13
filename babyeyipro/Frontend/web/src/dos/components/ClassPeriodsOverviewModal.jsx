import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, BookOpen, User, Clock, BarChart3, Edit3, Trash2, Loader2, Check, Sparkles,
} from 'lucide-react';
import { paletteForSubject } from '../utils/masterTimetableShared';
import { buildClassCapacitySummary } from '../utils/extraActivityUtils';

export default function ClassPeriodsOverviewModal({
  open,
  onClose,
  assignments = [],
  classOptions = [],
  teachers = [],
  saving = false,
  onDelete,
  onSaveEdit,
  extraActivities = [],
  periods = [],
  activeDays = [],
  timetableRows = [],
  onOpenExtraActivities,
}) {
  const [selectedClass, setSelectedClass] = useState('');
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ teacher_user_id: '', periods_per_week: 3 });

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setQ('');
    }
  }, [open]);

  const classAssignments = useMemo(() => {
    const cls = selectedClass || classOptions[0] || '';
    return assignments
      .filter((a) => String(a.class_name || '').trim() === cls)
      .filter((a) => {
        if (!q.trim()) return true;
        const needle = q.trim().toLowerCase();
        return (
          String(a.subject_name || '').toLowerCase().includes(needle)
          || String(a.teacher_name || '').toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => String(a.subject_name).localeCompare(String(b.subject_name)));
  }, [assignments, selectedClass, classOptions, q]);

  const totalPeriods = useMemo(
    () => classAssignments.reduce((s, a) => s + (Number(a.periods_per_week) || 0), 0),
    [classAssignments]
  );

  const activeClass = selectedClass || classOptions[0] || '';

  const capacity = useMemo(() => {
    if (!activeClass) return null;
    return buildClassCapacitySummary({
      className: activeClass,
      assignments,
      activities: extraActivities,
      periods,
      activeDays,
      timetableRows,
    });
  }, [activeClass, assignments, extraActivities, periods, activeDays, timetableRows]);

  const startEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      teacher_user_id: String(a.teacher_user_id || ''),
      periods_per_week: Number(a.periods_per_week) || 3,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ teacher_user_id: '', periods_per_week: 3 });
  };

  const submitEdit = async (a) => {
    if (!editForm.teacher_user_id) return;
    const ok = await onSaveEdit?.(a.id, {
      teacher_user_id: Number(editForm.teacher_user_id),
      periods_per_week: Number(editForm.periods_per_week) || 1,
    });
    if (ok !== false) cancelEdit();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2600] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-black/5 overflow-hidden max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 sm:px-6 py-5 border-b border-black/5 bg-gradient-to-r from-[#fff7ed] via-white to-[#f0f9ff] shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#FF8C00] flex items-center gap-1.5">
                  <BarChart3 size={12} /> Class Periods Overview
                </p>
                <h3 className="text-lg font-black text-[#0f172a] mt-0.5">Lessons & Weekly Periods</h3>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 transition">
                <X size={18} className="text-[#94a3b8]" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={activeClass}
                onChange={(e) => { setSelectedClass(e.target.value); cancelEdit(); }}
                className="h-11 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"
              >
                {classOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search subject or teacher..."
                  className="w-full h-11 pl-9 pr-3 rounded-xl border border-black/10 text-sm font-semibold"
                />
              </div>
            </div>
          </div>

          {activeClass && capacity && (
            <div className="px-5 py-3 border-b border-black/5 bg-gradient-to-r from-[#f8fafc] to-[#fdf4ff] shrink-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-black text-[#0f172a] uppercase">{activeClass}</span>
                <span className="text-[10px] font-bold text-[#64748b]">{classAssignments.length} assignment{classAssignments.length !== 1 ? 's' : ''}</span>
                <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF8C00]/10 text-[#FF8C00] text-[10px] font-black uppercase">
                  <Clock size={11} /> {totalPeriods} lesson periods / week
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <CapStat label="Grid slots" value={capacity.teachingSlotsPerWeek} />
                <CapStat label="Lessons" value={capacity.assignedPeriods} />
                <CapStat label="Extra" value={capacity.extraSlotsUsed} color="#a21caf" />
                <CapStat label="Free" value={capacity.remainingForExtra} color={capacity.remainingForExtra > 0 ? '#10b981' : '#ef4444'} />
                <CapStat label="Committed" value={capacity.totalCommitted} color={capacity.balanced ? '#10b981' : '#f59e0b'} />
              </div>
              {onOpenExtraActivities && (
                <button type="button" onClick={() => onOpenExtraActivities(activeClass)} className="mt-3 h-9 px-4 rounded-xl text-[9px] font-black uppercase inline-flex items-center gap-1.5 border border-fuchsia-200 text-fuchsia-700 bg-white hover:bg-fuchsia-50">
                  <Sparkles size={12} /> Manage extra activities
                </button>
              )}
            </div>
          )}

          {activeClass && !capacity && (
            <div className="px-5 py-3 border-b border-black/5 bg-[#f8fafc] flex flex-wrap items-center gap-3 shrink-0">
              <span className="text-sm font-black text-[#0f172a] uppercase">{activeClass}</span>
              <span className="text-[10px] font-bold text-[#64748b]">{classAssignments.length} assignment{classAssignments.length !== 1 ? 's' : ''}</span>
              <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF8C00]/10 text-[#FF8C00] text-[10px] font-black uppercase">
                <Clock size={11} /> {totalPeriods} periods / week
              </span>
            </div>
          )}

          <div className="overflow-y-auto flex-1 p-4 sm:p-5">
            {classAssignments.length === 0 ? (
              <p className="text-sm font-bold text-[#94a3b8] text-center py-12">No assignments for this class.</p>
            ) : (
              <div className="space-y-2">
                {classAssignments.map((a) => {
                  const pal = paletteForSubject(a.subject_name);
                  const isEditing = editingId === a.id;

                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border-2 overflow-hidden transition hover:shadow-md"
                      style={{ backgroundColor: pal.bg, borderColor: isEditing ? '#FF8C00' : pal.border }}
                    >
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
                            <BookOpen size={16} style={{ color: pal.title }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black uppercase tracking-tight truncate" style={{ color: pal.title }}>
                              {a.subject_name}
                            </p>
                            <p className="text-[10px] font-bold text-[#64748b] flex items-center gap-1 mt-0.5 truncate">
                              <User size={10} /> {a.teacher_name || 'No teacher'}
                            </p>
                          </div>
                        </div>

                        {!isEditing && (
                          <>
                            <div className="flex items-center gap-3 sm:shrink-0">
                              <div className="flex-1 sm:flex-none text-center px-4 py-2 rounded-xl bg-white/70 border border-white min-w-[72px]">
                                <p className="text-[9px] font-black uppercase text-[#94a3b8]">Periods / Week</p>
                                <p className="text-xl font-black" style={{ color: pal.title }}>{a.periods_per_week}</p>
                              </div>
                              {a.room && (
                                <span className="text-[9px] font-bold text-[#64748b] px-2 py-1 rounded-lg bg-white/60">{a.room}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 sm:shrink-0">
                              <button
                                type="button"
                                onClick={() => startEdit(a)}
                                disabled={saving}
                                className="h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border border-black/10 bg-white/80 text-[#64748b] hover:bg-white hover:text-[#FF8C00] hover:border-[#FF8C00]/30 transition disabled:opacity-50"
                              >
                                <Edit3 size={12} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDelete?.(a)}
                                disabled={saving}
                                className="h-9 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border border-red-200 bg-white/80 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {isEditing && (
                        <div className="px-4 pb-4 pt-0 border-t border-black/5 bg-white/50">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] pt-3 mb-3">
                            Edit — {a.subject_name} · {activeClass}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-[9px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Teacher</label>
                              <select
                                value={editForm.teacher_user_id}
                                onChange={(e) => setEditForm((p) => ({ ...p, teacher_user_id: e.target.value }))}
                                className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"
                              >
                                <option value="">Select teacher</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-black uppercase tracking-widest text-[#94a3b8] mb-1">Periods / Week</label>
                              <input
                                type="number"
                                min={1}
                                max={20}
                                value={editForm.periods_per_week}
                                onChange={(e) => setEditForm((p) => ({ ...p, periods_per_week: Number(e.target.value) }))}
                                className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm font-semibold bg-white"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              disabled={saving}
                              className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border border-black/10 text-[#64748b] hover:bg-white disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => submitEdit(a)}
                              disabled={saving || !editForm.teacher_user_id}
                              className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] text-white shadow-sm disabled:opacity-50"
                            >
                              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CapStat({ label, value, color = '#0f172a' }) {
  return (
    <div className="rounded-lg bg-white border border-black/5 px-2 py-1.5 text-center">
      <p className="text-[8px] font-black uppercase text-[#94a3b8]">{label}</p>
      <p className="text-sm font-black" style={{ color }}>{value}</p>
    </div>
  );
}
