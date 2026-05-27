/** Normalize API/datetime values for `<input type="date">` (requires yyyy-MM-dd). */
export function toDateInputValue(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
