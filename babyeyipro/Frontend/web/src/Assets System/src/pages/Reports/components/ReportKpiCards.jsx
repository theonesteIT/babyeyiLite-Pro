import { Package, DollarSign, TrendingDown, Wrench, UserCheck, AlertTriangle, TrendingUp } from 'lucide-react';
import { NAVY, GOLD, formatRwfShort } from '../reportConfig';

const KPI_DEFS = [
  { key: 'total_assets', label: 'Total Assets', icon: Package, format: (v) => `${Number(v).toLocaleString()} Assets`, sub: (k) => (k.yoy_growth_pct != null ? `${k.yoy_growth_pct >= 0 ? '↑' : '↓'} ${Math.abs(k.yoy_growth_pct)}% this year` : null) },
  { key: 'total_value', label: 'Total Asset Value', icon: DollarSign, format: formatRwfShort },
  { key: 'total_depreciation', label: 'Total Depreciation', icon: TrendingDown, format: formatRwfShort },
  { key: 'under_maintenance', label: 'Under Maintenance', icon: Wrench, format: (v) => `${Number(v).toLocaleString()} Assets` },
  { key: 'active_assignments', label: 'Active Assignments', icon: UserCheck, format: (v) => `${Number(v).toLocaleString()} Assets` },
  { key: 'damaged_assets', label: 'Damaged Assets', icon: AlertTriangle, format: (v) => `${Number(v).toLocaleString()} Assets`, danger: true },
];

export default function ReportKpiCards({ kpis }) {
  const k = kpis || {};
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {KPI_DEFS.map((def) => {
        const Icon = def.icon;
        const val = k[def.key];
        const sub = def.sub?.(k);
        return (
          <div
            key={def.key}
            className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: def.danger ? '#FEE2E2' : `${GOLD}22`, color: def.danger ? '#DC2626' : NAVY }}
              >
                <Icon size={20} />
              </div>
              {sub && (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp size={12} /> {sub}
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-3">{def.label}</p>
            <p className="text-xl font-bold mt-1 tabular-nums" style={{ color: NAVY }}>
              {def.format(val ?? 0)}
            </p>
          </div>
        );
      })}
    </div>
  );
}
