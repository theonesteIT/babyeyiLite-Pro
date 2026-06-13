import { Users, UserRound } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const NAVY = '#000435';
const AMBER = '#c87800';

const CHART_SERIES = [
  { key: 'students', name: 'Students', color: NAVY },
  { key: 'girls', name: 'Girls', color: AMBER },
  { key: 'boys', name: 'Boys', color: NAVY },
];

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: '1px solid rgba(0,4,53,0.08)',
  fontSize: 12,
  fontWeight: 500,
  boxShadow: '0 4px 16px rgba(0,4,53,0.08)',
};

export default function TeacherDashboardSchoolChart({ overview }) {
  const students = Number(overview?.students) || 0;
  const girls = Number(overview?.girls) || 0;
  const boys = Number(overview?.boys) || 0;
  const classNames = Array.isArray(overview?.classNames) ? overview.classNames.filter(Boolean) : [];

  const values = { students, girls, boys };

  const chartData = CHART_SERIES.map((m) => ({
    name: m.name,
    value: values[m.key],
    fill: m.color,
  }));

  const hasData = students > 0 || girls > 0 || boys > 0;
  const girlsPct = students > 0 ? Math.round((girls / students) * 100) : 0;
  const boysPct = students > 0 ? Math.round((boys / students) * 100) : 0;

  const subtitle = classNames.length
    ? `Class ${classNames.join(', ')} · enrollment & gender`
    : 'Your assigned class · enrollment & gender';

  return (
    <div className="tp-card overflow-hidden h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 md:px-5 py-4 border-b border-black/[0.06] bg-slate-50/80">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-[#c87800]" />
          <div>
            <h3 className="text-sm text-[#000435] font-normal">My class students</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        {hasData && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#000435]/10 bg-white px-3 py-1.5 text-[11px] text-slate-600">
            <Users size={13} className="text-[#c87800]" strokeWidth={1.75} />
            <span className="tabular-nums font-medium text-[#000435]">{students}</span>
            <span className="text-slate-400">enrolled</span>
          </div>
        )}
      </div>

      <div className="p-4 md:p-5 flex-1 flex flex-col gap-4">
        {!hasData ? (
          <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-center px-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center mb-3">
              <Users size={20} className="text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-slate-500">No students in your assigned class</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
              Counts appear when DOS assigns you as class teacher.
            </p>
          </div>
        ) : (
          <>
            {students > 0 && (
              <div className="rounded-xl border border-black/[0.06] bg-white px-4 py-3">
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                  <span className="inline-flex items-center gap-1">
                    <UserRound size={11} className="text-[#c87800]" /> Girls {girlsPct}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Boys {boysPct}% <UserRound size={11} className="text-[#000435]" />
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden flex bg-[#000435]/[0.06]">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${girlsPct}%`, backgroundColor: AMBER }}
                  />
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${boysPct}%`, backgroundColor: NAVY }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 min-h-[200px] rounded-xl border border-black/[0.06] bg-gradient-to-b from-white to-slate-50/80 p-3 pt-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,4,53,0.05)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 400 }}
                    axisLine={{ stroke: 'rgba(0,4,53,0.06)' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 400 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,4,53,0.03)', radius: 6 }}
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value) => [value, 'Students']}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={56}>
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
