import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { createElement, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Wallet,
  MessageSquare,
  ClipboardList,
  Eye,
  PenLine,
  User,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  School,
  Radio,
  UserCheck,
  GraduationCap,
  LineChart,
  IdCard,
  DollarSign,
  Sparkles,
  UserCog,
  BookMarked,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileBarChart,
  ShieldCheck,
  FileText,
  Headphones,
  ShoppingBag,
} from 'lucide-react';
import { PORTAL } from '../config/portal';
import { h } from '../utils/href';
import useChatUnread from '../../shared/hooks/useChatUnread';
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

const NavItem = ({ icon, name, path, exact, onClose, badgeCount = 0 }) => (
  <NavLink
    to={h(path)}
    end={exact}
    onClick={onClose}
    className={({ isActive }) =>
      `relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-medium tracking-tight border border-transparent
      ${
        isActive
          ? 'bg-white/[0.12] text-re-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
          : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {createElement(icon, {
          size: 18,
          strokeWidth: 1.75,
          className: isActive ? 'text-re-gold shrink-0' : 'text-white/45 group-hover:text-white/85 shrink-0 transition-colors',
        })}
        <span className="truncate">{name}</span>
        {badgeCount > 0 && (
          <span className="ml-auto text-[10px] leading-none px-1.5 py-0.5 rounded-md bg-re-gold/90 text-[#0B1530] font-medium">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const ExpandableNavItem = ({ icon, name, subItems, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathMatches = (path) => {
    if (!path) return false;
    const full = h(path);
    if (path.includes('?')) {
      return `${location.pathname}${location.search}` === full;
    }
    const querySiblingActive = subItems.some(
      (x) => x.path && x.path.includes('?') && `${location.pathname}${location.search}` === h(x.path),
    );
    if (location.pathname === full && querySiblingActive) return false;
    return location.pathname === full;
  };
  const isAnyActive = subItems.some((s) => pathMatches(s.path));
  const [open, setOpen] = useState(isAnyActive);

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
        {createElement(icon, {
          size: 18,
          strokeWidth: 1.75,
          className: `${isAnyActive ? 'text-re-gold' : 'text-white/45 group-hover:text-white/85'} transition-colors shrink-0`,
        })}
        <span className="flex-1 text-left">{name}</span>
        <ChevronDown size={16} strokeWidth={2} className={`transition-transform duration-300 text-white/40 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l border-white/15 pl-3">
          {subItems.map((sub) => {
            const subActive = pathMatches(sub.path);
            const fullPath = h(sub.path);
            return (
              <button
                type="button"
                key={sub.path}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(fullPath); if (onClose) onClose(); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer
                ${subActive ? 'text-re-gold bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`}
              >
                {createElement(sub.icon, { size: 14, strokeWidth: 1.75, className: subActive ? 'text-re-gold/90' : 'text-white/35' })}
                <span className="truncate">{sub.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ label }) => (
  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400/85 px-3 pt-4 pb-2 first:pt-1">{label}</p>
);

const Sidebar = ({ onClose }) => {
  const navigate = useNavigate();
  const { teacher, canAccessSchoolConsole, proAccessEffective } = useAuth();
  const unreadCount = useChatUnread();

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] shadow-sm"
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
            <span className="text-lg font-medium tracking-tight text-white block leading-tight">Babyeyi</span>
            <p className="text-[11px] font-medium tracking-wide text-re-gold/90 mt-0.5 capitalize">{PORTAL.roleLabel}</p>
          </div>
        </div>
      </div>

      <nav
        className="dos-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-0.5 pr-1"
        aria-label="DOS navigation"
      >
        <SectionLabel label="Main" />
        <NavItem icon={LayoutDashboard} name="Dashboard" path="/" exact onClose={onClose} />

        <SectionLabel label="Academic oversight" />
        <ExpandableNavItem
          icon={GraduationCap}
          name="Staff & Academics"
          onClose={onClose}
          subItems={[
            { name: 'Staff Management', path: '/timetable?tab=teachers', icon: UserCog },
            { name: 'Courses & Subjects', path: '/timetable?tab=courses', icon: BookMarked },
            { name: 'Time Settings', path: '/timetable?tab=schedule', icon: Clock },
            { name: 'Assignments', path: '/timetable?tab=assignments', icon: ClipboardCheck },
            { name: 'Timetable Generator', path: '/timetable?tab=generator', icon: Sparkles },
            { name: 'View Timetable', path: '/timetable?tab=timetable', icon: CalendarClock },
          ]}
        />
        <ExpandableNavItem
          icon={Users}
          name="Students"
          onClose={onClose}
          subItems={[
           
            { name: 'Student Records', path: '/student-records', icon: IdCard },
          ]}
        />
     
        <ExpandableNavItem
          icon={ClipboardCheck}
          name="Attendance"
          onClose={onClose}
          subItems={[
            { name: 'General Attendance', path: '/attendance', icon: ClipboardCheck },
            { name: 'Teacher Period Attendance', path: '/teacher-period-attendance', icon: Clock },
          ]}
        />
        <ExpandableNavItem
          icon={ClipboardList}
          name="Marks"
          onClose={onClose}
          subItems={[
            { name: 'View marks', path: '/marks/view', icon: Eye },
            { name: 'Record marks', path: '/marks/record', icon: PenLine },
            ...(proAccessEffective ? [{ name: 'Academic progress', path: '/progress', icon: LineChart }] : []),
          ]}
        />
        <ExpandableNavItem
          icon={FileBarChart}
          name="Teachers reports"
          onClose={onClose}
          subItems={[
            { name: 'Teacher requisitions', path: '/teacher-requisitions', icon: ClipboardList },
            { name: 'Student permissions', path: '/teacher-permissions', icon: ShieldCheck },
            { name: 'Staff permissions', path: '/staff-permissions', icon: ShieldCheck },
            { name: 'Lesson plan reports', path: '/lesson-plan-reports', icon: FileText },
          ]}
        />

        <NavItem icon={CalendarDays} name="School Calendar" path="/school-calendar" onClose={onClose} />

        <SectionLabel label="Professional resources" />
        <NavItem icon={DollarSign} name="My Payroll" path="/my-payroll" onClose={onClose} />
        <ExpandableNavItem
          icon={Sparkles}
          name="School Tools"
          onClose={onClose}
          subItems={[
            { name: 'Shule Avance', path: '/shule-avance', icon: Wallet },
            { name: 'Ticha Deals', path: '/ticha-deals', icon: ShoppingBag },
            { name: 'Ticha AI', path: '/ticha-ai', icon: MessageSquare },
            { name: 'English Club', path: '/english-club', icon: BookOpen },
          ]}
        />
        <NavItem icon={MessageSquare} name="Chat Center" path="/chat" onClose={onClose} badgeCount={unreadCount} />
      </nav>

      <div className="p-4 pt-2 shrink-0 border-t border-white/[0.06] space-y-3">
        <div className="rounded-2xl bg-[#060d1f]/90 ring-1 ring-white/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-re-gold/15 ring-1 ring-re-gold/25">
              <Headphones className="text-re-gold" size={20} strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Help &amp; support</p>
              <p className="text-[12px] text-white/55 mt-1 leading-snug">Reach academics ops from chat or your school admin.</p>
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
            {teacher?.photo ? (
              <img src={teacher.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-white/70" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white truncate">{teacher?.first_name || 'Director'}</p>
            <p className="text-[10px] text-white/45 truncate">{teacher?.school?.name ? `${teacher.school.name}` : PORTAL.profileFallback}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
