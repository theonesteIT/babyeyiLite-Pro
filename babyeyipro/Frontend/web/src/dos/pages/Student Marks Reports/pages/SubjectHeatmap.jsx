import { Loader2 } from 'lucide-react';
import PageShell, { Panel } from '../components/PageShell';
import { heatmapLevels } from '../data/mockData';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';

export default function SubjectHeatmap() {
  const { loading, error, subjectPerformance } = useReportsAnalytics();

  if (loading) {
    return <PageShell title="Subject Difficulty Heatmap" subtitle="Loading…"><div className="py-16 flex justify-center"><Loader2 className="animate-spin" /></div></PageShell>;
  }
  if (error) return <PageShell title="Subject Difficulty Heatmap" subtitle={error} />;

  return (
    <PageShell
      title="Subject Difficulty Heatmap"
      subtitle="Color-coded view of problem areas — DOS sees critical subjects at a glance."
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {subjectPerformance.map((s) => {
          const lvl = heatmapLevels[s.level];
          return (
            <div
              key={s.subject}
              className={`p-5 rounded-2xl border-2 ${lvl.bg} ${lvl.border} hover:scale-[1.02] transition-transform cursor-default`}
            >
              <p className="text-2xl">{lvl.dot}</p>
              <p className="text-sm font-black text-[#000435] mt-2">{s.subject}</p>
              <p className={`text-3xl font-black mt-1 ${lvl.text}`}>{s.average}%</p>
              <p className="text-[10px] font-bold uppercase mt-2 opacity-70">{s.level}</p>
            </div>
          );
        })}
      </div>

      <Panel title="Legend">
        <div className="flex flex-wrap gap-4 text-sm">
          <span>🔴 Critical — below target, urgent review</span>
          <span>🟡 Medium — monitor closely</span>
          <span>🟢 Good — meeting or exceeding targets</span>
        </div>
      </Panel>
    </PageShell>
  );
}
