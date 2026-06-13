import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { h } from '../utils/href';

const MARKS_BASE = h('/student-marks-reports');
const DASHBOARD_PATH = h('/student-marks-reports/dashboard');

export default function StudentMarksReportsSidebarNav({ onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = location.pathname === MARKS_BASE || location.pathname.startsWith(`${MARKS_BASE}/`);

  return (
    <button
      type="button"
      onClick={() => {
        navigate(DASHBOARD_PATH);
        onClose?.();
      }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-[13px] font-medium tracking-tight border border-transparent
        ${
          isActive
            ? 'bg-white/[0.12] text-re-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border-white/10'
            : 'text-white/72 hover:bg-white/[0.06] hover:text-white'
        }`}
    >
      <BarChart2
        size={18}
        strokeWidth={1.75}
        className={isActive ? 'text-re-gold shrink-0' : 'text-white/45 group-hover:text-white/85 shrink-0 transition-colors'}
      />
      <span className="truncate text-left flex-1">Student Marks &amp; Reports</span>
    </button>
  );
}
