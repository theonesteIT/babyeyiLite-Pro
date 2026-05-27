import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  FileText, CheckCircle, Clock, AlertTriangle, Building2, TrendingUp,
  ArrowRight, RefreshCw,   BarChart3,
} from 'lucide-react';
import { fmt } from '../utils/helpers';
import { font } from '../utils/theme';
import DeoFilterToolbar from '../components/DeoFilterToolbar';

const NAVY = '#000435';
const AMBER = '#f59e0b';
const GOLD = '#FEBF10';
const PIE_STATUS = [
  { key: 'approved', name: 'Approved', fill: NAVY },
  { key: 'pending', name: 'Pending', fill: AMBER },
  { key: 'rejected', name: 'Rejected', fill: '#94a3b8' },
  { key: 'draft', name: 'Draft', fill: '#fde68a' },
];
const PIE_REQUESTS = [
  { key: 'pending_requests', name: 'Pending', fill: AMBER },
  { key: 'recommended_requests', name: 'Sent to NESA', fill: '#000c6e' },
  { key: 'approved_requests', name: 'Approved', fill: NAVY },
  { key: 'rejected_requests', name: 'Rejected', fill: '#94a3b8' },
];

function ChartCard({ title, subtitle, children, action }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-[0_2px_12px_rgba(0,4,53,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#fde68a]/80 bg-amber-50/40 px-4 py-3 sm:px-5">
        <div>
          <h3 className="m-0 text-sm font-bold text-[#000435]">{title}</h3>
          {subtitle && <p className="m-0 mt-0.5 text-[11px] text-amber-800/80">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[#fde68a] bg-white px-3 py-2 shadow-lg">
      <p className="m-0 mb-1 text-[11px] font-bold text-[#000435]">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="m-0 text-[11px] font-medium" style={{ color: p.color || NAVY }}>
          {p.name}: <span className="font-bold">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center text-center sm:h-[260px]">
      <BarChart3 className="mb-2 h-10 w-10 text-[#fde68a]" />
      <p className="m-0 text-sm font-medium text-[#000435]/50">{message}</p>
    </div>
  );
}

export default function DashboardTab({
  deo,
  stats,
  statsLoad,
  analytics,
  analyticsLoad,
  onRefresh,
  onNavigate,
  recentItems = [],
  filterBar = null,
}) {
  const [sectorChartMode, setSectorChartMode] = useState('total'); // total | approved | pending

  const statusPie = useMemo(() => {
    if (!stats) return [];
    return PIE_STATUS.map((s) => ({
      name: s.name,
      value: Number(stats[s.key]) || 0,
      fill: s.fill,
    })).filter((d) => d.value > 0);
  }, [stats]);

  const requestPie = useMemo(() => {
    if (!stats) return [];
    return PIE_REQUESTS.map((s) => ({
      name: s.name,
      value: Number(stats[s.key]) || 0,
      fill: s.fill,
    })).filter((d) => d.value > 0);
  }, [stats]);

  const sectorBars = useMemo(() => {
    const rows = stats?.sector_breakdown || [];
    return rows.map((r) => ({
      name: (r.sector || 'Unknown').length > 12 ? `${String(r.sector).slice(0, 11)}…` : r.sector,
      fullName: r.sector,
      total: Number(r.total) || 0,
      approved: Number(r.approved) || 0,
      pending: Number(r.pending) || 0,
    }));
  }, [stats]);

  const termBars = useMemo(() => {
    const rows = analytics?.term_breakdown || [];
    return rows.map((r) => ({
      name: r.term || '—',
      total: Number(r.total) || 0,
      approved: Number(r.approved) || 0,
      pending: Number(r.pending) || 0,
      exceeds: Number(r.exceeds_count) || 0,
    }));
  }, [analytics]);

  const yearArea = useMemo(() => {
    const rows = [...(analytics?.year_breakdown || [])].reverse();
    return rows.map((r) => ({
      year: r.academic_year || '—',
      total: Number(r.total) || 0,
      approved: Number(r.approved) || 0,
    }));
  }, [analytics]);

  const alerts = useMemo(() => {
    const list = [];
    if (Number(stats?.pending) > 0) {
      list.push({
        id: 'pending',
        tone: 'amber',
        title: `${stats.pending} Babyeyi awaiting review`,
        sub: 'Review and approve or reject submissions',
        action: () => onNavigate('list', { status: 'pending' }),
      });
    }
    if (Number(stats?.pending_requests) > 0) {
      list.push({
        id: 'req',
        tone: 'navy',
        title: `${stats.pending_requests} fee increase requests`,
        sub: 'Schools requesting fees above NESA limits',
        action: () => onNavigate('requests', {}),
      });
    }
    if (Number(stats?.exceeds_count) > 0) {
      list.push({
        id: 'exceeds',
        tone: 'pulse',
        title: `${stats.exceeds_count} exceed NESA limits`,
        sub: 'Requires attention or send to NESA',
        action: () => onNavigate('list', { exceeds_limit: '1' }),
      });
    }
    return list;
  }, [stats, onNavigate]);

  const quickActions = [
    { label: 'All Babyeyi', icon: FileText, tab: 'list', filter: {} },
    { label: 'Pending review', icon: Clock, tab: 'list', filter: { status: 'pending' } },
    { label: 'Increase requests', icon: TrendingUp, tab: 'requests', filter: {} },
    { label: 'Schools', icon: Building2, tab: 'schools', filter: {} },
    { label: 'Analytics', icon: BarChart3, tab: 'analytics', filter: {} },
  ];

  const loading = statsLoad || analyticsLoad;

  return (
    <div className="anim space-y-5 pb-4" style={{ fontFamily: font }}>
      {filterBar && <DeoFilterToolbar {...filterBar} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[10px] font-bold uppercase tracking-widest text-amber-700">Overview</p>
          <p className="m-0 text-sm text-[#000435]/70">
            Interactive charts for {deo?.district || 'your'} district
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-[#fde68a] bg-white px-4 py-2.5 text-xs font-bold text-[#000435] shadow-sm transition-colors hover:bg-amber-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 text-amber-600 ${loading ? 'animate-spin' : ''}`} />
          Refresh data
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={a.action}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                a.tone === 'pulse'
                  ? 'border-amber-400 bg-amber-50 animate-pulse'
                  : a.tone === 'navy'
                    ? 'border-[#000435]/15 bg-[#000435]/[0.04] hover:bg-[#000435]/[0.07]'
                    : 'border-[#fde68a] bg-white hover:bg-amber-50/50'
              }`}
            >
              <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${a.tone === 'navy' ? 'text-[#000435]' : 'text-amber-600'}`} />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-sm font-bold text-[#000435]">{a.title}</p>
                <p className="m-0 mt-0.5 text-[11px] text-[#000435]/60">{a.sub}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
            </button>
          ))}
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Babyeyi by sector"
          subtitle="Volume per sector — tap metric to switch"
          action={(
            <div className="flex rounded-lg border border-[#fde68a] p-0.5">
              {[
                { id: 'total', label: 'All' },
                { id: 'approved', label: 'Approved' },
                { id: 'pending', label: 'Pending' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSectorChartMode(m.id)}
                  className={`rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                    sectorChartMode === m.id ? 'bg-[#000435] text-amber-400' : 'text-amber-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        >
          {sectorBars.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectorBars} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: NAVY }}
                  angle={-35}
                  textAnchor="end"
                  height={56}
                />
                <YAxis tick={{ fontSize: 10, fill: NAVY }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey={sectorChartMode}
                  name={sectorChartMode === 'total' ? 'Total' : sectorChartMode === 'approved' ? 'Approved' : 'Pending'}
                  fill={sectorChartMode === 'approved' ? NAVY : AMBER}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No sector data yet" />
          )}
        </ChartCard>

        <ChartCard title="Status breakdown" subtitle="Share of Babyeyi by approval status">
          {statusPie.length ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="m-0 flex w-full flex-wrap justify-center gap-2 p-0 sm:w-auto sm:flex-col sm:justify-start">
                {statusPie.map((s) => (
                  <li key={s.name} className="flex list-none items-center gap-2 text-[11px] font-semibold text-[#000435]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.fill }} />
                    {s.name}: {fmt(s.value)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyChart message="No status data" />
          )}
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
        <ChartCard title="By term" subtitle="Submissions per school term">
          {termBars.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={termBars} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: NAVY }} />
                <YAxis tick={{ fontSize: 10, fill: NAVY }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="approved" name="Approved" fill={NAVY} radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="pending" name="Pending" fill={AMBER} radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="Load analytics for term breakdown" />
          )}
        </ChartCard>
        </div>

        <ChartCard title="Increase requests" subtitle="Fee increase pipeline">
          {requestPie.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={requestPie} cx="50%" cy="50%" outerRadius={88} dataKey="value" label={({ value }) => fmt(value)}>
                  {requestPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No increase requests" />
          )}
        </ChartCard>
      </div>

      {/* Trend + sidebar */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
        <ChartCard title="Trend by academic year" subtitle="Growth of Babyeyi over years">
          {yearArea.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={yearArea} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                <defs>
                  <linearGradient id="deoArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={AMBER} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={AMBER} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: NAVY }} />
                <YAxis tick={{ fontSize: 10, fill: NAVY }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="total" name="Total" stroke={NAVY} fill="url(#deoArea)" strokeWidth={2} />
                <Area type="monotone" dataKey="approved" name="Approved" stroke={GOLD} fill="none" strokeWidth={2} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No year breakdown data" />
          )}
        </ChartCard>
        </div>

        <div className="flex flex-col gap-4">
          <ChartCard title="Quick actions" subtitle="Jump to key tasks">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((q) => {
                const Icon = q.icon;
                return (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => onNavigate(q.tab, q.filter)}
                    className="flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-[#fde68a] bg-amber-50/50 p-2 text-center transition-all hover:border-amber-400 hover:bg-amber-100/60"
                  >
                    <Icon className="h-5 w-5 text-[#000435]" />
                    <span className="text-[10px] font-bold leading-tight text-[#000435]">{q.label}</span>
                  </button>
                );
              })}
            </div>
          </ChartCard>

          <ChartCard title="Top schools" subtitle="Most Babyeyi submissions">
            <ul className="m-0 max-h-[200px] list-none space-y-2 overflow-y-auto p-0">
              {(stats?.school_breakdown || []).slice(0, 6).map((s, i) => (
                <li
                  key={s.school_id || i}
                  className="flex items-center gap-2 rounded-xl border border-[#fde68a]/60 bg-white px-3 py-2"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#000435] text-[10px] font-bold text-amber-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-xs font-bold text-[#000435]">{s.school_name}</p>
                    <p className="m-0 text-[10px] text-amber-800/80">{s.school_sector}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-[#000435]">{s.total}</span>
                </li>
              ))}
              {!(stats?.school_breakdown?.length) && (
                <li className="py-6 text-center text-xs text-[#000435]/50">No schools yet</li>
              )}
            </ul>
          </ChartCard>
        </div>
      </div>

      {/* Recent pending */}
      {recentItems.length > 0 && (
        <ChartCard title="Needs your attention" subtitle="Latest pending Babyeyi">
          <ul className="m-0 list-none space-y-2 p-0">
            {recentItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate('detail', { id: item.id })}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-[#fde68a] bg-white px-3 py-3 text-left transition-colors hover:bg-amber-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                    <Clock className="h-5 w-5 text-amber-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-sm font-bold text-[#000435]">{item.school_name}</p>
                    <p className="m-0 text-[11px] text-amber-800/80">{item.doc_id} · {item.class}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
                </button>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}
    </div>
  );
}
