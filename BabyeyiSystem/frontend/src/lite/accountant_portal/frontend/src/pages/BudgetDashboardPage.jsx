import { useMemo } from "react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  CircleDollarSign,
  ClipboardList,
  Receipt,
  Landmark,
  BarChart3,
  Download,
  RefreshCw,
  TriangleAlert,
  CircleAlert,
  Info,
  Loader2,
  Wallet,
  TrendingUp,
  Building2,
  FileText,
} from "lucide-react";
import BudgetSelectorPanel from "../components/BudgetSelectorPanel";
import { useSchoolBudgetData } from "../context/SchoolBudgetDataContext";
import { COLORS } from "../utils/budgetLineConstants";
import { useIsMobile } from "../utils/useIsMobile";

const CHART_COLORS = ["#F59E0B", "#000435"];

function statusBadgeStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return { bg: "#D1FAE5", color: "#065F46" };
  if (s === "pending_approval") return { bg: "#FEF3C7", color: "#92400E" };
  if (s === "rejected") return { bg: "#FEE2E2", color: "#991B1B" };
  if (s === "draft") return { bg: "#E0E7FF", color: "#3730A3" };
  return { bg: COLORS.gray100, color: COLORS.gray600 };
}

function AlertIcon({ type }) {
  if (type === "danger") return <CircleAlert size={16} color={COLORS.red} strokeWidth={2} aria-hidden />;
  if (type === "warning") return <TriangleAlert size={16} color={COLORS.amberDark} strokeWidth={2} aria-hidden />;
  return <Info size={16} color={COLORS.blue} strokeWidth={2} aria-hidden />;
}

