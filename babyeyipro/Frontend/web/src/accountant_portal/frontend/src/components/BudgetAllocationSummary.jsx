import { useEffect, useMemo, useState } from "react";
import { fetchSchoolBudget } from "../services/schoolBudgetApi";
import { fetchBudgetLinesSummary } from "../services/budgetLineApi";
import { COLORS } from "../utils/budgetLineConstants";
import { useIsMobile } from "../utils/useIsMobile";

function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function pctBadge(value, variant = "amber") {
  const colors = {
    amber: { bg: "#FEF3C7", color: "#92400E" },
    green: { bg: "#D1FAE5", color: "#065F46" },
    navy: { bg: "#EFF6FF", color: "#1E40AF" },
  };
  const c = colors[variant] || colors.amber;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: c.bg,
        color: c.color,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}%
    </span>
  );
}

/**
 * School budget envelope vs expenses allocated (no usage bars — allocation % only).
 */
export default function BudgetAllocationSummary({ budgetId, fmt, lines: linesProp }) {
  const isMobile = useIsMobile();
  const [budget, setBudget] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!budgetId) {
      setBudget(null);
      setSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [b, sum] = await Promise.all([
          fetchSchoolBudget(budgetId),
          fetchBudgetLinesSummary(budgetId),
        ]);
        if (!cancelled) {
          setBudget(b);
          setSummary(sum);
        }
      } catch {
        if (!cancelled) {
          setBudget(null);
          setSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [budgetId]);

  const lines = linesProp ?? summary?.lines ?? [];
  const totalExpected = Number(
    summary?.totalExpectedIncome ?? budget?.totalExpectedIncome ?? 0
  );
  const linesPlanned = lines.reduce((s, l) => s + Number(l.plannedAmount || 0), 0);
  const unallocated = Math.max(0, totalExpected - linesPlanned);
  const allocatedPct = pct(linesPlanned, totalExpected);
  const unallocatedPct = pct(unallocated, totalExpected);

  const rows = useMemo(() => {
    const base = [
      {
        key: "budget",
        label: "School budget (expected income)",
        amount: totalExpected,
        percent: 100,
        highlight: true,
        pctVariant: "navy",
      },
      {
        key: "lines-total",
        label: "Allocated to expenses",
        amount: linesPlanned,
        percent: allocatedPct,
        pctVariant: "amber",
      },
      {
        key: "remain",
        label: "Remaining to allocate",
        amount: unallocated,
        percent: unallocatedPct,
        pctVariant: "green",
      },
    ];
    const lineRows = lines.map((l) => ({
      key: `line-${l.db_id ?? l.id}`,
      label: l.lineName,
      sub: l.department,
      amount: l.plannedAmount,
      percent: pct(l.plannedAmount, totalExpected),
      isLine: true,
      pctVariant: "amber",
    }));
    return [...base, ...lineRows];
  }, [lines, totalExpected, linesPlanned, unallocated, allocatedPct, unallocatedPct]);

  if (!budgetId) return null;

  if (loading && !budget) {
    return (
      <div style={{ marginBottom: 20, padding: 16, color: COLORS.gray400, fontSize: 13 }}>
        Loading budget summary…
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontWeight: 500,
          color: COLORS.navy,
          fontSize: 15,
          marginBottom: 10,
        }}
      >
        Budget allocation — {budget?.title || "Selected budget"}
        {budget?.budgetCode && (
          <span style={{ fontWeight: 500, fontSize: 12, color: COLORS.gray600, marginLeft: 8 }}>
            ({budget.budgetCode})
          </span>
        )}
      </div>

      <div
        className="sb-table-scroll"
        style={{
          background: COLORS.white,
          borderRadius: 12,
          border: `1px solid ${COLORS.gray200}`,
          overflow: "auto",
        }}
      >
        {isMobile ? (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r) => (
              <div
                key={r.key}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${r.highlight ? COLORS.amber : COLORS.gray200}`,
                  background: r.highlight ? "#FFFBEB" : r.isLine ? COLORS.gray50 : COLORS.white,
                }}
              >
                <div style={{ fontWeight: r.highlight ? 500 : 500, fontSize: 13, color: COLORS.navy }}>
                  {r.label}
                </div>
                {r.sub && <div style={{ fontSize: 11, color: COLORS.gray500 }}>{r.sub}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontWeight: 500, color: COLORS.navy }}>{fmt(r.amount)}</span>
                  {pctBadge(r.percent, r.pctVariant)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr style={{ background: COLORS.navy }}>
                {["Item", "Amount (RWF)", "% of school budget"].map((h) => (
                  <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12, fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.key}
                  style={{
                    borderBottom: `1px solid ${COLORS.gray100}`,
                    background: r.highlight ? "#FFFBEB" : i % 2 ? COLORS.gray50 : COLORS.white,
                    fontWeight: r.highlight ? 500 : r.isLine ? 400 : 500,
                  }}
                >
                  <td style={{ padding: "10px 14px", color: COLORS.navy }}>
                    {r.label}
                    {r.sub && (
                      <span style={{ display: "block", fontSize: 11, color: COLORS.gray500, fontWeight: 400 }}>
                        {r.sub}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 500 }}>{fmt(r.amount)}</td>
                  <td style={{ padding: "10px 14px" }}>{pctBadge(r.percent, r.pctVariant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export { pct as allocationPct };
