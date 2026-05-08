import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
  Coins,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { h } from '../utils/href';

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

function formatCompactMoneyRWF(value) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${Math.round(n)}`;
}

function pctDelta(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  if (p <= 0) return null;
  return ((c - p) / p) * 100;
}

const ModalShell = ({ title, subtitle, onClose, children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-[#000435]/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 md:top-16 mx-auto w-[92vw] max-w-4xl">
        <div className="bg-white rounded-[24px]  border border-black/10 overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-black/5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-medium capitalize tracking-[0.28em] text-re-text-muted/45">{subtitle}</p>
              <h3 className="text-base md:text-lg font-medium text-re-navy tracking-tight truncate">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-xl border border-black/10 bg-re-bg  flex items-center justify-center hover:bg-white transition-colors"
              aria-label="Close modal"
            >
              <X size={16} className="text-[#000435]" />
            </button>
          </div>
          <div className="max-h-[75vh] overflow-y-auto p-5 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

function ChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md border border-black/5  p-2.5 rounded-xl z-50">
        <p className="text-[10px] font-medium text-[#000435] capitalize tracking-[0.2em]">{data.label || 'Day'}</p>
        <p className="text-xs font-medium text-[#000435] mt-1">{formatMoneyRWF(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

const RechartsTrend = ({ series = [], height = 120, tone = 'navy' }) => {
  const data = useMemo(() => series.map((s) => ({ ...s, value: Number(s.value) })), [series]);
  const stroke = tone === 'amber' ? '#FEBF10' : '#000435';

  if (!series.length) {
    return (
      <div className="flex items-center justify-center text-[#000435] text-xs" style={{ height }}>
        No data
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`rechartsGrad-${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
            tickFormatter={formatCompactMoneyRWF}
            width={35}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={stroke}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#rechartsGrad-${tone})`}
            animationBegin={0}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

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

const CATEGORY_COLORS = ['#000435', '#FEBF10', '#000866', '#FFD54F', '#000C99', '#FFE680', '#0010CC', '#FFF5CC'];

function emptySeries14() {
  const today = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  return Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today.getTime() - (13 - i) * dayMs);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return { ymd, label, value: 0 };
  });
}

function ymdInMonth(ymd, year, monthIndex) {
  if (!ymd || ymd.length < 7) return false;
  const [y, m] = ymd.split('-').map(Number);
  return y === year && m === monthIndex + 1;
}

function sumPaymentsBetween(payments, toYmdFn, startYmd, endYmd) {
  let s = 0;
  for (const p of payments) {
    const created = toYmdFn(p.created_at);
    if (created >= startYmd && created <= endYmd) s += Number(p.amount_paid || 0);
  }
  return s;
}

