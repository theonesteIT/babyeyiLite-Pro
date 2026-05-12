import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRepresentativeData } from '../context/RepresentativeContext';
import { fetchRepresentativeFeesManagement } from '../services/api';
import { Loader2 } from 'lucide-react';

/** Same lists as accountant portal `Fees.jsx` */
const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual Review'];
const YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023'];

function normalizeUiTerm(v) {
  const t = String(v || '').trim();
  const low = t.toLowerCase();
  if (!t) return '';
  if (low.includes('annual')) return 'Annual Review';
  if (/\b1\b/.test(low) || low === 't1') return 'Term 1';
  if (/\b2\b/.test(low) || low === 't2') return 'Term 2';
  if (/\b3\b/.test(low) || low === 't3') return 'Term 3';
  return t;
}

// ── icons ─────────────────────────────────────────────────────────
const Ic = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const CoinIc = () => <Ic d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
const UsersIc = () => <Ic d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />;
const CheckIc = () => <Ic d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />;
const WarnIc = () => <Ic d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />;
const DlIc = () => <Ic d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />;
const SearchIc = () => <Ic d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />;
const FilterIc = () => <Ic d="M3 6h18M7 12h10M11 18h2" />;
const MsgIc = () => <Ic d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />;
const TrendIc = () => <Ic d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />;
const StarIc = () => <Ic d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
const RefreshIc = () => <Ic d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;

// ── helpers ───────────────────────────────────────────────────────
const fmtRWF = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : String(n);
const fmtFull = (n) => n?.toLocaleString?.() ?? '—';

const statusStyle = {
  paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Paid' },
  partial: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Partial' },
  unpaid: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', label: 'Unpaid' },
};
const txnStyle = {
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Success' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' },
  failed: { bg: 'bg-rose-50', text: 'text-rose-700', label: 'Failed' },
};

const LineBar = ({ data, color = '#000435', h = 80 }) => {
  if (!data?.length) return <p className="text-sm text-slate-400 py-8 text-center">No paid collections in the last 14 days.</p>;
  const W = 600,
    H = h,
    P = { t: 4, b: 20, l: 4, r: 4 };
  const vals = data.map((d) => d.amount);
  const max = Math.max(...vals, 1);
  const xs = vals.map((_, i) => P.l + (i / Math.max(vals.length - 1, 1)) * (W - P.l - P.r));
  const ys = vals.map((v) => P.t + (1 - v / max) * (H - P.t - P.b));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = path + ` L${xs[xs.length - 1]},${H - P.b} L${P.l},${H - P.b} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id={`lg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#lg-${color.replace('#', '')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="600">
          {data[i].day?.split(' ')[1] || data[i].day}
        </text>
      ))}
    </svg>
  );
};

const DonutChart = ({ pct, size = 80, color = '#000435' }) => {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b">
        {pct}%
      </text>
    </svg>
  );
};

