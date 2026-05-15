import { useState } from "react";
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
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  LayoutDashboard,
  PlusCircle,
  Plus,
  ClipboardList,
  Building2,
  Receipt,
  Scale,
  BadgeCheck,
  FileText,
  TrendingUp,
  Landmark,
  Package,
  TrendingDown,
  Gem,
  ArrowLeftRight,
  ScrollText,
  GraduationCap,
  PanelLeft,
  Bell,
  Download,
  CircleDollarSign,
  Check,
  Wallet,
  BarChart3,
  CalendarDays,
  School,
  Save,
  TriangleAlert,
  Sparkles,
  FileSpreadsheet,
  Pencil,
  Search,
  CircleAlert,
  CircleCheck,
  Lightbulb,
  Info,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
} from "lucide-react";

const COLORS = {
  navy: "#000435",
  amber: "#F59E0B",
  amberLight: "#FDE68A",
  amberDark: "#B45309",
  white: "#FFFFFF",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray400: "#9CA3AF",
  gray600: "#4B5563",
  gray800: "#1F2937",
  green: "#10B981",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#8B5CF6",
};

const fmt = (n) => new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(n) + " RWF";
const fmtShort = (n) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n;
};

const SIDEBAR_ITEMS = [
  {
    section: "Budget Management",
    items: [
      { id: "budget-dashboard", label: "Dashboard", Icon: LayoutDashboard },
      { id: "create-budget", label: "Create Budget", Icon: PlusCircle },
      { id: "budget-lines", label: "Budget Lines", Icon: ClipboardList },
      { id: "dept-budgets", label: "Department Budgets", Icon: Building2 },
      { id: "expense-tracking", label: "Expense Tracking", Icon: Receipt },
      { id: "budget-vs-actual", label: "Budget vs Actual", Icon: Scale },
      { id: "approvals", label: "Approvals", Icon: BadgeCheck },
      { id: "financial-reports", label: "Financial Reports", Icon: FileText },
      { id: "analytics", label: "Analytics", Icon: TrendingUp },
    ],
  },
  {
    section: "Financial Statements",
    items: [
      { id: "balance-sheet", label: "Balance Sheet", Icon: Landmark },
      { id: "asset-register", label: "Asset Register", Icon: Package },
      { id: "liabilities", label: "Liabilities Mgmt", Icon: TrendingDown },
      { id: "equity", label: "Equity Management", Icon: Gem },
      { id: "receivables", label: "Receivables & Payables", Icon: ArrowLeftRight },
      { id: "audit-logs", label: "Audit Logs", Icon: ScrollText },
    ],
  },
];

const budgetLines = [
  { name: "School Feeding", planned: 10000000, used: 7200000, dept: "Kitchen" },
  { name: "Transport", planned: 2000000, used: 1500000, dept: "Transport" },
  { name: "Teacher Salaries", planned: 60000000, used: 55000000, dept: "Academics" },
  { name: "Electricity & Water", planned: 5000000, used: 4100000, dept: "Administration" },
  { name: "Internet & ICT", planned: 3000000, used: 2800000, dept: "ICT" },
  { name: "Library", planned: 1500000, used: 900000, dept: "Library" },
  { name: "Laboratory", planned: 4000000, used: 2400000, dept: "Academics" },
  { name: "Maintenance", planned: 6000000, used: 3200000, dept: "Administration" },
  { name: "Exams & Printing", planned: 2500000, used: 1800000, dept: "Academics" },
  { name: "Sports & Entertainment", planned: 2000000, used: 800000, dept: "Sports" },
  { name: "Security", planned: 1500000, used: 1500000, dept: "Security" },
  { name: "Cleaning Materials", planned: 1200000, used: 950000, dept: "Administration" },
  { name: "Insurance", planned: 1000000, used: 1000000, dept: "Administration" },
  { name: "Emergency Fund", planned: 5000000, used: 0, dept: "Administration" },
];

const incomeSources = [
  { name: "Student Fees", amount: 120000000, collected: 95000000 },
  { name: "Government Support", amount: 40000000, collected: 40000000 },
  { name: "Boarding Fees", amount: 20000000, collected: 16000000 },
  { name: "Transport Fees", amount: 8000000, collected: 6000000 },
  { name: "Feeding Fees", amount: 6000000, collected: 5000000 },
  { name: "PTA Contributions", amount: 3000000, collected: 2500000 },
  { name: "Other Income", amount: 3000000, collected: 1800000 },
];

const assets = {
  current: [
    { name: "Cash at Bank", value: 45000000 },
    { name: "Cash in Hand", value: 2000000 },
    { name: "Student Fees Receivable", value: 15000000 },
    { name: "Stock Inventory", value: 8000000 },
    { name: "Prepaid Expenses", value: 3000000 },
  ],
  fixed: [
    { name: "School Buildings", value: 300000000 },
    { name: "Computers & ICT", value: 17000000, original: 20000000, depreciation: 3000000 },
    { name: "School Bus", value: 35000000 },
    { name: "Laboratory Equipment", value: 12000000 },
    { name: "Furniture", value: 12000000 },
    { name: "Library Books", value: 5000000 },
    { name: "Smart TVs", value: 2000000 },
    { name: "Printers", value: 1500000 },
  ],
};

const liabilities = {
  current: [
    { name: "Supplier Debts", amount: 5000000 },
    { name: "Salary Payable", amount: 3000000 },
    { name: "Utility Bills Payable", amount: 1500000 },
    { name: "Tax Obligations", amount: 800000 },
  ],
  longTerm: [
    { name: "Bank Loan", amount: 40000000 },
    { name: "Construction Loan", amount: 0 },
    { name: "Equipment Financing", amount: 0 },
  ],
};

const equity = [
  { name: "School Capital", amount: 350000000 },
  { name: "Retained Earnings", amount: 37500000 },
];

const auditLogs = [
  { user: "Umuhoza Alice", action: "Created Term 1 Budget", date: "2025-09-01 08:32", type: "create" },
  { user: "Nkurunziza Jean", action: "Approved Budget - RWF 103.7M", date: "2025-09-02 11:15", type: "approve" },
  { user: "Umuhoza Alice", action: "Added expense: Feeding RWF 2.4M", date: "2025-09-05 09:20", type: "expense" },
  { user: "Gasana Patrick", action: "Generated Balance Sheet PDF", date: "2025-09-10 14:05", type: "report" },
  { user: "Umuhoza Alice", action: "Updated Security budget line", date: "2025-09-12 10:45", type: "edit" },
  { user: "Nkurunziza Jean", action: "Reviewed Financial Reports", date: "2025-09-15 16:30", type: "review" },
];

const monthlyData = [
  { month: "Sep", income: 35000000, expenses: 18000000 },
  { month: "Oct", income: 28000000, expenses: 22000000 },
  { month: "Nov", income: 20000000, expenses: 19000000 },
  { month: "Dec", income: 12000000, expenses: 21000000 },
];

