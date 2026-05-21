import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { promotionPageKey } from '../utils/paths';
import { useStudentPromotionData } from '../context/StudentPromotionDataContext';
import { useAuth } from '../../../context/AuthContext';

function HeaderSchoolLine() {
  const { schoolName, academicYear } = useStudentPromotionData();
  const line = [schoolName, academicYear].filter(Boolean).join(' · ');
  return <>{line || 'School promotion'}</>;
}

const pageTitles = {
  dashboard: 'Promotion Overview',
  'promote-class': 'Promote by Class',
  'promote-student': 'Promote by Student',
  history: 'Promotion History',
  settings: 'Promotion Settings',
  graduated: 'Graduated Students',
  repeaters: 'Repeaters Management',
  reports: 'Promotion Reports',
  simulation: 'Promotion Simulation',
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const { teacher } = useAuth();
  const title = pageTitles[promotionPageKey(location.pathname)] || 'Student Promotion';

  const initials = teacher
    ? `${(teacher.first_name || '')[0] || ''}${(teacher.last_name || '')[0] || ''}`.toUpperCase()
    : '?';

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white/80 backdrop-blur-xl border-b border-black/5 sticky top-0 z-20 gap-3 font-sans shrink-0">
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy rounded-xl transition-all"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-re-text tracking-tight truncate">{title}</h1>
          <p className="text-[10px] font-medium text-re-text-muted truncate">
            <HeaderSchoolLine />
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          className="relative p-2 text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy rounded-xl transition-all"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 border border-white rounded-full" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-re-gold/15 ring-1 ring-re-gold/25 flex items-center justify-center text-[11px] font-semibold text-[#0b1530]">
          {initials}
        </div>
      </div>
    </header>
  );
}
