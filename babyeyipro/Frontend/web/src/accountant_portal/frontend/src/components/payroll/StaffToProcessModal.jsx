import {
  Users, RefreshCw, Loader2, Pencil, CheckCircle, AlertCircle, X, Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';

export default function StaffToProcessModal({
  open,
  onClose,
  employees = [],
  loadingStaff = false,
  previewRowByStaffId,
  employeeAdjustments = {},
  terminationPayrolls = [],
  onRefresh,
  onEditEmployee,
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.name, e.dept, String(e.basic)].some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [employees, query]);

  const stats = useMemo(() => {
    const adjusted = employees.filter((e) => employeeAdjustments[e.id]).length;
    const missing = employees.filter((e) => e.missingBasic).length;
    return { total: employees.length, adjusted, missing, terminations: terminationPayrolls.length };
  }, [employees, employeeAdjustments, terminationPayrolls]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4">
      <button type="button" className="absolute inset-0 bg-[#000435]/55 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-process-title"
      >
        <div className="shrink-0 bg-[#000435] border-b-4 border-[#FFC107] px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#FFC107] mb-1">
              <Users size={18} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Payroll run</span>
            </div>
            <h2 id="staff-process-title" className="text-white font-bold text-lg sm:text-xl">
              Staff to process ({stats.total})
            </h2>
            <p className="text-white/70 text-xs mt-1">
              Review included staff, per-employee adjustments, and termination-month entries.
            </p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFC107]">
            <X size={18} />
          </button>
        </div>

        <div className="shrink-0 px-5 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
            {stats.total} active
          </span>
          {stats.adjusted > 0 ? (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
              {stats.adjusted} adjusted
            </span>
          ) : null}
          {stats.missing > 0 ? (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700">
              {stats.missing} missing basic
            </span>
          ) : null}
          {stats.terminations > 0 ? (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-800">
              +{stats.terminations} termination month
            </span>
          ) : null}
          <div className="flex-1 min-w-[140px]" />
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="shrink-0 px-5 sm:px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search staff by name or department…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC107]/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {loadingStaff ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#FFC107]" />
              Loading staff…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center">No staff match your search.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map((e) => {
                const row = previewRowByStaffId?.get?.(e.id);
                const hasAdj = !!employeeAdjustments[e.id];
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                      e.missingBasic ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${e.missingBasic ? 'text-red-700' : 'text-[#000435]'}`}>
                        {e.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {e.dept}
                        {' · Basic '}
                        {e.basic > 0 ? `${e.basic.toLocaleString()} RWF` : '—'}
                        {row ? ` · Gross ${Number(row.gross || 0).toLocaleString()}` : ''}
                        {hasAdj ? ' · adjusted' : ''}
                      </p>
                    </div>
                    {!e.missingBasic ? (
                      <button
                        type="button"
                        title="Adjust this employee for this run"
                        onClick={() => onEditEmployee?.(e)}
                        className={`p-1.5 rounded-lg border shrink-0 ${
                          hasAdj
                            ? 'border-[#FFC107] bg-amber-50 text-[#000435]'
                            : 'border-slate-200 text-slate-600 hover:bg-white hover:border-[#FFC107]/50'
                        }`}
                      >
                        <Pencil size={14} />
                      </button>
                    ) : (
                      <AlertCircle size={14} className="text-red-500 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {terminationPayrolls.length > 0 ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-900">Termination month ({terminationPayrolls.length})</p>
              <ul className="mt-2 space-y-1">
                {terminationPayrolls.map((t) => (
                  <li key={t.id || t.staffUserId} className="text-[11px] text-amber-800 flex items-center gap-1.5">
                    <CheckCircle size={12} className="shrink-0" />
                    {t.staffName || `Staff #${t.staffUserId}`}
                    {t.terminationDate ? ` · ${new Date(t.terminationDate).toLocaleDateString('en-GB')}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#000435] text-white text-sm font-semibold hover:bg-[#000435]/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
