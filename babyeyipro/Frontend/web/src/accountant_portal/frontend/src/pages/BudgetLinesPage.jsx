import { useCallback, useEffect, useState } from "react";
import { PlusCircle, RefreshCw, TriangleAlert, Download, FileSpreadsheet } from "lucide-react";
import BudgetLineModal from "../components/BudgetLineModal";
import BudgetSelectorPanel from "../components/BudgetSelectorPanel";
import BudgetAllocationSummary from "../components/BudgetAllocationSummary";
import ExpenseUsageBar from "../components/ExpenseUsageBar";
import { fetchBudgetLines } from "../services/budgetLineApi";
import { fetchSchoolBudget } from "../services/schoolBudgetApi";
import { exportExpensesExcel, exportExpensesPdf } from "../utils/budgetExpensesExport";
import { COLORS, statusStyle } from "../utils/budgetLineConstants";
import { useIsMobile } from "../utils/useIsMobile";
import { useAuth } from "../context/AuthContext";
import { getSelectedBudgetId, setSelectedBudgetId } from "../utils/selectedSchoolBudget";
import SchoolBudgetPageShell from "../components/SchoolBudgetPageShell";
import { sbPageTitleClass, sbPageSubtitleClass, sbSectionTitle, sbKpiValue, sbKpiLabel } from "../utils/schoolBudgetTypography";

