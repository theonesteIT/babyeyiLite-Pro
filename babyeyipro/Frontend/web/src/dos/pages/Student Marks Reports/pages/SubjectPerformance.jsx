import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import PageShell, { Panel, TrendBadge } from '../components/PageShell';
import AnalyticsFilters from '../components/AnalyticsFilters';
import { heatmapLevels } from '../data/mockData';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function SubjectPerformance() {
  const [params, setParams] = useState({});
  const { loading, error, subjectPerformance, filters, selected } = useReportsAnalytics(params);
  const sorted = [...subjectPerformance].sort((a, b) => (a.average ?? 0) - (b.average ?? 0));

  if (loading) {
    return <PageShell title="Subject Performance Analysis" subtitle="Loading…"><div className="py-16 flex justify-center"><Loader2 className="animate-spin" /></div></PageShell>;
  }
  if (error) return <PageShell title="Subject Performance Analysis" subtitle={error} />;

  return (
    <PageShell
      title="Subject Performance Analysis"
      subtitle="Rank subjects, identify difficult areas, and compare against school targets."
      actions={<AnalyticsFilters filters={filters} selected={selected} onChange={setParams} />}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sorted.slice(0, 3).map((s) => {
          const lvl = heatmapLevels[s.level];
          return (
            <div key={s.subject} className={`p-4 rounded-2xl border ${lvl.bg} ${lvl.border}`}>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{lvl.dot} {s.level}</p>
              <p className="text-lg font-black mt-1">{s.subject}</p>
              <p className={`text-3xl font-black mt-1 ${lvl.text}`}>{s.average}%</p>
              <p className="text-xs mt-1 opacity-70">Target: {s.target}% · <TrendBadge value={s.trend} /></p>
            </div>
          );
        })}
      </div>

      <Panel title="Subject ranking across school">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="text-left py-3 px-2">Subject</th>
                <th className="text-left py-3 px-2">Average</th>
                <th className="text-left py-3 px-2">Target</th>
                <th className="text-left py-3 px-2">Trend</th>
                <th className="text-left py-3 px-2">Level</th>
                <th className="text-left py-3 px-2">Insight</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.subject} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-2 font-black text-[#000435]">{s.subject}</td>
                  <td className="py-3 px-2 font-bold">{s.average}% {s.average < s.target ? '❌' : '✓'}</td>
                  <td className="py-3 px-2 text-slate-500">{s.target}%</td>
                  <td className="py-3 px-2"><TrendBadge value={s.trend} /></td>
                  <td className="py-3 px-2 capitalize">{heatmapLevels[s.level].dot} {s.level}</td>
                  <td className="py-3 px-2 text-xs text-slate-500">
                    {s.average < s.target ? `⚠ Below national target — review syllabus` : 'On track'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Term comparison chart">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={subjectPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="subject" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <ReferenceLine y={65} stroke="#ef4444" strokeDasharray="4 4" label="Target" />
            <Bar dataKey="average" fill="#000435" radius={[4, 4, 0, 0]} name="Average %" />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </PageShell>
  );
}
