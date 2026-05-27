import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, Upload, X } from 'lucide-react';

const inputBase =
  'w-full min-h-[44px] rounded-lg border border-[#000435]/12 bg-white px-3 pt-5 pb-2 text-[13px] font-normal text-[#000435] outline-none transition-colors placeholder:text-[#000435]/35 focus:border-[#F59E0B]/55';

function FieldLabel({ children }) {
  return (
    <span className="absolute left-3 top-2 z-[1] text-[9px] font-medium uppercase tracking-[0.12em] text-[#000435]/50 pointer-events-none">
      {children}
    </span>
  );
}

export function FormField({ label, className = '', children }) {
  return (
    <div className={`relative ${className}`}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}

export function FormInput({ label, className = '', ...props }) {
  return (
    <FormField label={label} className={className}>
      <input className={inputBase} {...props} />
    </FormField>
  );
}

export function FormSelect({ label, className = '', children, ...props }) {
  return (
    <FormField label={label} className={className}>
      <div className="relative">
        <select className={`${inputBase} appearance-none pr-9 cursor-pointer`} {...props}>
          {children}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F59E0B] pointer-events-none"
          aria-hidden
        />
      </div>
    </FormField>
  );
}

export function FormDate({ label, className = '', ...props }) {
  return (
    <FormField label={label} className={className}>
      <div className="relative">
        <input type="date" className={`${inputBase} pr-9`} {...props} />
        <Calendar
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F59E0B] pointer-events-none"
          aria-hidden
        />
      </div>
    </FormField>
  );
}

export function FormTextarea({ label, className = '', rows = 4, ...props }) {
  return (
    <FormField label={label} className={className}>
      <textarea className={`${inputBase} min-h-[100px] resize-none`} rows={rows} {...props} />
    </FormField>
  );
}

export function FormFileUpload({ label, fileName, onChange, accept = 'image/*,application/pdf', className = '' }) {
  return (
    <FormField label={label} className={className}>
      <label className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-lg border border-[#F59E0B]/45 bg-white px-3 pt-5 pb-2 transition-colors hover:border-[#F59E0B]/70 hover:bg-[#FFFBEB]/40">
        <Upload size={15} className="shrink-0 text-[#F59E0B]" aria-hidden />
        <span className="truncate text-[12px] font-medium uppercase tracking-wide text-[#F59E0B]">
          {fileName || 'Upload file'}
        </span>
        <input type="file" accept={accept} className="hidden" onChange={onChange} />
      </label>
    </FormField>
  );
}

export function FormGrid({ children, cols = 2 }) {
  return (
    <div
      className={
        cols === 2
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'
          : 'grid grid-cols-1 gap-3 sm:gap-4'
      }
    >
      {children}
    </div>
  );
}

export default function AccountantFormModal({
  isOpen,
  onClose,
  title,
  subtitle,
  statusHint,
  footerHint,
  children,
  onSubmit,
  submitLabel = 'Save',
  submitting = false,
  cancelLabel = 'Cancel',
  submitDisabled = false,
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end sm:items-start justify-center sm:p-4 md:pt-10">
      <button
        type="button"
        className="absolute inset-0 bg-black/25"
        onClick={onClose}
        aria-label="Close dialog backdrop"
      />

      <div
        className="relative flex w-full max-w-2xl max-h-[94vh] sm:max-h-[min(92vh,720px)] flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-[#000435]/10 bg-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acct-form-modal-title"
      >
        <header className="shrink-0 bg-[#000435] px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-2">
              <h2
                id="acct-form-modal-title"
                className="text-sm sm:text-[15px] font-semibold uppercase tracking-wide text-white leading-tight"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-0.5 text-[10px] font-normal uppercase tracking-wide text-white/50 truncate">
                  {subtitle}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
          {statusHint ? (
            <p className="mt-3 flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-white/85">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" aria-hidden />
              {statusHint}
            </p>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white px-4 py-4 sm:px-5 sm:py-5">
          {children}
        </div>

        <footer className="shrink-0 border-t border-[#000435]/8 bg-white px-4 py-3 sm:px-5 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {footerHint ? (
              <p className="flex items-center gap-2 text-[10px] font-normal uppercase tracking-wide text-[#000435]/45">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" aria-hidden />
                {footerHint}
              </p>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3 sm:ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-full sm:w-auto rounded-lg border border-[#000435]/15 bg-white px-5 text-[11px] font-medium uppercase tracking-wide text-[#000435] transition-colors hover:bg-[#F8FAFC]"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={submitting || submitDisabled}
                className="h-10 w-full sm:w-auto rounded-lg bg-[#000435] px-6 text-[11px] font-semibold uppercase tracking-wide text-[#F59E0B] transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {submitting ? 'Please wait…' : submitLabel}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
