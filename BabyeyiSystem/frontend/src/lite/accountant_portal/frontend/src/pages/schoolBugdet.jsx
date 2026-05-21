import { useEffect, useState } from "react";
import { CreateBudgetPage } from "./createBudgetPage";
import BudgetLinesPage from "./BudgetLinesPage";
import BudgetLineTracking from "./BudgetLineTracking";
import BudgetDashboardPage from "./BudgetDashboardPage";
import { SchoolBudgetDataProvider, useSchoolBudgetData } from "../context/SchoolBudgetDataContext";
import {
  DeptBudgetsPage,
  ExpenseTrackingPage,
  BudgetVsActualPage,
  ApprovalsPage,
  FinancialReportsPage,
  AnalyticsPage,
  BalanceSheetPage,
  AssetRegisterPage,
  LiabilitiesPage,
  EquityPage,
  ReceivablesPage,
  AuditLogsPage,
} from "./schoolBudgetSubPages";
import { useIsMobile } from "../utils/useIsMobile";
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
  Menu,
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
      { id: "budget-usage-tracking", label: "Usage Tracking", Icon: BarChart3 },
      { id: "dept-budgets", label: "Department Budgets", Icon: Building2 },
      { id: "expense-tracking", label: "Expense Tracking", Icon: Receipt },
      { id: "budget-vs-actual", label: "Budget vs Actual", Icon: Scale },
      { id: "approvals", label: "Approvals", Icon: BadgeCheck },
      { id: "manager-review", label: "Manager Review", Icon: BadgeCheck, externalHref: "/manager/finance/budgets" },
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

const SB_RESPONSIVE_CSS = `
@media (max-width: 768px) {
  .sb-grid-3 { grid-template-columns: 1fr !important; }
  .sb-grid-2 { grid-template-columns: 1fr !important; }
  .sb-page-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
  .sb-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .sb-hide-mobile { display: none !important; }
  .sb-header-meta { display: none !important; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .sb-grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
}
`;

export default function SchoolBudget() {
  return (
    <SchoolBudgetDataProvider>
      <SchoolBudgetShell />
    </SchoolBudgetDataProvider>
  );
}

