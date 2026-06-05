import { Calendar, ChevronRight } from 'lucide-react'
import { currentRegisterYear, registerYearOptions } from '../../../assets_portal/utils/assetFormMapper'

export default function RegisterYearPickStep({
  value,
  onChange,
  onContinue,
  continueLabel = 'Continue',
  title = 'Choose Asset Register Year',
  subtitle = 'Calendar year for this register — not the academic year. Duplicates are checked within the same register year only.',
  disabled = false,
  extraYears = [],
  footerNote,
}) {
  const years = [...new Set([...registerYearOptions(), ...extraYears.map(Number)])].sort((a, b) => b - a)

  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 min-h-[320px]">
      <div className="w-16 h-16 rounded-2xl bg-[#000435] flex items-center justify-center mb-6 shadow-lg">
        <Calendar size={28} className="text-[#FEBF10]" />
      </div>
      <h3 className="text-xl font-bold text-[#000435] text-center">{title}</h3>
      <p className="text-sm text-re-text-muted text-center max-w-md mt-2 mb-8">{subtitle}</p>

      <label className="text-xs font-bold uppercase tracking-wider text-[#000435]/70 mb-2 w-full max-w-xs">
        Register year *
      </label>
      <select
        value={value || String(currentRegisterYear())}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className="w-full max-w-xs rounded-xl border border-black/10 bg-white px-4 py-3 text-lg font-bold text-[#000435] shadow-sm"
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {footerNote && (
        <p className="text-xs text-re-text-muted text-center max-w-md mt-4">{footerNote}</p>
      )}

      <button
        type="button"
        onClick={onContinue}
        disabled={disabled || !value}
        className="mt-8 inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-[#FEBF10] text-[#0B1530] text-sm font-bold shadow-sm hover:bg-[#FFD24D] disabled:opacity-50"
      >
        {continueLabel} <ChevronRight size={18} />
      </button>
    </div>
  )
}
