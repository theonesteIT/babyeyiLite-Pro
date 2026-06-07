import { createElement, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ManagerOchreHeroShell from '../../components/ManagerOchreHeroShell';

export const HR_FONT = "'Montserrat', sans-serif";

const inputClass =
  'w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm placeholder:text-slate-400 focus:outline-none focus:border-[#c87800]/50 focus:ring-2 focus:ring-[#FEBF10]/20 transition-colors';

export function HrPageLayout({
  eyebrow = 'HR Center',
  title,
  subtitle,
  HeroIcon,
  headerRight,
  kpiTiles = [],
  cardBody = null,
  kpiGridClassName = '',
  children,
  contentClassName = 'max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-5',
}) {
  const { manager } = useAuth();
  const managerName = [manager?.first_name, manager?.last_name].filter(Boolean).join(' ');
  const resolvedSubtitle =
    subtitle ??
    (manager?.school?.name
      ? `${managerName ? `${managerName} · ` : ''}${manager.school.name}`
      : managerName || 'Personnel & workforce management');

  return (
    <div className="hr-pages-root" style={{ fontFamily: HR_FONT }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <ManagerOchreHeroShell
        eyebrow={eyebrow}
        title={title}
        subtitle={resolvedSubtitle}
        HeroIcon={HeroIcon}
        headerRight={headerRight}
        kpiTiles={kpiTiles}
        kpiGridClassName={kpiGridClassName}
        cardBody={cardBody}
        overlapClassName={
          kpiTiles.length > 0 || cardBody
            ? undefined
            : 'hidden'
        }
        pageBody={<div className={contentClassName}>{children}</div>}
      />
    </div>
  );
}

export function HrPanel({ className = '', children }) {
  return (
    <div className={`bg-white rounded-2xl border border-black/[0.06] shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function HrPanelHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-black/[0.05]">
      <div>
        {title ? (
          <h2 className="text-sm text-[#000435] tracking-tight" style={{ fontWeight: 500 }}>
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="text-[11px] text-slate-500 mt-0.5 uppercase tracking-wide">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function HrBtnPrimary({ children, className = '', icon: Icon, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#c87800] text-white text-xs uppercase tracking-wider hover:bg-[#b36d00] transition-colors ${className}`}
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
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors ${className}`}
      style={{ fontWeight: 500 }}
      {...props}
    >
      {Icon ? <Icon size={15} strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
}

export function HrBtnGhost({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-slate-500 hover:bg-slate-50 hover:text-[#c87800] transition-colors ${className}`}
      style={{ fontWeight: 500 }}
      {...props}
    >
      {children}
    </button>
  );
}

export function HrHeroAction({ children, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-[10px] text-white flex items-center gap-1.5 hover:bg-white/15 transition-all uppercase tracking-wider"
      style={{ fontWeight: 500 }}
    >
      {Icon ? <Icon size={13} strokeWidth={1.75} /> : null}
      {children}
    </button>
  );
}

export function HrSearch({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${inputClass} ${className}`}
    />
  );
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

export function HrField({ label, required, children, half, className = '' }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2 sm:col-span-1'}>
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

export function HrTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={`${inputClass} resize-none ${className}`}
      style={{ fontWeight: 500 }}
      {...props}
    />
  );
}

export function HrFormSelect({ options = [], placeholder = 'Select…', ...props }) {
  return (
    <select className={inputClass} style={{ fontWeight: 500 }} {...props}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={typeof o === 'object' ? o.value : o} value={typeof o === 'object' ? o.value : o}>
          {typeof o === 'object' ? o.label : o}
        </option>
      ))}
    </select>
  );
}

export function HrBadge({ children, variant = 'default' }) {
  const styles = {
    default: 'bg-slate-100 text-slate-600 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    muted: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border uppercase tracking-wide ${styles[variant] || styles.default}`}
      style={{ fontWeight: 500 }}
    >
      {children}
    </span>
  );
}

