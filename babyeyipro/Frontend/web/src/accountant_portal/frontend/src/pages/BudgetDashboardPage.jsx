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
  PieChart,
} from "lucide-react";
import BudgetSelectorPanel from "../components/BudgetSelectorPanel";
import AccountantBudgetHeroShell from "../components/AccountantBudgetHeroShell";
import { useSchoolBudgetData } from "../context/SchoolBudgetDataContext";
import { COLORS } from "../utils/budgetLineConstants";
import { useIsMobile } from "../utils/useIsMobile";
import { sbSectionTitle, sbBody } from "../utils/schoolBudgetTypography";

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

  const heroKpiTiles = [
    {
      key: "expected",
      label: "Expected income",
      value: `${fmtShort(totalExpectedIncome)} RWF`,
      subValue: activeBudget ? `${activeBudget.term} · ${activeBudget.academicYear}` : "All school budgets",
      icon: CircleDollarSign,
    },
    {
      key: "collected",
      label: "Income collected",
      value: `${fmtShort(totalCollected)} RWF`,
      subValue: incomeSources.length ? `${incomePct}% of target` : "No income rows",
      icon: Wallet,
    },
    {
      key: "allocated",
      label: "Allocated to lines",
      value: `${fmtShort(totalAllocated)} RWF`,
      subValue: `${allocPct}% of expected`,
      icon: ClipboardList,
    },
    {
      key: "spent",
      label: "Spent (usage)",
      value: `${fmtShort(totalUsed)} RWF`,
      subValue: `${usagePct}% of allocated`,
      icon: Receipt,
    },
    {
      key: "balance",
      label: "Available balance",
      value: `${fmtShort(availableBalance)} RWF`,
      subValue: "In budget lines",
      icon: Landmark,
    },
    {
      key: "unalloc",
      label: "Unallocated",
      value: `${fmtShort(remainingUnallocated)} RWF`,
      subValue: "Not on lines yet",
      icon: BarChart3,
    },
  ];

  const heroHeaderRight = (
    <>
      <div className="flex bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-widest text-white/90">
          {loading ? "Updating…" : "Live data"}
        </span>
      </div>
      {activeBudget ? (
        <span
          className="rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          {activeBudget.statusLabel || activeBudget.status}
        </span>
      ) : null}
      <button
        type="button"
        onClick={reload}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all active:scale-95 disabled:opacity-60"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        Refresh
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-xl bg-[#FEBF10] px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-[#000435] hover:bg-amber-300 transition-all"
      >
        <Download size={14} />
        Export
      </button>
    </>
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-3 font-sans" style={{ fontFamily: "'Montserrat', sans-serif" }}>
        <Loader2 size={36} className="text-[#F59E0B] animate-spin" />
        <p className="text-[11px] font-medium text-slate-500">Loading budget dashboard…</p>
      </div>
    );
  }

  const pageContent = (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      <div className="mb-5">
        <BudgetSelectorPanel budgetId={budgetId} onBudgetIdChange={setBudgetId} fmt={fmt} />
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span>{error}</span>
          <button type="button" onClick={reload} className="rounded-lg bg-white px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#000435] hover:bg-slate-50 transition">
            Retry
          </button>
        </div>
      )}

      {!activeBudget && !loading && (
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 40, textAlign: "center", border: `1px solid ${COLORS.gray200}` }}>
          <FileText size={40} color={COLORS.gray400} style={{ margin: "0 auto 12px" }} />
          <div style={{ fontWeight: 500, color: COLORS.navy, fontSize: 16 }}>No budget selected</div>
          <p style={{ color: COLORS.gray600, fontSize: 14, marginTop: 8 }}>Create a budget or pick one above to see income, lines, and spending charts.</p>
        </div>
      )}

      {activeBudget && (
        <>
          <div style={{ background: COLORS.white, borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: `1px solid ${COLORS.gray200}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <span style={{ ...sbSectionTitle }}>Overall budget usage</span>
              <span style={{ ...sbSectionTitle, color: usagePct > 90 ? "#000435" : COLORS.amber }}>{usagePct}%</span>
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

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 16, marginBottom: 20 }}>
            <div className="sb-grid-2" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
                <div style={{ ...sbSectionTitle, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
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
                <div style={{ ...sbSectionTitle, marginBottom: 14 }}>Monthly spending</div>
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
              <div style={{ ...sbSectionTitle, marginBottom: 12 }}>Alerts</div>
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
              <div style={{ ...sbSectionTitle, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
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
            <div style={{ ...sbSectionTitle, marginBottom: 14 }}>Top lines: planned vs used (RWF millions)</div>
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
              <div style={{ padding: "14px 18px", ...sbSectionTitle, borderBottom: `1px solid ${COLORS.gray200}` }}>Recent budgets</div>
              <div className="sb-table-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: COLORS.gray50 }}>
                      {["Title", "Term", "Year", "Status", "Expected income"].map((h) => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, color: COLORS.gray600 }}>
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
                          <td style={{ padding: "10px 14px", fontWeight: 500, color: COLORS.navy }}>{b.title}</td>
                          <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.term}</td>
                          <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.academicYear}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <span style={{ background: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 500 }}>
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

      {!activeBudget && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total budgets", value: schoolOverview.totalBudgets ?? 0 },
            { label: "Pending approval", value: schoolOverview.pendingApprovals ?? 0 },
            { label: "Approved", value: schoolOverview.approvedCount ?? 0 },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="text-lg font-semibold text-[#000435] mt-1 tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <style>{`@keyframes bd-spin { to { transform: rotate(360deg); } }`}</style>
      <AccountantBudgetHeroShell
        eyebrow="Finance · School budget"
        title="Budget dashboard"
        subtitle={
          activeBudget
            ? `${activeBudget.title} · ${activeBudget.term} · ${activeBudget.academicYear}${activeBudget.budgetCode ? ` · ${activeBudget.budgetCode}` : ""}`
            : "Select a budget to view income, lines, and spending analytics"
        }
        HeroIcon={PieChart}
        headerRight={heroHeaderRight}
        kpiTiles={heroKpiTiles}
        kpiGridClassName="grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"
        pageBody={pageContent}
        outerClassName="min-h-full bg-slate-100"
      />
    </>
  );
}
