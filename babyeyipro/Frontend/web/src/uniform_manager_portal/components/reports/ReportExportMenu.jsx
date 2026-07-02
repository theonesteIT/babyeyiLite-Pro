import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Download, Printer, FileSpreadsheet, FileText, ChevronDown, Loader2,
} from 'lucide-react'
import { HrBtnOutline, HrBtnPrimary } from '../uniformUi'

export default function ReportExportMenu({
  onExportExcel,
  onExportCsv,
  onExportPdf,
  onPrint,
  disabled = false,
  exporting = false,
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 288 })
  const ref = useRef(null)
  const triggerRef = useRef(null)

  const items = [
    onExportExcel && { id: 'excel', label: 'Export Excel', desc: 'Spreadsheet with school header', icon: FileSpreadsheet, action: onExportExcel, primary: true },
    onExportPdf && { id: 'pdf', label: 'Export PDF', desc: 'Branded PDF with logo & signatures', icon: FileText, action: onExportPdf },
    onExportCsv && { id: 'csv', label: 'Export CSV', desc: 'Raw data for analysis', icon: Download, action: onExportCsv },
    onPrint && { id: 'print', label: 'Print report', desc: 'Print-friendly layout', icon: Printer, action: onPrint },
  ].filter(Boolean)

  const updateMenuPos = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const menuW = 288
    let left = rect.right - menuW
    left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8))
    setMenuPos({
      top: rect.bottom + 8,
      left,
      width: menuW,
    })
  }, [])

  useEffect(() => {
    if (!open) return undefined
    updateMenuPos()
    const onScroll = () => updateMenuPos()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, updateMenuPos])

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => {
      if (ref.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const run = async (item) => {
    setOpen(false)
    if (item.action) await item.action()
  }

  const menu = open && items.length > 0 ? createPortal(
    <div
      ref={ref}
      className="fixed rounded-2xl border border-gray-100 bg-white shadow-xl shadow-black/15 z-[9999] overflow-hidden"
      style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
      role="menu"
    >
      <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-[#000435]/5 to-[#FEBF10]/10">
        <p className="text-xs font-bold text-[#000435] uppercase tracking-wider">Export options</p>
        <p className="text-[11px] text-gray-400 mt-0.5">School logo & details included</p>
      </div>
      <div className="p-2 max-h-[min(320px,70vh)] overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => run(item)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                item.primary ? 'hover:bg-[#FEBF10]/15' : 'hover:bg-gray-50'
              }`}
            >
              <span className={`mt-0.5 p-2 rounded-lg shrink-0 ${item.primary ? 'bg-[#FEBF10]/20 text-[#000435]' : 'bg-gray-100 text-gray-600'}`}>
                <Icon size={15} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-[#000435]">{item.label}</span>
                <span className="block text-[11px] text-gray-400 mt-0.5">{item.desc}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <div className="relative flex flex-wrap gap-2">
        {onPrint && (
          <HrBtnOutline onClick={onPrint} disabled={disabled || exporting}>
            <Printer size={14} />
            Print
          </HrBtnOutline>
        )}

        {items.length > 0 && (
          <div className="relative" ref={triggerRef}>
            <HrBtnPrimary
              onClick={() => setOpen((o) => !o)}
              disabled={disabled || exporting}
              className="min-w-[140px]"
              aria-expanded={open}
              aria-haspopup="menu"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {exporting ? 'Exporting…' : 'Export'}
              {!exporting && <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
            </HrBtnPrimary>
          </div>
        )}
      </div>
      {menu}
    </>
  )
}
