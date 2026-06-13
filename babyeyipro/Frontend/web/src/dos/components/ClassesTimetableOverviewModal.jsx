import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Layers, CheckCircle2, AlertTriangle, Eye, Trash2, RefreshCw,
  Sparkles, ShieldAlert, Calendar,
} from 'lucide-react';

function Badge({ children, color = '#3b82f6' }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase"
      style={{ background: `${color}14`, color, border: `1px solid ${color}28` }}
    >
      {children}
    </span>
  );
}

function CoverageCard({ cls, onView, onScan, onDelete, saving }) {
  const statusColor = cls.fullyMatched ? '#10b981' : cls.missing > 0 ? '#f59e0b' : '#ef4444';
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md transition sm:hidden">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-black text-[#0f172a] uppercase">{cls.className}</p>
          <Badge color={statusColor}>{cls.placed}/{cls.expected || '—'}</Badge>
        </div>
        {cls.fullyMatched ? (
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
        ) : (
          <AlertTriangle size={18} className="text-amber-500 shrink-0" />
        )}
      </div>
      <p className="text-[10px] font-bold text-[#64748b] mb-3">
        {cls.fullyMatched ? 'All subjects matched' : cls.subjectGaps.slice(0, 2).map((g) => `${g.subject}${g.teacher ? ` (${g.teacher})` : ''} ${g.placed}/${g.expected}`).join(' · ')}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onView(cls.className)} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#FF8C00]/20 text-[#FF8C00]">View</button>
        {!cls.fullyMatched && <button type="button" onClick={onScan} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700">Scan</button>}
        <button type="button" onClick={() => onDelete(cls.className)} disabled={saving} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-red-200 text-red-600 disabled:opacity-50">Delete</button>
      </div>
    </div>
  );
}

export default function ClassesTimetableOverviewModal({
  open,
  onClose,
  coverage = [],
  term = '',
  academicYear = '',
  saving = false,
  onViewClass,
  onScanConflicts,
  onDeleteClass,
  onRegenerateAll,
  onGoToGenerator,
  onClearAll,
}) {
  const complete = coverage.filter((c) => c.fullyMatched).length;
  const attention = coverage.length - complete;

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
          className="w-full sm:max-w-5xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-black/5 overflow-hidden max-h-[92vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 sm:px-6 py-5 border-b border-black/5 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#fdba74] flex items-center gap-1.5">
                  <Layers size={12} /> Classes Timetable Overview
                </p>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1">Weekly Period Coverage</h3>
                <p className="text-[11px] text-[#94a3b8] mt-1 flex flex-wrap items-center gap-2">
                  {term && <span className="inline-flex items-center gap-1"><Calendar size={10} />{term}</span>}
                  {academicYear && <span>{academicYear}</span>}
                </p>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition">
                <X size={18} className="text-white" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
              <div className="rounded-xl bg-white/10 px-3 py-2.5 text-center">
                <p className="text-[9px] font-black uppercase text-[#94a3b8]">Classes</p>
                <p className="text-lg font-black text-white">{coverage.length}</p>
              </div>
              <div className="rounded-xl bg-emerald-500/20 px-3 py-2.5 text-center">
                <p className="text-[9px] font-black uppercase text-emerald-200">Complete</p>
                <p className="text-lg font-black text-emerald-300">{complete}</p>
              </div>
              <div className="rounded-xl bg-amber-500/20 px-3 py-2.5 text-center">
                <p className="text-[9px] font-black uppercase text-amber-200">Need Attention</p>
                <p className="text-lg font-black text-amber-300">{attention}</p>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 border-b border-black/5 bg-[#f8fafc] flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={onRegenerateAll}
              disabled={saving || !coverage.length}
              className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 bg-gradient-to-r from-[#FF8C00] to-[#FF5E00] text-white shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={12} /> Regenerate All
            </button>
            <button
              type="button"
              onClick={onGoToGenerator}
              className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100"
            >
              <Sparkles size={12} /> Open Generator
            </button>
            <button
              type="button"
              onClick={onScanConflicts}
              disabled={saving}
              className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border border-black/10 text-[#64748b] hover:bg-white"
            >
              <ShieldAlert size={12} /> Scan Conflicts
            </button>
            <button
              type="button"
              onClick={onClearAll}
              disabled={saving || !coverage.length}
              className="h-9 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 ml-auto"
            >
              <Trash2 size={12} /> Clear All
            </button>
          </div>

          <div className="px-4 py-2 bg-violet-50/80 border-b border-violet-100 text-[10px] font-semibold text-violet-900 shrink-0">
            Scheduled periods vs <strong>Assignments → periods/week</strong> per subject.
          </div>

          <div className="overflow-y-auto flex-1 p-4 sm:p-5">
            {coverage.length === 0 ? (
              <p className="text-sm font-bold text-[#94a3b8] text-center py-12">No classes with assignments yet.</p>
            ) : (
              <>
                <div className="space-y-3 sm:hidden">
                  {coverage.map((cls) => (
                    <CoverageCard
                      key={cls.className}
                      cls={cls}
                      onView={onViewClass}
                      onScan={onScanConflicts}
                      onDelete={onDeleteClass}
                      saving={saving}
                    />
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto rounded-2xl border border-black/5">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-[#94a3b8] font-black uppercase tracking-wider border-b border-black/5 bg-[#f8fafc]">
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4 text-center">Weekly Periods</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4">Details</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverage.map((cls) => (
                        <tr key={cls.className} className="border-b border-black/5 hover:bg-[#f8fafc] transition">
                          <td className="py-3 px-4 font-bold text-[#0f172a]">{cls.className}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge color={cls.fullyMatched ? '#10b981' : cls.missing > 0 ? '#f59e0b' : '#ef4444'}>
                              {cls.placed}/{cls.expected || '—'}
                            </Badge>
                            {cls.expected > 0 && (
                              <p className={`text-[9px] font-bold mt-0.5 ${cls.coveragePct > 100 ? 'text-red-500' : 'text-[#94a3b8]'}`}>
                                {cls.coveragePct}%
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {cls.fullyMatched ? (
                              <span className="text-[9px] font-black uppercase text-emerald-600">Complete</span>
                            ) : cls.missing > 0 ? (
                              <span className="text-[9px] font-black uppercase text-amber-600">{cls.missing} missing</span>
                            ) : cls.excess > 0 ? (
                              <span className="text-[9px] font-black uppercase text-red-600">{cls.excess} extra</span>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-[#94a3b8]">No assignments</span>
                            )}
                            {cls.dupes > 0 && (
                              <p className="text-[9px] font-bold text-red-500 mt-0.5">{cls.dupes} duplicate slot(s)</p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {cls.subjectGaps.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[280px]">
                                {cls.subjectGaps.slice(0, 4).map((g) => (
                                  <span key={g.subject} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800">
                                    {g.subject}{g.teacher ? ` (${g.teacher})` : ''} {g.placed}/{g.expected}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[9px] text-emerald-600 font-bold">All subjects matched</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button type="button" onClick={() => onViewClass(cls.className)} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-[#FF8C00]/20 text-[#FF8C00] hover:bg-orange-50 inline-flex items-center gap-1">
                                <Eye size={10} /> View
                              </button>
                              {!cls.fullyMatched && (
                                <button type="button" onClick={onScanConflicts} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-50">Scan</button>
                              )}
                              <button type="button" onClick={() => onDeleteClass(cls.className)} disabled={saving} className="text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">Delete All</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
