import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Edit2, FileSpreadsheet, FileText, Layers, DollarSign,
  Shirt, TrendingUp, TrendingDown, Minus, Package,
} from 'lucide-react'
import { formatMoney } from '../../utils/formatMoney'
import { buildFabricSheetReport } from '../../utils/fabricSheetReport'
import {
  exportFabricSheetDetailExcel,
  exportFabricSheetDetailPdf,
} from '../../utils/uniformInventoryExport'

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-gray-50 text-sm">
      <span className="text-[#000435]/60 font-medium shrink-0">{label}</span>
      <span className={`font-bold text-right ${highlight || 'text-[#000435]'}`}>{value ?? '—'}</span>
    </div>
  )
}

function ResultBadge({ label, profitLoss }) {
  if (label === 'Income') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">
        <TrendingUp size={12} /> Income
      </span>
    )
  }
  if (label === 'Loss') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600">
        <TrendingDown size={12} /> Loss
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500">
      <Minus size={12} /> {profitLoss === 0 && label === 'Break-even' ? 'Break-even' : 'No sales'}
    </span>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

export default function FabricStockInDetailDrawer({
  receipt,
  stockouts = [],
  finishedGoods = [],
  open,
  onClose,
  onEdit,
}) {
  const report = useMemo(
    () => (receipt ? buildFabricSheetReport(receipt, stockouts, finishedGoods) : null),
    [receipt, stockouts, finishedGoods]
  )

  if (!open || !receipt) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#000435]/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md sm:max-w-lg h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="shrink-0 px-5 py-5 bg-gradient-to-br from-[#000435] to-[#1a2876] text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#FEBF10]">Fabric sheet</p>
                <h2 className="text-lg font-bold mt-0.5">{receipt.fabric_type}</h2>
                <p className="text-[11px] text-white/70 mt-1">
                  {receipt.color || '—'} · {receipt.supplier_name || 'No supplier'}
                </p>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            <section className="rounded-2xl border border-gray-100 p-4 bg-white">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#000435] mb-3 flex items-center gap-2">
                <Layers size={12} className="text-[#FEBF10]" /> Stock movement
              </h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'In', value: `${report.metersIn} m`, color: 'text-emerald-700 bg-emerald-50' },
                  { label: 'Out', value: `${report.metersOut} m`, color: 'text-red-600 bg-red-50' },
                  { label: 'Remain', value: `${report.remaining} m`, color: 'text-amber-700 bg-amber-50' },
                ].map((c) => (
                  <div key={c.label} className={`rounded-xl px-3 py-2.5 text-center ${c.color}`}>
                    <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{c.label}</p>
                    <p className="text-sm font-bold mt-0.5 tabular-nums">{c.value}</p>
                  </div>
                ))}
              </div>
              <InfoRow label="Unit cost / meter" value={`${formatMoney(report.unitCost)} RWF`} />
              <InfoRow label="Total price bought" value={`${formatMoney(report.totalBought)} RWF`} highlight="text-amber-700" />
              <InfoRow label="Fabric cost out" value={`${formatMoney(report.fabricCostOut)} RWF`} />
              <InfoRow label="Purchase date" value={formatDate(receipt.purchase_date)} />
              <InfoRow label="Invoice" value={receipt.invoice_number} />
              <InfoRow label="Academic year / term" value={`${receipt.academic_year || '—'} · ${receipt.term || '—'}`} />
            </section>

            <section className="rounded-2xl border border-gray-100 p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#000435] mb-3 flex items-center gap-2">
                <Shirt size={12} className="text-[#FEBF10]" /> Finished goods on this sheet
              </h3>
              {report.finishedItems.length ? (
                <div className="space-y-2">
                  {report.finishedItems.map((it) => (
                    <div key={`${it.uniform_name}-${it.size}`} className="rounded-xl border border-gray-100 bg-amber-50/30 px-3 py-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#000435]">{it.uniform_name}</p>
                          <p className="text-[10px] text-[#000435]/50">Size {it.size}</p>
                        </div>
                        <span className={`text-[10px] font-bold ${it.profit_loss >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatMoney(it.profit_loss)} RWF
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                        <div>
                          <p className="text-[#000435]/45 uppercase font-bold">Unit price</p>
                          <p className="font-bold text-[#000435]">{formatMoney(it.unit_price)}</p>
                        </div>
                        <div>
                          <p className="text-[#000435]/45 uppercase font-bold">Qty sold</p>
                          <p className="font-bold text-[#000435]">{it.quantity}</p>
                        </div>
                        <div>
                          <p className="text-[#000435]/45 uppercase font-bold">Total sold</p>
                          <p className="font-bold text-emerald-700">{formatMoney(it.total_sold)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#000435]/40">No finished goods linked to this sheet yet.</p>
              )}
            </section>

            {report.stockoutRows.length > 0 && (
              <section className="rounded-2xl border border-gray-100 p-4">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#000435] mb-3 flex items-center gap-2">
                  <Package size={12} className="text-[#FEBF10]" /> Stock out history
                </h3>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {report.stockoutRows.map((s) => (
                    <div key={s.id} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                      <span className="text-[#000435]/70">{formatDate(s.out_date)} · {s.purpose}</span>
                      <span className="font-bold text-red-600">−{s.meters_out} m</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section
              className={`rounded-2xl border p-5 text-center ${
                report.profitLoss > 0
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : report.profitLoss < 0
                    ? 'border-red-200 bg-red-50/50'
                    : 'border-gray-200 bg-gray-50/50'
              }`}
            >
              <p className="text-[10px] font-bold text-[#000435]/50 uppercase tracking-wider flex items-center justify-center gap-1">
                <DollarSign size={12} className="text-[#FEBF10]" /> Profit / loss
              </p>
              <p className="text-[10px] text-[#000435]/45 mt-1">Total sold − Total bought</p>
              <div className="grid grid-cols-2 gap-3 mt-4 text-left">
                <div className="rounded-xl bg-white/80 px-3 py-2 border border-gray-100">
                  <p className="text-[9px] font-bold text-[#000435]/45 uppercase">Total bought</p>
                  <p className="text-sm font-bold text-[#000435]">{formatMoney(report.totalBought)} RWF</p>
                </div>
                <div className="rounded-xl bg-white/80 px-3 py-2 border border-gray-100">
                  <p className="text-[9px] font-bold text-[#000435]/45 uppercase">Total sold</p>
                  <p className="text-sm font-bold text-emerald-700">{formatMoney(report.totalSoldRevenue)} RWF</p>
                </div>
              </div>
              <p
                className={`text-2xl font-bold mt-4 ${
                  report.profitLoss > 0 ? 'text-emerald-600' : report.profitLoss < 0 ? 'text-red-500' : 'text-[#000435]'
                }`}
              >
                {formatMoney(report.profitLoss)} RWF
              </p>
              <div className="mt-3 flex justify-center">
                <ResultBadge label={report.resultLabel} profitLoss={report.profitLoss} />
              </div>
            </section>
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50/80 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => exportFabricSheetDetailExcel(receipt, stockouts, finishedGoods)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase hover:bg-emerald-100"
              >
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button
                type="button"
                onClick={() => exportFabricSheetDetailPdf(receipt, stockouts, finishedGoods)}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[10px] font-bold uppercase hover:bg-red-100"
              >
                <FileText size={14} /> PDF
              </button>
            </div>
            <button
              type="button"
              onClick={() => onEdit?.(receipt)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-400 text-[#000435] text-[10px] font-bold uppercase hover:bg-amber-500"
            >
              <Edit2 size={14} /> Edit receipt
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}
