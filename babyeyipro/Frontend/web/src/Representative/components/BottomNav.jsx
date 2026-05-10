import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, BarChart3, Wallet, Settings } from 'lucide-react';
import { h } from '../utils/href';

export default function RepresentativeBottomNav() {
  const navItems = [
    { icon: LayoutDashboard, name: 'Home', path: h('/'), exact: true },
    { icon: Building2, name: 'Schools', path: h('/schools') },
    { icon: BarChart3, name: 'Analytics', path: h('/analytics') },
    { icon: Wallet, name: 'Finance', path: h('/finance') },
    { icon: Settings, name: 'Settings', path: h('/settings') },
  ];

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-[100] pointer-events-none">
      <div className="pointer-events-auto mx-3 mb-2 flex justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <nav
          className="flex h-[3.25rem] w-full max-w-lg items-stretch gap-0.5 rounded-2xl bg-white/95 px-1.5 py-1 shadow-[0_8px_32px_-12px_rgba(0,4,53,0.35),0_2px_8px_-4px_rgba(0,0,0,0.06)] ring-1 ring-slate-200/90 backdrop-blur-md"
          aria-label="Representative mobile navigation"
        >
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `group flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-[#000435] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.25 : 1.85}
                    className={`shrink-0 ${isActive ? 'text-amber-400' : 'text-current'}`}
                    aria-hidden
                  />
                  <span
                    className={`mt-0.5 max-w-full truncate text-[8.5px] font-extrabold uppercase tracking-[0.06em] ${
                      isActive ? 'text-white/90' : ''
                    }`}
                  >
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
