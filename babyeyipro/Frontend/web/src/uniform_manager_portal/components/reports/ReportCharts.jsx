import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'
import { ChartTooltip, REPORT_COLORS } from '../../../storekeeper_portal/frontend/src/components/reports/StoreReportPrimitives'

export function ReportBarChart({ data, dataKey = 'value', nameKey = 'name' }) {
  const chartData = data?.length ? data : [{ [nameKey]: 'No data', [dataKey]: 0 }]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
        <XAxis dataKey={nameKey} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={40} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey={dataKey} fill="#FEBF10" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ReportPieChart({ data }) {
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

export function ReportMovementChart({ data }) {
  const chartData = data?.length ? data : [{ month: '—', in: 0, out: 0 }]
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="umInGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="umOutGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Area type="monotone" dataKey="in" name="Stock in" stroke="#10b981" strokeWidth={2} fill="url(#umInGrad)" />
        <Area type="monotone" dataKey="out" name="Stock out" stroke="#ef4444" strokeWidth={2} fill="url(#umOutGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ReportChartGrid({ charts = [] }) {
  if (!charts.length) return null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {charts.map((chart) => (
        <div key={chart.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/40">
            <h3 className="text-sm font-bold text-[#000435]">{chart.title}</h3>
          </div>
          <div className="p-4 h-[260px]">
            {chart.type === 'pie' && <ReportPieChart data={chart.data} />}
            {chart.type === 'movement' && <ReportMovementChart data={chart.data} />}
            {(chart.type === 'bar' || !chart.type) && <ReportBarChart data={chart.data} />}
          </div>
        </div>
      ))}
    </div>
  )
}
