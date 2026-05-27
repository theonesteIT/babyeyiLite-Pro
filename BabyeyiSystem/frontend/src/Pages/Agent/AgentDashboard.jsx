import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Banknote,
  Clock,
  ArrowUpRight,
  Loader2,
  Zap,
  ShoppingBag,
  BarChart3,
  PieChart,
  Calendar,
  BadgePercent,
  School,
} from "lucide-react";
import { axAgent } from "./agentApi";
import { ACCENT_SLATE, pageShell, pageCardPad } from "./agentTheme";
import AgentPageHeader from "./AgentPageHeader";
import { BABYEYI_FONT_STACK, BABYEYI_NAVY, BABYEYI_AMBER } from "../../theme/babyeyiDashboardTheme";
import { LineAreaChart, DonutChart, ModernBarChart } from "../School Manager/components/UI";

const PERIOD_OPTIONS = [
  { value: "all_time", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
];

const SECTOR_COLORS = ["#f59e0b", "#000435", "#10b981", "#6366f1", "#ef4444", "#06b6d4", "#8b5cf6"];

function formatRwf(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

function KpiCard({ icon: Icon, label, value, sub, to, highlight }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            highlight ? "bg-amber-400" : "bg-amber-50"
          }`}
        >
          <Icon className={`w-4 h-4 ${highlight ? "text-[#000435]" : "text-amber-600"}`} />
        </div>
        {to && <ArrowUpRight className="w-4 h-4 text-slate-400 shrink-0" />}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-[#000435] tabular-nums leading-tight">{value}</p>
      <p className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{sub}</p>}
    </>
  );

  const className = `text-left rounded-xl sm:rounded-2xl p-3 sm:p-4 border transition-all hover:shadow-md active:scale-[0.98] block ${
    highlight
      ? "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/80"
      : "border-slate-200 bg-white"
  }`;

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-600">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
        Collected (RWF)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BABYEYI_NAVY }} />
        Pending (RWF)
      </span>
    </div>
  );
}

/** Horizontal bars — full labels (sectors / schools) */
function AgentHBarChart({ data = [], valueKey = "value", labelKey = "label", formatValue, subLabelKey, maxBars = 12 }) {
  const items = data.slice(0, maxBars);
  const max = Math.max(1, ...items.map((d) => Number(d[valueKey]) || 0));
  if (!items.length) {
    return <p className="text-center text-sm text-slate-400 py-8">No data for this period.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const label = d[labelKey] ?? "—";
        const sub = subLabelKey ? d[subLabelKey] : null;
        const pct = Math.round((val / max) * 100);
        const color = d.color || SECTOR_COLORS[i % SECTOR_COLORS.length];
        const displayVal = formatValue ? formatValue(val) : val.toLocaleString();

        return (
          <div key={`${label}-${i}`} title={`${label}${sub ? ` · ${sub}` : ""}: ${Number(val).toLocaleString()} RWF`}>
            <div className="mb-1 flex justify-between gap-2 text-[11px] font-semibold text-[#000435]">
              <span className="min-w-0 truncate">
                {label}
                {sub && <span className="ml-1 font-medium text-slate-400">({sub})</span>}
              </span>
              <span className="shrink-0 tabular-nums text-amber-800">{displayVal}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}99)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CollectionRateBars({ data = [] }) {
  if (!data.length) return <p className="text-center text-sm text-slate-400 py-6">No sector rates yet.</p>;
  return (
    <div className="space-y-2.5">
      {data.map((row) => {
        const pct = Math.min(100, Math.max(0, Number(row.collection_rate) || 0));
        const tone = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
        return (
          <div key={row.sector}>
            <div className="mb-1 flex justify-between text-[11px] font-semibold">
              <span className="text-[#000435] truncate pr-2">{row.sector}</span>
              <span className="tabular-nums text-slate-700 shrink-0">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: tone }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChartCard({ title, icon: Icon, children, action, legend }) {
  return (
    <div className={`${pageCardPad} flex flex-col min-h-[280px]`}>
      <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
        <h3 className="font-bold text-[#000435] flex items-center gap-2 text-sm">
          {Icon && <Icon className="w-4 h-4 text-amber-500 shrink-0" />}
          {title}
        </h3>
        {action}
      </div>
      {legend && <div className="mb-3 shrink-0">{legend}</div>}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export default function AgentDashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all_time");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axAgent
      .get("/summary", { period })
      .then((r) => {
        if (!cancelled && r.data.success) setData(r.data.data);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.response?.data?.message || "Could not load summary");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const assign = data?.assignment;
  const noCov = data?.no_coverage || !assign?.sectors?.length;

  const coverageLine = useMemo(() => {
    if (!assign) return "";
    const parts = [assign.province, assign.district];
    if (assign.all_sectors) parts.push("all sectors in this district");
    else if (assign.sectors?.length) {
      const list = assign.sectors.slice(0, 6).join(", ");
      parts.push(list + (assign.sectors.length > 6 ? "…" : ""));
    }
    return parts.filter(Boolean).join(" · ");
  }, [assign]);

  const rateDelta = useMemo(() => {
    const cur = Number(data?.collection_rate ?? 0);
    const prev = Number(data?.collection_rate_prev ?? 0);
    return cur - prev;
  }, [data]);

  const sectorBarData = useMemo(
    () =>
      (data?.by_sector || []).map((r) => ({
        label: (r.sector || "").slice(0, 8),
        fullLabel: r.sector,
        value: r.collected_rwf,
        pending: r.pending_rwf,
      })),
    [data]
  );

  const sectorTotalBars = useMemo(
    () =>
      (data?.by_sector || []).map((r, i) => ({
        label: r.sector,
        value: r.collected_rwf + r.pending_rwf,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      })),
    [data]
  );

  const schoolCollectedBars = useMemo(
    () =>
      (data?.by_school || []).map((r, i) => ({
        label: r.school_name,
        shortLabel: (r.school_name || "").slice(0, 8),
        value: r.collected_rwf,
        pending: r.pending_rwf,
        sector: r.sector,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      })),
    [data]
  );

  const schoolTotalBars = useMemo(
    () =>
      (data?.by_school || []).map((r, i) => ({
        label: r.school_name,
        value: r.total_rwf,
        sector: r.sector,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      })),
    [data]
  );

  const donutData = useMemo(() => {
    const rows = data?.schools_by_sector || [];
    return rows.map((r, i) => ({
      label: r.label,
      value: r.value,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    }));
  }, [data]);

  const quickActions = [
    { label: "Filter schools", to: "/agent/schools", primary: false },
    { label: "Service revenue breakdown", to: "/agent/services", primary: false },
    { label: "Monthly reports", to: "/agent/reports", primary: true },
    { label: "Support requests", to: "/agent/support-requests", primary: false },
    { label: "Shop products", to: "/agent/shop-products", primary: false },
    { label: "Shop orders", to: "/agent/shop-orders", primary: false },
  ];

  if (loading && !data) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: ACCENT_SLATE }} />
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 text-red-800 text-sm font-semibold p-4">{err}</div>
    );
  }

  const kpiCards = [
    {
      label: "Schools in your area",
      value: data?.schools_in_coverage ?? 0,
      sub: "Active registrations matching your sectors",
      icon: Building2,
      to: "/agent/schools",
    },
    {
      label: "Total collected (Babyeyi)",
      value: `${Number(data?.total_collected_rwf || 0).toLocaleString()} RWF`,
      sub: `${data?.paid_transactions ?? 0} confirmed payment(s)`,
      icon: Banknote,
      to: "/agent/school-fees",
    },
    {
      label: "Pending / not finalised",
      value: `${Number(data?.pending_amount_rwf || 0).toLocaleString()} RWF`,
      sub: `${data?.pending_transactions ?? 0} intent(s) not PAID yet`,
      icon: Clock,
      to: "/agent/school-fees",
    },
    {
      label: "Collection rate",
      value: `${data?.collection_rate ?? 0}%`,
      sub:
        rateDelta === 0
          ? `vs last month ${data?.collection_rate_prev ?? 0}%`
          : `vs last month ${data?.collection_rate_prev ?? 0}% ${rateDelta > 0 ? "↑" : "↓"}`,
      icon: BadgePercent,
      highlight: rateDelta > 0,
    },
  ];

  return (
    <div className={`${pageShell} bg-white`} style={{ fontFamily: BABYEYI_FONT_STACK }}>
      <AgentPageHeader
        title="Overview"
        description="Snapshot of schools and Babyeyi fee collections recorded for your assigned district and sectors."
      >
        <label className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <Calendar className="w-4 h-4 text-amber-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-transparent outline-none cursor-pointer text-[13px] font-semibold text-[#000435] pr-1"
            aria-label="Period filter"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </AgentPageHeader>
      {noCov ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 text-amber-950 text-sm font-medium px-4 py-3 max-w-2xl">
          {data?.no_coverage
            ? "Your account has no field profile yet. Ask a Super Admin to register your district and sectors."
            : "Your profile has no sectors assigned. Ask a Super Admin to select at least one sector."}
        </div>
      ) : coverageLine ? (
        <p className="text-xs font-semibold text-slate-600 -mt-2">
          <span className="text-amber-600">Coverage:</span> {coverageLine}
        </p>
      ) : null}

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
        {kpiCards.map((c) => (
          <KpiCard key={c.label} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={pageCardPad}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="font-bold text-[#000435] text-sm">Quick actions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[12px] sm:text-[13px] font-bold min-h-[44px] transition-colors ${
                  a.primary
                    ? "border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/90 text-amber-950 hover:from-amber-100"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                {a.label}
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
              </Link>
            ))}
          </div>
        </div>

        <div className={pageCardPad}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-bold text-[#000435] flex items-center gap-2 text-sm">
              <ShoppingBag className="w-4 h-4 text-amber-500 shrink-0" />
              Shop orders
            </h3>
            <Link to="/agent/shop-orders" className="text-[11px] font-bold text-amber-700 hover:text-amber-900">
              View all
            </Link>
          </div>
          {(data?.shop_orders_daily || []).length > 0 ? (
            <>
              <LineAreaChart
                data={data.shop_orders_daily}
                labelKey="label"
                valueKey="value"
                color={BABYEYI_AMBER}
                height={180}
              />
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Orders per day · {PERIOD_OPTIONS.find((o) => o.value === period)?.label}
              </p>
            </>
          ) : (
            <p className="text-center text-sm text-slate-400 py-12">No shop orders in this period.</p>
          )}
        </div>
      </div>

      {/* Sector bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Collections by sector"
          icon={BarChart3}
          legend={<ChartLegend />}
          action={
            <Link to="/agent/schools" className="text-[11px] font-bold text-amber-700 hover:text-amber-900">
              View schools
            </Link>
          }
        >
          {sectorBarData.length > 0 ? (
            <ModernBarChart
              data={sectorBarData}
              labelKey="label"
              valueKey="value"
              secondaryKey="pending"
              color={BABYEYI_AMBER}
              secondaryColor={BABYEYI_NAVY}
              height={200}
            />
          ) : (
            <p className="text-center text-sm text-slate-400 py-12">No sector collections yet.</p>
          )}
        </ChartCard>

        <ChartCard title="Sector totals (collected + pending)" icon={BarChart3}>
          <AgentHBarChart
            data={sectorTotalBars}
            valueKey="value"
            labelKey="label"
            formatValue={formatRwf}
            maxBars={10}
          />
        </ChartCard>
      </div>

      {/* Sector table + donut + collection rate bars */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`xl:col-span-2 ${pageCardPad} overflow-hidden`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
            <h3 className="font-bold text-[#000435] text-sm">Performance by sector</h3>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-2.5 px-2">Sector</th>
                  <th className="py-2.5 px-2 text-right">Schools</th>
                  <th className="py-2.5 px-2 text-right">Collected (RWF)</th>
                  <th className="py-2.5 px-2 text-right">Pending (RWF)</th>
                  <th className="py-2.5 px-2 text-right min-w-[100px]">Collection rate</th>
                </tr>
              </thead>
              <tbody>
                {(data?.by_sector || []).map((row) => {
                  const pct = Math.min(100, Math.max(0, Number(row.collection_rate) || 0));
                  const tone = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <tr key={row.sector} className="border-b border-slate-50 hover:bg-amber-50/30">
                      <td className="py-2.5 px-2 font-semibold text-[#000435]">{row.sector}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-slate-700">{row.schools}</td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-medium text-emerald-700">
                        {Number(row.collected_rwf || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-amber-800/80">
                        {Number(row.pending_rwf || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-bold text-slate-700 tabular-nums w-8 text-right">{pct}%</span>
                          <div className="h-2 flex-1 max-w-[80px] rounded-full bg-slate-100 overflow-hidden">
                            <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!(data?.by_sector || []).length && (
            <p className="text-center text-sm text-slate-400 py-8">No sector data yet.</p>
          )}
        </div>

        <div className="space-y-4">
          <ChartCard title="Collection rate by sector" icon={BadgePercent}>
            <CollectionRateBars data={data?.by_sector || []} />
          </ChartCard>

          <div className={pageCardPad}>
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-amber-500 shrink-0" />
              <h3 className="font-bold text-[#000435] text-sm">Schools by sector</h3>
            </div>
            {donutData.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <DonutChart data={donutData} size={132} />
                <p className="text-center text-[10px] font-semibold text-slate-500">
                  {data?.schools_in_coverage ?? 0} total schools
                </p>
                <ul className="w-full space-y-1.5">
                  {donutData.map((d, i) => {
                    const row = data?.schools_by_sector?.[i];
                    return (
                      <li key={d.label} className="flex items-center gap-2 text-[11px]">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="font-semibold text-slate-800 truncate flex-1">{d.label}</span>
                        <span className="tabular-nums text-slate-600 shrink-0">
                          {d.value} <span className="text-slate-400">({row?.pct ?? 0}%)</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-center text-sm text-slate-400 py-8">No schools in coverage yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* School bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Collected by school"
          icon={School}
          legend={<ChartLegend />}
          action={
            <Link to="/agent/school-fees" className="text-[11px] font-bold text-amber-700 hover:text-amber-900">
              View fees
            </Link>
          }
        >
          {schoolCollectedBars.length > 0 ? (
            <>
              <div className="hidden sm:block">
                <ModernBarChart
                  data={schoolCollectedBars.map((s) => ({
                    label: s.shortLabel,
                    value: s.value,
                    pending: s.pending,
                  }))}
                  labelKey="label"
                  valueKey="value"
                  secondaryKey="pending"
                  color={BABYEYI_AMBER}
                  secondaryColor={BABYEYI_NAVY}
                  height={220}
                />
              </div>
              <div className="sm:hidden max-h-[320px] overflow-y-auto pr-1">
                <AgentHBarChart
                  data={schoolCollectedBars}
                  valueKey="value"
                  labelKey="label"
                  subLabelKey="sector"
                  formatValue={formatRwf}
                  maxBars={15}
                />
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-slate-400 py-12">No school collections in this period.</p>
          )}
        </ChartCard>

        <ChartCard title="Total by school (collected + pending)" icon={School}>
          <div className="max-h-[340px] overflow-y-auto pr-1">
            <AgentHBarChart
              data={schoolTotalBars}
              valueKey="value"
              labelKey="label"
              subLabelKey="sector"
              formatValue={formatRwf}
              maxBars={20}
            />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
