import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Package, Shirt, Apple, ArrowUpRight, AlertTriangle, TrendingUp,
  ShoppingCart, Plus, RefreshCw, Box, Warehouse, ArrowRight,
} from 'lucide-react'
import StorekeeperOchreHero from '../components/StorekeeperOchreHero'
import { fetchInventory } from '../services/inventoryService'
import { fetchMovements } from '../services/movementsService'
import { fetchFinishedGoods } from '../services/finishedGoodsService'
import { formatMoneyRounded as formatMoney } from '../utils/formatMoney'

function formatCompact(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return `${Math.round(v)}`
}

function ChartTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white/95 backdrop-blur-md border border-black/5 p-2.5 rounded-xl z-50 shadow-lg">
        <p className="text-[10px] font-bold text-[#000435] uppercase tracking-wider">{data.label}</p>
        <p className="text-xs font-bold text-[#000435] mt-1">{formatCompact(payload[0].value)} units</p>
      </div>
    )
  }
  return null
}

function RechartsTrend({ series = [], height = 120, tone = 'navy' }) {
  const data = useMemo(() => series.map(s => ({ ...s, value: Number(s.value) })), [series])
  const stroke = tone === 'amber' ? '#f59e0b' : '#000435'
  if (!data.length) {
    return <div className="flex items-center justify-center text-[#000435] text-xs" style={{ height }}>No data</div>
  }
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`storeGrad-${tone}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={stroke} stopOpacity={0.25} />
              <stop offset="95%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} width={30} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="value" stroke={stroke} strokeWidth={3} fillOpacity={1} fill={`url(#storeGrad-${tone})`} animationBegin={0} animationDuration={1500} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

const quickActions = [
  { label: 'Stock In', icon: Plus, color: 'bg-amber-400 text-[#000435]', desc: 'Receive new inventory' },
  { label: 'Stock Out', icon: ArrowUpRight, color: 'bg-blue-500 text-white', desc: 'Issue stock items' },
  { label: 'Produce Uniform', icon: Shirt, color: 'bg-emerald-500 text-white', desc: 'Manufacture uniforms' },
  { label: 'Issue Uniform', icon: TrendingUp, color: 'bg-purple-500 text-white', desc: 'Distribute uniforms' },
  { label: 'Purchase Order', icon: ShoppingCart, color: 'bg-[#000435] text-white', desc: 'Create PO' },
]

export default function StockDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [inventory, setInventory] = useState([])
  const [movements, setMovements] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')

  const loadData = useCallback(async () => {
    setError('')
    try {
      const [invRes, movRes, fgRes] = await Promise.all([
        fetchInventory(),
        fetchMovements({ limit: 100 }),
        fetchFinishedGoods(),
      ])
      setInventory(invRes.data)
      setMovements(movRes.data)
      setFinishedGoods(fgRes)
    } catch (e) {
      setError(e.message || 'Failed to load dashboard data')
      setInventory([]); setMovements([]); setFinishedGoods([])
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    loadData().finally(() => setLoading(false))
  }, [loadData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const kpis = useMemo(() => {
    const totalValue = finishedGoods.reduce((s, f) => s + Number(f.value || 0), 0)
    const fabricValue = inventory.filter(i => i.category === 'Uniform').reduce((s, i) => s + (Number(i.unit_cost) || 0) * i.quantity, 0)
    const foodValue = inventory.filter(i => i.category === 'Food').reduce((s, i) => s + (Number(i.unit_cost) || 0) * i.quantity, 0)
    const uniformCount = finishedGoods.reduce((s, f) => s + Number(f.stock || 0), 0)
    const todayStockOut = movements
      .filter(m => m.type === 'stock_out' && new Date(m.movement_date || m.date).toDateString() === new Date().toDateString())
      .reduce((s, m) => s + (Number(m.unit_cost) || 0) * m.quantity, 0)
    return [
      { label: 'Total Inventory Value', value: formatMoney(totalValue + fabricValue + foodValue), sub: `${inventory.length + finishedGoods.length} items tracked`, icon: Warehouse },
      { label: 'Uniform Stock', value: `${uniformCount.toLocaleString()} pcs`, sub: `From ${finishedGoods.length} product lines`, icon: Shirt },
      { label: 'Food Stock Value', value: formatMoney(foodValue), sub: `${inventory.filter(i => i.category === 'Food').length} items`, icon: Apple },
      { label: "Today's Stock Out", value: formatMoney(todayStockOut), sub: `${movements.filter(m => m.type === 'stock_out').length} total movements`, icon: ArrowUpRight },
    ]
  }, [finishedGoods, inventory, movements])

  const lowStockItems = useMemo(() => {
    return inventory
      .filter(i => i.reorder_level > 0 && i.quantity < i.reorder_level)
      .map(i => ({
        item: i.name,
        stock: i.quantity,
        min: i.reorder_level,
        unit: i.unit === 'pcs' ? 'pcs' : i.unit || 'units',
        category: i.category,
      }))
  }, [inventory])

  const trendSeries = useMemo(() => {
    const byMonth = {}
    movements.forEach(m => {
      const d = new Date(m.movement_date || m.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = 0
      if (m.type === 'stock_in') byMonth[key] += m.quantity
      else if (m.type === 'stock_out') byMonth[key] -= m.quantity
    })
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([label, value]) => ({ label, value: Math.abs(value) }))
  }, [movements])

  const categoryBreakdown = useMemo(() => {
    const groups = {}
    inventory.forEach(i => {
      const cat = i.category || 'Other'
      if (!groups[cat]) groups[cat] = { label: cat, items: [], total: 0 }
      groups[cat].items.push({ name: i.name, qty: i.quantity })
      groups[cat].total += i.quantity
    })
    return Object.values(groups).slice(0, 3)
  }, [inventory])

  const filteredAlerts = useMemo(() => {
    if (selectedCategory === 'all') return lowStockItems
    return lowStockItems.filter(i => i.category.toLowerCase() === selectedCategory)
  }, [lowStockItems, selectedCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-re-bg">
        <div className="text-center">
          <RefreshCw size={32} className="mx-auto text-amber-500 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-400">Loading dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="animate-in fade-in duration-500 bg-re-bg min-h-full pb-24 lg:pb-10 relative w-full"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <StorekeeperOchreHero
        eyebrow="Storekeeper Portal"
        titleLine="Stock"
        titleAccent="Dashboard"
        subtitle="Inventory · stock movements · purchase orders · suppliers"
        icon={Warehouse}
        rightSlot={
          <>
            <div className="flex bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/90">
                {inventory.length + finishedGoods.length} items tracked
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all active:scale-95 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </>
        }
      />

      {error && (
        <div className="store-shell-standard mb-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
            <AlertTriangle size={16} className="shrink-0" />
            {error}
          </div>
        </div>
      )}

      <div className="store-shell-standard mb-6 sm:mb-8">
        <div className="store-panel-sheet overflow-hidden">
          <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
            {kpis.map((kpi, i) => (
              <motion.button
                key={kpi.label}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="p-4 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/40 transition-all cursor-pointer min-h-[7.5rem]"
              >
                <div className="mb-1.5 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                  <kpi.icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
                </div>
                <span className="text-sm sm:text-xl font-medium text-re-text tracking-tight group-hover:text-[#1E3A5F] transition-colors tabular-nums">
                  {kpi.value}
                </span>
                <p className="text-[7px] sm:text-[8px] font-medium text-re-text-muted uppercase tracking-[0.16em] mt-0.5 opacity-70">
                  {kpi.label}
                </p>
                <p className="text-[6px] sm:text-[7px] font-medium uppercase tracking-widest mt-1 opacity-85 max-w-[11rem] text-emerald-600">
                  {kpi.sub}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="store-shell-standard !-mt-0 relative z-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 store-panel-sheet p-5 md:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[#000435]" />
                <h3 className="text-sm md:text-[15px] font-bold text-[#000435] uppercase tracking-[0.08em]">
                  Stock Movement Trend
                </h3>
              </div>
            </div>
            <RechartsTrend series={trendSeries} height={200} />
            {trendSeries.length === 0 && (
              <p className="text-center text-xs text-gray-400 mt-2">No movement data yet. Record stock in/out to see trends.</p>
            )}
          </div>

          <div className="store-panel-sheet p-5 md:p-6 flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h3 className="text-sm md:text-[15px] font-bold text-[#000435] uppercase tracking-[0.08em]">
                  Low Stock Alerts
                </h3>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                {lowStockItems.length} items
              </span>
            </div>

            <div className="flex gap-1.5 mb-3">
              {['all', ...new Set(inventory.map(i => (i.category || 'other').toLowerCase()))].slice(0, 5).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all ${
                    selectedCategory === cat ? 'bg-[#000435] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-2">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                    <Package size={18} className="text-green-500" />
                  </div>
                  <p className="text-xs font-medium text-gray-400">All items above reorder levels</p>
                </div>
              ) : (
                filteredAlerts.map((item, i) => (
                  <motion.div
                    key={item.item}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100/50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#000435] truncate">{item.item}</p>
                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-red-500">{item.stock}<span className="text-[9px]">/{item.min}{item.unit}</span></p>
                      <p className="text-[9px] font-semibold text-red-400 uppercase tracking-wider">
                        {Math.round((item.stock / item.min) * 100)}% of min
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 store-panel-sheet p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Box size={18} className="text-[#000435]" />
              <h3 className="text-sm md:text-[15px] font-bold text-[#000435] uppercase tracking-[0.08em]">
                Quick Actions
              </h3>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all ${action.color} shadow-sm hover:shadow-md`}
              >
                <action.icon size={20} />
                <span className="text-[10px]">{action.label}</span>
                <span className="text-[7px] opacity-70 uppercase tracking-wider">{action.desc}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {categoryBreakdown.length > 0 && (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {categoryBreakdown.map((section, si) => (
              <motion.div
                key={section.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.1 }}
                className="store-panel-sheet p-5 md:p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-[#000435]" />
                    <h3 className="text-xs font-bold text-[#000435] uppercase tracking-wider">{section.label}</h3>
                  </div>
                </div>
                <p className="text-xl font-bold text-[#000435] mb-3">{section.total} units</p>
                <div className="space-y-1.5">
                  {section.items.slice(0, 5).map(item => (
                    <div key={item.name} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500 font-semibold">{item.name}</span>
                      <span className="font-bold text-[#000435]">{item.qty}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
