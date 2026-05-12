import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRepresentativeData } from '../context/RepresentativeContext';
import { fetchRepresentativeStaffPayroll } from '../services/api';
import { Loader2 } from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const YEARS_LIST = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);


const Ic = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const UserIc = () => <Ic d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />;
const CoinIc = () => <Ic d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
const CheckIc = () => <Ic d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const WarnIc = () => <Ic d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />;
const DlIc = () => <Ic d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />;
const FilterIc = () => <Ic d="M3 6h18M7 12h10M11 18h2" />;
const TrendIc = () => <Ic d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />;
const RefreshIc = () => <Ic d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;
const SearchIc = () => <Ic d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />;

const fmtRWF = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n ?? 0);
const fmtFull = (n) => n?.toLocaleString?.() ?? '—';

const statusStyle = {
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Paid' },
  approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Approved' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Partial' },
  pending: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', label: 'Pending' },
  rejected: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', dot: 'bg-slate-400', label: 'Rejected' },
};

const ProgressBar = ({ value, max = 100, color = '#000435' }) => {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width .6s ease' }} />
    </div>
  );
};

const KpiCard = ({ label, value, sub, color, icon: Icon, trend }) => (
  <div
    className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col gap-3"
    style={{ boxShadow: '0 4px 20px -10px rgba(0,4,53,0.12)' }}
  >
    <div className="flex items-center justify-between">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
        <Icon />
      </div>
      {trend && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
            String(trend).startsWith('+') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{sub}</p>}
    </div>
  </div>
);

