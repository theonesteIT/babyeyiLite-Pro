/** Lightweight SVG charts for NESA analytics (no external chart lib). */

export function HBarChart({ data = [], maxBars = 12 }) {
  const items = data.slice(0, maxBars);
  const max = Math.max(1, ...items.map((d) => Number(d.value ?? d.total ?? 0)));
  if (!items.length) return null;
  return (
    <div className="space-y-2.5">
      {items.map((d, i) => {
        const val = Number(d.value ?? d.total ?? 0);
        const label = d.label ?? d.district ?? '—';
        const pct = Math.round((val / max) * 100);
        return (
          <div key={`${label}-${i}`}>
            <div className="mb-1 flex justify-between text-[11px] font-semibold text-[#000435]">
              <span className="truncate pr-2">{label}</span>
              <span className="tabular-nums text-amber-800">{val}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#000435] to-amber-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({ segments = [] }) {
  const total = segments.reduce((s, x) => s + Number(x.value || 0), 0) || 1;
  let offset = 0;
  const colors = ['#000435', '#c87800', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
        {segments.map((seg, i) => {
          const pct = (Number(seg.value) / total) * 100;
          const dash = `${pct} ${100 - pct}`;
          const el = (
            <circle
              key={seg.label}
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="16"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += pct;
          return el;
        })}
        <text x="60" y="58" textAnchor="middle" className="fill-[#000435] text-[14px] font-bold" fontSize="14">
          {total}
        </text>
        <text x="60" y="72" textAnchor="middle" fill="#92400e" fontSize="8">
          total
        </text>
      </svg>
      <ul className="m-0 flex-1 space-y-1.5 p-0 text-[11px]">
        {segments.map((seg, i) => (
          <li key={seg.label} className="flex items-center gap-2 list-none">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="flex-1 font-medium text-[#000435]">{seg.label}</span>
            <span className="font-bold tabular-nums text-amber-800">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineAreaChart({ data = [], labelKey = 'label', valueKey = 'total' }) {
  if (!data.length) return null;
  const vals = data.map((d) => Number(d[valueKey] ?? 0));
  const max = Math.max(1, ...vals);
  const w = 320;
  const h = 120;
  const pad = 8;
  const points = vals.map((v, i) => {
    const x = pad + (i / Math.max(1, vals.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const area = `${points[0]?.split(',')[0]},${h - pad} ${points.join(' ')} ${points[points.length - 1]?.split(',')[0]},${h - pad}`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <polygon points={area} fill="rgba(200,120,0,0.15)" />
        <polyline points={points.join(' ')} fill="none" stroke="#000435" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[9px] font-bold text-amber-800/80">
        {data.map((d) => (
          <span key={d[labelKey]} className="truncate max-w-[4rem]">{d[labelKey]}</span>
        ))}
      </div>
    </div>
  );
}
