export const fmtMoney = (n) =>
  new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtCompact = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

export const formatDateShort = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-RW', { month: 'short', day: 'numeric' });
};

export const parseDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

export const initials = (name) =>
  (name || '?').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();

export const pct = (used, total) => (total === 0 ? 0 : Math.round((used / total) * 100));
