import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  PlusCircle, Save, CircleCheck, CircleAlert, TriangleAlert, Check, Download,
  BarChart3, Scale, CircleDollarSign, Receipt, Building2, Search, ClipboardList,
  CalendarDays, Sparkles, Lightbulb, Info, Landmark, TrendingDown, Gem, FileText,
  FileSpreadsheet, X, ArrowDownToLine, ArrowUpFromLine, ScrollText, Pencil,
} from "lucide-react";
import SchoolBudgetTabFrame from "../components/SchoolBudgetTabFrame";
import RegisterBudgetUsageModal from "../components/RegisterBudgetUsageModal";
import { useSchoolBudgetData } from "../context/SchoolBudgetDataContext";
import { COLORS } from "../utils/budgetLineConstants";
const NAVY = "#000435";
const AMBER = COLORS.amber;
const CHART = [AMBER, NAVY];

function fmtDate(d) {
  if (!d) return "â€”";
  try {
    return new Date(d).toLocaleDateString("en-RW", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(d);
  }
}

export function DeptBudgetsPage({ fmt }) {
  const { departmentSpending, budgetLines } = useSchoolBudgetData();
  const deptArr = useMemo(() => {
    if (departmentSpending?.length) {
      return departmentSpending.map((d) => ({
        name: d.department,
        planned: d.planned,
        used: d.used,
        pct: d.planned > 0 ? Math.round((d.used / d.planned) * 100) : 0,
      }));
    }
    const depts = {};
    budgetLines.forEach((b) => {
      const name = b.dept || "Other";
      if (!depts[name]) depts[name] = { planned: 0, used: 0 };
      depts[name].planned += b.planned;
      depts[name].used += b.used;
    });
    return Object.entries(depts)
      .map(([name, d]) => ({ name, ...d, pct: d.planned > 0 ? Math.round((d.used / d.planned) * 100) : 0 }))
      .sort((a, b) => b.planned - a.planned);
  }, [departmentSpending, budgetLines]);

  const barData = deptArr.map((d) => ({ name: d.name.slice(0, 10), planned: d.planned / 1e6, used: d.used / 1e6 }));

  return (
    <SchoolBudgetTabFrame title="Department Budgets" fmt={fmt}>
      {deptArr.length === 0 ? (
        <p style={{ color: COLORS.gray400 }}>No department data for this budget.</p>
      ) : (
        <>
          <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: NAVY, marginBottom: 14, fontSize: 14 }}>Department spending (RWF millions)</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={72} />
                <Tooltip formatter={(v) => `${v.toFixed(1)}M RWF`} />
                <Bar dataKey="planned" fill={NAVY} name="Planned" radius={[0, 3, 3, 0]} />
                <Bar dataKey="used" fill={AMBER} name="Used" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {deptArr.map((d) => (
              <div key={d.name} style={{ background: COLORS.white, borderRadius: 10, padding: 16, border: `1px solid ${COLORS.gray200}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{d.name}</div>
                  <span style={{ fontWeight: 800, color: d.pct >= 90 ? AMBER : NAVY, fontSize: 14 }}>{d.pct}%</span>
                </div>
                <div style={{ background: COLORS.gray100, borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 8 }}>
                  <div style={{ width: `${Math.min(d.pct, 100)}%`, height: "100%", background: d.pct >= 90 ? AMBER : NAVY, borderRadius: 99 }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.gray400 }}>
                  <span>Used: {fmt(d.used)}</span>
                  <span>Budget: {fmt(d.planned)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </SchoolBudgetTabFrame>
  );
}

export function ExpenseTrackingPage({ fmt }) {
  const { budgetLines, recentUsage, reload } = useSchoolBudgetData();
  const [modalOpen, setModalOpen] = useState(false);
  const lines = useMemo(
    () => budgetLines.map((b) => ({ db_id: b.id, id: b.id, lineName: b.name, plannedAmount: b.planned, usedAmount: b.used })),
    [budgetLines]
  );

  return (
    <SchoolBudgetTabFrame title="Expense Tracking" fmt={fmt}>
      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: NAVY, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <PlusCircle size={18} color={NAVY} strokeWidth={2} />
          Record budget usage
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={!lines.length}
          style={{ background: AMBER, color: NAVY, border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: lines.length ? "pointer" : "not-allowed", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <Save size={18} />
          Register usage
        </button>
      </div>

      <RegisterBudgetUsageModal open={modalOpen} onClose={() => setModalOpen(false)} fmt={fmt} lines={lines} onSaved={() => { setModalOpen(false); reload(); }} />

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.gray100}`, fontWeight: 700, color: NAVY }}>Recent usage</div>
        {recentUsage.length === 0 ? (
          <p style={{ padding: 24, color: COLORS.gray400, textAlign: "center" }}>No usage recorded yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.gray50 }}>
                {["Ref", "Description", "Line", "Amount", "Date", "By"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: COLORS.gray600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentUsage.map((e) => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                  <td style={{ padding: "10px 14px", color: AMBER, fontWeight: 700, fontSize: 12 }}>{e.reference}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: NAVY }}>{e.description || "â€”"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: "#FEF3C7", color: NAVY, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{e.lineName}</span>
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: NAVY }}>{fmt(e.amount)}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.gray400, fontSize: 12 }}>{fmtDate(e.usageDate)}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.gray600, fontSize: 12 }}>{e.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </SchoolBudgetTabFrame>
  );
}

export function BudgetVsActualPage({ fmt }) {
  const { budgetLines } = useSchoolBudgetData();
  const data = budgetLines.map((b) => ({
    name: b.name.length > 18 ? `${b.name.slice(0, 16)}â€¦` : b.name,
    planned: b.planned,
    used: b.used,
    variance: b.planned - b.used,
    pct: b.planned > 0 ? Math.round((b.used / b.planned) * 100) : 0,
  }));
  const chartData = data.map((d) => ({ name: d.name, Planned: d.planned / 1e6, Actual: d.used / 1e6 }));

  return (
    <SchoolBudgetTabFrame title="Budget vs Actual" fmt={fmt}>
      {data.length === 0 ? (
        <p style={{ color: COLORS.gray400 }}>Add budget lines to compare planned vs actual.</p>
      ) : (
        <>
          <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
                <YAxis tickFormatter={(v) => `${v}M`} />
                <Tooltip formatter={(v) => `${v.toFixed(1)}M RWF`} />
                <Legend />
                <Bar dataKey="Planned" fill={NAVY} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual" fill={AMBER} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: NAVY }}>
                  {["Line", "Planned", "Used", "Variance", "Usage %", "Status"].map((h) => (
                    <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => {
                  const over = d.pct >= 100;
                  const warn = d.pct >= 80 && d.pct < 100;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 ? COLORS.gray50 : COLORS.white }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: NAVY }}>{d.name}</td>
                      <td style={{ padding: "10px 14px" }}>{fmt(d.planned)}</td>
                      <td style={{ padding: "10px 14px" }}>{fmt(d.used)}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: d.variance >= 0 ? NAVY : AMBER }}>{fmt(d.variance)}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: over ? AMBER : NAVY }}>{d.pct}%</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ background: over ? "#FEF3C7" : warn ? "#FFFBEB" : "#F3F4F6", color: NAVY, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                          {over ? "Over" : warn ? "Warning" : "On track"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </SchoolBudgetTabFrame>
  );
}

export function FinancialReportsPage({ fmt }) {
  const { activeBudget, totalExpectedIncome, totalAllocated, totalUsed, availableBalance } = useSchoolBudgetData();
  const reports = [
    { title: "Budget summary", desc: "Overview of lines and totals", Icon: BarChart3 },
    { title: "Budget vs actual", desc: "Planned vs recorded usage", Icon: Scale },
    { title: "Income sources", desc: "Expected income breakdown", Icon: CircleDollarSign },
    { title: "Usage / expenditure", desc: "Recorded line usage", Icon: Receipt },
    { title: "Department spending", desc: "By department", Icon: Building2 },
    { title: "Audit trail", desc: "Budget-related activity", Icon: Search },
  ];
  const period = activeBudget ? `${activeBudget.term} Â· ${activeBudget.academicYear}` : "Select a budget";

  return (
    <SchoolBudgetTabFrame title="Financial Reports" fmt={fmt} requireBudget={false}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
        {reports.map((r) => {
          const Icon = r.Icon;
          return (
            <div key={r.title} style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={22} color={NAVY} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: COLORS.gray400 }}>{r.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ background: NAVY, borderRadius: 12, padding: 20, color: COLORS.white }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: AMBER }}>Quick summary â€” {period}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 14 }}>
          {[
            { label: "Expected income", value: fmt(totalExpectedIncome) },
            { label: "Allocated", value: fmt(totalAllocated) },
            { label: "Used", value: fmt(totalUsed) },
            { label: "Available", value: fmt(availableBalance) },
          ].map((s) => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, opacity: 0.85 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </SchoolBudgetTabFrame>
  );
}

export function AnalyticsPage({ fmt, fmtShort }) {
  const { incomeSources, monthlyData, alerts, budgetLines } = useSchoolBudgetData();
  const incomeChartData = incomeSources.map((i) => ({
    name: i.name.length > 12 ? `${i.name.slice(0, 10)}â€¦` : i.name,
    expected: i.amount / 1e6,
    collected: i.collected / 1e6,
  }));

  return (
    <SchoolBudgetTabFrame title="Budget Analytics" fmt={fmt}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: NAVY, marginBottom: 14 }}>Income sources (M RWF)</div>
          {incomeChartData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={incomeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tickFormatter={(v) => `${v}M`} />
                <Bar dataKey="expected" fill={NAVY} name="Expected" />
                <Bar dataKey="collected" fill={AMBER} name="Recorded" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: COLORS.gray400, textAlign: "center", padding: 32 }}>No income sources</p>
          )}
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: NAVY, marginBottom: 14 }}>Monthly spending</div>
          {monthlyData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={fmtShort} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Area type="monotone" dataKey="expenses" stroke={AMBER} fill="#FEF3C7" name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: COLORS.gray400, textAlign: "center", padding: 32 }}>No usage by month yet</p>
          )}
        </div>
      </div>
      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}` }}>
        <div style={{ fontWeight: 700, color: NAVY, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} /> Insights
        </div>
        {alerts.length === 0 && budgetLines.length === 0 ? (
          <p style={{ color: COLORS.gray400 }}>No insights yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {alerts.map((a) => (
              <div key={a.id} style={{ borderRadius: 10, padding: 14, background: "#FFFBEB", border: `1px solid ${AMBER}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: NAVY }}>{a.type === "danger" ? "Alert" : "Notice"}</div>
                <div style={{ fontSize: 12, color: COLORS.gray600, marginTop: 4 }}>{a.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SchoolBudgetTabFrame>
  );
}

