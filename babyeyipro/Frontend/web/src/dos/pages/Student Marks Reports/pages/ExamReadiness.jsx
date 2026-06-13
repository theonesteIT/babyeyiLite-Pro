import { Loader2 } from 'lucide-react';
import PageShell, { Panel, StatusPill } from '../components/PageShell';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';

export default function ExamReadiness() {
  const { loading, error, examReadiness } = useReportsAnalytics();

  if (loading) {
    return <PageShell title="National Exam Readiness Tracker" subtitle="Loading…"><div className="py-16 flex justify-center"><Loader2 className="animate-spin" /></div></PageShell>;
  }
  if (error) return <PageShell title="National Exam Readiness Tracker" subtitle={error} />;

  return (
    <PageShell
      title="National Exam Readiness Tracker"
      subtitle="Predict exam performance, class readiness scores, and revision planning."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examReadiness.map((e) => (
          <div key={e.class} className="marks-panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-[#000435]">{e.class}</p>
                <p className="text-xs text-slate-500 mt-0.5">{e.label}</p>
              </div>
              <StatusPill status={e.status === 'Critical' ? 'critical' : e.status === 'Risk' ? 'attention' : 'good'} />
            </div>
            <div className="mt-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-black text-[#000435]">{e.readiness}%</span>
                <span className="text-xs font-bold text-slate-400">Ready</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${e.readiness}%`,
                    background: e.readiness >= 70 ? '#22c55e' : e.readiness >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
            {e.status === 'Risk' && (
              <p className="text-xs font-bold text-amber-700 mt-3">Needs revision plan before exams</p>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
