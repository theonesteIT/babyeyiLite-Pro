import { useMemo, useState } from 'react';
import {
  QUARTERLY_PLAN,
  DEPARTMENT_BUDGETS,
  EXPENSE_CATEGORIES,
  RECENT_EXPENSES,
  APPROVAL_QUEUE,
  PROCUREMENT_TRACKING,
  SCHOOL_EXPENSE_COMPARE,
} from '../data/budgetExpenseData';

const fmtRWF = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
const fmtFull = (n) => n?.toLocaleString?.() ?? '—';

const Ic = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const TrendIc = () => <Ic d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />;
const CheckIc = () => <Ic d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const WarnIc = () => <Ic d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />;
const DlIc = () => <Ic d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />;

const ProgressBar = ({ value, max = 100, color = '#000435' }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
};

const KpiCard = ({ label, value, sub, color, icon: Icon, trend }) => (
  <div
    className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col gap-3"
    style={{ boxShadow: '0 4px 20px -10px rgba(0,4,53,0.12)' }}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>
        <Icon />
      </div>
      {trend && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
            trend.startsWith('+') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-lg sm:text-xl font-black text-slate-800 tabular-nums leading-none break-words">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{sub}</p>}
    </div>
  </div>
);

const procurementLabel = {
  in_delivery: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', label: 'In delivery' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', label: 'Approved' },
  pending_signature: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Pending signature' },
  paid: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Paid' },
};

const expenseStatus = {
  posted: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Posted' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
};

