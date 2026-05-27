/** Budget-derived financial position (not full GL). */
export function deriveBudgetFinancials(data) {
  const totals = data?.totals || {};
  const expected = totals.totalExpectedIncome ?? 0;
  const allocated = totals.totalAllocated ?? 0;
  const used = totals.totalUsed ?? 0;
  const available = totals.availableBalance ?? 0;
  const unallocated = totals.remainingUnallocated ?? 0;

  const currentAssets = [
    { name: "Available on budget lines", value: available },
    { name: "Unallocated income", value: unallocated },
  ].filter((a) => a.value > 0);

  const fixedAssets = [];

  const currentLiabilities = used > 0 ? [{ name: "Recorded budget usage", amount: used }] : [];

  const longTermLiabilities = [];

  const equity = [
    { name: "Expected income (budget)", amount: expected },
    { name: "Net position after usage", amount: Math.max(0, expected - used) },
  ].filter((e) => e.amount > 0);

  const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.value, 0);
  const totalFixedAssets = 0;
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalCurrentLiab = currentLiabilities.reduce((s, l) => s + l.amount, 0);
  const totalLongLiab = 0;
  const totalLiabilities = totalCurrentLiab + totalLongLiab;
  const totalEquity = equity.reduce((s, e) => s + e.amount, 0);

  return {
    assets: { current: currentAssets, fixed: fixedAssets },
    liabilities: { current: currentLiabilities, longTerm: longTermLiabilities },
    equity,
    totalCurrentAssets,
    totalFixedAssets,
    totalAssets,
    totalCurrentLiab,
    totalLongLiab,
    totalLiabilities,
    totalEquity,
    allocated,
    used,
    expected,
  };
}
