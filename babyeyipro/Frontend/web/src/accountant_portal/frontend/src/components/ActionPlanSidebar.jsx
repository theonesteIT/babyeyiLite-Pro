import { createElement } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { h } from '../utils/href';
import { ACTION_PLAN_NAV } from '../utils/actionPlanNav';
import babyeyiIcon from '../assets/babyeyi-icon.png';

function NavButton({ item, active, onSelect, onClose }) {
  const ItemIcon = item.Icon;
  const baseClass =
    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-medium tracking-tight border border-transparent w-full text-left';
  const activeClass =
    'bg-white/[0.12] text-re-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10';
  const inactiveClass = 'text-white/72 hover:bg-white/[0.06] hover:text-white';

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(item.id);
        onClose?.();
      }}
      className={`${baseClass} ${active ? activeClass : inactiveClass}`}
    >
      {createElement(ItemIcon, {
        size: 18,
        strokeWidth: 1.75,
        className: active
          ? 'text-re-gold shrink-0'
          : 'text-white/45 group-hover:text-white/85 shrink-0 transition-colors',
      })}
      <span className="truncate">{item.label}</span>
    </button>
  );
}

const SectionLabel = ({ label }) => (
  <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400/85 px-3 pt-4 pb-2 first:pt-1">
    {label}
  </p>
);

export default function ActionPlanSidebar({ activePage, onSelectPage, onClose, periodLabel }) {
  return (
    <div
      className="flex flex-col min-h-0 h-full w-full min-w-0 border-r border-white/[0.06] shadow-sm font-sans"
      style={{ background: '#000435', colorScheme: 'dark', fontFamily: "'Montserrat', sans-serif" }}
    >
      <div className="p-4 pb-3 shrink-0 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden">
            <img src={babyeyiIcon} alt="Babyeyi" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0">
            <span className="text-base font-semibold tracking-tight text-white block leading-tight">
              School Action Plan
            </span>
            <p className="text-[10px] font-medium tracking-wide text-amber-400 mt-0.5">
              Management Module
            </p>
          </div>
        </div>
      </div>

      <nav
        className="accountant-sidebar-scroll flex-1 min-h-0 px-3 py-3 overflow-y-auto overflow-x-hidden overscroll-y-contain space-y-0.5 pr-1"
        aria-label="Action plan navigation"
      >
        {ACTION_PLAN_NAV.map((section) => (
          <div key={section.section}>
            <SectionLabel label={section.section} />
            {section.items.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activePage === item.id}
                onSelect={onSelectPage}
                onClose={onClose}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="p-3 shrink-0 border-t border-white/[0.06] space-y-2">
        <NavLink
          to={h('/')}
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium tracking-tight text-white/72 hover:bg-white/[0.06] hover:text-white border border-transparent transition-all"
        >
          <ArrowLeft size={18} strokeWidth={1.75} className="text-white/45 shrink-0" />
          <span className="truncate">Back to accountant portal</span>
        </NavLink>
        {periodLabel ? (
          <p className="text-[10px] font-medium text-white/40 px-3 pb-1 leading-snug">{periodLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
