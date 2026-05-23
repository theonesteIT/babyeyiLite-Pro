import { useState } from "react";
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
import SchoolBudgetSidebar from "../components/SchoolBudgetSidebar";
import { schoolBudgetPageLabel } from "../utils/schoolBudgetNav";
import { Menu, Bell, TriangleAlert, Info } from "lucide-react";

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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarOpen = isMobile ? mobileMenuOpen : desktopSidebarOpen;
  const [showNotif, setShowNotif] = useState(false);
  const { alerts, activeBudget } = useSchoolBudgetData();

  const toggleSidebar = () => {
    if (isMobile) setMobileMenuOpen((open) => !open);
    else setDesktopSidebarOpen((open) => !open);
  };

  const headerPeriod = activeBudget
    ? `${activeBudget.term} · ${activeBudget.academicYear}`
    : "Select a budget";
  const pageTitle = schoolBudgetPageLabel(activePage);

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
    if (isMobile) setMobileMenuOpen(false);
  };

  return (
    <div
      className="flex min-h-0 overflow-hidden relative font-sans"
      style={{
        height: "calc(100dvh - 3.5rem)",
        maxHeight: "100%",
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      <style>{SB_RESPONSIVE_CSS}</style>
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 border-0 cursor-pointer bg-[#000435]/45"
        />
      )}

      <div
        className={`flex shrink-0 flex-col min-h-0 transition-all duration-300 ${
          isMobile ? 'fixed left-0 top-0 bottom-0 z-50 w-[280px] shadow-xl' : 'relative'
        } ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
        style={{
          width: isMobile ? 280 : sidebarOpen ? 272 : 0,
          minWidth: isMobile ? (sidebarOpen ? 280 : 0) : sidebarOpen ? 272 : 0,
          overflow: 'hidden',
        }}
      >
        {sidebarOpen && (
          <SchoolBudgetSidebar
            activePage={activePage}
            onSelectPage={setActivePage}
            onClose={closeSidebar}
            periodLabel={headerPeriod}
          />
        )}
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden bg-slate-100">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex items-center justify-center p-1 text-[#000435] hover:bg-slate-50 rounded-lg transition"
              aria-label={sidebarOpen ? 'Collapse menu' : 'Open menu'}
            >
              <Menu size={22} strokeWidth={1.75} aria-hidden />
            </button>
            <span className="text-[14px] font-semibold text-[#000435] tracking-tight truncate">
              {pageTitle}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="sb-header-meta text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1 hidden sm:block">
              {headerPeriod}
            </div>
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {pages[activePage]}
        </div>
      </div>
    </div>
  );
}
