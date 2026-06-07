import { useRef, useMemo } from 'react'
import {
  X, Eye, Printer, FileDown, ArrowRight, Calendar, User, Hash,
  Banknote, FileText, Shield, Tag, Clock, CheckCircle2,
} from 'lucide-react'
import { formatRwfPlain } from '../../../assets_portal/utils/financialYearUtils'
import { formatDateModern, formatDateRange } from '../../../assets_portal/utils/assetsDateUtils'

const NAVY = '#000435'
const GOLD = '#FEBF10'
const FONT = "'Montserrat', sans-serif"

function fmtMoney(v) {
  if (v == null || v === '') return '—'
  return formatRwfPlain(v)
}

function fmtMoneyRow(v) {
  const formatted = fmtMoney(v)
  return formatted === '—' ? '—' : `RWF ${formatted}`
}

function statusStyle(status) {
  const map = {
    Pending: 'bg-amber-400/20 text-amber-100 border-amber-400/30',
    Completed: 'bg-emerald-400/20 text-emerald-100 border-emerald-400/30',
    Rejected: 'bg-red-400/20 text-red-100 border-red-400/30',
  }
  return map[status] || 'bg-white/10 text-white/80 border-white/20'
}

const EVENT_LABELS = {
  replacement_approved: 'Replacement approved',
  replacement_completed: 'Replacement completed',
  replacement_rejected: 'Replacement rejected',
  replacement_created: 'Replacement created',
  note: 'Note',
}

function parseAuditLog(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object') return [raw]
  if (typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return [{ at: null, event: 'note', details: raw }]
  }
}

