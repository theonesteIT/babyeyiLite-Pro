import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shirt, TrendingUp, AlertTriangle, Box, Layers, Scale, DollarSign,
  Package, ArrowUpFromLine, BarChart3, FileSpreadsheet, Scissors,
} from 'lucide-react'
import { exportFabricStockExcel } from '../utils/uniformInventoryExport'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import FabricStockInPanel from '../components/uniform/FabricStockInPanel'
import FabricStockOutPanel from '../components/uniform/FabricStockOutPanel'
import FinishedGoodsStockPanel from '../components/uniform/FinishedGoodsStockPanel'
import UniformIssuePanel from '../components/uniform/UniformIssuePanel'
import UniformSalesAnalytics from '../components/uniform/UniformSalesAnalytics'
import UniformFabricPlannerPanel from '../components/uniform/UniformFabricPlannerPanel'
import { fetchFabricReceipts } from '../services/fabricReceiptsService'
import { fetchFinishedGoods } from '../services/finishedGoodsService'

function legacyFabricRow(row) {
  return {
    id: row.id,
    type: row.fabric_type,
    color: row.color || '—',
    meters: row.meters,
    unitCost: Number(row.unit_cost) || 0,
    totalCost: Number(row.total_cost) || 0,
    remaining: row.remaining_meters,
    date: row.purchase_date ? String(row.purchase_date).slice(0, 10) : '—',
  }
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'fabric-in', label: 'Fabric Stock In', icon: Package },
  { id: 'fabric-out', label: 'Fabric Stock Out', icon: ArrowUpFromLine },
  { id: 'fabric-stock', label: 'Fabric Stock', icon: Layers },
  { id: 'fabric-planner', label: 'Fabric Planner', icon: Scissors },
  { id: 'finished-goods', label: 'Finished Goods', icon: Box },
  { id: 'issue', label: 'Issue Uniform', icon: Shirt },
  { id: 'sales', label: 'Sales Analytics', icon: BarChart3 },
]

function EmptyTab({ icon: Icon, title, message }) {
  return (
    <div className="text-center py-16 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
      <Icon size={36} className="mx-auto text-gray-200 mb-3" />
      <p className="text-sm font-bold text-[#000435]">{title}</p>
      <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">{message}</p>
    </div>
  )
}

