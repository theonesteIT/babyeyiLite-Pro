import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { HrPanel, HR_FONT } from './hrUi';

const NAVY = '#000435';
const AMBER = '#c87800';
const GOLD = '#FEBF10';

function GrowthTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const hires = payload.find((p) => p.dataKey === 'newHires')?.value;
  const pct = payload.find((p) => p.dataKey === 'growthPct')?.value;
  return (
    <div
      className="bg-white border border-[#1E3A5F]/12 rounded-xl px-3 py-2.5 shadow-lg min-w-[120px]"
      style={{ fontFamily: HR_FONT }}
    >
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[#000435] mt-1 tabular-nums" style={{ fontWeight: 500 }}>
        {hires} new hires
      </p>
      <p className="text-xs text-[#c87800] mt-0.5 tabular-nums" style={{ fontWeight: 500 }}>
        {pct > 0 ? '+' : ''}
        {pct}% vs prior month
      </p>
    </div>
  );
}

/** Build chart rows from monthly hire counts */
export function buildGrowthTrendSeries(monthlyHires) {
  return monthlyHires.map((count, i) => {
    const prev = i > 0 ? monthlyHires[i - 1] : count;
    const growthPct = i === 0 ? 0 : Number((((count - prev) / prev) * 100).toFixed(1));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      month: monthNames[i],
      newHires: count,
      growthPct,
    };
  });
}

export default function HrGrowthTrendChart({ data, className = '', embedded = false }) {
  const summary = useMemo(() => {
    const total = data.reduce((s, d) => s + d.newHires, 0);
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    const trend =
      prev && last
        ? Number((((last.newHires - prev.newHires) / prev.newHires) * 100).toFixed(1))
        : 0;
    return { total, trend, lastMonth: last?.month };
  }, [data]);

  const inner = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEBF10]/15 text-[#c87800] flex items-center justify-center shrink-0">
            <TrendingUp size={20} strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-sm text-[#000435] tracking-tight" style={{ fontWeight: 500 }}>
              Employee growth trend
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">
              New hires by month · {summary.total} total this year
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:text-right">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Latest ({summary.lastMonth})</p>
            <p className="text-lg text-[#000435] tabular-nums" style={{ fontWeight: 500 }}>
              {data[data.length - 1]?.newHires ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">MoM change</p>
            <p
              className={`text-lg tabular-nums ${summary.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              style={{ fontWeight: 500 }}
            >
              {summary.trend > 0 ? '+' : ''}
              {summary.trend}%
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50/40 p-2 sm:p-4">
        <div className="w-full h-[220px] sm:h-[280px] md:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="hrGrowthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NAVY} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: HR_FONT, fontWeight: 500 }}
                dy={8}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                yAxisId="hires"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: HR_FONT, fontWeight: 500 }}
                width={32}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: HR_FONT, fontWeight: 500 }}
                width={36}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<GrowthTooltip />} cursor={{ stroke: AMBER, strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                yAxisId="hires"
                type="monotone"
                dataKey="newHires"
                stroke="none"
                fill="url(#hrGrowthFill)"
                animationDuration={800}
              />
              <Line
                yAxisId="hires"
                type="monotone"
                dataKey="newHires"
                stroke={NAVY}
                strokeWidth={2.5}
                dot={{ r: 3, fill: NAVY, strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  fill: '#fff',
                  stroke: AMBER,
                  strokeWidth: 2,
                }}
                animationDuration={800}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="growthPct"
                stroke={GOLD}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                animationDuration={800}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 mt-4 text-[10px] text-slate-500 uppercase tracking-wide">
        <span className="inline-flex items-center gap-2">
          <span className="w-6 h-0.5 rounded-full bg-[#000435]" />
          New hires
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-6 border-t-2 border-dashed border-[#FEBF10]" />
          Month-over-month %
        </span>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div className={`border-t border-black/5 p-4 sm:p-6 lg:p-8 ${className}`}>
        {inner}
      </div>
    );
  }

  return <HrPanel className={`p-4 sm:p-6 ${className}`}>{inner}</HrPanel>;
}
