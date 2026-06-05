import { Download, FileSpreadsheet } from 'lucide-react'

const NAVY = '#000435'
const GOLD = '#FEBF10'

export default function ExportExcelButton({ onClick, disabled, count = 0, label = 'Export Excel' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative inline-flex items-center gap-2.5 rounded-xl border border-[#000435]/10 bg-gradient-to-r from-white to-[#FEBF10]/10 px-4 py-2.5 text-sm font-bold shadow-sm transition-all hover:border-[#FEBF10] hover:shadow-md hover:shadow-amber-500/15 disabled:opacity-45 disabled:pointer-events-none"
      style={{ color: NAVY, fontFamily: "'Montserrat', sans-serif" }}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors group-hover:bg-[#000435]"
        style={{ backgroundColor: `${GOLD}44` }}
      >
        <FileSpreadsheet
          size={16}
          className="transition-colors group-hover:text-[#FEBF10]"
          style={{ color: NAVY }}
        />
      </span>
      <span className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        {count > 0 && (
          <span className="text-[10px] font-semibold text-gray-500">{count} record{count === 1 ? '' : 's'}</span>
        )}
      </span>
      <Download size={15} className="ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
