import { Loader2 } from 'lucide-react';
import PageShell, { Panel, InsightRow } from '../components/PageShell';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';

export default function InsightsEngine() {
  const { loading, error, smartInsights, liveAlerts, decisionActions } = useReportsAnalytics();

  if (loading) {
    return <PageShell title="Academic Insights & Alerts" subtitle="Loading…"><div className="py-16 flex justify-center"><Loader2 className="animate-spin" /></div></PageShell>;
  }
  if (error) return <PageShell title="Academic Insights & Alerts" subtitle={error} />;

  return (
    <PageShell
      title="Academic Insights & Alerts"
      subtitle="Rule-based smart insights — detect problems, trends, and recommendations without AI dependency."
    >
      <Panel title="Insight engine">
        <div className="space-y-3">
          {smartInsights.map((ins, i) => (
            <InsightRow key={i} type={ins.type} text={ins.text} action={ins.action} />
          ))}
        </div>
      </Panel>

      <Panel title="Real-time alerts">
        <div className="space-y-3">
          {liveAlerts.map((a, i) => (
            <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 ${a.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <span className="text-lg">🚨</span>
              <div>
                <p className="text-sm font-black text-[#000435]">{a.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Recommendations">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {decisionActions.map((d) => (
            <div key={d.label} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm font-black text-[#000435]">{d.label}</p>
              <p className="text-xs text-slate-500 mt-1">{d.count} pending · {d.urgent ? 'Priority' : 'Review when ready'}</p>
            </div>
          ))}
        </div>
      </Panel>
    </PageShell>
  );
}
