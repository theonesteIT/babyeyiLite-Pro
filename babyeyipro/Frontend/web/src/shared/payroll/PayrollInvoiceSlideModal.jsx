import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

function getModalRoot() {
  if (typeof document === 'undefined') return null;
  return document.body;
}

/**
 * Right-side slide-over modal shell for payroll invoice details.
 */
export default function PayrollInvoiceSlideModal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const root = getModalRoot();
  if (!root) return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-[#000435]/55 backdrop-blur-[3px] border-0 cursor-default animate-in fade-in duration-200"
        aria-label="Close payroll invoice"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payroll invoice"
        className="relative flex h-full w-full max-w-[min(100vw,460px)] flex-col bg-slate-50 shadow-[-12px_0_40px_rgba(0,4,53,0.18)] animate-in slide-in-from-right duration-300 sm:rounded-l-3xl sm:border-l sm:border-white/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    root,
  );
}
