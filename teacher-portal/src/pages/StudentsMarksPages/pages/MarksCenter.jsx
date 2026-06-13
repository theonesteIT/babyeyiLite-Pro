import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, CheckCircle2, Download, FileSpreadsheet, Loader2,
  Plus, Printer, Search, TrendingUp, User, X,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { fetchMarksCenter, patchMarkCell } from '../../../services/marksApi.js';
import { buildFilterParams, gradeBadgeClass, markColorClass } from '../utils/marksCenterUtils.js';
import { exportMarksCenterExcel, exportMarksCenterPdf } from '../utils/marksCenterExport.js';
import RecordMarksWizard from '../components/RecordMarksWizard.jsx';

function FilterSelect({ label, value, onChange, options, disabled }) {
  return (
    <div className="min-w-[130px] flex-1">
      <label className="text-[10px] font-medium text-[#000435]/45 block mb-1">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-9 rounded-lg border border-black/10 bg-white px-2.5 text-xs text-[#000435] focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function KpiCard({ label, value, suffix = '' }) {
  return (
    <div className="rounded-xl border border-black/6 bg-white px-4 py-3">
      <p className="text-[10px] font-medium text-[#000435]/45">{label}</p>
      <p className="text-lg font-semibold text-[#000435] mt-0.5 tabular-nums">
        {value ?? '—'}{suffix && value != null ? suffix : ''}
      </p>
    </div>
  );
}

export default function MarksCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPreset, setWizardPreset] = useState(null);
  const [exporting, setExporting] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const fetchSeq = useRef(0);
  const hasLoadedRef = useRef(false);

  const [filters, setFilters] = useState({
    academicYear: '',
    term: '',
    className: '',
    course: '',
    assessmentType: '',
    assessmentId: '',
  });

  const filtersRef = useRef(filters);
  const studentSearchRef = useRef(studentSearch);
  filtersRef.current = filters;
  studentSearchRef.current = studentSearch;

  const syncFiltersFromSelected = useCallback((selected, current) => {
    if (!selected) return current;
    const next = { ...current };
    let changed = false;
    const apply = (key, value) => {
      if (value == null || value === '') return;
      if (next[key] !== value) {
        next[key] = value;
        changed = true;
      }
    };
    if (!current.academicYear) apply('academicYear', selected.academic_year);
    if (!current.term) apply('term', selected.term);
    if (!current.className) apply('className', selected.class_name);
    if (!current.course) apply('course', selected.subject_name);
    return changed ? next : current;
  }, []);

  const load = useCallback(async (studentId = null) => {
    const seq = ++fetchSeq.current;
    if (hasLoadedRef.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetchMarksCenter(buildFilterParams(filtersRef.current, studentSearchRef.current, studentId));
      if (seq !== fetchSeq.current) return;
      if (!res?.success) {
        setError(res?.message || 'Failed to load marks center');
        if (!hasLoadedRef.current) setData(null);
        return;
      }
      setData(res.data);
      hasLoadedRef.current = true;
      if (res.data?.selected) {
        setFilters((f) => syncFiltersFromSelected(res.data.selected, f));
      }
      if (studentId && res.data?.student_detail) {
        setSelectedStudent(res.data.student_detail);
      }
    } catch (err) {
      if (seq !== fetchSeq.current) return;
      setError(err?.response?.data?.message || 'Failed to load marks center');
    } finally {
      if (seq === fetchSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [syncFiltersFromSelected]);

  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
  }, [
    filters.academicYear,
    filters.term,
    filters.className,
    filters.course,
    filters.assessmentType,
    filters.assessmentId,
    studentSearch,
    load,
  ]);

  const columns = data?.assessment_columns || [];
  const students = data?.students || [];
  const categoryRows = data?.category_averages || [];

  const yearOptions = useMemo(() => {
    const current = data?.filters?.current_academic_year;
    return (data?.filters?.academic_years || []).map((y) => ({
      value: y,
      label: current && y === current ? `${y} (current)` : y,
    }));
  }, [data]);

  const typeOptions = useMemo(() => [
    { value: '', label: 'All types' },
    ...(data?.filters?.assessment_types || []).map((t) => ({ value: t.slug, label: t.name })),
  ], [data]);

  const assessmentOptions = useMemo(() => [
    { value: '', label: 'All assessments' },
    ...(data?.filters?.assessments || []).map((a) => ({ value: String(a.id), label: a.assessment_name })),
  ], [data]);

  const setFilter = (key, value) => {
    setFilters((f) => {
      const next = { ...f, [key]: value };
      if (key === 'academicYear') {
        next.term = '';
        next.className = '';
        next.course = '';
        next.assessmentType = '';
        next.assessmentId = '';
      }
      if (key === 'className') { next.course = ''; next.assessmentType = ''; next.assessmentId = ''; }
      if (key === 'course') { next.assessmentType = ''; next.assessmentId = ''; }
      if (key === 'assessmentType') next.assessmentId = '';
      if (key === 'term') {
        next.className = '';
        next.course = '';
        next.assessmentType = '';
        next.assessmentId = '';
      }
      return next;
    });
  };

  const openStudent = (row) => {
    setSelectedStudent(row);
    load(row.student_id);
  };

  const startEdit = (studentId, assessmentId, current) => {
    setEditingCell(`${studentId}:${assessmentId}`);
    setEditValue(current?.mark_code || (current?.value != null ? String(current.value) : ''));
  };

  const saveEdit = async (studentId, assessmentId, maxScore) => {
    setSavingCell(true);
    try {
      const upper = editValue.trim().toUpperCase();
      const payload = { assessment_id: assessmentId, student_id: studentId };
      if (['A', 'E', 'M'].includes(upper)) payload.mark_code = upper;
      else if (editValue.trim() === '') payload.value = '';
      else payload.value = Number(editValue);

      const res = await patchMarkCell(payload);
      if (!res?.success) {
        setError(res?.message || 'Failed to save mark');
        return;
      }
      setEditingCell(null);
      await load(selectedStudent?.student_id || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save mark');
    } finally {
      setSavingCell(false);
    }
  };

  const handlePrint = () => window.print();

  const openWizard = (preset = null) => {
    setWizardPreset(preset);
    setWizardOpen(true);
  };

  const handleExportExcel = () => {
    if (!data?.students?.length) return;
    setExporting('excel');
    try {
      exportMarksCenterExcel(data, filters);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (!data?.students?.length) return;
    setExporting('pdf');
    try {
      await exportMarksCenterPdf(data, filters);
    } finally {
      setExporting(null);
    }
  };

  const gradeChartData = useMemo(() => {
    const d = data?.grade_distribution || {};
    return ['A', 'B', 'C', 'D', 'F'].map((g) => ({ grade: g, count: d[g] || 0 }));
  }, [data]);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[#000435]">Marks Center</h3>
          <p className="text-xs text-[#000435]/50 mt-0.5">Gradebook for your assigned classes only — filters update instantly.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {refreshing && <Loader2 size={14} className="animate-spin text-[#000435]/30" />}
          <button
            type="button"
            onClick={() => openWizard({ className: filters.className, subjectName: filters.course, typeSlug: filters.assessmentType || undefined, startStep: 1 })}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-black/10 text-[#000435]/70 hover:bg-black/5"
          >
            <Plus size={14} /> Add assessment
          </button>
          <button type="button" onClick={() => openWizard({ className: filters.className, subjectName: filters.course, startStep: 0 })} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#ff8c00] text-[#000435]">
            <Plus size={14} /> Add marks
          </button>
          <button type="button" onClick={handleExportExcel} disabled={!data?.students?.length || exporting} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-black/10 text-[#000435]/70 disabled:opacity-40">
            {exporting === 'excel' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Excel
          </button>
          <button type="button" onClick={handleExportPdf} disabled={!data?.students?.length || exporting} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-black/10 text-[#000435]/70 disabled:opacity-40">
            {exporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
          </button>
          <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-black/10 text-[#000435]/70">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-black/6 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <FilterSelect label="Academic year" value={filters.academicYear} onChange={(v) => setFilter('academicYear', v)}
            options={yearOptions.length ? yearOptions : [{ value: '', label: 'Loading…' }]} disabled={loading} />
          <FilterSelect label="Term" value={filters.term} onChange={(v) => setFilter('term', v)}
            options={(data?.filters?.terms || ['Term 1', 'Term 2', 'Term 3']).map((t) => ({ value: t, label: t }))} disabled={loading} />
          <FilterSelect label="Class" value={filters.className} onChange={(v) => setFilter('className', v)}
            options={(data?.filters?.classes || []).map((c) => ({ value: c, label: c }))} disabled={loading} />
          <FilterSelect label="Course" value={filters.course} onChange={(v) => setFilter('course', v)}
            options={(data?.filters?.courses || []).map((c) => ({ value: c, label: c }))} disabled={loading} />
          <FilterSelect label="Assessment type" value={filters.assessmentType} onChange={(v) => setFilter('assessmentType', v)}
            options={typeOptions} disabled={loading} />
          <FilterSelect label="Assessment" value={filters.assessmentId} onChange={(v) => setFilter('assessmentId', v)}
            options={assessmentOptions} disabled={loading} />
          <div className="min-w-[160px] flex-1">
            <label className="text-[10px] font-medium text-[#000435]/45 block mb-1">Search student</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#000435]/30" />
              <input
                type="search"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Name or ID…"
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-black/10 text-xs focus:ring-2 focus:ring-[#ff8c00]/25 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-100 text-red-800">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {data?.empty_reason && !loading && (
        <div className="rounded-xl border border-black/6 bg-white p-8 text-center text-sm text-[#000435]/50">{data.empty_reason}</div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#000435]/30" size={32} /></div>
      ) : data && !data.empty_reason && (
        <>
          {/* Insights */}
          {(data.missing_marks_count > 0 || (data.insights || []).length > 0) && (
            <div className="flex flex-wrap gap-2">
              {data.missing_marks_count > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <AlertTriangle size={14} /> {data.missing_marks_count} missing marks
                  <button type="button" onClick={() => openWizard({ className: filters.className, subjectName: filters.course, startStep: 2 })} className="ml-1 font-medium underline">Complete missing marks</button>
                </div>
              )}
              {(data.insights || []).map((ins, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ${ins.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-amber-50 text-amber-900 border border-amber-100'}`}>
                  {ins.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {ins.text}
                </div>
              ))}
            </div>
          )}

          {columns.length === 0 && (
            <div className="rounded-xl border border-[#ff8c00]/20 bg-[#ff8c00]/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-[#000435]/70">
              <span>No assessments for <strong>{filters.course || data.selected?.subject_name}</strong> in <strong>{filters.className || data.selected?.class_name}</strong> yet.</span>
              <button type="button" onClick={() => openWizard({ className: filters.className, subjectName: filters.course, startStep: 1 })} className="text-xs font-medium text-[#ff8c00] hover:underline">
                + Create first assessment
              </button>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <KpiCard label="Total students" value={data.kpis?.total_students} />
            <KpiCard label="Average mark" value={data.kpis?.average_percent} suffix="%" />
            <KpiCard label="Highest score" value={data.kpis?.highest} suffix="%" />
            <KpiCard label="Lowest score" value={data.kpis?.lowest} suffix="%" />
            <KpiCard label="Pass rate" value={data.kpis?.pass_rate} suffix="%" />
          </div>
          {columns.length > 0 && data.kpis?.average_percent == null && (
            <p className="text-xs text-[#000435]/45 -mt-2">KPIs appear once marks are recorded for the selected class and course.</p>
          )}

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-[#000435]/[0.04] w-fit">
            {[
              { id: 'all', label: 'All assessments' },
              { id: 'categories', label: 'Assessment categories' },
              { id: 'averages', label: 'Student averages' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${tab === t.id ? 'bg-white text-[#000435] shadow-sm' : 'text-[#000435]/50 hover:text-[#000435]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Main grid: table + assessment panel */}
          <div className="flex flex-col xl:flex-row gap-4">
            <div className="flex-1 min-w-0 rounded-2xl border border-black/6 bg-white shadow-sm overflow-hidden">
              {tab === 'all' && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="bg-[#000435]/[0.03] text-[10px] font-medium uppercase tracking-wide text-[#000435]/50">
                        <th className="sticky left-0 z-20 bg-[#f4f5f8] text-left py-3 px-4 min-w-[160px] border-r border-black/6">Student</th>
                        {columns.map((c) => (
                          <th key={c.id} className="text-center py-3 px-2 min-w-[72px] whitespace-nowrap">{c.short_label || c.assessment_name}</th>
                        ))}
                        <th className="text-center py-3 px-3 min-w-[64px]">Avg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length === 0 ? (
                        <tr><td colSpan={columns.length + 2} className="py-12 text-center text-[#000435]/40 text-sm">No students found</td></tr>
                      ) : students.map((row) => (
                        <tr key={row.student_id} className="border-t border-black/4 hover:bg-[#ff8c00]/[0.03] cursor-pointer" onClick={() => openStudent(row)}>
                          <td className="sticky left-0 z-10 bg-white border-r border-black/6 py-2.5 px-4 font-medium text-[#000435]">
                            <p className="truncate max-w-[140px]">{row.name}</p>
                            <p className="text-[10px] text-[#000435]/35">{row.student_uid}</p>
                          </td>
                          {columns.map((c) => {
                            const cell = row.marks[c.id];
                            const cellKey = `${row.student_id}:${c.id}`;
                            const isEditing = editingCell === cellKey;
                            return (
                              <td key={c.id} className="text-center py-1.5 px-1" onClick={(e) => e.stopPropagation()}>
                                {isEditing ? (
                                  <input
                                    autoFocus
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit(row.student_id, c.id, c.max_score)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(row.student_id, c.id, c.max_score); if (e.key === 'Escape') setEditingCell(null); }}
                                    disabled={savingCell}
                                    className="w-14 h-8 text-center text-xs rounded-lg border border-[#ff8c00] focus:outline-none"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => startEdit(row.student_id, c.id, cell)}
                                    className={`min-w-[2.5rem] h-8 px-1.5 rounded-lg text-xs font-medium tabular-nums ${markColorClass(cell?.percent)}`}
                                  >
                                    {cell?.mark_code || (cell?.value != null ? cell.value : '—')}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                          <td className="text-center py-2.5 px-2">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${markColorClass(row.average_percent)}`}>
                              {row.average_percent != null ? `${row.average_percent}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'categories' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#000435]/[0.03] text-[10px] font-medium uppercase text-[#000435]/50">
                        <th className="text-left py-3 px-4">Category</th>
                        <th className="text-center py-3 px-4">Weight</th>
                        <th className="text-center py-3 px-4">Class average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.length === 0 ? (
                        <tr><td colSpan={3} className="py-10 text-center text-[#000435]/40">No category data yet</td></tr>
                      ) : categoryRows.map((c) => (
                        <tr key={c.slug} className="border-t border-black/4">
                          <td className="py-3 px-4 font-medium text-[#000435]">{c.name}</td>
                          <td className="py-3 px-4 text-center text-[#000435]/60">{c.weight_percent}%</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${markColorClass(c.average_percent)}`}>
                              {c.average_percent != null ? `${c.average_percent}%` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'averages' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#000435]/[0.03] text-[10px] font-medium uppercase text-[#000435]/50">
                        <th className="text-left py-3 px-4">#</th>
                        <th className="text-left py-3 px-4">Student</th>
                        <th className="text-center py-3 px-4">Average</th>
                        <th className="text-center py-3 px-4">Grade</th>
                        <th className="text-center py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((row) => (
                        <tr key={row.student_id} className="border-t border-black/4 hover:bg-[#ff8c00]/[0.03] cursor-pointer" onClick={() => openStudent(row)}>
                          <td className="py-3 px-4 text-[#000435]/40 text-xs">{row.position ?? '—'}</td>
                          <td className="py-3 px-4 font-medium text-[#000435]">{row.name}</td>
                          <td className="py-3 px-4 text-center font-semibold tabular-nums">{row.average_percent != null ? `${row.average_percent}%` : '—'}</td>
                          <td className="py-3 px-4 text-center">
                            {row.grade ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${gradeBadgeClass(row.grade)}`}>{row.grade}</span> : '—'}
                          </td>
                          <td className="py-3 px-4 text-center text-xs">
                            {row.missing_count > 0 ? (
                              <span className="text-amber-700">Missing {row.missing_count}</span>
                            ) : (
                              <span className="text-green-700">Complete</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Assessment panel */}
            {data.selected_assessment && (
              <div className="xl:w-72 shrink-0 rounded-2xl border border-black/6 bg-white p-5 shadow-sm h-fit">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#000435]/40 mb-3">Assessment details</p>
                <h4 className="text-sm font-semibold text-[#000435]">{data.selected_assessment.assessment_name}</h4>
                <dl className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between"><dt className="text-[#000435]/50">Type</dt><dd className="font-medium text-[#000435]">{data.selected_assessment.type_name}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#000435]/50">Maximum marks</dt><dd className="font-medium">{data.selected_assessment.max_score}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#000435]/50">Created</dt><dd className="font-medium">{data.selected_assessment.created_at ? new Date(data.selected_assessment.created_at).toLocaleDateString() : '—'}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#000435]/50">Submitted</dt><dd className="font-medium text-[#ff8c00]">{data.selected_assessment.submitted_count}/{data.selected_assessment.total_students}</dd></div>
                </dl>
                <button type="button" onClick={() => setFilter('assessmentId', String(data.selected_assessment.id))} className="mt-4 w-full h-9 rounded-lg border border-black/10 text-xs font-medium text-[#000435]/70 hover:bg-black/5">
                  Focus this assessment
                </button>
              </div>
            )}
          </div>

          {/* Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-black/6 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-[#000435]/55 mb-3 flex items-center gap-1.5"><BarChart3 size={14} /> Grade distribution</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={gradeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#00043508" />
                  <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ff8c00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-black/6 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-[#000435]/55 mb-3 flex items-center gap-1.5"><TrendingUp size={14} /> Performance trend</p>
              {(data.trend || []).length === 0 ? (
                <p className="text-xs text-[#000435]/40 py-12 text-center">Record more assessments to see trends</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00043508" />
                    <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={50} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Line type="monotone" dataKey="average" stroke="#000435" strokeWidth={2} dot={{ fill: '#ff8c00' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-2xl border border-black/6 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-[#000435]/55 mb-3">Top performers</p>
              {(data.top_performers || []).length === 0 ? (
                <p className="text-xs text-[#000435]/40 py-8 text-center">No data yet</p>
              ) : (
                <ol className="space-y-2">
                  {data.top_performers.map((p, i) => (
                    <li key={p.student_id} className="flex items-center justify-between text-sm">
                      <span className="text-[#000435]/40 text-xs w-5">{i + 1}</span>
                      <span className="flex-1 font-medium text-[#000435] truncate">{p.name}</span>
                      <span className="text-xs font-semibold text-[#ff8c00]">{p.average_percent}%</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      )}

      <RecordMarksWizard
        open={wizardOpen}
        preset={wizardPreset}
        onClose={() => { setWizardOpen(false); setWizardPreset(null); load(); }}
        onPublished={() => load()}
      />

      {/* Student drawer */}
      {selectedStudent && createPortal(
        <div className="fixed inset-0 z-[200] flex justify-end">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-[#000435]/40" onClick={() => setSelectedStudent(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-[slideIn_.25s_ease-out]">
            <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
            <div className="px-5 py-4 border-b border-black/6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#000435]/5 flex items-center justify-center"><User size={20} className="text-[#ff8c00]" /></div>
                <div>
                  <p className="text-sm font-semibold text-[#000435]">{selectedStudent.name}</p>
                  <p className="text-[10px] text-[#000435]/45">{selectedStudent.student_uid}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedStudent(null)} className="p-2 rounded-lg hover:bg-black/5"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-black/6 p-3">
                  <p className="text-[10px] text-[#000435]/40">Average</p>
                  <p className="text-lg font-semibold text-[#000435]">{selectedStudent.average_percent != null ? `${selectedStudent.average_percent}%` : '—'}</p>
                </div>
                <div className="rounded-xl border border-black/6 p-3">
                  <p className="text-[10px] text-[#000435]/40">Position</p>
                  <p className="text-lg font-semibold text-[#000435]">{selectedStudent.position ?? '—'}</p>
                </div>
              </div>
              {selectedStudent.grade && (
                <div className="rounded-xl border border-black/6 p-3 flex items-center justify-between">
                  <span className="text-xs text-[#000435]/50">Grade</span>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${gradeBadgeClass(selectedStudent.grade)}`}>{selectedStudent.grade}</span>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-[#000435]/55 mb-2">Subject averages (your classes)</p>
                <div className="space-y-2">
                  {(selectedStudent.subject_averages || []).length === 0 ? (
                    <p className="text-xs text-[#000435]/40">No marks recorded in other subjects yet.</p>
                  ) : selectedStudent.subject_averages.map((s) => (
                    <div key={s.subject_name} className="flex items-center justify-between py-2 border-b border-black/4 last:border-0">
                      <span className="text-sm text-[#000435]">{s.subject_name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${markColorClass(s.average_percent)}`}>{s.average_percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link to="/marks/student-profiles" className="block text-center text-xs font-medium text-[#ff8c00] hover:underline">View full student profile →</Link>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
