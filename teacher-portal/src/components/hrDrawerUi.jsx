import { X } from 'lucide-react';

export const HR_FONT = "'Montserrat', sans-serif";

const inputClass =
  'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#c87800]/50 focus:ring-2 focus:ring-[#FEBF10]/20 transition-colors';

export function HrDrawer({ open, onClose, title, children, footer, className = '' }) {
  if (!open) return null;
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <div className="fixed inset-0 z-[230] flex justify-end">
        <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close" />
        <div
          className={`relative h-full w-full max-w-xl bg-white shadow-2xl flex flex-col border-l border-black/[0.06] ${className}`}
          style={{ fontFamily: HR_FONT }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05] shrink-0">
            <h3 className="text-sm text-[#000435]" style={{ fontWeight: 500 }}>{title}</h3>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
              <X size={18} strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">{children}</div>
          {footer ? (
            <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-black/[0.05] bg-slate-50/50">{footer}</div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export function HrBtnPrimary({ children, className = '', icon: Icon, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#c87800] text-white text-xs uppercase tracking-wider hover:bg-[#b36d00] transition-colors disabled:opacity-60 ${className}`}
      style={{ fontWeight: 500 }}
      {...props}
    >
      {Icon ? <Icon size={15} strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
}

export function HrBtnOutline({ children, className = '', icon: Icon, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors disabled:opacity-60 ${className}`}
      style={{ fontWeight: 500 }}
      {...props}
    >
      {Icon ? <Icon size={15} strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
}

export function HrField({ label, required, children }) {
  return (
    <div>
      <label className="block text-slate-500 text-[11px] uppercase tracking-wide mb-1.5" style={{ fontWeight: 500 }}>
        {label}
        {required ? <span className="text-[#c87800] ml-1">*</span> : null}
      </label>
      {children}
    </div>
  );
}

export function HrInput({ className = '', ...props }) {
  return <input className={`${inputClass} ${className}`} style={{ fontWeight: 500 }} {...props} />;
}

export function HrSelect({ value, onChange, children, className = '' }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`${inputClass} ${className}`}
      style={{ fontWeight: 500 }}
    >
      {children}
    </select>
  );
}

export function HrTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={`${inputClass} resize-none ${className}`}
      style={{ fontWeight: 500 }}
      {...props}
    />
  );
}
