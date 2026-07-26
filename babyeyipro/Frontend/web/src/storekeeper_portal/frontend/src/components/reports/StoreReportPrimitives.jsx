import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'

export const REPORT_COLORS = ['#000435', '#FEBF10', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316']

export function fmtMoney(n) {
  return `RWF ${(Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function exportCSV(headers, rows, filename) {
  const csv = [
    headers.join(','),
    ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function printSection(id, title = 'Store Report') {
  const el = document.getElementById(id)
  if (!el) return
  const win = window.open('', '_blank')
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Montserrat,sans-serif;padding:24px;color:#000435}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #e5e7eb}
    th{background:#f8fafc;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b}
    h2{font-size:18px;margin:0 0 4px} p.sub{font-size:11px;color:#6b7280;margin:0 0 20px}
    .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
    .kpi{background:#f9fafb;padding:12px;border-radius:8px;border:1px solid #e5e7eb}
    .kpi h3{font-size:9px;text-transform:uppercase;color:#9ca3af;margin:0 0 4px}
    .kpi p{font-size:16px;font-weight:700;margin:0}
  </style></head><body><h2>${title}</h2><p class="sub">Generated ${new Date().toLocaleString()}</p>${el.innerHTML}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-md border border-black/5 p-2.5 rounded-xl shadow-lg z-50">
      <p className="text-[10px] font-bold text-[#000435] uppercase tracking-wider mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-xs font-bold text-gray-600">
          {p.name}: {formatter ? formatter(p.value) : p.value?.toLocaleString?.() ?? p.value}
        </p>
      ))}
    </div>
  )
}

export function KpiCard({ label, value, sub, icon: Icon, warn, accent = 'navy' }) {
  const shell = warn
    ? 'border-amber-100 bg-gradient-to-br from-amber-50/90 to-white'
    : accent === 'emerald'
      ? 'border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white'
      : accent === 'red'
        ? 'border-red-100 bg-gradient-to-br from-red-50/80 to-white'
        : 'border-gray-100 bg-gradient-to-br from-gray-50/80 to-white'
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${shell}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
          <p className={`text-xl font-bold mt-1 truncate ${warn ? 'text-amber-700' : 'text-[#000435]'}`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl shrink-0 ${warn ? 'bg-amber-100 text-amber-600' : 'bg-[#000435]/5 text-[#000435]'}`}>
            <Icon size={18} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </div>
  )
}

export function ReportPanel({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-50 bg-gray-50/40">
          <div>
            {title && <h3 className="text-sm font-bold text-[#000435]">{title}</h3>}
            {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  )
}

export function ReportTable({ headers, rows, emptyMessage = 'No records found', renderRow }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            {headers.map((h) => (
              <th key={h} className="text-left py-3 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-12 text-center text-gray-400 text-sm font-medium">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => renderRow(row, i))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function StatusPill({ label, tone = 'neutral' }) {
  const tones = {
    in: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    out: 'bg-red-50 text-red-600 ring-red-200/60',
    low: 'bg-amber-50 text-amber-700 ring-amber-200/60',
    ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200/60',
    neutral: 'bg-gray-100 text-gray-600 ring-gray-200/60',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ring-1 ${tones[tone] || tones.neutral}`}>
      {label}
    </span>
  )
}

export function ChartCard({ title, icon: Icon, children, height = 260 }) {
  return (
    <ReportPanel title={title}>
      {Icon && (
        <div className="flex items-center gap-2 -mt-2 mb-3 text-amber-500">
          <Icon size={14} />
        </div>
      )}
      <div style={{ height }}>{children}</div>
    </ReportPanel>
  )
}

export function MonthlyMovementChart({ data }) {
  const chartData = data?.length ? data : [{ month: '—', in: 0, out: 0 }]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="storeInGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="storeOutGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} allowDecimals={false} width={36} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="in" name="Stock in" stroke="#10b981" strokeWidth={2} fill="url(#storeInGrad)" />
        <Area type="monotone" dataKey="out" name="Stock out" stroke="#ef4444" strokeWidth={2} fill="url(#storeOutGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CategoryPieChart({ data }) {
  const chartData = data?.length ? data : [{ name: 'No data', value: 1 }]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={REPORT_COLORS[i % REPORT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function ValueBarChart({ data, dataKey = 'value', nameKey = 'name', color = '#000435', formatter }) {
  const chartData = data?.length ? data : [{ [nameKey]: '—', [dataKey]: 0 }]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
        <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#94a3b8' }} width={40} />
        <Tooltip content={<ChartTooltip formatter={formatter} />} />
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SectionTabBar({ sections, active, onChange }) {
  return (
    <div className="flex overflow-x-auto gap-0.5 px-4 sm:px-6 pt-4 sm:pt-5 bg-white border-b border-gray-100 sticky top-0 z-10 scrollbar-none">
      {sections.map((s) => {
        const Icon = s.icon
        const isActive = active === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-t-xl transition-all border-b-2 ${
              isActive
                ? 'bg-amber-400/10 text-amber-800 border-amber-400'
                : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            {Icon && <Icon size={13} strokeWidth={1.75} />}
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