export function BalanceSheetPage({ fmt }) {
  const { financials, activeBudget } = useSchoolBudgetData();
  const { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, totalCurrentAssets, totalFixedAssets } = financials;
  const equationOk = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1000;
  const assetPie = [
    { name: "Current", value: totalCurrentAssets },
    { name: "Fixed", value: totalFixedAssets },
  ].filter((x) => x.value > 0);

  return (
    <SchoolBudgetTabFrame
      title="Balance Sheet"
      subtitle={activeBudget ? `Budget-based view Â· ${activeBudget.term} ${activeBudget.academicYear}` : "Budget-based financial position"}
      fmt={fmt}
      requireBudget={false}
    >
      <div style={{ background: equationOk ? "#FFFBEB" : "#FEE2E2", borderRadius: 10, padding: "12px 18px", marginBottom: 20, border: `1px solid ${AMBER}` }}>
        <span style={{ fontWeight: 700, color: NAVY, fontSize: 14 }}>
          {equationOk ? "Balanced" : "Check totals"} â€” Assets {fmt(totalAssets)} = Liabilities {fmt(totalLiabilities)} + Equity {fmt(totalEquity)}
        </span>
      </div>
      <p style={{ fontSize: 12, color: COLORS.gray400, marginBottom: 16 }}>Derived from school budget data (not full general ledger).</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total assets", value: fmt(totalAssets), accent: NAVY },
          { label: "Liabilities", value: fmt(totalLiabilities), accent: AMBER },
          { label: "Equity", value: fmt(totalEquity), accent: NAVY },
        ].map((c) => (
          <div key={c.label} style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, borderTop: `4px solid ${c.accent}` }}>
            <div style={{ fontSize: 11, color: COLORS.gray400, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.accent, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
          <div style={{ background: NAVY, padding: "12px 18px", color: AMBER, fontWeight: 800 }}>ASSETS</div>
          {assets.current.map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 13 }}>
              <span>{a.name}</span>
              <span style={{ fontWeight: 600, color: NAVY }}>{fmt(a.value)}</span>
            </div>
          ))}
          {assets.current.length === 0 && <p style={{ padding: 16, color: COLORS.gray400 }}>No current assets from budget.</p>}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", background: NAVY, color: COLORS.white, fontWeight: 800 }}>
            <span>Total assets</span>
            <span style={{ color: AMBER }}>{fmt(totalAssets)}</span>
          </div>
        </div>
        {assetPie.length > 0 && (
          <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
            <ResponsiveContainer width="100%" height={180}>
              <RechartsPie>
                <Pie data={assetPie} dataKey="value" outerRadius={70} label>
                  {assetPie.map((_, i) => (
                    <Cell key={i} fill={CHART[i % 2]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
          <div style={{ background: AMBER, padding: "12px 18px", color: NAVY, fontWeight: 800 }}>LIABILITIES</div>
          {liabilities.current.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", fontSize: 13 }}>
              <span>{l.name}</span>
              <span style={{ fontWeight: 600 }}>{fmt(l.amount)}</span>
            </div>
          ))}
          {liabilities.current.length === 0 && <p style={{ padding: 16, color: COLORS.gray400 }}>None recorded</p>}
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
          <div style={{ background: NAVY, padding: "12px 18px", color: AMBER, fontWeight: 800 }}>EQUITY</div>
          {equity.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", fontSize: 13 }}>
              <span>{e.name}</span>
              <span style={{ fontWeight: 600, color: NAVY }}>{fmt(e.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </SchoolBudgetTabFrame>
  );
}

export function AssetRegisterPage({ fmt }) {
  const { financials } = useSchoolBudgetData();
  const rows = financials.assets.current.map((a) => ({ ...a, category: "Budget" }));

  return (
    <SchoolBudgetTabFrame title="Asset Register" fmt={fmt} requireBudget={false}>
      <p style={{ fontSize: 13, color: COLORS.gray400, marginBottom: 16 }}>Budget-derived balances only. Fixed asset register is not connected yet.</p>
      {rows.length === 0 ? (
        <p style={{ color: COLORS.gray400 }}>No assets to display.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: COLORS.white, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.gray200}` }}>
          <thead>
            <tr style={{ background: NAVY }}>
              {["Name", "Category", "Value"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: NAVY }}>{a.name}</td>
                <td style={{ padding: "10px 14px" }}>{a.category}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700 }}>{fmt(a.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SchoolBudgetTabFrame>
  );
}

export function LiabilitiesPage({ fmt }) {
  const { financials } = useSchoolBudgetData();
  const { liabilities, totalLiabilities, totalCurrentLiab } = financials;

  return (
    <SchoolBudgetTabFrame title="Liabilities" fmt={fmt} requireBudget={false}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 20 }}>
        <div style={{ background: COLORS.white, padding: 16, borderRadius: 10, borderLeft: `4px solid ${AMBER}` }}>
          <div style={{ fontSize: 11, color: COLORS.gray400 }}>Total liabilities</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{fmt(totalLiabilities)}</div>
        </div>
        <div style={{ background: COLORS.white, padding: 16, borderRadius: 10, borderLeft: `4px solid ${NAVY}` }}>
          <div style={{ fontSize: 11, color: COLORS.gray400 }}>Current</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: NAVY }}>{fmt(totalCurrentLiab)}</div>
        </div>
      </div>
      {liabilities.current.length === 0 ? (
        <p style={{ color: COLORS.gray400 }}>No liabilities from budget usage.</p>
      ) : (
        liabilities.current.map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.gray100}` }}>
            <span style={{ fontWeight: 600, color: NAVY }}>{l.name}</span>
            <span style={{ fontWeight: 700 }}>{fmt(l.amount)}</span>
          </div>
        ))
      )}
    </SchoolBudgetTabFrame>
  );
}