function monthBoundsYmd(year, monthIndex) {
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function reminderLabelFromFeeStatus(status) {
  if (status === 'not_paid') return 'Not paid';
  if (status === 'remain_pay') return 'Partially paid';
  if (status === 'no_fee_card') return 'No fee card';
  return 'Balance due';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [modal, setModal] = useState(null); // 'debtors' | 'requisitions' | 'bills' | 'reminders' | 'expenses' | 'payroll' | 'collections'
  const [liveData, setLiveData] = useState(null);
  const [liveOk, setLiveOk] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const fallbackBase = useMemo(() => {
    const z = emptySeries14();
    return {
      payments14: z.map(({ label, value }) => ({ label, value })),
      expenses14: z.map(({ label, value }) => ({ label, value })),
      debtors: [],
      requisitions: [],
      billsDue: [],
      reminders: [],
      expenseCategories: [],
      monthCollections: 0,
      lastMonthCollections: 0,
      monthExpenses: 0,
      lastMonthExpenses: 0,
      todayCollections: 0,
      outstanding: 0,
      learnersOwing: 0,
      payroll: { staffCount: 0, dueDate: '—', totalDue: 0, processed: 0 },
      collectionsLog: [],
      feeReportYear: '',
      feeReportTerm: '',
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    const toYmd = (dt) => {
      const d = new Date(dt);
      if (Number.isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const toLabel = (ymd) => {
      if (!ymd) return '—';
      const d = new Date(`${ymd}T00:00:00`);
      if (Number.isNaN(d.getTime())) return ymd;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    setRefreshing(true);
    setLiveOk(false);
    setLoadError(null);
    try {
      const [settingsRes, cardsRes] = await Promise.all([
        api.get('/dos/academic-calendar-settings').catch(() => null),
        api.get('/accountant/babyeyi-fees').catch(() => null),
      ]);

      const managerYear = String(settingsRes?.data?.data?.current_academic_year || '').trim();
      const managerTermsRaw = Array.isArray(settingsRes?.data?.data?.active_terms)
        ? settingsRes.data.data.active_terms
        : [];
      const managerTerms = managerTermsRaw.map(normalizeUiTerm).filter(Boolean);

      const cards = Array.isArray(cardsRes?.data?.data) ? cardsRes.data.data : [];
      const cardTerms = cards.map((r) => normalizeUiTerm(r.term)).filter(Boolean);
      const cardYears = cards.map((r) => String(r.academic_year || '').trim()).filter(Boolean);

      const feeReportYear = managerYear || cardYears[0] || YEARS[0];
      const feeReportTerm = managerTerms[0] || cardTerms[0] || TERMS[0];

      const [
        overviewRes,
        paymentsRes,
        expensesRes,
        requisitionsRes,
        payrollCfgRes,
        payrollRunsRes,
        feeReportRes,
      ] = await Promise.all([
        api.get('/accountant/overview'),
        api.get('/accountant/payments', { params: { limit: 500 } }),
        api.get('/accountant/expenses'),
        api.get('/accountant/requisitions'),
        api.get('/accountant/payroll/config'),
        api.get('/accountant/payroll/runs', { params: { limit: 8 } }),
        api.get('/accountant/reports/payments', {
          params: { academic_year: feeReportYear, term: feeReportTerm },
        }),
      ]);

      if (!overviewRes.data?.success) {
        setLiveOk(false);
        setLiveData(null);
        setLoadError(overviewRes.data?.message || 'School finance overview is unavailable.');
        return;
      }
      const ov = overviewRes.data?.data || {};
      const payments = Array.isArray(paymentsRes.data?.data) ? paymentsRes.data.data : [];
      const expenseRows = expensesRes.data?.success && Array.isArray(expensesRes.data.data) ? expensesRes.data.data : [];
      const reqRows = requisitionsRes.data?.success && Array.isArray(requisitionsRes.data.data) ? requisitionsRes.data.data : [];
      const payrollCfg = payrollCfgRes.data?.success ? payrollCfgRes.data.data : null;
      const payrollRuns = payrollRunsRes.data?.success && Array.isArray(payrollRunsRes.data.data) ? payrollRunsRes.data.data : [];
      const feeRows =
        feeReportRes.data?.success && Array.isArray(feeReportRes.data.data?.rows) ? feeReportRes.data.data.rows : [];

      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const thisMonth = monthBoundsYmd(y, m);
      const pm = m === 0 ? 11 : m - 1;
      const py = m === 0 ? y - 1 : y;
      const prevMonth = monthBoundsYmd(py, pm);

      const monthCollections = sumPaymentsBetween(payments, toYmd, thisMonth.start, thisMonth.end);
      const lastMonthCollections = sumPaymentsBetween(payments, toYmd, prevMonth.start, prevMonth.end);
      const todayYmd = toYmd(now);
      let todayCollections = 0;

      const collectionsLog = [];
      for (const p of payments) {
        const created = toYmd(p.created_at);
        const paid = Number(p.amount_paid || 0);
        const remaining = Number(p.balance_remaining || 0);
        if (created === todayYmd) todayCollections += paid;
        collectionsLog.push({
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Learner',
          cls: p.class_name || '—',
          amount: paid,
          time: p.created_at ? new Date(p.created_at).toLocaleString() : '—',
          channel: 'Recorded',
          remaining,
        });
      }
      collectionsLog.sort((a, b) => String(b.time).localeCompare(String(a.time)));

      const debtorsFromFees = feeRows
        .map((r) => {
          const rem = r.remaining == null ? null : Number(r.remaining);
          if (rem == null || rem <= 0) return null;
          const name = `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Learner';
          return {
            student_id: r.student_id,
            name,
            cls: r.class_name || '—',
            balance: rem,
            daysOverdue: 0,
            phone: '',
            feeStatus: r.status || '',
          };
        })
        .filter(Boolean)
        .sort((a, b) => b.balance - a.balance);

      const outstanding = feeRows.reduce((s, r) => {
        const rem = r.remaining == null ? 0 : Number(r.remaining);
        return s + (rem > 0 ? rem : 0);
      }, 0);
      const learnersOwing = feeRows.filter((r) => {
        const rem = r.remaining == null ? null : Number(r.remaining);
        return rem != null && rem > 0;
      }).length;

      const reminders = debtorsFromFees.slice(0, 12).map((d) => ({
        name: d.name,
        cls: d.cls,
        balance: d.balance,
        due: reminderLabelFromFeeStatus(d.feeStatus),
      }));

      const payments14 = Array.isArray(ov.collections_last_14_days) && ov.collections_last_14_days.length
        ? ov.collections_last_14_days.map((x) => ({
          label: toLabel(String(x.date || '').slice(0, 10)),
          value: Number(x.total_paid || 0),
        }))
        : emptySeries14().map(({ label, value }) => ({ label, value }));

      const expenseByDay = new Map();
      for (const e of expenseRows) {
        const key = String(e.date || '').slice(0, 10);
        if (!key) continue;
        expenseByDay.set(key, (expenseByDay.get(key) || 0) + Number(e.amount || 0));
      }
      const expenses14 = emptySeries14().map(({ ymd, label }) => ({
        label,
        value: Math.round(expenseByDay.get(ymd) || 0),
      }));

      let monthExpenses = 0;
      let lastMonthExpenses = 0;
      const catAgg = new Map();
      for (const e of expenseRows) {
        const dStr = String(e.date || '').slice(0, 10);
        const amt = Number(e.amount || 0);
        if (ymdInMonth(dStr, y, m)) {
          monthExpenses += amt;
          const c = String(e.category || 'Other').trim() || 'Other';
          catAgg.set(c, (catAgg.get(c) || 0) + amt);
        }
        if (ymdInMonth(dStr, py, pm)) lastMonthExpenses += amt;
      }
      const expenseCategories = Array.from(catAgg.entries())
        .map(([label, value], i) => ({ label, value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
        .sort((a, b) => b.value - a.value);

      const requisitions = reqRows
        .filter((r) => String(r.status || '').toLowerCase() === 'pending')
        .map((r) => ({
          dept: r.dept,
          requester: r.requester,
          amount: Number(r.amount || 0),
          status: 'Pending',
          submitted: r.submitted || '—',
        }));

      const billsDue = expenseRows
        .filter((e) => String(e.status || '').toLowerCase() === 'pending')
        .slice()
        .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
        .slice(0, 12)
        .map((e) => ({
          vendor: e.vendor,
          category: e.category,
          due: e.date || '—',
          amount: Number(e.amount || 0),
        }));

      const rates = Array.isArray(payrollCfg?.rates) ? payrollCfg.rates : [];
      const staffList = Array.isArray(payrollCfg?.staff) ? payrollCfg.staff : [];
      const rateById = Object.fromEntries(rates.map((rr) => [rr.id, rr]));
      const activeStaff = staffList.filter((s) => s.active);
      const staffCount = activeStaff.length;
      let totalDue = 0;
      for (const s of activeStaff) {
        const rr = rateById[s.rateId];
        totalDue += (Number(rr?.base) || 0) + (Number(rr?.allowance) || 0);
      }
      const lastRun = payrollRuns[0];
      const processed = lastRun && Number(lastRun.staffCount) > 0 ? Math.min(Number(lastRun.staffCount), staffCount) : 0;
      const dueEnd = new Date(y, m + 1, 0);
      const dueDate = dueEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      setLiveData({
        ...fallbackBase,
        payments14,
        expenses14,
        debtors: debtorsFromFees.slice(0, 20),
        requisitions,
        billsDue,
        reminders,
        expenseCategories,
        monthCollections,
        lastMonthCollections,
        monthExpenses,
        lastMonthExpenses,
        todayCollections,
        outstanding,
        learnersOwing,
        payroll: { staffCount, dueDate, totalDue, processed },
        collectionsLog: collectionsLog.slice(0, 24),
        feeReportYear,
        feeReportTerm,
      });
      setLiveOk(true);
    } catch (e) {
      console.warn('[Dashboard] Live accountant data unavailable:', e.message);
      setLiveData(null);
      setLiveOk(false);
      setLoadError(e?.response?.data?.message || e.message || 'Could not reach the finance server.');
    } finally {
      setRefreshing(false);
    }
  }, [fallbackBase]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const mock = liveData || fallbackBase;

  const kpis = useMemo(() => {
    const netCashflow = mock.monthCollections - mock.monthExpenses;
    const collectionsDelta = pctDelta(mock.monthCollections, mock.lastMonthCollections);
    const expensesDelta = pctDelta(mock.monthExpenses, mock.lastMonthExpenses);
    const payrollPending = Math.max(0, mock.payroll.staffCount - mock.payroll.processed);
    return { netCashflow, collectionsDelta, expensesDelta, payrollPending };
  }, [mock]);

  const expenseTotal = useMemo(() => mock.expenseCategories.reduce((s, c) => s + c.value, 0), [mock.expenseCategories]);

  const dashHeroStats = useMemo(
    () => [
      {
        label: "Today's collections",
        value: `${formatCompactMoneyRWF(mock.todayCollections)} RWF`,
        subValue: refreshing ? 'Refreshing…' : !liveOk ? 'Limited connectivity' : null,
        icon: Wallet,
        onClick: () => setModal('collections'),
      },
      {
        label: 'Month collections (MTD)',
        value: `${formatCompactMoneyRWF(mock.monthCollections)} RWF`,
        subValue:
          kpis.collectionsDelta != null
            ? `${kpis.collectionsDelta >= 0 ? '▲' : '▼'} ${Math.abs(kpis.collectionsDelta).toFixed(1)}% vs last month`
            : null,
        icon: TrendingUp,
        onClick: () => setModal('collections'),
      },
      {
        label: 'Outstanding fees',
        value: `${formatCompactMoneyRWF(mock.outstanding)} RWF`,
        subValue: `${mock.learnersOwing} learners owing`,
        icon: Banknote,
        onClick: () => setModal('debtors'),
      },
      {
        label: 'Net cashflow (MTD)',
        value: `${kpis.netCashflow >= 0 ? '+' : ''}${formatCompactMoneyRWF(kpis.netCashflow)} RWF`,
        subValue: kpis.netCashflow >= 0 ? 'Surplus' : 'Deficit',
        icon: Coins,
        onClick: () => setModal('expenses'),
      },
    ],
    [mock, kpis, refreshing, liveOk],
  );

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-full pb-24 lg:pb-10 relative w-full">
      {/* Hero — ochre institutional band (manager dashboard pattern) */}
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between max-w-4xl lg:max-w-none">
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
              </div>
              <h1
                className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Accountant dashboard
              </h1>
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85 max-w-xl leading-relaxed">
                Fees · invoicing · expenses · payroll — same command layout as manager
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-3 py-2">
                <span className="text-[10px] font-medium uppercase tracking-widest text-white/90">
                  {refreshing ? 'Updating…' : liveOk ? 'Live data' : 'Offline'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => loadDashboard()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all active:scale-95 disabled:opacity-60"
                title="Refresh"
                disabled={refreshing}
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlapping KPI strip */}
      <div className="acct-shell-standard mb-6 sm:mb-8">
        <div className="acct-panel-sheet overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 xl:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
              {dashHeroStats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={stat.onClick}
                  className="p-4 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/40 transition-all cursor-pointer min-h-[7.5rem]"
                >
                  <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                    <stat.icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
                  </div>
                  <span className="text-sm sm:text-xl font-semibold text-re-text tracking-tight group-hover:text-[#1E3A5F] transition-colors tabular-nums">
                    {stat.value}
                  </span>
                  <p className="text-[7px] sm:text-[8px] font-medium text-re-text-muted uppercase tracking-[0.16em] mt-0.5 opacity-70">
                    {stat.label}
                  </p>
                  {stat.subValue && (
                    <p
                      className={`text-[6px] sm:text-[7px] font-medium uppercase tracking-widest mt-1 opacity-85 max-w-[11rem] ${String(stat.subValue).startsWith('▼') || String(stat.subValue) === 'Deficit' ? 'text-rose-600' : 'text-[#1E3A5F]'}`}
                    >
                      {stat.subValue}
                    </p>
                  )}
                </button>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate(h('/fees'))}
                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
              >
                Student fees
              </button>
              <button
                type="button"
                onClick={() => navigate(h('/expenses'))}
                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/10 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
              >
                School expenses
              </button>
              <button
                type="button"
                onClick={() => navigate(h('/invoices'))}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-medium text-[9px] uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/40 bg-[#FEBF10]/15 hover:bg-[#FEBF10]/25 transition-all"
              >
                Invoice registry
              </button>
            </div>
            <div className="lg:hidden grid grid-cols-3 gap-2 p-4 border-t border-black/5 bg-white">
              <button
                type="button"
                onClick={() => navigate(h('/fees'))}
                className="h-10 rounded-xl text-[9px] font-medium uppercase tracking-widest text-white border border-black/10 shadow-sm active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
              >
                Fees
              </button>
              <button
                type="button"
                onClick={() => navigate(h('/expenses'))}
                className="h-10 rounded-xl text-[9px] font-medium uppercase tracking-widest text-[#1E3A5F] border border-black/10 bg-white"
              >
                Expenses
              </button>
              <button
                type="button"
                onClick={() => navigate(h('/invoices'))}
                className="h-10 rounded-xl text-[9px] font-medium uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/40 bg-[#FEBF10]/15"
              >
                Invoices
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-10 relative z-10 pb-24">
        {loadError && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-[11px] font-medium text-[#000435]"
          >
            {loadError}{' '}
            <button
              type="button"
              onClick={() => loadDashboard()}
              className="ml-1 underline font-medium text-amber-800 hover:text-amber-950"
            >
              Retry
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            PRIMARY STATS GRID  —  4 cols: [fees col] [costs col]
            Mirrors the discipline portal: related things in one grid col
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* ── LEFT column (span 2): Fee Collection stats ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[24px] border border-black/10 overflow-hidden h-full flex flex-col shadow-sm transition-all">
              {/* column header */}
              <div className="px-5 py-4 border-b border-[#000435]/10 bg-gradient-to-r from-[#000435]/[0.03] to-amber-100/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote size={17} className="text-[#000435]" />
                  <h3 className="text-xs md:text-[13px] font-medium text-[#000435] capitalize tracking-[0.18em]">Fee Collections</h3>
                </div>
                <span className="text-[10px] font-medium capitalize tracking-widest text-[#000435]/70 text-right max-w-[12rem] truncate" title={mock.feeReportYear && mock.feeReportTerm ? `${mock.feeReportYear} · ${mock.feeReportTerm}` : ''}>
                  {liveOk && mock.feeReportYear && mock.feeReportTerm
                    ? `${mock.feeReportYear} · ${mock.feeReportTerm}`
                    : 'Live'}
                </span>
              </div>

              {/* Today collections — hero stat */}
              <button
                type="button"
                onClick={() => setModal('collections')}
                className="p-5 md:p-6 border-b border-gray-100 flex flex-col items-start text-left w-full hover:bg-white/60 transition-all active:scale-[0.99]"
              >
                <span className="text-[11px] font-medium capitalize tracking-[0.22em] text-[#000435]/70">Today's collections</span>
                <span className="text-3xl md:text-4xl font-medium tracking-tighter text-[#000435] mt-1.5">
                  {formatCompactMoneyRWF(mock.todayCollections)}
                  <span className="text-base md:text-lg font-medium text-[#000435] ml-1.5">RWF</span>
                </span>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-medium capitalize tracking-widest text-[#000435]/60">
                  View breakdown ↓
                </div>
              </button>

              {/* Month collections + outstanding — hint cells like discipline attendance */}
              <div className="grid grid-cols-2 flex-1">
                {/* Month collections */}
                <div className="p-4 md:p-5 flex flex-col items-center justify-center text-center border-r border-gray-100">
                  <span className="text-2xl md:text-3xl font-medium tracking-tighter text-[#000435]">
                    {formatCompactMoneyRWF(mock.monthCollections)}
                  </span>
                  <p className="text-[11px] font-medium text-[#000435] capitalize tracking-widest mt-1.5 opacity-70">Month (MTD)</p>
                  {kpis.collectionsDelta != null && (
                    <p className={`text-[11px] font-medium mt-1 ${kpis.collectionsDelta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {kpis.collectionsDelta >= 0 ? '▲' : '▼'} {Math.abs(kpis.collectionsDelta).toFixed(1)}% vs last mo.
                    </p>
                  )}
                </div>

                {/* Outstanding + top debtor hints — all in one cell */}
                <div className="p-3.5 md:p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-xl md:text-2xl font-medium tracking-tighter text-[#000435] leading-none">
                    {formatCompactMoneyRWF(mock.outstanding)}
                  </span>
                  <p className="text-[11px] font-medium text-[#000435] capitalize tracking-widest mt-1.5 opacity-70">Outstanding</p>
                  <div className="w-full h-px bg-re-bg my-2" />
                  {/* hint: learners owing + top debtor — like attendance "Absent / Missed" */}
                  <div className="flex flex-col gap-1.5 text-[10px] font-medium text-[#000435] w-full bg-re-bg rounded-lg py-2 px-2.5 border border-[#000435]">
                    <button
                      type="button"
                      onClick={() => setModal('debtors')}
                      className="flex justify-between items-center text-left w-full bg-transparent px-0 py-0 border-0 outline-none transition group"
                      title="View debtors"
                    >
                      <span className="capitalize tracking-widest group-hover:text-[#000435] transition-colors">Owing</span>
                      <span className="font-medium text-amber-600 group-hover:text-amber-700 transition-colors">{mock.learnersOwing} learners</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModal('reminders')}
                      className="flex justify-between items-center text-left w-full bg-transparent px-0 py-0 border-0 outline-none transition group"
                      title="Send fee reminders"
                    >
                      <span className="capitalize tracking-widest group-hover:text-[#000435] transition-colors">Reminders</span>
                      <span className="font-medium text-red-500 group-hover:text-red-600 transition-colors">{mock.reminders.length} due</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CENTER column (span 2): Cost & Financial Health stats ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[24px] border border-black/10 overflow-hidden h-full flex flex-col shadow-sm transition-all">
              {/* column header */}
              <div className="px-5 py-4 border-b border-[#000435]/10 bg-gradient-to-r from-[#000435]/[0.03] to-amber-100/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown size={17} className="text-amber-500" />
                  <h3 className="text-xs md:text-[13px] font-medium text-[#000435] capitalize tracking-[0.18em]">Costs & Cashflow</h3>
                </div>
                <span className="text-[11px] font-medium capitalize tracking-widest text-[#000435]">MTD</span>
              </div>

              {/* Expenses MTD — hero stat */}
              <button
                type="button"
                onClick={() => setModal('expenses')}
                className="p-5 md:p-6 border-b border-gray-100 flex flex-col items-start text-left w-full hover:bg-white/60 transition-all active:scale-[0.99]"
              >
                <span className="text-[11px] font-medium capitalize tracking-[0.22em] text-[#000435]/70">Expenses (MTD)</span>
                <span className="text-3xl md:text-4xl font-medium tracking-tighter text-[#000435] mt-1.5">
                  {formatCompactMoneyRWF(mock.monthExpenses)}
                  <span className="text-base md:text-lg font-medium text-[#000435] ml-1.5">RWF</span>
                </span>
                {kpis.expensesDelta != null && (
                  <p className={`text-[11px] font-medium mt-1 ${kpis.expensesDelta <= 0 ? 'text-emerald-500' : 'text-amber-600'}`}>
                    {kpis.expensesDelta <= 0 ? '▼' : '▲'} {Math.abs(kpis.expensesDelta).toFixed(1)}% vs last mo.
                  </p>
                )}
              </button>

              {/* Net cashflow + payroll hints — analogous to discipline "standing + permissions" */}
              <div className="grid grid-cols-2 flex-1">
                {/* Net cashflow */}
                <div className="p-4 md:p-5 flex flex-col items-center justify-center text-center border-r border-gray-100">
                  <span className={`text-2xl md:text-3xl font-medium tracking-tighter ${kpis.netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {kpis.netCashflow >= 0 ? '+' : ''}{formatCompactMoneyRWF(kpis.netCashflow)}
                  </span>
                  <p className="text-[11px] font-medium text-[#000435] capitalize tracking-widest mt-1.5 opacity-70">Net Cashflow</p>
                  <p className={`text-[11px] font-medium mt-1 ${kpis.netCashflow >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {kpis.netCashflow >= 0 ? 'Surplus' : 'Deficit'}
                  </p>
                </div>

                {/* Payroll hints in single cell */}
                <div className="p-3.5 md:p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-xl md:text-2xl font-medium tracking-tighter text-[#000435] leading-none">
                    {formatCompactMoneyRWF(mock.payroll.totalDue)}
                  </span>
                  <p className="text-[11px] font-medium text-[#000435] capitalize tracking-widest mt-1.5 opacity-70">Payroll Due</p>
                  <div className="w-full h-px bg-re-bg my-2" />
                  <div className="flex flex-col gap-1.5 text-[10px] font-medium text-[#000435] w-full bg-re-bg rounded-lg py-2 px-2.5 border border-[#000435]">
                    <button
                      type="button"
                      onClick={() => navigate(h('/payroll/history'))}
                      className="flex justify-between items-center text-left w-full bg-re-bg hover:bg-white px-2.5 py-2 rounded-xl border border-black/5 transition-all group"
                    >
                      <span className="capitalize tracking-widest text-[#000435] group-hover:text-[#000435]">Processed</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#000435]">{mock.payroll.processed}/{mock.payroll.staffCount}</span>
                        <ArrowRight size={10} className="text-[#000435] group-hover:text-[#000435]" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(h('/requisitions'))}
                      className="flex justify-between items-center text-left w-full bg-re-bg hover:bg-white px-2.5 py-2 rounded-xl border border-black/5 transition-all group"
                    >
                      <span className="capitalize tracking-widest text-[#000435] group-hover:text-[#000435]">Requisitions</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-amber-600 group-hover:text-amber-700">{mock.requisitions.length}</span>
                        <ArrowRight size={10} className="text-[#000435] group-hover:text-[#000435]" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(h('/expenses'))}
                      className="flex justify-between items-center text-left w-full bg-re-bg hover:bg-white px-2.5 py-2 rounded-xl border border-black/5 transition-all group"
                    >
                      <span className="capitalize tracking-widest text-[#000435] group-hover:text-[#000435]">Bills Due</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-red-500 group-hover:text-red-600">{mock.billsDue.length}</span>
                        <ArrowRight size={10} className="text-[#000435] group-hover:text-[#000435]" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            SECONDARY ROW — Collections trend chart + Top debtors table
        ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">

          {/* Collections trend: spans 2 cols */}
          <div className="bg-white rounded-[24px] p-5 md:p-6 lg:col-span-2 shadow-sm border border-black/10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[#000435]" />
                <h3 className="text-sm md:text-[15px] font-medium text-[#000435] capitalize tracking-[0.16em]">Collections trend</h3>
              </div>
              <span className="text-[11px] font-medium capitalize tracking-widest text-[#000435]">Last 14 days</span>
            </div>
            <RechartsTrend series={mock.payments14} />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-2xl bg-gradient-to-br from-white to-[#f7f9ff] border border-[#000435]/10 p-5 flex flex-col items-center">
                <p className="text-[11px] font-medium capitalize tracking-[0.22em] text-[#000435]/70 mb-4 w-full">Expenses trend</p>
                <div className="w-full">
                  <RechartsTrend series={mock.expenses14} tone="amber" height={100} />
                </div>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-white to-[#fff9ea] border border-amber-200/70 p-5">
                <p className="text-[11px] font-medium capitalize tracking-[0.22em] text-[#000435]/70 mb-4">Expense breakdown</p>
                <div className="min-w-0 space-y-2">
                  {mock.expenseCategories.map((c) => (
                    <div key={c.label} className="flex items-center justify-between gap-1 group">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0 " style={{ background: c.color }} />
                        <p className="text-[11px] font-medium text-[#000435] truncate capitalize tracking-tighter group-hover:text-amber-600 transition-colors">{c.label}</p>
                      </div>
                      <p className="text-[11px] font-medium text-[#000435] shrink-0">
                        {Math.round((c.value / (expenseTotal || 1)) * 100)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top debtors: 1 col */}
          <div className="bg-white rounded-[24px] p-5 md:p-6 shadow-sm border border-black/10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={18} className="text-[#000435]" />
                <h3 className="text-sm md:text-[15px] font-medium text-[#000435] capitalize tracking-[0.16em]">Top debtors</h3>
              </div>
              <button
                onClick={() => setModal('debtors')}
                className="text-[11px] font-medium capitalize tracking-widest text-[#000435]/60 hover:text-[#000435] transition-colors flex items-center gap-1"
              >
                All <ArrowRight size={11} />
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-black/5">
              <table className="w-full text-left">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-medium capitalize tracking-[0.18em] text-[#000435]/70">Learner</th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium capitalize tracking-[0.18em] text-[#000435]/70">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {mock.debtors.slice(0, 5).map((d, i) => (
                    <tr key={d.student_id ?? d.name ?? i} className="border-t border-black/5 hover:bg-white/40 transition-colors group">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-[#000435]">{d.name}</p>
                        <p className="text-[11px] font-medium text-[#000435]">{d.cls}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-medium text-[#000435]">{formatCompactMoneyRWF(d.balance)}</span>
                          <button
                            title="Send Reminder"
                            className="p-1 rounded-md bg-amber-50 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-100"
                          >
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick notes embedded below table — same col */}
            <div className="mt-4">
              <button
                onClick={() => setModal('reminders')}
                className="w-full h-12 flex items-center justify-between px-5 rounded-2xl bg-gradient-to-r from-[#000435] to-[#00107a] text-white hover:to-[#000435] transition-all active:scale-[0.98] group border border-amber-300/40"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-re-bg/10 flex items-center justify-center">
                    <TrendingUp size={12} className="text-white" />
                  </div>
                  <span className="text-xs font-medium capitalize tracking-[0.12em]">Send reminder to parents</span>
                </div>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="mt-2.5 rounded-2xl bg-re-bg border border-black/5  p-3.5 flex justify-between items-center">
                <div>
                  <p className="text-[11px] font-medium capitalize tracking-[0.16em] text-[#000435]">Payroll Status</p>
                  <p className="text-xs font-medium text-[#000435] mt-0.5">Approvals due by {mock.payroll.dueDate}</p>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ MODALS ═══════════ */}
      {modal === 'debtors' && (
        <ModalShell title="Outstanding fees" subtitle="Top debtors · live" onClose={() => setModal(null)}>
          <div className="overflow-hidden rounded-2xl border border-black/5">
            <table className="w-full text-left">
              <thead className="bg-re-bg">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Learner</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Class</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Overdue</th>
                  <th className="px-4 py-3 text-right text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Balance</th>
                </tr>
              </thead>
              <tbody>
                {mock.debtors.map((d, i) => (
                  <tr key={d.student_id ?? d.name ?? i} className="border-t border-black/5 hover:bg-re-bg/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-medium text-re-navy">{d.name}</p>
                      <p className="text-[9px] font-medium text-re-text-muted/60">{d.phone ? d.phone : 'No phone on file'}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{d.cls}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{d.daysOverdue} days</td>
                    <td className="px-4 py-3 text-right text-[11px] font-medium text-re-navy">{formatMoneyRWF(d.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}

      {modal === 'requisitions' && (
        <ModalShell title="Requisitions pending approval" subtitle="Work queue · live" onClose={() => setModal(null)}>
          <div className="overflow-hidden rounded-2xl border border-black/5">
            <table className="w-full text-left">
              <thead className="bg-re-bg">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Department</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Requester</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Submitted</th>
                  <th className="px-4 py-3 text-right text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Amount</th>
                </tr>
              </thead>
              <tbody>
                {mock.requisitions.map((r, i) => (
                  <tr key={i} className="border-t border-black/5 hover:bg-re-bg/40 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{r.dept}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{r.requester}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-text-muted/80">{r.submitted}</td>
                    <td className="px-4 py-3 text-right text-[11px] font-medium text-re-navy">{formatMoneyRWF(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}

      {modal === 'bills' && (
        <ModalShell title="Bills due this week" subtitle="Pending expenses · live" onClose={() => setModal(null)}>
          <div className="overflow-hidden rounded-2xl border border-black/5">
            <table className="w-full text-left">
              <thead className="bg-re-bg">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Vendor</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Category</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Due</th>
                  <th className="px-4 py-3 text-right text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Amount</th>
                </tr>
              </thead>
              <tbody>
                {mock.billsDue.map((b, i) => (
                  <tr key={i} className="border-t border-black/5 hover:bg-re-bg/40 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{b.vendor}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{b.category}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-text-muted/80">{b.due}</td>
                    <td className="px-4 py-3 text-right text-[11px] font-medium text-re-navy">{formatMoneyRWF(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}

      {modal === 'reminders' && (
        <ModalShell title="Fee reminders to send" subtitle="Follow-ups · live" onClose={() => setModal(null)}>
          <div className="overflow-hidden rounded-2xl border border-black/5">
            <table className="w-full text-left">
              <thead className="bg-re-bg">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Learner</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Class</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Due</th>
                  <th className="px-4 py-3 text-right text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Balance</th>
                </tr>
              </thead>
              <tbody>
                {mock.reminders.map((r, i) => (
                  <tr key={i} className="border-t border-black/5 hover:bg-re-bg/40 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{r.name}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{r.cls}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-text-muted/80">{r.due}</td>
                    <td className="px-4 py-3 text-right text-[11px] font-medium text-re-navy">{formatMoneyRWF(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}

      {modal === 'expenses' && (
        <ModalShell title="Expenses (MTD)" subtitle="Breakdown · live" onClose={() => setModal(null)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl bg-re-bg border border-black/5  p-5">
              <p className="text-[9px] font-medium capitalize tracking-[0.28em] text-re-text-muted/45">Total</p>
              <p className="text-2xl font-medium text-re-navy mt-1">{formatMoneyRWF(mock.monthExpenses)}</p>
              <div className="mt-4 space-y-2">
                {mock.expenseCategories.map((c) => (
                  <div key={c.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                      <p className="text-[11px] font-medium text-re-navy">{c.label}</p>
                    </div>
                    <p className="text-[11px] font-medium text-re-navy">{formatMoneyRWF(c.value)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-re-bg border border-black/5  p-5">
              <p className="text-[9px] font-medium capitalize tracking-[0.28em] text-re-text-muted/45">Expenses trend (14 days)</p>
              <div className="mt-3">
                <RechartsTrend series={mock.expenses14} tone="amber" height={100} />
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {modal === 'payroll' && (
        <ModalShell title="Payroll status" subtitle="Pay period · live" onClose={() => setModal(null)}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { k: 'Total due', v: formatMoneyRWF(mock.payroll.totalDue) },
              { k: 'Processed', v: `${mock.payroll.processed}/${mock.payroll.staffCount}` },
              { k: 'Due date', v: mock.payroll.dueDate },
            ].map((s) => (
              <div key={s.k} className="rounded-2xl bg-re-bg border border-black/5  p-5">
                <p className="text-[9px] font-medium capitalize tracking-[0.28em] text-re-text-muted/45">{s.k}</p>
                <p className="text-lg font-medium text-re-navy mt-1">{s.v}</p>
              </div>
            ))}
          </div>
        </ModalShell>
      )}

      {modal === 'collections' && (
        <ModalShell title="Fee Collections Log" subtitle="Who paid · how much · when · remaining" onClose={() => setModal(null)}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-re-bg border-b border-black/5">
                <tr>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Learner</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Class</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Channel</th>
                  <th className="px-4 py-3 text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">When</th>
                  <th className="px-4 py-3 text-right text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Collected</th>
                  <th className="px-4 py-3 text-right text-[9px] font-medium capitalize tracking-[0.24em] text-re-text-muted/60">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {mock.collectionsLog.map((c, i) => (
                  <tr key={i} className="border-t border-black/5 hover:bg-re-bg/40 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{c.name}</td>
                    <td className="px-4 py-3 text-[11px] font-medium text-re-navy">{c.cls}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-medium capitalize tracking-wider border bg-re-bg text-[#000435] border-[#000435]">
                        {c.channel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-medium text-re-text-muted/80">{c.time}</td>
                    <td className="px-4 py-3 text-right text-[11px] font-medium text-emerald-600">{formatMoneyRWF(c.amount)}</td>
                    <td className="px-4 py-3 text-right text-[11px] font-medium">
                      {c.remaining === 0
                        ? <span className="text-emerald-500">Cleared</span>
                        : <span className="text-amber-600">{formatMoneyRWF(c.remaining)}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
