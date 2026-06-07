import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { createElement, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  User,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  Headphones,
  Wallet,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  Wrench,
  Search,
} from 'lucide-react';
import useChatUnread from '../../../../shared/hooks/useChatUnread';
import { h } from '../utils/href';
import babyeyiIcon from '../assets/babyeyi-icon.png';

const statusConfig = {
  online: { label: 'Online', dot: 'bg-green-400', text: 'text-green-400', Icon: Wifi },
  offline: { label: 'Offline', dot: 'bg-red-400', text: 'text-red-400', Icon: WifiOff },
  syncing: { label: 'Syncing', dot: 'bg-amber-400', text: 'text-amber-400', Icon: RefreshCw },
};

const AppStatusBadge = ({ status = 'online' }) => {
  const s = statusConfig[status];
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 ring-1 ring-white/10">
      <span className="relative flex h-1.5 w-1.5">
        {status !== 'offline' && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${s.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${s.dot}`} />
      </span>
      <s.Icon size={10} className={`${s.text} ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span className="text-[9px] font-medium text-white/70">{s.label}</span>
    </div>
  );
};

const NAV_GROUPS = [
  {
    id: 'finance',
    label: 'Finance Management',
    icon: Wallet,
    items: [
      { name: 'Student Fees', path: '/fees' },
      { name: 'Babyeyi Fee Cards', path: '/fees/babyeyi-fees' },
      { name: 'Invoice', path: '/invoices' },
      { name: 'Expenses', path: '/expenses' },
      { name: 'School Budget', path: '/school-budget' },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: Wallet,
    items: [
      { name: 'Employee Directory', path: '/payroll/employees' },
      { name: 'Employee Import', path: '/payroll/employees/import' },
      { name: 'Payroll Salary Template', path: '/payroll/salary-template' },
      { name: 'Staff Salary Setup', path: '/payroll/staff-salary-setup' },
      { name: 'Payroll Run', path: '/payroll/run' },
      { name: 'Payroll Reports', path: '/payroll/reports' },
      { name: 'Termination Benefits', path: '/payroll/termination-benefits' },
      // { name: 'Bulk Salary Import', path: '/payroll/bulk-import' },
      // { name: 'Configure Payroll', path: '/payroll/config' },
      { name: 'Salary Payment', path: '/payroll/salary-payment' },
      { name: 'Payroll Disbursement', path: '/payroll/disbursement' },
      { name: 'Pay Slips', path: '/payroll/payslips' },
      { name: 'Bank Payroll', path: '/payroll/bank-payroll' },
      // { name: 'Payroll History', path: '/payroll/history' },
      { name: 'My Payroll', path: '/my-payroll' },
    ],
  },
  {
    id: 'academic',
    label: 'Academic Operations',
    icon: GraduationCap,
    items: [
      { name: 'Examination List', path: '/examination-list' },
      { name: 'School Calendar', path: '/school-calendar' },
    ],
  },
  {
    id: 'requests',
    label: 'Requests & Approvals',
    icon: ClipboardList,
    items: [
      { name: 'Purchase Requests', path: '/purchase-requests' },
      { name: 'Requisition Orders', path: '/requisition-orders' },
      { name: 'Purchase Orders', path: '/purchase-orders' },
      { name: 'Requisitions', path: '/requisitions' },
      { name: 'Advance Approval Queue', path: '/shule-avance' },
      { name: 'Action Plan', path: '/action-plan' },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    icon: MessageSquare,
    items: [
      { name: 'Fee Reminders', path: '/auto-reminders' },
      { name: 'Chat Center', path: '/chat', badgeKey: 'chat' },
    ],
  },
  {
    id: 'utilities',
    label: 'Tools',
    icon: Wrench,
    items: [
      { name: 'Ticha Deals', path: '/ticha-deals' },
      { name: 'My Shule Avance', path: '/my-shule-avance' },
    ],
  },
];

const EXACT_ONLY_PATHS = new Set(['/fees', '/payroll/history', '/payroll/config', '/payroll/salary-payment']);

function pathMatches(location, path) {
  if (!path) return false;
  const full = h(path);
  if (path.includes('?')) {
    return `${location.pathname}${location.search}` === full;
  }
  if (location.pathname === full) return true;
  if (EXACT_ONLY_PATHS.has(path)) return false;
  if (path !== '/' && location.pathname.startsWith(`${full}/`)) return true;
  return false;
}

function SubNavLink({ name, path, onClose, badgeCount = 0 }) {
  return (
    <NavLink
      to={h(path)}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all
        ${
          isActive
            ? 'text-re-gold bg-white/[0.08]'
            : 'text-white/60 hover:text-white hover:bg-white/[0.05]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              isActive ? 'bg-re-gold' : 'bg-white/30'
            }`}
            aria-hidden
          />
          <span className="truncate flex-1">{name}</span>
          {badgeCount > 0 && (
            <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-md bg-re-gold/90 text-[#0B1530] font-medium shrink-0">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ group, onClose, location, badgeCounts, defaultOpen = false }) {
  const isAnyActive = group.items.some((item) => pathMatches(location, item.path));
  const [open, setOpen] = useState(defaultOpen || isAnyActive);
  const GroupIcon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium tracking-tight group border border-transparent
          ${
            isAnyActive
              ? 'bg-white/[0.12] text-re-gold border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
              : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
          }`}
      >
        <GroupIcon
          size={18}
          strokeWidth={1.75}
          className={`${
            isAnyActive ? 'text-re-gold' : 'text-white/45 group-hover:text-white/85'
          } transition-colors shrink-0`}
        />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`transition-transform duration-300 text-white/40 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l border-white/15 pl-3">
          {group.items.map((item) => (
            <SubNavLink
              key={item.path}
              name={item.name}
              path={item.path}
              onClose={onClose}
              badgeCount={item.badgeKey ? badgeCounts[item.badgeKey] || 0 : 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { staff, logout } = useAuth();
  const unreadCount = useChatUnread();
  const [menuQuery, setMenuQuery] = useState('');

  const badgeCounts = useMemo(() => ({ chat: unreadCount }), [unreadCount]);

  const filteredGroups = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return NAV_GROUPS;
    return NAV_GROUPS.map((group) => {
      const labelMatch = group.label.toLowerCase().includes(q);
      const items = group.items.filter(
        (item) => labelMatch || item.name.toLowerCase().includes(q)
      );
      if (!items.length) return null;
      return { ...group, items };
    }).filter(Boolean);
  }, [menuQuery]);

  const dashboardActive = pathMatches(location, '/');

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] shadow-sm font-sans"
      style={{ background: '#000435', colorScheme: 'dark', fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-semibold tracking-tight text-white block leading-tight">
              Babyeyi
            </span>
            <p className="text-[10px] font-medium tracking-wide text-amber-400 mt-0.5">
              Accountant portal
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 pt-3 shrink-0">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
            placeholder="Search menu…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2 pl-9 pr-3 text-[12px] font-medium text-white placeholder:text-white/35 focus:outline-none focus:border-white/20 focus:bg-white/[0.08]"
            aria-label="Search menu"
          />
        </div>
      </div>

      <nav
        className="accountant-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-1 pr-1"
        aria-label="Accountant navigation"
      >
        <NavLink
          to={h('/')}
          end
          onClick={onClose}
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium tracking-tight border border-transparent
            ${
              dashboardActive
                ? 'bg-white/[0.12] text-re-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
                : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
            }`}
        >
          <LayoutDashboard
            size={18}
            strokeWidth={1.75}
            className={dashboardActive ? 'text-re-gold shrink-0' : 'text-white/45 shrink-0'}
          />
          <span className="truncate">Dashboard</span>
        </NavLink>

        {filteredGroups.length === 0 ? (
          <p className="px-3 py-4 text-[12px] text-white/45">No menu items match your search.</p>
        ) : (
          filteredGroups.map((group) => (
            <NavGroup
              key={`${group.id}-${menuQuery}`}
              group={group}
              onClose={onClose}
              location={location}
              badgeCounts={badgeCounts}
              defaultOpen={!!menuQuery.trim()}
            />
          ))
        )}
      </nav>

      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
        <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-re-gold/15 ring-1 ring-re-gold/25">
              <Headphones className="text-re-gold" size={20} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Help &amp; support</p>
              <p className="text-[12px] text-white/55 mt-1 leading-snug">
                Reach finance from chat or contact your school admin.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <AppStatusBadge status="online" />
            <button
              type="button"
              onClick={() => {
                navigate(h('/chat'));
                onClose?.();
              }}
              className="inline-flex items-center justify-center rounded-xl bg-re-gold px-4 py-2.5 text-[13px] font-medium text-[#0b1530] border border-black/10 shadow-sm hover:bg-re-gold-light active:scale-[0.98] transition-all"
            >
              Open chat
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 ring-1 ring-white/10">
            {staff?.photo ? (
              <img src={staff.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-white/70" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white truncate">{staff?.first_name || 'Staff'}</p>
            <p className="text-[10px] text-white/45 truncate font-medium">{staff?.role_name || 'Accountant'}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-white/45 hover:text-red-300 hover:bg-white/5 transition-colors"
            aria-label="Log out"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