export default function BudgetLinesPage({ fmt }) {
  const { staff } = useAuth();
  const isMobile = useIsMobile();
  const [lines, setLines] = useState([]);
  const [budget, setBudget] = useState(null);
  const [budgetId, setBudgetId] = useState(() => getSelectedBudgetId());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const handleBudgetChange = (id) => {
    setBudgetId(id);
    setSelectedBudgetId(id);
  };

  const load = useCallback(async () => {
    if (!budgetId) {
      setLines([]);
      setBudget(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [data, b] = await Promise.all([
        fetchBudgetLines({ budget_id: budgetId }),
        fetchSchoolBudget(budgetId).catch(() => null),
      ]);
      setLines(data);
      setBudget(b);
    } catch (e) {
      setError(e.message || "Failed to load expenses");
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPlanned = lines.reduce((s, l) => s + l.plannedAmount, 0);
  const totalUsed = lines.reduce((s, l) => s + l.usedAmount, 0);
  const totalRemaining = lines.reduce((s, l) => s + (l.remaining ?? l.plannedAmount - l.usedAmount), 0);
  const totalBudget = Number(budget?.totalExpectedIncome || 0);
  const unallocated = Math.max(0, totalBudget - totalPlanned);

  const handleExport = async (type) => {
    if (!budgetId) return;
    setExporting(true);
    try {
      let b = budget;
      if (!b) b = await fetchSchoolBudget(budgetId);
      if (type === "pdf") exportExpensesPdf(b, lines, fmt);
      else exportExpensesExcel(b, lines, fmt);
    } catch (e) {
      setError(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <SchoolBudgetPageShell>
      <div className="sb-page-header flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className={sbPageTitleClass}>Expenses</h2>
          <p className={sbPageSubtitleClass}>Select a school budget, then plan and track expense allocations</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={load} disabled={loading || !budgetId} style={btnSecondary}>
            <RefreshCw size={16} /> Refresh
          </button>
          {budgetId && (
            <>
              <button type="button" disabled={exporting || loading} onClick={() => handleExport("pdf")} style={btnExport}>
                <Download size={16} /> PDF
              </button>
              <button type="button" disabled={exporting || loading} onClick={() => handleExport("excel")} style={btnExport}>
                <FileSpreadsheet size={16} /> Excel
              </button>
            </>
          )}
          <button type="button" onClick={() => setModalOpen(true)} disabled={!budgetId} style={btnPrimary}>
            <PlusCircle size={18} /> Add Expense
          </button>
        </div>
      </div>

      <BudgetSelectorPanel budgetId={budgetId} onBudgetIdChange={handleBudgetChange} fmt={fmt} />

      {budgetId && <BudgetAllocationSummary budgetId={budgetId} fmt={fmt} lines={lines} />}

      {error && (
        <div style={{ marginBottom: 14, padding: 12, background: "#FEE2E2", borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <TriangleAlert size={18} color={COLORS.red} />
          <span style={{ fontSize: 13, color: "#991B1B" }}>{error}</span>
        </div>
      )}

      <div
        className="sb-grid-3"
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Expenses", value: lines.length, accent: COLORS.navy },
          { label: "Total Planned", value: fmt(totalPlanned), accent: COLORS.navy },
          { label: "Total Spent", value: fmt(totalUsed), accent: COLORS.amber },
          { label: "Remaining", value: fmt(totalRemaining), accent: COLORS.green },
          ...(totalBudget > 0 && !isMobile
            ? [{ label: "Unallocated Budget", value: fmt(unallocated), accent: COLORS.navy }]
            : []),
        ].map((c) => (
          <div key={c.label} style={{ background: COLORS.white, borderRadius: 10, padding: 16, border: `1px solid ${COLORS.gray200}` }}>
            <div style={{ ...sbKpiLabel, marginBottom: 0 }}>{c.label}</div>
            <div style={{ ...sbKpiValue, marginTop: 4, color: c.accent }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...sbSectionTitle, marginBottom: 10 }}>Expense lines for selected budget</div>
      <div className="sb-table-scroll" style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "auto" }}>
        {isMobile ? (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {!budgetId ? (
              <div style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>Select a school budget above.</div>
            ) : loading ? (
              <div style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>Loading…</div>
            ) : lines.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>No expenses yet. Click Add Expense to create one.</div>
            ) : (
              lines.map((b) => {
                const st = statusStyle(b.statusKey);
                const remaining = b.remaining ?? b.plannedAmount - b.usedAmount;
                return (
                  <div key={b.db_id} style={{ border: `1px solid ${COLORS.gray200}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 500, color: COLORS.navy }}>{b.lineName}</div>
                    <div style={{ fontSize: 12, color: COLORS.gray600, marginTop: 4 }}>{b.department} · {b.budgetCategory}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 12 }}>
                      <div>Planned: <strong>{fmt(b.plannedAmount)}</strong></div>
                      <div>Spent: <strong>{fmt(b.usedAmount)}</strong></div>
                      <div>Remaining: <strong style={{ color: COLORS.green }}>{fmt(remaining)}</strong></div>
                      <div>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 500 }}>{b.statusLabel}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 500, color: COLORS.gray400, textTransform: "uppercase", marginBottom: 4 }}>Expense usage</div>
                      <ExpenseUsageBar pct={b.usagePct} height={8} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 820 }}>
            <thead>
              <tr style={{ background: COLORS.navy }}>
                {["Expense", "Department", "Category", "Planned (RWF)", "Spent (RWF)", "Remaining (RWF)", "Usage", "Status"].map((h) => (
                  <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!budgetId ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center", color: COLORS.gray400 }}>Select a school budget above.</td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>Loading…</td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 32, textAlign: "center", color: COLORS.gray400 }}>
                    No expenses yet. Click Add Expense to create allocations.
                  </td>
                </tr>
              ) : (
                lines.map((b, i) => {
                  const st = statusStyle(b.statusKey);
                  const remaining = b.remaining ?? b.plannedAmount - b.usedAmount;
                  return (
                    <tr key={b.db_id} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 ? COLORS.gray50 : COLORS.white }}>
                      <td style={{ padding: "10px 14px", fontWeight: 500, color: COLORS.navy }}>{b.lineName}</td>
                      <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.department}</td>
                      <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.budgetCategory}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 500 }}>{fmt(b.plannedAmount)}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 500, color: COLORS.amber }}>{fmt(b.usedAmount)}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 500, color: COLORS.green }}>{fmt(remaining)}</td>
                      <td style={{ padding: "10px 14px", minWidth: 140 }}>
                        <ExpenseUsageBar pct={b.usagePct} height={8} compact />
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>{b.statusLabel}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <BudgetLineModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        fmt={fmt}
        staff={staff}
        budgetId={budgetId}
        onSaved={load}
      />
    </SchoolBudgetPageShell>
  );
}

const btnPrimary = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 8,
  background: COLORS.amber,
  color: COLORS.navy,
  fontWeight: 500,
  fontSize: 10,
  fontFamily: "'Montserrat', sans-serif",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const btnSecondary = {
  ...btnPrimary,
  background: COLORS.white,
  border: `1px solid ${COLORS.gray200}`,
  color: COLORS.navy,
};

const btnExport = {
  ...btnSecondary,
  border: `1px solid ${COLORS.amber}88`,
  background: "#FFFBEB",
};
