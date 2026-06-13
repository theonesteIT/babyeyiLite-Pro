import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, Download, Eye, FileSpreadsheet, Filter, Loader2,
  Search, TrendingUp, Users,
} from 'lucide-react';
import ReportFilters from './ReportFilters';
import ReportViewModal from './ReportViewModal';
import {
  fetchReportsDashboard, fetchReportSnapshot, publishSnapshot,
} from '../../services/dosStudentReportsApi';
import { smr } from '../../utils/paths';

const NAVY = '#000435';
const AMBER = '#f59e0b';

function buildParams(filters, fixedReportType) {
  const p = {};
  if (filters.academicYear) p.academic_year = filters.academicYear;
  if (fixedReportType === 'annual') {
    p.report_type = 'annual';
    p.term = filters.term || 'Annual';
  } else {
    if (filters.term) p.term = filters.term;
    if (fixedReportType) p.report_type = fixedReportType;
    else if (filters.reportType) p.report_type = filters.reportType;
  }
  if (filters.className) p.class_name = filters.className;
  if (filters.status) p.status = filters.status;
  return p;
}

function gradePill(grade) {
  const map = { A: 'bg-green-100 text-green-800', B: 'bg-blue-100 text-blue-800', C: 'bg-amber-100 text-amber-900', D: 'bg-orange-100 text-orange-800', F: 'bg-red-100 text-red-800' };
  return map[grade] || 'bg-slate-100 text-slate-600';
}

function statusPill(row) {
  const avg = row.average;
  if (row.status === 'published') return { label: 'Published', cls: 'bg-green-100 text-green-800' };
  if (avg == null) return { label: 'Pending', cls: 'bg-slate-100 text-slate-500' };
  if (avg >= 80) return { label: 'Excellent', cls: 'bg-green-100 text-green-800' };
  if (avg >= 65) return { label: 'Good', cls: 'bg-blue-100 text-blue-800' };
  if (avg >= 50) return { label: 'Average', cls: 'bg-amber-100 text-amber-900' };
  return { label: 'At risk', cls: 'bg-red-100 text-red-800' };
}

