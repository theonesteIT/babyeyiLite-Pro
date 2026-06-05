import { motion } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'

export const modalInputClass =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-[#000435] bg-gray-50/80 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all'

export function ModalField({ icon: Icon, label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
        {Icon && <Icon size={12} className="text-amber-500 shrink-0" />}
        {label}
      </label>
      {children}
    </div>
  )
}

export function UniformModalBackdrop({ onClose, className = 'z-[70]' }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 bg-[#000435]/60 backdrop-blur-md ${className}`}
      onClick={onClose}
    />
  )
}

/** Navy gradient header — matches Configure uniform slot modal */
export function UniformModalHeader({
  eyebrow = 'Configure uniform',
  title,
  subtitle,
  badge,
  icon: Icon,
  onClose,
}) {
  return (
    <div className="relative px-5 sm:px-6 pt-5 pb-5 bg-gradient-to-br from-[#000435] via-[#0d1654] to-[#1a2876] text-white shrink-0">
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#FEBF10]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="relative flex justify-between items-start gap-3">
        <div className="flex gap-3 min-w-0">
          {Icon && (
            <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <Icon size={20} className="text-[#FEBF10]" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#FEBF10]/90 flex items-center gap-1">
              <Sparkles size={10} /> {eyebrow}
            </p>
            <h3 className="text-lg font-bold mt-0.5 truncate">{title}</h3>
            {subtitle && <p className="text-[11px] text-white/65 mt-1">{subtitle}</p>}
            {badge && (
              <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-bold">
                {badge}
              </span>
            )}
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center shrink-0 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

export function UniformModalFooter({ onCancel, onPrimary, primaryLabel, primaryDisabled, primaryLoading, cancelLabel = 'Cancel' }) {
  return (
    <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled || primaryLoading}
        className="flex-1 py-3 rounded-xl bg-[#000435] text-white text-xs font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 disabled:opacity-45 shadow-lg shadow-[#000435]/25 hover:bg-[#0a116b] transition-colors"
      >
        {primaryLoading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : null}
        {primaryLabel}
      </button>
    </div>
  )
}
