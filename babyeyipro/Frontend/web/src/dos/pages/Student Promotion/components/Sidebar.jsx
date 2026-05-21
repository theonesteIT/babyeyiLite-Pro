import { NavLink } from 'react-router-dom';
import { createElement } from 'react';
import {
  LayoutDashboard,
  Users,
  User,
  Clock,
  Settings,
  GraduationCap,
  RefreshCw,
  FileBarChart,
  PlayCircle,
  ArrowUpCircle,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { h } from '../../../utils/href';
import { sp } from '../utils/paths';
import babyeyiIcon from '../../../assets/babyeyi-icon.png';

const NavItem = ({ icon, name, path, onClose }) => (
  <NavLink
    to={path}
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
      </>
    )}
  </NavLink>
);

const SectionLabel = ({ label }) => (
  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400/85 px-3 pt-4 pb-2 first:pt-1">{label}</p>
);

export default function Sidebar({ onClose }) {
  const { teacher } = useAuth();
  const initials = teacher
    ? `${(teacher.first_name || '')[0] || ''}${(teacher.last_name || '')[0] || ''}`.toUpperCase()
    : 'DO';

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] shadow-sm font-sans"
      style={{ background: '#000435', colorScheme: 'dark' }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex flex-col items-center text-center gap-2">
          <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          <div className="min-w-0 w-full">
            <span className="text-base font-semibold tracking-tight text-white block leading-tight">Babyeyi</span>
            <p className="text-[10px] font-medium tracking-wide text-amber-400 mt-0.5">Student Promotion</p>
            {teacher?.school?.name ? (
              <p className="text-[10px] font-medium text-white/75 leading-snug line-clamp-2 mt-1.5">{teacher.school.name}</p>
            ) : null}
          </div>
        </div>
      </div>

      <nav
        className="dos-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-0.5 pr-1"
        aria-label="Student promotion navigation"
      >
        <SectionLabel label="Main" />
        <NavItem icon={LayoutDashboard} name="Overview" path={sp('dashboard')} onClose={onClose} />

        <SectionLabel label="Promotion" />
        <NavItem icon={Users} name="Promote by Class" path={sp('promote-class')} onClose={onClose} />
        <NavItem icon={User} name="Promote by Student" path={sp('promote-student')} onClose={onClose} />
        <NavItem icon={PlayCircle} name="Promotion Simulation" path={sp('simulation')} onClose={onClose} />

        <SectionLabel label="Management" />
        <NavItem icon={Clock} name="Promotion History" path={sp('history')} onClose={onClose} />
        <NavItem icon={GraduationCap} name="Graduated Students" path={sp('graduated')} onClose={onClose} />
        <NavItem icon={RefreshCw} name="Repeaters Management" path={sp('repeaters')} onClose={onClose} />

        <SectionLabel label="Reports & config" />
        <NavItem icon={FileBarChart} name="Promotion Reports" path={sp('reports')} onClose={onClose} />
        <NavItem icon={Settings} name="Promotion Settings" path={sp('settings')} onClose={onClose} />
      </nav>

      <div className="p-3 shrink-0 border-t border-white/[0.06] space-y-2">
        <NavLink
          to={h('/')}
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium tracking-tight text-white/72 hover:bg-white/[0.06] hover:text-white border border-transparent transition-all"
        >
          <ArrowLeft size={18} strokeWidth={1.75} className="text-white/45 shrink-0" />
          <span className="truncate">Back to DOS portal</span>
        </NavLink>

        <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-re-gold/15 flex items-center justify-center shrink-0 ring-1 ring-re-gold/25 text-re-gold text-[11px] font-semibold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white truncate">
              {[teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ') || 'Director'}
            </p>
            <p className="text-[10px] text-white/45 truncate flex items-center gap-1">
              <ArrowUpCircle size={10} className="text-re-gold/80 shrink-0" />
              DOS · Promotion
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
