import { CheckCircle2, CircleX, Info, X } from 'lucide-react'

const STYLES = {
  success: {
    wrap: 'border-emerald-200 bg-white text-emerald-900 shadow-emerald-100/80',
    icon: 'text-emerald-500',
    Icon: CheckCircle2,
  },
  info: {
    wrap: 'border-amber-200 bg-white text-amber-950 shadow-amber-100/80',
    icon: 'text-amber-500',
    Icon: Info,
  },
  error: {
    wrap: 'border-red-200 bg-white text-red-900 shadow-red-100/80',
    icon: 'text-red-500',
    Icon: CircleX,
  },
}

export default function AssetToastStack({ toast, onDismiss }) {
  if (!toast?.msg) return null

  const cfg = STYLES[toast.type] || STYLES.error
  const { Icon } = cfg

  return (
    <>
      <style>{`@keyframes assetToastSlideIn{from{transform:translateX(calc(100% + 1rem));opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-4 right-4 z-[250] flex items-start gap-3 max-w-md min-w-[280px] rounded-2xl border px-4 py-3.5 shadow-lg ${cfg.wrap}`}
        style={{ animation: 'assetToastSlideIn 0.32s ease-out', fontFamily: "'Montserrat', sans-serif" }}
      >
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.icon}`} strokeWidth={2.25} aria-hidden />
        <p className="text-[13px] font-semibold leading-snug flex-1 pr-1">{toast.msg}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Dismiss notification"
        >
          <X size={16} strokeWidth={2.25} />
        </button>
      </div>
    </>
  )
}
