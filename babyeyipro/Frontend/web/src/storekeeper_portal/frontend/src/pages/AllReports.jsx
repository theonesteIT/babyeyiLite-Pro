import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts'
import {
   FileBarChart, Download, Printer, ChevronDown, Plus, Search, X, Building2, User, Hash, Calendar,
   Package, Shirt, Apple, ArrowUpRight, TrendingUp, AlertTriangle, Box, Layers, Scale,
   DollarSign, BadgeCheck, Loader2, ShoppingCart, Eye, FileSpreadsheet, Clock, RefreshCw,
   Users, Ruler, PieChart as PieChartIcon, BarChart3, TrendingDown, ClipboardList,
   ChevronRight, ChevronLeft, Filter, Settings as SettingsIcon,
 } from 'lucide-react'
 import StorekeeperPageShell from '../components/StorekeeperPageShell'
 import { fetchFabricReceipts } from '../services/fabricReceiptsService'
 import { fetchFinishedGoods } from '../services/finishedGoodsService'
 import { fetchUniformIssues, fetchUniformIssueAnalytics } from '../services/uniformIssueService'
 import { fetchInventory } from '../services/inventoryService'
 import { fetchMovements } from '../services/movementsService'
 import { fetchSuppliers } from '../services/suppliersService'

const COLORS = ['#000435', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316']

function formatMoney(n) {
  const v = Number(n) || 0
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatCompact(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`
  return `${Math.round(v)}`
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-black/5 p-2.5 rounded-xl z-50 shadow-lg">
        <p className="text-[10px] font-bold text-[#000435] uppercase tracking-wider mb-1">{label || payload[0]?.payload?.name || payload[0]?.payload?.label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs font-bold text-gray-600">{p.name}: {formatter ? formatter(p.value) : formatCompact(p.value)}</p>
        ))}
      </div>
    )
  }
  return null
}

const sections = [
  { id: 'student-uniform', label: 'Student Uniform', icon: Shirt },
  { id: 'fabric-consumption', label: 'Fabric Consumption', icon: Layers },
  { id: 'production', label: 'Production', icon: ClipboardList },
  { id: 'sales-profit', label: 'Sales & Profit', icon: TrendingUp },
  { id: 'stock-position', label: 'Stock Position', icon: Box },
  { id: 'erp-features', label: 'ERP Features', icon: SettingsIcon },
]//.filter(() => true) // all kept

// ── Data ──────────────────────────────────────────────────────
const studentData = [
  { code: 'STD001', name: 'Kaneza Alice', cls: 'S1A', slot1: 'Shirt ×2', slot2: 'Trouser ×1', slot3: 'Tie ×1', slot4: 'Sweater ×1', totalQty: 5, totalAmount: 33000 },
  { code: 'STD002', name: 'John Doe', cls: 'S1A', slot1: 'Shirt ×2', slot2: 'Tie ×1', slot3: 'Socks ×2', slot4: '-', totalQty: 5, totalAmount: 22000 },
  { code: 'STD003', name: 'Amara Dlamini', cls: 'S1B', slot1: 'Trouser ×2', slot2: 'Shirt ×2', slot3: 'Tie ×1', slot4: 'Sweater ×1', totalQty: 6, totalAmount: 44000 },
  { code: 'STD004', name: 'Peter Mwangi', cls: 'S2A', slot1: 'Shirt ×1', slot2: 'Trouser ×1', slot3: '-', slot4: '-', totalQty: 2, totalAmount: 13000 },
  { code: 'STD005', name: 'Grace Uwimana', cls: 'S2B', slot1: 'Shirt ×2', slot2: 'Trouser ×1', slot3: 'Tie ×1', slot4: 'Socks ×2', totalQty: 6, totalAmount: 35000 },
]

const studentDetails = {
  'Kaneza Alice': [
    { slot: 1, label: 'School Shirt', qty: 2, unitPrice: 5000, amount: 10000 },
    { slot: 2, label: 'Trouser', qty: 1, unitPrice: 8000, amount: 8000 },
    { slot: 3, label: 'Tie', qty: 1, unitPrice: 3000, amount: 3000 },
    { slot: 4, label: 'Sweater', qty: 1, unitPrice: 12000, amount: 12000 },
  ],
  'John Doe': [
    { slot: 1, label: 'School Shirt', qty: 2, unitPrice: 5000, amount: 10000 },
    { slot: 2, label: 'Tie', qty: 1, unitPrice: 3000, amount: 3000 },
    { slot: 3, label: 'Socks', qty: 2, unitPrice: 4500, amount: 9000 },
  ],
  'Amara Dlamini': [
    { slot: 1, label: 'Trouser', qty: 2, unitPrice: 8000, amount: 16000 },
    { slot: 2, label: 'School Shirt', qty: 2, unitPrice: 5000, amount: 10000 },
    { slot: 3, label: 'Tie', qty: 1, unitPrice: 3000, amount: 3000 },
    { slot: 4, label: 'Sweater', qty: 1, unitPrice: 12000, amount: 12000 },
  ],
  'Peter Mwangi': [
    { slot: 1, label: 'School Shirt', qty: 1, unitPrice: 5000, amount: 5000 },
    { slot: 2, label: 'Trouser', qty: 1, unitPrice: 8000, amount: 8000 },
  ],
  'Grace Uwimana': [
    { slot: 1, label: 'School Shirt', qty: 2, unitPrice: 5000, amount: 10000 },
    { slot: 2, label: 'Trouser', qty: 1, unitPrice: 8000, amount: 8000 },
    { slot: 3, label: 'Tie', qty: 1, unitPrice: 3000, amount: 3000 },
    { slot: 4, label: 'Socks', qty: 2, unitPrice: 4500, amount: 9000 },
  ],
}

const byUniformData = [
  { name: 'School Shirt', students: 1250, qtySold: 2500, revenue: 12500000 },
  { name: 'School Trouser', students: 1000, qtySold: 1000, revenue: 8000000 },
  { name: 'School Tie', students: 1200, qtySold: 1200, revenue: 3600000 },
  { name: 'Sweater', students: 800, qtySold: 800, revenue: 9600000 },
  { name: 'Socks', students: 900, qtySold: 1800, revenue: 8100000 },
]

const fabricData = [
  { sheet: 'Blue Fabric', costPerMeter: 2500, purchased: 5000, used: 3200, remaining: 1800, totalCost: 12500000 },
  { sheet: 'Grey Fabric', costPerMeter: 3000, purchased: 2000, used: 1200, remaining: 800, totalCost: 6000000 },
  { sheet: 'White Fabric', costPerMeter: 2000, purchased: 3500, used: 2500, remaining: 1000, totalCost: 7000000 },
  { sheet: 'Khaki Fabric', costPerMeter: 2800, purchased: 1500, used: 600, remaining: 900, totalCost: 4200000 },
]

const consumptionByMonth = [
  { month: 'January', meters: 500 }, { month: 'February', meters: 750 }, { month: 'March', meters: 900 },
  { month: 'April', meters: 680 }, { month: 'May', meters: 820 }, { month: 'June', meters: 950 },
]

const fabricByUniform = [
  { uniform: 'Shirt', meters: 2500 }, { uniform: 'Trouser', meters: 1800 },
  { uniform: 'Sweater', meters: 900 }, { uniform: 'Tie', meters: 400 }, { uniform: 'Socks', meters: 300 },
]

const productionData = [
  { uniform: 'School Shirt', qtyProduced: 2000, unitCost: 4000, totalCost: 8000000 },
  { uniform: 'School Trouser', qtyProduced: 1500, unitCost: 5000, totalCost: 7500000 },
  { uniform: 'School Tie', qtyProduced: 1000, unitCost: 2000, totalCost: 2000000 },
  { uniform: 'Sweater', qtyProduced: 750, unitCost: 10000, totalCost: 7500000 },
]

const productionByMonth = [
  { month: 'Jan', units: 400 }, { month: 'Feb', units: 600 }, { month: 'Mar', units: 850 },
  { month: 'Apr', units: 700 }, { month: 'May', units: 900 }, { month: 'Jun', units: 1100 },
]

const salesData = [
  { uniform: 'Shirt', qtySold: 2000, costPerUnit: 4000, salePrice: 5000, revenue: 10000000, profit: 2000000 },
  { uniform: 'Trouser', qtySold: 1500, costPerUnit: 5000, salePrice: 8000, revenue: 12000000, profit: 4500000 },
  { uniform: 'Tie', qtySold: 1000, costPerUnit: 2000, salePrice: 3000, revenue: 3000000, profit: 1000000 },
  { uniform: 'Sweater', qtySold: 700, costPerUnit: 10000, salePrice: 15000, revenue: 10500000, profit: 3500000 },
  { uniform: 'Socks', qtySold: 1500, costPerUnit: 2500, salePrice: 4500, revenue: 6750000, profit: 3000000 },
]

const stockData = [
  { item: 'Shirt', produced: 2000, sold: 1500, remaining: 500, stockValue: 2000000 },
  { item: 'Trouser', produced: 1500, sold: 1000, remaining: 500, stockValue: 2500000 },
  { item: 'Tie', produced: 1000, sold: 950, remaining: 50, stockValue: 100000 },
  { item: 'Sweater', produced: 750, sold: 600, remaining: 150, stockValue: 1500000 },
  { item: 'Socks', produced: 2000, sold: 1800, remaining: 200, stockValue: 500000 },
]

const revenueTrend = [
  { month: 'Jan', revenue: 2800000, cost: 1800000 },
  { month: 'Feb', revenue: 3200000, cost: 2100000 },
  { month: 'Mar', revenue: 4100000, cost: 2600000 },
  { month: 'Apr', revenue: 3800000, cost: 2400000 },
  { month: 'May', revenue: 4500000, cost: 2800000 },
  { month: 'Jun', revenue: 5200000, cost: 3100000 },
]

const classDistribution = [
  { name: 'S1', value: 380 }, { name: 'S2', value: 320 }, { name: 'S3', value: 290 },
  { name: 'S4', value: 260 }, { name: 'S5', value: 210 }, { name: 'S6', value: 190 },
]

// ── Sub-components ─────────────────────────────────────────────
function DashboardCards({ cards }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {cards.map((card, i) => (
        <motion.div
          key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-amber-200/50 transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              {card.icon && <card.icon size={16} className="text-amber-500" />}
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
          </div>
          <p className="text-xl font-bold text-[#000435]">{card.value}</p>
          {card.sub && <p className="text-[10px] font-medium text-gray-400 mt-1">{card.sub}</p>}
        </motion.div>
      ))}
    </div>
  )
}

function FilterBar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
      {children}
    </div>
  )
}

function FilterSelect({ icon: Icon, label, children }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-[#000435] uppercase tracking-wider focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
      {Icon && <Icon size={14} className="text-gray-400" />}
      <select className="bg-transparent border-none outline-none text-[11px] font-bold text-[#000435] uppercase tracking-wider appearance-none cursor-pointer">
        {children}
      </select>
      <ChevronDown size={12} className="text-gray-300" />
    </div>
  )
}

function ActionButton({ icon: Icon, label, primary, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
      primary ? 'bg-[#000435] text-white hover:bg-[#0a116b] shadow-lg shadow-[#000435]/20' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
    }`}>
      {Icon && <Icon size={13} />} {label}
    </button>
  )
}

