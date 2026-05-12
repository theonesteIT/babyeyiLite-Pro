import { useState } from "react";
import { SCHOOLS, MONTHLY_COLLECTIONS } from "../data/financeData";

const Ic = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const TrendIc  = () => <Ic d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />;
const CoinIc   = () => <Ic d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
const ChartIc  = () => <Ic d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />;
const StarIc   = () => <Ic d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
const DlIc     = () => <Ic d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />;

const fmtRWF = (n) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : n.toString();

const ProgressBar = ({ value, max = 100, color = "#000435" }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, transition: "width .6s" }} />
    </div>
  );
};

// Dual line chart: Revenue vs Expenses
const DualLineChart = ({ data, height = 220 }) => {
  const W = 700, H = height, P = { t: 18, b: 30, l: 48, r: 12 };
  const iW = W - P.l - P.r, iH = H - P.t - P.b;
  const fees = data.map(d => d.fees), payrolls = data.map(d => d.payroll);
  const max = Math.max(...fees, ...payrolls, 1);
  const xs = data.map((_, i) => P.l + (i / (data.length - 1)) * iW);
  const yFees = fees.map(v => P.t + (1 - v / max) * iH);
  const yPayr = payrolls.map(v => P.t + (1 - v / max) * iH);
  const pathF = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yFees[i].toFixed(1)}`).join(" ");
  const pathP = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${yPayr[i].toFixed(1)}`).join(" ");
  const areaF = pathF + ` L${xs[data.length-1]},${H-P.b} L${P.l},${H-P.b} Z`;
  const areaP = pathP + ` L${xs[data.length-1]},${H-P.b} L${P.l},${H-P.b} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000435" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000435" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(f => {
        const y = P.t + (1 - f) * iH;
        return (
          <g key={f}>
            <line x1={P.l} y1={y} x2={W-P.r} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" />
            <text x={P.l-6} y={y+4} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{fmtRWF(Math.round(max * f))}</text>
          </g>
        );
      })}
      <path d={areaF} fill="url(#gF)" />
      <path d={areaP} fill="url(#gP)" />
      <path d={pathF} fill="none" stroke="#000435" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathP} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={yFees[i]} r="3.5" fill="white" stroke="#000435" strokeWidth="2" />
          <circle cx={x} cy={yPayr[i]} r="3.5" fill="white" stroke="#f59e0b" strokeWidth="2" />
          <text x={x} y={H-P.b+12} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">{data[i].month}</text>
        </g>
      ))}
    </svg>
  );
};

const KpiCard = ({ label, value, sub, color, icon: Icon, trend }) => (
  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col gap-3"
    style={{ boxShadow: "0 4px 20px -10px rgba(0,4,53,0.12)" }}>
    <div className="flex items-center justify-between">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
        <Icon />
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${trend.startsWith("+") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
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

export default function FinancialAnalytics() {
  const totalFees    = MONTHLY_COLLECTIONS.reduce((s, d) => s + d.fees, 0);
  const totalPayroll = MONTHLY_COLLECTIONS.reduce((s, d) => s + d.payroll, 0);
  const profit       = totalFees - totalPayroll;
  const profitPct    = Math.round((profit / totalFees) * 100);

  return (
    <div className="animate-in fade-in duration-500 bg-[#f0f2f8] min-h-full pb-20">

      {/* PAGE HEADER */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,#000435 0%,#000320 60%,#00021a 100%)" }}>
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/[0.04] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(245,158,11,.3),transparent)" }} />
        <div className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 pb-16">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-4 h-0.5 rounded-full bg-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">Finance Center</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase" style={{ fontFamily: "'Montserrat',sans-serif" }}>
                Financial Analytics
              </h1>
              <p className="text-sm text-white/50 mt-1">Executive-level financial KPIs, growth trends & school rankings</p>
            </div>
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest text-[#000435]"
              style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 4px 12px rgba(245,158,11,.35)" }}>
              <DlIc /> Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 max-w-[1600px] mx-auto space-y-5">

        {/* EXECUTIVE KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard label="Annual Revenue"       value={`${fmtRWF(totalFees)} RWF`}    sub="All fees collected" color="#000435" icon={CoinIc}  trend="+14.2%" />
          <KpiCard label="Annual Payroll"        value={`${fmtRWF(totalPayroll)} RWF`} sub="All staff salaries" color="#f59e0b" icon={TrendIc} trend="+8.1%" />
          <KpiCard label="Net Surplus"           value={`${fmtRWF(profit)} RWF`}       sub="Revenue − Payroll"  color="#10b981" icon={StarIc}  trend="+22%" />
          <KpiCard label="Profit Margin"         value={`${profitPct}%`}               sub="Financial health"   color="#000435" icon={ChartIc} trend="+3.4%" />
        </div>

        {/* DUAL CHART */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-800">Revenue vs Expenses — 12 Month View</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Fee collections vs payroll spend across all schools</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-[11px] font-bold text-[#000435]">
                <span className="w-6 h-0.5 bg-[#000435] rounded-full" /> Fee Revenue
              </span>
              <span className="flex items-center gap-2 text-[11px] font-bold text-amber-600">
                <span className="w-6 h-0.5 bg-amber-400 rounded-full" /> Payroll Expenses
              </span>
            </div>
          </div>
          <DualLineChart data={MONTHLY_COLLECTIONS} height={220} />
        </div>

        {/* SCHOOL FINANCIAL RANKING + KPIs */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-4">School Financial Ranking</h2>
            <div className="space-y-3">
              {[...SCHOOLS]
                .sort((a, b) => (b.fees_collected / b.fees_expected) - (a.fees_collected / a.fees_expected))
                .map((school, i) => {
                  const pct = Math.round((school.fees_collected / school.fees_expected) * 100);
                  const surplus = school.fees_collected - school.fees_expected * 0.6;
                  return (
                    <div key={school.id} className="p-3 rounded-xl bg-[#f8fafc] border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                          style={{ background: i === 0 ? "linear-gradient(135deg,#f59e0b,#d97706)" : i < 3 ? "#000435" : "#f1f5f9", color: i < 3 ? "white" : "#94a3b8" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-slate-800 truncate">{school.name}</p>
                          <p className="text-[10px] text-slate-400">{fmtRWF(school.fees_collected)} / {fmtRWF(school.fees_expected)} RWF</p>
                        </div>
                        <span className="text-[12px] font-black shrink-0" style={{ color: pct >= 80 ? "#000435" : pct >= 65 ? "#d97706" : "#f43f5e" }}>{pct}%</span>
                      </div>
                      <ProgressBar value={pct} color={pct >= 80 ? "#000435" : pct >= 65 ? "#f59e0b" : "#f43f5e"} />
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="space-y-5">
            {/* Fee efficiency */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 mb-4">Key Financial Ratios</h2>
              <div className="space-y-3">
                {[
                  { label: "Fee Collection Efficiency", value: 81, target: 100, unit: "%", color: "#000435" },
                  { label: "Salary Expense Ratio",      value: 43, target: 100, unit: "%", color: "#f59e0b" },
                  { label: "Budget Utilization",         value: 67, target: 100, unit: "%", color: "#10b981" },
                  { label: "Revenue Growth (YoY)",       value: 14, target: 25,  unit: "%", color: "#6366f1" },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[12px] font-semibold text-slate-700">{r.label}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[12px] font-black tabular-nums" style={{ color: r.color }}>{r.value}{r.unit}</span>
                        <span className="text-[10px] text-slate-400">/ {r.target}{r.unit}</span>
                      </div>
                    </div>
                    <ProgressBar value={r.value} max={r.target} color={r.color} />
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly summary table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-800 mb-3">Monthly Financial Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Month", "Revenue", "Payroll", "Surplus"].map(h => (
                        <th key={h} className="text-left pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHLY_COLLECTIONS.slice(-6).map(m => {
                      const surplus = m.fees - m.payroll;
                      return (
                        <tr key={m.month} className="border-t border-slate-50 hover:bg-[#f8fafc] transition-colors">
                          <td className="py-2 text-[11px] font-bold text-slate-700">{m.month}</td>
                          <td className="py-2 text-[11px] font-black text-[#000435] tabular-nums">{fmtRWF(m.fees)}</td>
                          <td className="py-2 text-[11px] font-bold text-amber-600 tabular-nums">{fmtRWF(m.payroll)}</td>
                          <td className="py-2 text-[11px] font-black tabular-nums" style={{ color: surplus >= 0 ? "#10b981" : "#f43f5e" }}>
                            {surplus >= 0 ? "+" : ""}{fmtRWF(surplus)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* GROWTH FORECAST BAR */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-800 mb-1">Yearly Growth Overview</h2>
          <p className="text-[11px] text-slate-400 mb-4">Comparative performance across fiscal years</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { year: "2021", growth: 5,  revenue: 48 },
              { year: "2022", growth: 9,  revenue: 62 },
              { year: "2023", growth: 12, revenue: 78 },
              { year: "2024", growth: 11, revenue: 95 },
              { year: "2025", growth: 14, revenue: 112 },
              { year: "2026", growth: 18, revenue: 125, current: true },
            ].map(y => (
              <div key={y.year} className={`p-3 rounded-2xl text-center border ${y.current ? "border-amber-400/40 bg-amber-50" : "border-slate-100 bg-[#f8fafc]"}`}>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">{y.year}</p>
                <p className="text-xl font-black tabular-nums" style={{ color: y.current ? "#000435" : "#64748b" }}>{y.revenue}M</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color: "#10b981" }}>+{y.growth}%</p>
                {y.current && <span className="inline-block mt-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-400 text-[#000435]">Current</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}