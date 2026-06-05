/** Format a numeric amount for display (no currency prefix). */
export function formatMoney(n) {
  return (Number(n) || 0).toLocaleString()
}

/** Whole-number amounts (dashboard KPIs). */
export function formatMoneyRounded(n) {
  return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
