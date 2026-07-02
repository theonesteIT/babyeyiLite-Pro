import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Shirt, Box, AlertTriangle, Package, ArrowRight, RefreshCw,
  BarChart3, FileSpreadsheet, TrendingUp, Users, Truck,
  DollarSign, ShoppingCart, ArrowDownToLine, ArrowUpFromLine, Plus, Calculator,
} from 'lucide-react'
import { uniformHref } from '../config/portal'
import { useAuth } from '../context/AuthContext'
import { useUniformDashboard, fmtRwf, fmtDateShort } from '../hooks/useUniformDashboard'
import { UniformPageLayout, HrPanel, HrPanelHeader, HrHeroAction } from '../components/uniformUi'
import AcademicCalendarWidget from '../components/dashboard/AcademicCalendarWidget'
import {
  DashboardChartCard,
  DashboardKpiCard,
  DashboardQuickAction,
  DashboardRecentTable,
  NotificationItem,
  StockCompareChart,
  RevenueTrendChart,
  CategoryPieChart,
  ProfitLossChart,
} from '../components/dashboard/DashboardWidgets'
import { ReportMovementChart } from '../components/reports/ReportCharts'

const MIN_STOCK_DISPLAY = 50

const QUICK_ACTIONS = [
  { label: 'Add Uniform', icon: Plus, to: '/inventory?tab=finished-goods' },
  { label: 'Receive Stock', icon: ArrowDownToLine, to: '/inventory?tab=fabric-in' },
  { label: 'Issue Uniform', icon: ArrowUpFromLine, to: '/inventory?tab=issue' },
  { label: 'Record Sale', icon: ShoppingCart, to: '/inventory?tab=sales' },
  { label: 'Student Distribution', icon: Users, to: '/inventory?tab=issue' },
  { label: 'Stock Count', icon: FileSpreadsheet, to: '/reports/general-stock' },
  { label: 'View Reports', icon: BarChart3, to: '/reports' },
  { label: 'Print Reports', icon: BarChart3, to: '/reports' },
]

