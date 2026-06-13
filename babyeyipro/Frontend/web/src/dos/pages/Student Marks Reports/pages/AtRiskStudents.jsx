import { useState } from 'react';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import PageShell, { Panel, StatusPill, KpiCard } from '../components/PageShell';
import AnalyticsFilters from '../components/AnalyticsFilters';
import { useReportsAnalytics } from '../hooks/useReportsAnalytics';

export default function AtRiskStudents() {
  const [params, setParams] = useState({});
  const { loading, error, atRiskStudents, filters, selected, kpis } = useReportsAnalytics(params);

  const critical = atRiskStudents.filter((s) => s.risk === 'Critical');
  const high = atRiskStudents.filter((s) => s.risk === 'High');
  const medium = atRiskStudents.filter((s) => s.risk === 'Medium');

  if (loading) {
    return (
      <PageShell title="At-Risk Students" subtitle="Loading live data…">
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>
      </PageShell>
    );
  }
  if (error) return <PageShell title="At-Risk Students" subtitle={error} />;

  return (
    <PageShell
      title="At-Risk Students"
      subtitle="Students below pass threshold — prioritized by average score for intervention."
      actions={<AnalyticsFilters filters={filters} selected={selected} onChange={setParams} />}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={ShieldAlert} label="Total at risk" value={kpis.atRiskStudents ?? atRiskStudents.length} sub={kpis.termLabel || 'Current term'} accent="text-red-600" />
        <KpiCard label="Critical" value={critical.length} sub="Below 40%" accent="text-red-700" />
        <KpiCard label="High risk" value={high.length} sub="40–45%" accent="text-orange-600" />
        <KpiCard label="Medium" value={medium.length} sub="45–50%" accent="text-amber-600" />
      </div>

      <Panel title="Students requiring attention">
        {atRiskStudents.length === 0 ? (
          <div className="py-12 text-center">
            <AlertTriangle className="mx-auto text-amber-500 mb-3" size={28} />
            <p className="text-sm font-medium text-[#000435]">No at-risk students for this period</p>
            <p className="text-xs text-[#000435]/45 mt-1">All students are at or above the 50% pass threshold.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atRiskStudents.map((s) => (
              <div
                key={s.student_id || `${s.name}-${s.class}`}
                className="p-4 rounded-2xl border border-[#000435]/8 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#000435]">{s.name} — {s.average}%</p>
                    <p className="text-xs text-[#000435]/50 mt-0.5">
                      {s.class} · {s.reason}
                      {s.missing > 0 ? ` · ${s.missing} missing assessments` : ''}
                    </p>
                  </div>
                  <StatusPill status={s.risk} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
