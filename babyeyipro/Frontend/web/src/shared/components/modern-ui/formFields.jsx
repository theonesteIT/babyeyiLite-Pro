import { Calendar, ChevronDown, Upload } from 'lucide-react';

const inputBase =
  'w-full px-3.5 py-2.5 bg-white border border-black/[0.08] rounded-lg text-sm text-[#000435] placeholder:text-[#000435]/40 focus:outline-none focus:border-[#FF8C00]/60 focus:ring-2 focus:ring-[#FF8C00]/15 transition-colors';

export function FormLabel({ children, required, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold text-[#000435]/80 mb-1.5"
    >
      {children}
      {required ? <span className="text-red-500 ml-0.5">*</span> : null}
    </label>
  );
}

export function FormField({ label, required, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label ? (
        <FormLabel required={required} htmlFor={htmlFor}>
          {label}
        </FormLabel>
      ) : null}
      {children}
    </div>
  );
}

export function FormInput({ id, className = '', ...props }) {
  return <input id={id} className={`${inputBase} ${className}`} {...props} />;
}

export function FormTextarea({ id, className = '', rows = 3, ...props }) {
  return (
    <textarea
      id={id}
      rows={rows}
      className={`${inputBase} resize-none ${className}`}
      {...props}
    />
  );
}

export function FormSelect({ id, children, className = '', ...props }) {
  return (
    <div className="relative">
      <select id={id} className={`${inputBase} appearance-none pr-10 ${className}`} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#000435]/40 pointer-events-none"
      />
    </div>
  );
}

export function FormDateInput({ id, className = '', ...props }) {
  return (
    <div className="relative">
      <input
        id={id}
        type="date"
        className={`${inputBase} pr-10 ${className}`}
        {...props}
      />
      <Calendar
        size={16}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#000435]/40 pointer-events-none"
      />
    </div>
  );
}

export function FormRadioGroup({ name, value, onChange, options = [] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {options.map((opt) => (
        <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          <span
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
              value === opt.value ? 'border-[#FF8C00]' : 'border-black/20'
            }`}
          >
            {value === opt.value ? (
              <span className="w-2 h-2 rounded-full bg-[#FF8C00]" />
            ) : null}
          </span>
          <span className="text-sm text-[#000435]/80">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export function FormCheckbox({ id, label, checked, indeterminate = false, onChange }) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
          checked || indeterminate ? 'bg-[#FF8C00] border-[#FF8C00]' : 'bg-white border-black/20'
        }`}
      >
        {indeterminate && !checked ? (
          <span className="w-2 h-0.5 bg-white rounded-full" />
        ) : checked ? (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden>
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      {label ? <span className="text-sm text-[#000435]/80">{label}</span> : null}
    </label>
  );
}

export function FormToggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-[#FF8C00]' : 'bg-slate-200'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      {label ? <span className="text-sm text-[#000435]/80">{label}</span> : null}
    </label>
  );
}

export function FormFileUpload({
  label,
  hint = 'Click to upload or drag and drop',
  accept,
  onChange,
  className = '',
}) {
  return (
    <FormField label={label} className={className}>
      <label className="flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-black/[0.1] rounded-xl bg-slate-50/50 hover:bg-slate-50 hover:border-[#FF8C00]/40 cursor-pointer transition-colors">
        <div className="w-10 h-10 rounded-full bg-[#FF8C00]/10 flex items-center justify-center text-[#FF8C00]">
          <Upload size={20} />
        </div>
        <p className="text-sm font-medium text-[#000435]/70">{hint}</p>
        <p className="text-xs text-[#000435]/45">PNG, JPG up to 5MB</p>
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => onChange?.(e.target.files?.[0] ?? null)}
        />
      </label>
    </FormField>
  );
}

export function StatusBadge({ status, variant }) {
  const map = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  const dotMap = {
    active: 'bg-emerald-500',
    inactive: 'bg-slate-400',
    pending: 'bg-amber-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
  };
  const v = variant || status?.toLowerCase() || 'inactive';
  const label = status || v.charAt(0).toUpperCase() + v.slice(1);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${map[v] || map.inactive}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotMap[v] || dotMap.inactive}`} />
      {label}
    </span>
  );
}

export function ClassBadge({ label, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    yellow: 'bg-amber-50 text-amber-800 border-amber-100',
    purple: 'bg-violet-50 text-violet-700 border-violet-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span
      className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${tones[tone] || tones.blue}`}
    >
      {label}
    </span>
  );
}

export function FormAlert({ type = 'success', message, onClose }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
  };
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}>
      <span>{message}</span>
      {onClose ? (
        <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function BtnPrimary({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF8C00] text-white text-sm font-semibold hover:bg-[#E67E00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function BtnSecondary({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-black/[0.12] bg-white text-[#000435]/80 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
