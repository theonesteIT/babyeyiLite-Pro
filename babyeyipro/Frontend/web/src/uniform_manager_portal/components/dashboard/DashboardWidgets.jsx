import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  PieChart, Pie,
} from 'recharts'
import { ChartTooltip, REPORT_COLORS } from '../../../storekeeper_portal/frontend/src/components/reports/StoreReportPrimitives'

export function DashboardChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
        <h3 className="text-sm font-bold text-[#000435]">{title}</h3>
        {subtitle ? <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p> : null}
      </div>
      <div className="p-4 h-[280px]">{children}</div>
    </div>
  )
}

export function StockCompareChart({ data }) {
  const chartData = data?.length ? data : [{ name: 'No data', value: 0 }]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#00000008" />
        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={72} tick={{ fontSize: 10, fill: '#64748b' }} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" fill="#FEBF10" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function RevenueTrendChart({ data }) {
  const chartData = data?.length ? data : [{ name: '—', value: 0 }]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" fill="#000435" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CategoryPieChart({ data }) {
  const chartData = data?.length ? data : [{ name: 'No data', value: 1 }]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function ProfitLossChart({ data }) {
  const chartData = data?.length ? data : [
    { name: 'Profit', value: 0, fill: '#10b981' },
    { name: 'Loss', value: 0, fill: '#ef4444' },
  ]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.fill || (entry.name === 'Loss' ? '#ef4444' : '#10b981')} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function DashboardRecentTable({ title, columns, rows, emptyMessage, emptyAction }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white shrink-0">
        <h3 className="text-sm font-bold text-[#000435]">{title}</h3>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm min-w-[320px]">
          <thead>
            <tr className="bg-[#000435] text-white">
              {columns.map((col) => (
                <th key={col.key} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-left whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-10 px-4 text-center">
                  <p className="text-xs text-slate-400">{emptyMessage}</p>
                  {emptyAction ? (
                    <Link to={emptyAction.to} className="text-xs font-bold text-[#c87800] mt-2 inline-block hover:underline">
                      {emptyAction.label} →
                    </Link>
                  ) : null}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-amber-50/30 even:bg-slate-50/40">
                  {columns.map((col) => (
                    <td key={col.key} className="py-2.5 px-3 text-[12px] text-gray-700 whitespace-nowrap">
                      {col.format ? col.format(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DashboardKpiCard({ label, value, sub, icon: Icon, warn = false }) {
  return (
    <div
      className={`p-4 sm:p-5 flex flex-col items-center justify-center text-center min-h-[6.75rem] transition-colors ${
        warn ? 'bg-red-50/40' : 'hover:bg-slate-50/60'
      }`}
    >
      {Icon ? (
        <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0 text-[#FEBF10]">
          <Icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
        </div>
      ) : null}
      <span className={`text-sm sm:text-lg font-semibold tabular-nums tracking-tight leading-snug ${warn ? 'text-red-700' : 'text-[#000435]'}`}>
        {value}
      </span>
      <p className="text-[7px] sm:text-[8px] font-semibold text-slate-500 uppercase tracking-[0.12em] mt-0.5">
        {label}
      </p>
      {sub ? (
        <p className="text-[6px] sm:text-[7px] font-semibold uppercase tracking-[0.14em] mt-1 text-[#1E3A5F]/80 max-w-[11rem] leading-snug">
          {sub}
        </p>
      ) : null}
    </div>
  )
}

export function DashboardQuickAction({ label, icon: Icon, to, external = false }) {
  const className = 'group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-[#FEBF10]/50 hover:shadow-md transition-all text-center min-h-[96px]'
  const inner = (
    <>
      <div className="w-11 h-11 rounded-xl bg-[#FEBF10]/15 text-[#c87800] flex items-center justify-center group-hover:scale-105 transition-transform">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <span className="text-[11px] font-bold text-[#000435] leading-tight">{label}</span>
    </>
  )
  if (external) {
    return <a href={to} className={className}>{inner}</a>
  }
  return <Link to={to} className={className}>{inner}</Link>
}

export function NotificationItem({ tone, text }) {
  const styles = {
    critical: 'bg-red-50 border-red-100 text-red-800',
    warning: 'bg-amber-50 border-amber-100 text-amber-900',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
    info: 'bg-sky-50 border-sky-100 text-sky-800',
  }
  const dots = { critical: '🔴', warning: '🟠', success: '🟢', info: '🔵' }
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium ${styles[tone] || styles.info}`}>
      <span className="shrink-0">{dots[tone] || '🔵'}</span>
      <span>{text}</span>
    </div>
  )
}
