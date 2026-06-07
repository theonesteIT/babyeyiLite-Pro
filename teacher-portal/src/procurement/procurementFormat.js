export function formatProcurementDate(value) {
  if (!value) return '—';
  const raw = String(value);
  const datePart = raw.includes('T') ? raw.split('T')[0] : raw;
  const dt = new Date(datePart);
  if (Number.isNaN(dt.getTime())) return raw;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function paginateList(list, page, pageSize) {
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
    pageStartIndex: start,
  };
}
