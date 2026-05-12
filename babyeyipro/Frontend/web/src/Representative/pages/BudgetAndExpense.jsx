import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRepresentativeData } from '../context/RepresentativeContext';
import {
  fetchRepresentativeBudgetExpenses,
  fetchRepresentativeExpenses,
  fetchRepresentativeRequisitions,
  patchRepresentativeExpenseDecision,
  patchRepresentativeRequisitionDecision,
} from '../services/api';
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

const fmtRWF = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
const fmtFull = (n) => n?.toLocaleString?.() ?? '—';
const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; }
};

const Ic = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
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

const KpiCard = ({ label, value, sub, color, icon: Icon }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col gap-3" style={{ boxShadow: '0 4px 20px -10px rgba(0,4,53,0.12)' }}>
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}><Icon /></div>
    <div>
      <p className="text-lg sm:text-xl font-black text-slate-800 tabular-nums leading-none break-words">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{sub}</p>}
    </div>
  </div>
);

const STATUS_STYLE = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
  pending_approval: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Awaiting approval' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Approved' },
  rejected: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Rejected' },
  paid: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Paid' },
  posted: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Posted' },
  issued: { bg: 'bg-sky-50', text: 'text-sky-700', label: 'Issued' },
  returned: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Returned' },
  cancelled: { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Cancelled' },
  forwarded: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Forwarded' },
};
const getStatusStyle = (s) => STATUS_STYLE[s] || STATUS_STYLE.pending;

const StatusBadge = ({ status }) => {
  const st = getStatusStyle(status);
  return <span className={`inline-flex text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${st.bg} ${st.text}`}>{st.label}</span>;
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'expenses', label: 'All Expenses' },
  { key: 'requisitions', label: 'Requisitions' },
];

