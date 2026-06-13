import { useMemo, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import PageShell, { Panel } from '../components/PageShell';
import AnalyticsFilters from '../components/AnalyticsFilters';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function PerformanceTrends() {
  const [params, setParams] = useState({});
  const { loading, error, termTrend, comparativeTerms, filters, selected } = useReportsAnalytics(params);

  const trendSummary = useMemo(() => {
    if (termTrend.length < 2) return null;
    const first = termTrend[0]?.average;
    const last = termTrend[termTrend.length - 1]?.average;
    if (first == null || last == null) return null;
    const delta = Math.round((last - first) * 10) / 10;
    return { first, last, delta, improved: delta > 0 };
  }, [termTrend]);

  if (loading) {
    return (
      <PageShell title="Performance Trends" subtitle="Loading…">
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
      </PageShell>
    );
  }
  if (error) return <PageShell title="Performance Trends" subtitle={error} />;

  return (
    <PageShell
      title="Performance Trends"
      subtitle="Term-by-term school averages and pass rates from generated report snapshots."
      actions={<AnalyticsFilters filters={filters} selected={selected} onChange={setParams} />}
    >
      <Panel title="School average progression">
        {termTrend.length === 0 ? (
          <p className="text-sm text-[#000435]/45 py-12 text-center">Generate reports for multiple terms to see trends.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={termTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,53,0.06)" />
                <XAxis dataKey="term" tick={{ fill: '#000435', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#000435', fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#000435" strokeWidth={3} dot={{ fill: '#f59e0b', r: 5 }} name="Average %" />
                <Line type="monotone" dataKey="passRate" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Pass rate %" />
              </LineChart>
            </ResponsiveContainer>
            {trendSummary && (
              <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 ${trendSummary.improved ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-200/80'}`}>
                <TrendingUp size={18} className={trendSummary.improved ? 'text-green-700' : 'text-amber-700'} />
                <div>
                  <p className="text-sm font-semibold text-[#000435]">
                    {trendSummary.improved ? 'Upward trajectory' : 'Performance dip detected'}
                  </p>
                  <p className="text-xs text-[#000435]/60 mt-1">
                    {termTrend[0]?.term}: {trendSummary.first}% → {termTrend[termTrend.length - 1]?.term}: {trendSummary.last}%
                    {' '}({trendSummary.delta >= 0 ? '+' : ''}{trendSummary.delta}%)
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      <Panel title="Subject performance levels">
        {comparativeTerms.length === 0 ? (
          <p className="text-sm text-[#000435]/45 py-8 text-center">No subject comparison data.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
              {comparativeTerms.map((c) => (
                <div
                  key={c.subject}
                  className={`p-4 rounded-xl border ${c.direction === 'up' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}
                >
                  <p className="text-xs font-medium text-[#000435]/60">{c.subject}</p>
                  <p className={`text-xl font-semibold mt-1 ${c.direction === 'up' ? 'text-green-700' : 'text-red-700'}`}>
                    {c.direction === 'up' ? 'On track' : 'Needs focus'}
                  </p>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparativeTerms.map((c) => ({ ...c, score: c.direction === 'up' ? 1 : 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,4,53,0.06)" />
                <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#000435' }} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="score" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Status" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Panel>
    </PageShell>
  );
}
