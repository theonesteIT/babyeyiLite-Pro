import { Loader2, FileText } from "lucide-react";
import BudgetSelectorPanel from "./BudgetSelectorPanel";
import { useSchoolBudgetData } from "../context/SchoolBudgetDataContext";
import { COLORS } from "../utils/budgetLineConstants";

export default function SchoolBudgetTabFrame({ title, subtitle, fmt, children, requireBudget = true }) {
  const { budgetId, setBudgetId, loading, error, reload, activeBudget } = useSchoolBudgetData();

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy }}>{title}</div>
        {subtitle && <div style={{ fontSize: 13, color: COLORS.gray400, marginTop: 4 }}>{subtitle}</div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <BudgetSelectorPanel budgetId={budgetId} onBudgetIdChange={setBudgetId} fmt={fmt} />
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button type="button" onClick={reload} style={{ background: COLORS.white, border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 48, gap: 10 }}>
          <Loader2 size={32} color={COLORS.amber} style={{ animation: "sb-spin 1s linear infinite" }} />
          <span style={{ color: COLORS.gray600, fontWeight: 600 }}>Loading…</span>
        </div>
      ) : requireBudget && !activeBudget ? (
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 40, textAlign: "center", border: `1px solid ${COLORS.gray200}` }}>
          <FileText size={40} color={COLORS.gray400} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 700, color: COLORS.navy }}>Select a budget</div>
          <p style={{ color: COLORS.gray600, fontSize: 14, marginTop: 8 }}>Choose a school budget above to view this section.</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
