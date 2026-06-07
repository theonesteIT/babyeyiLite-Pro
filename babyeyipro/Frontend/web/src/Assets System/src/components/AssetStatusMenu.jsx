import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Loader2 } from 'lucide-react'
import { ASSETS_STATUS_IN_USE, ASSETS_STATUS_NOT_USED } from '../../../assets_portal/utils/assetsConstants'

function statusBadgeStyle(value) {
  const inUse = ASSETS_STATUS_IN_USE.some((o) => o.value === value)
  if (inUse) return 'bg-emerald-100 text-emerald-800'
  if (value) return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-600'
}

export default function AssetStatusMenu({ asset, onStatusChange, updating }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = asset?.assets_status || 'Active'

  useEffect(() => {
    if (!open) return undefined
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pick = (value) => {
    setOpen(false)
    if (value !== current) onStatusChange?.(asset, value)
  }

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 text-slate-500"
        aria-label="Set asset status"
      >
        {updating ? <Loader2 size={14} className="animate-spin" /> : <MoreVertical size={16} />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-left">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">In Use</p>
          {ASSETS_STATUS_IN_USE.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${current === o.value ? 'font-bold bg-emerald-50' : ''}`}
            >
              {o.label}
            </button>
          ))}
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 border-t border-slate-100 mt-1">Not Used</p>
          {ASSETS_STATUS_NOT_USED.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${current === o.value ? 'font-bold bg-amber-50' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AssetStatusBadge({ value }) {
  const label = value || '—'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadgeStyle(value)}`}>
      {label}
    </span>
  )
}