export default function BudgetAndExpense() {
  const [approvals, setApprovals] = useState(APPROVAL_QUEUE);
  const [filterCat, setFilterCat] = useState('All');

  const totalAnnualBudget = useMemo(
    () => QUARTERLY_PLAN.reduce((s, q) => s + q.allocated, 0),
    [],
  );
  const totalSpentYtd = useMemo(() => QUARTERLY_PLAN.reduce((s, q) => s + q.spent, 0), []);
  const pendingApprovalAmt = useMemo(() => approvals.reduce((s, a) => s + a.amount, 0), [approvals]);

  const filteredExpenses = useMemo(() => {
    if (filterCat === 'All') return RECENT_EXPENSES;
    return RECENT_EXPENSES.filter((e) => e.category.toLowerCase().includes(filterCat.toLowerCase()));
  }, [filterCat]);

  const maxSchoolSpend = Math.max(...SCHOOL_EXPENSE_COMPARE.map((s) => s.operatingSpend), 1);

  const approveOne = (id) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="animate-in fade-in duration-500 bg-[#f0f2f8] min-h-full pb-24">
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #000435 0%, #000320 60%, #00021a 100%)' }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/[0.04] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 pb-14 max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-0.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">Finance Center</span>
              </div>
              <h1
                className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight uppercase"
                style={{ fontFamily: "'Montserrat',sans-serif" }}
              >
                Budget &amp; expenses
              </h1>
              <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
                Professional planning, controlled spend, and procurement visibility across your school network.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#000435] transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 12px rgba(245,158,11,.35)' }}
              >
                <DlIc /> Export snapshot
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 max-w-[1600px] mx-auto space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard
            label="Annual budget envelope"
            value={`${fmtRWF(totalAnnualBudget)} RWF`}
            sub="FY 2026 consolidated"
            color="#000435"
            icon={TrendIc}
            trend="+4%"
          />
          <KpiCard
            label="Spend YTD"
            value={`${fmtRWF(totalSpentYtd)} RWF`}
            sub="Across all quarters"
            color="#10b981"
            icon={CheckIc}
          />
          <KpiCard
            label="Pending approvals"
            value={`${fmtRWF(pendingApprovalAmt)} RWF`}
            sub={`${approvals.length} requests in queue`}
            color="#f59e0b"
            icon={WarnIc}
          />
          <KpiCard
            label="Active procurement"
            value={String(PROCUREMENT_TRACKING.filter((p) => p.status !== 'paid').length)}
            sub="Open POs & deliveries"
            color="#6366f1"
            icon={TrendIc}
          />
        </div>

        {/* Budget planning + expense categories */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <h2 className="text-sm font-black text-slate-900">Budget planning</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quarterly</span>
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[320px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    <th className="pb-2 pr-3">Period</th>
                    <th className="pb-2 pr-3">Allocated</th>
                    <th className="pb-2 pr-3">Spent</th>
                    <th className="pb-2">Utilization</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {QUARTERLY_PLAN.map((q) => {
                    const pct = Math.round((q.spent / q.allocated) * 100);
                    return (
                      <tr key={q.quarter} className="border-b border-slate-50">
                        <td className="py-3 font-black text-slate-800">{q.quarter}</td>
                        <td className="py-3 font-semibold text-slate-700 tabular-nums">{fmtFull(q.allocated)}</td>
                        <td className="py-3 font-semibold text-slate-700 tabular-nums">{fmtFull(q.spent)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black tabular-nums w-9">{pct}%</span>
                            <div className="flex-1 min-w-[72px]">
                              <ProgressBar value={pct} max={100} color={pct > 92 ? '#f43f5e' : pct > 85 ? '#f59e0b' : '#000435'} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-1">Expense categories</h2>
            <p className="text-[11px] text-slate-500 mb-4">Salaries · Transport · Maintenance · Feeding · Utilities · Equipment · Construction</p>
            <div className="space-y-4">
              {EXPENSE_CATEGORIES.map((c) => {
                const pct = Math.round((c.spent / c.budget) * 100);
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <span className="text-[12px] font-bold text-slate-800">{c.label}</span>
                      <span className="text-[11px] font-black tabular-nums text-slate-600">
                        {fmtRWF(c.spent)} / {fmtRWF(c.budget)}
                      </span>
                    </div>
                    <ProgressBar value={c.spent} max={c.budget} color={c.color} />
                    <div className="flex justify-between mt-1 text-[10px] font-semibold text-slate-400">
                      <span>{pct}% used</span>
                      <span>{fmtRWF(c.budget - c.spent)} headroom</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Department budgets */}
        <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-sm font-black text-slate-900">Department budgets</h2>
            <p className="text-[11px] text-slate-500">Roll-up view · editable thresholds in settings</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEPARTMENT_BUDGETS.map((d) => {
              const pct = Math.round((d.spent / d.budget) * 100);
              return (
                <div key={d.dept} className="rounded-xl border border-slate-100 bg-[#f8fafc] p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[12px] font-black text-slate-800">{d.dept}</span>
                    <span className="text-[11px] font-black tabular-nums" style={{ color: d.color }}>
                      {pct}%
                    </span>
                  </div>
                  <ProgressBar value={d.spent} max={d.budget} color={d.color} />
                  <p className="text-[10px] text-slate-500 mt-2 font-medium">
                    {fmtRWF(d.spent)} of {fmtRWF(d.budget)} RWF
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Expense tracking + approvals */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className="xl:col-span-2 rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-slate-900">Expense tracking</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Recent postings · filter by category</p>
              </div>
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 w-full sm:w-auto max-w-xs"
              >
                <option>All</option>
                <option>Utilities</option>
                <option>Maintenance</option>
                <option>Feeding</option>
                <option>Equipment</option>
                <option>Transport</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead className="bg-[#f8fafc] border-b border-slate-100">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {filteredExpenses.map((row, i) => {
                    const st = expenseStatus[row.status];
                    return (
                      <tr key={row.id} className={`border-t border-slate-50 ${i % 2 ? 'bg-slate-50/40' : ''}`}>
                        <td className="px-4 py-3 font-bold text-[#000435] whitespace-nowrap">{row.ref}</td>
                        <td className="px-4 py-3 text-slate-700 max-w-[140px] truncate">{row.school}</td>
                        <td className="px-4 py-3 text-slate-600">{row.category}</td>
                        <td className="px-4 py-3 text-right font-black tabular-nums">{fmtFull(row.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${st.bg} ${st.text}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-1">Expense approval</h2>
            <p className="text-[11px] text-slate-500 mb-4">Dual sign-off ready · demo actions below</p>
            <div className="space-y-3">
              {approvals.length === 0 && (
                <p className="text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-3">
                  Queue clear — no pending approvals.
                </p>
              )}
              {approvals.map((a) => (
                <div key={a.id} className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
                  <p className="text-[12px] font-black text-slate-900 leading-snug">{a.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {a.school} · {a.requester} · {a.ageDays}d
                  </p>
                  <p className="text-[14px] font-black text-[#000435] mt-2 tabular-nums">{fmtFull(a.amount)} RWF</p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => approveOne(a.id)}
                      className="flex-1 rounded-xl bg-emerald-600 py-2 text-[11px] font-black uppercase tracking-wide text-white hover:bg-emerald-700 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => approveOne(a.id)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Procurement + school comparison */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm overflow-hidden">
            <h2 className="text-sm font-black text-slate-900 mb-4">Procurement tracking</h2>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[480px] text-[12px]">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                    <th className="text-left pb-2 pr-2">PO</th>
                    <th className="text-left pb-2 pr-2">Vendor</th>
                    <th className="text-right pb-2 pr-2">Amount</th>
                    <th className="text-left pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {PROCUREMENT_TRACKING.map((p) => {
                    const st = procurementLabel[p.status];
                    return (
                      <tr key={p.po} className="border-b border-slate-50">
                        <td className="py-3 font-bold text-[#000435] whitespace-nowrap">{p.po}</td>
                        <td className="py-3">
                          <span className="font-semibold text-slate-800 block truncate max-w-[140px]">{p.vendor}</span>
                          <span className="text-[10px] text-slate-400">{p.school}</span>
                        </td>
                        <td className="py-3 text-right font-black tabular-nums">{fmtFull(p.amount)}</td>
                        <td className="py-3">
                          <span className={`inline-flex text-[9px] font-bold uppercase px-2 py-1 rounded-lg border ${st.bg} ${st.text} ${st.border}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 mb-1">School expense comparison</h2>
            <p className="text-[11px] text-slate-500 mb-4">Operating spend vs enrollment proxy · normalized view</p>
            <div className="space-y-4">
              {SCHOOL_EXPENSE_COMPARE.map((s) => {
                const barPct = Math.round((s.operatingSpend / maxSchoolSpend) * 100);
                const perStudent = Math.round(s.operatingSpend / s.studentCount);
                return (
                  <div key={s.schoolId}>
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <span className="text-[12px] font-bold text-slate-800 truncate max-w-[60%]">{s.name}</span>
                      <span className="text-[11px] font-black text-slate-600 tabular-nums">{fmtRWF(s.operatingSpend)}</span>
                    </div>
                    <ProgressBar value={barPct} max={100} color="#000435" />
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">
                      ~{fmtRWF(perStudent)} / student · {s.studentCount} students
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
