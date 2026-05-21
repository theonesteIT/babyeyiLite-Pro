import { ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { sp } from '../utils/paths';

const NAVY = '#000435';
const AMBER = '#F59E0B';

/**
 * DOS Promotion hero — amber welcome band + overlapping navy stat strip (main portal style).
 */
export default function PromotionDashboardHero({
  academicYear,
  schoolName,
  heroStats = [],
  onRefresh,
  refreshing = false,
}) {
  const navigate = useNavigate();
  const { teacher } = useAuth();
  const firstName = teacher?.first_name || 'Director';

  return (
    <section className="relative mb-0">
      <div
        className="relative min-h-[220px] sm:min-h-[260px] md:min-h-[280px] overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${AMBER} 0%, #ea8c00 45%, #d97706 100%)`,
        }}
      >
       

        <div className="absolute inset-0 z-[1] hidden sm:block">
          <img
            src="/teacher.png"
            alt=""
            className="absolute right-0 bottom-0 h-[88%] max-h-[300px] w-auto object-contain object-bottom opacity-95"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#ea8c00]/95 via-[#f59e0b]/70 to-transparent" aria-hidden />
        </div>

        <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#000435]/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            Babyeyi · DOS Promotion
          </div>
        </div>

        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6 sm:top-6">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-[#000435]/25 text-white hover:bg-[#000435]/40 transition active:scale-95 disabled:opacity-60"
              aria-label="Refresh data"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          ) : null}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-14 sm:pt-16 pb-24 sm:pb-28 md:pr-[38%]">
          <h1 className="text-2xl sm:text-3xl md:text-[2rem] font-semibold text-white tracking-tight leading-tight">
            Welcome back, {firstName}
          </h1>
          
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => navigate(sp('promote-class'))}
              className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-sm font-bold text-amber-400 shadow-lg shadow-[#000435]/30 hover:bg-[#0a0a52] transition active:scale-[0.98]"
            >
              Start promotion
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => navigate(sp('simulation'))}
              className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/25 transition"
            >
              Run simulation
            </button>
          </div>
        </div>
      </div>

      {heroStats.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 sm:-mt-14 relative z-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 bg-white rounded-2xl sm:rounded-t-[28px] border border-black/[0.08] shadow-[0_12px_40px_-12px_rgba(0,4,53,0.25)] overflow-hidden">
            {heroStats.map((stat, i) => (
              <div
                key={stat.label}
                className={`px-4 py-4 sm:py-5 text-center min-h-[5.5rem] flex flex-col items-center justify-center
                  ${i < heroStats.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-black/[0.06]' : ''}
                  ${i % 2 === 0 && i < 2 ? 'border-r border-black/[0.06] sm:border-r' : ''}
                  hover:bg-slate-50/80 transition-colors`}
              >
                <span className="text-xl sm:text-2xl font-semibold tabular-nums tracking-tight" style={{ color: NAVY }}>
                  {stat.value}
                </span>
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-1 leading-snug">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
