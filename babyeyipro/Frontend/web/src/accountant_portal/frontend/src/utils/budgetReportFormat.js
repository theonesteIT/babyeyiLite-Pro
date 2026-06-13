/** Shared date / period formatting for budget UI and PDF/Excel exports. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatBudgetDate(val) {
  if (val == null || val === '') return '—';
  const raw = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.slice(0, 10))) {
    const [y, m, d] = raw.slice(0, 10).split('-');
    return `${Number(d)} ${MONTHS[Number(m) - 1] || m} ${y}`;
  }
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw.slice(0, 10) || '—';
  return dt.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** ASCII-safe range for jsPDF (avoid arrow glyphs that render as garbage). */
export function formatBudgetPeriod(start, end) {
  const a = formatBudgetDate(start);
  const b = formatBudgetDate(end);
  if (a === '—' && b === '—') return '—';
  if (a === '—') return b;
  if (b === '—') return a;
  return `${a} to ${b}`;
}

export function formatBudgetDateTime(val) {
  if (val == null || val === '') return '—';
  const dt = new Date(val);
  if (Number.isNaN(dt.getTime())) return String(val);
  return dt.toLocaleString('en-RW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
