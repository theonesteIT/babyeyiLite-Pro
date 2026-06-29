import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shirt, TrendingUp, AlertTriangle, Box, Layers, Scale, DollarSign,
  Package, ArrowUpFromLine, BarChart3, Scissors,
} from 'lucide-react'
import { exportFabricStockExcel, exportFabricStockPdf } from '../utils/uniformInventoryExport'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import StoreExportBar from '../components/StoreExportBar'
import FabricStockInPanel from '../components/uniform/FabricStockInPanel'
import FabricStockOutPanel from '../components/uniform/FabricStockOutPanel'
import FinishedGoodsStockPanel from '../components/uniform/FinishedGoodsStockPanel'
import UniformIssuePanel from '../components/uniform/UniformIssuePanel'
import UniformSalesAnalytics from '../components/uniform/UniformSalesAnalytics'
import UniformFabricPlannerPanel from '../components/uniform/UniformFabricPlannerPanel'
import {
  UniformKpiCard,
  UniformKpiGrid,
  UniformSection,
  UniformTable,
  UniformTableRow,
  UniformTableCell,
  UniformEmptyState,
} from '../components/uniform/UniformInventoryUi'
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
      {
        label: 'Total fabric in stock',
        value: `${totalFabricStock.toLocaleString()} m`,
        sub: 'All available fabric',
        icon: Layers,
      },
      {
        label: 'Finished uniform stock',
        value: `${totalFinishedStock.toLocaleString()} pcs`,
        sub: 'Ready to issue',
        icon: Box,
      },
      {
        label: 'Stock value',
        value: totalStockValue.toLocaleString(),
        sub: 'Finished goods value',
        icon: DollarSign,
      },
      {
        label: 'Fabric investment',
        value: fabricCost.toLocaleString(),
        sub: 'Total fabric cost',
        icon: Scale,
      },
      {
        label: 'Fabric receipts',
        value: `${fabrics.length}`,
        sub: 'Active fabric batches',
        icon: Package,
      },
      {
        label: 'Low stock alerts',
        value: lowStockCount === 0 ? 'None' : `${lowStockCount} item${lowStockCount === 1 ? '' : 's'}`,
        sub: lowStockCount > 0 ? 'Items below threshold' : 'Stock sufficient',
        icon: AlertTriangle,
        alert: lowStockCount > 0,
      },
    ],
    [totalFabricStock, totalFinishedStock, totalStockValue, fabricCost, fabrics.length, lowStockCount]
  )

  const fabricExportRows = useMemo(
    () => fabrics.map((f) => ({
      type: f.type,
      color: f.color,
      meters: f.meters,
      remaining: f.remaining,
      unitCost: f.unitCost,
    })),
    [fabrics]
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
                  <UniformKpiGrid>
                    {dashboardStats.map((stat, i) => (
                      <UniformKpiCard
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                        sub={stat.sub}
                        icon={stat.icon}
                        alert={stat.alert}
                        index={i}
                      />
                    ))}
                  </UniformKpiGrid>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <UniformSection title="Fabric usage" icon={Scale}>
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
                    </UniformSection>

                    <UniformSection title="Top finished stock" icon={Box}>
                      {finishedGoods.length === 0 ? (
                        <p className="text-xs text-gray-400">No finished goods yet. Add stock under Finished Goods.</p>
                      ) : (
                        <div className="space-y-0">
                          {[...finishedGoods]
                            .sort((a, b) => Number(b.stock) - Number(a.stock))
                            .slice(0, 5)
                            .map((g, i) => (
                              <div key={g.id} className={`flex justify-between text-xs py-2.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                                <span className="font-bold text-[#000435]">
                                  {g.uniform_name} <span className="text-gray-400 font-medium">({g.size})</span>
                                </span>
                                <span className="text-gray-600 font-semibold">{g.stock} pcs</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </UniformSection>
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
                <div className="space-y-4">
                  <UniformSection
                    title="Current fabric stock"
                    subtitle={`${totalFabricStock} meters total · ${fabrics.length} batch${fabrics.length === 1 ? '' : 'es'}`}
                    icon={Layers}
                    action={
                      <StoreExportBar
                        disabled={!fabrics.length}
                        onExportPdf={() => exportFabricStockPdf(fabricExportRows)}
                        onExportExcel={() => exportFabricStockExcel(fabricExportRows)}
                      />
                    }
                    bodyClassName="p-0"
                  >
                    {fabrics.length === 0 ? (
                      <UniformEmptyState
                        icon={Layers}
                        title="No fabric in stock"
                        message="Receive fabric under Fabric Stock In to see meters and usage here."
                      />
                    ) : (
                      <UniformTable
                        headers={['Fabric', 'Color', 'Received', 'Used', 'Remaining', 'Usage', 'Status']}
                        minWidth="720px"
                        className="border-0 shadow-none rounded-none"
                      >
                        {fabrics.map((f, i) => {
                          const used = f.meters - f.remaining
                          const usagePct = f.meters > 0 ? (used / f.meters) * 100 : 0
                          return (
                            <UniformTableRow key={f.id} index={i}>
                              <UniformTableCell className="font-bold text-[#000435]">{f.type}</UniformTableCell>
                              <UniformTableCell className="text-gray-500">{f.color}</UniformTableCell>
                              <UniformTableCell className="text-gray-600">{f.meters}m</UniformTableCell>
                              <UniformTableCell className="text-gray-600">{used}m</UniformTableCell>
                              <UniformTableCell className="font-bold text-amber-600">{f.remaining}m</UniformTableCell>
                              <UniformTableCell>
                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${usagePct}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                    className={`h-full rounded-full ${usagePct > 70 ? 'bg-red-400' : usagePct > 40 ? 'bg-amber-400' : 'bg-green-400'}`}
                                  />
                                </div>
                              </UniformTableCell>
                              <UniformTableCell>
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
                              </UniformTableCell>
                            </UniformTableRow>
                          )
                        })}
                      </UniformTable>
                    )}
                  </UniformSection>
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