export function EquityPage({ fmt }) {
  const { financials } = useSchoolBudgetData();
  const { equity, totalEquity, totalAssets, totalLiabilities } = financials;

  return (
    <SchoolBudgetTabFrame title="Equity" fmt={fmt} requireBudget={false}>
      <div style={{ background: NAVY, borderRadius: 12, padding: 20, color: COLORS.white, marginBottom: 20 }}>
        <div style={{ color: AMBER, fontWeight: 700, marginBottom: 8 }}>Assets âˆ’ Liabilities = Equity</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(totalAssets)} âˆ’ {fmt(totalLiabilities)} = {fmt(totalEquity)}</div>
      </div>
      {equity.map((e, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.gray100}` }}>
          <span style={{ fontWeight: 600, color: NAVY }}>{e.name}</span>
          <span style={{ fontWeight: 800, color: NAVY }}>{fmt(e.amount)}</span>
        </div>
      ))}
    </SchoolBudgetTabFrame>
  );
}

export function ReceivablesPage({ fmt }) {
  const { incomeSources, financials } = useSchoolBudgetData();
  const totalExpected = incomeSources.reduce((s, i) => s + i.amount, 0);
  const totalCollected = incomeSources.reduce((s, i) => s + i.collected, 0);
  const totalReceivable = Math.max(0, totalExpected - totalCollected);
  const payables = financials.liabilities.current;

  return (
    <SchoolBudgetTabFrame title="Receivables & Payables" fmt={fmt}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Expected", value: fmt(totalExpected), accent: NAVY },
          { label: "Recorded", value: fmt(totalCollected), accent: AMBER },
          { label: "Gap", value: fmt(totalReceivable), accent: NAVY },
          { label: "Payables", value: fmt(payables.reduce((s, p) => s + p.amount, 0)), accent: AMBER },
        ].map((c) => (
          <div key={c.label} style={{ background: COLORS.white, padding: 14, borderRadius: 10, borderLeft: `4px solid ${c.accent}` }}>
            <div style={{ fontSize: 10, color: COLORS.gray400, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: c.accent, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
          <div style={{ background: NAVY, padding: "12px 18px", color: AMBER, fontWeight: 800 }}>Income sources</div>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <tbody>
              {incomeSources.map((inc, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{inc.name}</td>
                  <td style={{ padding: "10px 14px" }}>{fmt(inc.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
          <div style={{ background: AMBER, padding: "12px 18px", color: NAVY, fontWeight: 800 }}>Payables</div>
          {payables.length === 0 ? (
            <p style={{ padding: 16, color: COLORS.gray400 }}>None</p>
          ) : (
            payables.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", fontSize: 13 }}>
                <span>{l.name}</span>
                <span style={{ fontWeight: 700 }}>{fmt(l.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </SchoolBudgetTabFrame>
  );
}

export function AuditLogsPage({ fmt }) {
  const { auditLogs } = useSchoolBudgetData();

  return (
    <SchoolBudgetTabFrame title="Audit Logs" fmt={fmt} requireBudget={false}>
      {auditLogs.length === 0 ? (
        <p style={{ color: COLORS.gray400 }}>No budget audit entries yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, background: COLORS.white, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.gray200}` }}>
          <thead>
            <tr style={{ background: NAVY }}>
              {["Time", "User", "Action", "Type"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log) => (
              <tr key={log.id} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                <td style={{ padding: "12px 14px", color: COLORS.gray400, fontSize: 12 }}>{fmtDate(log.date)}</td>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: NAVY }}>{log.user}</td>
                <td style={{ padding: "12px 14px" }}>{log.action}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: "#FEF3C7", color: NAVY, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{log.type}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SchoolBudgetTabFrame>
  );
}

