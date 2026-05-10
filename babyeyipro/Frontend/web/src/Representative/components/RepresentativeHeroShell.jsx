import React, { useState, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  ChevronDown,
  ShieldCheck,
  RefreshCw,
  Printer,
  FileBarChart2,
} from 'lucide-react';
import { h } from '../utils/href';

const HERO_BG = '#f59e0b'; /* amber-500 */
const GOLD = '#FEBF10';
const NAVY_GRAD = 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)';

const REP_QUICK_ACTIONS = [
  { label: 'My schools', path: '/schools' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Finance', path: '/finance' },
  { label: 'Documents', path: '/documents' },
  { label: 'Inspections', path: '/inspections' },
];

/**
 * Hero + overlapping KPI card — same institutional pattern as Manager dashboard
 * (`manager/pages/Dashboard.jsx`) and DOS `DosOchreHero` (ochre band + gold hairline).
 */
export default function RepresentativeHeroShell({
  eyebrow,
  title,
  subtitle,
  HeroIcon = null,
  headerRight = null,
  kpiTiles = [],
  kpiGridClassName = '',
  cardBody = null,
  pageBody = null,
  outerClassName = 'animate-in fade-in duration-500 bg-re-bg min-h-screen pb-20',
  overlapClassName = 'max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 mb-6 sm:mb-8',
  /** Called when user taps “Refresh data” in the hero sidebar */
  onRefresh = null,
}) {
  const navigate = useNavigate();
  const [heroDropdown, setHeroDropdown] = useState(null);

  const n = kpiTiles.length;
  const innerStatGrid =
    kpiGridClassName ||
    (n <= 4 ? 'grid-cols-2 xl:grid-cols-4' : n === 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4');

  const renderStatCell = (t, i) => {
    const Icon = t.icon;
    const inner = (
      <>
        {Icon ? (
          <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: GOLD }}>
            <Icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
          </div>
        ) : null}
        <span className="text-sm sm:text-lg font-semibold text-re-text tabular-nums tracking-tight group-hover:text-[#1E3A5F] transition-colors leading-snug">
          {t.value}
        </span>
        <p className="text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.12em] mt-0.5 opacity-65">
          {t.label}
        </p>
        {t.subValue ? (
          <p
            className={`text-[6px] sm:text-[7px] font-semibold uppercase tracking-[0.14em] mt-1 opacity-80 max-w-[11rem] ${
              String(t.subValue).startsWith('-') ? 'text-rose-600' : 'text-[#1E3A5F]'
            }`}
          >
            {t.subValue}
          </p>
        ) : null}
      </>
    );
    const cellClass = `p-4 sm:p-5 flex flex-col items-center justify-center text-center group min-h-[7.5rem] ${
      t.selected ? 'ring-2 ring-inset ring-amber-400/40 bg-amber-400/[0.07]' : ''
    } ${t.onClick ? 'hover:bg-re-bg/40 transition-all cursor-pointer' : ''}`;

    if (t.onClick) {
      return (
        <button key={t.key ?? i} type="button" onClick={t.onClick} className={cellClass}>
          {inner}
        </button>
      );
    }
    return (
      <div key={t.key ?? i} className={cellClass}>
        {inner}
      </div>
    );
  };

  const hasKpiStrip = kpiTiles.length > 0;

  return (
    <div className={outerClassName}>
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden" style={{ backgroundColor: HERO_BG }}>
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div
          className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none"
          aria-hidden
        />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-5 sm:gap-6 lg:gap-8 items-start min-w-0 flex-1">
              {HeroIcon ? (
                <div className="hidden sm:flex shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-[24px] md:rounded-[28px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-sm shadow-sm">
                  {createElement(HeroIcon, {
                    size: 32,
                    className: 'text-[#FEBF10]',
                    strokeWidth: 1.75,
                  })}
                </div>
              ) : null}
              <div className="space-y-1 max-w-3xl min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="w-5 h-1 rounded-full shrink-0" style={{ backgroundColor: GOLD }} aria-hidden />
                  {eyebrow ? (
                    <p className="text-[10px] font-medium uppercase tracking-widest text-white/85">{eyebrow}</p>
                  ) : null}
                </div>
                <h1
                  className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-0.5 uppercase"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  {title}
                </h1>
                {subtitle ? (
                  <p className="text-xs sm:text-sm font-normal text-white/82 max-w-2xl leading-relaxed">{subtitle}</p>
                ) : null}
              </div>
            </div>
            {headerRight ? (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 lg:pt-1">{headerRight}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={overlapClassName}>
        <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">
          {hasKpiStrip ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
                <div className={`lg:col-span-3 grid ${innerStatGrid} divide-x divide-y lg:divide-y-0 divide-black/5`}>
                  {kpiTiles.map((t, i) => renderStatCell(t, i))}
                </div>

                <div className="hidden lg:flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setHeroDropdown(heroDropdown === 'export' ? null : 'export')}
                      className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm active:scale-95 transition-all"
                      style={{ background: NAVY_GRAD }}
                    >
                      <Download size={14} aria-hidden />
                      <span>Export records</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-300 ${heroDropdown === 'export' ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {heroDropdown === 'export' && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-[40] cursor-default bg-transparent"
                          aria-label="Dismiss"
                          onClick={() => setHeroDropdown(null)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                            onClick={() => {
                              window.print();
                              setHeroDropdown(null);
                            }}
                          >
                            <Printer size={14} style={{ color: GOLD }} aria-hidden /> Print overview
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                            onClick={() => {
                              navigate(h('/documents'));
                              setHeroDropdown(null);
                            }}
                          >
                            <FileBarChart2 size={14} style={{ color: GOLD }} aria-hidden /> Open documents
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setHeroDropdown(heroDropdown === 'quick' ? null : 'quick')}
                      className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
                    >
                      <ShieldCheck size={14} style={{ color: GOLD }} aria-hidden />
                      <span>Quick actions</span>
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-300 ${heroDropdown === 'quick' ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {heroDropdown === 'quick' && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-[40] cursor-default bg-transparent"
                          aria-label="Dismiss"
                          onClick={() => setHeroDropdown(null)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200 max-h-[min(60vh,20rem)] overflow-y-auto manager-sidebar-scroll">
                          {REP_QUICK_ACTIONS.map((item) => (
                            <button
                              key={item.path}
                              type="button"
                              className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors border-t border-black/5 first:border-t-0"
                              onClick={() => {
                                navigate(h(item.path));
                                setHeroDropdown(null);
                              }}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof onRefresh === 'function') onRefresh();
                      else window.location.reload();
                      setHeroDropdown(null);
                    }}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-medium text-[9px] uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/40 bg-[#FEBF10]/15 hover:bg-[#FEBF10]/25 transition-all"
                  >
                    <RefreshCw size={14} aria-hidden />
                    Refresh data
                  </button>
                </div>
              </div>

              <div className="lg:hidden grid grid-cols-2 gap-2 p-4 border-b border-black/5 bg-white">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHeroDropdown(heroDropdown === 'export' ? null : 'export')}
                    className="w-full h-10 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm"
                    style={{ background: NAVY_GRAD }}
                  >
                    <Download size={14} aria-hidden />
                    Export
                    <ChevronDown size={11} className={heroDropdown === 'export' ? 'rotate-180' : ''} aria-hidden />
                  </button>
                  {heroDropdown === 'export' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-xl overflow-hidden py-1 z-[50]">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-slate-800 hover:bg-slate-50"
                        onClick={() => {
                          window.print();
                          setHeroDropdown(null);
                        }}
                      >
                        Print overview
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-[10px] font-bold text-slate-800 hover:bg-slate-50 border-t border-black/5"
                        onClick={() => {
                          navigate(h('/documents'));
                          setHeroDropdown(null);
                        }}
                      >
                        Documents
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHeroDropdown(heroDropdown === 'quick' ? null : 'quick')}
                    className="w-full h-10 flex items-center justify-center gap-2 bg-[#FEBF10]/15 border border-[#FEBF10]/40 text-[#1E3A5F] rounded-xl font-medium text-[9px] uppercase tracking-widest"
                  >
                    Quick actions
                    <ChevronDown size={11} className={heroDropdown === 'quick' ? 'rotate-180' : ''} aria-hidden />
                  </button>
                  {heroDropdown === 'quick' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-xl overflow-hidden py-1 z-[50] max-h-56 overflow-y-auto manager-sidebar-scroll">
                      {REP_QUICK_ACTIONS.map((item) => (
                        <button
                          key={item.path}
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 border-t border-black/5 first:border-t-0"
                          onClick={() => {
                            navigate(h(item.path));
                            setHeroDropdown(null);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}

          {cardBody}
        </div>
      </div>

      {heroDropdown && (
        <button
          type="button"
          className="fixed inset-0 z-[35] lg:hidden bg-transparent cursor-default"
          aria-label="Close menu"
          onClick={() => setHeroDropdown(null)}
        />
      )}

      {pageBody}
    </div>
  );
}
