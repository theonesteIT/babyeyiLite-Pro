import { NavLink, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Clock,
  FileBarChart,
  ArrowUpCircle,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { h } from '../../../utils/href';
import { sp } from '../utils/paths';

const babyeyiIcon = `${import.meta.env.BASE_URL || '/'}babyeyi-icon.png`;

function promoPathMatches(location, path) {
  if (!path) return false;
  return location.pathname === path || location.pathname.startsWith(`${path}/`);
}

function SubNavLink({ name, path, onClose }) {
  return (
    <NavLink
      to={path}
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
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-re-gold' : 'bg-white/30'}`}
            aria-hidden
          />
          <span className="truncate flex-1">{name}</span>
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ group, onClose, location, defaultOpen = false }) {
  const isAnyActive = group.items.some((item) => promoPathMatches(location, item.path));
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
            <SubNavLink key={item.path} name={item.name} path={item.path} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

function buildNavGroups() {
  return [
    {
      id: 'promotion',
      label: 'Promotion',
      icon: Users,
      items: [
        { name: 'Promote by Class', path: sp('promote-class') },
        { name: 'Promote by Student', path: sp('promote-student') },
        
      ],
    },
    {
      id: 'management',
      label: 'Management',
      icon: Clock,
      items: [
        { name: 'Promotion History', path: sp('history') },
        { name: 'Graduated Students', path: sp('graduated') },
        { name: 'Repeaters Management', path: sp('repeaters') },
      ],
    },
    {
      id: 'reports',
      label: 'Reports & Config',
      icon: FileBarChart,
      items: [
        { name: 'Promotion Reports', path: sp('reports') },
        { name: 'Promotion Settings', path: sp('settings') },
      ],
    },
  ];
}

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const { teacher } = useAuth();

  const initials = teacher
    ? `${(teacher.first_name || '')[0] || ''}${(teacher.last_name || '')[0] || ''}`.toUpperCase()
    : 'DO';

  const navGroups = useMemo(() => buildNavGroups(), []);
  const overviewActive = promoPathMatches(location, sp('dashboard'));

  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] font-sans"
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
            <p className="text-[10px] font-medium tracking-wide text-amber-400 mt-0.5">Student Promotion</p>
          </div>
        </div>
      </div>

      <nav
        className="dos-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-1 pr-1"
        aria-label="Student promotion navigation"
      >
        <NavLink
          to={sp('dashboard')}
          onClick={onClose}
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium tracking-tight border border-transparent
            ${
              overviewActive
                ? 'bg-white/[0.12] text-re-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
                : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
            }`}
        >
          <LayoutDashboard
            size={18}
            strokeWidth={1.75}
            className={overviewActive ? 'text-re-gold shrink-0' : 'text-white/45 shrink-0'}
          />
          <span className="truncate">Overview</span>
        </NavLink>

        {navGroups.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            onClose={onClose}
            location={location}
          />
        ))}
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
