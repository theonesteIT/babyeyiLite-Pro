/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export function localTodayIso() {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Normalize API / Date / string values to YYYY-MM-DD without timezone drift. */
export function normalizeDateOnly(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/** Display as DD/MM/YYYY (Rwanda / common school format). */
export function formatDateDisplay(value) {
  const key = normalizeDateOnly(value);
  if (!key) return '';
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

/** Display as "5 Jun 2026" — calendar date only, no timezone noise. */
export function formatDateModern(value) {
  const key = normalizeDateOnly(value);
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Human-readable date range for warranty / periods. */
export function formatDateRange(start, end) {
  const a = formatDateModern(start);
  const b = formatDateModern(end);
  if (a && b) return `${a} → ${b}`;
  return a || b || '';
}

export const EMPTY_DATE_PERIOD = {
  mode: 'all',
  month: '',
  year: String(new Date().getFullYear()),
  dateFrom: '',
  dateTo: '',
};

/** Count active date-period filter fields. */
export function countDatePeriodActive(period) {
  if (!period || period.mode === 'all') return 0;
  if (period.mode === 'range') return [period.dateFrom, period.dateTo].filter(Boolean).length || 1;
  return 1;
}

/** Map UI date period → API query params (date_range, date_month, date_year, date_from, date_to). */
export function resolveDateFilterQuery(period) {
  if (!period || period.mode === 'all') return {};
  const params = {};
  if (period.mode === 'week') {
    params.date_range = 'week';
    return params;
  }
  if (period.mode === 'month') {
    if (period.month) params.date_month = period.month;
    else params.date_range = 'month';
    return params;
  }
  if (period.mode === 'year') {
    if (period.year) params.date_year = String(period.year);
    else params.date_range = 'year';
    return params;
  }
  if (period.mode === 'range') {
    const from = normalizeDateOnly(period.dateFrom);
    const to = normalizeDateOnly(period.dateTo);
    if (from) params.date_from = from;
    if (to) params.date_to = to;
    return params;
  }
  return {};
}

export function yearOptionsFrom(startYear = 2020) {
  const end = new Date().getFullYear() + 1;
  return Array.from({ length: end - startYear + 1 }, (_, i) => end - i);
}

/** Add calendar days to YYYY-MM-DD → YYYY-MM-DD */
export function addDaysToDateOnly(isoDate, days) {
  const key = normalizeDateOnly(isoDate);
  if (!key || !Number.isFinite(Number(days))) return '';
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + Number(days));
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, '0');
  const nd = String(dt.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/** Maintenance end date reached and still open */
export function isMaintenanceExtendable(record) {
  if (!record || record.status === 'Completed') return false;
  const end = normalizeDateOnly(record.end_date);
  if (!end) return false;
  const today = localTodayIso();
  return end <= today;
}