function formatAuditDateTime(iso) {
  if (!iso) return '—'
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return '—'
  const date = formatDateModern(iso)
  const time = dt.toLocaleTimeString('en-RW', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}

function formatEventLabel(event) {
  if (!event) return 'Activity'
  return EVENT_LABELS[event] || String(event).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatAuditDetails(entry) {
  const parts = []
  if (entry.old_asset_code && entry.new_asset_code) {
    parts.push({ label: 'Assets', value: `${entry.old_asset_code} → ${entry.new_asset_code}` })
  } else if (entry.old_asset_code) {
    parts.push({ label: 'Old asset', value: entry.old_asset_code })
  } else if (entry.new_asset_code) {
    parts.push({ label: 'New asset', value: entry.new_asset_code })
  }
  if (entry.reason) parts.push({ label: 'Reason', value: entry.reason })
  if (entry.approved_by) parts.push({ label: 'Approved by', value: entry.approved_by })
  if (entry.assignment_transferred != null) {
    parts.push({
      label: 'Assignment transferred',
      value: entry.assignment_transferred ? 'Yes' : 'No',
    })
  }
  if (entry.notes) parts.push({ label: 'Notes', value: entry.notes })
  if (entry.details && typeof entry.details === 'string') {
    parts.push({ label: 'Details', value: entry.details })
  }
  return parts
}

export default function ViewReplacementModal({ open, onClose, replacement }) {
  const printRef = useRef(null)

  const auditEntries = useMemo(
    () => parseAuditLog(replacement?.audit_log).sort((a, b) => {
      const ta = a?.at ? new Date(a.at).getTime() : 0
      const tb = b?.at ? new Date(b.at).getTime() : 0
      return tb - ta
    }),
    [replacement?.audit_log],
  )

  const financialRows = useMemo(() => [
    { label: 'Replacement purchase cost', value: fmtMoneyRow(replacement?.replacement_cost) },
    { label: 'Old net book value', value: fmtMoneyRow(replacement?.old_net_book_value) },
    { label: 'Difference cost', value: fmtMoneyRow(replacement?.cost_difference) },
  ], [replacement])

  if (!open || !replacement) return null

  const code = replacement.replacement_code || replacement.replacement_id

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Replacement ${code}</title>
      <style>body{font-family:Montserrat,sans-serif;padding:32px;color:#0B1530}h1{font-size:20px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{border:1px solid #e5e7eb;padding:8px;font-size:12px}th{background:#f9fafb}</style></head><body>`)
    w.document.write(`<h1>Replacement ${code}</h1>`)
    w.document.write(content.innerHTML)
    w.document.write('</body></html>')
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm" style={{ fontFamily: FONT }}>
      <div className="relative flex flex-col w-full max-w-3xl max-h-[min(92vh,900px)] bg-[#F4F6FA] rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 py-5 text-white" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a237e 100%)` }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: GOLD }}>
                <Eye size={20} style={{ color: NAVY }} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight">Replacement Details</h2>
                <p className="text-sm font-mono text-white/70 mt-0.5 truncate">{code}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 shrink-0" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusStyle(replacement.status)}`}>
              {replacement.status}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-medium text-white/90">
              <Calendar size={12} /> {formatDateModern(replacement.replacement_date || replacement.date) || '—'}
            </span>
            {replacement.approved_by && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-medium text-white/90">
                <User size={12} /> {replacement.approved_by}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div ref={printRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Asset flow */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-stretch">
            <AssetCard
              variant="old"
              label="Old asset"
              name={replacement.old_asset_name || replacement.old_asset}
              code={replacement.old_asset_code}
              tag={replacement.old_label_tag}
              status={replacement.old_status}
            />
            <div className="hidden md:flex flex-col items-center justify-center px-1">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <ArrowRight size={20} className="text-amber-600" />
              </div>
            </div>
            <div className="md:hidden flex justify-center py-1">
              <ArrowRight size={20} className="text-amber-500 rotate-90" />
            </div>
            <AssetCard
              variant="new"
              label="New asset"
              name={replacement.new_asset_name || replacement.new_asset}
              code={replacement.new_asset_code}
              tag={replacement.new_label_tag}
              status={replacement.new_status}
            />
          </div>

          {/* Financial summary */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <SectionHead icon={Banknote} title="Financial summary" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Description</th>
                    <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialRows.map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">{row.label}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Details grid */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <SectionHead icon={Tag} title="Replacement info" />
            <div className="p-4 grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <Detail label="Category" value={replacement.category} />
              <Detail label="Reason" value={replacement.reason} />
              <Detail label="Approval role" value={replacement.approval_role || replacement.approvalRole} />
              <Detail label="Invoice reference" value={replacement.invoice_reference} />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <SectionHead icon={FileText} title="Financial references (new asset)" />
            <div className="p-4 grid sm:grid-cols-3 gap-4">
              <Detail label="SD Number" value={replacement.sd_number} mono />
              <Detail label="Receipt Number" value={replacement.receipt_number} mono />
              <Detail label="Reference No" value={replacement.reference_no} mono />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <SectionHead icon={Shield} title="Warranty" />
            <div className="p-4">
              <Detail label="Coverage period" value={formatDateRange(replacement.warranty_start, replacement.warranty_end) || '—'} />
            </div>
          </section>

          {replacement.notes && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Notes</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{replacement.notes}</p>
            </section>
          )}

          {auditEntries.length > 0 && (
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <SectionHead icon={Hash} title="Audit log" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[150px]">Date & time</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[160px]">Activity</th>
                      <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditEntries.map((entry, idx) => {
                      const details = formatAuditDetails(entry)
                      return (
                        <tr key={`${entry.at}-${entry.event}-${idx}`} className="hover:bg-slate-50/50 align-top">
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5">
                              <Clock size={13} className="text-slate-400 shrink-0" />
                              {formatAuditDateTime(entry.at)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-100">
                              <CheckCircle2 size={12} />
                              {formatEventLabel(entry.event)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {details.length ? (
                              <dl className="space-y-1.5">
                                {details.map((d) => (
                                  <div key={d.label} className="flex flex-wrap gap-x-2 gap-y-0.5">
                                    <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400 shrink-0">{d.label}</dt>
                                    <dd className="text-sm font-medium text-slate-800">{d.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 bg-white border-t border-slate-100 px-6 py-4 flex flex-wrap gap-2 justify-end">
          <button type="button" onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50">
            <Printer size={16} /> Print
          </button>
          <button type="button" onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50">
            <FileDown size={16} /> Export PDF
          </button>
          <button type="button" onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#0B1530]"
            style={{ background: GOLD }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionHead({ icon: Icon, title }) {
  return (
    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
      <Icon size={14} className="text-amber-600" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">{title}</h3>
    </div>
  )
}

function AssetCard({ variant, label, name, code, tag, status }) {
  const isOld = variant === 'old'
  return (
    <div className={`rounded-2xl border-2 p-4 ${isOld ? 'bg-red-50/80 border-red-200/80' : 'bg-emerald-50/80 border-emerald-200/80'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-base font-bold mt-1 leading-snug" style={{ color: NAVY }}>{name || '—'}</p>
      <p className="text-xs font-mono text-slate-500 mt-2">{code || '—'}</p>
      {tag && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{tag}</p>}
      {status && (
        <span className={`inline-flex mt-3 px-2 py-0.5 rounded-md text-[10px] font-bold ${isOld ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
          {status}
        </span>
      )}
    </div>
  )
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`text-sm font-semibold text-slate-800 mt-1 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  )
}
