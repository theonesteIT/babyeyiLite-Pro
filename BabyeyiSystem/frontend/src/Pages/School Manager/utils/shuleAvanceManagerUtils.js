export const STATUS_LABEL = {
  pending_accountant: { label: 'Pending finance', short: 'Finance', cls: 'bg-amber-100 text-amber-900 border-amber-200' },
  sent_to_manager: { label: 'Needs your decision', short: 'Action', cls: 'bg-sky-100 text-sky-900 border-sky-200' },
  approved: { label: 'Approved', short: 'Approved', cls: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  rejected_by_manager: { label: 'Rejected (manager)', short: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200' },
  rejected_by_accountant: { label: 'Rejected (finance)', short: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200' },
};

export const STATUS_FILTERS = [
  { id: 'needs_action', label: 'Needs action' },
  { id: 'sent_to_manager', label: 'Awaiting you' },
  { id: 'pending_accountant', label: 'Pending finance' },
  { id: 'approved', label: 'Approved' },
  { id: 'auto_approved', label: 'Auto-approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

export const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'cashout', label: 'Cashout' },
  { id: 'service', label: 'Service / deals' },
];

export const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'amount_high', label: 'Amount: high → low' },
  { id: 'amount_low', label: 'Amount: low → high' },
];

export function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${Math.round(v).toLocaleString()} RWF`;
}

export function compactMoney(n) {
  const v = Number(n || 0);
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(Math.round(v));
}

export function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function monthLabel(key) {
  if (!key) return '—';
  const [y, m] = String(key).split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1] || m} ${y}`;
}

export function buildQueryParams(filters) {
  const p = new URLSearchParams();
  if (filters.status) p.set('status', filters.status);
  if (filters.request_type && filters.request_type !== 'all') p.set('request_type', filters.request_type);
  if (filters.q?.trim()) p.set('q', filters.q.trim());
  if (filters.date_from) p.set('date_from', filters.date_from);
  if (filters.date_to) p.set('date_to', filters.date_to);
  if (filters.exceeds_cap && filters.exceeds_cap !== 'all') p.set('exceeds_cap', filters.exceeds_cap);
  if (filters.sort) p.set('sort', filters.sort);
  return p.toString();
}

function csvCell(v) {
  const s = String(v ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadAdvancesCsv(rows, filename = 'shule-avance-report.csv') {
  const headers = [
    'id', 'staff_name', 'role', 'request_type', 'amount_rwf', 'status',
    'purpose', 'repayment_months', 'exceeds_monthly_cap', 'auto_approved', 'submitted_at',
  ];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.id,
        r.staff_name,
        r.submitter_role_code,
        r.request_type,
        r.amount_rwf,
        r.status,
        r.purpose,
        r.repayment_term_months,
        Number(r.exceeds_monthly_cap) === 1 ? 'yes' : 'no',
        Number(r.auto_approved) === 1 ? 'yes' : 'no',
        r.submitted_at || r.created_at,
      ].map(csvCell).join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