export function ApprovalsPage({ fmt }) {
  const { activeBudget, totalAllocated } = useSchoolBudgetData();
  if (!activeBudget) {
    return (
      <SchoolBudgetTabFrame title="Budget Approvals" fmt={fmt}>
        <p style={{ color: COLORS.gray400 }}>Select a budget to view approval status.</p>
      </SchoolBudgetTabFrame>
    );
  }
  const status = String(activeBudget.status || "").toLowerCase();
  const steps = [
    { label: "Created", done: true, date: fmtDate(activeBudget.createdAt), role: activeBudget.preparedByName || "Accountant" },
    { label: "Submitted", done: Boolean(activeBudget.submittedAt), date: fmtDate(activeBudget.submittedAt), role: "Accountant" },
    {
      label: "Manager review",
      done: ["approved", "rejected", "closed"].includes(status) || Boolean(activeBudget.managerReviewedAt),
      date: fmtDate(activeBudget.managerReviewedAt),
      role: "School manager",
    },
    { label: "Active", done: status === "approved", date: status === "approved" ? fmtDate(activeBudget.updatedAt) : "â€”", role: "System" },
  ];

  return (
    <SchoolBudgetTabFrame title="Budget Approvals" fmt={fmt}>
      <div style={{ background: COLORS.white, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: NAVY, fontSize: 16 }}>{activeBudget.title}</div>
        <div style={{ fontSize: 13, color: COLORS.gray400, marginTop: 4 }}>
          {activeBudget.term} Â· {activeBudget.academicYear} Â· {fmt(totalAllocated)} allocated
        </div>
        <span style={{ display: "inline-block", marginTop: 10, background: "#FEF3C7", color: NAVY, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          {activeBudget.statusLabel || activeBudget.status}
        </span>
        {activeBudget.managerReviewNotes && (
          <p style={{ marginTop: 12, fontSize: 13, color: COLORS.gray600 }}>Manager notes: {activeBudget.managerReviewNotes}</p>
        )}
        <div style={{ display: "flex", gap: 0, marginTop: 24, flexWrap: "wrap" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: "1 1 120px", textAlign: "center", padding: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", margin: "0 auto", background: s.done ? AMBER : COLORS.gray200, color: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                {s.done ? <Check size={18} /> : i + 1}
              </div>
              <div style={{ fontWeight: 600, fontSize: 12, marginTop: 8, color: NAVY }}>{s.label}</div>
              <div style={{ fontSize: 11, color: COLORS.gray400 }}>{s.role}</div>
              <div style={{ fontSize: 11, color: NAVY }}>{s.date}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: "#FFFBEB", borderRadius: 10, padding: "14px 18px", border: `1px solid ${AMBER}` }}>
        <TriangleAlert size={20} color={NAVY} style={{ verticalAlign: "middle", marginRight: 8 }} />
        <span style={{ fontSize: 13, color: NAVY }}>Approval is managed by the school manager. Use Manager Review for approve/reject actions.</span>
      </div>
    </SchoolBudgetTabFrame>
  );
}