export default function ReportsSplitPage({ fixedReportType, pageTitle }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    academicYear: '',
    term: fixedReportType === 'annual' ? 'Annual' : '',
    reportType: fixedReportType || '',
    className: '',
    status: '',
  });
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showExtraActivities, setShowExtraActivities] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReportsDashboard(buildParams(filtersRef.current, fixedReportType));
      if (!res?.success) { setError(res?.message || 'Failed to load'); return; }
      setData(res.data);
      if (res.data?.selected) {
        setFilters((f) => ({
          ...f,
          academicYear: f.academicYear || res.data.selected.academic_year || '',
          term: fixedReportType === 'annual'
            ? (f.term || res.data.selected.term || 'Annual')
            : (f.term || res.data.selected.term || ''),
          className: f.className || res.data.selected.class_name || '',
        }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [fixedReportType]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [filters.academicYear, filters.term, filters.className, filters.status, load]);

  const students = data?.students || [];
  const kpis = data?.kpis || {};
  const classStats = data?.class_stats;

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name?.toLowerCase().includes(q) || s.student_uid?.toLowerCase().includes(q));
  }, [students, search]);

  const openReport = async (snapshotId) => {
    setSelectedId(snapshotId);
    setModalOpen(true);
    setPreviewLoading(true);
    setPreviewReport(null);
    try {
      const res = await fetchReportSnapshot(snapshotId);
      if (res?.success) setPreviewReport(res.data);
      else setError(res?.message || 'Failed to load report');
    } catch {
      setError('Failed to load report');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handlePublish = async () => {
    if (!previewReport?.snapshot_id) return;
    setPublishing(true);
    try {
      await publishSnapshot(previewReport.snapshot_id);
      await load();
      const res = await fetchReportSnapshot(previewReport.snapshot_id);
      if (res?.success) setPreviewReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const generatePath = `${smr('generate-reports')}?type=${fixedReportType || 'final'}`
    + (filters.academicYear ? `&year=${encodeURIComponent(filters.academicYear)}` : '')
    + (fixedReportType === 'annual'
      ? '&term=Annual'
      : (filters.term ? `&term=${encodeURIComponent(filters.term)}` : ''))
    + (filters.className ? `&class=${encodeURIComponent(filters.className)}` : '');

  return (
    <div className="marks-page-body space-y-4 min-h-[calc(100vh-8rem)]">
      {/* Breadcrumb + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] text-[#000435]/40 mb-1">Reports › {pageTitle}</p>
          <h2 className="text-lg font-semibold text-[#000435]">{pageTitle}</h2>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-[#000435]/[0.05]">
          <Link to={smr('mid-term-reports')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${fixedReportType === 'mid_term' ? 'bg-white text-[#000435] shadow-sm' : 'text-[#000435]/50 hover:text-[#000435]'}`}>Mid-Term</Link>
          <Link to={smr('final-reports')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${fixedReportType === 'final' ? 'bg-white text-[#000435] shadow-sm' : 'text-[#000435]/50 hover:text-[#000435]'}`}>Final</Link>
          <Link to={smr('all-year-reports')} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${fixedReportType === 'annual' ? 'bg-white text-[#000435] shadow-sm' : 'text-[#000435]/50 hover:text-[#000435]'}`}>All Year</Link>
        </div>
      </div>

      <div className="w-full space-y-4">
          <div className="marks-panel rounded-2xl p-4">
            <ReportFilters
              filters={filters}
              onChange={setFilters}
              options={data?.filters}
              disabled={loading}
              hideReportType
              hideTerm={fixedReportType === 'annual'}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[11px] text-[#000435]/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExtraActivities}
                  onChange={(e) => setShowExtraActivities(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                />
                Show extra-activity courses on reports
              </label>
              <div className="flex gap-2">
                <Link to={generatePath} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-black/10 text-[#000435]/70 hover:bg-black/5">
                  Generate all
                </Link>
                <Link to={smr('download-center')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-black/10 text-[#000435]/70 hover:bg-black/5">
                  <Download size={14} /> Download center
                </Link>
                <button type="button" onClick={load} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-white" style={{ background: NAVY }}>
                  <Filter size={14} /> Filter
                </button>
              </div>
            </div>
          </div>

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
                {[
                  { label: 'Reports generated', value: kpis.reports_generated ?? 0, sub: filters.className ? `${filteredStudents.length} in view` : null, icon: FileSpreadsheet },
                  { label: 'Class average', value: kpis.class_average != null ? `${kpis.class_average}%` : '—', icon: TrendingUp },
                  { label: 'Highest score', value: kpis.highest_score != null ? `${kpis.highest_score}%` : '—', sub: kpis.highest_student_name },
                  { label: 'Lowest score', value: kpis.lowest_score != null ? `${kpis.lowest_score}%` : '—', sub: kpis.lowest_student_name },
                  { label: 'Pass rate', value: kpis.pass_rate != null ? `${kpis.pass_rate}%` : '—', icon: BarChart3 },
                ].map((k) => (
                  <div key={k.label} className="rounded-2xl border border-black/6 bg-white p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-medium text-[#000435]/45">{k.label}</p>
                      {k.icon && <k.icon size={16} className="text-amber-500" />}
                    </div>
                    <p className="text-xl font-semibold text-[#000435] tabular-nums">{k.value}</p>
                    {k.sub && <p className="text-[10px] text-[#000435]/40 mt-0.5 truncate">{k.sub}</p>}
                  </div>
                ))}
              </div>

              {classStats && (
                <div className="rounded-2xl border border-black/6 bg-white px-4 py-3 flex flex-wrap gap-4 text-xs text-[#000435]/70">
                  <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-amber-500" /> Total {classStats.total_students}</span>
                  <span>Boys {classStats.boys ?? '—'}</span>
                  <span>Girls {classStats.girls ?? '—'}</span>
                  <span>Pass rate {classStats.pass_rate != null ? `${classStats.pass_rate}%` : '—'}</span>
                  <span className="text-red-600">At risk {classStats.students_at_risk ?? 0}</span>
                </div>
              )}

              <div className="rounded-2xl border border-black/6 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#000435]">Students in {filters.className || 'all classes'}</p>
                  <div className="relative w-44">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#000435]/30" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-[#000435]/40 bg-[#000435]/[0.02]">
                        <th className="text-left py-2.5 px-3 w-8">#</th>
                        <th className="text-left py-2.5 px-2">Student</th>
                        <th className="text-center py-2.5 px-2">Avg</th>
                        <th className="text-center py-2.5 px-2">Grade</th>
                        <th className="text-center py-2.5 px-2">Pos</th>
                        <th className="text-center py-2.5 px-2">Status</th>
                        <th className="text-center py-2.5 px-3">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-[#000435]/40 text-sm">No reports — <Link to={generatePath} className="text-amber-600 font-medium">Generate</Link></td></tr>
                      ) : filteredStudents.map((row, i) => {
                        const st = statusPill(row);
                        const active = selectedId === row.snapshot_id;
                        return (
                          <tr key={row.snapshot_id} className={`border-t border-black/4 cursor-pointer transition-colors ${active ? 'bg-amber-50/80' : 'hover:bg-[#000435]/[0.02]'}`} onClick={() => openReport(row.snapshot_id)}>
                            <td className="py-2.5 px-3 text-[#000435]/35 text-xs">{row.position ?? i + 1}</td>
                            <td className="py-2.5 px-2">
                              <p className="font-medium text-[#000435] text-sm">{row.name}</p>
                              <p className="text-[10px] text-[#000435]/35">{row.student_uid}</p>
                            </td>
                            <td className="py-2.5 px-2 text-center font-semibold tabular-nums text-sm">{row.average != null ? `${row.average}%` : '—'}</td>
                            <td className="py-2.5 px-2 text-center"><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${gradePill(row.grade)}`}>{row.grade || '—'}</span></td>
                            <td className="py-2.5 px-2 text-center text-xs text-[#000435]/50">{row.position ?? '—'}</td>
                            <td className="py-2.5 px-2 text-center"><span className={`text-[9px] font-medium uppercase px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
                            <td className="py-2.5 px-3 text-center">
                              <button type="button" onClick={(e) => { e.stopPropagation(); openReport(row.snapshot_id); }} className="p-1.5 rounded-lg hover:bg-[#000435]/5" style={{ color: NAVY }}><Eye size={14} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredStudents.length > 0 && (
                  <p className="px-4 py-2 text-[10px] text-[#000435]/40 border-t border-black/4">Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</p>
                )}
              </div>
            </>
          )}
      </div>

      <ReportViewModal
        open={modalOpen}
        onClose={closeModal}
        report={previewReport}
        school={data?.school || previewReport?.school}
        loading={previewLoading}
        editable={previewReport?.status !== 'published'}
        onPublish={handlePublish}
        publishing={publishing}
        showExtraActivities={showExtraActivities}
        onToggleExtraActivities={setShowExtraActivities}
      />
    </div>
  );
}
