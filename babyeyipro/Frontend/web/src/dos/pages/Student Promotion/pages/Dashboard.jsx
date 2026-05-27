import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import { ArrowRight, Users, User, PlayCircle, FileBarChart } from 'lucide-react';
import { sp } from '../utils/paths';
import { useStudentPromotionData } from '../context/StudentPromotionDataContext';
import PromotionDashboardHero from '../components/PromotionDashboardHero';
import { PromotionPageBody } from '../components/PromotionPageHero';

const NAVY = '#000435';
const AMBER = '#F59E0B';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-xl border border-black/10 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-[#000435] mb-0.5">{row?.fullName}</p>
      <p className="text-slate-600">
        <span className="font-semibold text-amber-600">{row?.count}</span> students
      </p>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    dashboardStats,
    academicYear,
    schoolName,
    registryStats,
    loading,
    refresh,
  } = useStudentPromotionData();
  const { total, eligible, rep, grad } = dashboardStats;

  const heroStats = useMemo(
    () => [
      { label: 'Total students', value: String(total) },
      { label: 'Eligible', value: String(eligible) },
      { label: 'Repeaters', value: String(rep) },
      { label: 'Final-year (P6·S3·S6)', value: String(grad) },
    ],
    [total, eligible, rep, grad]
  );

  const quickActions = [
    {
      label: 'Promote by Class',
      desc: 'Bulk promote an entire class',
      path: sp('promote-class'),
      icon: Users,
    },
    {
      label: 'Promote by Student',
      desc: 'One learner at a time',
      path: sp('promote-student'),
      icon: User,
    },
    {
      label: 'Run Simulation',
      desc: 'Preview outcomes safely',
      path: sp('simulation'),
      icon: PlayCircle,
    },
    {
      label: 'Promotion Reports',
      desc: 'Export summaries & PDFs',
      path: sp('reports'),
      icon: FileBarChart,
    },
  ];

  const chartData = useMemo(() => {
    const rows = registryStats?.classes || [];
    return [...rows]
      .map((c) => ({
        name:
          String(c.class_name || '').length > 14
            ? `${String(c.class_name).slice(0, 13)}…`
            : c.class_name || '—',
        fullName: c.class_name || '—',
        count: Number(c.count) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [registryStats]);

  const maxCount = useMemo(
    () => Math.max(...chartData.map((d) => d.count), 1),
    [chartData]
  );

  return (
    <div className="min-h-full bg-white pb-10 animate-in fade-in duration-500">
      <PromotionDashboardHero
        academicYear={academicYear}
        schoolName={schoolName}
        heroStats={heroStats}
        onRefresh={refresh}
        refreshing={loading}
      />

      <PromotionPageBody className="space-y-6 sm:space-y-8">
        {/* Quick actions 2×2 */}
        <section>
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="sp-label text-amber-600">Shortcuts</p>
              <h2 className="text-lg sm:text-xl font-semibold text-re-text tracking-tight mt-0.5">
                Quick actions
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="group text-left rounded-2xl border border-black/[0.06] bg-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-amber-200/80 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#000435]/[0.06] flex items-center justify-center mb-3 group-hover:bg-amber-500/15 transition-colors">
                        <Icon size={20} className="text-[#000435] group-hover:text-amber-600" strokeWidth={1.75} />
                      </div>
                      <p className="text-sm sm:text-base font-semibold text-re-text">{action.label}</p>
                      <p className="text-xs font-medium text-re-text-muted mt-1">{action.desc}</p>
                    </div>
                    <ArrowRight
                      size={18}
                      className="text-slate-300 group-hover:text-amber-500 shrink-0 mt-1 transition-colors"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Class enrollment chart — all school classes */}
        <section className="rounded-2xl sm:rounded-3xl border border-black/[0.06] bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5 sm:mb-6">
            <div>
              <p className="sp-label text-amber-600">Analytics</p>
              <h2 className="text-lg sm:text-xl font-semibold text-re-text tracking-tight">
                Students by class
              </h2>
              <p className="text-xs font-medium text-re-text-muted mt-1">
                All {chartData.length} classes registered at {schoolName || 'your school'}
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background: AMBER }} />
                Enrollment
              </span>
              <span className="tabular-nums text-[#000435]">
                Max {maxCount.toLocaleString()}
              </span>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No class data yet. Assign class names to students in Student Records.
            </div>
          ) : (
            <div className="w-full h-[280px] sm:h-[340px] md:h-[380px] -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 56 }}
                  barCategoryGap="18%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                    angle={-42}
                    textAnchor="end"
                    height={72}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    width={36}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.fullName}`}
                        fill={index % 2 === 0 ? AMBER : NAVY}
                        fillOpacity={index % 2 === 0 ? 1 : 0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </PromotionPageBody>
    </div>
  );
}