export function HrStatCard({ label, value, sub, icon: Icon, iconClass = 'text-[#c87800] bg-[#FEBF10]/15' }) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-4 flex items-start gap-3 hover:border-[#FEBF10]/40 transition-colors">
      {Icon ? (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon size={18} strokeWidth={1.75} />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-xl text-[#000435] mt-0.5 tabular-nums" style={{ fontWeight: 500 }}>
          {value}
        </p>
        {sub ? <p className="text-[11px] text-[#c87800] mt-0.5">{sub}</p> : null}
      </div>
    </div>
  );
}

export function HrDrawer({ open, onClose, title, children, footer, className = '' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
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
        {footer ? <div className="shrink-0 flex gap-3 px-5 py-4 border-t border-black/[0.05] bg-slate-50/50">{footer}</div> : null}
      </div>
    </div>
  );
}

export function HrModal({ open, onClose, title, children, footer, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl border border-black/[0.08] shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
        style={{ fontFamily: HR_FONT }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
          <h3 className="text-sm text-[#000435]" style={{ fontWeight: 500 }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        {footer ? (
          <div className="flex gap-3 px-5 pb-5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function HrTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-xs capitalize transition-all ${
            active === tab.id
              ? 'bg-[#c87800] text-white'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          style={{ fontWeight: 500 }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function HrFilterPills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1.5 rounded-full text-xs transition-all ${
            value === opt
              ? 'bg-[#c87800] text-white'
              : 'bg-white border border-slate-200 text-slate-500 hover:border-[#c87800]/40'
          }`}
          style={{ fontWeight: 500 }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function HrTable({ columns, children }) {
  return (
    <HrPanel className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[0.05] bg-slate-50/80">
              {columns.map((col) => (
                <th
                  key={col}
                  className="text-left px-4 py-3 text-[10px] text-slate-400 uppercase tracking-[0.12em] whitespace-nowrap"
                  style={{ fontWeight: 500 }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">{children}</tbody>
        </table>
      </div>
    </HrPanel>
  );
}

export function HrAlert({ variant = 'warning', title, children, icon: Icon }) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-sky-50 border-sky-200 text-sky-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[variant]}`}>
      <div className="flex items-start gap-2">
        {Icon ? <Icon size={16} strokeWidth={1.75} className="shrink-0 mt-0.5 opacity-70" /> : null}
        <div>
          {title ? (
            <p className="text-xs mb-1" style={{ fontWeight: 500 }}>
              {title}
            </p>
          ) : null}
          <div className="text-xs opacity-90">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function HrSectionHeading({ children }) {
  return (
    <h3 className="text-xs text-[#000435] uppercase tracking-wide mb-4" style={{ fontWeight: 500 }}>
      {children}
    </h3>
  );
}

export function HrToast({ toast, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast?.message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), toast.duration ?? 2800);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!toast?.message || visible) return;
    const t = setTimeout(() => onClose?.(), 220);
    return () => clearTimeout(t);
  }, [visible, toast, onClose]);

  if (!toast?.message) return null;
  const isError = String(toast.type || '').toLowerCase() === 'error';
  return (
    <div className="fixed top-4 right-4 z-[120] max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none">
      <div
        className={[
          'rounded-xl border px-4 py-3 shadow-lg text-[12px] leading-snug transition-all duration-200',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
          isError ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100',
        ].join(' ')}
        style={{ fontWeight: 500 }}
      >
        {toast.message}
      </div>
    </div>
  );
}

export function HrPagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          style={{ fontWeight: 500 }}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          style={{ fontWeight: 500 }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function statusToBadge(status) {
  const map = {
    Active: 'success',
    Approved: 'success',
    Verified: 'success',
    Pending: 'warning',
    Probation: 'warning',
    Expiring: 'danger',
    Rejected: 'danger',
    Suspended: 'danger',
    Terminated: 'muted',
    Expired: 'muted',
    'On Leave': 'info',
    Archived: 'muted',
  };
  return map[status] || 'default';
}

export function IconStat({ icon, label, value, className = '' }) {
  return createElement(
    'div',
    { className: `text-center p-3 rounded-xl bg-slate-50 border border-slate-100 ${className}` },
    icon,
    createElement(
      'p',
      { className: 'text-lg text-[#000435] mt-2 tabular-nums', style: { fontWeight: 500 } },
      value
    ),
    createElement('p', { className: 'text-[10px] text-slate-400 uppercase tracking-wide mt-0.5' }, label)
  );
}
