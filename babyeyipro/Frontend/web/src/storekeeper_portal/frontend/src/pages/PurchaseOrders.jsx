import { useState, useEffect, useCallback } from 'react'
import { Plus, Download, ShoppingCart } from 'lucide-react'
import StorekeeperPageShell from '../components/StorekeeperPageShell'
import { fetchInventory, createInventoryItem } from '../services/inventoryService'
import { fetchSuppliers } from '../services/suppliersService'
import { formatMoney } from '../utils/formatMoney'

export default function PurchaseOrders() {
  const [showModal, setShowModal] = useState(false)
  const [inventory, setInventory] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'Other', quantity: '', unit_cost: '', unit: 'pcs' })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [inv, sup] = await Promise.all([
        fetchInventory(),
        fetchSuppliers(),
      ])
      setInventory(inv.data)
      setSuppliers(sup)
    } catch (_) { /* use empty */ }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const pendingCount = inventory.filter(i => i.quantity < i.reorder_level).length
  const totalValue = inventory.reduce((s, i) => s + i.quantity * (i.unit_cost || 0), 0)

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await createInventoryItem(form)
      setShowModal(false)
      setForm({ name: '', category: 'Other', quantity: '', unit_cost: '', unit: 'pcs' })
      await loadData()
    } catch (_) { /* ignore */ }
    setSaving(false)
  }

  return (
    <StorekeeperPageShell
      titleLine="Purchase Orders"
      subtitle="Create and manage inventory items"
      icon={ShoppingCart}
      rightSlot={
        <>
          <button
            type="button"
            onClick={() => {
              const rows = inventory.map(i => [i.name, i.category, i.quantity, i.unit_cost])
              const csv = [['Item', 'Category', 'Qty', 'Unit Cost'], ...rows].map(r => r.join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`
              document.body.appendChild(a); a.click()
              document.body.removeChild(a); URL.revokeObjectURL(url)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-white/15 transition-all"
          >
            <Download size={14} /> Export
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all active:scale-95"
          >
            <Plus size={14} /> New Item
          </button>
        </>
      }
    >
      <div className="store-panel-sheet p-4 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase">Total Items</p>
          <p className="text-2xl font-light text-[#000435] mt-2">{inventory.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase">Need Restock</p>
          <p className="text-2xl font-light text-amber-500 mt-2">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase">Suppliers</p>
          <p className="text-2xl font-light text-blue-500 mt-2">{suppliers.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs text-gray-400 uppercase">Total Value</p>
          <p className="text-2xl font-light text-[#000435] mt-2">{formatMoney(totalValue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium uppercase">Item</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium uppercase">Category</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-medium uppercase">Qty</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-medium uppercase">Unit Cost</th>
                <th className="text-right py-3 px-4 text-xs text-gray-400 font-medium uppercase">Total</th>
                <th className="text-center py-3 px-4 text-xs text-gray-400 font-medium uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">Loading…</td></tr>
              ) : inventory.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No items yet</td></tr>
              ) : (
                inventory.map((o, i) => {
                  const status = o.quantity < o.reorder_level ? 'Low Stock' : 'In Stock'
                  return (
                    <tr key={o.id || i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-medium text-[#000435]">{o.name}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{o.category}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{o.quantity} {o.unit}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{o.unit_cost ? formatMoney(o.unit_cost) : '—'}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatMoney(o.quantity * (o.unit_cost || 0))}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status === 'In Stock' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{status}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <>
          <div className="fixed inset-0 bg-[#000435]/60 backdrop-blur-sm z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-10 overflow-y-auto pointer-events-none">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 pointer-events-auto overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-50/50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#000435]">New Inventory Item</h2>
                    <p className="text-[11px] font-medium text-gray-400">Add to school inventory</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                    <Plus size={16} className="rotate-45 text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Item Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Printer Paper" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none" /></div>
                <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none">
                    <option>Uniform</option><option>Food</option><option>Stationery</option><option>Cleaning</option><option>Laboratory</option><option>Sports</option><option>Other</option>
                  </select></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Quantity</label>
                    <input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none" /></div>
                  <div><label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Unit Cost</label>
                    <input type="number" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-[#000435] focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none" /></div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setShowModal(false)} className="px-5 py-2.5 text-[11px] font-bold text-gray-500 hover:bg-white rounded-xl uppercase tracking-wider">Cancel</button>
                  <button onClick={handleCreate} disabled={saving || !form.name.trim()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold text-white bg-[#000435] hover:bg-[#0a116b] rounded-xl uppercase tracking-wider disabled:opacity-50">
                    {saving ? 'Saving…' : 'Create Item'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
      </div>
    </StorekeeperPageShell>
  )
}
