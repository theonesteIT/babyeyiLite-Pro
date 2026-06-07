import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Loader2, X, HeartPulse, Pencil } from 'lucide-react'
import { ASSET_HEALTH_STATUS_OPTIONS } from '../../../assets_portal/utils/assetsConstants'

const NAVY = '#000435'

function badgeStyle(value) {
  if (value === 'Used') return 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  if (value === 'Not Used (Old)') return 'bg-amber-100 text-amber-900 ring-amber-200'
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

function HealthStatusModal({ open, asset, current, saving, onClose, onSave }) {
  const [selected, setSelected] = useState(current)

  useEffect(() => {
    if (open) setSelected(current)
  }, [open, current])

  if (!open) return null

  const name = asset?.asset_name || asset?.name || 'Asset'
  const code = asset?.asset_code || asset?.code || '—'

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-status-title"
      >
        <div className="flex items-center justify-between px-5 py-4 text-white" style={{ backgroundColor: NAVY }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FEBF10] text-[#000435] flex items-center justify-center shrink-0">
              <HeartPulse size={18} />
            </div>
            <div className="min-w-0">
              <p id="health-status-title" className="text-sm font-bold truncate">Health Status</p>
              <p className="text-[11px] text-white/60 font-mono truncate">{code}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Asset</p>
            <p className="text-sm font-semibold text-[#000435]">{name}</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Select status</p>
            <div className="space-y-2">
              {ASSET_HEALTH_STATUS_OPTIONS.map((o) => {
                const active = selected === o.value
                return (
                  <label
                    key={o.value}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                      active
                        ? 'border-[#FEBF10] bg-amber-50/80 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="asset-health-status"
                      value={o.value}
                      checked={active}
                      onChange={() => setSelected(o.value)}
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        active ? 'border-[#FEBF10]' : 'border-slate-300'
                      }`}
                    >
                      {active && <span className="w-2 h-2 rounded-full bg-[#FEBF10]" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-[#000435]">{o.label}</span>
                      <span className="block text-[11px] text-slate-500">{o.group}</span>
                    </span>
                    <AssetHealthStatusBadge value={o.value} />
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(selected)}
              disabled={saving || !selected}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-[#000435] bg-[#FEBF10] hover:bg-[#FFD24D] disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AssetHealthStatusMenu({ asset, onStatusChange, onEdit, updating }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [healthOpen, setHealthOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const menuRef = useRef(null)
  const current = asset?.asset_health_status || asset?.assetHealthStatus || 'Used'

  useEffect(() => {
    if (!menuOpen) return undefined
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const handleHealthSave = async (value) => {
    if (value === current) {
      setHealthOpen(false)
      return
    }
    setSaving(true)
    try {
      await onStatusChange?.(asset, value)
      setHealthOpen(false)
    } catch {
      /* parent shows error */
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || updating

  return (
    <>
      <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-black/5 text-slate-500"
          aria-label="Asset actions"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <MoreVertical size={16} />}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1 text-left">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                onEdit?.(asset)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#000435] hover:bg-slate-50"
            >
              <Pencil size={14} className="text-[#FEBF10]" />
              Edit asset
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setHealthOpen(true)
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#000435] hover:bg-slate-50"
            >
              <HeartPulse size={14} className="text-emerald-600" />
              Health status
            </button>
          </div>
        )}
      </div>

      <HealthStatusModal
        open={healthOpen}
        asset={asset}
        current={current}
        saving={busy}
        onClose={() => !busy && setHealthOpen(false)}
        onSave={handleHealthSave}
      />
    </>
  )
}

export function AssetHealthStatusBadge({ value }) {
  const label = value || 'Used'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${badgeStyle(label)}`}>
      {label}
    </span>
  )
}
