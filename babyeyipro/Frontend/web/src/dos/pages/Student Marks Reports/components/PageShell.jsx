export default function PageShell({ title, subtitle, children, actions }) {
  return (
    <div className="marks-page-body space-y-5">
      {(title || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-[#000435] tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-[#000435]/50 mt-0.5 font-normal">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function KpiCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="marks-kpi-card rounded-2xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        {Icon && <Icon size={22} strokeWidth={2.25} className="marks-kpi-icon shrink-0" />}
        <span className={`text-xl font-semibold tabular-nums leading-none ${accent || 'text-[#000435]'}`}>{value}</span>
      </div>
      <p className="text-xs font-medium text-[#000435]/60">{label}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function Panel({ title, children, className = '' }) {
  return (
    <div className={`marks-panel rounded-2xl p-5 ${className}`}>
      {title && <h3 className="text-sm font-medium text-[#000435]/80 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

export function InsightRow({ type, text, action }) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
  };
  return (
    <div className={`flex items-start justify-between gap-3 p-3 rounded-xl border ${styles[type] || styles.info}`}>
      <p className="text-sm font-medium">{text}</p>
      {action && <span className="text-[10px] font-bold uppercase tracking-wide shrink-0 opacity-70">{action}</span>}
    </div>
  );
}

export function TrendBadge({ value }) {
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className={`text-xs font-bold ${flat ? 'text-slate-400' : up ? 'text-green-600' : 'text-red-600'}`}>
      {flat ? '—' : `${up ? '+' : ''}${value}%`}
    </span>
  );
}

export function StatusPill({ status }) {
  const map = {
    top: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    attention: 'bg-red-100 text-red-800',
    improving: 'bg-amber-100 text-amber-800',
    stable: 'bg-slate-100 text-slate-600',
    critical: 'bg-red-100 text-red-800',
    High: 'bg-orange-100 text-orange-800',
    Critical: 'bg-red-100 text-red-800',
    Medium: 'bg-amber-100 text-amber-800',
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}