const PayrollBarChart = ({ data, height = 160 }) => {
  if (!data?.length) return <p className="text-sm text-slate-400 py-8 text-center">No monthly payroll data yet.</p>;
  const max = Math.max(...data.map((d) => d.payroll), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const pct = Math.max(4, (d.payroll / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[8px] font-bold text-slate-400 tabular-nums">{fmtRWF(d.payroll)}</span>
            <div className="w-full rounded-t-lg" style={{ height: `${pct}%`, background: 'linear-gradient(180deg,#000435,#000320)' }} />
            <span className="text-[8px] font-semibold text-slate-400 truncate w-full text-center">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
};

const Insight = ({ text, type = 'warn' }) => {
  const s =
    type === 'good'
      ? { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', dot: 'bg-emerald-500' }
      : type === 'info'
        ? { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', dot: 'bg-blue-500' }
        : { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' };
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${s.bg}`}>
      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
      <p className={`text-[12px] font-semibold leading-snug ${s.text}`}>{text}</p>
    </div>
  );
};

export default function StaffPayroll() {
  const { activeSchoolId, activeSchool } = useRepresentativeData();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const [filterMonth, setFilterMonth] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [availMonths, setAvailMonths] = useState(MONTHS);
  const [availTerms, setAvailTerms] = useState(TERMS);
  const [availYears, setAvailYears] = useState(YEARS_LIST);
  const periodTouchedRef = useRef(false);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const schoolParam = activeSchoolId != null && activeSchoolId !== '' ? Number(activeSchoolId) : undefined;
      const opts = {};
      if (filterMonth) opts.month = filterMonth;
      if (filterTerm) opts.term = filterTerm;
      if (filterYear) opts.year = filterYear;
      const res = await fetchRepresentativeStaffPayroll(schoolParam, opts);
      if (!res?.success) {
        setPayload(null);
        setError(res?.message || 'Failed to load payroll data.');
        return;
      }
      setPayload(res.data || null);
    } catch (e) {
      setPayload(null);
      setError(e?.response?.data?.message || e.message || 'Failed to load payroll data.');
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, filterMonth, filterTerm, filterYear]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  useEffect(() => {
    periodTouchedRef.current = false;
    setFilterMonth('');
    setFilterTerm('');
    setFilterYear('');
  }, [activeSchoolId]);

  useEffect(() => {
    if (!payload) return;
    const am = payload.available_months;
    const at = payload.available_terms;
    const ay = payload.available_years;
    if (am?.length) {
      const merged = [...new Map([...MONTHS, ...am].map((m) => [m.value, m])).values()].sort((a, b) => a.value - b.value);
      setAvailMonths(merged);
    }
    if (at?.length) {
      const merged = [...new Set([...TERMS, ...at])].sort();
      setAvailTerms(merged);
    }
    if (ay?.length) {
      const merged = [...new Set([...YEARS_LIST, ...ay])].sort((a, b) => b - a);
      setAvailYears(merged);
    }
  }, [payload]);

  const summary = payload?.summary;
  const staffList = payload?.staff ?? [];
  const departments = payload?.departments ?? [];
  const monthlyTrend = payload?.monthly_trend ?? [];
  const schoolsList = payload?.schools ?? [];

  const totalBudget = summary?.total_budget_rwf ?? 0;
  const totalPaid = summary?.total_paid_rwf ?? 0;
  const totalPending = summary?.total_pending_rwf ?? 0;
  const payrollPct = summary?.payroll_pct ?? 0;
  const paidCount = summary?.paid_count ?? 0;
  const pendingCount = summary?.pending_count ?? 0;
  const totalStaff = summary?.total_staff ?? 0;
  const totalDeductions = summary?.total_deductions ?? 0;
  const totalAllowances = summary?.total_allowances ?? 0;

  const schoolNames = useMemo(() => ['All', ...new Set(staffList.map((s) => s.school))], [staffList]);
  const deptNames = useMemo(() => ['All', ...new Set(staffList.map((s) => s.department).filter((d) => d && d !== '—'))], [staffList]);

  const filtered = useMemo(
    () =>
      staffList.filter((s) => {
        const q = search.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.school.toLowerCase().includes(q);
        const matchSchool = filterSchool === 'All' || s.school === filterSchool;
        const matchDept = filterDept === 'All' || s.department === filterDept;
        const matchStatus = filterStatus === 'All' || s.status === filterStatus;
        return matchSearch && matchSchool && matchDept && matchStatus;
      }),
    [search, filterSchool, filterDept, filterStatus, staffList]
  );

  const scopeLabel = activeSchool ? activeSchool.school_name : 'All assigned schools';

  const appliedPeriod = useMemo(() => {
    const parts = [];
    if (filterYear) parts.push(filterYear);
    if (filterTerm) parts.push(filterTerm);
    const monthObj = filterMonth ? MONTHS.find((m) => m.value === Number(filterMonth)) : null;
    if (monthObj) parts.push(monthObj.label);
    return parts.length ? parts.join(' · ') : 'All periods';
  }, [filterMonth, filterTerm, filterYear]);

  const insights = useMemo(() => {
    const list = [];
    if (pendingCount > 0) list.push({ type: 'warn', text: `${pendingCount} payroll request(s) still pending — awaiting approval.` });
    if (payrollPct >= 90 && totalBudget > 0) list.push({ type: 'good', text: `Strong payroll completion rate (${payrollPct}%) across your scope.` });
    if (totalDeductions > 0) list.push({ type: 'info', text: `Total deductions this period: ${fmtRWF(totalDeductions)} RWF (taxes, pension, etc.).` });
    const topSchool = [...schoolsList].sort((a, b) => b.payroll_paid - a.payroll_paid)[0];
    if (topSchool && topSchool.payroll_paid > 0) {
      const pct = topSchool.payroll_total > 0 ? Math.round((topSchool.payroll_paid / topSchool.payroll_total) * 100) : 0;
      list.push({ type: pct >= 80 ? 'good' : 'warn', text: `${topSchool.name} leads payroll completion at ${pct}%.` });
    }
    if (!list.length) list.push({ type: 'info', text: 'Payroll data will appear once accountants process salary requests for your schools.' });
    return list;
  }, [pendingCount, payrollPct, totalBudget, totalDeductions, schoolsList]);

  const NAVY_GRAD = 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)';

  return (
    <div className="animate-in fade-in duration-500 bg-[#f0f2f8] min-h-full pb-20">
      {/* AMBER HERO */}
      <div className="relative w-full overflow-hidden" style={{ backgroundColor: '#f59e0b' }}>
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/35 to-transparent pointer-events-none" aria-hidden />
        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-8 sm:pt-10 pb-10 sm:pb-12">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            {/* Left: title & subtitle */}
            <div className="shrink-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="w-5 h-1 rounded-full shrink-0" style={{ backgroundColor: '#FEBF10' }} aria-hidden />
                <span className="text-[10px] font-medium uppercase tracking-widest text-white/85">Finance Center</span>
              </div>
              <h1
                className="text-xl md:text-2xl font-semibold text-white tracking-tight uppercase leading-none mb-1 mt-0.5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Staff Payroll
              </h1>
              <p className="text-xs sm:text-sm font-normal text-white/82 max-w-3xl leading-relaxed mt-1">
                {scopeLabel} · {appliedPeriod}
              </p>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => loadPayroll()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white border border-black/10 shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: NAVY_GRAD }}
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshIc />} Refresh
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#1E3A5F] bg-white border border-black/10 shadow-sm transition-all active:scale-[0.98] hover:bg-white/95"
              >
                <DlIc /> Export Payroll
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 max-w-[1600px] mx-auto space-y-5">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>
        )}

        {/* TOP KPI STRIP */}
        <div className="bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
            {[
              { label: 'Total Salary Budget', value: loading ? '…' : `${fmtRWF(totalBudget)} RWF`, sub: `${totalStaff} staff members`, color: '#000435', icon: CoinIc },
              { label: 'Total Paid', value: loading ? '…' : `${fmtRWF(totalPaid)} RWF`, sub: `${payrollPct}% completion`, color: '#10b981', icon: CheckIc },
              { label: 'Pending Salaries', value: loading ? '…' : `${fmtRWF(totalPending)} RWF`, sub: `${pendingCount} unpaid`, color: '#f43f5e', icon: WarnIc },
              { label: 'Total Allowances', value: loading ? '…' : `${fmtRWF(totalAllowances)} RWF`, sub: 'This period', color: '#f59e0b', icon: TrendIc },
            ].map((k) => (
              <div key={k.label} className="p-4 sm:p-5 flex flex-col items-center text-center justify-center min-h-[7rem] hover:bg-[#f0f2f8] transition-colors group">
                <k.icon />
                <span className="text-lg sm:text-2xl font-black text-slate-800 tabular-nums mt-1.5 group-hover:text-[#000435] transition-colors">
                  {k.value}
                </span>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mt-0.5">{k.label}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Total Staff" value={loading ? '…' : totalStaff} sub="All schools" color="#000435" icon={UserIc} />
          <KpiCard label="Salaries Paid" value={loading ? '…' : paidCount} sub="Completed" color="#10b981" icon={CheckIc} trend="Live" />
          <KpiCard label="Pending Payment" value={loading ? '…' : pendingCount} sub="Awaiting approval" color="#f43f5e" icon={WarnIc} />
          <KpiCard label="Total Deductions" value={loading ? '…' : `${fmtRWF(totalDeductions)} RWF`} sub="Taxes + pension" color="#f59e0b" icon={CoinIc} />
        </div>

        {/* CHART + DEPARTMENT BREAKDOWN */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-1">Monthly Payroll Trend</h2>
            <p className="text-[11px] text-slate-400 mb-4">Total salaries paid per month (RWF)</p>
            <PayrollBarChart data={monthlyTrend} height={160} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-4">Salary by Department</h2>
            {departments.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No department data yet.</p>
            ) : (
              <div className="space-y-3">
                {departments.map((d) => {
                  const maxVal = Math.max(...departments.map((x) => x.total), 1);
                  const pct = Math.round((d.total / maxVal) * 100);
                  return (
                    <div key={d.name} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <p className="text-[12px] font-semibold text-slate-700 w-28 shrink-0 truncate">{d.name}</p>
                      <div className="flex-1">
                        <ProgressBar value={pct} color={d.color} />
                      </div>
                      <span className="text-[11px] font-black text-slate-800 w-16 text-right tabular-nums shrink-0">{fmtRWF(d.total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SCHOOL PAYROLL COMPARISON */}
        {schoolsList.length > 1 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-4">School Payroll Comparison</h2>
            <div className="space-y-3">
              {[...schoolsList]
                .filter((s) => s.payroll_total > 0)
                .sort((a, b) => b.payroll_paid / Math.max(b.payroll_total, 1) - a.payroll_paid / Math.max(a.payroll_total, 1))
                .map((school, i) => {
                  const pct = Math.round((school.payroll_paid / Math.max(school.payroll_total, 1)) * 100);
                  return (
                    <div key={school.id} className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{
                          background: i === 0 ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#f1f5f9',
                          color: i === 0 ? '#000435' : '#94a3b8',
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="w-36 sm:w-48 shrink-0 min-w-0">
                        <p className="text-[12px] font-bold text-slate-800 truncate">{school.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {fmtRWF(school.payroll_paid)} / {fmtRWF(school.payroll_total)} RWF · {school.staff_count} staff
                        </p>
                      </div>
                      <div className="flex-1">
                        <ProgressBar value={pct} max={100} color={pct >= 80 ? '#000435' : pct >= 60 ? '#f59e0b' : '#f43f5e'} />
                      </div>
                      <span
                        className="w-10 text-right text-[12px] font-black shrink-0"
                        style={{ color: pct >= 80 ? '#000435' : pct >= 60 ? '#d97706' : '#f43f5e' }}
                      >
                        {pct}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* FILTERS + TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-black text-slate-800">Staff Payroll Table</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <FilterIc /> {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-[#000435] bg-[#000435]/8 hover:bg-[#000435]/15 transition-colors"
              >
                <DlIc /> Export
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="px-5 py-4 bg-[#f8fafc] border-b border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-3">
                <div className="col-span-2 sm:col-span-3 lg:col-span-8 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <SearchIc />
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff name or school…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:border-amber-400 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Month</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => { periodTouchedRef.current = true; setFilterMonth(e.target.value); }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    <option value="">All months</option>
                    {availMonths.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Term</label>
                  <select
                    value={filterTerm}
                    onChange={(e) => { periodTouchedRef.current = true; setFilterTerm(e.target.value); }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    <option value="">All terms</option>
                    {availTerms.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Year</label>
                  <select
                    value={filterYear}
                    onChange={(e) => { periodTouchedRef.current = true; setFilterYear(e.target.value); }}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    <option value="">All years</option>
                    {availYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">School</label>
                  <select
                    value={filterSchool}
                    onChange={(e) => setFilterSchool(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    {schoolNames.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Department</label>
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    {deptNames.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    <option>All</option>
                    <option value="paid">Paid</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilterMonth('');
                      setFilterTerm('');
                      setFilterYear('');
                      setFilterSchool('All');
                      setFilterDept('All');
                      setFilterStatus('All');
                    }}
                    className="w-full py-2 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b border-slate-100">
                <tr>
                  {['Staff', 'School / Dept', 'Position', 'Gross', 'Deductions', 'Net Salary', 'Paid', 'Remaining', 'Status', 'Date', 'Action'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-16 text-center">
                      <Loader2 size={24} className="animate-spin text-[#000435] mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 text-sm font-semibold">
                      No payroll records match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => {
                    const st = statusStyle[s.status] || statusStyle.pending;
                    return (
                      <tr key={s.id} className={`border-t border-slate-50 hover:bg-[#f8fafc] transition-colors ${i % 2 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
                              style={{ background: '#000435', color: '#f59e0b' }}
                            >
                              {s.avatar}
                            </div>
                            <p className="text-[12px] font-bold text-slate-800 whitespace-nowrap">{s.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">{s.school.split(' ').slice(0, 2).join(' ')}</p>
                          <p className="text-[10px] text-slate-400">{s.department}</p>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">{s.position}</td>
                        <td className="px-4 py-3 text-[12px] font-bold text-slate-700 tabular-nums">{fmtFull(s.gross)}</td>
                        <td className="px-4 py-3 text-[12px] text-rose-600 font-bold tabular-nums">-{fmtFull(s.deductions)}</td>
                        <td className="px-4 py-3 text-[12px] font-black text-[#000435] tabular-nums">{fmtFull(s.net)}</td>
                        <td className="px-4 py-3 text-[12px] font-bold text-emerald-700 tabular-nums">{fmtFull(s.paid)}</td>
                        <td className="px-4 py-3 text-[12px] font-bold tabular-nums" style={{ color: s.remaining > 0 ? '#d97706' : '#10b981' }}>
                          {fmtFull(s.remaining)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${st.bg} ${st.text} ${st.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">{s.payDate ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            title="Download Payslip"
                            className="w-7 h-7 rounded-lg bg-[#000435]/8 hover:bg-[#000435]/15 flex items-center justify-center text-[#000435] transition-colors"
                          >
                            <DlIc />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 size={24} className="animate-spin text-[#000435]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm font-semibold">No payroll records match your filters.</div>
            ) : (
              filtered.map((s) => {
                const st = statusStyle[s.status] || statusStyle.pending;
                return (
                  <div key={s.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black"
                          style={{ background: '#000435', color: '#f59e0b' }}
                        >
                          {s.avatar}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {s.position} · {s.department}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${st.bg} ${st.text} ${st.border}`}>{st.label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {[
                        ['Gross', s.gross],
                        ['Net', s.net],
                        ['Remaining', s.remaining],
                      ].map(([l, v]) => (
                        <div key={l} className="bg-slate-50 rounded-xl p-2 text-center">
                          <p className="text-[12px] font-black text-slate-800 tabular-nums">{fmtRWF(v)}</p>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">{l}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{s.payDate ?? 'Not yet paid'} · {s.method}</span>
                      <button type="button" className="w-7 h-7 rounded-lg bg-[#000435]/8 flex items-center justify-center text-[#000435]">
                        <DlIc />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-[#f8fafc] flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] text-slate-500 font-semibold">
              {filtered.length} of {staffList.length} payroll record(s)
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#000435] bg-[#000435]/8 hover:bg-[#000435]/15 transition-colors"
            >
              <DlIc /> Export CSV
            </button>
          </div>
        </div>

        {/* PAYROLL INSIGHTS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 mb-3">Payroll Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {insights.map((ins, idx) => (
              <Insight key={idx} type={ins.type} text={ins.text} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
