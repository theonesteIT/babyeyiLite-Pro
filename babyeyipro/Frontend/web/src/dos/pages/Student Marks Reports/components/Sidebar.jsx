import { NavLink, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { LayoutDashboard, ArrowLeft, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { resolveUserPhotoUrl } from '../../../../shared/utils/userPhotoUrl';
import { h } from '../../../utils/href';
import { smr } from '../utils/paths';
import { NAV_GROUPS } from '../navConfig';

const babyeyiIcon = `${import.meta.env.BASE_URL || '/'}babyeyi-icon.png`;

function pathMatches(location, path) {
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
        ${isActive ? 'text-re-gold bg-white/[0.08]' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-re-gold' : 'bg-white/30'}`} aria-hidden />
          <span className="truncate flex-1">{name}</span>
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ group, onClose, location }) {
  const isAnyActive = group.items.some((item) => pathMatches(location, item.path));
  const [open, setOpen] = useState(isAnyActive);
  const GroupIcon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium tracking-tight group border border-transparent
          ${isAnyActive ? 'bg-white/[0.12] text-re-gold border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'text-white/72 hover:bg-white/[0.06] hover:text-white'}`}
      >
        <GroupIcon size={18} strokeWidth={1.75} className={`${isAnyActive ? 'text-re-gold' : 'text-white/45 group-hover:text-white/85'} transition-colors shrink-0`} />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronDown size={16} strokeWidth={2} className={`transition-transform duration-300 text-white/40 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-2 mt-1 space-y-0.5 border-l border-white/15 pl-3 max-h-[280px] overflow-y-auto">
          {group.items.map((item) => (
            <SubNavLink key={item.path} name={item.name} path={item.path} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const { teacher } = useAuth();
  const navGroups = useMemo(() => NAV_GROUPS.filter((g) => g.id !== 'dashboard'), []);
  const overviewActive = pathMatches(location, smr('dashboard'));

  const avatarPhoto = teacher?.photo ? resolveUserPhotoUrl(teacher.photo) : null;

  return (
    <div className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] font-sans" style={{ background: '#000435', colorScheme: 'dark' }}>
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-semibold tracking-tight text-white block leading-tight">Babyeyi</span>
            <p className="text-[10px] font-medium tracking-wide text-amber-400 mt-0.5">Student Marks &amp; Reports</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden space-y-0.5 pr-1 dos-sidebar-scroll">
        <NavLink
          to={smr('dashboard')}
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium border border-transparent mb-2
            ${overviewActive ? 'bg-white/[0.12] text-re-gold border-white/10' : 'text-white/72 hover:bg-white/[0.06] hover:text-white'}`}
        >
          <LayoutDashboard size={18} strokeWidth={1.75} className={overviewActive ? 'text-re-gold' : 'text-white/45'} />
          <span>Dashboard</span>
        </NavLink>

        {navGroups.map((group) => (
          <NavGroup key={group.id} group={group} onClose={onClose} location={location} />
        ))}
      </nav>

      <div className="p-4 shrink-0 border-t border-white/[0.06] space-y-2">
        <NavLink
          to={h('/')}
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
        >
          <ArrowLeft size={16} />
          Back to DOS
        </NavLink>
        <div className="rounded-xl bg-white/[0.06] ring-1 ring-white/10 p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0 ring-1 ring-white/10">
            {avatarPhoto ? (
              <img src={avatarPhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={16} className="text-white/70" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white truncate">{teacher?.first_name || 'Director'}</p>
            <p className="text-[10px] text-white/45 truncate">Academic oversight</p>
          </div>
        </div>
      </div>
    </div>
  );
}