export default function BudgetDashboardPage({ fmt, fmtShort }) {
  const isMobile = useIsMobile();
  const {
    data,
    budgetId,
    setBudgetId,
    loading,
    error,
    reload,
    activeBudget,
    budgetLines,
    incomeSources,
    monthlyData,
    departmentSpending,
    alerts,
    schoolOverview,
    recentBudgets,
    totalExpectedIncome,
    totalCollected,
    totalAllocated,
    totalUsed,
    remainingUnallocated,
    availableBalance,
    usagePct,
  } = useSchoolBudgetData();

  const incomePct = totalExpectedIncome > 0 ? Math.round((totalCollected / totalExpectedIncome) * 100) : 0;
  const allocPct = totalExpectedIncome > 0 ? Math.round((totalAllocated / totalExpectedIncome) * 100) : 0;

  const pieData = useMemo(
    () => budgetLines.slice(0, 8).map((b) => ({ name: b.name, value: b.planned })).filter((x) => x.value > 0),
    [budgetLines]
  );

  const barData = useMemo(
    () =>
      budgetLines.slice(0, 8).map((b) => ({
        name: b.name.length > 12 ? `${b.name.slice(0, 10)}…` : b.name,
        planned: b.planned / 1e6,
        used: b.used / 1e6,
      })),
    [budgetLines]
  );

  const deptBarData = useMemo(
    () =>
      departmentSpending.slice(0, 8).map((d) => ({
        name: (d.department || "Other").slice(0, 10),
        planned: d.planned / 1e6,
        used: d.used / 1e6,
      })),
    [departmentSpending]
  );

  const statusStyle = statusBadgeStyle(activeBudget?.status);

  const NAVY = "#000435";
  const AMBER = COLORS.amber;
  const cards = [
    {
      label: "Expected Income",
      value: fmt(totalExpectedIncome),
      Icon: CircleDollarSign,
      color: NAVY,
      sub: activeBudget ? `${activeBudget.term} · ${activeBudget.academicYear}` : "All school budgets",
    },
    {
      label: "Income Sources",
      value: fmt(totalCollected),
      Icon: Wallet,
      color: AMBER,
      sub: incomeSources.length ? `${incomeSources.length} sources · ${incomePct}% of target` : "No income rows yet",
    },
    {
      label: "Allocated to Lines",
      value: fmt(totalAllocated),
      Icon: ClipboardList,
      color: NAVY,
      sub: `${allocPct}% of expected income`,
    },
    {
      label: "Spent (Usage)",
      value: fmt(totalUsed),
      Icon: Receipt,
      color: AMBER,
      sub: `${usagePct}% of allocated`,
    },
    {
      label: "Available Balance",
      value: fmt(availableBalance),
      Icon: Landmark,
      color: NAVY,
      sub: "Remaining in budget lines",
    },
    {
      label: "Unallocated",
      value: fmt(remainingUnallocated),
      Icon: BarChart3,
      color: AMBER,
      sub: "Income not yet on lines",
    },
  ];

  if (loading && !data) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 12 }}>
        <Loader2 size={36} color={COLORS.amber} style={{ animation: "bd-spin 1s linear infinite" }} />
        <div style={{ color: COLORS.gray600, fontWeight: 600 }}>Loading budget dashboard…</div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes bd-spin { to { transform: rotate(360deg); } }
        .bd-hero { background: linear-gradient(135deg, ${COLORS.navy} 0%, #1e3a5f 55%, #0f172a 100%); }
        .bd-kpi:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,4,53,0.08); }
        .bd-kpi { transition: transform 0.2s, box-shadow 0.2s; }
      `}</style>

      <div className="bd-hero" style={{ borderRadius: 16, padding: isMobile ? "18px 16px" : "24px 28px", marginBottom: 20, color: COLORS.white }}>
        <div className="sb-page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.75, marginBottom: 6 }}>
              School Budget
            </div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 22 : 28, fontWeight: 800, lineHeight: 1.2 }}>Budget Dashboard</h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, opacity: 0.85 }}>
              {activeBudget
                ? `${activeBudget.title} · ${activeBudget.term} · ${activeBudget.academicYear}`
                : "Select a budget to view detailed analytics"}
            </p>
            {activeBudget?.budgetCode && (
              <span style={{ display: "inline-block", marginTop: 10, fontSize: 12, background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 6 }}>
                {activeBudget.budgetCode}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {activeBudget && (
              <span style={{ background: statusStyle.bg, color: statusStyle.color, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>
                {activeBudget.statusLabel || activeBudget.status}
              </span>
            )}
            <button
              type="button"
              onClick={reload}
              disabled={loading}
              style={{
                background: "rgba(255,255,255,0.12)",
                color: COLORS.white,
                border: "1px solid rgba(255,255,255,0.25)",
                borderRadius: 8,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: loading ? "wait" : "pointer",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RefreshCw size={15} strokeWidth={2.5} style={loading ? { animation: "bd-spin 1s linear infinite" } : undefined} />
              Refresh
            </button>
            <button
              type="button"
              style={{
                background: COLORS.amber,
                color: COLORS.navy,
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Download size={16} strokeWidth={2.5} aria-hidden />
              Export
            </button>
          </div>
        </div>

        {!activeBudget && (
          <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", minWidth: 120 }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Total budgets</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{schoolOverview.totalBudgets ?? 0}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", minWidth: 120 }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Pending approval</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{schoolOverview.pendingApprovals ?? 0}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", minWidth: 120 }}>
              <div style={{ fontSize: 11, opacity: 0.8 }}>Approved</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{schoolOverview.approvedCount ?? 0}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <BudgetSelectorPanel budgetId={budgetId} onBudgetIdChange={setBudgetId} fmt={fmt} />
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span>{error}</span>
          <button type="button" onClick={reload} style={{ background: COLORS.white, border: "none", borderRadius: 6, padding: "6px 12px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
            Retry
          </button>
        </div>
      )}

      {!activeBudget && !loading && (
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 40, textAlign: "center", border: `1px solid ${COLORS.gray200}` }}>
          <FileText size={40} color={COLORS.gray400} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 16 }}>No budget selected</div>
          <p style={{ color: COLORS.gray600, fontSize: 14, marginTop: 8 }}>Create a budget or pick one above to see income, lines, and spending charts.</p>
        </div>
      )}

      {activeBudget && (
        <>
          <div style={{ background: COLORS.white, borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: `1px solid ${COLORS.gray200}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontWeight: 600, color: COLORS.navy, fontSize: 14 }}>Overall budget usage</span>
              <span style={{ fontWeight: 700, color: usagePct > 90 ? "#000435" : COLORS.amber, fontSize: 14 }}>{usagePct}%</span>
            </div>
            <div style={{ background: COLORS.gray100, borderRadius: 99, height: 10, overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(usagePct, 100)}%`,
                  height: "100%",
                  background: usagePct > 90 ? "#000435" : `linear-gradient(90deg, ${COLORS.amber}, ${COLORS.amberDark})`,
                  borderRadius: 99,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: COLORS.gray400 }}>
              <span>Used: {fmt(totalUsed)}</span>
              <span>Allocated: {fmt(totalAllocated)}</span>
            </div>
          </div>

          <div className="sb-grid-3" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
            {cards.map((c, i) => {
              const CardIcon = c.Icon;
              return (
                <div key={i} className="bd-kpi" style={{ background: COLORS.white, borderRadius: 12, padding: "16px 18px", border: `1px solid ${COLORS.gray200}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 11, color: COLORS.gray400, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                    <CardIcon size={22} color={c.color} strokeWidth={2} aria-hidden />
                  </div>
                  <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: COLORS.navy, marginTop: 6 }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: c.color, marginTop: 4, fontWeight: 600 }}>{c.sub}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 16, marginBottom: 20 }}>
            <div className="sb-grid-2" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
                <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={18} color={COLORS.amber} />
                  Allocation by line
                </div>
                {pieData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPie>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={78} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: COLORS.gray400, fontSize: 13, textAlign: "center", padding: 40 }}>Add budget lines to see allocation.</p>
                )}
              </div>

              <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
                <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Monthly spending</div>
                {monthlyData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
                      <Tooltip formatter={(v) => fmt(v)} />
                      <Area type="monotone" dataKey="expenses" stroke="#000435" fill="#E5E7EB" name="Expenses" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: COLORS.gray400, fontSize: 13, textAlign: "center", padding: 40 }}>Record usage to see monthly trends.</p>
                )}
              </div>
            </div>

            <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 12, fontSize: 14 }}>Alerts</div>
              {alerts.length === 0 ? (
                <p style={{ color: COLORS.gray400, fontSize: 13 }}>No alerts for this budget.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {alerts.slice(0, 6).map((a) => (
                    <li key={a.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 12 }}>
                      <AlertIcon type={a.type} />
                      <span style={{ color: COLORS.gray800 }}>{a.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {deptBarData.length > 0 && (
            <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Building2 size={18} color={COLORS.navy} />
                Department spending (RWF millions)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v.toFixed(1)}M RWF`} />
                  <Bar dataKey="planned" fill={COLORS.navy} name="Planned" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="used" fill={COLORS.amber} name="Used" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Top lines: planned vs used (RWF millions)</div>
            {barData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v.toFixed(1)}M RWF`} />
                  <Bar dataKey="planned" fill={COLORS.navy} name="Planned" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="used" fill={COLORS.amber} name="Used" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: COLORS.gray400, fontSize: 13 }}>No budget lines yet.</p>
            )}
          </div>

          {recentBudgets.length > 0 && (
            <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", fontWeight: 700, color: COLORS.navy, borderBottom: `1px solid ${COLORS.gray200}` }}>Recent budgets</div>
              <div className="sb-table-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: COLORS.gray50 }}>
                      {["Title", "Term", "Year", "Status", "Expected income"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: COLORS.gray600 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentBudgets.map((b) => {
                      const st = statusBadgeStyle(b.status);
                      return (
                        <tr key={b.id} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: COLORS.navy }}>{b.title}</td>
                          <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.term}</td>
                          <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.academicYear}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                              {b.statusLabel || b.status}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: COLORS.gray800 }}>{fmt(b.totalExpectedIncome)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
