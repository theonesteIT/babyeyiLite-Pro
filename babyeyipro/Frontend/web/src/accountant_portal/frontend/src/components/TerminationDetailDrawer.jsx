import { useEffect } from 'react';
import { X } from 'lucide-react';
import TerminationDetailPanel from './TerminationDetailPanel';

/** Right-side slide-over drawer for termination record details. */
export default function TerminationDetailDrawer({
  open,
  record,
  onClose,
  variant = 'accountant',
  onEdit,
  onRecordPayment,
  onApprove,
  onReject,
  busy = '',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-[#000435]/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div
        className="relative h-full w-full max-w-md sm:max-w-lg lg:max-w-xl bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-white/90 border border-black/[0.06] text-[#000435]/70 hover:text-[#000435] shadow-sm"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <TerminationDetailPanel
          record={record}
          variant={variant}
          drawerMode
          onClose={onClose}
          onEdit={onEdit}
          onRecordPayment={onRecordPayment}
          onApprove={onApprove}
          onReject={onReject}
          busy={busy}
        />
      </div>
    </div>
  );
}
