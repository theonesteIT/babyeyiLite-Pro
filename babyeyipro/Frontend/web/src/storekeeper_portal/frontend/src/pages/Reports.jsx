import { useState, useEffect, useCallback } from 'react'
import { FileBarChart, Download, Printer } from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import { fetchInventory } from '../services/inventoryService'
import { fetchFinishedGoods } from '../services/finishedGoodsService'
import { fetchMovements } from '../services/movementsService'
import { formatMoney } from '../utils/formatMoney'

function exportCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

const reportTabs = [
  { id: 'valuation', label: 'Inventory Valuation' },
  { id: 'movement', label: 'Stock Movement' },
  { id: 'uniform-pl', label: 'Uniform P&L' },
  { id: 'low-stock', label: 'Low Stock Report' },
]

export default function Reports() {
  const [activeTab, setActiveTab] = useState('valuation')
  const [inventory, setInventory] = useState([])
  const [finishedGoods, setFinishedGoods] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, fg, mov] = await Promise.all([
        fetchInventory(),
        fetchFinishedGoods(),
        fetchMovements({ limit: 200 }),
      ])
      setInventory(inv.data)
      setFinishedGoods(fg)
      setMovements(mov.data)
    } catch (_) { /* use empty state */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const uniformValue = finishedGoods.reduce((s, f) => s + Number(f.value || 0), 0)
  const foodItems = inventory.filter(i => (i.category || '').toLowerCase() === 'food')
  const foodValue = foodItems.reduce((s, i) => s + i.quantity * (i.unit_cost || 0), 0)
  const otherItems = inventory.filter(i => {
    const c = (i.category || '').toLowerCase()
    return c !== 'food' && c !== 'uniform'
  })
  const otherValue = otherItems.reduce((s, i) => s + i.quantity * (i.unit_cost || 0), 0)
  const lowStockItems = inventory.filter(i => i.reorder_level > 0 && i.quantity < i.reorder_level)

  const renderValuation = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase">Total Inventory Value</p>
          <p className="text-2xl font-light text-[#000435] mt-2">{formatMoney(uniformValue + foodValue + otherValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase">Uniform Value</p>
          <p className="text-2xl font-light text-[#000435] mt-2">{formatMoney(uniformValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase">Food Value</p>
          <p className="text-2xl font-light text-[#000435] mt-2">{formatMoney(foodValue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase">Other Stock Value</p>
          <p className="text-2xl font-light text-[#000435] mt-2">{formatMoney(otherValue)}</p>
        </div>
      </div>
    </div>
  )

  const renderMovement = () => (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 text-xs text-gray-400 font-medium uppercase">Item</th>
              <th className="text-right py-3 text-xs text-gray-400 font-medium uppercase">Type</th>
              <th className="text-right py-3 text-xs text-gray-400 font-medium uppercase">Qty</th>
              <th className="text-right py-3 text-xs text-gray-400 font-medium uppercase">After</th>
              <th className="text-right py-3 text-xs text-gray-400 font-medium uppercase">Date</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No movements recorded yet</td></tr>
            ) : (
              movements.slice(0, 20).map((r, i) => (
                <tr key={r.id || i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="py-3 font-medium text-[#000435]">{r.item_name}</td>
                  <td className="py-3 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded ${r.type === 'stock_in' ? 'bg-green-50 text-green-600' : r.type === 'stock_out' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                      {r.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right text-gray-600">{r.quantity}</td>
                  <td className="py-3 text-right text-gray-600">{r.stock_after}</td>
                  <td className="py-3 text-right text-gray-500">{r.movement_date ? String(r.movement_date).slice(0, 10) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  const renderUniformPL = () => (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-xl border border-amber-100 p-6">
        <h3 className="font-medium text-[#000435] mb-4">Uniform Profit & Loss</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div><p className="text-xs text-gray-400">Stock Value</p><p className="text-xl font-light text-[#000435] mt-1">{formatMoney(uniformValue)}</p></div>
          <div><p className="text-xs text-gray-400">Items in Stock</p><p className="text-xl font-light text-[#000435] mt-1">{finishedGoods.reduce((s, f) => s + Number(f.stock || 0), 0)} pcs</p></div>
          <div><p className="text-xs text-gray-400">Avg Unit Price</p><p className="text-xl font-light text-green-600 mt-1">{finishedGoods.length > 0 ? formatMoney(Math.round(uniformValue / finishedGoods.reduce((s, f) => s + Number(f.stock || 0), 0) || 1)) : '—'}</p></div>
        </div>
      </div>
    </div>
  )

  const renderLowStock = () => (
    <div className="space-y-3">
      {lowStockItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400">No low stock items found</p>
        </div>
      ) : (
        lowStockItems.map((r, i) => (
          <div key={r.id || i} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div>
                <p className="text-sm font-medium text-[#000435]">{r.name}</p>
                <p className="text-xs text-gray-400">{r.category} - Min: {r.reorder_level}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-red-500">{r.quantity}</p>
              <p className="text-xs text-red-400">remaining</p>
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <StorekeeperPageShell
      titleLine="Reports"
      subtitle="Inventory insights and analytics"
      icon={FileBarChart}
      rightSlot={
        <button
          type="button"
          onClick={() => {
            const rows = finishedGoods.map(f => [f.uniform_name, f.size, f.stock, f.selling_price])
            const csv = [['Item', 'Size', 'Stock', 'Price'], ...rows].map(r => r.join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = `reports-${new Date().toISOString().slice(0, 10)}.csv`
            document.body.appendChild(a); a.click()
            document.body.removeChild(a); URL.revokeObjectURL(url)
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-white/15 transition-all"
        >
          <Download size={14} /> Export
        </button>
      }
    >
      <div className="store-panel-sheet p-4 sm:p-6 space-y-6">
      <div className="flex overflow-x-auto gap-1 pb-2 border-b border-gray-100 -mx-1 px-1">
        {reportTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm rounded-t-lg transition-all ${
              activeTab === tab.id ? 'bg-amber-400 text-[#000435] font-medium' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-black/5 bg-re-bg/30 p-4 sm:p-5">
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">Loading…</div>
        ) : (
          <>
            {activeTab === 'valuation' && renderValuation()}
            {activeTab === 'movement' && renderMovement()}
            {activeTab === 'uniform-pl' && renderUniformPL()}
            {activeTab === 'low-stock' && renderLowStock()}
          </>
        )}
      </div>
      </div>
    </StorekeeperPageShell>
  )
}
