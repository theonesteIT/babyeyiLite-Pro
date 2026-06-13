import { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import PageShell, { Panel, TrendBadge, KpiCard } from '../components/PageShell';
import AnalyticsFilters from '../components/AnalyticsFilters';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TeacherPerformance() {
  const [params, setParams] = useState({});
  const { loading, error, teacherPerformance, filters, selected, smartInsights } = useReportsAnalytics(params);
  const sorted = [...teacherPerformance].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const lowPerforming = sorted.filter((t) => (t.average ?? 0) < 68);
  const topPerformers = sorted.filter((t) => (t.average ?? 0) >= 75).slice(0, 3);

  if (loading) {
    return (
      <PageShell title="Teacher Performance" subtitle="Loading live data…">
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
      </PageShell>
    );
  }
  if (error) return <PageShell title="Teacher Performance" subtitle={error} />;

  return (
    <PageShell
      title="Teacher Performance"
      subtitle="Class outcomes per teacher assignment — identify coaching needs and top mentors."
      actions={<AnalyticsFilters filters={filters} selected={selected} onChange={setParams} />}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Teachers tracked" value={sorted.length} sub="Active assignments" />
        <KpiCard label="School avg (top)" value={sorted[0]?.average != null ? `${sorted[0].average}%` : '—'} sub={sorted[0]?.name || '—'} accent="text-amber-600" />
        <KpiCard label="Below 68%" value={lowPerforming.length} sub="Needs support" accent="text-red-600" />
        <KpiCard label="Above 75%" value={topPerformers.length} sub="Strong outcomes" accent="text-green-600" />
      </div>

      <Panel title="Teacher ranking by class performance">
        {sorted.length === 0 ? (
          <p className="text-sm text-[#000435]/45 py-8 text-center">No teacher assignment data with marks yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-[#000435]/8 text-[10px] font-semibold uppercase tracking-wider text-[#000435]/45">
                  <th className="text-left py-3 px-2">Rank</th>
                  <th className="text-left py-3 px-2">Teacher</th>
                  <th className="text-left py-3 px-2">Subject</th>
                  <th className="text-left py-3 px-2">Class</th>
                  <th className="text-left py-3 px-2">Avg performance</th>
                  <th className="text-left py-3 px-2">Trend</th>
                  <th className="text-left py-3 px-2">Insight</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t, i) => (
                  <tr key={`${t.name}-${t.classes}-${t.subject}`} className="border-b border-[#000435]/5 hover:bg-amber-50/30">
                    <td className="py-3 px-2 font-semibold text-[#000435]/35">#{i + 1}</td>
                    <td className="py-3 px-2 font-semibold text-[#000435]">{t.name}</td>
                    <td className="py-3 px-2 text-[#000435]/70">{t.subject}</td>
                    <td className="py-3 px-2 text-[#000435]/55">{t.classes}</td>
                    <td className="py-3 px-2 font-semibold text-[#000435]">{t.average}%</td>
                    <td className="py-3 px-2"><TrendBadge value={t.trend} /></td>
                    <td className="py-3 px-2 text-xs text-[#000435]/55">
                      {(t.average ?? 0) < 68 ? 'Recommend coaching & peer observation' : i === 0 ? 'Top performer — mentor others' : 'Steady progress'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Average class performance">
          {sorted.length === 0 ? (
            <p className="text-sm text-[#000435]/45 py-12 text-center">No chart data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={sorted.slice(0, 12).map((t) => ({ name: t.classes || t.name, average: t.average }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,53,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#000435' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#000435' }} />
                <Tooltip />
                <Bar dataKey="average" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Actionable insights">
          <div className="space-y-3">
            {lowPerforming.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80">
                <p className="text-sm font-semibold text-[#000435]">Teachers with low-performing classes</p>
                <p className="text-xs text-[#000435]/65 mt-1">
                  {lowPerforming.slice(0, 4).map((t) => `${t.name} (${t.subject}, ${t.classes} — ${t.average}%)`).join(' · ')}
                </p>
              </div>
            )}
            {topPerformers.length > 0 && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                <p className="text-sm font-semibold text-green-900">Strong performers</p>
                <p className="text-xs text-green-800 mt-1">
                  {topPerformers.map((t) => `${t.name} (${t.average}%)`).join(' · ')}
                </p>
              </div>
            )}
            {smartInsights.slice(0, 2).map((ins, i) => (
              <div key={i} className="p-4 rounded-xl border border-[#000435]/10 bg-[#000435]/[0.02]">
                <p className="text-sm font-semibold text-[#000435]">{ins.text}</p>
                {ins.action && <p className="text-xs text-[#000435]/50 mt-1">{ins.action}</p>}
              </div>
            ))}
            {!lowPerforming.length && !topPerformers.length && !smartInsights.length && (
              <p className="text-sm text-[#000435]/45 py-6 text-center">Insights will appear once marks data is available.</p>
            )}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
