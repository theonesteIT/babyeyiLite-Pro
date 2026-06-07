import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  MoreVertical, Loader2, Eye, Pencil, Trash2, Printer,
  CheckCircle2, XCircle, FileDown,
} from 'lucide-react'

const NAVY = '#000435'
const MENU_W = 240

function MenuItem({ icon: Icon, label, onClick, tone = 'default', disabled, loading, description }) {
  const tones = {
    default: 'text-slate-700 hover:bg-slate-50',
    approve: 'text-emerald-800 hover:bg-emerald-50',
    reject: 'text-red-700 hover:bg-red-50',
    danger: 'text-red-700 hover:bg-red-50',
    muted: 'text-slate-600 hover:bg-slate-50',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full flex items-start gap-3 px-3.5 py-2.5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone] || tones.default}`}
    >
      <span className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold leading-tight">{label}</span>
        {description && (
          <span className="block text-[10px] text-slate-400 mt-0.5 leading-snug">{description}</span>
        )}
      </span>
    </button>
  )
}

function useMenuPosition(open, triggerRef, menuRef) {
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' })

  const update = useCallback(() => {
    const trigger = triggerRef.current
    const menu = menuRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const menuH = menu?.offsetHeight || 320
    const gap = 6
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = rect.right - MENU_W
    left = Math.max(8, Math.min(left, vw - MENU_W - 8))

    const spaceBelow = vh - rect.bottom - gap
    const spaceAbove = rect.top - gap
    let top
    let placement = 'bottom'

    if (spaceBelow >= menuH || spaceBelow >= spaceAbove) {
      top = rect.bottom + gap
      placement = 'bottom'
    } else {
      top = rect.top - menuH - gap
      placement = 'top'
    }
    top = Math.max(8, Math.min(top, vh - menuH - 8))

    setPos({ top, left, placement })
  }, [triggerRef, menuRef])

  useLayoutEffect(() => {
    if (!open) return undefined
    update()
    const menu = menuRef.current
    const ro = menu ? new ResizeObserver(update) : null
    if (menu && ro) ro.observe(menu)
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, update, menuRef])

  return pos
}

export default function ReplacementActionsMenu({
  row,
  busy,
  onView,
  onEdit,
  onApprove,
  onReject,
  onPrint,
  onDelete,
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const isPending = row?.status === 'Pending'
  const isCompleted = row?.status === 'Completed'
  const code = row?.replacement_id || row?.replacement_code || '—'

  const { top, left, placement } = useMenuPosition(open, triggerRef, menuRef)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    const onPointer = (e) => {
      const t = triggerRef.current
      const m = menuRef.current
      if (t?.contains(e.target) || m?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  const run = (fn) => {
    setOpen(false)
    fn?.(row)
  }

  const menu = open ? createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[300] rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-300/40 overflow-hidden"
      style={{
        top,
        left,
        width: MENU_W,
        animation: 'replacementMenuIn 0.15s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-4 py-3 text-white" style={{ background: NAVY }}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Replacement</p>
        <p className="text-sm font-bold font-mono mt-0.5 truncate">{code}</p>
        <span className={`inline-flex mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold ${
          row?.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-200'
            : row?.status === 'Rejected' ? 'bg-red-500/20 text-red-200'
              : 'bg-amber-500/20 text-amber-100'
        }`}>
          {row?.status || 'Pending'}
        </span>
      </div>

      <div className="py-1.5 max-h-[min(70vh,420px)] overflow-y-auto">
        <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">General</p>
        <MenuItem icon={Eye} label="View details" description="Open full replacement record"
          onClick={() => run(onView)} />
        <MenuItem icon={Pencil} label="Edit" description="Update dates, notes & approval"
          onClick={() => run(onEdit)} />

        {isPending && (
          <>
            <div className="my-1.5 border-t border-slate-100" />
            <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Approval</p>
            <MenuItem icon={CheckCircle2} label="Approve" tone="approve" loading={busy}
              description="Complete & register new asset"
              onClick={() => run(onApprove)} />
            <MenuItem icon={XCircle} label="Reject" tone="reject" loading={busy}
              description="Decline this request"
              onClick={() => run(onReject)} />
          </>
        )}

        <div className="my-1.5 border-t border-slate-100" />
        <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Export</p>
        <MenuItem icon={Printer} label="Print" tone="muted" onClick={() => run(onPrint)} />
        <MenuItem icon={FileDown} label="Export PDF" tone="muted" onClick={() => run(onPrint)} />

        {!isCompleted && (
          <>
            <div className="my-1.5 border-t border-slate-100" />
            <MenuItem icon={Trash2} label="Delete" tone="danger" loading={busy}
              description="Pending records only"
              onClick={() => run(onDelete)} />
          </>
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/80 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-white"
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <style>{`
        @keyframes replacementMenuIn {
          from { opacity: 0; transform: translateY(${placement === 'bottom' ? '-4px' : '4px'}) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          aria-expanded={open}
          aria-haspopup="menu"
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${
            open
              ? 'border-amber-300 bg-amber-50 text-amber-800 shadow-sm'
              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700'
          }`}
          aria-label="Replacement actions"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={18} />}
        </button>
      </div>
      {menu}
    </>
  )
}
