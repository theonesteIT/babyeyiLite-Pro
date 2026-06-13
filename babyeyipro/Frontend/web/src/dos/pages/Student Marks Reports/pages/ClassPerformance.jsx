import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import PageShell, { Panel, TrendBadge, StatusPill } from '../components/PageShell';
import AnalyticsFilters from '../components/AnalyticsFilters';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ClassPerformance() {
  const [params, setParams] = useState({});
  const { loading, error, classPerformance, filters, selected } = useReportsAnalytics(params);
  const sorted = [...classPerformance].sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  if (loading) {
    return <PageShell title="Class Performance Analysis" subtitle="Loading…"><div className="py-16 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div></PageShell>;
  }
  if (error) return <PageShell title="Class Performance Analysis" subtitle={error} />;

  return (
    <PageShell
      title="Class Performance Analysis"
      subtitle="Compare all classes, auto-rank, and detect weak classes needing intervention."
      actions={<AnalyticsFilters filters={filters} selected={selected} onChange={setParams} />}
    >
      <Panel title="Class ranking">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="text-left py-3 px-2">Rank</th>
                <th className="text-left py-3 px-2">Class</th>
                <th className="text-left py-3 px-2">Average</th>
                <th className="text-left py-3 px-2">Pass rate</th>
                <th className="text-left py-3 px-2">Trend</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-left py-3 px-2">Insight</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={c.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-2 font-black text-slate-400">#{i + 1}</td>
                  <td className="py-3 px-2 font-black text-[#000435]">{c.name}</td>
                  <td className="py-3 px-2 font-bold">{c.average}%</td>
                  <td className="py-3 px-2">{c.passRate}%</td>
                  <td className="py-3 px-2"><TrendBadge value={c.trend} /></td>
                  <td className="py-3 px-2"><StatusPill status={c.status} /></td>
                  <td className="py-3 px-2 text-xs text-slate-500">
                    {c.status === 'attention' ? 'Schedule intervention review' : c.status === 'top' ? 'Share best practices' : 'Monitor monthly'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Average by class">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sorted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="average" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Intervention suggestions">
          <div className="space-y-3">
            {sorted.filter((c) => c.status === 'attention' || c.trend < 0).map((c) => (
              <div key={c.name} className="p-4 rounded-xl bg-red-50 border border-red-100">
                <p className="text-sm font-black text-red-900">{c.name} — {c.average}% average</p>
                <p className="text-xs text-red-700 mt-1">
                  {c.trend < 0 ? `Declining ${Math.abs(c.trend)}% — assign remedial support.` : 'Below pass threshold — review teaching approach.'}
                </p>
              </div>
            ))}
            {sorted.filter((c) => c.status === 'top').slice(0, 2).map((c) => (
              <div key={c.name} className="p-4 rounded-xl bg-green-50 border border-green-100">
                <p className="text-sm font-black text-green-900">{c.name} — Top performer ({c.average}%)</p>
                <p className="text-xs text-green-700 mt-1">Document strategies for other classes.</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
}