export default function UniformInventory() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [fabrics, setFabrics] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])

  const syncFabricsFromApi = useCallback((rows) => {
    setFabrics(rows.map(legacyFabricRow))
  }, [])

  const syncFinishedFromApi = useCallback((rows) => {
    setFinishedGoods(rows)
  }, [])

  useEffect(() => {
    Promise.all([fetchFabricReceipts(), fetchFinishedGoods()])
      .then(([fabricRows, goodsRows]) => {
        syncFabricsFromApi(fabricRows)
        syncFinishedFromApi(goodsRows)
      })
      .catch(() => {})
  }, [syncFabricsFromApi, syncFinishedFromApi])

  const totalFabricStock = fabrics.reduce((s, f) => s + f.remaining, 0)
  const totalFinishedStock = finishedGoods.reduce((s, f) => s + Number(f.stock || 0), 0)
  const totalStockValue = finishedGoods.reduce((s, f) => s + Number(f.value || 0), 0)
  const fabricCost = fabrics.reduce((s, f) => s + f.totalCost, 0)
  const lowStockCount = finishedGoods.filter((g) => Number(g.stock) < 50).length

  const dashboardStats = useMemo(
    () => [
      { label: 'Total Fabric Stock', value: `${totalFabricStock} m`, icon: Layers, color: 'amber' },
      { label: 'Finished Uniform Stock', value: `${totalFinishedStock} pcs`, icon: Box, color: 'blue' },
      { label: 'Stock Value', value: totalStockValue.toLocaleString(), icon: DollarSign, color: 'green' },
      { label: 'Fabric Investment', value: fabricCost.toLocaleString(), icon: Scale, color: 'purple' },
      { label: 'Fabric Receipts', value: `${fabrics.length}`, icon: Package, color: 'emerald' },
      {
        label: 'Low Stock Alerts',
        value: lowStockCount === 0 ? 'None' : `${lowStockCount} item${lowStockCount === 1 ? '' : 's'}`,
        icon: AlertTriangle,
        color: lowStockCount > 0 ? 'red' : 'default',
      },
    ],
    [totalFabricStock, totalFinishedStock, totalStockValue, fabricCost, fabrics.length, lowStockCount]
  )

  return (
    <StorekeeperPageShell compact className="!px-0 sm:!px-0 lg:!px-0 !pt-0">
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-gray-100/80 bg-re-bg shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#000435]/5 flex items-center justify-center shrink-0">
              <Shirt size={18} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-[#000435] tracking-tight truncate">
                Uniform inventory
              </h1>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block">
                Fabric, finished goods & distribution
              </p>
            </div>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-0.5 px-3 sm:px-6 pt-2 bg-re-bg border-b border-gray-100/80 sticky top-0 z-10 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-t-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-400/10 text-amber-700 border-b-2 border-amber-400'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardStats.map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`bg-white rounded-2xl border p-5 hover:shadow-lg transition-all duration-300 ${
                          stat.color === 'red' ? 'border-red-100 bg-red-50/30' : 'border-gray-100'
                        }`}
                      >
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-2 ${stat.color === 'red' ? 'text-red-500' : 'text-[#000435]'}`}>
                          {stat.value}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="text-sm font-bold text-[#000435] mb-4 flex items-center gap-2">
                        <Scale size={16} className="text-amber-500" /> Fabric Usage
                      </h3>
                      {fabrics.length === 0 ? (
                        <p className="text-xs text-gray-400">No fabric receipts yet. Use Fabric Stock In to register sheets.</p>
                      ) : (
                        <div className="space-y-3">
                          {fabrics.slice(0, 4).map((f) => {
                            const used = Math.max(0, f.meters - f.remaining)
                            const pct = f.meters > 0 ? (used / f.meters) * 100 : 0
                            return (
                              <div key={f.id} className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#000435]">{f.type}</span>
                                <div className="flex items-center gap-3 flex-1 ml-3">
                                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pct}%` }}
                                      transition={{ duration: 1 }}
                                      className="h-full bg-amber-400 rounded-full"
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold text-gray-500 w-20 text-right">{f.remaining}m left</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-5">
                      <h3 className="text-sm font-bold text-[#000435] mb-4 flex items-center gap-2">
                        <Box size={16} className="text-amber-500" /> Top Finished Stock
                      </h3>
                      {finishedGoods.length === 0 ? (
                        <p className="text-xs text-gray-400">No finished goods yet. Add stock under Finished Goods.</p>
                      ) : (
                        <div className="space-y-2">
                          {[...finishedGoods]
                            .sort((a, b) => Number(b.stock) - Number(a.stock))
                            .slice(0, 5)
                            .map((g) => (
                              <div key={g.id} className="flex justify-between text-xs border-b border-gray-50 py-2">
                                <span className="font-bold text-[#000435]">
                                  {g.uniform_name} <span className="text-gray-400 font-medium">({g.size})</span>
                                </span>
                                <span className="text-gray-600 font-medium">{g.stock} pcs</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'fabric-in' && (
                <FabricStockInPanel onFabricsChange={syncFabricsFromApi} />
              )}

              {activeTab === 'fabric-out' && (
                <FabricStockOutPanel onFabricsChange={syncFabricsFromApi} />
              )}

              {activeTab === 'fabric-stock' && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-[#000435]">Current Fabric Stock</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <Package size={14} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                          {totalFabricStock} meters total
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => exportFabricStockExcel(fabrics.map((f) => ({
                          type: f.type,
                          color: f.color,
                          meters: f.meters,
                          remaining: f.remaining,
                          unitCost: f.unitCost,
                        })))}
                        disabled={!fabrics.length}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100 disabled:opacity-40 transition"
                      >
                        <FileSpreadsheet size={14} /> Export Excel
                      </button>
                    </div>
                  </div>
                  {fabrics.length === 0 ? (
                    <EmptyTab
                      icon={Layers}
                      title="No fabric in stock"
                      message="Receive fabric under Fabric Stock In to see meters and usage here."
                    />
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                      <table className="w-full text-sm min-w-[720px]">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            {['Fabric', 'Color', 'Received', 'Used', 'Remaining', 'Usage', 'Status'].map((h) => (
                              <th key={h} className="text-left py-3.5 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fabrics.map((f, i) => {
                            const used = f.meters - f.remaining
                            const usagePct = f.meters > 0 ? (used / f.meters) * 100 : 0
                            return (
                              <motion.tr
                                key={f.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors"
                              >
                                <td className="py-3.5 px-4 text-xs font-bold text-[#000435]">{f.type}</td>
                                <td className="py-3.5 px-4 text-xs text-gray-500">{f.color}</td>
                                <td className="py-3.5 px-4 text-xs text-gray-600">{f.meters}m</td>
                                <td className="py-3.5 px-4 text-xs text-gray-600">{used}m</td>
                                <td className="py-3.5 px-4 text-xs font-bold text-amber-600">{f.remaining}m</td>
                                <td className="py-3.5 px-4">
                                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${usagePct}%` }}
                                      transition={{ duration: 1, delay: i * 0.1 }}
                                      className={`h-full rounded-full ${usagePct > 70 ? 'bg-red-400' : usagePct > 40 ? 'bg-amber-400' : 'bg-green-400'}`}
                                    />
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                                      usagePct > 70
                                        ? 'bg-red-50 text-red-600'
                                        : usagePct > 40
                                          ? 'bg-amber-50 text-amber-600'
                                          : 'bg-green-50 text-green-600'
                                    }`}
                                  >
                                    {usagePct.toFixed(0)}% used
                                  </span>
                                </td>
                              </motion.tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'fabric-planner' && (
                <UniformFabricPlannerPanel
                  fabrics={fabrics}
                  onFabricsChange={syncFabricsFromApi}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'finished-goods' && (
                <FinishedGoodsStockPanel onGoodsChange={syncFinishedFromApi} />
              )}

              {activeTab === 'issue' && <UniformIssuePanel />}

              {activeTab === 'sales' && <UniformSalesAnalytics />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </StorekeeperPageShell>
  )
}