export default function Dashboard() {
  const { staff } = useAuth()
  const { loading, error, reload, metrics, charts, recent, notifications, academic, calendarEvents } = useUniformDashboard()
  const [refreshing, setRefreshing] = useState(false)

  const displayName = [staff?.first_name, staff?.last_name].filter(Boolean).join(' ')
    || staff?.full_name
    || staff?.name
    || 'Uniform Manager'

  const heroKpis = useMemo(
    () => [
      { key: 'types', label: 'Uniform types', value: loading ? '…' : String(metrics.uniformTypes), subValue: 'Product lines', icon: Shirt },
      { key: 'stock', label: 'Current stock', value: loading ? '…' : `${metrics.currentStock.toLocaleString()} pcs`, subValue: `${metrics.fabricMeters.toLocaleString()} m fabric`, icon: Box },
      { key: 'value', label: 'Inventory value', value: loading ? '…' : fmtRwf(metrics.inventoryValue), subValue: 'Finished goods', icon: DollarSign },
      { key: 'sales', label: 'Monthly revenue', value: loading ? '…' : fmtRwf(metrics.monthlyRevenue), subValue: `${fmtRwf(metrics.monthlyProfit)} profit`, icon: TrendingUp },
    ],
    [loading, metrics]
  )

  const handleRefresh = async () => {
    setRefreshing(true)
    await reload()
    setRefreshing(false)
  }

  const kpiCards = [
    { label: 'Total Uniform Types', value: metrics.uniformTypes, sub: 'Different products', icon: Shirt },
    { label: 'Current Stock', value: `${metrics.currentStock.toLocaleString()} pcs`, sub: `${metrics.fabricMeters.toLocaleString()} m fabric`, icon: Box },
    { label: 'Inventory Value', value: fmtRwf(metrics.inventoryValue), sub: 'Finished goods', icon: DollarSign },
    { label: "Today's Stock In", value: metrics.todayStockInQty.toLocaleString(), sub: 'Received today', icon: ArrowDownToLine },
    { label: "Today's Stock Out", value: metrics.todayStockOutQty.toLocaleString(), sub: `${metrics.todayFabricOutMeters.toLocaleString()} m fabric out`, icon: ArrowUpFromLine },
    { label: "Today's Sales", value: fmtRwf(metrics.todaySales), sub: `${fmtRwf(metrics.todayProfit)} profit`, icon: ShoppingCart },
    { label: 'Monthly Revenue', value: fmtRwf(metrics.monthlyRevenue), sub: 'This month', icon: TrendingUp },
    { label: 'Monthly Profit', value: fmtRwf(Math.max(0, metrics.monthlyProfit)), sub: metrics.monthlyLoss ? `${fmtRwf(metrics.monthlyLoss)} loss` : 'Net this month', icon: Calculator, warn: metrics.monthlyProfit < 0 },
    { label: 'Low Stock Items', value: metrics.lowStockCount, sub: 'Below minimum', icon: AlertTriangle, warn: metrics.lowStockCount > 0 },
    { label: 'Out of Stock', value: metrics.outOfStockCount, sub: 'Zero quantity', icon: Package, warn: metrics.outOfStockCount > 0 },
    { label: 'Students Served', value: metrics.studentsServed, sub: `${metrics.issueCount} issues`, icon: Users },
    { label: 'Active Suppliers', value: metrics.supplierCount, sub: 'Registered suppliers', icon: Truck },
  ]

  return (
    <UniformPageLayout
      eyebrow="Uniform Manager"
      title="Dashboard"
      subtitle={`Welcome back, ${displayName} · Monitor stock, sales and distribution`}
      HeroIcon={Shirt}
      headerRight={(
        <>
          <HrHeroAction icon={RefreshCw} onClick={handleRefresh}>
            {refreshing || loading ? 'Refreshing…' : 'Refresh'}
          </HrHeroAction>
          <Link to={uniformHref('/inventory')}>
            <button
              type="button"
              className="h-9 px-3 rounded-xl bg-white text-[#c87800] text-[10px] flex items-center gap-1.5 hover:bg-white/95 transition-all uppercase tracking-wider font-medium"
            >
              Open inventory
              <ArrowRight size={13} />
            </button>
          </Link>
        </>
      )}
      kpiTiles={heroKpis}
      kpiGridClassName="grid-cols-2 lg:grid-cols-4"
    >
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <HrPanel className="overflow-hidden">
        <HrPanelHeader title="Summary overview" description="Key performance indicators across uniform inventory" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 divide-x divide-y divide-black/5 border-t border-black/5 bg-white">
          {kpiCards.map((k) => (
            <DashboardKpiCard
              key={k.label}
              {...k}
              value={loading ? '…' : k.value}
              warn={!loading && k.warn}
            />
          ))}
        </div>
      </HrPanel>

      <HrPanel className="overflow-hidden">
        <HrPanelHeader title="Financial summary" description="Today and this month" />
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-black/5 border-t border-black/5 bg-white">
        {[
          { label: "Today's revenue", value: fmtRwf(metrics.todaySales) },
          { label: "Today's expenses", value: fmtRwf(metrics.todayExpenses) },
          { label: "Today's profit", value: fmtRwf(metrics.todayProfit) },
          { label: 'This month revenue', value: fmtRwf(metrics.monthlyRevenue) },
          { label: 'Net profit (month)', value: fmtRwf(metrics.monthlyProfit), warn: metrics.monthlyProfit < 0 },
        ].map((item) => (
          <div
            key={item.label}
            className={`p-4 sm:p-5 flex flex-col items-center justify-center text-center min-h-[5.5rem] ${
              item.warn ? 'bg-red-50/40' : 'hover:bg-slate-50/60'
            }`}
          >
            <span className={`text-sm sm:text-base font-semibold tabular-nums ${item.warn ? 'text-red-700' : 'text-[#000435]'}`}>
              {loading ? '…' : item.value}
            </span>
            <p className="text-[7px] sm:text-[8px] font-semibold text-slate-500 uppercase tracking-[0.12em] mt-1">
              {item.label}
            </p>
          </div>
        ))}
        </div>
      </HrPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DashboardChartCard title="Stock In vs Stock Out" subtitle="Fabric meters & uniform movement by month">
          {loading ? <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading…</div> : (
            <ReportMovementChart data={charts.movement} />
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Monthly Sales" subtitle="Revenue from uniform issues (last 6 months)">
          {loading ? <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading…</div> : !charts.hasSalesData ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <p className="text-sm text-slate-500">No sales in the last 6 months</p>
              <Link to={uniformHref('/inventory?tab=issue')} className="text-xs font-bold text-[#c87800] mt-2 hover:underline">
                Issue uniforms to students →
              </Link>
            </div>
          ) : (
            <RevenueTrendChart data={charts.monthlySales} />
          )}
        </DashboardChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DashboardChartCard title="Inventory Value by Category" subtitle="Finished goods value by uniform type">
          {loading ? <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading…</div> : (
            <CategoryPieChart data={charts.byCategory} />
          )}
        </DashboardChartCard>
        <DashboardChartCard title="Profit vs Loss" subtitle="Last 6 months (issue revenue vs fabric cost)">
          {loading ? <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading…</div> : (
            <ProfitLossChart data={charts.profitVsLoss} />
          )}
        </DashboardChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DashboardChartCard title="Stock overview" subtitle="Total stock in, out and current fabric">
          {loading ? <div className="h-full flex items-center justify-center text-sm text-slate-400">Loading…</div> : (
            <StockCompareChart data={charts.stockCompare} />
          )}
        </DashboardChartCard>
        <HrPanel className="h-full">
          <HrPanelHeader title="Best selling uniforms" description="Top items by quantity sold (last 6 months)" />
          <div className="px-5 pb-5">
            {loading ? (
              <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
            ) : charts.bestSelling.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500">No uniform sales recorded yet</p>
                <Link to={uniformHref('/inventory?tab=issue')} className="text-xs font-bold text-[#c87800] mt-2 inline-block hover:underline">
                  Start issuing uniforms →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {charts.bestSelling.map((item) => (
                  <div key={`${item.rank}-${item.name}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                    <span className="text-lg">{item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#000435] truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500">{item.sold.toLocaleString()} sold · {fmtRwf(item.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </HrPanel>
      </div>

      {metrics.lowStockItems.length > 0 ? (
        <HrPanel>
          <HrPanelHeader title="Low stock alerts" description="Items below minimum threshold" />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="bg-[#000435] text-white">
                  {['Item', 'Available', 'Minimum', 'Status'].map((h) => (
                    <th key={h} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.lowStockItems.slice(0, 8).map((g) => {
                  const stock = Number(g.remaining_stock ?? g.stock) || 0
                  const critical = stock < 20
                  return (
                    <tr key={g.id} className="border-b border-gray-100 even:bg-slate-50/40">
                      <td className="py-2.5 px-3 font-semibold text-[#000435]">{g.uniform_name}{g.size ? ` (${g.size})` : ''}</td>
                      <td className="py-2.5 px-3 tabular-nums">{stock} pcs</td>
                      <td className="py-2.5 px-3 tabular-nums">{MIN_STOCK_DISPLAY} pcs</td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                          {critical ? '🔴 Critical' : '🟠 Low'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </HrPanel>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DashboardRecentTable
          title="Recent sales"
          columns={[
            { key: 'date', label: 'Date', format: (v) => fmtDateShort(v) },
            { key: 'invoice', label: 'Reference' },
            { key: 'student', label: 'Student' },
            { key: 'amount', label: 'Amount', format: (v) => fmtRwf(v) },
            { key: 'status', label: 'Status' },
          ]}
          rows={recent.sales}
          emptyMessage="No sales recorded yet — amounts come from uniform issues"
          emptyAction={{ label: 'View sales analytics', to: uniformHref('/inventory?tab=sales') }}
        />
        <HrPanel className="h-full">
          <HrPanelHeader title="Notifications" description="Alerts and reminders" />
          <div className="px-5 pb-5 space-y-2">
            {notifications.map((n, i) => (
              <NotificationItem key={i} tone={n.tone} text={n.text} />
            ))}
          </div>
        </HrPanel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <HrPanel className="xl:col-span-1">
          <HrPanelHeader title="Academic calendar" description="Term context and uniform activity by date" />
          <div className="px-5 pb-5">
            <AcademicCalendarWidget academic={academic} events={calendarEvents} />
          </div>
        </HrPanel>

        <HrPanel className="xl:col-span-2">
          <HrPanelHeader title="Quick actions" description="Common uniform manager tasks" />
          <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <DashboardQuickAction
                key={action.label}
                label={action.label}
                icon={action.icon}
                to={uniformHref(action.to)}
              />
            ))}
          </div>
        </HrPanel>
      </div>
    </UniformPageLayout>
  )
}