function InfoBadge({ children, color = 'amber' }) {
  const colors = { amber: 'bg-amber-50 text-amber-700 border-amber-200/50', navy: 'bg-[#000435]/5 text-[#000435] border-[#000435]/10', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/50' }
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border ${colors[color] || colors.amber}`}>
      <BadgeCheck size={16} className={`shrink-0 ${color === 'navy' ? 'text-[#000435]' : 'text-amber-500'}`} />
      <p className="text-[11px] font-medium">{children}</p>
    </div>
  )
}

function SectionHeader({ title, subtitle, rightSlot }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-4 border-b border-gray-100">
      <div>
        <h3 className="text-sm font-bold text-[#000435] uppercase tracking-[0.05em]">{title}</h3>
        {subtitle && <p className="text-[11px] font-medium text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {rightSlot}
    </div>
  )
}

function SimpleTable({ headers, rows, renderRow }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/80 border-b border-gray-100">
            {headers.map(h => (
              <th key={h} className="text-left py-3.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => renderRow ? renderRow(row, i) : null)}
        </tbody>
      </table>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────
function exportCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function printSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  const printWin = window.open('', '_blank')
  printWin.document.write(`<!DOCTYPE html><html><head><title>Report</title><style>
    body { font-family: 'Montserrat', sans-serif; padding: 20px; color: #000435; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    h2 { font-size: 18px; margin-bottom: 4px; }
    p { font-size: 11px; color: #6b7280; margin-top: 0; }
    .summary { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 20px; }
    .summary div { background: #f9fafb; padding: 12px; border-radius: 8px; }
    .summary div h3 { font-size: 10px; text-transform: uppercase; color: #9ca3af; margin: 0 0 4px; }
    .summary div p { font-size: 16px; font-weight: 700; color: #000435; margin: 0; }
  </style></head><body>${el.innerHTML}</body></html>`)
  printWin.document.close()
  printWin.focus()
  setTimeout(() => printWin.print(), 300)
}

// ── Main Component ────────────────────────────────────────────
export default function AllReports() {
  const [activeSection, setActiveSection] = useState('student-uniform')
  const [studentTab, setStudentTab] = useState('by-student')
  const [expandedStudent, setExpandedStudent] = useState(null)
  const [drillDown, setDrillDown] = useState(null)
  const reportRef = useRef(null)

  const [fabrics, setFabrics] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [issues, setIssues] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [inventory, setInventory] = useState([])
  const [movements, setMovements] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [f, fg, is, an, inv, mov, sup] = await Promise.all([
        fetchFabricReceipts(),
        fetchFinishedGoods(),
        fetchUniformIssues(),
        fetchUniformIssueAnalytics().catch(() => null),
        fetchInventory(),
        fetchMovements({ limit: 200 }),
        fetchSuppliers(),
      ])
      setFabrics(f)
      setFinishedGoods(fg)
      setIssues(is)
      setAnalytics(an)
      setInventory(inv.data)
      setMovements(mov.data)
      setSuppliers(sup)
    } catch (_) { /* use fallback data */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalStockValue = finishedGoods.reduce((s, f) => s + Number(f.value || 0), 0)
  const totalFabricUsed = fabrics.reduce((s, f) => s + (f.meters - f.remaining_meters), 0)
  const totalIssues = issues.reduce((s, i) => s + (i.items ? i.items.reduce((a, it) => a + Number(it.quantity || 0), 0) : 0), 0)

  const summaryCards = [
    { label: 'Students Served', value: analytics?.total_students?.toLocaleString() || issues.length > 0 ? `${issues.length}` : '—', icon: Users },
    { label: 'Uniforms Issued', value: `${totalIssues.toLocaleString()} Pieces`, icon: Shirt },
    { label: 'Sales Revenue', value: `${formatMoney(analytics?.total_revenue || 0)} RWF`, icon: TrendingUp },
    { label: 'Current Stock Value', value: `${formatMoney(totalStockValue)} RWF`, icon: DollarSign },
    { label: 'Fabric Used', value: `${Math.round(totalFabricUsed).toLocaleString()} Meters`, icon: Ruler },
    { label: 'Total Profit', value: `${formatMoney(analytics?.total_profit || 0)} RWF`, icon: TrendingUp },
  ]

  const renderStudentUniform = () => (
    <div id="report-student-uniform" className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100/80 rounded-xl p-1 w-fit">
        {[{ id: 'by-student', label: 'By Student' }, { id: 'by-uniform', label: 'By Uniform' }].map(t => (
          <button key={t.id} onClick={() => setStudentTab(t.id)}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              studentTab === t.id ? 'bg-white text-[#000435] shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}>{t.label}</button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {studentTab === 'by-student' ? (
          <motion.div key="by-student" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <FilterBar>
              <FilterSelect icon={Calendar} label="Year"><option>2026</option></FilterSelect>
              <FilterSelect icon={Calendar} label="Term"><option>Term I</option></FilterSelect>
              <FilterSelect icon={Building2} label="Class"><option>All Classes</option><option>S1A</option><option>S1B</option><option>S2A</option></FilterSelect>
              <FilterSelect icon={User} label="Student"><option>All Students</option></FilterSelect>
            </FilterBar>

            <SimpleTable headers={['Code', 'Student Name', 'Class', 'Slot 1', 'Slot 2', 'Slot 3', 'Slot 4', 'Total Qty', 'Total Amount', '']}
              rows={studentData}
              renderRow={(row, i) => (
                <motion.tr key={row.code} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedStudent(expandedStudent === row.name ? null : row.name)}
                >
                  <td className="py-3 px-4 text-xs text-gray-500 font-mono">{row.code}</td>
                  <td className="py-3 px-4 text-xs font-bold text-[#000435]">{row.name}</td>
                  <td className="py-3 px-4 text-xs text-gray-500">{row.cls}</td>
                  <td className="py-3 px-4 text-xs text-gray-600">{row.slot1}</td>
                  <td className="py-3 px-4 text-xs text-gray-600">{row.slot2}</td>
                  <td className="py-3 px-4 text-xs text-gray-600">{row.slot3}</td>
                  <td className="py-3 px-4 text-xs text-gray-600">{row.slot4}</td>
                  <td className="py-3 px-4 text-xs font-bold text-[#000435]">{row.totalQty}</td>
                  <td className="py-3 px-4 text-xs font-bold text-amber-600">{formatMoney(row.totalAmount)} RWF</td>
                  <td className="py-3 px-4 text-xs"><ChevronRight size={14} className={`text-gray-300 transition-transform ${expandedStudent === row.name ? 'rotate-90' : ''}`} /></td>
                </motion.tr>
              )}
            />

            <AnimatePresence>
              {expandedStudent && studentDetails[expandedStudent] && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-2xl border border-amber-200/50 bg-amber-50/30">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User size={14} className="text-amber-500" />
                      <span className="text-xs font-bold text-[#000435] uppercase tracking-wider">{expandedStudent} — Uniform Details</span>
                    </div>
                    <SimpleTable headers={['Slot', 'Label', 'Quantity', 'Unit Price', 'Amount']}
                      rows={studentDetails[expandedStudent]}
                      renderRow={(row, i) => (
                        <tr key={i} className="border-b border-amber-100/50">
                          <td className="py-2.5 px-4 text-xs text-gray-500">Slot {row.slot}</td>
                          <td className="py-2.5 px-4 text-xs font-bold text-[#000435]">{row.label}</td>
                          <td className="py-2.5 px-4 text-xs text-gray-600">{row.qty}</td>
                          <td className="py-2.5 px-4 text-xs text-gray-600">{formatMoney(row.unitPrice)} RWF</td>
                          <td className="py-2.5 px-4 text-xs font-bold text-amber-600">{formatMoney(row.amount)} RWF</td>
                        </tr>
                      )}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Uniform Distribution by Class</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={classDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {classDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {classDistribution.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-[9px] font-bold text-gray-400">{d.name}</span></div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue by Class</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={classDistribution.map(d => ({ ...d, revenue: d.value * 15000 }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} width={30} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip content={<ChartTooltip formatter={v => `${formatMoney(v)} RWF`} />} />
                    <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Top Students by Purchases</h4>
                <div className="space-y-2">
                  {[...studentData].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 4).map((s, i) => (
                    <div key={s.code} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                        <div><p className="text-[11px] font-bold text-[#000435]">{s.name}</p><p className="text-[9px] text-gray-400">{s.cls}</p></div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-600">{formatMoney(s.totalAmount)} RWF</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="by-uniform" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <SimpleTable headers={['Uniform Name', 'Students', 'Quantity Sold', 'Revenue']}
              rows={byUniformData}
              renderRow={(row, i) => (
                <motion.tr key={row.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                  <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{row.name}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-600">{row.students.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-xs text-gray-600">{row.qtySold.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-xs font-bold text-amber-600">{formatMoney(row.revenue)} RWF</td>
                </motion.tr>
              )}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Top Selling Uniforms</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={byUniformData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#00000008" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#000435' }} width={90} />
                    <Tooltip content={<ChartTooltip formatter={v => `${formatMoney(v)} RWF`} />} />
                    <Bar dataKey="revenue" fill="#000435" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue Analysis</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={byUniformData} cx="50%" cy="50%" outerRadius={85} paddingAngle={2} dataKey="revenue">
                      {byUniformData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip formatter={v => `${formatMoney(v)} RWF`} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {byUniformData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-[9px] font-bold text-gray-400">{d.name}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const renderFabricConsumption = () => (
    <div id="report-fabric-consumption" className="space-y-6">
      <DashboardCards cards={[
        { label: 'Fabric Purchased', value: '12,000 Meters', icon: Package, sub: 'Total all sheets' },
        { label: 'Fabric Used', value: '7,500 Meters', icon: Ruler, sub: '62.5% utilization' },
        { label: 'Remaining Fabric', value: '4,500 Meters', icon: Layers, sub: '37.5% in stock' },
        { label: 'Current Fabric Value', value: `${formatMoney(8750000)} RWF`, icon: DollarSign },
      ]} />
      <SectionHeader title="Fabric Inventory" subtitle="Current stock levels by fabric type" />
      <SimpleTable headers={['Fabric Sheet', 'Cost/Meter', 'Purchased', 'Used', 'Remaining', 'Total Cost']}
        rows={fabricData}
        renderRow={(row, i) => (
          <motion.tr key={row.sheet} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
            <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{row.sheet}</td>
            <td className="py-3.5 px-4 text-xs text-gray-600">{formatMoney(row.costPerMeter)} RWF</td>
            <td className="py-3.5 px-4 text-xs text-gray-600">{row.purchased.toLocaleString()}m</td>
            <td className="py-3.5 px-4 text-xs text-gray-600">{row.used.toLocaleString()}m</td>
            <td className="py-3.5 px-4 text-xs font-bold text-amber-600">{row.remaining.toLocaleString()}m</td>
            <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{formatMoney(row.totalCost)} RWF</td>
          </motion.tr>
        )}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Consumption by Month</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={consumptionByMonth}>
              <defs><linearGradient id="fabGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} width={30} />
              <Tooltip content={<ChartTooltip formatter={v => `${v}m`} />} />
              <Area type="monotone" dataKey="meters" stroke="#f59e0b" strokeWidth={3} fill="url(#fabGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Fabric Usage by Uniform</h4>
          <div className="space-y-2">
            {fabricByUniform.map((d, i) => (
              <div key={d.uniform} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                <span className="text-[11px] font-bold text-[#000435]">{d.uniform}</span>
                <span className="text-[11px] font-bold text-amber-600">{d.meters}m</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Efficiency</p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-lg font-bold text-emerald-600">98%</p>
                <p className="text-[9px] text-gray-400">Efficiency</p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <p className="text-lg font-bold text-red-500">120m</p>
                <p className="text-[9px] text-gray-400">Waste</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderProduction = () => (
    <div id="report-production" className="space-y-6">
      <DashboardCards cards={[
        { label: 'Finished Goods Produced', value: '5,250 Units', icon: Box },
        { label: 'Production Cost', value: `${formatMoney(15250000)} RWF`, icon: DollarSign },
        { label: 'Inventory Value', value: `${formatMoney(8500000)} RWF`, icon: Package },
        { label: 'Production Efficiency', value: '96%', icon: TrendingUp, sub: 'On-time completion' },
      ]} />
      <SimpleTable headers={['Uniform', 'Quantity Produced', 'Unit Cost', 'Total Cost']}
        rows={productionData}
        renderRow={(row, i) => (
          <motion.tr key={row.uniform} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
            <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{row.uniform}</td>
            <td className="py-3.5 px-4 text-xs text-gray-600">{row.qtyProduced.toLocaleString()}</td>
            <td className="py-3.5 px-4 text-xs text-gray-600">{formatMoney(row.unitCost)} RWF</td>
            <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{formatMoney(row.totalCost)} RWF</td>
          </motion.tr>
        )}
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Production by Month</h4>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={productionByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="units" stroke="#000435" strokeWidth={3} dot={{ fill: '#000435', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Most Produced Items</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[...productionData].sort((a, b) => b.qtyProduced - a.qtyProduced)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#00000008" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis dataKey="uniform" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#000435' }} width={90} />
              <Tooltip />
              <Bar dataKey="qtyProduced" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  const renderSalesProfit = () => (
    <div id="report-sales-profit" className="space-y-6">
      <DashboardCards cards={[
        { label: 'Total Sales', value: `${formatMoney(25000000)} RWF`, icon: TrendingUp, sub: 'Gross revenue' },
        { label: 'Cost of Goods Sold', value: `${formatMoney(15000000)} RWF`, icon: DollarSign, sub: 'Production cost' },
        { label: 'Gross Profit', value: `${formatMoney(10000000)} RWF`, icon: TrendingUp, sub: 'Before other costs' },
        { label: 'Profit Margin', value: '40%', icon: BadgeCheck, sub: 'Healthy margin' },
      ]} />
      <SimpleTable headers={['Uniform', 'Qty Sold', 'Cost/Unit', 'Sale Price', 'Revenue', 'Profit']}
        rows={salesData}
        renderRow={(row, i) => (
          <motion.tr key={row.uniform} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
            <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{row.uniform}</td>
            <td className="py-3.5 px-4 text-xs text-gray-600">{row.qtySold.toLocaleString()}</td>
            <td className="py-3.5 px-4 text-xs text-gray-600">{formatMoney(row.costPerUnit)} RWF</td>
            <td className="py-3.5 px-4 text-xs text-gray-600">{formatMoney(row.salePrice)} RWF</td>
            <td className="py-3.5 px-4 text-xs font-bold text-gray-700">{formatMoney(row.revenue)} RWF</td>
            <td className="py-3.5 px-4 text-xs font-bold text-emerald-600">{formatMoney(row.profit)} RWF</td>
          </motion.tr>
        )}
      />
      <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl border border-amber-200/50 p-6">
        <h4 className="text-xs font-bold text-[#000435] mb-4 flex items-center gap-2"><ClipboardList size={15} /> Profit Formula</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Revenue</p>
            <p className="text-lg font-bold text-[#000435] mt-1">{formatMoney(25000000)} RWF</p>
          </div>
          <div className="flex items-center justify-center text-gray-300 text-xl font-bold">−</div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cost of Goods Sold</p>
            <p className="text-lg font-bold text-[#000435] mt-1">{formatMoney(15000000)} RWF</p>
          </div>
          <div className="flex items-center justify-center text-gray-300 text-xl font-bold">=</div>
          <div className="bg-white rounded-xl p-4 border border-emerald-200 text-center">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gross Profit</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{formatMoney(10000000)} RWF</p>
          </div>
        </div>
        <InfoBadge color="emerald">Profit = Total Revenue − Cost of Goods Sold. Example: 10,000,000 RWF − 8,000,000 RWF = 2,000,000 RWF</InfoBadge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Revenue vs Cost Trend</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueTrend}>
              <defs><linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#000435" stopOpacity={0.2} /><stop offset="95%" stopColor="#000435" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} width={40} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
              <Tooltip content={<ChartTooltip formatter={v => `${formatMoney(v)} RWF`} />} />
              <Area type="monotone" dataKey="revenue" stroke="#000435" strokeWidth={3} fill="url(#revGrad)" />
              <Area type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Profit by Uniform</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
              <XAxis dataKey="uniform" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} width={40} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
              <Tooltip content={<ChartTooltip formatter={v => `${formatMoney(v)} RWF`} />} />
              <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )

  const renderStockPosition = () => (
    <div id="report-stock-position" className="space-y-6">
      <SimpleTable headers={['Item', 'Produced', 'Sold', 'Remaining', 'Stock Value', 'Status']}
        rows={stockData}
        renderRow={(row, i) => {
          const status = row.remaining <= 50 ? 'Low Stock' : row.remaining <= 200 ? 'Moderate' : 'In Stock'
          return (
            <motion.tr key={row.item} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
              <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{row.item}</td>
              <td className="py-3.5 px-4 text-xs text-gray-600">{row.produced.toLocaleString()}</td>
              <td className="py-3.5 px-4 text-xs text-gray-600">{row.sold.toLocaleString()}</td>
              <td className="py-3.5 px-4 text-xs font-bold text-amber-600">{row.remaining.toLocaleString()}</td>
              <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{formatMoney(row.stockValue)} RWF</td>
              <td className="py-3.5 px-4">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                  status === 'In Stock' ? 'bg-green-50 text-green-600' :
                  status === 'Moderate' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                }`}>{status}</span>
              </td>
            </motion.tr>
          )
        }}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Low Stock', item: 'School Tie', remain: 25, icon: AlertTriangle, color: 'red' },
          { label: 'Reorder Needed', item: 'Sports Uniform', remain: 15, icon: AlertTriangle, color: 'red' },
        ].map((alert, i) => (
          <motion.div key={alert.item} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><AlertTriangle size={18} className="text-red-500" /></div>
              <div><p className="text-xs font-bold text-[#000435]">{alert.item}</p><p className="text-[10px] text-gray-500">{alert.label}</p></div>
            </div>
            <div className="text-right"><p className="text-lg font-bold text-red-500">{alert.remain}</p><p className="text-[10px] text-red-400">remaining</p></div>
          </motion.div>
        ))}
      </div>
    </div>
  )

  const renderERPFeatures = () => (
    <div id="report-erp-features" className="space-y-6">
      <SectionHeader title="Modern ERP Features" subtitle="Advanced tools for inventory management" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Drill Down */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3"><Eye size={18} className="text-amber-500" /></div>
          <h4 className="text-xs font-bold text-[#000435] mb-2">Drill Down Reports</h4>
          <p className="text-[11px] text-gray-400 font-medium mb-3">Complete lifecycle tracking from fabric to profit.</p>
          <div className="space-y-1.5">
            {[
              { label: 'Purchased Fabric', desc: '12,000m total' },
              { label: '→ Produced', desc: '5,250 units' },
              { label: '→ Sold', desc: '4,850 units' },
              { label: '→ Profit', desc: `${formatMoney(6350000)} RWF` },
              { label: '→ Remaining Stock', desc: '1,400 units' },
            ].map((step, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-[10px]">
                <span className={`font-bold ${i === 4 ? 'text-emerald-600' : 'text-[#000435]'}`}>{step.label}</span>
                <span className="text-gray-500">{step.desc}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Report Builder */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3"><FileSpreadsheet size={18} className="text-amber-500" /></div>
          <h4 className="text-xs font-bold text-[#000435] mb-2">Report Builder</h4>
          <p className="text-[11px] text-gray-400 font-medium mb-3">Choose columns, filters, and grouping to create custom reports.</p>
          <div className="space-y-2">
            {['Columns', 'Filters', 'Grouping'].map(f => (
              <div key={f} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                <span className="text-[11px] font-bold text-[#000435]">{f}</span>
                <button className="text-[9px] font-bold text-amber-600 uppercase tracking-wider hover:text-amber-700">Add +</button>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 py-2.5 bg-[#000435] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-[#0a116b] transition-all">Generate Report</button>
        </motion.div>

        {/* Scheduled Reports */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3"><Clock size={18} className="text-amber-500" /></div>
          <h4 className="text-xs font-bold text-[#000435] mb-2">Scheduled Reports</h4>
          <p className="text-[11px] text-gray-400 font-medium mb-3">Automatically send reports to management.</p>
          <div className="space-y-2">
            {[
              { freq: 'Daily', time: '05:00 PM', to: 'Store Manager' },
              { freq: 'Weekly', time: 'Monday 08:00 AM', to: 'DOS Office' },
              { freq: 'Monthly', time: '1st 09:00 AM', to: 'Head Teacher' },
              { freq: 'Termly', time: 'Term End', to: 'Board Members' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-[10px]">
                <span className="font-bold text-[#000435]">{s.freq}</span>
                <span className="text-gray-400 text-[9px]">{s.time}</span>
                <span className="text-gray-500">{s.to}</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 py-2.5 border border-amber-200 text-amber-700 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-amber-50 transition-all">Configure Schedule</button>
        </motion.div>
      </div>

      <SectionHeader title="Interactive Analytics" subtitle="Real-time trends and insights" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Revenue Trend', icon: TrendingUp, color: '#000435', data: revenueTrend.map(d => ({ label: d.month, value: d.revenue })) },
          { label: 'Production Trend', icon: TrendingUp, color: '#f59e0b', data: productionByMonth.map(d => ({ label: d.month, value: d.units })) },
          { label: 'Fabric Usage Trend', icon: Ruler, color: '#3b82f6', data: consumptionByMonth.map(d => ({ label: d.month, value: d.meters })) },
        ].map((chart, i) => (
          <motion.div key={chart.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <chart.icon size={14} className="text-amber-500" />
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{chart.label}</h4>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chart.data}>
                <defs><linearGradient id={`chart-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chart.color} stopOpacity={0.2} /><stop offset="95%" stopColor={chart.color} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000008" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} width={25} tickFormatter={v => formatCompact(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2} fill={`url(#chart-${i})`} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        ))}
      </div>
    </div>
  )

  return (
    <StorekeeperPageShell
      titleLine="Uniform Reports"
      titleAccent="& Analytics Center"
      subtitle="Comprehensive reporting and analytics for uniform inventory management"
      icon={FileBarChart}
      rightSlot={
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton icon={Download} label="Export CSV" onClick={() => {
            const rows = finishedGoods.map(f => [f.uniform_name, f.size, f.stock, f.selling_price])
            exportCSV(['Item', 'Size', 'Stock', 'Selling Price'], rows, `uniform-stock-${new Date().toISOString().slice(0, 10)}.csv`)
          }} />
          <ActionButton icon={Printer} label="Print" primary onClick={() => printSection(`report-${activeSection}`)} />
        </div>
      }
    >
      <div className="store-panel-sheet p-0 sm:p-0 space-y-0 overflow-hidden">
        {/* Section Tabs */}
        <div className="flex overflow-x-auto gap-0.5 px-4 sm:px-6 pt-4 sm:pt-6 bg-white border-b border-gray-100 sticky top-0 z-10">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-t-xl transition-all ${
                activeSection === s.id ? 'bg-amber-400/10 text-amber-700 border-b-2 border-amber-400' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}>
              <s.icon size={13} /> {s.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 sm:p-6" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          {/* Summary Cards (always visible) */}
          <DashboardCards cards={summaryCards} />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'student-uniform' && renderStudentUniform()}
              {activeSection === 'fabric-consumption' && renderFabricConsumption()}
              {activeSection === 'production' && renderProduction()}
              {activeSection === 'sales-profit' && renderSalesProfit()}
              {activeSection === 'stock-position' && renderStockPosition()}
              {activeSection === 'erp-features' && renderERPFeatures()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </StorekeeperPageShell>
  )
}


