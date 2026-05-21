import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Wallet,
  Target,
  BadgeCheck,
  FileText,
  TrendingUp,
  CalendarDays,
  Bell,
  Menu,
  GraduationCap,
  TriangleAlert,
  Info,
} from 'lucide-react';
import { ActionPlanDataProvider, useActionPlanData } from '../../context/ActionPlanDataContext';
import { useIsMobile } from '../../utils/useIsMobile';
import { AP_COLORS } from '../../utils/actionPlanConstants';
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
  navy: AP_COLORS.navy,
  amber: AP_COLORS.amber,
  amberLight: AP_COLORS.amberLight,
  white: AP_COLORS.white,
  gray100: AP_COLORS.gray100,
  gray200: AP_COLORS.gray200,
  gray400: AP_COLORS.gray400,
  gray600: AP_COLORS.gray600,
  gray800: AP_COLORS.gray800,
};

const fmt = (n) => new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(n) || 0) + ' RWF';

const SIDEBAR_ITEMS = [
  {
    section: 'Action Plan Management',
    items: [
      { id: 'ap-dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { id: 'ap-create', label: 'Create Action Plan', Icon: PlusCircle },
      { id: 'ap-activities', label: 'Activities', Icon: ClipboardList },
      { id: 'ap-budget', label: 'Budget Tracking', Icon: Wallet },
      { id: 'ap-progress', label: 'Progress Tracking', Icon: Target },
      { id: 'ap-approvals', label: 'Approvals', Icon: BadgeCheck },
      { id: 'ap-reports', label: 'Reports', Icon: FileText },
      { id: 'ap-analytics', label: 'Analytics', Icon: TrendingUp },
      { id: 'ap-calendar', label: 'Calendar View', Icon: CalendarDays },
      { id: 'ap-notifications', label: 'Notifications', Icon: Bell },
    ],
  },
];

const AP_RESPONSIVE_CSS = `
@media (max-width: 768px) {
  .ap-grid-4 { grid-template-columns: 1fr 1fr !important; }
  .ap-grid-2 { grid-template-columns: 1fr !important; }
  .ap-header-meta { display: none !important; }
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const { notifications, activePlan, options, setPlanId, reload } = useActionPlanData();

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const headerPeriod = activePlan
    ? `${activePlan.term} Â· ${activePlan.academicYear}`
    : 'Select an action plan';

  const closeSidebar = () => {
    if (isMobile) setSidebarOpen(false);
  };

  const goToCreate = () => {
    setActivePage('ap-create');
    setCreateOpen(true);
    if (isMobile) setSidebarOpen(false);
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

  const activeLabel = SIDEBAR_ITEMS.flatMap((s) => s.items).find((i) => i.id === activePage)?.label || 'Dashboard';

  const handleNav = (itemId) => {
    if (itemId === 'ap-create') {
      goToCreate();
      return;
    }
    setCreateOpen(false);
    setActivePage(itemId);
    closeSidebar();
  };

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100dvh - 3.5rem)',
        maxHeight: '100%',
        background: COLORS.gray100,
        fontFamily: "'Montserrat', system-ui, sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style>{AP_RESPONSIVE_CSS}</style>
      {isMobile && sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            border: 'none',
            background: 'rgba(0,4,53,0.45)',
            cursor: 'pointer',
          }}
        />
      )}
      <div
        style={{
          width: isMobile ? 280 : sidebarOpen ? 260 : 0,
          minWidth: isMobile ? (sidebarOpen ? 280 : 0) : sidebarOpen ? 260 : 0,
          background: COLORS.navy,
          color: COLORS.white,
          overflowY: 'auto',
          overflowX: 'hidden',
          transition: 'all 0.3s',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: isMobile ? 'fixed' : 'relative',
          zIndex: isMobile ? 50 : undefined,
          left: 0,
          top: 0,
          bottom: 0,
          transform: isMobile && !sidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
          boxShadow: isMobile && sidebarOpen ? '4px 0 24px rgba(0,0,0,0.2)' : undefined,
        }}
      >
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={22} color={COLORS.navy} strokeWidth={2.25} aria-hidden />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.white }}>School Action Plan</div>
              <div style={{ fontSize: 11, color: COLORS.amberLight }}>Management Module</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '8px 0', flex: 1 }}>
          {SIDEBAR_ITEMS.map((section) => (
            <div key={section.section}>
              <div style={{ padding: '10px 16px 4px', fontSize: 10, fontWeight: 700, color: COLORS.amber, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {section.section}
              </div>
              {section.items.map((item) => {
                const ItemIcon = item.Icon;
                const active = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'ap-create') {
                        openCreate();
                      } else {
                        setActivePage(item.id);
                      }
                      closeSidebar();
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 16px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      background: active ? 'rgba(245,158,11,0.15)' : 'transparent',
                      color: active ? COLORS.amber : 'rgba(255,255,255,0.8)',
                      borderLeft: active ? `3px solid ${COLORS.amber}` : '3px solid transparent',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                  >
                    <ItemIcon size={18} strokeWidth={2} color={active ? COLORS.amber : 'rgba(255,255,255,0.85)'} aria-hidden />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: COLORS.white, padding: isMobile ? '0 12px' : '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${COLORS.gray200}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: COLORS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }} aria-label="Toggle menu">
              <Menu size={22} strokeWidth={2} aria-hidden />
            </button>
            <span style={{ fontWeight: 700, color: COLORS.navy, fontSize: isMobile ? 14 : 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 160 : undefined }}>
              {activeLabel}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            <button
              type="button"
              onClick={goToCreate}
              style={{
                display: 'none',
                background: COLORS.amber,
                color: COLORS.navy,
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              className="ap-header-create-btn"
            >
              + New plan
            </button>
            <div className="ap-header-meta" style={{ fontSize: 12, color: COLORS.gray400, background: COLORS.gray100, borderRadius: 6, padding: '4px 10px' }}>{headerPeriod}</div>
            <div style={{ position: 'relative' }}>
              <button type="button" onClick={() => setShowNotif(!showNotif)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', color: COLORS.gray600, display: 'flex', alignItems: 'center', padding: 4 }} aria-label="Notifications">
                <Bell size={22} strokeWidth={2} aria-hidden />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: COLORS.amber, borderRadius: '50%', display: 'block' }} />
                )}
              </button>
              {showNotif && (
                <div style={{ position: 'absolute', right: 0, top: 36, width: 280, background: COLORS.white, border: `1px solid ${COLORS.gray200}`, borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: COLORS.navy, color: COLORS.white, fontWeight: 600, fontSize: 13 }}>Notifications</div>
                  {(notifications.length ? notifications : [{ id: 'none', message: 'No alerts for this plan.', type: 'info' }]).slice(0, 6).map((n) => (
                    <div key={n.id} style={{ padding: '10px 14px', borderBottom: `1px solid ${COLORS.gray100}`, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      {n.type === 'danger' || n.type === 'warning' ? (
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
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: COLORS.navy, color: COLORS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>AP</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 12 : 24, WebkitOverflowScrolling: 'touch' }}>
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
