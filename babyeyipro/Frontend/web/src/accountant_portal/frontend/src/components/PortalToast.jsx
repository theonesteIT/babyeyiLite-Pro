import { CheckCircle, X, AlertCircle } from 'lucide-react';

export default function PortalToast({ toast, onClose }) {
  if (!toast?.message) return null;
  const isError = String(toast.type || '').toLowerCase() === 'error';

  return (
    <div className="fixed top-5 right-5 z-[500] max-w-sm w-[calc(100%-2.5rem)] sm:w-[360px] animate-in slide-in-from-right fade-in duration-300">
      <div
        className={`rounded-2xl border shadow-xl overflow-hidden ${
          isError
            ? 'bg-white border-amber-200'
            : 'bg-white border-[#000435]/10'
        }`}
      >
        <div className={`h-1 ${isError ? 'bg-amber-400' : 'bg-[#F59E0B]'}`} />
        <div className="px-4 py-3.5 flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isError ? 'bg-amber-50' : 'bg-[#000435]'
            }`}
          >
            {isError ? (
              <AlertCircle size={18} className="text-amber-600" />
            ) : (
              <CheckCircle size={18} className="text-[#F59E0B]" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#F59E0B]">
              {isError ? 'Action required' : 'Success'}
            </p>
            <p className="text-sm font-semibold text-[#000435] mt-0.5 leading-snug">{toast.message}</p>
            {toast.detail && (
              <p className="text-xs text-slate-500 mt-1">{toast.detail}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#000435] transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
