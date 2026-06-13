import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, Download, Eye, FileText, Loader2, Send, Trophy, Users,
} from 'lucide-react';
import PageShell, { KpiCard, Panel } from '../PageShell';
import ReportFilters from './ReportFilters';
import {
  fetchReportsDashboard, fetchReportSnapshot, publishSnapshot,
} from '../../services/dosStudentReportsApi';
import ReportViewModal from './ReportViewModal';
import { smr } from '../../utils/paths';

function buildParams(filters, fixedReportType) {
  const p = {};
  if (filters.academicYear) p.academic_year = filters.academicYear;
  if (filters.term) p.term = filters.term;
  if (fixedReportType) p.report_type = fixedReportType;
  else if (filters.reportType) p.report_type = filters.reportType;
  if (filters.className) p.class_name = filters.className;
  if (filters.status) p.status = filters.status;
  return p;
}

export default function ReportsHub({
  title, subtitle, fixedReportType = null, showGenerateLink = true,
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    academicYear: '', term: '', reportType: fixedReportType || '', className: '', status: '',
  });
  const [previewReport, setPreviewReport] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReportsDashboard(buildParams(filtersRef.current, fixedReportType));
      if (!res?.success) {
        setError(res?.message || 'Failed to load');
        return;
      }
      setData(res.data);
      if (res.data?.selected) {
        setFilters((f) => ({
          ...f,
          academicYear: f.academicYear || res.data.selected.academic_year || '',
          term: f.term || res.data.selected.term || '',
          className: f.className || res.data.selected.class_name || '',
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [fixedReportType]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [filters.academicYear, filters.term, filters.reportType, filters.className, filters.status, load]);

  const students = data?.students || [];
  const kpis = data?.kpis || {};
  const classStats = data?.class_stats;

  const openPreview = async (snapshotId) => {
    setModalOpen(true);
    setPreviewLoading(true);
    setPreviewReport(null);
    try {
      const res = await fetchReportSnapshot(snapshotId);
      if (res?.success) setPreviewReport(res.data);
    } catch {
      setError('Failed to load report preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePublish = async (snapshotId) => {
    setActionLoading(snapshotId);
    try {
      await publishSnapshot(snapshotId);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Publish failed');
    } finally {
      setActionLoading(null);
    }
  };

  const generatePath = useMemo(() => {
    const q = new URLSearchParams();
    if (filters.academicYear) q.set('year', filters.academicYear);
    if (filters.term) q.set('term', filters.term);
    if (fixedReportType || filters.reportType) q.set('type', fixedReportType || filters.reportType);
    if (filters.className) q.set('class', filters.className);
    const qs = q.toString();
    return `${smr('generate-reports')}${qs ? `?${qs}` : ''}`;
  }, [filters, fixedReportType]);

  return (
    <PageShell
      title={title}
      subtitle={subtitle}
      actions={showGenerateLink && (
        <Link to={generatePath} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#000435] text-white hover:bg-[#0a116b]">
          <FileText size={14} /> Generate reports
        </Link>
      )}
    >
      <ReportFilters filters={filters} onChange={setFilters} options={data?.filters} disabled={loading} hideReportType={!!fixedReportType} />

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-100 text-red-800">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#000435]/25" size={32} /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard icon={FileText} label="Reports generated" value={kpis.reports_generated?.toLocaleString() ?? '0'} />
            <KpiCard icon={Send} label="Ready for publishing" value={kpis.ready_for_publishing?.toLocaleString() ?? '0'} accent="text-green-700" />
            <KpiCard icon={AlertTriangle} label="Pending approval" value={kpis.pending_approval?.toLocaleString() ?? '0'} accent="text-amber-600" />
            <KpiCard icon={Trophy} label="Top performing class" value={kpis.top_performing_class || '—'} accent="text-amber-600" />
            <KpiCard icon={BarChart3} label="School average" value={kpis.school_average != null ? `${kpis.school_average}%` : '—'} />
          </div>

          {classStats && (
            <Panel title="Class statistics">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <KpiCard label="Class average" value={classStats.class_average != null ? `${classStats.class_average}%` : '—'} />
                <KpiCard label="Highest student" value={classStats.highest != null ? `${classStats.highest}%` : '—'} />
                <KpiCard label="Lowest student" value={classStats.lowest != null ? `${classStats.lowest}%` : '—'} />
                <KpiCard label="Pass rate" value={classStats.pass_rate != null ? `${classStats.pass_rate}%` : '—'} />
                <KpiCard icon={Users} label="Students at risk" value={classStats.students_at_risk ?? 0} accent="text-red-600" />
              </div>
            </Panel>
          )}

          <Panel title="Students">
            <div className="overflow-x-auto -mx-2">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-[#000435]/40 border-b border-black/5">
                    <th className="text-left py-3 px-3">Student</th>
                    <th className="text-left py-3 px-2">Class</th>
                    <th className="text-center py-3 px-2">Average</th>
                    <th className="text-center py-3 px-2">Grade</th>
                    <th className="text-center py-3 px-2">Position</th>
                    <th className="text-center py-3 px-2">Health</th>
                    <th className="text-center py-3 px-2">Status</th>
                    <th className="text-right py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-[#000435]/40">
                        No reports yet.{' '}
                        <Link to={generatePath} className="text-amber-600 font-medium hover:underline">Generate reports</Link>
                      </td>
                    </tr>
                  ) : students.map((row) => (
                    <tr key={row.snapshot_id} className="border-t border-black/4 hover:bg-[#000435]/[0.02]">
                      <td className="py-3 px-3">
                        <p className="font-medium text-[#000435]">{row.name}</p>
                        <p className="text-[10px] text-[#000435]/35">{row.student_uid}</p>
                      </td>
                      <td className="py-3 px-2 text-[#000435]/60 text-xs">{row.class_name}</td>
                      <td className="py-3 px-2 text-center font-semibold tabular-nums">{row.average != null ? `${row.average}%` : '—'}</td>
                      <td className="py-3 px-2 text-center"><span className="text-xs px-2 py-0.5 rounded-full bg-[#000435]/5">{row.grade || '—'}</span></td>
                      <td className="py-3 px-2 text-center text-xs text-[#000435]/50">{row.position ?? '—'}</td>
                      <td className="py-3 px-2 text-center text-xs font-medium text-amber-600">{row.health_score ?? '—'}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                          row.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}>{row.status}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => openPreview(row.snapshot_id)} className="p-1.5 rounded-lg hover:bg-black/5 text-[#000435]/50" title="Preview"><Eye size={14} /></button>
                          <button type="button" onClick={() => openPreview(row.snapshot_id)} className="p-1.5 rounded-lg hover:bg-black/5 text-[#000435]/50" title="PDF / Print"><Download size={14} /></button>
                          {row.status !== 'published' && (
                            <button type="button" disabled={actionLoading === row.snapshot_id} onClick={() => handlePublish(row.snapshot_id)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-700" title="Publish">
                              {actionLoading === row.snapshot_id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}

      <ReportViewModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setPreviewReport(null); }}
        report={previewReport}
        school={data?.school || previewReport?.school}
        loading={previewLoading}
        editable
        onPublish={() => previewReport?.snapshot_id && handlePublish(previewReport.snapshot_id)}
        publishing={actionLoading === previewReport?.snapshot_id}
      />
    </PageShell>
  );
}
