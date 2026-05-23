import { useCallback, useEffect, useState } from "react";
import { Bell, PlusCircle, RefreshCw, TriangleAlert } from "lucide-react";
import RegisterBudgetUsageModal from "../components/RegisterBudgetUsageModal";
import BudgetLineModal from "../components/BudgetLineModal";
import { fetchBudgetLinesSummary, fetchBudgetLineUsage } from "../services/budgetLineApi";
import { COLORS, statusStyle } from "../utils/budgetLineConstants";
import { useIsMobile } from "../utils/useIsMobile";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import BudgetPushBanner from "@/shared/BudgetPushBanner";
import BudgetSelectorPanel from "../components/BudgetSelectorPanel";
import BudgetAllocationSummary from "../components/BudgetAllocationSummary";
import { getSelectedBudgetId, setSelectedBudgetId } from "../utils/selectedSchoolBudget";
import SchoolBudgetPageShell from "../components/SchoolBudgetPageShell";
import { sbPageTitleClass, sbPageSubtitleClass, sbSectionTitle, sbKpiValue, sbKpiLabel } from "../utils/schoolBudgetTypography";

export default function BudgetLineTracking({ fmt }) {
  const { staff } = useAuth();
  const isMobile = useIsMobile();
  const [summary, setSummary] = useState(null);
  const [usageHistory, setUsageHistory] = useState([]);
  const [budgetId, setBudgetId] = useState(() => getSelectedBudgetId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [lineModalOpen, setLineModalOpen] = useState(false);

  const handleBudgetChange = (id) => {
    setBudgetId(id);
    setSelectedBudgetId(id);
  };

  const load = useCallback(async () => {
    if (!budgetId) {
      setSummary(null);
      setUsageHistory([]);
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const sum = await fetchBudgetLinesSummary(budgetId);
      setSummary(sum);
      const history = await fetchBudgetLineUsage({ budget_id: budgetId });
      setUsageHistory(history);
      const alerts = (sum.lines || [])
        .filter((l) => l.usagePct >= 80)
        .map((l) => ({
          id: l.db_id,
          msg:
            l.usagePct >= 100
              ? `${l.lineName} budget line has been fully used.`
              : l.usagePct >= 90
                ? `${l.lineName} budget is almost exhausted (${l.usagePct}%).`
                : `${l.lineName} budget has reached ${l.usagePct}% usage.`,
          type: l.usagePct >= 100 ? "danger" : "warning",
        }));
      setNotifications(alerts);
    } catch (e) {
      setError(e.message || "Failed to load tracking data");
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    load();
  }, [load]);

  const lines = summary?.lines || [];

  const onUsageSaved = (res) => {
    if (res?.notification) {
      setNotifications((prev) => [{ id: Date.now(), msg: res.notification, type: "warning" }, ...prev]);
    }
    load();
  };

  return (
    <SchoolBudgetPageShell>
      <div className="mb-4">
        <BudgetPushBanner api={api} />
      </div>
      <div className="sb-page-header flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className={sbPageTitleClass}>Budget Usage Tracking</h2>
          <p className={sbPageSubtitleClass}>Monitor spending and register usage against budget lines</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={load} disabled={loading} style={btnSecondary}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button type="button" onClick={() => setLineModalOpen(true)} disabled={!budgetId} style={btnSecondary}>
            <PlusCircle size={16} /> New Budget Line
          </button>
          <button type="button" onClick={() => setUsageModalOpen(true)} disabled={!lines.length} style={btnPrimary}>
            <PlusCircle size={18} /> Register Usage
          </button>
        </div>
      </div>

      <BudgetSelectorPanel budgetId={budgetId} onBudgetIdChange={handleBudgetChange} fmt={fmt} />

      {budgetId && <BudgetAllocationSummary budgetId={budgetId} fmt={fmt} lines={lines} />}

      {error && (
        <div style={{ marginBottom: 14, padding: 12, background: "#FEE2E2", borderRadius: 8, display: "flex", gap: 8 }}>
          <TriangleAlert size={18} color={COLORS.red} />
          <span style={{ fontSize: 13, color: "#991B1B" }}>{error}</span>
        </div>
      )}

      {notifications.length > 0 && (
        <div style={{ marginBottom: 16, background: "#FFFBEB", border: `1px solid ${COLORS.amber}`, borderRadius: 10, padding: 14 }}>
          <div style={{ ...sbSectionTitle, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Bell size={16} color={COLORS.amber} /> Budget alerts
          </div>
          {notifications.slice(0, 5).map((n) => (
            <div key={n.id} style={{ fontSize: 12, color: n.type === "danger" ? "#991B1B" : "#92400E", marginBottom: 4 }}>
              • {n.msg}
            </div>
          ))}
        </div>
      )}

      <div className="sb-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Budget", value: summary ? fmt(summary.totalBudget) : "—" },
          { label: "Total Used", value: summary ? fmt(summary.totalUsed) : "—" },
          { label: "Remaining Balance", value: summary ? fmt(summary.remainingBalance) : "—" },
          { label: "Usage %", value: summary ? `${summary.usagePct}%` : "—" },
          { label: "Active Lines", value: summary?.activeCount ?? "—" },
          { label: "Exhausted Lines", value: summary?.exhaustedCount ?? "—" },
        ].map((c) => (
          <div key={c.label} style={{ background: COLORS.white, borderRadius: 10, padding: 14, border: `1px solid ${COLORS.gray200}` }}>
            <div style={{ ...sbKpiLabel, marginBottom: 0 }}>{c.label}</div>
            <div style={{ ...sbKpiValue, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ ...sbSectionTitle, marginBottom: 10 }}>Budget usage by line</div>
      <div className="sb-table-scroll" style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
          <thead>
            <tr style={{ background: COLORS.navy }}>
              {["Budget Line", "Allocated", "Used", "Remaining", "Usage %", "Status"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: "center", color: COLORS.gray400 }}>Loading…</td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 28, textAlign: "center", color: COLORS.gray400 }}>No budget lines to track.</td>
              </tr>
            ) : (
              lines.map((b, i) => {
                const st = statusStyle(b.statusKey);
                return (
                  <tr key={b.db_id} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 ? COLORS.gray50 : COLORS.white }}>
                    <td style={{ padding: "10px 14px", fontWeight: 500 }}>{b.lineName}</td>
                    <td style={{ padding: "10px 14px" }}>{fmt(b.plannedAmount)}</td>
                    <td style={{ padding: "10px 14px" }}>{fmt(b.usedAmount)}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, color: COLORS.green }}>{fmt(b.remaining)}</td>
                    <td style={{ padding: "10px 14px", minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, background: COLORS.gray200, borderRadius: 99, height: 6 }}>
                          <div
                            style={{
                              width: `${Math.min(b.usagePct, 100)}%`,
                              height: "100%",
                              background: b.usagePct >= 100 ? COLORS.red : b.usagePct >= 80 ? COLORS.amber : COLORS.green,
                              borderRadius: 99,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 500 }}>{b.usagePct}%</span>
                      </div>
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
      </div>

      <div style={{ ...sbSectionTitle, marginBottom: 10 }}>Recent usage history</div>
      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
        {usageHistory.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: COLORS.gray400, fontSize: 13 }}>No usage recorded yet.</div>
        ) : (
          usageHistory.slice(0, 20).map((u, i) => (
            <div
              key={u.id}
              style={{
                padding: "12px 16px",
                borderBottom: i < usageHistory.length - 1 ? `1px solid ${COLORS.gray100}` : "none",
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: COLORS.navy, fontSize: 13 }}>{u.lineName}</div>
                <div style={{ fontSize: 11, color: COLORS.gray400, marginTop: 2 }}>
                  {u.expenseCategory || "—"} · {u.paymentMethod || "—"} · {u.usageDate}
                </div>
                {u.description && <div style={{ fontSize: 12, color: COLORS.gray600, marginTop: 4 }}>{u.description}</div>}
              </div>
              <div style={{ fontWeight: 600, color: COLORS.amber }}>{fmt(u.usageAmount)}</div>
            </div>
          ))
        )}
      </div>

      <RegisterBudgetUsageModal open={usageModalOpen} onClose={() => setUsageModalOpen(false)} fmt={fmt} lines={lines} onSaved={onUsageSaved} />
      <BudgetLineModal open={lineModalOpen} onClose={() => setLineModalOpen(false)} fmt={fmt} staff={staff} budgetId={budgetId} onSaved={load} />
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
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const btnSecondary = { ...btnPrimary, background: COLORS.white, border: `1px solid ${COLORS.gray200}` };
