import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { sp } from '../utils/paths';
import PromotionPageHero from './PromotionPageHero';

/**
 * Dashboard-specific hero with quick-start actions (reuses PromotionPageHero).
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
  const yearLine = [academicYear, schoolName].filter(Boolean).join(' · ');

  return (
    <PromotionPageHero
      title={`Welcome back, ${firstName}`}
      subtitle={
        yearLine
          ? `${yearLine} — manage promotions, repeaters, and graduation certificates.`
          : 'Manage promotions, repeaters, and graduation certificates.'
      }
      heroStats={heroStats}
      onRefresh={onRefresh}
      refreshing={refreshing}
      liveOk={!refreshing}
    >
      <button
        type="button"
        onClick={() => navigate(sp('promote-class'))}
        className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-sm font-bold text-amber-400 shadow-lg shadow-[#000435]/30 transition hover:bg-[#0a0a52] active:scale-[0.98]"
      >
        Start promotion
        <ArrowRight size={16} />
      </button>
      <button
        type="button"
        onClick={() => navigate(sp('simulation'))}
        className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
      >
        Run simulation
      </button>
    </PromotionPageHero>
  );
}
