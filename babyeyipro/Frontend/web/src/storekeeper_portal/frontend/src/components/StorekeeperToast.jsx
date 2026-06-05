import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

/**
 * Fixed top-right toast for storekeeper portal actions.
 * @param {{ message: string, type?: 'success'|'error', onDismiss: () => void }} props
 */
export default function StorekeeperToast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    if (!message) return undefined
    const t = setTimeout(onDismiss, 4500)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (typeof document === 'undefined') return null

  const isSuccess = type === 'success'

  return createPortal(
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          initial={{ opacity: 0, x: 48, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 32, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          className="fixed top-20 right-4 sm:right-6 z-[200] max-w-[min(100vw-2rem,22rem)] pointer-events-auto"
        >
          <div
            className={`flex items-start gap-3 rounded-2xl border shadow-2xl px-4 py-3.5 backdrop-blur-md ${
              isSuccess
                ? 'bg-white/95 border-emerald-200/80'
                : 'bg-white/95 border-red-200/80'
            }`}
          >
            <div
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}
            >
              {isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            </div>
            <p className={`text-sm font-semibold leading-snug pt-1.5 ${isSuccess ? 'text-[#000435]' : 'text-red-800'}`}>
              {message}
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