function SchoolBudgetShell() {
  const isMobile = useIsMobile();
  const [activePage, setActivePage] = useState("budget-dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const { alerts, activeBudget } = useSchoolBudgetData();

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const headerPeriod = activeBudget
    ? `${activeBudget.term} · ${activeBudget.academicYear}`
    : "Select a budget";

  const pages = {
    "budget-dashboard": <BudgetDashboardPage fmt={fmt} fmtShort={fmtShort} />,
    "create-budget": <CreateBudgetPage fmt={fmt} />,
    "budget-lines": <BudgetLinesPage fmt={fmt} />,
    "budget-usage-tracking": <BudgetLineTracking fmt={fmt} />,
    "dept-budgets": <DeptBudgetsPage fmt={fmt} />,
    "expense-tracking": <ExpenseTrackingPage fmt={fmt} />,
    "budget-vs-actual": <BudgetVsActualPage fmt={fmt} />,
    "approvals": <ApprovalsPage fmt={fmt} />,
    "financial-reports": <FinancialReportsPage fmt={fmt} />,
    "analytics": <AnalyticsPage fmt={fmt} fmtShort={fmtShort} />,
    "balance-sheet": <BalanceSheetPage fmt={fmt} />,
    "asset-register": <AssetRegisterPage fmt={fmt} />,
    "liabilities": <LiabilitiesPage fmt={fmt} />,
    "equity": <EquityPage fmt={fmt} />,
    "receivables": <ReceivablesPage fmt={fmt} />,
    "audit-logs": <AuditLogsPage fmt={fmt} />,
  };

  const closeSidebar = () => {
    if (isMobile) setSidebarOpen(false);
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
        position: "relative",
      }}
    >
      <style>{SB_RESPONSIVE_CSS}</style>
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeSidebar}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            border: "none",
            background: "rgba(0,4,53,0.45)",
            cursor: "pointer",
          }}
        />
      )}
      {/* Sidebar */}
      <div
        style={{
          width: isMobile ? 280 : sidebarOpen ? 260 : 0,
          minWidth: isMobile ? (sidebarOpen ? 280 : 0) : sidebarOpen ? 260 : 0,
          background: COLORS.navy,
          color: COLORS.white,
          overflowY: "auto",
          overflowX: "hidden",
          transition: "all 0.3s",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: isMobile ? "fixed" : "relative",
          zIndex: isMobile ? 50 : undefined,
          left: 0,
          top: 0,
          bottom: 0,
          transform: isMobile && !sidebarOpen ? "translateX(-100%)" : "translateX(0)",
          boxShadow: isMobile && sidebarOpen ? "4px 0 24px rgba(0,0,0,0.2)" : undefined,
        }}
      >
        <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GraduationCap size={22} color={COLORS.navy} strokeWidth={2.25} aria-hidden />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.white }}>Babyeyi System</div>
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
                if (item.externalHref) {
                  return (
                    <a
                      key={item.id}
                      href={item.externalHref}
                      onClick={closeSidebar}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "9px 16px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 500,
                        background: "transparent",
                        color: "rgba(255,255,255,0.85)",
                        borderLeft: "3px solid transparent",
                        textDecoration: "none",
                      }}
                    >
                      <ItemIcon size={18} strokeWidth={2} color="rgba(255,255,255,0.85)" aria-hidden />
                      {item.label}
                    </a>
                  );
                }
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActivePage(item.id);
                      closeSidebar();
                    }}
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
        <div style={{ padding: "12px 16px", borderTop: `1px solid rgba(255,255,255,0.1)`, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Academic Year 2025â€“2026 Â· Term 1</div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: COLORS.white, padding: isMobile ? "0 12px" : "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.gray200}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ border: "none", background: "transparent", cursor: "pointer", color: COLORS.navy, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }} aria-label={sidebarOpen ? "Open menu" : "Close menu"}>
              <Menu size={22} strokeWidth={2} aria-hidden />
            </button>
            <span style={{ fontWeight: 700, color: COLORS.navy, fontSize: isMobile ? 14 : 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: isMobile ? 160 : undefined }}>
              {SIDEBAR_ITEMS.flatMap(s => s.items).find(i => i.id === activePage)?.label || "Dashboard"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
            <div className="sb-header-meta" style={{ fontSize: 12, color: COLORS.gray400, background: COLORS.gray100, borderRadius: 6, padding: "4px 10px" }}>{headerPeriod}</div>
            <div style={{ position: "relative" }}>
              <button type="button" onClick={() => setShowNotif(!showNotif)} style={{ border: "none", background: "transparent", cursor: "pointer", position: "relative", color: COLORS.gray600, display: "flex", alignItems: "center", padding: 4 }} aria-label="Notifications">
                <Bell size={22} strokeWidth={2} aria-hidden />
                {alerts.length > 0 && (
                  <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, background: COLORS.amber, borderRadius: "50%", display: "block" }} />
                )}
              </button>
              {showNotif && (
                <div style={{ position: "absolute", right: 0, top: 36, width: 280, background: COLORS.white, border: `1px solid ${COLORS.gray200}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: COLORS.navy, color: COLORS.white, fontWeight: 600, fontSize: 13 }}>Notifications</div>
                  {(alerts.length ? alerts : [{ id: "none", message: "No alerts for this budget.", type: "info" }]).slice(0, 6).map((n) => (
                    <div key={n.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
                      {n.type === "danger" || n.type === "warning" ? (
                        <TriangleAlert size={16} color={COLORS.amber} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                      ) : (
                        <Info size={16} color={COLORS.navy} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                      )}
                      <span style={{ color: COLORS.gray800 }}>{n.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: COLORS.navy, color: COLORS.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>UA</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? 12 : 24, WebkitOverflowScrolling: "touch" }}>
          {pages[activePage]}
        </div>
      </div>
    </div>
  );
}