const ProgressBar = ({ value, max = 100, color = '#000435' }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
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
      {trend ? (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
            trend.startsWith('+') ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'
          }`}
        >
          {trend}
        </span>
      ) : null}
    </div>
    <div>
      <p className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{sub}</p>}
    </div>
  </div>
);

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

export default function FeesManagement() {
  const { activeSchoolId, activeSchool } = useRepresentativeData();
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [filterSchool, setFilterSchool] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterMethod, setFilterMethod] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All Classes');
  const [yearOptions, setYearOptions] = useState(YEARS);
  const [termOptions, setTermOptions] = useState(TERMS);
  const periodTouchedRef = useRef(false);

  const loadFees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const schoolParam = activeSchoolId != null && activeSchoolId !== '' ? Number(activeSchoolId) : undefined;
      const opts = {};
      if (filterYear && filterTerm) {
        opts.academic_year = filterYear;
        opts.term = filterTerm;
      }
      if (filterClass && filterClass !== 'All Classes') {
        opts.class_name = filterClass;
      }
      const res = await fetchRepresentativeFeesManagement(schoolParam, opts);
      if (!res?.success) {
        setPayload(null);
        setError(res?.message || 'Failed to load fees data.');
        return;
      }
      setPayload(res.data || null);
    } catch (e) {
      setPayload(null);
      setError(e?.response?.data?.message || e.message || 'Failed to load fees data.');
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId, filterYear, filterTerm, filterClass]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  useEffect(() => {
    periodTouchedRef.current = false;
    setFilterYear('');
    setFilterTerm('');
    setFilterClass('All Classes');
  }, [activeSchoolId]);

  useEffect(() => {
    if (!payload?.filters) return;
    const y = String(payload.filters.academic_year || '').trim();
    const t = normalizeUiTerm(payload.filters.term);
    if (y) setYearOptions((prev) => Array.from(new Set([...YEARS, ...prev, y])));
    if (t) setTermOptions((prev) => Array.from(new Set([...TERMS, ...prev, t])));
    if (!periodTouchedRef.current && y && t) {
      setFilterYear(y);
      setFilterTerm(t);
    }
  }, [payload]);

  const summary = payload?.summary;
  const schools = payload?.schools ?? [];
  const daily_collections = payload?.daily_collections ?? [];
  const fee_categories = payload?.fee_categories ?? [];
  const invoices = payload?.invoices ?? [];
  const transactions = payload?.transactions ?? [];
  const insights = payload?.insights ?? [];

  const totalExpected = summary?.total_expected_rwf ?? 0;
  const totalPaid = summary?.total_paid_rwf ?? 0;
  const totalRemaining = summary?.total_remaining_rwf ?? 0;
  const collectionPct = summary?.collection_pct ?? 0;
  const paidCount = summary?.paid_invoice_count ?? 0;
  const partialCount = summary?.partial_invoice_count ?? 0;
  const unpaidCount = summary?.unpaid_invoice_count ?? 0;
  const todayTotal = summary?.today_paid_rwf ?? 0;
  const weekTotal = summary?.week_paid_rwf ?? 0;
  const overdueCount = summary?.overdue_30d_count ?? 0;

  const rankedSchools = useMemo(() => {
    const list = schools.filter((s) => Number(s.fees_expected) > 0);
    return [...list].sort(
      (a, b) => Number(b.fees_collected) / Number(b.fees_expected) - Number(a.fees_collected) / Number(a.fees_expected)
    );
  }, [schools]);

  const bestSchool = rankedSchools[0] || null;
  const bestPct = bestSchool ? Math.round((Number(bestSchool.fees_collected) / Number(bestSchool.fees_expected)) * 100) : 0;

  const classNamesList = payload?.class_names ?? [];

  const filtered = useMemo(
    () =>
      invoices.filter((s) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.school.toLowerCase().includes(q) ||
          String(s.parent || '').toLowerCase().includes(q);
        const matchSchool = filterSchool === 'All' || s.school === filterSchool;
        const matchStatus = filterStatus === 'All' || s.status === filterStatus;
        const matchMethod = filterMethod === 'All' || s.method === filterMethod;
        const rowClass = String(s.class || '').trim().toLowerCase();
        const matchClass =
          filterClass === 'All Classes' || rowClass === filterClass.trim().toLowerCase();
        return matchSearch && matchSchool && matchStatus && matchMethod && matchClass;
      }),
    [search, filterSchool, filterStatus, filterMethod, filterClass, invoices]
  );

  const scopeLabel = activeSchool ? activeSchool.school_name : 'All assigned schools';
  const appliedPeriod =
    filterYear && filterTerm
      ? `${filterYear} · ${filterTerm}`
      : payload?.filters
        ? `${payload.filters.academic_year || ''} · ${normalizeUiTerm(payload.filters.term) || ''}`.trim()
        : '';
  const appliedClassSuffix =
    filterClass !== 'All Classes' && filterClass ? ` · ${filterClass}` : '';

  const selectChevron =
    "bg-[length:10px] bg-[right_0.5rem_center] bg-no-repeat appearance-none pr-9";
  const heroSelectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231E3A5F' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  };
  const NAVY_GRAD = 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)';

  return (
    <div className="animate-in fade-in duration-500 bg-[#f0f2f8] min-h-full pb-20">
      <div className="relative w-full overflow-hidden" style={{ backgroundColor: '#f59e0b' }}>
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div
          className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/35 to-transparent pointer-events-none"
          aria-hidden
        />
        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-8 sm:pt-10 pb-10 sm:pb-12">
          <div className="flex flex-col gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="w-5 h-1 rounded-full shrink-0" style={{ backgroundColor: '#FEBF10' }} aria-hidden />
                <span className="text-[10px] font-medium uppercase tracking-widest text-white/85">Finance Center</span>
              </div>
              <h1
                className="text-xl md:text-2xl font-semibold text-white tracking-tight uppercase leading-none mb-1 mt-0.5"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Fees Management
              </h1>
              <p className="text-xs sm:text-sm font-normal text-white/82 max-w-3xl leading-relaxed mt-1">
                Accountant student fees &amp; paid-at-school collections · {scopeLabel}
                {appliedPeriod ? <span className="text-white/90"> · {appliedPeriod}</span> : null}
                {appliedClassSuffix ? <span className="text-white/90">{appliedClassSuffix}</span> : null}
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/90">Academic year</span>
                  <select
                    value={filterYear}
                    onChange={(e) => {
                      periodTouchedRef.current = true;
                      setFilterYear(e.target.value);
                    }}
                    disabled={loading}
                    className={`min-w-[9.5rem] h-9 rounded-xl border border-black/10 bg-black/15 px-3 text-[11px] font-semibold text-[#1E3A5F] outline-none focus:border-[#1E3A5F]/40 focus:bg-white/90 disabled:opacity-50 ${selectChevron}`}
                    style={heroSelectStyle}
                  >
                    {!filterYear ? (
                      <option value="" disabled className="text-[#000435]">
                        {loading ? 'Loading…' : '—'}
                      </option>
                    ) : null}
                    {yearOptions.map((y) => (
                      <option key={y} value={y} className="text-[#000435]">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/90">Term</span>
                  <select
                    value={filterTerm}
                    onChange={(e) => {
                      periodTouchedRef.current = true;
                      setFilterTerm(e.target.value);
                    }}
                    disabled={loading}
                    className={`min-w-[9rem] h-9 rounded-xl border border-black/10 bg-black/15 px-3 text-[11px] font-semibold text-[#1E3A5F] outline-none focus:border-[#1E3A5F]/40 focus:bg-white/90 disabled:opacity-50 ${selectChevron}`}
                    style={heroSelectStyle}
                  >
                    {!filterTerm ? (
                      <option value="" disabled className="text-[#000435]">
                        {loading ? 'Loading…' : '—'}
                      </option>
                    ) : null}
                    {termOptions.map((t) => (
                      <option key={t} value={t} className="text-[#000435]">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/90">Class</span>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    disabled={loading}
                    className={`min-w-[10rem] h-9 rounded-xl border border-black/10 bg-black/15 px-3 text-[11px] font-semibold text-[#1E3A5F] outline-none focus:border-[#1E3A5F]/40 focus:bg-white/90 disabled:opacity-50 ${selectChevron}`}
                    style={heroSelectStyle}
                  >
                    <option value="All Classes" className="text-[#000435]">
                      All Classes
                    </option>
                    {classNamesList.map((c) => (
                      <option key={c} value={c} className="text-[#000435]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => loadFees()}
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
                  <DlIc /> Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 max-w-[1600px] mx-auto space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>
        ) : null}

        <div className="bg-white rounded-2xl border border-black/10 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
            {[
              {
                label: 'Total due',
                value: loading ? '…' : `${fmtRWF(totalExpected)} RWF`,
                sub: 'From Babyeyi fee cards (class / term)',
                color: '#000435',
                icon: CoinIc,
              },
              {
                label: 'Total collected',
                value: loading ? '…' : `${fmtRWF(totalPaid)} RWF`,
                sub: `${collectionPct}% rate`,
                color: '#10b981',
                icon: CheckIc,
              },
              {
                label: 'Outstanding',
                value: loading ? '…' : `${fmtRWF(totalRemaining)} RWF`,
                sub: `${unpaidCount} student(s) unpaid / no fee card`,
                color: '#f59e0b',
                icon: WarnIc,
              },
              {
                label: 'Today (paid)',
                value: loading ? '…' : `${fmtRWF(todayTotal)} RWF`,
                sub: `Week: ${fmtRWF(weekTotal)} RWF`,
                color: '#000435',
                icon: TrendIc,
              },
            ].map((k) => (
              <button
                key={k.label}
                type="button"
                className="p-4 sm:p-5 flex flex-col items-center text-center hover:bg-[#f0f2f8] transition-colors group min-h-[7rem] justify-center"
              >
                <k.icon />
                <span className="text-lg sm:text-2xl font-black text-slate-800 tabular-nums mt-1.5 group-hover:text-[#000435] transition-colors">{k.value}</span>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500 mt-0.5">{k.label}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{k.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          <KpiCard label="Fully paid" value={loading ? '…' : paidCount} sub="Students (fee card met)" color="#10b981" icon={CheckIc} trend="Live" />
          <KpiCard label="Partial" value={loading ? '…' : partialCount} sub="Some fees recorded" color="#f59e0b" icon={WarnIc} />
          <KpiCard label="Unpaid" value={loading ? '…' : unpaidCount} sub="No payment or no fee On Babyeyi" color="#f43f5e" icon={UsersIc} trend="Live" />
         
          <KpiCard
            label="Best school"
            value={loading || !bestSchool ? '—' : `${bestPct}%`}
            sub={bestSchool ? bestSchool.name.split(' ').slice(0, 2).join(' ') : 'No data'}
            color="#000435"
            icon={StarIc}
          />
          <KpiCard label="Overdue &gt; 30d" value={loading ? '…' : overdueCount} sub="Not tracked for student fees" color="#f43f5e" icon={WarnIc} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-black text-slate-800">Daily collections — last 14 days</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Amounts recorded in student fee collections (RWF)</p>
              </div>
              <span className="text-[11px] font-bold text-[#000435] bg-[#000435]/8 px-2 py-1 rounded-lg">{fmtRWF(weekTotal)} RWF / 7d</span>
            </div>
            <LineBar data={daily_collections} color="#000435" h={120} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-4">Overall collection</h2>
            <div className="flex flex-col items-center gap-4">
              <DonutChart pct={collectionPct} size={120} color="#000435" />
              <div className="w-full space-y-2.5">
                {[
                  { label: 'Collected', value: totalPaid, color: '#000435' },
                  { label: 'Outstanding', value: totalRemaining, color: '#f59e0b' },
                ].map((r) => (
                  <div key={r.label}>
                    <div className="flex justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                        {r.label}
                      </span>
                      <span className="text-[11px] font-black text-slate-800 tabular-nums">{fmtRWF(r.value)} RWF</span>
                    </div>
                    <ProgressBar value={r.value} max={Math.max(totalExpected, 1)} color={r.color} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 w-full text-center">
                <div className="bg-emerald-50 rounded-xl p-2">
                  <p className="text-base font-black text-emerald-700">{paidCount}</p>
                  <p className="text-[9px] font-bold text-emerald-600 uppercase">Paid</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-2">
                  <p className="text-base font-black text-rose-600">{unpaidCount}</p>
                  <p className="text-[9px] font-bold text-rose-500 uppercase">Unpaid</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 mb-4">School fee comparison</h2>
          {schools.length === 0 ? (
            <p className="text-sm text-slate-500">No schools in scope.</p>
          ) : (
            <div className="space-y-3">
              {[...schools]
                .filter((s) => Number(s.fees_expected) > 0)
                .sort(
                  (a, b) =>
                    Number(b.fees_collected) / Number(b.fees_expected) - Number(a.fees_collected) / Number(a.fees_expected)
                )
                .map((school, i) => {
                  const pct = Math.round((Number(school.fees_collected) / Number(school.fees_expected)) * 100);
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
                          {fmtRWF(school.fees_collected)} / {fmtRWF(school.fees_expected)} RWF
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
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 mb-4">Fee category breakdown</h2>
          {fee_categories.length === 0 ? (
            <p className="text-sm text-slate-500">No tuition / paid-at-school splits on fee cards for this term yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {fee_categories.map((cat) => {
                const pct = Math.round((cat.collected / cat.expected) * 100);
                return (
                  <div key={cat.name} className="p-3 rounded-xl bg-[#f8fafc] border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                        <span className="text-[12px] font-bold text-slate-700">{cat.name}</span>
                      </div>
                      <span className="text-[11px] font-black" style={{ color: cat.color }}>
                        {pct}%
                      </span>
                    </div>
                    <ProgressBar value={cat.collected} max={cat.expected} color={cat.color} />
                    <div className="flex justify-between mt-1.5 text-[10px] text-slate-400 font-medium">
                      <span>{fmtRWF(cat.collected)}</span>
                      <span>{fmtRWF(cat.expected)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-black text-slate-800">Student fee status</h2>
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <FilterIc /> {showFilters ? 'Hide' : 'Show'} Filters
            </button>
          </div>

          {showFilters && (
            <div className="px-5 py-4 bg-[#f8fafc] border-b border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="col-span-2 sm:col-span-6 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <SearchIc />
                  </span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student, school, parent…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-[13px] focus:outline-none focus:border-amber-400 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">School</label>
                  <select
                    value={filterSchool}
                    onChange={(e) => setFilterSchool(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    <option>All</option>
                    {schools.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Class</label>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    <option value="All Classes">All Classes</option>
                    {classNamesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
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
                    <option value="partial">Partial</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Payment method</label>
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:border-amber-400 bg-white"
                  >
                    <option>All</option>
                    <option>MoMo</option>
                    <option>Bank</option>
                    <option>Cash</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setFilterSchool('All');
                      setFilterClass('All Classes');
                      setFilterStatus('All');
                      setFilterMethod('All');
                    }}
                    className="w-full py-2 rounded-xl text-[11px] font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8fafc] border-b border-slate-100">
                <tr>
                  {['Student', 'School / class', 'Contact', 'Due', 'Paid', 'Remaining', 'Status', 'Last payment', 'Method', 'Ref', 'Action'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const st = statusStyle[s.status];
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
                        <p className="text-[10px] text-slate-400">{s.class}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 whitespace-nowrap">{s.parent}</td>
                      <td className="px-4 py-3 text-[12px] font-bold text-slate-700 tabular-nums">{fmtFull(s.expected)}</td>
                      <td className="px-4 py-3 text-[12px] font-black text-[#000435] tabular-nums">{fmtFull(s.paid)}</td>
                      <td className="px-4 py-3 text-[12px] font-bold tabular-nums" style={{ color: s.remaining > 0 ? '#d97706' : '#10b981' }}>
                        {fmtFull(s.remaining)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${st.bg} ${st.text} ${st.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500 whitespace-nowrap">{s.lastPayment ?? '—'}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 font-semibold">{s.method}</td>
                      <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">{s.receipt}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            title="Download receipt"
                            className="w-7 h-7 rounded-lg bg-[#000435]/8 hover:bg-[#000435]/15 flex items-center justify-center text-[#000435] transition-colors"
                          >
                            <DlIc />
                          </button>
                          <button
                            type="button"
                            title="Send reminder"
                            className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center text-amber-600 transition-colors"
                          >
                            <MsgIc />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-sm font-semibold">No students match your filters.</div>
            )}
          </div>

          <div className="sm:hidden divide-y divide-slate-100">
            {filtered.map((s) => {
              const st = statusStyle[s.status];
              return (
                <div key={s.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
                        style={{ background: '#000435', color: '#f59e0b' }}
                      >
                        {s.avatar}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-800">{s.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {s.school.split(' ').slice(0, 2).join(' ')} · {s.class}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border ${st.bg} ${st.text} ${st.border}`}>{st.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      ['Due', s.expected],
                      ['Paid', s.paid],
                      ['Remaining', s.remaining],
                    ].map(([l, v]) => (
                      <div key={l} className="bg-slate-50 rounded-xl p-2 text-center">
                        <p className="text-[12px] font-black text-slate-800 tabular-nums">{fmtRWF(v)}</p>
                        <p className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">{l}</p>
                      </div>
                    ))}
                  </div>
                  <ProgressBar
                    value={s.paid}
                    max={Math.max(s.expected, 1)}
                    color={s.status === 'paid' ? '#10b981' : s.status === 'partial' ? '#f59e0b' : '#f43f5e'}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-slate-400">
                      {s.lastPayment ?? 'No payment yet'} · {s.method}
                    </span>
                    <div className="flex gap-1.5">
                      <button type="button" className="w-7 h-7 rounded-lg bg-[#000435]/8 flex items-center justify-center text-[#000435]">
                        <DlIc />
                      </button>
                      <button type="button" className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <MsgIc />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3 border-t border-slate-100 bg-[#f8fafc] flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] text-slate-500 font-semibold">
              {filtered.length} of {invoices.length} student(s)
            </p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#000435] bg-[#000435]/8 hover:bg-[#000435]/15 transition-colors"
            >
              <DlIc /> Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-3">Insights</h2>
            <div className="space-y-2.5">
              {insights.length === 0 ? (
                <Insight type="info" text="Data appears when accountants use student fee collections and Babyeyi fee cards for your schools." />
              ) : (
                insights.map((t, idx) => (
                  <Insight key={idx} type={t.toLowerCase().includes('strong') ? 'good' : 'warn'} text={t} />
                ))
              )}
            </div>
            <div className="mt-4 flex gap-2 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-[#000435] bg-[#000435]/8 hover:bg-[#000435]/15 transition-colors"
              >
                <MsgIc /> Bulk SMS reminder
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <MsgIc /> WhatsApp blast
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-slate-800">Recent fee collections</h2>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="space-y-2.5">
              {transactions.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No fee collection entries yet.</p>
              ) : (
                transactions.map((tx) => {
                  const st = txnStyle[tx.status] || txnStyle.pending;
                  return (
                    <div key={tx.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#f8fafc] border border-slate-100">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-slate-800 truncate">{tx.student}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {tx.school} · {tx.method} · {tx.time}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12px] font-black text-[#000435] tabular-nums">{fmtRWF(tx.amount)}</span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg ${st.bg} ${st.text}`}>{st.label}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-3 font-medium">Latest amounts recorded by accountants (school fee collections).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
