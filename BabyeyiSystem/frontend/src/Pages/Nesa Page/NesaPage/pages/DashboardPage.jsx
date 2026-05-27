import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Building2, AlertTriangle, TrendingUp, Activity, ChevronRight, RefreshCw,
  Loader2, BarChart3, ArrowRight, MapPin, Clock,
} from 'lucide-react';
import { font } from '../utils/theme';
import { apiFetch, NESA_API } from '../utils/api';
import { fmt, fmtD } from '../utils/helpers';
import { statusBadgeClass } from '../utils/approvalHelpers';

const NAVY = '#000435';
const AMBER = '#c87800';
const EMERALD = '#10b981';
const RED = '#ef4444';
const BLUE = '#3b82f6';

function ChartCard({ title, subtitle, icon: Icon, children, action }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-[0_2px_12px_rgba(0,4,53,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#fde68a]/80 bg-amber-50/40 px-4 py-3 sm:px-5">
        <div>
          <h3 className="m-0 flex items-center gap-2 text-sm font-bold text-[#000435]">
            {Icon ? <Icon className="h-4 w-4 text-amber-700" /> : null}
            {title}
          </h3>
          {subtitle ? <p className="m-0 mt-0.5 text-[11px] text-amber-800/80">{subtitle}</p> : null}
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

function EmptyChart({ message = 'No data yet' }) {
  return (
    <div className="flex h-[220px] flex-col items-center justify-center text-center sm:h-[260px]">
      <BarChart3 className="mb-2 h-10 w-10 text-[#fde68a]" />
      <p className="m-0 text-sm font-medium text-[#000435]/50">{message}</p>
    </div>
  );
}

function PieLegend({ items }) {
  return (
    <ul className="m-0 flex flex-col gap-2 p-0">
      {items.map((d) => (
        <li key={d.name} className="flex list-none items-center gap-2 text-[12px]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.fill }} />
          <span className="flex-1 font-medium text-[#000435]">{d.name}</span>
          <span className="font-bold tabular-nums text-amber-900">{fmt(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage({
  toast,
  setTab,
  shellStats = null,
  portalFilters,
  filterVersion = 0,
  statsLoad = false,
  onRefresh,
}) {
  const [stats, setStats] = useState(shellStats);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    if (shellStats) {
      setStats((prev) => ({
        ...shellStats,
        recent_requests: prev?.recent_requests ?? [],
      }));
    }
  }, [shellStats]);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const recentParams = new URLSearchParams({ limit: '6', status: 'pending' });
      if (portalFilters?.academicYear) recentParams.set('academic_year', portalFilters.academicYear);
      if (portalFilters?.term) recentParams.set('term', portalFilters.term);
      const recentRes = await apiFetch(`${NESA_API}/requests?${recentParams}`);
      setStats((prev) => ({
        ...(prev || shellStats || {}),
        recent_requests: recentRes?.data || [],
      }));
    } catch {
      /* shell stats still usable */
    } finally {
      setRecentLoading(false);
    }
  }, [portalFilters, shellStats]);

  useEffect(() => {
    loadRecent();
  }, [filterVersion, loadRecent]);

  const loading = statsLoad && !shellStats;
  const refreshing = statsLoad || recentLoading;

  const requestPie = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Pending', value: Number(stats.pending) || 0, fill: AMBER },
      { name: 'DEO recommended', value: Number(stats.recommended) || 0, fill: BLUE },
      { name: 'Approved', value: Number(stats.approved) || 0, fill: EMERALD },
      { name: 'Rejected', value: (Number(stats.rejected) || 0) + (Number(stats.nesa_rejected) || 0), fill: RED },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const compliancePie = useMemo(() => {
    if (!stats) return [];
    const exceeds = Number(stats.exceeds_count) || 0;
    const active = Number(stats.active_count) || 0;
    return [
      { name: 'Compliant', value: Math.max(0, active - exceeds), fill: EMERALD },
      { name: 'Exceeded limit', value: exceeds, fill: RED },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const monthlyData = useMemo(
    () => (stats?.monthly_trend || []).map((r) => ({
      label: r.label,
      total: Number(r.total) || 0,
      approved: Number(r.approved) || 0,
    })),
    [stats],
  );

  const districtBars = useMemo(
    () => (stats?.district_breakdown || []).slice(0, 8).map((r) => ({
      name: (r.district || 'Unknown').length > 10 ? `${String(r.district).slice(0, 9)}…` : r.district,
      total: Number(r.total) || 0,
      approved: Number(r.approved) || 0,
      recommended: Number(r.recommended) || 0,
    })),
    [stats],
  );

  const violationBars = useMemo(
    () => (stats?.district_violations || []).slice(0, 8).map((r) => ({
      name: (r.label || 'Unknown').length > 10 ? `${String(r.label).slice(0, 9)}…` : r.label,
      violations: Number(r.value) || 0,
    })),
    [stats],
  );

  const alerts = useMemo(() => {
    if (!stats) return [];
    const list = [];
    if (Number(stats.needs_action) > 0) {
      list.push({
        id: 'action',
        tone: 'amber',
        title: `${fmt(stats.needs_action)} requests need your review`,
        sub: 'Pending and DEO-recommended fee increase requests',
        tab: 'approvals',
      });
    }
    if (Number(stats.exceeds_count) > 0) {
      list.push({
        id: 'violations',
        tone: 'pulse',
        title: `${fmt(stats.exceeds_count)} schools exceed fee limits`,
        sub: 'Review national compliance in monitoring',
        tab: 'monitoring',
      });
    }
    if (Number(stats.recommended) > 0) {
      list.push({
        id: 'recommended',
        tone: 'navy',
        title: `${fmt(stats.recommended)} DEO-recommended requests`,
        sub: 'Awaiting final NESA decision',
        tab: 'approvals',
      });
    }
    return list;
  }, [stats]);

  const requestTotal = useMemo(
    () => requestPie.reduce((sum, d) => sum + d.value, 0),
    [requestPie],
  );

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24" style={{ fontFamily: font }}>
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <p className="m-0 text-sm text-[#000435]/60">Loading national dashboard…</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24" style={{ fontFamily: font }}>
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="m-0 text-sm text-[#000435]/60">Could not load dashboard data</p>
        <button
          type="button"
          onClick={() => onRefresh?.()}
          className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-bold text-amber-300"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  const go = (tab) => () => setTab?.(tab);

  return (
    <div className="anim space-y-5 pb-4" style={{ fontFamily: font }}>
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={go(a.tab)}
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Monthly submission trend"
            subtitle="Last 12 months · all districts"
            icon={TrendingUp}
          >
            {monthlyData.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData} margin={{ top: 8, right: 12, left: -16, bottom: 8 }}>
                  <defs>
                    <linearGradient id="nesaTotalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={NAVY} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={NAVY} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="nesaApprovedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={EMERALD} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={EMERALD} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: NAVY }} />
                  <YAxis tick={{ fontSize: 10, fill: NAVY }} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="total" name="Submitted" stroke={NAVY} fill="url(#nesaTotalGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="approved" name="Approved" stroke={EMERALD} fill="url(#nesaApprovedGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart message="No submission trend data yet" />
            )}
          </ChartCard>
        </div>

        <ChartCard title="Request status" subtitle="Fee increase requests nationwide" icon={Activity}>
          {requestPie.length ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <div className="relative">
                <ResponsiveContainer width={220} height={220}>
                  <PieChart>
                    <Pie
                      data={requestPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {requestPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="m-0 text-xl font-black tabular-nums text-[#000435]">{fmt(requestTotal)}</p>
                  <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-amber-800/80">Total</p>
                </div>
              </div>
              <PieLegend items={requestPie} />
            </div>
          ) : (
            <EmptyChart message="No request data" />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Fee compliance" subtitle="Active Babyeyi vs exceeded limits" icon={Activity}>
          {compliancePie.length ? (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie
                    data={compliancePie}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {compliancePie.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
              <PieLegend items={compliancePie} />
            </div>
          ) : (
            <EmptyChart message="No compliance data" />
          )}
        </ChartCard>

        <ChartCard
          title="Requests by district"
          subtitle="Top districts by submission volume"
          icon={MapPin}
          action={(
            <button
              type="button"
              onClick={go('analytics')}
              className="rounded-lg border border-[#fde68a] px-2.5 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-50"
            >
              Full analytics
            </button>
          )}
        >
          {districtBars.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={districtBars} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: NAVY }} angle={-30} textAnchor="end" height={52} />
                <YAxis tick={{ fontSize: 10, fill: NAVY }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="total" name="Total" fill={NAVY} radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="approved" name="Approved" fill={EMERALD} radius={[6, 6, 0, 0]} maxBarSize={36} />
                <Bar dataKey="recommended" name="Recommended" fill={BLUE} radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No district breakdown yet" />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {violationBars.length > 0 && (
          <ChartCard
            title="Violations by district"
            subtitle="Schools exceeding NESA fee limits"
            icon={AlertTriangle}
            action={(
              <button
                type="button"
                onClick={go('monitoring')}
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-800 hover:bg-red-100"
              >
                Open monitoring
              </button>
            )}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={violationBars} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fecaca" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: NAVY }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: NAVY }} width={72} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="violations" name="Violations" fill={RED} radius={[0, 6, 6, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <div className={`overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-[0_2px_12px_rgba(0,4,53,0.06)] ${violationBars.length === 0 ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between gap-3 border-b border-[#fde68a]/80 bg-amber-50/40 px-4 py-3 sm:px-5">
            <div>
              <h3 className="m-0 flex items-center gap-2 text-sm font-bold text-[#000435]">
                <Clock className="h-4 w-4 text-amber-700" />
                Needs your attention
              </h3>
              <p className="m-0 mt-0.5 text-[11px] text-amber-800/80">Recent pending fee increase requests</p>
            </div>
            <button
              type="button"
              onClick={go('approvals')}
              className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-[#000435]"
            >
              View all
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {!stats.recent_requests?.length ? (
            <div className="px-4 py-12 text-center text-sm text-[#000435]/50">No pending requests right now</div>
          ) : (
            <ul className="m-0 divide-y divide-[#fde68a]/60 p-0">
              {stats.recent_requests.map((r) => (
                <li key={r.id || `${r.school_name}-${r.submitted_at}`} className="list-none">
                  <button
                    type="button"
                    onClick={go('approvals')}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-50/60 sm:px-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#000435]/5">
                      <Building2 className="h-5 w-5 text-amber-700" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#000435]">{r.school_name || 'Unknown school'}</span>
                      <span className="mt-0.5 block text-[11px] text-[#000435]/55">
                        {r.district || '—'} · {fmtD(r.submitted_at)}
                        {r.academic_year ? ` · ${r.academic_year}` : ''}
                        {r.term ? ` T${r.term}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs font-black tabular-nums text-[#000435]">
                        RWF {fmt(r.requested_amount || r.amount)}
                      </span>
                      <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${statusBadgeClass(r.nesa_status)}`}>
                        {String(r.nesa_status || 'pending').replace(/_/g, ' ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-[#fde68a]/80 p-3 sm:p-4">
            <button
              type="button"
              onClick={go('approvals')}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#000435] to-[#0c1a3a] py-3 text-xs font-black text-amber-300 shadow-md transition-opacity hover:opacity-95"
            >
              Review all requests
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
