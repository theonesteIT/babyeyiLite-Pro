import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchBudgetLineOptions } from "../services/budgetLineApi";
import { fetchSchoolBudgets } from "../services/schoolBudgetApi";
import { getSelectedBudgetId, setSelectedBudgetId } from "../utils/selectedSchoolBudget";
import { COLORS } from "../utils/budgetLineConstants";
import { useIsMobile } from "../utils/useIsMobile";

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "pending_approval") return "Pending approval";
  if (s === "draft") return "Draft";
  if (s === "rejected") return "Rejected";
  if (s === "closed") return "Closed";
  return status || "—";
}

/**
 * Shared school-budget picker (persists across Budget Lines, Usage Tracking, etc.)
 */
export default function BudgetSelectorPanel({ budgetId, onBudgetIdChange, fmt }) {
  const isMobile = useIsMobile();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const stored = getSelectedBudgetId();
      const [list, opts] = await Promise.all([
        fetchSchoolBudgets(),
        fetchBudgetLineOptions(stored || budgetId || undefined),
      ]);
      const usable = (Array.isArray(list) ? list : []).filter((b) => {
        const s = String(b.status || "").toLowerCase();
        return ["approved", "pending_approval", "draft"].includes(s);
      });
      const fromOpts = opts?.budgets || [];
      const merged = usable.length
        ? usable.map((b) => ({
            id: b.db_id ?? (String(b.id || "").startsWith("BGT-") ? Number(String(b.id).replace("BGT-", "")) : b.id),
            title: b.title,
            budgetCode: b.budgetCode,
            status: b.status,
            totalExpectedIncome: b.totalExpectedIncome ?? 0,
            term: b.term,
            academicYear: b.academicYear,
          }))
        : fromOpts.map((b) => ({
            id: b.id,
            title: b.title,
            budgetCode: b.budgetCode,
            status: b.status,
            totalExpectedIncome: b.totalExpectedIncome ?? 0,
          }));

      setBudgets(merged);

      const current = budgetId ?? stored;
      let nextId = current || opts?.activeBudget?.id || merged[0]?.id || null;
      if (nextId && !merged.some((b) => b.id === nextId)) {
        nextId = merged[0]?.id || null;
      }
      if (nextId && nextId !== budgetId) {
        setSelectedBudgetId(nextId);
        onBudgetIdChange(nextId);
      }
    } catch (e) {
      setError(e.message || "Failed to load budgets");
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [budgetId, onBudgetIdChange]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(() => budgets.find((b) => b.id === budgetId), [budgets, budgetId]);

  const handleChange = (e) => {
    const id = Number(e.target.value) || null;
    setSelectedBudgetId(id);
    onBudgetIdChange(id);
  };

  if (loading && !budgets.length) {
    return (
      <div style={{ marginBottom: 16, padding: 12, color: COLORS.gray400, fontSize: 13 }}>
        Loading school budgets…
      </div>
    );
  }

  if (!budgets.length) {
    return (
      <div
        style={{
          marginBottom: 16,
          padding: 14,
          background: "#FFFBEB",
          border: `1px solid ${COLORS.amber}`,
          borderRadius: 10,
          fontSize: 13,
          color: COLORS.navy,
        }}
      >
        No school budgets found. Create one under <strong>Create Budget</strong> first, then return here to add budget lines.
      </div>
    );
  }

  return (
    <div
      style={{
        marginBottom: 16,
        padding: 14,
        background: COLORS.white,
        borderRadius: 12,
        border: `1px solid ${COLORS.gray200}`,
      }}
    >
      <label style={{ fontSize: 11, fontWeight: 700, color: COLORS.gray600, textTransform: "uppercase", display: "block" }}>
        Active school budget
      </label>
      <select
        value={budgetId || ""}
        onChange={handleChange}
        style={{
          marginTop: 8,
          width: isMobile ? "100%" : "100%",
          maxWidth: 480,
          padding: "10px 12px",
          borderRadius: 8,
          border: `1px solid ${COLORS.gray200}`,
          fontSize: 13,
          fontWeight: 600,
          color: COLORS.navy,
        }}
      >
        {budgets.map((b) => (
          <option key={b.id} value={b.id}>
            {b.budgetCode} — {b.title} · {b.term || ""} {b.academicYear || ""} ({statusLabel(b.status)})
          </option>
        ))}
      </select>
      {selected && (
        <div style={{ marginTop: 10, fontSize: 12, color: COLORS.gray600 }}>
          Expected income: <strong style={{ color: COLORS.navy }}>{fmt(selected.totalExpectedIncome)}</strong>
          {" · "}
          Status: <strong>{statusLabel(selected.status)}</strong>
        </div>
      )}
      {error && <p style={{ marginTop: 8, fontSize: 12, color: COLORS.red }}>{error}</p>}
    </div>
  );
}
