import { useCallback, useEffect, useState } from "react";
import { PlusCircle, RefreshCw, TriangleAlert } from "lucide-react";
import BudgetLineModal from "../components/BudgetLineModal";
import BudgetSelectorPanel from "../components/BudgetSelectorPanel";
import BudgetAllocationSummary from "../components/BudgetAllocationSummary";
import { fetchBudgetLines } from "../services/budgetLineApi";
import { COLORS, statusStyle } from "../utils/budgetLineConstants";
import { useIsMobile } from "../utils/useIsMobile";
import { useAuth } from "../context/AuthContext";
import { getSelectedBudgetId, setSelectedBudgetId } from "../utils/selectedSchoolBudget";

export default function BudgetLinesPage({ fmt }) {
  const { staff } = useAuth();
  const isMobile = useIsMobile();
  const [lines, setLines] = useState([]);
  const [budgetId, setBudgetId] = useState(() => getSelectedBudgetId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const handleBudgetChange = (id) => {
    setBudgetId(id);
    setSelectedBudgetId(id);
  };

  const load = useCallback(async () => {
    if (!budgetId) {
      setLines([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchBudgetLines({ budget_id: budgetId });
      setLines(data);
    } catch (e) {
      setError(e.message || "Failed to load budget lines");
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

  return (
    <div>
      <div className="sb-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: COLORS.navy }}>Budget Lines</div>
          <div style={{ fontSize: 13, color: COLORS.gray400, marginTop: 4 }}>Select a school budget, then create allocations (budget lines)</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={load} disabled={loading || !budgetId} style={btnSecondary}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" onClick={() => setModalOpen(true)} disabled={!budgetId} style={btnPrimary}>
            <PlusCircle size={18} /> Create Budget Line
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

      <div className="sb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Budget Lines", value: lines.length },
          { label: "Total Allocated", value: fmt(totalPlanned) },
          { label: "Total Used", value: fmt(totalUsed) },
        ].map((c) => (
          <div key={c.label} style={{ background: COLORS.white, borderRadius: 10, padding: 16, border: `1px solid ${COLORS.gray200}` }}>
            <div style={{ fontSize: 11, color: COLORS.gray400, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.navy, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ fontWeight: 800, color: COLORS.navy, fontSize: 15, marginBottom: 10 }}>Budget lines for selected budget</div>
      <div className="sb-table-scroll" style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "auto" }}>
        {isMobile ? (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {!budgetId ? (
              <div style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>Select a school budget above.</div>
            ) : loading ? (
              <div style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>Loading…</div>
            ) : lines.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>No budget lines yet.</div>
            ) : (
              lines.map((b) => {
                const st = statusStyle(b.statusKey);
                return (
                  <div key={b.db_id} style={{ border: `1px solid ${COLORS.gray200}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 700, color: COLORS.navy }}>{b.lineName}</div>
                    <div style={{ fontSize: 12, color: COLORS.gray600, marginTop: 4 }}>{b.department} · {b.budgetCategory}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10, fontSize: 12 }}>
                      <div>Planned: <strong>{fmt(b.plannedAmount)}</strong></div>
                      <div>Used: <strong>{fmt(b.usedAmount)}</strong></div>
                      <div>Remaining: <strong style={{ color: COLORS.green }}>{fmt(b.remaining)}</strong></div>
                      <div>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{b.statusLabel}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 8, background: COLORS.gray100, borderRadius: 99, height: 6 }}>
                      <div style={{ width: `${Math.min(b.usagePct, 100)}%`, height: "100%", background: b.usagePct >= 100 ? COLORS.red : b.usagePct >= 80 ? COLORS.amber : COLORS.green, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 11, marginTop: 4, color: COLORS.gray400 }}>{b.usagePct}% used</div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ background: COLORS.navy }}>
                {["Budget Line", "Department", "Category", "Planned", "Used", "Remaining", "Usage %", "Status"].map((h) => (
                  <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12 }}>{h}</th>
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
                    No budget lines. Click Create Budget Line to add allocations.
                  </td>
                </tr>
              ) : (
                lines.map((b, i) => {
                  const st = statusStyle(b.statusKey);
                  return (
                    <tr key={b.db_id} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 ? COLORS.gray50 : COLORS.white }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: COLORS.navy }}>{b.lineName}</td>
                      <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.department}</td>
                      <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.budgetCategory}</td>
                      <td style={{ padding: "10px 14px" }}>{fmt(b.plannedAmount)}</td>
                      <td style={{ padding: "10px 14px" }}>{fmt(b.usedAmount)}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: COLORS.green }}>{fmt(b.remaining)}</td>
                      <td style={{ padding: "10px 14px" }}>{b.usagePct}%</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{b.statusLabel}</span>
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
    </div>
  );
}

const btnPrimary = {
  padding: "10px 18px",
  border: "none",
  borderRadius: 8,
  background: COLORS.amber,
  color: COLORS.navy,
  fontWeight: 700,
  fontSize: 13,
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