export default function SchoolBudget() {
  const [activePage, setActivePage] = useState("budget-dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [budgetPeriod, setBudgetPeriod] = useState("Term 1");
  const [budgetStatus, setBudgetStatus] = useState("Approved");
  const [showNotif, setShowNotif] = useState(false);

  const totalExpectedIncome = incomeSources.reduce((s, i) => s + i.amount, 0);
  const totalCollected = incomeSources.reduce((s, i) => s + i.collected, 0);
  const totalAllocated = budgetLines.reduce((s, b) => s + b.planned, 0);
  const totalUsed = budgetLines.reduce((s, b) => s + b.used, 0);
  const remainingUnallocated = totalExpectedIncome - totalAllocated;
  const availableBalance = totalAllocated - totalUsed;
  const usagePct = Math.round((totalUsed / totalAllocated) * 100);

  const totalCurrentAssets = assets.current.reduce((s, a) => s + a.value, 0);
  const totalFixedAssets = assets.fixed.reduce((s, a) => s + a.value, 0);
  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalCurrentLiab = liabilities.current.reduce((s, l) => s + l.amount, 0);
  const totalLongLiab = liabilities.longTerm.reduce((s, l) => s + l.amount, 0);
  const totalLiabilities = totalCurrentLiab + totalLongLiab;
  const totalEquity = equity.reduce((s, e) => s + e.amount, 0);

  const CHART_COLORS = [COLORS.amber, COLORS.navy, COLORS.green, COLORS.blue, COLORS.purple, "#EC4899", "#14B8A6", "#F97316"];

  const pages = {
    "budget-dashboard": <BudgetDashboard {...{ fmt, fmtShort, totalExpectedIncome, totalCollected, totalAllocated, totalUsed, remainingUnallocated, availableBalance, usagePct, budgetLines, incomeSources, monthlyData, CHART_COLORS, budgetPeriod, budgetStatus }} />,
    "create-budget": <CreateBudget {...{ fmt, budgetPeriod, setBudgetPeriod, budgetStatus, setBudgetStatus, incomeSources, totalExpectedIncome }} />,
    "budget-lines": <BudgetLines {...{ fmt, budgetLines, totalAllocated, totalUsed, CHART_COLORS }} />,
    "dept-budgets": <DeptBudgets {...{ fmt, budgetLines, CHART_COLORS }} />,
    "expense-tracking": <ExpenseTracking {...{ fmt, budgetLines }} />,
    "budget-vs-actual": <BudgetVsActual {...{ fmt, fmtShort, budgetLines, CHART_COLORS }} />,
    "approvals": <Approvals {...{ fmt, budgetStatus, setBudgetStatus, totalAllocated }} />,
    "financial-reports": <FinancialReports {...{ fmt, totalExpectedIncome, totalAllocated, totalUsed, availableBalance }} />,
    "analytics": <Analytics {...{ fmt, fmtShort, budgetLines, incomeSources, monthlyData, CHART_COLORS }} />,
    "balance-sheet": <BalanceSheet {...{ fmt, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, totalCurrentAssets, totalFixedAssets, totalCurrentLiab, totalLongLiab, CHART_COLORS }} />,
    "asset-register": <AssetRegister {...{ fmt, assets, totalCurrentAssets, totalFixedAssets, totalAssets }} />,
    "liabilities": <LiabilitiesPage {...{ fmt, liabilities, totalCurrentLiab, totalLongLiab, totalLiabilities }} />,
    "equity": <EquityPage {...{ fmt, equity, totalEquity, totalAssets, totalLiabilities }} />,
    "receivables": <ReceivablesPayables {...{ fmt, incomeSources, liabilities, totalCollected, totalCurrentLiab }} />,
    "audit-logs": <AuditLogsPage {...{ auditLogs }} />,
  };

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100dvh - 3.5rem)",
        maxHeight: "100%",
        background: COLORS.gray100,
        fontFamily: "'Montserrat', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 260 : 0, minWidth: sidebarOpen ? 260 : 0, background: COLORS.navy, color: COLORS.white, overflowY: "auto", overflowX: "hidden", transition: "all 0.3s", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={22} color={COLORS.navy} strokeWidth={2.25} aria-hidden />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.white }}>MINEDUC System</div>
              <div style={{ fontSize: 11, color: COLORS.amberLight }}>School Finance Manager</div>
            </div>
          </div>
        </div>
        <div style={{ padding: "8px 0", flex: 1 }}>
          {SIDEBAR_ITEMS.map(section => (
            <div key={section.section}>
              <div style={{ padding: "10px 16px 4px", fontSize: 10, fontWeight: 700, color: COLORS.amber, letterSpacing: "0.1em", textTransform: "uppercase" }}>{section.section}</div>
              {section.items.map((item) => {
                const ItemIcon = item.Icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActivePage(item.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 16px",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      background: active ? "rgba(245,158,11,0.15)" : "transparent",
                      color: active ? COLORS.amber : "rgba(255,255,255,0.8)",
                      borderLeft: active ? `3px solid ${COLORS.amber}` : "3px solid transparent",
                      transition: "all 0.2s",
                      textAlign: "left",
                    }}
                  >
                    <ItemIcon size={18} strokeWidth={2} color={active ? COLORS.amber : "rgba(255,255,255,0.85)"} aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid rgba(255,255,255,0.1)`, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Academic Year 2025–2026 · Term 1</div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: COLORS.white, padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.gray200}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ border: "none", background: "transparent", cursor: "pointer", color: COLORS.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }} aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
              <PanelLeft size={22} strokeWidth={2} aria-hidden />
            </button>
            <span style={{ fontWeight: 700, color: COLORS.navy, fontSize: 16 }}>
              {SIDEBAR_ITEMS.flatMap(s => s.items).find(i => i.id === activePage)?.label || "Dashboard"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 12, color: COLORS.gray400, background: COLORS.gray100, borderRadius: 6, padding: "4px 10px" }}>Term 1 · 2025–2026</div>
            <div style={{ position: "relative" }}>
              <button type="button" onClick={() => setShowNotif(!showNotif)} style={{ border: "none", background: "transparent", cursor: "pointer", position: "relative", color: COLORS.gray600, display: "flex", alignItems: "center", padding: 4 }} aria-label="Notifications">
                <Bell size={22} strokeWidth={2} aria-hidden />
                <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, background: COLORS.red, borderRadius: "50%", display: "block" }} />
              </button>
              {showNotif && (
                <div style={{ position: "absolute", right: 0, top: 36, width: 280, background: COLORS.white, border: `1px solid ${COLORS.gray200}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: COLORS.navy, color: COLORS.white, fontWeight: 600, fontSize: 13 }}>Notifications</div>
                  {[
                    { msg: "Security budget line at 100%", type: "danger" },
                    { msg: "Teacher Salaries at 92% used", type: "warning" },
                    { msg: "ICT budget at 93% used", type: "warning" },
                    { msg: "Budget pending headmaster approval", type: "info" },
                  ].map((n, i) => (
                    <div key={i} style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      {n.type === "danger" ? (
                        <CircleAlert size={16} color={COLORS.red} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                      ) : n.type === "warning" ? (
                        <TriangleAlert size={16} color={COLORS.amberDark} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                      ) : (
                        <Info size={16} color={COLORS.blue} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                      )}
                      <span style={{ color: COLORS.gray800 }}>{n.msg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: COLORS.navy, color: COLORS.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>UA</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {pages[activePage]}
        </div>
      </div>
    </div>
  );
}

/* ──────────── BUDGET DASHBOARD ──────────── */
function BudgetDashboard({ fmt, fmtShort, totalExpectedIncome, totalCollected, totalAllocated, totalUsed, remainingUnallocated, availableBalance, usagePct, budgetLines, incomeSources, monthlyData, CHART_COLORS, budgetPeriod, budgetStatus }) {
  const pieData = budgetLines.slice(0, 6).map((b, i) => ({ name: b.name, value: b.planned }));
  const barData = budgetLines.slice(0, 8).map(b => ({ name: b.name.split(" ")[0], planned: b.planned / 1e6, used: b.used / 1e6 }));

  const cards = [
    { label: "Expected Income", value: fmt(totalExpectedIncome), Icon: CircleDollarSign, color: COLORS.green, sub: "100% of target" },
    { label: "Collected Fees", value: fmt(totalCollected), Icon: CircleCheck, color: COLORS.blue, sub: `${Math.round(totalCollected/totalExpectedIncome*100)}% collected` },
    { label: "Total Budget Allocated", value: fmt(totalAllocated), Icon: ClipboardList, color: COLORS.amber, sub: `${Math.round(totalAllocated/totalExpectedIncome*100)}% of income` },
    { label: "Total Expenses Used", value: fmt(totalUsed), Icon: Receipt, color: COLORS.red, sub: `${usagePct}% of budget` },
    { label: "Available Balance", value: fmt(availableBalance), Icon: Landmark, color: COLORS.navy, sub: "Remaining in budget" },
    { label: "Unallocated Income", value: fmt(remainingUnallocated), Icon: BarChart3, color: "#8B5CF6", sub: "Not yet budgeted" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.navy }}>Budget Dashboard</div>
          <div style={{ fontSize: 13, color: COLORS.gray400, marginTop: 2 }}>Term 1 · Academic Year 2025–2026</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ background: budgetStatus === "Approved" ? "#D1FAE5" : "#FEF3C7", color: budgetStatus === "Approved" ? "#065F46" : "#92400E", borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{budgetStatus}</span>
          <button type="button" style={{ background: COLORS.amber, color: COLORS.navy, border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Download size={16} strokeWidth={2.5} aria-hidden />
            Export Report
          </button>
        </div>
      </div>

      {/* Budget usage progress */}
      <div style={{ background: COLORS.white, borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: `1px solid ${COLORS.gray200}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 600, color: COLORS.navy, fontSize: 14 }}>Overall Budget Usage</span>
          <span style={{ fontWeight: 700, color: usagePct > 90 ? COLORS.red : COLORS.amber, fontSize: 14 }}>{usagePct}%</span>
        </div>
        <div style={{ background: COLORS.gray100, borderRadius: 99, height: 10, overflow: "hidden" }}>
          <div style={{ width: `${usagePct}%`, height: "100%", background: usagePct > 90 ? COLORS.red : COLORS.amber, borderRadius: 99, transition: "width 1s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: COLORS.gray400 }}>
          <span>Used: {fmt(totalUsed)}</span>
          <span>Allocated: {fmt(totalAllocated)}</span>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
        {cards.map((c, i) => {
          const CardIcon = c.Icon;
          return (
          <div key={i} style={{ background: COLORS.white, borderRadius: 12, padding: "16px 18px", border: `1px solid ${COLORS.gray200}`, borderLeft: `4px solid ${c.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 11, color: COLORS.gray400, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
              <CardIcon size={22} color={c.color} strokeWidth={2} aria-hidden />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginTop: 6 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: c.color, marginTop: 4, fontWeight: 600 }}>{c.sub}</div>
          </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Budget Allocation by Line</div>
          <ResponsiveContainer width="100%" height={220}>
            <RechartsPie>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Income vs Expenses (Monthly)</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtShort} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Area type="monotone" dataKey="income" stroke={COLORS.green} fill="#D1FAE5" name="Income" />
              <Area type="monotone" dataKey="expenses" stroke={COLORS.red} fill="#FEE2E2" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Budget vs Actual bar */}
      <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Top Budget Lines: Planned vs Used (RWF Millions)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => v.toFixed(1) + "M RWF"} />
            <Bar dataKey="planned" fill={COLORS.navy} name="Planned" radius={[3, 3, 0, 0]} />
            <Bar dataKey="used" fill={COLORS.amber} name="Used" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ──────────── CREATE BUDGET ──────────── */
function CreateBudget({ fmt, budgetPeriod, setBudgetPeriod, incomeSources, totalExpectedIncome }) {
  const [incomes, setIncomes] = useState(incomeSources.map(i => ({ ...i })));
  const total = incomes.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 6 }}>Create Budget</div>
      <div style={{ fontSize: 13, color: COLORS.gray400, marginBottom: 20 }}>Define income sources and budget period</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={18} color={COLORS.navy} strokeWidth={2} aria-hidden />
            Budget Period
          </div>
          {["Academic Year", "Term 1", "Term 2", "Term 3", "Special Project"].map(p => (
            <label key={p} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${COLORS.gray100}`, cursor: "pointer" }}>
              <input type="radio" name="period" value={p} checked={budgetPeriod === p} onChange={() => setBudgetPeriod(p)} style={{ accentColor: COLORS.amber }} />
              <span style={{ fontWeight: budgetPeriod === p ? 700 : 400, color: budgetPeriod === p ? COLORS.amber : COLORS.gray800, fontSize: 14 }}>{p}</span>
            </label>
          ))}
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <School size={18} color={COLORS.navy} strokeWidth={2} aria-hidden />
            Budget Details
          </div>
          {[["School Name", "Babyeyi Secondary School"], ["Academic Year", "2025–2026"], ["Selected Period", budgetPeriod], ["Currency", "RWF (Rwandan Franc)"], ["Created By", "Umuhoza Alice (Accountant)"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 13 }}>
              <span style={{ color: COLORS.gray400 }}>{k}</span>
              <span style={{ fontWeight: 600, color: COLORS.navy }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}`, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={18} color={COLORS.navy} strokeWidth={2} aria-hidden />
            Expected Income Sources
          </div>
          <div style={{ fontWeight: 800, color: COLORS.green, fontSize: 16 }}>Total: {fmt(total)}</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.navy }}>
              {["Income Source", "Expected Amount (RWF)", "% of Total"].map(h => (
                <th key={h} style={{ padding: "10px 14px", color: COLORS.white, textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {incomes.map((inc, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 === 0 ? COLORS.white : COLORS.gray50 }}>
                <td style={{ padding: "10px 14px", color: COLORS.gray800 }}>{inc.name}</td>
                <td style={{ padding: "10px 14px" }}>
                  <input type="number" value={inc.amount} onChange={e => { const n = [...incomes]; n[i].amount = Number(e.target.value); setIncomes(n); }} style={{ border: `1px solid ${COLORS.gray200}`, borderRadius: 6, padding: "4px 8px", width: 140, fontSize: 13, color: COLORS.navy, fontWeight: 600 }} />
                </td>
                <td style={{ padding: "10px 14px", color: COLORS.amber, fontWeight: 700 }}>{total > 0 ? ((inc.amount / total) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: COLORS.navy }}>
              <td style={{ padding: "10px 14px", color: COLORS.white, fontWeight: 700 }}>TOTAL</td>
              <td style={{ padding: "10px 14px", color: COLORS.amber, fontWeight: 800, fontSize: 15 }}>{fmt(total)}</td>
              <td style={{ padding: "10px 14px", color: COLORS.amber, fontWeight: 700 }}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={{ padding: "10px 20px", border: `2px solid ${COLORS.navy}`, borderRadius: 8, background: "transparent", color: COLORS.navy, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save Draft</button>
        <button type="button" style={{ padding: "10px 20px", border: "none", borderRadius: 8, background: COLORS.amber, color: COLORS.navy, fontWeight: 700, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
          Submit for Approval
          <Check size={18} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* ──────────── BUDGET LINES ──────────── */
function BudgetLines({ fmt, budgetLines, totalAllocated, totalUsed, CHART_COLORS }) {
  const [newLine, setNewLine] = useState({ name: "", planned: "", dept: "Administration" });

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Budget Lines</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Budget Lines", value: budgetLines.length, Icon: ClipboardList },
          { label: "Total Allocated", value: fmt(totalAllocated), Icon: CircleDollarSign },
          { label: "Total Used", value: fmt(totalUsed), Icon: Receipt },
        ].map((c, i) => {
          const StatIcon = c.Icon;
          return (
          <div key={i} style={{ background: COLORS.white, borderRadius: 10, padding: 16, border: `1px solid ${COLORS.gray200}` }}>
            <div style={{ fontSize: 11, color: COLORS.gray400, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.navy, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              {c.value}
              <StatIcon size={22} color={COLORS.amber} strokeWidth={2} aria-hidden />
            </div>
          </div>
          );
        })}
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}`, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <PlusCircle size={18} color={COLORS.navy} strokeWidth={2} aria-hidden />
          Add Budget Line
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input placeholder="Budget line name" value={newLine.name} onChange={e => setNewLine({ ...newLine, name: e.target.value })} style={{ flex: 2, minWidth: 180, border: `1px solid ${COLORS.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13 }} />
          <input type="number" placeholder="Planned amount (RWF)" value={newLine.planned} onChange={e => setNewLine({ ...newLine, planned: e.target.value })} style={{ flex: 2, minWidth: 180, border: `1px solid ${COLORS.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13 }} />
          <select value={newLine.dept} onChange={e => setNewLine({ ...newLine, dept: e.target.value })} style={{ flex: 1, minWidth: 140, border: `1px solid ${COLORS.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13 }}>
            {["Administration", "Academics", "ICT", "Kitchen", "Transport", "Sports", "Library", "Security"].map(d => <option key={d}>{d}</option>)}
          </select>
          <button style={{ background: COLORS.amber, color: COLORS.navy, border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Add</button>
        </div>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.navy }}>
              {["Budget Line", "Department", "Planned (RWF)", "Used (RWF)", "Remaining", "Usage %", "Status"].map(h => (
                <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budgetLines.map((b, i) => {
              const pct = Math.round((b.used / b.planned) * 100);
              const status = pct >= 100 ? "Exhausted" : pct >= 80 ? "Warning" : "Normal";
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 === 0 ? COLORS.white : COLORS.gray50 }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: COLORS.navy }}>{b.name}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.gray600 }}>{b.dept}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.gray800 }}>{fmt(b.planned)}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.gray800 }}>{fmt(b.used)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: b.planned - b.used > 0 ? COLORS.green : COLORS.red }}>{fmt(b.planned - b.used)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ flex: 1, background: COLORS.gray200, borderRadius: 99, height: 6, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: pct >= 100 ? COLORS.red : pct >= 80 ? COLORS.amberDark : COLORS.green, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: pct >= 100 ? COLORS.red : COLORS.gray600, minWidth: 32 }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: status === "Exhausted" ? "#FEE2E2" : status === "Warning" ? "#FEF3C7" : "#D1FAE5", color: status === "Exhausted" ? "#991B1B" : status === "Warning" ? "#92400E" : "#065F46", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────── DEPARTMENT BUDGETS ──────────── */
function DeptBudgets({ fmt, budgetLines, CHART_COLORS }) {
  const depts = {};
  budgetLines.forEach(b => {
    if (!depts[b.dept]) depts[b.dept] = { planned: 0, used: 0 };
    depts[b.dept].planned += b.planned;
    depts[b.dept].used += b.used;
  });
  const deptArr = Object.entries(depts).map(([name, d]) => ({ name, ...d, pct: Math.round((d.used / d.planned) * 100) })).sort((a, b) => b.planned - a.planned);
  const barData = deptArr.map(d => ({ name: d.name.slice(0, 8), planned: d.planned / 1e6, used: d.used / 1e6 }));

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Department Budgets</div>
      <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Department Spending Comparison (RWF Millions)</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={barData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={72} />
            <Tooltip formatter={(v) => v.toFixed(1) + "M RWF"} />
            <Bar dataKey="planned" fill={COLORS.navy} name="Planned" radius={[0, 3, 3, 0]} />
            <Bar dataKey="used" fill={COLORS.amber} name="Used" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {deptArr.map((d, i) => (
          <div key={i} style={{ background: COLORS.white, borderRadius: 10, padding: 16, border: `1px solid ${COLORS.gray200}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14 }}>{d.name}</div>
              <span style={{ fontWeight: 800, color: d.pct >= 90 ? COLORS.red : d.pct >= 70 ? COLORS.amberDark : COLORS.green, fontSize: 14 }}>{d.pct}%</span>
            </div>
            <div style={{ background: COLORS.gray100, borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ width: `${Math.min(d.pct, 100)}%`, height: "100%", background: d.pct >= 90 ? COLORS.red : COLORS.amber, borderRadius: 99 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: COLORS.gray400 }}>Used: {fmt(d.used)}</span>
              <span style={{ color: COLORS.gray400 }}>Budget: {fmt(d.planned)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────── EXPENSE TRACKING ──────────── */
function ExpenseTracking({ fmt, budgetLines }) {
  const [newExp, setNewExp] = useState({ description: "", amount: "", budgetLine: budgetLines[0].name, date: "", ref: "" });
  const recentExpenses = [
    { desc: "Monthly Feeding Supply", amount: 2400000, line: "School Feeding", date: "2025-09-15", ref: "EXP-001", by: "Umuhoza A." },
    { desc: "Fuel – School Bus", amount: 500000, line: "Transport", date: "2025-09-14", ref: "EXP-002", by: "Umuhoza A." },
    { desc: "Teacher Salaries – Sept", amount: 18000000, line: "Teacher Salaries", date: "2025-09-10", ref: "EXP-003", by: "Umuhoza A." },
    { desc: "RURA Electricity Bill", amount: 1200000, line: "Electricity & Water", date: "2025-09-08", ref: "EXP-004", by: "Umuhoza A." },
    { desc: "MTN Internet Package", amount: 750000, line: "Internet & ICT", date: "2025-09-05", ref: "EXP-005", by: "Umuhoza A." },
    { desc: "Security Guards – Sept", amount: 1500000, line: "Security", date: "2025-09-01", ref: "EXP-006", by: "Umuhoza A." },
  ];

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Expense Tracking</div>

      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <PlusCircle size={18} color={COLORS.navy} strokeWidth={2} aria-hidden />
          Record New Expense
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: COLORS.gray400, display: "block", marginBottom: 4 }}>Description *</label>
            <input value={newExp.description} onChange={e => setNewExp({ ...newExp, description: e.target.value })} placeholder="Expense description" style={{ width: "100%", border: `1px solid ${COLORS.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.gray400, display: "block", marginBottom: 4 }}>Amount (RWF) *</label>
            <input type="number" value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} placeholder="0" style={{ width: "100%", border: `1px solid ${COLORS.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.gray400, display: "block", marginBottom: 4 }}>Budget Line *</label>
            <select value={newExp.budgetLine} onChange={e => setNewExp({ ...newExp, budgetLine: e.target.value })} style={{ width: "100%", border: `1px solid ${COLORS.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }}>
              {budgetLines.map(b => <option key={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.gray400, display: "block", marginBottom: 4 }}>Date *</label>
            <input type="date" value={newExp.date} onChange={e => setNewExp({ ...newExp, date: e.target.value })} style={{ width: "100%", border: `1px solid ${COLORS.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: COLORS.gray400, display: "block", marginBottom: 4 }}>Reference No.</label>
            <input value={newExp.ref} onChange={e => setNewExp({ ...newExp, ref: e.target.value })} placeholder="EXP-XXX" style={{ width: "100%", border: `1px solid ${COLORS.gray200}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" style={{ width: "100%", background: COLORS.amber, color: COLORS.navy, border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Save size={18} strokeWidth={2} aria-hidden />
              Save Expense
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.gray100}`, fontWeight: 700, color: COLORS.navy, fontSize: 14 }}>Recent Expenses</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.gray50 }}>
              {["Ref", "Description", "Budget Line", "Amount", "Date", "Recorded By"].map(h => (
                <th key={h} style={{ padding: "10px 14px", color: COLORS.gray600, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentExpenses.map((e, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                <td style={{ padding: "10px 14px", color: COLORS.amber, fontWeight: 700, fontSize: 12 }}>{e.ref}</td>
                <td style={{ padding: "10px 14px", color: COLORS.navy, fontWeight: 600 }}>{e.desc}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: "#EFF6FF", color: "#1E40AF", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{e.line}</span>
                </td>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: COLORS.red }}>{fmt(e.amount)}</td>
                <td style={{ padding: "10px 14px", color: COLORS.gray400, fontSize: 12 }}>{e.date}</td>
                <td style={{ padding: "10px 14px", color: COLORS.gray600, fontSize: 12 }}>{e.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────── BUDGET VS ACTUAL ──────────── */
function BudgetVsActual({ fmt, fmtShort, budgetLines, CHART_COLORS }) {
  const data = budgetLines.map(b => ({
    name: b.name.split(" ").slice(0, 2).join(" "),
    planned: b.planned,
    used: b.used,
    remaining: b.planned - b.used,
    variance: b.planned - b.used,
    pct: Math.round((b.used / b.planned) * 100),
  }));

  const chartData = data.map(d => ({ name: d.name, Planned: d.planned / 1e6, Actual: d.used / 1e6 }));

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Budget vs Actual</div>

      <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Budget Performance Overview (RWF Millions)</div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + "M"} />
            <Tooltip formatter={(v) => v.toFixed(1) + "M RWF"} />
            <Legend />
            <Bar dataKey="Planned" fill={COLORS.navy} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Actual" fill={COLORS.amber} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.navy }}>
              {["Budget Line", "Planned", "Actual Used", "Variance", "Usage %", "Performance"].map(h => (
                <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const good = d.pct <= 80;
              const warn = d.pct > 80 && d.pct < 100;
              const over = d.pct >= 100;
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 === 0 ? COLORS.white : COLORS.gray50 }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: COLORS.navy }}>{d.name}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.gray800 }}>{fmt(d.planned)}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.gray800 }}>{fmt(d.used)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: d.variance >= 0 ? COLORS.green : COLORS.red }}>{d.variance >= 0 ? "+" : ""}{fmt(d.variance)}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: over ? COLORS.red : warn ? COLORS.amberDark : COLORS.green }}>{d.pct}%</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: over ? "#FEE2E2" : warn ? "#FEF3C7" : "#D1FAE5", color: over ? "#991B1B" : warn ? "#92400E" : "#065F46", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      {over ? (
                        <><CircleAlert size={14} strokeWidth={2} aria-hidden /> Over Budget</>
                      ) : warn ? (
                        <><TriangleAlert size={14} strokeWidth={2} aria-hidden /> Near Limit</>
                      ) : (
                        <><CircleCheck size={14} strokeWidth={2} aria-hidden /> On Track</>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────── APPROVALS ──────────── */
function Approvals({ fmt, budgetStatus, setBudgetStatus, totalAllocated }) {
  const steps = [
    { label: "Accountant Created", role: "Umuhoza Alice", date: "2025-09-01", done: true },
    { label: "School Manager Review", role: "Nkurunziza Jean", date: "2025-09-02", done: true },
    { label: "Headmaster Approval", role: "Dr. Gahima Paul", date: budgetStatus === "Approved" ? "2025-09-03" : "Pending...", done: budgetStatus === "Approved" },
    { label: "Budget Active", role: "System", date: budgetStatus === "Approved" ? "2025-09-03" : "—", done: budgetStatus === "Approved" },
  ];

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Budget Approvals</div>

      <div style={{ background: COLORS.white, borderRadius: 12, padding: 24, border: `1px solid ${COLORS.gray200}`, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 16, marginBottom: 6 }}>Term 1 Budget – Academic Year 2025–2026</div>
        <div style={{ fontSize: 13, color: COLORS.gray400, marginBottom: 20 }}>Total Allocated: {fmt(totalAllocated)}</div>

        <div style={{ display: "flex", gap: 0, position: "relative" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {i < steps.length - 1 && (
                <div style={{ position: "absolute", top: 18, left: "50%", width: "100%", height: 3, background: steps[i + 1].done ? COLORS.amber : COLORS.gray200, zIndex: 0 }} />
              )}
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: s.done ? COLORS.amber : COLORS.gray200, color: s.done ? COLORS.navy : COLORS.gray400, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, zIndex: 1, border: `3px solid ${s.done ? COLORS.amberDark : COLORS.gray300}` }}>
                {s.done ? <Check size={18} strokeWidth={2.5} aria-hidden /> : i + 1}
              </div>
              <div style={{ marginTop: 8, textAlign: "center" }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: COLORS.navy }}>{s.label}</div>
                <div style={{ fontSize: 11, color: COLORS.gray400 }}>{s.role}</div>
                <div style={{ fontSize: 11, color: s.done ? COLORS.green : COLORS.gray400, fontWeight: 600 }}>{s.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}`, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14, marginBottom: 12 }}>Budget Status</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["Draft", "Pending Approval", "Approved", "Rejected", "Closed"].map(s => (
            <button key={s} onClick={() => setBudgetStatus(s)} style={{ padding: "8px 18px", borderRadius: 8, border: `2px solid ${budgetStatus === s ? COLORS.amber : COLORS.gray200}`, background: budgetStatus === s ? COLORS.amber : COLORS.white, color: budgetStatus === s ? COLORS.navy : COLORS.gray600, fontWeight: budgetStatus === s ? 700 : 400, cursor: "pointer", fontSize: 13, transition: "all 0.2s" }}>{s}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "14px 18px", border: `1px solid #F59E0B`, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <TriangleAlert size={22} color="#92400E" strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden />
        <div>
          <div style={{ fontWeight: 700, color: "#92400E", fontSize: 14 }}>Budget Approval Notice</div>
          <div style={{ fontSize: 13, color: "#78350F", marginTop: 4 }}>Once the Headmaster approves, the budget becomes active and expenses can be recorded against each budget line. Any modifications require re-approval.</div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── FINANCIAL REPORTS ──────────── */
function FinancialReports({ fmt, totalExpectedIncome, totalAllocated, totalUsed, availableBalance }) {
  const reports = [
    { title: "Budget Summary Report", desc: "Overview of all budget lines and status", Icon: BarChart3 },
    { title: "Budget vs Actual Report", desc: "Comparison of planned vs real spending", Icon: Scale },
    { title: "Income Statement", desc: "All income sources and totals", Icon: CircleDollarSign },
    { title: "Expenditure Report", desc: "All recorded expenses with details", Icon: Receipt },
    { title: "Department Spending Report", desc: "Budget performance per department", Icon: Building2 },
    { title: "Audit Report", desc: "Full audit trail for external review", Icon: Search },
    { title: "Term Financial Report", desc: "End-of-term financial summary", Icon: ClipboardList },
    { title: "Annual Financial Report", desc: "Full year consolidated finances", Icon: CalendarDays },
  ];

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Financial Reports</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14, marginBottom: 24 }}>
        {reports.map((r, i) => {
          const RepIcon = r.Icon;
          return (
          <div key={i} style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RepIcon size={22} color={COLORS.navy} strokeWidth={2} aria-hidden />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: COLORS.gray400, marginTop: 2 }}>{r.desc}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["PDF", "XLS"].map(f => (
                <button key={f} style={{ padding: "6px 12px", border: `1px solid ${f === "PDF" ? COLORS.red : COLORS.green}`, borderRadius: 6, background: "transparent", color: f === "PDF" ? COLORS.red : COLORS.green, fontWeight: 700, cursor: "pointer", fontSize: 11 }}>{f}</button>
              ))}
            </div>
          </div>
          );
        })}
      </div>

      {/* Quick summary */}
      <div style={{ background: COLORS.navy, borderRadius: 12, padding: 20, color: COLORS.white }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14, color: COLORS.amber, display: "flex", alignItems: "center", gap: 10 }}>
          <ClipboardList size={20} color={COLORS.amber} strokeWidth={2} aria-hidden />
          Quick Financial Summary – Term 1, 2025–2026
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {[{ label: "Expected Income", value: fmt(totalExpectedIncome) }, { label: "Total Allocated", value: fmt(totalAllocated) }, { label: "Total Used", value: fmt(totalUsed) }, { label: "Available Balance", value: fmt(availableBalance) }].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: COLORS.amberLight }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.white, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────── ANALYTICS ──────────── */
function Analytics({ fmt, fmtShort, budgetLines, incomeSources, monthlyData, CHART_COLORS }) {
  const incomeChartData = incomeSources.map(i => ({ name: i.name.split(" ").slice(0, 2).join(" "), expected: i.amount / 1e6, collected: i.collected / 1e6 }));

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Budget Analytics</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Income Collection Progress</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={incomeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={45} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + "M"} />
              <Tooltip formatter={(v) => v.toFixed(1) + "M RWF"} />
              <Bar dataKey="expected" fill={COLORS.navy} name="Expected" radius={[3, 3, 0, 0]} />
              <Bar dataKey="collected" fill={COLORS.green} name="Collected" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
          <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 14 }}>Cash Flow Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.gray100} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtShort} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="income" stroke={COLORS.green} strokeWidth={2} dot={{ fill: COLORS.green }} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke={COLORS.red} strokeWidth={2} dot={{ fill: COLORS.red }} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Insights */}
      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}` }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} color={COLORS.navy} strokeWidth={2} aria-hidden />
          AI Budget Insights
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { title: "Risk Alert", TitleIcon: CircleAlert, msg: "Security budget is 100% exhausted with 3 months remaining in the term.", type: "danger" },
            { title: "Warning", TitleIcon: TriangleAlert, msg: "Teacher Salaries at 92% — expected to exceed budget by Oct if trend continues.", type: "warning" },
            { title: "Recommendation", TitleIcon: Lightbulb, msg: "Emergency Fund (5M RWF) untouched — consider reallocating 1.5M to Security.", type: "info" },
            { title: "On Track", TitleIcon: CircleCheck, msg: "Library and Sports budgets are well within limits. Projected surplus: 2.7M RWF.", type: "success" },
          ].map((ins, i) => {
            const TitleIcon = ins.TitleIcon;
            return (
            <div key={i} style={{ borderRadius: 10, padding: 14, background: ins.type === "danger" ? "#FEF2F2" : ins.type === "warning" ? "#FFFBEB" : ins.type === "info" ? "#EFF6FF" : "#F0FDF4", border: `1px solid ${ins.type === "danger" ? "#FECACA" : ins.type === "warning" ? "#FDE68A" : ins.type === "info" ? "#BFDBFE" : "#BBF7D0"}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: ins.type === "danger" ? "#991B1B" : ins.type === "warning" ? "#92400E" : ins.type === "info" ? "#1E40AF" : "#166534", display: "flex", alignItems: "center", gap: 8 }}>
                <TitleIcon size={16} strokeWidth={2} aria-hidden />
                {ins.title}
              </div>
              <div style={{ fontSize: 12, color: COLORS.gray600, marginTop: 4 }}>{ins.msg}</div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ──────────── BALANCE SHEET ──────────── */
function BalanceSheet({ fmt, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, totalCurrentAssets, totalFixedAssets, totalCurrentLiab, totalLongLiab, CHART_COLORS }) {
  const assetPie = [
    { name: "Current Assets", value: totalCurrentAssets },
    { name: "Fixed Assets", value: totalFixedAssets },
  ];
  const equationOk = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1000;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy }}>Balance Sheet</div>
          <div style={{ fontSize: 13, color: COLORS.gray400 }}>Academic Year 2025–2026 · Term 1 · Babyeyi Secondary School</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" style={{ padding: "8px 16px", border: `1px solid ${COLORS.red}`, borderRadius: 8, background: "transparent", color: COLORS.red, fontWeight: 700, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FileText size={16} strokeWidth={2} aria-hidden />
            PDF
          </button>
          <button type="button" style={{ padding: "8px 16px", border: `1px solid ${COLORS.green}`, borderRadius: 8, background: "transparent", color: COLORS.green, fontWeight: 700, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FileSpreadsheet size={16} strokeWidth={2} aria-hidden />
            Excel
          </button>
        </div>
      </div>

      {/* Equation check */}
      <div style={{ background: equationOk ? "#D1FAE5" : "#FEE2E2", borderRadius: 10, padding: "12px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${equationOk ? "#6EE7B7" : "#FCA5A5"}` }}>
        <span style={{ fontWeight: 700, color: equationOk ? "#065F46" : "#991B1B", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
          {equationOk ? <Check size={18} strokeWidth={2.5} aria-hidden /> : <X size={18} strokeWidth={2.5} aria-hidden />}
          Assets = Liabilities + Equity &nbsp;
          <span style={{ fontWeight: 400, fontSize: 13 }}>{fmt(totalAssets)} = {fmt(totalLiabilities)} + {fmt(totalEquity)}</span>
        </span>
        <span style={{ fontWeight: 800, color: equationOk ? "#065F46" : "#991B1B", fontSize: 14 }}>{equationOk ? "BALANCED" : "UNBALANCED"}</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Assets", value: fmt(totalAssets), color: COLORS.navy, Icon: Landmark },
          { label: "Total Liabilities", value: fmt(totalLiabilities), color: COLORS.red, Icon: TrendingDown },
          { label: "Total Equity", value: fmt(totalEquity), color: COLORS.green, Icon: Gem },
        ].map((c, i) => {
          const SumIcon = c.Icon;
          return (
          <div key={i} style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, borderTop: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: COLORS.gray400, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 8 }}>
              {c.label}
              <SumIcon size={16} color={c.color} strokeWidth={2} aria-hidden />
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginTop: 6 }}>{c.value}</div>
          </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 20 }}>
        {/* Balance sheet table */}
        <div>
          {/* Assets */}
          <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ background: COLORS.navy, padding: "12px 18px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: COLORS.amber, fontWeight: 800, fontSize: 14 }}>ASSETS</span>
              <span style={{ color: COLORS.amber, fontWeight: 800, fontSize: 14 }}>Amount (RWF)</span>
            </div>
            <div style={{ padding: "10px 18px 4px", fontSize: 11, color: COLORS.amber, fontWeight: 700, background: "#FFFBEB" }}>CURRENT ASSETS</div>
            {assets.current.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 18px", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 13 }}>
                <span style={{ color: COLORS.gray700 }}>{a.name}</span>
                <span style={{ fontWeight: 600, color: COLORS.navy }}>{fmt(a.value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", background: "#F0FDF4", borderBottom: `1px solid ${COLORS.gray200}` }}>
              <span style={{ fontWeight: 700, color: "#065F46" }}>Total Current Assets</span>
              <span style={{ fontWeight: 800, color: "#065F46" }}>{fmt(totalCurrentAssets)}</span>
            </div>
            <div style={{ padding: "10px 18px 4px", fontSize: 11, color: COLORS.amber, fontWeight: 700, background: "#FFFBEB" }}>FIXED ASSETS</div>
            {assets.fixed.map((a, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 18px", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 13 }}>
                <div>
                  <span style={{ color: COLORS.gray700 }}>{a.name}</span>
                  {a.depreciation && <span style={{ fontSize: 11, color: COLORS.gray400, marginLeft: 6 }}>(dep. {fmt(a.depreciation)})</span>}
                </div>
                <span style={{ fontWeight: 600, color: COLORS.navy }}>{fmt(a.value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", background: "#F0FDF4", borderBottom: `1px solid ${COLORS.gray200}` }}>
              <span style={{ fontWeight: 700, color: "#065F46" }}>Total Fixed Assets</span>
              <span style={{ fontWeight: 800, color: "#065F46" }}>{fmt(totalFixedAssets)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", background: COLORS.navy }}>
              <span style={{ fontWeight: 800, color: COLORS.white, fontSize: 14 }}>TOTAL ASSETS</span>
              <span style={{ fontWeight: 800, color: COLORS.amber, fontSize: 14 }}>{fmt(totalAssets)}</span>
            </div>
          </div>

          {/* Liabilities */}
          <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ background: COLORS.red, padding: "12px 18px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 14 }}>LIABILITIES</span>
              <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 14 }}>Amount (RWF)</span>
            </div>
            <div style={{ padding: "10px 18px 4px", fontSize: 11, color: COLORS.red, fontWeight: 700, background: "#FEF2F2" }}>CURRENT LIABILITIES</div>
            {liabilities.current.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 18px", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 13 }}>
                <span style={{ color: COLORS.gray700 }}>{l.name}</span>
                <span style={{ fontWeight: 600, color: COLORS.red }}>{fmt(l.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", background: "#FEF2F2", borderBottom: `1px solid ${COLORS.gray200}` }}>
              <span style={{ fontWeight: 700, color: "#991B1B" }}>Total Current Liabilities</span>
              <span style={{ fontWeight: 800, color: "#991B1B" }}>{fmt(totalCurrentLiab)}</span>
            </div>
            <div style={{ padding: "10px 18px 4px", fontSize: 11, color: COLORS.red, fontWeight: 700, background: "#FEF2F2" }}>LONG-TERM LIABILITIES</div>
            {liabilities.longTerm.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 18px", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 13 }}>
                <span style={{ color: COLORS.gray700 }}>{l.name}</span>
                <span style={{ fontWeight: 600, color: COLORS.red }}>{fmt(l.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", background: "#991B1B" }}>
              <span style={{ fontWeight: 800, color: COLORS.white, fontSize: 14 }}>TOTAL LIABILITIES</span>
              <span style={{ fontWeight: 800, color: "#FCA5A5", fontSize: 14 }}>{fmt(totalLiabilities)}</span>
            </div>
          </div>

          {/* Equity */}
          <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
            <div style={{ background: COLORS.green, padding: "12px 18px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 14 }}>EQUITY / SCHOOL CAPITAL</span>
              <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 14 }}>Amount (RWF)</span>
            </div>
            {equity.map((e, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 13 }}>
                <span style={{ color: COLORS.gray700 }}>{e.name}</span>
                <span style={{ fontWeight: 600, color: COLORS.green }}>{fmt(e.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", background: "#065F46" }}>
              <span style={{ fontWeight: 800, color: COLORS.white, fontSize: 14 }}>TOTAL EQUITY</span>
              <span style={{ fontWeight: 800, color: "#6EE7B7", fontSize: 14 }}>{fmt(totalEquity)}</span>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div>
          <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 13 }}>Assets Distribution</div>
            <ResponsiveContainer width="100%" height={180}>
              <RechartsPie>
                <Pie data={assetPie} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  <Cell fill={COLORS.navy} />
                  <Cell fill={COLORS.amber} />
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </RechartsPie>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8 }}>
              {assetPie.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: i === 0 ? COLORS.navy : COLORS.amber }} />
                  <span style={{ color: COLORS.gray600 }}>{d.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}` }}>
            <div style={{ fontWeight: 700, color: COLORS.navy, marginBottom: 14, fontSize: 13 }}>Financial Position</div>
            {[
              { label: "Total Assets", value: totalAssets, color: COLORS.navy, pct: 100 },
              { label: "Total Equity", value: totalEquity, color: COLORS.green, pct: Math.round(totalEquity / totalAssets * 100) },
              { label: "Total Liabilities", value: totalLiabilities, color: COLORS.red, pct: Math.round(totalLiabilities / totalAssets * 100) },
            ].map((item, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: COLORS.gray600 }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.color }}>{item.pct}%</span>
                </div>
                <div style={{ background: COLORS.gray100, borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${item.pct}%`, height: "100%", background: item.color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── ASSET REGISTER ──────────── */
function AssetRegister({ fmt, assets, totalCurrentAssets, totalFixedAssets, totalAssets }) {
  const allAssets = [
    ...assets.current.map(a => ({ ...a, category: "Current", depreciation: 0 })),
    ...assets.fixed.map(a => ({ ...a, category: "Fixed", depreciation: a.depreciation || 0 })),
  ];

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Asset Register</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Assets", value: fmt(totalAssets), color: COLORS.navy },
          { label: "Current Assets", value: fmt(totalCurrentAssets), color: COLORS.amber },
          { label: "Fixed Assets", value: fmt(totalFixedAssets), color: COLORS.green },
        ].map((c, i) => (
          <div key={i} style={{ background: COLORS.white, borderRadius: 10, padding: 16, border: `1px solid ${COLORS.gray200}`, borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: COLORS.gray400, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.navy }}>
              {["#", "Asset Name", "Category", "Book Value (RWF)", "Depreciation", "Net Value", "Status"].map(h => (
                <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allAssets.map((a, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 === 0 ? COLORS.white : COLORS.gray50 }}>
                <td style={{ padding: "10px 14px", color: COLORS.gray400, fontSize: 12 }}>{String(i + 1).padStart(3, "0")}</td>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: COLORS.navy }}>{a.name}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: a.category === "Fixed" ? "#EFF6FF" : "#FEF3C7", color: a.category === "Fixed" ? "#1E40AF" : "#92400E", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{a.category}</span>
                </td>
                <td style={{ padding: "10px 14px", color: COLORS.gray800 }}>{fmt(a.original || a.value)}</td>
                <td style={{ padding: "10px 14px", color: a.depreciation > 0 ? COLORS.red : COLORS.gray400 }}>{a.depreciation > 0 ? `-${fmt(a.depreciation)}` : "—"}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700, color: COLORS.navy }}>{fmt(a.value)}</td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: "#D1FAE5", color: "#065F46", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>Active</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: COLORS.navy }}>
              <td colSpan={5} style={{ padding: "10px 14px", color: COLORS.white, fontWeight: 700 }}>TOTAL</td>
              <td style={{ padding: "10px 14px", color: COLORS.amber, fontWeight: 800 }}>{fmt(totalAssets)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ──────────── LIABILITIES PAGE ──────────── */
function LiabilitiesPage({ fmt, liabilities, totalCurrentLiab, totalLongLiab, totalLiabilities }) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Liabilities Management</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[{ label: "Total Liabilities", value: fmt(totalLiabilities), color: COLORS.red }, { label: "Current Liabilities", value: fmt(totalCurrentLiab), color: COLORS.amberDark }, { label: "Long-Term Liabilities", value: fmt(totalLongLiab), color: COLORS.navy }].map((c, i) => (
          <div key={i} style={{ background: COLORS.white, borderRadius: 10, padding: 16, border: `1px solid ${COLORS.gray200}`, borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: COLORS.gray400, textTransform: "uppercase" }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {[{ title: "Current Liabilities", items: liabilities.current, color: COLORS.red }, { title: "Long-Term Liabilities", items: liabilities.longTerm, color: COLORS.navy }].map((section, si) => (
        <div key={si} style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ background: section.color, padding: "12px 18px" }}>
            <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 14 }}>{section.title}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.gray50 }}>
                {["Liability", "Amount (RWF)", "Due Date", "Status", "Action"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", color: COLORS.gray600, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.items.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: COLORS.navy }}>{l.name}</td>
                  <td style={{ padding: "10px 14px", color: l.amount > 0 ? COLORS.red : COLORS.gray400, fontWeight: l.amount > 0 ? 700 : 400 }}>{l.amount > 0 ? fmt(l.amount) : "—"}</td>
                  <td style={{ padding: "10px 14px", color: COLORS.gray400, fontSize: 12 }}>2025-10-01</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: l.amount > 0 ? "#FEE2E2" : "#D1FAE5", color: l.amount > 0 ? "#991B1B" : "#065F46", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 600 }}>{l.amount > 0 ? "Outstanding" : "Cleared"}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {l.amount > 0 && <button style={{ border: `1px solid ${COLORS.amber}`, borderRadius: 6, background: "transparent", color: COLORS.amberDark, fontWeight: 700, cursor: "pointer", fontSize: 11, padding: "4px 10px" }}>Pay Now</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/* ──────────── EQUITY PAGE ──────────── */
function EquityPage({ fmt, equity, totalEquity, totalAssets, totalLiabilities }) {
  const netWorth = totalAssets - totalLiabilities;
  const ratio = ((totalEquity / totalAssets) * 100).toFixed(1);

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Equity Management</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Equity", value: fmt(totalEquity), color: COLORS.green, Icon: Gem },
          { label: "Net Worth", value: fmt(netWorth), color: COLORS.navy, Icon: Landmark },
          { label: "Equity Ratio", value: ratio + "%", color: COLORS.amber, Icon: BarChart3 },
        ].map((c, i) => {
          const EqIcon = c.Icon;
          return (
          <div key={i} style={{ background: COLORS.white, borderRadius: 12, padding: 18, border: `1px solid ${COLORS.gray200}`, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <EqIcon size={28} color={c.color} strokeWidth={2} aria-hidden />
            </div>
            <div style={{ fontSize: 11, color: COLORS.gray400, textTransform: "uppercase", marginTop: 8 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
          );
        })}
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, border: `1px solid ${COLORS.gray200}`, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14, marginBottom: 16 }}>Equity Breakdown</div>
        {equity.map((e, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: COLORS.navy, fontSize: 14 }}>{e.name}</span>
              <span style={{ fontWeight: 800, color: COLORS.green, fontSize: 14 }}>{fmt(e.amount)}</span>
            </div>
            <div style={{ background: COLORS.gray100, borderRadius: 99, height: 12, overflow: "hidden" }}>
              <div style={{ width: `${(e.amount / totalEquity * 100).toFixed(0)}%`, height: "100%", background: i === 0 ? COLORS.navy : COLORS.green, borderRadius: 99 }} />
            </div>
            <div style={{ fontSize: 12, color: COLORS.gray400, marginTop: 4 }}>{(e.amount / totalEquity * 100).toFixed(1)}% of total equity</div>
          </div>
        ))}
        <div style={{ borderTop: `2px solid ${COLORS.gray200}`, paddingTop: 14, display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 800, color: COLORS.navy, fontSize: 15 }}>TOTAL EQUITY</span>
          <span style={{ fontWeight: 800, color: COLORS.green, fontSize: 15 }}>{fmt(totalEquity)}</span>
        </div>
      </div>

      <div style={{ background: COLORS.navy, borderRadius: 12, padding: 20, color: COLORS.white }}>
        <div style={{ fontWeight: 700, color: COLORS.amber, fontSize: 14, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <TrendingUp size={20} color={COLORS.amber} strokeWidth={2} aria-hidden />
          Equity Formula: Assets − Liabilities = Equity
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: COLORS.amberLight }}>ASSETS</div>
            <div style={{ color: COLORS.amber }}>{fmt(totalAssets)}</div>
          </div>
          <span>−</span>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: COLORS.amberLight }}>LIABILITIES</div>
            <div style={{ color: "#FCA5A5" }}>{fmt(totalLiabilities)}</div>
          </div>
          <span>=</span>
          <div style={{ background: "rgba(16,185,129,0.2)", borderRadius: 10, padding: "12px 20px", textAlign: "center", border: `2px solid ${COLORS.green}` }}>
            <div style={{ fontSize: 11, color: COLORS.amberLight }}>EQUITY</div>
            <div style={{ color: COLORS.green }}>{fmt(totalEquity)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────── RECEIVABLES & PAYABLES ──────────── */
function ReceivablesPayables({ fmt, incomeSources, liabilities, totalCollected, totalCurrentLiab }) {
  const totalExpected = incomeSources.reduce((s, i) => s + i.amount, 0);
  const totalReceivable = incomeSources.reduce((s, i) => s + (i.amount - i.collected), 0);

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Receivables & Payables</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Receivable", value: fmt(totalReceivable), color: COLORS.blue, Icon: ArrowDownToLine },
          { label: "Total Collected", value: fmt(totalCollected), color: COLORS.green, Icon: CircleCheck },
          { label: "Current Payables", value: fmt(totalCurrentLiab), color: COLORS.red, Icon: ArrowUpFromLine },
          { label: "Collection Rate", value: `${Math.round(totalCollected/totalExpected*100)}%`, color: COLORS.amber, Icon: BarChart3 },
        ].map((c, i) => {
          const RpIcon = c.Icon;
          return (
          <div key={i} style={{ background: COLORS.white, borderRadius: 10, padding: 14, border: `1px solid ${COLORS.gray200}`, borderLeft: `4px solid ${c.color}` }}>
            <div style={{ fontSize: 10, color: COLORS.gray400, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
              {c.label}
              <RpIcon size={14} color={c.color} strokeWidth={2} aria-hidden />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
          <div style={{ background: COLORS.blue, padding: "12px 18px" }}>
            <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ArrowDownToLine size={18} strokeWidth={2} aria-hidden />
              Receivables (Fees Owed)
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.gray50 }}>
                {["Source", "Expected", "Collected", "Balance"].map(h => <th key={h} style={{ padding: "9px 14px", color: COLORS.gray600, textAlign: "left", fontSize: 11, fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {incomeSources.map((inc, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                  <td style={{ padding: "9px 14px", color: COLORS.navy, fontWeight: 600, fontSize: 12 }}>{inc.name}</td>
                  <td style={{ padding: "9px 14px", fontSize: 12 }}>{fmt(inc.amount)}</td>
                  <td style={{ padding: "9px 14px", color: COLORS.green, fontWeight: 600, fontSize: 12 }}>{fmt(inc.collected)}</td>
                  <td style={{ padding: "9px 14px", color: inc.amount - inc.collected > 0 ? COLORS.red : COLORS.green, fontWeight: 700, fontSize: 12 }}>{fmt(inc.amount - inc.collected)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
          <div style={{ background: COLORS.red, padding: "12px 18px" }}>
            <span style={{ color: COLORS.white, fontWeight: 800, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ArrowUpFromLine size={18} strokeWidth={2} aria-hidden />
              Payables (Amounts Owed)
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: COLORS.gray50 }}>
                {["Creditor", "Amount", "Due", "Status"].map(h => <th key={h} style={{ padding: "9px 14px", color: COLORS.gray600, textAlign: "left", fontSize: 11, fontWeight: 600 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {liabilities.current.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}` }}>
                  <td style={{ padding: "9px 14px", color: COLORS.navy, fontWeight: 600, fontSize: 12 }}>{l.name}</td>
                  <td style={{ padding: "9px 14px", color: COLORS.red, fontWeight: 700, fontSize: 12 }}>{fmt(l.amount)}</td>
                  <td style={{ padding: "9px 14px", color: COLORS.gray400, fontSize: 11 }}>Oct 01</td>
                  <td style={{ padding: "9px 14px" }}>
                    <span style={{ background: "#FEE2E2", color: "#991B1B", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>Unpaid</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ──────────── AUDIT LOGS ──────────── */
function AuditLogsPage({ auditLogs }) {
  const typeColor = { create: COLORS.blue, approve: COLORS.green, expense: COLORS.red, report: COLORS.purple, edit: COLORS.amber, review: COLORS.navy };
  const typeIcons = { create: Plus, approve: Check, expense: Receipt, report: FileText, edit: Pencil, review: Search };

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.navy, marginBottom: 20 }}>Audit Logs</div>
      <div style={{ background: COLORS.white, borderRadius: 12, padding: "0", border: `1px solid ${COLORS.gray200}`, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.gray100}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, color: COLORS.navy, fontSize: 14 }}>System Activity Log</span>
          <button type="button" style={{ border: `1px solid ${COLORS.amber}`, borderRadius: 6, background: "transparent", color: COLORS.amberDark, fontWeight: 700, cursor: "pointer", fontSize: 12, padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Download size={16} strokeWidth={2} aria-hidden />
            Export Log
          </button>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: COLORS.navy }}>
              {["Time", "User", "Action", "Type"].map(h => <th key={h} style={{ padding: "11px 14px", color: COLORS.white, textAlign: "left", fontSize: 12, fontWeight: 600 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {auditLogs.map((log, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.gray100}`, background: i % 2 === 0 ? COLORS.white : COLORS.gray50 }}>
                <td style={{ padding: "12px 14px", color: COLORS.gray400, fontSize: 12 }}>{log.date}</td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: COLORS.navy, color: COLORS.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{log.user.split(" ").map(n => n[0]).join("")}</div>
                    <span style={{ fontWeight: 600, color: COLORS.navy, fontSize: 13 }}>{log.user}</span>
                  </div>
                </td>
                <td style={{ padding: "12px 14px", color: COLORS.gray700 }}>{log.action}</td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{ background: `${typeColor[log.type]}20`, color: typeColor[log.type], borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {(() => {
                      const TIcon = typeIcons[log.type] || ScrollText;
                      return <TIcon size={12} strokeWidth={2} aria-hidden />;
                    })()}
                    {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}