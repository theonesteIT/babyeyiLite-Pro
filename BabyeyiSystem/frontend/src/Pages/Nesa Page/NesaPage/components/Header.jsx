import { Menu, Wifi, WifiOff, RefreshCw, Bell, SlidersHorizontal } from 'lucide-react';
import { resolveUrl } from '../utils/helpers';
import LogoutButton from './LogoutButton';

export default function Header({
  currentTabConfig,
  nesaUser,
  online,
  statsLoad,
  onRefresh,
  setMobileOpen,
  notifCount,
  onNavigateTab,
  showFilterButton = false,
  activeFilterCount = 0,
  onOpenFilters,
}) {
  return (
    <header
      className="sticky top-0 z-20 shrink-0 border-b border-[#fde68a]/80 bg-white/95 backdrop-blur-md"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex cursor-pointer items-center justify-center rounded-xl border-none bg-transparent p-2 text-[#000435] lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={2} />
          </button>
          <div className="min-w-0">
            <h2 className="m-0 truncate text-base font-bold text-[#000435] sm:text-lg">
              {currentTabConfig?.label || 'Dashboard'}
            </h2>
            <p className="m-0 mt-0.5 truncate text-[11px] font-medium text-amber-600">
              NESA Rwanda · National Level
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div
            className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold sm:flex ${
              online
                ? 'border border-amber-200 bg-amber-50 text-amber-700'
                : 'border border-[#000435]/10 bg-[#000435]/5 text-[#000435]/60'
            }`}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {online ? 'Online' : 'Offline'}
          </div>

          {showFilterButton && onOpenFilters && (
            <button
              type="button"
              onClick={onOpenFilters}
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#fde68a] bg-white px-2.5 py-2 text-[12px] font-bold text-[#000435] shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-50 sm:px-3"
              title="Filters"
            >
              <SlidersHorizontal size={15} className="text-amber-700" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-[18px] items-center justify-center rounded-full bg-[#c87800] px-1 text-[10px] font-black text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('notifications')}
              className="relative flex cursor-pointer items-center justify-center rounded-xl border border-[#fde68a] bg-amber-50 p-2 text-amber-700"
              title="Notifications"
            >
              <Bell size={16} />
              {notifCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh"
            className="flex cursor-pointer items-center justify-center rounded-xl border border-[#fde68a] bg-amber-50 p-2 text-amber-700 transition-colors hover:bg-amber-100"
          >
            <RefreshCw size={16} className={statsLoad ? 'animate-spin' : ''} />
          </button>

          {nesaUser && (
            <div className="hidden items-center gap-2 rounded-xl border border-[#fde68a] bg-amber-50/80 px-2.5 py-1.5 sm:flex">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#000435]">
                {resolveUrl(nesaUser.photo) ? (
                  <img src={resolveUrl(nesaUser.photo)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold text-amber-400">
                    {(nesaUser.fullName || 'N')[0]}
                  </span>
                )}
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="m-0 truncate text-xs font-semibold text-[#000435]">{nesaUser.fullName}</p>
                <p className="m-0 text-[9px] font-medium text-amber-600">{nesaUser.role}</p>
              </div>
            </div>
          )}

          <LogoutButton compact />
        </div>
      </div>
    </header>
  );
}
