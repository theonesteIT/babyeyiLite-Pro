/** Client-side totals with API balance fallback (API may return 0 when fee ids mismatch). */
export function resolvePublicPayTotals({ grand, balanceQuote, optimisticPaidRwF = 0 }) {
  const apiDue = Number(balanceQuote?.selection_due_rwf ?? 0);
  const apiRemain = balanceQuote != null ? Number(balanceQuote.remaining_rwf ?? 0) : null;
  const apiPaidRaw = balanceQuote?.selection_paid_rwf;
  const apiPaid = apiPaidRaw != null && !Number.isNaN(Number(apiPaidRaw)) ? Number(apiPaidRaw) : null;

  const totalDue = apiDue > 0 ? apiDue : grand;

  let remainingBalance;
  if (apiRemain != null && !Number.isNaN(apiRemain)) {
    remainingBalance = Math.max(0, apiRemain);
  } else if (apiPaid != null) {
    remainingBalance = Math.max(0, Math.round((totalDue - apiPaid) * 100) / 100);
  } else {
    remainingBalance = grand;
  }

  let alreadyPaid;
  if (apiPaid != null) {
    alreadyPaid = Math.max(0, Math.min(totalDue, apiPaid));
  } else {
    alreadyPaid = Math.max(0, Math.round((totalDue - remainingBalance) * 100) / 100);
  }

  let payCap = Math.max(0, remainingBalance);

  const optimistic = Math.max(0, Number(optimisticPaidRwF || 0));
  if (optimistic > alreadyPaid + 0.5) {
    alreadyPaid = Math.min(totalDue, Math.round(optimistic * 100) / 100);
    remainingBalance = Math.max(0, Math.round((totalDue - alreadyPaid) * 100) / 100);
    payCap = remainingBalance;
  }

  return { totalDue, remainingBalance, alreadyPaid, payCap };
}
