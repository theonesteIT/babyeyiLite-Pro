import { Link } from 'react-router-dom';
import {
  TrendingUp, Users, Award, AlertTriangle, BookOpen, BarChart3,
  GraduationCap, Bell, Lightbulb, ChevronRight, Target, Activity, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import PageShell, { KpiCard, Panel, InsightRow } from '../components/PageShell';
import { smr } from '../utils/paths';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';

const QUICK_LINKS = [
  { label: 'Class performance', path: smr('class-performance'), icon: BarChart3 },
  { label: 'At-risk students', path: smr('at-risk-students'), icon: AlertTriangle },
  { label: 'Subject heatmap', path: smr('weak-subjects'), icon: Target },
  { label: 'Exam readiness', path: smr('readiness-dashboard'), icon: GraduationCap },
  { label: 'Export reports', path: smr('student-marks-reports'), icon: BookOpen },
  { label: 'Academic insights', path: smr('academic-insights'), icon: Lightbulb },
];

export default function Dashboard() {
  const {
    loading, error, kpis, classPerformance, termTrend, smartInsights, liveAlerts, decisionActions,
  } = useReportsAnalytics();

  if (loading) {
    return (
      <PageShell title="School Academic Overview" subtitle="Loading live analytics…">
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="School Academic Overview" subtitle={error}>
        <p className="text-sm text-red-600">{error}</p>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="School Academic Overview"
      subtitle="Instant health check on school-wide performance — detect problems before they escalate."
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={Award} label="Overall Pass Rate" value={kpis.passRate != null ? `${kpis.passRate}%` : '—'} sub="School-wide" />
        <KpiCard icon={TrendingUp} label="School Average" value={kpis.schoolAverage != null ? `${kpis.schoolAverage}%` : '—'} sub={kpis.termLabel || 'Current term'} />
        <KpiCard icon={Users} label="Total Students" value={(kpis.totalStudents || 0).toLocaleString()} sub="All levels" />
        <KpiCard icon={AlertTriangle} label="At Risk Students" value={kpis.atRiskStudents ?? 0} sub="Need intervention" accent="text-red-600" />
        <KpiCard icon={BarChart3} label="Top Performing Classes" value={kpis.topPerformingClasses ?? 0} sub="Above 75% avg" accent="text-green-600" />
        <KpiCard icon={BookOpen} label="Weak Subjects" value={kpis.weakSubjects ?? 0} sub="Below target" accent="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="Class snapshot" className="lg:col-span-2">
          <div className="space-y-2">
            {classPerformance.slice(0, 5).map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-black text-slate-400 w-6">#{c.rank}</span>
                  <div>
                    <p className="text-sm font-black text-[#000435]">{c.name} → {c.average ?? '—'}%</p>
                    <p className="text-[10px] text-slate-500">{c.status === 'attention' ? 'Needs attention' : c.status === 'top' ? 'Top class' : 'On track'}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500">{c.passRate != null ? `${c.passRate}% pass` : ''}</span>
              </div>
            ))}
            {!classPerformance.length && <p className="text-sm text-slate-400 py-4">No class marks data yet.</p>}
          </div>
          <Link to={smr('class-performance')} className="inline-flex items-center gap-1 mt-4 text-xs font-black text-[#000435] hover:text-amber-600 transition-colors">
            View all classes <ChevronRight size={14} />
          </Link>
        </Panel>

        <Panel title="Live alerts">
          <div className="space-y-3">
            {liveAlerts.map((a, i) => (
              <div key={i} className={`p-3 rounded-xl border text-sm ${a.severity === 'critical' ? 'bg-red-50 border-red-100' : a.severity === 'warning' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                <p className="font-bold text-[#000435]">{a.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{a.time}</p>
              </div>
            ))}
            {!liveAlerts.length && <p className="text-sm text-slate-400">No alerts — school on track.</p>}
          </div>
          <Link to={smr('risk-alerts')} className="inline-flex items-center gap-1 mt-4 text-xs font-black text-[#000435]">
            <Bell size={14} className="text-amber-500" /> All alerts
          </Link>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Performance trend (Term-by-term)">
          {termTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={termTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="term" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-400 py-10 text-center">Generate reports for multiple terms to see trends.</p>
          )}
        </Panel>

        <Panel title="Smart insights">
          <div className="space-y-2">
            {smartInsights.map((ins, i) => (
              <InsightRow key={i} type={ins.type} text={ins.text} action={ins.action} />
            ))}
            {!smartInsights.length && <p className="text-sm text-slate-400">Insights appear when marks are recorded.</p>}
          </div>
        </Panel>
      </div>

      <Panel title="Decision actions">
        <div className="flex flex-wrap gap-3">
          {decisionActions.map((d) => (
            <div key={d.label} className={`px-4 py-3 rounded-xl border text-sm ${d.urgent ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
              <p className="font-bold text-[#000435]">{d.label}</p>
              <p className="text-xs text-slate-500 mt-1">{d.count} item(s)</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Quick navigation">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_LINKS.map(({ label, path, icon: Icon }) => (
            <Link key={path} to={path} className="flex items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-colors">
              <Icon size={16} className="text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-[#000435]">{label}</span>
            </Link>
          ))}
        </div>
      </Panel>
    </PageShell>
  );
}
