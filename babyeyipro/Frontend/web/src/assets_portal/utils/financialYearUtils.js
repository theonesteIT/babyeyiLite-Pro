export function yearOptionsFrom1900() {
  const end = new Date().getFullYear();
  return Array.from({ length: end - 1900 + 1 }, (_, i) => end - i);
}

export function defaultYearDates(year) {
  const y = Number(year);
  if (!Number.isFinite(y)) return { startDate: '', endDate: '' };
  return {
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
  };
}

export function formatRwfPlain(amount) {
  const n = Math.round(Number(amount) || 0);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
