import { useState } from 'react';
import { BookOpen, Users, TrendingUp, Award, AlertTriangle, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';
const AMBER = '#f59e0b';

export default function Dashboard() {
  const [params, setParams] = useState({});
  const { loading, error, kpis, classPerformance, termTrend, insights, filters, selected } = useTeacherMarksAnalytics(params);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;
  }

  const kpiCards = [
    { icon: BookOpen, label: 'My Classes', value: kpis.total_classes ?? '—' },
    { icon: Users, label: 'Total Students', value: kpis.total_students ?? '—' },
    { icon: TrendingUp, label: 'Average Performance', value: kpis.average_percent != null ? `${kpis.average_percent}%` : '—' },
    { icon: Award, label: 'Pass Rate', value: kpis.pass_rate != null ? `${kpis.pass_rate}%` : '—' },
    { icon: AlertTriangle, label: 'At Risk', value: kpis.at_risk_count ?? 0 },
  ];

  return (
    <div className="marks-hub space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Marks Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Live overview from your published marks</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-gray-200/80 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-2">
              <kpi.icon size={20} className="text-amber-500" />
              <span className="text-xl font-bold tabular-nums" style={{ color: NAVY }}>{kpi.value}</span>
            </div>
            <p className="text-xs font-semibold text-gray-600">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Term performance trend</h3>
          {termTrend.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No term data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={termTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="term" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke={NAVY} strokeWidth={2} dot={{ fill: AMBER, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Class snapshot</h3>
          <div className="space-y-2">
            {classPerformance.slice(0, 6).map((c) => (
              <div key={c.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <span className="text-sm font-semibold" style={{ color: NAVY }}>{c.name}</span>
                <span className="text-sm font-bold text-amber-600">{c.average != null ? `${c.average}%` : '—'}</span>
              </div>
            ))}
            {!classPerformance.length && <p className="text-sm text-gray-400 text-center py-6">No class data</p>}
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className={`rounded-xl px-4 py-3 text-sm font-medium border ${
              ins.type === 'success' ? 'bg-green-50 border-green-100 text-green-900' : 'bg-amber-50 border-amber-100 text-amber-900'
            }`}>
              {ins.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
