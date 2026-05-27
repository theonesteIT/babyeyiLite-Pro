import { useState } from 'react';
import { Menu, Bell, TriangleAlert, Info } from 'lucide-react';
import { ActionPlanDataProvider, useActionPlanData } from '../../context/ActionPlanDataContext';
import { useIsMobile } from '../../utils/useIsMobile';
import ActionPlanSidebar from '../../components/ActionPlanSidebar';
import { actionPlanPageLabel } from '../../utils/actionPlanNav';
import CreateActionPlanModal from '../../components/CreateActionPlanModal';
import {
  ActionPlanDashboardPage,
  CreateActionPlanPage,
  ActivitiesPage,
  BudgetTrackingPage,
  ProgressTrackingPage,
  ApprovalsPage,
  ReportsPage,
  AnalyticsPage,
  CalendarPage,
  NotificationsPage,
} from './actionPlanPages';

const COLORS = {
  navy: '#000435',
  amber: '#F59E0B',
  white: '#FFFFFF',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray600: '#4B5563',
  gray800: '#1F2937',
};

const fmt = (n) => new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(n) || 0) + ' RWF';

const AP_RESPONSIVE_CSS = `
@media (max-width: 768px) {
  .ap-grid-4 { grid-template-columns: 1fr 1fr !important; }
  .ap-grid-2 { grid-template-columns: 1fr !important; }
  .ap-header-meta { display: none !important; }
  .ap-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .ap-table-scroll table { min-width: 520px; }
}
@media (min-width: 769px) and (max-width: 1024px) {
  .ap-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
}
@media (min-width: 769px) {
  .ap-header-create-btn { display: inline-flex !important; }
}
`;

export default function ActionPlanManagement() {
  return (
    <ActionPlanDataProvider>
      <ActionPlanShell />
    </ActionPlanDataProvider>
  );
}

function ActionPlanShell() {
  const isMobile = useIsMobile();
  const [activePage, setActivePage] = useState('ap-dashboard');
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarOpen = isMobile ? mobileMenuOpen : desktopSidebarOpen;
  const [showNotif, setShowNotif] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { notifications, activePlan, options, setPlanId, reload } = useActionPlanData();

  const toggleSidebar = () => {
    if (isMobile) setMobileMenuOpen((open) => !open);
    else setDesktopSidebarOpen((open) => !open);
  };

  const closeSidebar = () => {
    if (isMobile) setMobileMenuOpen(false);
  };

  const headerPeriod = activePlan
    ? `${activePlan.term} · ${activePlan.academicYear}`
    : 'Select an action plan';

  const goToCreate = () => {
    setActivePage('ap-create');
    setCreateOpen(true);
    closeSidebar();
  };

  const handleNav = (itemId) => {
    if (itemId === 'ap-create') {
      goToCreate();
      return;
    }
    setCreateOpen(false);
    setActivePage(itemId);
    closeSidebar();
  };

  const pages = {
    'ap-dashboard': <ActionPlanDashboardPage fmt={fmt} onOpenCreate={goToCreate} />,
    'ap-create': <CreateActionPlanPage fmt={fmt} />,
    'ap-activities': <ActivitiesPage fmt={fmt} />,
    'ap-budget': <BudgetTrackingPage fmt={fmt} />,
    'ap-progress': <ProgressTrackingPage fmt={fmt} />,
    'ap-approvals': <ApprovalsPage fmt={fmt} />,
    'ap-reports': <ReportsPage fmt={fmt} />,
    'ap-analytics': <AnalyticsPage fmt={fmt} />,
    'ap-calendar': <CalendarPage />,
    'ap-notifications': <NotificationsPage />,
  };

  const pageTitle = actionPlanPageLabel(activePage);

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem)] max-h-full overflow-hidden relative"
      style={{ background: COLORS.gray100, fontFamily: "'Montserrat', sans-serif" }}
    >
      <style>{AP_RESPONSIVE_CSS}</style>

      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 border-none cursor-pointer"
          style={{ background: 'rgba(0,4,53,0.45)' }}
        />
      )}

      <div
        className={`shrink-0 flex flex-col overflow-hidden transition-all duration-300 ${
          isMobile ? 'fixed left-0 top-0 bottom-0 z-50 shadow-xl' : 'relative'
        }`}
        style={{
          width: isMobile ? 280 : sidebarOpen ? 260 : 0,
          minWidth: isMobile ? (sidebarOpen ? 280 : 0) : sidebarOpen ? 260 : 0,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
        }}
      >
        <ActionPlanSidebar
          activePage={activePage}
          onSelectPage={handleNav}
          onClose={closeSidebar}
          periodLabel={headerPeriod}
        />
      </div>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <div
          className="flex items-center justify-between shrink-0 border-b bg-white"
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            height: 56,
            borderColor: COLORS.gray200,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={toggleSidebar}
              className="border-none bg-transparent cursor-pointer flex items-center justify-center p-1"
              style={{ color: COLORS.navy }}
              aria-label="Toggle menu"
            >
              <Menu size={22} strokeWidth={2} aria-hidden />
            </button>
            <span
              className="font-semibold truncate"
              style={{ color: COLORS.navy, fontSize: isMobile ? 14 : 16, maxWidth: isMobile ? 160 : undefined }}
            >
              {pageTitle}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={goToCreate}
              className="ap-header-create-btn hidden items-center border-none rounded-lg cursor-pointer"
              style={{
                background: COLORS.amber,
                color: COLORS.navy,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              + New plan
            </button>
            <div
              className="ap-header-meta text-xs rounded-md px-2.5 py-1"
              style={{ color: COLORS.gray400, background: COLORS.gray100 }}
            >
              {headerPeriod}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotif(!showNotif)}
                className="border-none bg-transparent cursor-pointer relative flex items-center p-1"
                style={{ color: COLORS.gray600 }}
                aria-label="Notifications"
              >
                <Bell size={22} strokeWidth={2} aria-hidden />
                {notifications.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full block"
                    style={{ background: COLORS.amber }}
                  />
                )}
              </button>
              {showNotif && (
                <div
                  className="absolute right-0 top-9 w-[min(280px,90vw)] bg-white rounded-xl overflow-hidden z-[100] shadow-lg"
                  style={{ border: `1px solid ${COLORS.gray200}` }}
                >
                  <div className="px-3.5 py-2.5 text-sm font-semibold text-white" style={{ background: COLORS.navy }}>
                    Notifications
                  </div>
                  {(notifications.length ? notifications : [{ id: 'none', message: 'No alerts for this plan.', type: 'info' }])
                    .slice(0, 6)
                    .map((n) => (
                      <div
                        key={n.id}
                        className="px-3.5 py-2.5 text-xs flex gap-2 items-start border-b"
                        style={{ borderColor: COLORS.gray100, color: COLORS.gray800 }}
                      >
                        {n.type === 'danger' || n.type === 'warning' ? (
                          <TriangleAlert size={16} color={COLORS.amber} className="shrink-0 mt-0.5" aria-hidden />
                        ) : (
                          <Info size={16} color={COLORS.navy} className="shrink-0 mt-0.5" aria-hidden />
                        )}
                        <span>{n.message}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
              style={{ background: COLORS.navy }}
            >
              AP
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto overscroll-y-contain"
          style={{ padding: isMobile ? 12 : 24, WebkitOverflowScrolling: 'touch' }}
        >
          {pages[activePage] || pages['ap-dashboard']}
        </div>
      </div>

      <CreateActionPlanModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        options={options}
        onCreated={(plan) => {
          if (plan?.id) setPlanId(plan.id);
          reload();
        }}
      />
    </div>
  );
}
