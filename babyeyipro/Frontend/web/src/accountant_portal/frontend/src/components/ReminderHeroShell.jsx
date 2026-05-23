import { createElement } from 'react';
import { RefreshCw } from 'lucide-react';
import AccountantOchreHero from './AccountantOchreHero';

/**
 * Accountant-style ochre hero + overlapping KPI strip for Fee Reminders module.
 */
export default function ReminderHeroShell({
  eyebrow = 'Fee communications',
  titleLine = 'Reminder',
  titleAccent = 'Dashboard',
  subtitle = 'Campaigns · parent outreach · auto rules',
  icon,
  stats = [],
  actions = [],
  tabs = [],
  activeTab,
  onTabChange,
  liveLabel = 'Live data',
  onRefresh,
  refreshing = false,
  rightExtra = null,
}) {
  return (
    <div className="w-full" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <AccountantOchreHero
        eyebrow={eyebrow}
        titleLine={titleLine}
        titleAccent={titleAccent}
        subtitle={subtitle}
        icon={icon}
        rightSlot={
          <>
            <div className="flex bg-white/10 backdrop-blur-md rounded-xl border border-white/20 px-3 py-2">
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/90">
                {refreshing ? 'Updating…' : liveLabel}
              </span>
            </div>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-[#FEBF10]/35 bg-[#FEBF10]/15 px-4 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white hover:bg-[#FEBF10]/25 transition-all active:scale-95 disabled:opacity-60"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            ) : null}
            {rightExtra}
          </>
        }
      />

      <div className="acct-shell-standard mb-4 sm:mb-6">
        <div className="acct-panel-sheet overflow-hidden flex flex-col shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 xl:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
              {stats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={stat.onClick}
                  disabled={!stat.onClick}
                  className={`p-4 sm:p-5 flex flex-col items-center justify-center text-center min-h-[7rem] transition-all ${
                    stat.onClick ? 'hover:bg-[#F8F9FF]/80 cursor-pointer group' : 'cursor-default'
                  }`}
                >
                  {stat.icon ? (
                    <div className="mb-1 sm:mb-1.5 opacity-50 shrink-0" style={{ color: '#FEBF10' }}>
                      {createElement(stat.icon, { size: 14, className: 'mx-auto', strokeWidth: 2 })}
                    </div>
                  ) : null}
                  <span className="text-sm sm:text-lg font-semibold text-[#000435] tracking-tight tabular-nums group-hover:text-[#c87800] transition-colors">
                    {stat.value}
                  </span>
                  <p className="text-[7px] sm:text-[8px] font-medium text-[#6B7280] uppercase tracking-[0.16em] mt-0.5">
                    {stat.label}
                  </p>
                  {stat.subValue ? (
                    <p className="text-[6px] sm:text-[7px] font-medium uppercase tracking-widest mt-1 text-[#000435]/70 max-w-[11rem]">
                      {stat.subValue}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>

            {actions.length > 0 ? (
              <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-[#FFFBF5]/50 p-4 sm:p-5 justify-center gap-2.5">
                {actions.map((act) => (
                  <button
                    key={act.label}
                    type="button"
                    onClick={act.onClick}
                    className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl font-medium text-[9px] uppercase tracking-widest transition-all active:scale-[0.98] ${
                      act.variant === 'navy'
                        ? 'text-white shadow-sm'
                        : act.variant === 'cream'
                          ? 'bg-[#FFFBEB] border border-black/8 text-[#000435] hover:border-[#F59E0B]/40'
                          : 'bg-white border border-black/8 text-[#000435] hover:border-[#000435]/25'
                    }`}
                    style={
                      act.variant === 'navy'
                        ? { background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }
                        : undefined
                    }
                  >
                    {act.icon ? createElement(act.icon, { size: 14, strokeWidth: 2 }) : null}
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {tabs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1 px-3 sm:px-4 py-2.5 bg-[#FAFAFC] border-t border-black/5">
              {tabs.map((t) => {
                const active = activeTab === t.id;
                const TabIcon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTabChange?.(t.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-medium transition-all ${
                      active
                        ? 'bg-[#FEF3C7] text-[#000435] border border-[#F59E0B]/35 shadow-sm'
                        : 'text-[#6B7280] border border-transparent hover:bg-white hover:text-[#000435]'
                    }`}
                  >
                    {TabIcon ? createElement(TabIcon, { size: 15, strokeWidth: 1.75 }) : null}
                    {t.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
