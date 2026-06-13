import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import PageShell, { Panel, StatusPill } from '../components/PageShell';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';
import { marksReportsPageKey } from '../utils/paths';

const SUBTITLES = {
  'school-rankings': 'School-wide student ranking — auto-updates after each assessment.',
  'class-rankings': 'Rank students within each class.',
  'subject-rankings': 'Top performers per subject area.',
  'top-performers': 'Highest achieving students this term.',
  'most-improved': 'Students with the biggest improvement.',
  'student-performance': 'Individual learner performance overview.',
};

export default function StudentRanking() {
  const { loading, error, schoolRankings } = useReportsAnalytics();
  const key = marksReportsPageKey(useLocation().pathname);
  const title = key === 'student-performance' ? 'Student Performance' : key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return <PageShell title={title} subtitle="Loading…"><div className="py-16 flex justify-center"><Loader2 className="animate-spin" /></div></PageShell>;
  }
  if (error) return <PageShell title={title} subtitle={error} />;

  return (
    <PageShell title={title} subtitle={SUBTITLES[key] || 'Performance ranking system with auto-updates.'}>
      <Panel title="Leaderboard">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="text-left py-3 px-2">Rank</th>
                <th className="text-left py-3 px-2">Student</th>
                <th className="text-left py-3 px-2">Class</th>
                <th className="text-left py-3 px-2">Average</th>
                <th className="text-left py-3 px-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {schoolRankings.map((s) => (
                <tr key={s.rank} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-2">
                    <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full font-black text-xs ${s.rank <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                      {s.rank}
                    </span>
                  </td>
                  <td className="py-3 px-2 font-black text-[#000435]">{s.name}</td>
                  <td className="py-3 px-2 text-slate-500">{s.class}</td>
                  <td className="py-3 px-2 font-bold text-lg">{s.average}%</td>
                  <td className="py-3 px-2">
                    <StatusPill status={s.trend === 'up' ? 'improving' : s.trend === 'down' ? 'attention' : 'stable'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-400 mt-4">Rankings refresh automatically when teachers submit new marks.</p>
      </Panel>
    </PageShell>
  );
}
