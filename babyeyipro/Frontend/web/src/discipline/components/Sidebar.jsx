import { NavLink, useLocation } from 'react-router-dom';
import { createElement, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import useChatUnread from '../hooks/useChatUnread';
import { h } from '../utils/href';
import { PORTAL } from '../config/portal';
import babyeyiIcon from '../assets/babyeyi-icon.png';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardCheck,
  BookOpen,
  Scale,
  Shield,
  ClipboardList,
  ShieldCheck,
  Wallet,
  HandCoins,
  FileSpreadsheet,
  MessageSquare,
  MessagesSquare,
  Sparkles,
  BarChart3,
  Settings,
  LogOut,
  WifiOff,
  ChevronDown,
  Headphones,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5100';

const toPhotoUrl = (photo) => {
  if (!photo) return null;
  if (photo.startsWith('http://') || photo.startsWith('https://')) return photo;
  return `${API_BASE}${photo}`;
};

function pathMatches(location, path, exact = false) {
  const target = h(path);
  const current = location.pathname;
  const base = PORTAL.basePath || '/discipline';

  if (exact || path === '/') {
    return current === target || current === base || current === `${base}/`;
  }
  return current === target || current.startsWith(`${target}/`);
}

const NavItem = ({ icon, name, path, exact, onClose, badgeCount = 0 }) => (
  <NavLink
    to={h(path)}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-semibold tracking-tight border border-transparent
      ${
        isActive
          ? 'bg-white/[0.12] text-re-gold border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {createElement(icon, {
          size: 18,
          strokeWidth: 1.75,
          className: isActive
            ? 'text-re-gold shrink-0'
            : 'text-white/45 group-hover:text-white/85 shrink-0 transition-colors',
        })}
        <span className="truncate">{name}</span>
        {badgeCount > 0 && (
          <span className="ml-auto text-[10px] leading-none px-1.5 py-0.5 rounded-md bg-re-gold/90 text-[#0B1530] font-bold">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </>
    )}
  </NavLink>
);

function NavGroup({ group, location, onClose, defaultOpen = false }) {
  const isAnyActive = group.items.some((item) => pathMatches(location, item.path));
  const [open, setOpen] = useState(defaultOpen || isAnyActive);
  const GroupIcon = group.icon;

  useEffect(() => {
    if (isAnyActive) setOpen(true);
  }, [isAnyActive]);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-semibold tracking-tight group border border-transparent
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
          {group.items.map((sub) => (
            <NavLink
              key={sub.path}
              to={h(sub.path)}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all
                ${isActive ? 'text-re-gold bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`
              }
            >
              {({ isActive }) => (
                <>
                  {createElement(sub.icon, {
                    size: 14,
                    strokeWidth: 1.75,
                    className: isActive ? 'text-re-gold/90 shrink-0' : 'text-white/35 shrink-0',
                  })}
                  <span className="truncate flex-1">{sub.name}</span>
                  {sub.badgeCount > 0 && (
                    <span className="text-[9px] leading-none px-1.5 py-0.5 rounded-md bg-re-gold/90 text-[#0B1530] font-bold">
                      {sub.badgeCount > 99 ? '99+' : sub.badgeCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function buildNavGroups(chatUnread) {
  return [
    {
      id: 'academic',
      label: 'Academic',
      icon: GraduationCap,
      items: [
        { name: 'Students', path: '/students', icon: Users },
        { name: 'Attendance', path: '/attendance', icon: ClipboardCheck },
        { name: 'Marks', path: '/marks/view', icon: BookOpen },
      ],
    },
    {
      id: 'discipline',
      label: 'Discipline',
      icon: Scale,
      items: [
        { name: 'Conduct Hub', path: '/conduct', icon: Shield },
        { name: 'Cases', path: '/discipline/set-marks', icon: ClipboardList },
        { name: 'Permissions', path: '/permission', icon: ShieldCheck },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      icon: Wallet,
      items: [
        { name: 'Payroll', path: '/my-payroll', icon: Wallet },
        { name: 'Advances', path: '/shule-avance', icon: HandCoins },
        { name: 'Requisitions', path: '/requisitions', icon: FileSpreadsheet },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessagesSquare,
      items: [
        { name: 'Chat Center', path: '/chat', icon: MessageSquare, badgeCount: chatUnread },
        { name: 'TichaAI', path: '/ticha-ai', icon: Sparkles },
      ],
    },
  ];
}

const Sidebar = ({ onClose }) => {
  const { teacher, logout } = useAuth();
  const unreadCount = useChatUnread();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [logoError, setLogoError] = useState(false);

  const navGroups = useMemo(() => buildNavGroups(unreadCount), [unreadCount]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const schoolLogo = teacher?.school?.logo ? toPhotoUrl(teacher.school.logo) : null;
  const schoolName = teacher?.school?.name || '';
  const schoolInitial = schoolName.trim().charAt(0).toUpperCase() || 'S';

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 shadow-[2px_0_16px_rgba(11,21,48,0.14)] border-r border-white/[0.06]"
      style={{
        background: 'linear-gradient(180deg,#0f2247 0%,#0b1530 40%,#060d1f 100%)',
        colorScheme: 'dark',
      }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08] ring-1 ring-white/10">
            <img src={babyeyiIcon} alt="Babyeyi icon" className="h-7 w-7 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-bold tracking-tight text-white block leading-tight">Babyeyi</span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-re-gold/95 mt-0.5">
              Discipline Portal
            </p>
          </div>
        </div>
      </div>

      <nav
        className="manager-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-1 pr-1"
        aria-label="Discipline navigation"
      >
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/" exact onClose={onClose} />

        {navGroups.map((group) => (
          <NavGroup key={group.id} group={group} location={location} onClose={onClose} />
        ))}

        <NavItem
          icon={BarChart3}
          name="Reports"
          path="/marks/view"
          onClose={onClose}
        />

        <NavItem icon={Settings} name="Settings" path="/discipline/settings" onClose={onClose} />
      </nav>

      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
        {!isOnline && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-400/25">
            <WifiOff size={14} className="text-red-300 shrink-0" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-200">Working offline</p>
          </div>
        )}
        <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/[0.08] flex items-center justify-center shrink-0 border border-white/10">
              {schoolLogo && !logoError ? (
                <img
                  src={schoolLogo}
                  alt={schoolName}
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <span className="text-sm font-semibold text-white">{schoolInitial}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate text-white">{teacher?.first_name || 'Teacher'}</p>
              <p className="text-[11px] font-medium text-white/55 truncate mt-0.5">
                {schoolName || 'Academic Staff'}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl text-white/55 hover:bg-red-500/15 hover:text-red-200 transition-colors shrink-0"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-re-gold px-4 py-2.5 text-[13px] font-semibold text-[#0b1530] shadow-sm border border-[#d4a20a]/30 hover:bg-re-gold-light active:scale-[0.98] transition-all"
          >
            <Headphones size={16} strokeWidth={1.75} />
            Help & support
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
