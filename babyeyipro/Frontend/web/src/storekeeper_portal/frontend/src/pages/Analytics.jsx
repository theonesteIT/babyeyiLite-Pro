import { useState, useCallback, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Activity, BarChart3, PieChart as PieIcon,
  LineChart as LineChartIcon, Loader2, RefreshCw, ShoppingCart,
  Apple, Package, AlertTriangle, Shirt,
} from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import { loadStorekeeperAnalytics } from '../services/storekeeperAnalyticsService'
import { formatRwf } from '../services/uniformIssueService'

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'purchase-orders', label: 'Purchases', icon: ShoppingCart },
  { id: 'uniform', label: 'Uniform', icon: Shirt },
  { id: 'food', label: 'Food', icon: Apple },
  { id: 'other', label: 'Other', icon: Package },
  { id: 'adjustments', label: 'Adjustments', icon: AlertTriangle },
]

const COLORS = ['#FEBF10', '#000435', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs">
      <p className="text-[#000435] font-bold mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium text-[#000435]">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  )
}

function Kpi({ label, value, sub, icon: Icon, warn }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${warn ? 'border-amber-100 bg-amber-50/50' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
          <p className={`text-xl font-bold mt-1 ${warn ? 'text-amber-700' : 'text-[#000435]'}`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-xl ${warn ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-amber-500" />
        <h3 className="text-sm font-bold text-[#000435]">{title}</h3>
      </div>
      <div className="h-64">{children}</div>
    </div>
  )
}

function OverviewTab({ data }) {
  const { summary: s, charts: c } = data
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Stock value (est.)" value={formatRwf(s.totalStockValue)} icon={BarChart3} />
        <Kpi label="Food on hand" value={`${s.foodRemaining.toLocaleString()} units`} icon={Apple} />
        <Kpi label="Other on hand" value={`${s.otherRemaining.toLocaleString()} units`} icon={Package} />
        <Kpi label="Low / alerts" value={String(s.foodLow + s.otherLow + s.invLow)} sub={`${s.foodAlertCount} food alerts`} icon={AlertTriangle} warn={s.foodLow + s.otherLow > 0} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly stock in vs out" icon={LineChartIcon}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={c.monthlyMovementChart.length ? c.monthlyMovementChart : [{ month: '—', in: 0, out: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="in" stroke="#10b981" fill="#10b98133" name="Stock in" />
              <Area type="monotone" dataKey="out" stroke="#ef4444" fill="#ef444433" name="Stock out" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Stock by area" icon={PieIcon}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={c.categoryPie.length ? c.categoryPie : [{ name: 'No data', value: 1 }]} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                {(c.categoryPie.length ? c.categoryPie : [{ name: 'No data', value: 1 }]).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Stock health" icon={Activity}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={c.stockHealth.length ? c.stockHealth : [{ name: 'No data', value: 1 }]} dataKey="value" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {(c.stockHealth.length ? c.stockHealth : [{ name: 'No data', value: 1 }]).map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#ef4444'][i % 3]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Purchase value by month" icon={ShoppingCart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={c.purchaseMonthly.length ? c.purchaseMonthly : [{ month: '—', value: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fill="#000435" radius={[4, 4, 0, 0]} name="RWF" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function PurchasesTab({ data }) {
  const totalPurchases = data.foodStock.reduce((s, r) => s + (Number(r.total_cost) || 0), 0)
    + data.otherStock.reduce((s, r) => s + (Number(r.total_cost) || 0), 0)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Purchase receipts" value={String(data.foodStock.length + data.otherStock.length)} icon={ShoppingCart} />
        <Kpi label="Purchase value" value={formatRwf(totalPurchases)} icon={TrendingUp} />
        <Kpi label="Suppliers" value={String(data.suppliers.length)} icon={Package} />
        <Kpi label="Food batches" value={String(data.foodStock.length)} icon={Apple} />
      </div>
      <ChartCard title="Monthly purchase value (food + other)" icon={BarChart3}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.charts.purchaseMonthly.length ? data.charts.purchaseMonthly : [{ month: '—', value: 0 }]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" fill="#FEBF10" radius={[4, 4, 0, 0]} name="Value" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

function FoodTab({ data }) {
  const items = data.charts.foodByItem
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Food batches" value={String(data.foodStock.length)} icon={Apple} />
        <Kpi label="On hand" value={`${data.summary.foodRemaining.toLocaleString()}`} icon={Package} />
        <Kpi label="Consumed" value={`${data.summary.foodConsumed.toLocaleString()}`} icon={TrendingDown} />
        <Kpi label="Low items" value={String(data.summary.foodLow)} icon={AlertTriangle} warn={data.summary.foodLow > 0} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Stock vs consumed by item" icon={BarChart3}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items.length ? items : [{ name: 'No data', stock: 0, consumed: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="stock" fill="#FEBF10" name="On hand" />
              <Bar dataKey="consumed" fill="#000435" name="Consumed" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Consumption trend" icon={LineChartIcon}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={items.length ? items : [{ name: '—', consumed: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="consumed" stroke="#000435" strokeWidth={2} name="Consumed" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function OtherTab({ data }) {
  const cats = data.charts.otherByCategory
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Batches" value={String(data.otherStock.length)} icon={Package} />
        <Kpi label="On hand" value={data.summary.otherRemaining.toLocaleString()} icon={TrendingUp} />
        <Kpi label="Issued" value={data.summary.otherIssued.toLocaleString()} icon={TrendingDown} />
        <Kpi label="Low items" value={String(data.summary.otherLow)} icon={AlertTriangle} warn={data.summary.otherLow > 0} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="By category (remaining)" icon={PieIcon}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={cats.length ? cats : [{ name: 'No data', remaining: 1 }]} dataKey="remaining" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                {(cats.length ? cats : [{ name: 'No data', remaining: 1 }]).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Category value" icon={BarChart3}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cats.length ? cats : [{ name: '—', value: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" name="Receipt value" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

function UniformTab({ data }) {
  const ua = data.uniformAnalytics || {}
  const byClass = (ua.revenue_by_class || ua.by_class || ua.byClass || []).map((c) => ({
    class_name: c.class_name || c.className,
    revenue: Number(c.revenue || 0),
    issue_count: c.issue_count || c.count,
  }))
  const revenue = Number(ua.total_sales || ua.total_revenue || ua.totalRevenue || 0)
  const issues = Number(ua.total_pieces || ua.total_issues || ua.issue_count || data.summary.uniformIssueCount || 0)
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Uniform issues" value={String(issues)} icon={Shirt} />
        <Kpi label="Revenue" value={formatRwf(revenue)} icon={TrendingUp} />
        <Kpi label="Finished goods SKUs" value={String(data.finishedGoods.length)} icon={Package} />
        <Kpi label="Classes" value={String(byClass.length)} icon={BarChart3} />
      </div>
      {byClass.length > 0 && (
        <ChartCard title="Revenue by class" icon={BarChart3}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byClass.map((c) => ({ name: c.class_name || '—', revenue: c.revenue || 0 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatRwf(v)} />
              <Bar dataKey="revenue" fill="#FEBF10" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}

function AdjustmentsTab({ data }) {
  const adj = data.charts.adjByReason
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Adjustments" value={String(data.summary.adjustmentCount)} icon={AlertTriangle} />
        <Kpi label="Records" value={String(data.adjustments.length)} icon={Activity} />
        <Kpi label="Reasons" value={String(adj.length)} icon={PieIcon} />
        <Kpi label="Decreases" value={String(data.adjustments.filter((a) => a.mode === 'decrease').length)} icon={TrendingDown} warn />
      </div>
      <ChartCard title="Adjustments by reason" icon={BarChart3}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={adj.length ? adj : [{ reason: 'No data', qty: 0 }]} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="reason" width={90} tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="qty" fill="#ef4444" name="Quantity" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('overview')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await loadStorekeeperAnalytics()
      setData(res)
    } catch (e) {
      setError(e.message || 'Failed to load analytics')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <StorekeeperPageShell titleLine="Analytics" subtitle="Live insights from food, other, uniform, and inventory data" icon={BarChart3}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[10px] font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

        <div className="flex overflow-x-auto gap-1 pb-1 border-b border-gray-100">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-t-xl transition ${activeTab === t.id ? 'bg-amber-400/10 text-amber-700 border-b-2 border-amber-400' : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'}`}>
              <t.icon size={15} />{t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white/80 p-4 sm:p-6 min-h-[360px]">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={32} /></div>
          ) : !data ? (
            <p className="text-center py-20 text-gray-400 text-sm">No analytics data available.</p>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab data={data} />}
              {activeTab === 'purchase-orders' && <PurchasesTab data={data} />}
              {activeTab === 'uniform' && <UniformTab data={data} />}
              {activeTab === 'food' && <FoodTab data={data} />}
              {activeTab === 'other' && <OtherTab data={data} />}
              {activeTab === 'adjustments' && <AdjustmentsTab data={data} />}
            </>
          )}
        </div>
      </div>
    </StorekeeperPageShell>
  )
}
