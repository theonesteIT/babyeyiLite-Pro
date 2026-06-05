import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function AssetSlideDrawer({ open, onClose, children, side = 'right', widthClass = 'max-w-[min(100vw,540px)]' }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const isRight = side === 'right'

  return createPortal(
    <div className={`fixed inset-0 z-[250] flex ${isRight ? 'justify-end' : 'justify-start'}`} role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-[#000435]/50 backdrop-blur-[2px] border-0 cursor-default"
        aria-label="Close panel"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex h-full w-full ${widthClass} flex-col bg-white shadow-[-16px_0_48px_rgba(0,4,53,0.2)] overflow-hidden ${
          isRight ? 'animate-in slide-in-from-right duration-300 rounded-l-2xl' : 'animate-in slide-in-from-left duration-300 rounded-r-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
