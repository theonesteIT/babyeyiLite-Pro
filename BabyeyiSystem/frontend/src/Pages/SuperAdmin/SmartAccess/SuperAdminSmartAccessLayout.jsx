import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, Fingerprint, GraduationCap, Radio } from 'lucide-react';
import LogoutButton from '../../Auth/LogoutButton';
import { useAuth } from '../../../context/AuthContext';
import { BABYEYI_FONT_STACK, BABYEYI_NAVY } from '../../../theme/babyeyiDashboardTheme';

const NAV = [
  {
    to: '/superadmin/smart-access/students',
    icon: GraduationCap,
    label: 'Student Smart Access',
    end: false,
  },
  {
    to: '/superadmin/smart-access/staff',
    icon: Fingerprint,
    label: 'Staff Smart Access',
    end: false,
  },
];

export default function SuperAdminSmartAccessLayout() {
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row bg-slate-100"
      style={{ fontFamily: BABYEYI_FONT_STACK }}
    >
      <aside
        className="w-full md:w-[280px] shrink-0 md:min-h-screen md:sticky md:top-0 flex flex-col border-b md:border-b-0 md:border-r border-white/10 text-white shadow-xl"
        style={{ background: `linear-gradient(165deg, ${BABYEYI_NAVY} 0%, #0a1628 55%, #111827 100%)` }}
      >
        <div className="p-4 md:p-5 border-b border-white/10">
          <NavLink
            to="/superadmin/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-200/90 hover:text-amber-100 mb-4"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to dashboard
          </NavLink>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-amber-400/15 border border-amber-300/30 flex items-center justify-center">
              <Radio className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-200/70">Babyeyi</p>
              <h1 className="text-lg font-black tracking-tight">Smart Access</h1>
              <p className="text-[10px] text-white/50 font-semibold uppercase tracking-widest mt-0.5">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 md:p-4 space-y-1">
          <p className="px-2 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Navigate</p>
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-all
                ${isActive
                  ? 'bg-amber-400 text-[#000435] shadow-lg shadow-black/25'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="rounded-xl bg-white/5 px-3 py-2 border border-white/10">
            <p className="text-[11px] text-white font-bold truncate">
              {user?.first_name || ''} {user?.last_name || ''}
            </p>
            <p className="text-[10px] text-amber-200/70 font-semibold truncate">{user?.email}</p>
          </div>
          <LogoutButton variant="sidebar" />
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
