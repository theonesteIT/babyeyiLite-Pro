import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import GateAttendance from '../../../../dos/pages/AttendanceModule/GateAttendance';
import { h } from '../utils/href';

/**
 * Morning entry / evening exit dashboard for stock planning.
 * Reuses manager gate UI without settings or manual tap controls.
 */
export default function StorekeeperGateAttendance() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Link
          to={h('/arrival-reports')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-[#c87800]/40 hover:text-[#c87800] transition-colors"
        >
          <ClipboardList size={14} />
          Arrival reports (yesterday, week, term…)
        </Link>
      </div>
      <GateAttendance
        hideSettings
        readOnly
        studentStatsOnly
        defaultRoleFilter="Student"
      />
    </div>
  );
}