export default function BudgetAndExpense() {
  const { activeSchool, activeSchoolId } = useRepresentativeData();
  const [tab, setTab] = useState('overview');
  const [budgetData, setBudgetData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [reqSummary, setReqSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const schoolParam = activeSchoolId != null && activeSchoolId !== '' ? Number(activeSchoolId) : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetRes, expRes, reqRes] = await Promise.all([
        fetchRepresentativeBudgetExpenses(schoolParam),
        fetchRepresentativeExpenses(schoolParam),
        fetchRepresentativeRequisitions(schoolParam),
      ]);
      if (!budgetRes?.success) { setError(budgetRes?.message || 'Failed'); return; }
      setBudgetData(budgetRes.data);
      setExpenses(expRes?.success ? expRes.data || [] : []);
      setRequisitions(reqRes?.success ? reqRes.data || [] : []);
      setReqSummary(reqRes?.summary || null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [schoolParam]);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleExpenseDecision = async (dbId, decision) => {
    setActionLoading(`exp-${dbId}-${decision}`);
    try {
      const res = await patchRepresentativeExpenseDecision(dbId, decision);
      if (res?.success) {
        setExpenses((prev) => prev.map((e) => e.db_id === dbId ? { ...e, status: decision } : e));
        notify(`Expense ${decision} successfully.`);
      } else {
        notify(res?.message || 'Action failed', 'error');
      }
    } catch (e) {
      notify(e?.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReqDecision = async (dbId, decision) => {
    setActionLoading(`req-${dbId}-${decision}`);
    try {
      const res = await patchRepresentativeRequisitionDecision(dbId, decision);
      if (res?.success) {
        setRequisitions((prev) => prev.map((r) => r.db_id === dbId ? { ...r, status: decision } : r));
        notify(`Requisition ${decision} successfully.`);
      } else {
        notify(res?.message || 'Action failed', 'error');
      }
    } catch (e) {
      notify(e?.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Filters
  const [expFilterCat, setExpFilterCat] = useState('All');
  const [expFilterStatus, setExpFilterStatus] = useState('All');
  const [reqFilterStatus, setReqFilterStatus] = useState('All');
  const [expPage, setExpPage] = useState(0);
  const [reqPage, setReqPage] = useState(0);
  const PER_PAGE = 15;

  const expCategories = useMemo(() => ['All', ...new Set(expenses.map((e) => e.category))], [expenses]);
  const expStatuses = useMemo(() => ['All', ...new Set(expenses.map((e) => e.status))], [expenses]);
  const reqStatuses = useMemo(() => ['All', ...new Set(requisitions.map((r) => r.status))], [requisitions]);

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (expFilterCat !== 'All') list = list.filter((e) => e.category === expFilterCat);
    if (expFilterStatus !== 'All') list = list.filter((e) => e.status === expFilterStatus);
    return list;
  }, [expenses, expFilterCat, expFilterStatus]);

  const filteredRequisitions = useMemo(() => {
    if (reqFilterStatus === 'All') return requisitions;
    return requisitions.filter((r) => r.status === reqFilterStatus);
  }, [requisitions, reqFilterStatus]);

  const pagedExpenses = filteredExpenses.slice(expPage * PER_PAGE, (expPage + 1) * PER_PAGE);
  const pagedRequisitions = filteredRequisitions.slice(reqPage * PER_PAGE, (reqPage + 1) * PER_PAGE);
  const expTotalPages = Math.ceil(filteredExpenses.length / PER_PAGE);
  const reqTotalPages = Math.ceil(filteredRequisitions.length / PER_PAGE);

  const kpis = budgetData?.kpis || {};
  const quarterlyPlan = budgetData?.quarterly_plan || [];
  const expenseCategories = budgetData?.expense_categories || [];
  const departmentBudgets = budgetData?.department_budgets || [];
  const schoolExpenseCompare = budgetData?.school_expense_compare || [];
  const maxSchoolSpend = Math.max(...schoolExpenseCompare.map((s) => s.operatingSpend), 1);

  const canActExpense = (status) => ['pending', 'pending_approval'].includes(status);
  const canActReq = (status) => ['pending', 'forwarded'].includes(status);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#000435]" /></div>;
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <p className="text-sm font-semibold text-rose-600">{error}</p>
        <button onClick={load} className="px-4 py-2 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase tracking-widest">Retry</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 bg-[#f0f2f8] min-h-full pb-24">
      {/* Header */}
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
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight uppercase" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                Budget &amp; expenses
              </h1>
              <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
                {activeSchool ? `Data for ${activeSchool.school_name}.` : 'Expenses, requisitions, and budget visibility across your school network.'}
              </p>
            </div>
            <button type="button" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#000435] transition-all active:scale-[0.98] shrink-0"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 12px rgba(245,158,11,.35)' }}>
              <DlIc /> Export snapshot
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 max-w-[1600px] mx-auto space-y-5">
        {/* Toast */}
        {toast && (
          <div className={`rounded-2xl border px-4 py-3 text-[13px] font-semibold shadow-sm ${toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            {toast.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl border border-slate-200/80 p-1 shadow-sm overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setExpPage(0); setReqPage(0); }}
              className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all ${tab === t.key ? 'bg-[#000435] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
              {t.key === 'expenses' && expenses.length > 0 && <span className="ml-1.5 text-[10px] font-bold opacity-70">({expenses.length})</span>}
              {t.key === 'requisitions' && requisitions.length > 0 && <span className="ml-1.5 text-[10px] font-bold opacity-70">({requisitions.length})</span>}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KpiCard label="Annual budget" value={`${fmtRWF(kpis.annual_budget || 0)} RWF`} sub={`FY ${new Date().getFullYear()}`} color="#000435" icon={TrendIc} />
          <KpiCard label="Spend YTD" value={`${fmtRWF(kpis.spend_ytd || 0)} RWF`} sub="All quarters" color="#10b981" icon={CheckIc} />
          <KpiCard label="Pending approvals" value={`${expenses.filter((e) => canActExpense(e.status)).length + requisitions.filter((r) => canActReq(r.status)).length}`} sub="Expenses + requisitions" color="#f59e0b" icon={WarnIc} />
          <KpiCard label="Total requisitions" value={String(requisitions.length)} sub={reqSummary ? `${reqSummary.pending} pending` : ''} color="#6366f1" icon={TrendIc} />
        </div>

        {/* ═══ TAB: OVERVIEW ═══ */}
        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Quarterly budget */}
              <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
                <h2 className="text-sm font-black text-slate-900 mb-4">Budget planning — Quarterly</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left">
                    <thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <th className="pb-2 pr-3">Period</th><th className="pb-2 pr-3">Allocated</th><th className="pb-2 pr-3">Spent</th><th className="pb-2">Utilization</th>
                    </tr></thead>
                    <tbody className="text-[12px]">
                      {quarterlyPlan.map((q) => {
                        const pct = q.allocated > 0 ? Math.round((q.spent / q.allocated) * 100) : 0;
                        return (
                          <tr key={q.quarter} className="border-b border-slate-50">
                            <td className="py-3 font-black text-slate-800">{q.quarter}</td>
                            <td className="py-3 font-semibold text-slate-700 tabular-nums">{fmtFull(q.allocated)}</td>
                            <td className="py-3 font-semibold text-slate-700 tabular-nums">{fmtFull(q.spent)}</td>
                            <td className="py-3"><div className="flex items-center gap-2"><span className="text-[11px] font-black tabular-nums w-9">{pct}%</span><div className="flex-1 min-w-[72px]"><ProgressBar value={pct} color={pct > 92 ? '#f43f5e' : pct > 85 ? '#f59e0b' : '#000435'} /></div></div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              {/* Expense categories */}
              <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
                <h2 className="text-sm font-black text-slate-900 mb-4">Expense categories</h2>
                <div className="space-y-4">
                  {expenseCategories.map((c) => {
                    const pct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
                    return (
                      <div key={c.key}>
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <span className="text-[12px] font-bold text-slate-800">{c.label}</span>
                          <span className="text-[11px] font-black tabular-nums text-slate-600">{fmtRWF(c.spent)} / {fmtRWF(c.budget)}</span>
                        </div>
                        <ProgressBar value={c.spent} max={c.budget} color={c.color} />
                        <div className="flex justify-between mt-1 text-[10px] font-semibold text-slate-400"><span>{pct}% used</span><span>{fmtRWF(Math.max(0, c.budget - c.spent))} headroom</span></div>
                      </div>
                    );
                  })}
                  {expenseCategories.length === 0 && <p className="text-[12px] text-slate-400 py-4 text-center">No expense data yet.</p>}
                </div>
              </section>
            </div>
            {/* Dept budgets + school compare */}
            {departmentBudgets.length > 0 && (
              <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
                <h2 className="text-sm font-black text-slate-900 mb-4">Department budgets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {departmentBudgets.map((d) => {
                    const pct = d.budget > 0 ? Math.round((d.spent / d.budget) * 100) : 0;
                    return (
                      <div key={d.dept} className="rounded-xl border border-slate-100 bg-[#f8fafc] p-4">
                        <div className="flex items-center justify-between gap-2 mb-2"><span className="text-[12px] font-black text-slate-800">{d.dept}</span><span className="text-[11px] font-black tabular-nums" style={{ color: d.color }}>{pct}%</span></div>
                        <ProgressBar value={d.spent} max={d.budget} color={d.color} />
                        <p className="text-[10px] text-slate-500 mt-2">{fmtRWF(d.spent)} of {fmtRWF(d.budget)} RWF</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            {schoolExpenseCompare.length > 0 && (
              <section className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
                <h2 className="text-sm font-black text-slate-900 mb-4">School expense comparison</h2>
                <div className="space-y-4">
                  {schoolExpenseCompare.map((s) => {
                    const barPct = maxSchoolSpend > 0 ? Math.round((s.operatingSpend / maxSchoolSpend) * 100) : 0;
                    const perStudent = s.studentCount > 0 ? Math.round(s.operatingSpend / s.studentCount) : 0;
                    return (
                      <div key={s.schoolId}>
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap"><span className="text-[12px] font-bold text-slate-800 truncate max-w-[60%]">{s.name}</span><span className="text-[11px] font-black text-slate-600 tabular-nums">{fmtRWF(s.operatingSpend)}</span></div>
                        <ProgressBar value={barPct} max={100} color="#000435" />
                        <p className="text-[10px] text-slate-400 mt-1">~{fmtRWF(perStudent)} / student · {s.studentCount} students</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* ═══ TAB: ALL EXPENSES ═══ */}
        {tab === 'expenses' && (
          <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-black text-slate-900">All Expenses</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{filteredExpenses.length} expense(s) · approve or reject pending items</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select value={expFilterCat} onChange={(e) => { setExpFilterCat(e.target.value); setExpPage(0); }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40">
                  {expCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
                <select value={expFilterStatus} onChange={(e) => { setExpFilterStatus(e.target.value); setExpPage(0); }}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40">
                  {expStatuses.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : getStatusStyle(s).label}</option>)}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[#f8fafc] border-b border-slate-100">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-3">Ref</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Title / Vendor</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Due date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {pagedExpenses.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 font-semibold">No expenses match your filters.</td></tr>
                  )}
                  {pagedExpenses.map((row, i) => (
                    <tr key={row.db_id} className={`border-t border-slate-50 ${i % 2 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-4 py-3 font-bold text-[#000435] whitespace-nowrap">{row.id}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[120px] truncate">{row.school}</td>
                      <td className="px-4 py-3 text-slate-600">{row.category}</td>
                      <td className="px-4 py-3"><p className="font-semibold text-slate-800 truncate max-w-[160px]">{row.title || '—'}</p><p className="text-[10px] text-slate-400 truncate">{row.vendor}</p></td>
                      <td className="px-4 py-3 text-right font-black tabular-nums">{fmtFull(row.amount)}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(row.due_date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">
                        {canActExpense(row.status) ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleExpenseDecision(row.db_id, 'approved')} disabled={!!actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                              {actionLoading === `exp-${row.db_id}-approved` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                            </button>
                            <button onClick={() => handleExpenseDecision(row.db_id, 'rejected')} disabled={!!actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold uppercase hover:bg-slate-50 disabled:opacity-50 transition-colors">
                              {actionLoading === `exp-${row.db_id}-rejected` ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 block text-center">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {expTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">Page {expPage + 1} of {expTotalPages}</p>
                <div className="flex gap-2">
                  <button disabled={expPage === 0} onClick={() => setExpPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold disabled:opacity-40">Prev</button>
                  <button disabled={expPage >= expTotalPages - 1} onClick={() => setExpPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ═══ TAB: REQUISITIONS ═══ */}
        {tab === 'requisitions' && (
          <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-black text-slate-900">All Requisitions</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {filteredRequisitions.length} requisition(s)
                  {reqSummary ? ` · ${reqSummary.pending} pending · ${reqSummary.approved} approved · ${reqSummary.rejected} rejected` : ''}
                </p>
              </div>
              <select value={reqFilterStatus} onChange={(e) => { setReqFilterStatus(e.target.value); setReqPage(0); }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40">
                {reqStatuses.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : getStatusStyle(s).label}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="bg-[#f8fafc] border-b border-slate-100">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Items / Purpose</th>
                    <th className="px-4 py-3">Dept</th>
                    <th className="px-4 py-3">Requester</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-[12px]">
                  {pagedRequisitions.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400 font-semibold">No requisitions match your filters.</td></tr>
                  )}
                  {pagedRequisitions.map((row, i) => (
                    <tr key={row.db_id} className={`border-t border-slate-50 ${i % 2 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-4 py-3 font-bold text-[#000435] whitespace-nowrap">{row.id}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-[120px] truncate">{row.school}</td>
                      <td className="px-4 py-3"><p className="font-semibold text-slate-800 truncate max-w-[180px]">{row.items || row.item_name || '—'}</p>{row.purpose && <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{row.purpose}</p>}</td>
                      <td className="px-4 py-3 text-slate-600">{row.dept}</td>
                      <td className="px-4 py-3 text-slate-600">{row.requester}</td>
                      <td className="px-4 py-3 text-right font-black tabular-nums">{row.amount > 0 ? fmtFull(row.amount) : '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(row.submitted)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">
                        {canActReq(row.status) ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleReqDecision(row.db_id, 'approved')} disabled={!!actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                              {actionLoading === `req-${row.db_id}-approved` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                            </button>
                            <button onClick={() => handleReqDecision(row.db_id, 'rejected')} disabled={!!actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-[10px] font-bold uppercase hover:bg-slate-50 disabled:opacity-50 transition-colors">
                              {actionLoading === `req-${row.db_id}-rejected` ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 block text-center">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reqTotalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">Page {reqPage + 1} of {reqTotalPages}</p>
                <div className="flex gap-2">
                  <button disabled={reqPage === 0} onClick={() => setReqPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold disabled:opacity-40">Prev</button>
                  <button disabled={reqPage >= reqTotalPages - 1} onClick={() => setReqPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
