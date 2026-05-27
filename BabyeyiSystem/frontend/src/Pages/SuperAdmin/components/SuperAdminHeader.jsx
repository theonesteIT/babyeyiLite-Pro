/**
 * SuperAdminHeader — white bar, navy + amber accents, mobile menu
 */
import { Menu, Wifi, WifiOff } from 'lucide-react';
import LogoutButton from '../../Auth/LogoutButton';
import { BABYEYI_FONT_STACK } from '../../../theme/babyeyiDashboardTheme';

export default function SuperAdminHeader({
  title = 'Dashboard',
  subtitle = 'Super Admin · Rwanda Education System',
  online = true,
  user,
  setMobileOpen,
}) {
  const initial = user?.first_name?.[0]?.toUpperCase() || 'S';
  const displayName = user?.full_name || 'Super Admin';

  return (
    <header
      className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm"
      style={{ fontFamily: BABYEYI_FONT_STACK }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen?.(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#000435] text-amber-400 transition hover:bg-[#000a50] lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold leading-tight text-[#000435] sm:text-lg">{title}</h2>
            <p className="hidden truncate text-[10px] font-semibold text-slate-500 sm:block">{subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`hidden items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-bold sm:flex ${
              online
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {online ? 'Online' : 'Offline'}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#000435] text-[11px] font-black text-amber-400">
              {initial}
            </div>
            <div className="hidden sm:block">
              <p className="max-w-[140px] truncate text-xs font-semibold leading-tight text-[#000435]">{displayName}</p>
              <p className="text-[10px] font-medium text-amber-700">Full Access</p>
            </div>
          </div>

          <div className="hidden sm:block">
            <LogoutButton
              variant="default"
              size="sm"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-[#000435] hover:bg-amber-50"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
