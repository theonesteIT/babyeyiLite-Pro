import { useEffect, useMemo, useState } from "react";
import { fetchSchoolBudget } from "../services/schoolBudgetApi";
import { fetchBudgetLinesSummary } from "../services/budgetLineApi";
import { COLORS } from "../utils/budgetLineConstants";
import { useIsMobile } from "../utils/useIsMobile";

function pct(part, total) {
  if (!total || total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Shows school budget envelope vs lines allocated (e.g. budget 38M, lines 20M, remain 18M).
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
      },
      {
        key: "lines-total",
        label: "Allocated to budget lines",
        amount: linesPlanned,
        percent: allocatedPct,
      },
      {
        key: "remain",
        label: "Remaining to allocate",
        amount: unallocated,
        percent: unallocatedPct,
        warn: unallocated < 0,
      },
    ];
    const lineRows = lines.map((l) => ({
      key: `line-${l.db_id ?? l.id}`,
      label: l.lineName,
      sub: l.department,
      amount: l.plannedAmount,
      percent: pct(l.plannedAmount, totalExpected),
      isLine: true,
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
          fontWeight: 800,
          color: COLORS.navy,
          fontSize: 15,
          marginBottom: 10,
        }}
      >
        Budget allocation — {budget?.title || "Selected budget"}
        {budget?.budgetCode && (
          <span style={{ fontWeight: 600, fontSize: 12, color: COLORS.gray600, marginLeft: 8 }}>
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
                <div style={{ fontWeight: r.highlight ? 800 : 600, fontSize: 13, color: COLORS.navy }}>
                  {r.label}
                </div>
                {r.sub && <div style={{ fontSize: 11, color: COLORS.gray500 }}>{r.sub}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontWeight: 800, color: COLORS.navy }}>{fmt(r.amount)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.amber }}>{r.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr style={{ background: COLORS.navy }}>
                {["Item", "Amount (RWF)", "% of school budget"].map((h) => (
                  <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12 }}>
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
                    fontWeight: r.highlight ? 700 : r.isLine ? 400 : 600,
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
                  <td style={{ padding: "10px 14px", fontWeight: 700 }}>{fmt(r.amount)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, maxWidth: 120, background: COLORS.gray200, borderRadius: 99, height: 6 }}>
                        <div
                          style={{
                            width: `${Math.min(r.percent, 100)}%`,
                            height: "100%",
                            background: r.key === "remain" ? COLORS.green : COLORS.amber,
                            borderRadius: 99,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{r.percent}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
