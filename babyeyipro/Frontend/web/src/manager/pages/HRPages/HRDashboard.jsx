import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, GraduationCap, Palmtree, UserPlus, FileText, FolderOpen,
  CheckCircle, ArrowLeftRight, TrendingUp, AlertTriangle, Info, Cake,
} from 'lucide-react';
import { h } from '../../utils/href';
import { HrPageLayout, HrPanel, HrAlert } from './hrUi';
import HrGrowthTrendChart, { buildGrowthTrendSeries } from './HrGrowthTrendChart';

const deptData = [
  { name: 'Academics', count: 142, pct: 72 },
  { name: 'Administration', count: 28, pct: 14 },
  { name: 'Finance', count: 12, pct: 6 },
  { name: 'ICT', count: 8, pct: 4 },
  { name: 'Library', count: 7, pct: 3.5 },
  { name: 'Support', count: 3, pct: 1.5 },
];

const genderData = [
  { label: 'Male', pct: 58, color: 'bg-[#c87800]' },
  { label: 'Female', pct: 42, color: 'bg-[#FEBF10]' },
];

const monthlyHires = [12, 18, 15, 22, 19, 25, 21, 28, 24, 30, 26, 32];

const QUICK_ACTION_ROUTES = {
  registration: '/hr/registration',
  contracts: '/hr/contracts',
  documents: '/hr/documents',
  leave: '/hr/leave',
};

const heroKpiTiles = [
  { icon: Users, label: 'Total Employees', value: '200', subValue: 'Active workforce' },
  { icon: UserCheck, label: 'Active', value: '187', subValue: '93.5% active rate' },
  { icon: GraduationCap, label: 'Teachers', value: '142', subValue: '71% of total' },
  { icon: Palmtree, label: 'On Leave', value: '13', subValue: '6.5% of staff' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const growthTrendData = useMemo(() => buildGrowthTrendSeries(monthlyHires), []);

  return (
    <HrPageLayout
      eyebrow="HR Center"
      title="HR Dashboard"
      subtitle="Workforce overview, trends, and quick personnel actions"
      HeroIcon={Users}
      kpiTiles={heroKpiTiles}
      kpiGridClassName="grid-cols-2 lg:grid-cols-4"
      cardBody={<HrGrowthTrendChart data={growthTrendData} embedded />}
      contentClassName="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-4 sm:space-y-5"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <HrPanel className="lg:col-span-2 p-5">
          <h3 className="text-xs text-[#000435] uppercase tracking-wide mb-4" style={{ fontWeight: 500 }}>
            Employees by department
          </h3>
          <div className="space-y-3">
            {deptData.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-slate-500 text-xs w-20 sm:w-24 shrink-0">{d.name}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-0">
                  <div
                    className="h-full bg-gradient-to-r from-[#c87800] to-[#FEBF10] rounded-full"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="text-[#c87800] text-xs w-8 text-right tabular-nums shrink-0" style={{ fontWeight: 500 }}>
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        </HrPanel>

        <HrPanel className="p-5">
          <h3 className="text-xs text-[#000435] uppercase tracking-wide mb-4" style={{ fontWeight: 500 }}>
            Gender distribution
          </h3>
          <div className="flex justify-center mb-4">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#c87800" strokeWidth="3" strokeDasharray="58 42" strokeLinecap="round" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#FEBF10" strokeWidth="3" strokeDasharray="42 58" strokeDashoffset="-58" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[#000435] text-xl tabular-nums" style={{ fontWeight: 500 }}>200</span>
                <span className="text-slate-400 text-xs">Total</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {genderData.map((g) => (
              <div key={g.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${g.color}`} />
                  <span className="text-slate-600 text-xs">{g.label}</span>
                </div>
                <span className="text-[#000435] text-sm tabular-nums" style={{ fontWeight: 500 }}>{g.pct}%</span>
              </div>
            ))}
          </div>
        </HrPanel>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HrPanel className="p-5">
          <h3 className="text-xs text-[#000435] uppercase tracking-wide mb-4" style={{ fontWeight: 500 }}>
            Quick actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Add Employee', icon: UserPlus, page: 'registration' },
              { label: 'New Contract', icon: FileText, page: 'contracts' },
              { label: 'Upload Docs', icon: FolderOpen, page: 'documents' },
              { label: 'Approve Leave', icon: CheckCircle, page: 'leave' },
              { label: 'Transfer', icon: ArrowLeftRight, page: null },
              { label: 'Promote', icon: TrendingUp, page: null },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => {
                  const path = QUICK_ACTION_ROUTES[a.page];
                  if (path) navigate(h(path));
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-[#FEBF10]/50 hover:bg-amber-50/50 transition-all text-left"
              >
                <a.icon size={16} strokeWidth={1.75} className="text-[#c87800] shrink-0" />
                <span className="text-slate-600 text-xs" style={{ fontWeight: 500 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </HrPanel>

        <HrPanel className="p-5 space-y-2">
          <h3 className="text-xs text-[#000435] uppercase tracking-wide mb-2" style={{ fontWeight: 500 }}>
            Alerts
          </h3>
          <HrAlert variant="danger" title="3 contracts expire this week" icon={AlertTriangle}>
            Action required
          </HrAlert>
          <HrAlert variant="warning" title="5 employees missing documents" icon={AlertTriangle}>
            Review needed
          </HrAlert>
          <HrAlert variant="info" title="2 probation periods ending soon" icon={Info}>
            Within 7 days
          </HrAlert>
          <HrAlert variant="success" title="3 birthdays this month" icon={Cake}>
            Send wishes
          </HrAlert>
        </HrPanel>
      </div>
    </HrPageLayout>
  );
}
