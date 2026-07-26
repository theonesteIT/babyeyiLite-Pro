import { Download, FileText, FileSpreadsheet, Printer, RefreshCw } from 'lucide-react'

/**
 * Consistent export / refresh actions for storekeeper portal pages.
 * variant="hero" — light buttons on ochre hero; "panel" — on white sheets.
 */
export default function StoreExportBar({
  variant = 'panel',
  onRefresh,
  onExportCsv,
  onExportPdf,
  onExportExcel,
  onPrint,
  loading = false,
  disabled = false,
  className = '',
}) {
  const isHero = variant === 'hero'

  const base = isHero
    ? 'inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50'
    : 'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50'

  const ghost = isHero
    ? `${base} border border-white/20 bg-white/10 text-white hover:bg-white/15`
    : `${base} border border-gray-200 bg-white text-gray-600 hover:bg-gray-50`

  const primary = isHero
    ? `${base} bg-[#FEBF10] text-[#000435] hover:bg-amber-300 shadow-lg shadow-amber-400/25`
    : `${base} bg-[#000435] text-[#FEBF10] hover:bg-[#0a116b]`

  const actions = [
    onRefresh && { key: 'refresh', label: 'Refresh', icon: RefreshCw, onClick: onRefresh, cls: ghost, spin: loading },
    onExportCsv && { key: 'csv', label: 'CSV', icon: Download, onClick: onExportCsv, cls: ghost },
    onExportExcel && { key: 'xlsx', label: 'Excel', icon: FileSpreadsheet, onClick: onExportExcel, cls: ghost },
    onExportPdf && { key: 'pdf', label: 'PDF', icon: FileText, onClick: onExportPdf, cls: primary },
    onPrint && { key: 'print', label: 'Print', icon: Printer, onClick: onPrint, cls: ghost },
  ].filter(Boolean)

  if (!actions.length) return null

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {actions.map((a) => {
        const Icon = a.icon
        return (
          <button
            key={a.key}
            type="button"
            onClick={a.onClick}
            disabled={disabled || (a.spin && loading)}
            className={a.cls}
          >
            <Icon size={13} strokeWidth={1.75} className={a.spin && loading ? 'animate-spin' : ''} />
            {a.label}
          </button>
        )
      })}
    </div>
  )
}
