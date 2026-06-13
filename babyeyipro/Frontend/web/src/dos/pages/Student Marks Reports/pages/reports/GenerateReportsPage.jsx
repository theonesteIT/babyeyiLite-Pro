import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Users } from 'lucide-react';
import PageShell, { KpiCard, Panel } from '../../components/PageShell';
import {
  fetchReportsDashboard, fetchReportPreview, generateReports, seedDemoMarksReports,
} from '../../services/dosStudentReportsApi';
import { fetchAcademicCalendar } from '../../services/marksAcademicApi';
import {
  currentAcademicYear, mergeAcademicRegistries, termsForYear,
} from '../../utils/academicRegistry';
import { smr } from '../../utils/paths';

const STEPS = ['Select scope', 'Preview statistics', 'Generate reports'];

export default function GenerateReportsPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [registry, setRegistry] = useState([]);
  const [classes, setClasses] = useState([]);
  const [preview, setPreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  const [form, setForm] = useState({
    academicYear: searchParams.get('year') || '',
    term: searchParams.get('term') || '',
    reportType: searchParams.get('type') || 'final',
    className: searchParams.get('class') || '',
    includeExtraActivities: false,
  });

  const termOptions = useMemo(
    () => termsForYear(registry, form.academicYear),
    [registry, form.academicYear],
  );

  const yearOptions = useMemo(
    () => registry.map((r) => r.academic_year).filter(Boolean),
    [registry],
  );

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, calRes] = await Promise.all([
        fetchReportsDashboard({}),
        fetchAcademicCalendar().catch(() => null),
      ]);

      const mergedRegistry = mergeAcademicRegistries(
        calRes?.data?.academic_years_registry,
        dashRes?.data?.filters?.academic_years_registry,
      );
      setRegistry(mergedRegistry);

      if (dashRes?.success) {
        setClasses(dashRes.data?.filters?.classes || []);
      }

      const defaultYear = currentAcademicYear(mergedRegistry)
        || dashRes?.data?.selected?.academic_year
        || '';

      setForm((f) => {
        const year = f.academicYear || defaultYear;
        const terms = termsForYear(mergedRegistry, year);
        return {
          ...f,
          academicYear: year,
          term: f.term && terms.includes(f.term) ? f.term : (terms[0] || ''),
        };
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load options');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  const isAnnual = form.reportType === 'annual';

  const setField = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'academicYear' && next.reportType !== 'annual') {
        const terms = termsForYear(registry, value);
        if (terms.length) next.term = terms[0];
      }
      if (key === 'reportType' && value === 'annual') {
        next.term = 'Annual';
      }
      if (key === 'reportType' && value !== 'annual' && next.term === 'Annual') {
        const terms = termsForYear(registry, next.academicYear);
        next.term = terms[0] || 'Term 1';
      }
      return next;
    });
  };

  const loadPreview = async () => {
    if (!form.className) {
      setError('Select a class');
      return;
    }
    if (!form.academicYear) {
      setError('Select an academic year');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReportPreview({
        academic_year: form.academicYear,
        term: isAnnual ? 'Annual' : form.term,
        report_type: form.reportType,
        class_name: form.className,
        include_extra_activities: form.includeExtraActivities ? '1' : '0',
      });
      if (!res?.success) {
        setError(res?.message || 'Preview failed');
        return;
      }
      setPreview(res.data);
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateReports({
        academic_year: form.academicYear,
        term: isAnnual ? 'Annual' : form.term,
        report_type: form.reportType,
        class_name: form.className,
        include_extra_activities: form.includeExtraActivities,
      });
      if (!res?.success) {
        setError(res?.message || 'Generation failed');
        return;
      }
      setSuccess(res.message || `Generated ${res.data?.generated} reports`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const runDemoSeed = async () => {
    if (!window.confirm(
      'Load demo data?\n\nThis seeds P5 teacher assignments, marks for Term 1–3, and generates Mid-Term + Final reports for all P5 classes. Existing demo assessments are replaced.',
    )) return;
    setSeedingDemo(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await seedDemoMarksReports({ clear: true, generate_reports: true });
      if (!res?.success) throw new Error(res?.message || 'Demo seed failed');
      setSuccess(res.message || 'Demo data loaded');
      await loadMeta();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Demo seed failed');
    } finally {
      setSeedingDemo(false);
    }
  };

  return (
    <PageShell
      title="Generate reports"
      subtitle={`${form.term || 'Term'} · ${form.academicYear || 'Academic year'} — snapshot-based generation`}
      actions={(
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runDemoSeed}
            disabled={seedingDemo}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-amber-200 bg-amber-50 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {seedingDemo ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
            Load demo data
          </button>
          <Link to={smr('reports-dashboard')} className="inline-flex items-center gap-1 text-xs text-[#000435]/50 hover:text-[#000435]">
            <ArrowLeft size={14} /> Back to dashboard
          </Link>
        </div>
      )}
    >
      <div className="flex gap-2 flex-wrap">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              step === i ? 'bg-[#000435] text-white' : step > i ? 'bg-green-100 text-green-800' : 'bg-[#000435]/5 text-[#000435]/40'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-100 text-red-800">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {success && step !== 2 && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-emerald-50 border border-emerald-100 text-emerald-900">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      {step === 0 && (
        <Panel title="Step 1 — Select scope">
          {loading && !yearOptions.length ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#000435]/25" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide text-[#000435]/45 block mb-1">Academic year</label>
                <select
                  value={form.academicYear}
                  onChange={(e) => setField('academicYear', e.target.value)}
                  className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm text-[#000435] focus:ring-2 focus:ring-amber-400/30 focus:outline-none"
                >
                  {yearOptions.length === 0 && <option value="">No years configured</option>}
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <p className="text-[10px] text-[#000435]/40 mt-1">From DOS / Manager preferences</p>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide text-[#000435]/45 block mb-1">Term</label>
                <select
                  value={isAnnual ? 'Annual' : form.term}
                  onChange={(e) => setField('term', e.target.value)}
                  disabled={isAnnual}
                  className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm text-[#000435] focus:ring-2 focus:ring-amber-400/30 focus:outline-none disabled:bg-slate-50 disabled:text-[#000435]/50"
                >
                  {isAnnual ? <option value="Annual">Annual (Term 1 + 2 + 3)</option> : termOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide text-[#000435]/45 block mb-1">Report type</label>
                <select
                  value={form.reportType}
                  onChange={(e) => setField('reportType', e.target.value)}
                  className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm text-[#000435] focus:ring-2 focus:ring-amber-400/30 focus:outline-none"
                >
                  <option value="mid_term">Mid-Term Report</option>
                  <option value="final">Final Report</option>
                  <option value="annual">All Year Report</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium uppercase tracking-wide text-[#000435]/45 block mb-1">Class</label>
                <select
                  value={form.className}
                  onChange={(e) => setField('className', e.target.value)}
                  className="w-full h-10 rounded-xl border border-black/10 px-3 text-sm text-[#000435] focus:ring-2 focus:ring-amber-400/30 focus:outline-none"
                >
                  <option value="">Select class…</option>
                  {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2.5 h-10 px-3 rounded-xl border border-black/10 bg-slate-50/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.includeExtraActivities}
                    onChange={(e) => setField('includeExtraActivities', e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
                  />
                  <span className="text-xs text-[#000435]/70">Include extra-activity courses on generated reports</span>
                </label>
                <p className="text-[10px] text-[#000435]/40 mt-1">Off by default — clubs, sports, and timetable extra activities are excluded.</p>
              </div>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={loadPreview}
              disabled={loading || !form.className || !form.academicYear}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium bg-[#000435] text-white disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Preview statistics
            </button>
          </div>
        </Panel>
      )}

      {step === 1 && preview && (
        <Panel title="Step 2 — Preview statistics">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <KpiCard icon={Users} label="Total students" value={preview.total_students} />
            <KpiCard label="Class average" value={preview.class_average != null ? `${preview.class_average}%` : '—'} />
            <KpiCard label="Highest student" value={preview.highest != null ? `${preview.highest}%` : '—'} />
            <KpiCard label="Lowest student" value={preview.lowest != null ? `${preview.lowest}%` : '—'} />
            <KpiCard label="Pass rate" value={preview.pass_rate != null ? `${preview.pass_rate}%` : '—'} />
          </div>

          {!preview.has_marks && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <AlertTriangle size={14} />
              No marks recorded for this class yet. Reports can still be generated but will show empty scores until teachers enter marks.
            </div>
          )}

          {preview.students_at_risk > 0 && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <AlertTriangle size={14} /> {preview.students_at_risk} students at risk (below 50%)
            </div>
          )}

          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={() => setStep(0)} className="px-4 py-2 rounded-xl text-xs font-medium border border-black/10 text-[#000435]/60">Back</button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium bg-[#ff8c00] text-[#000435] disabled:opacity-40"
            >
              {generating ? <Loader2 size={14} className="animate-spin" /> : null}
              Generate all reports
            </button>
          </div>
        </Panel>
      )}

      {step === 2 && success && (
        <Panel title="Step 3 — Reports generated">
          <div className="flex items-center gap-3 text-green-800 bg-green-50 border border-green-100 rounded-xl px-4 py-4">
            <CheckCircle2 size={20} /> <p className="text-sm font-medium">{success}</p>
          </div>
          <p className="text-xs text-[#000435]/50 mt-3">Snapshots saved — PDFs generate on first download (cached after).</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={smr('download-center')} className="px-4 py-2 rounded-xl text-xs font-medium bg-[#000435] text-white">Download center</Link>
            <Link to={smr('publish-reports')} className="px-4 py-2 rounded-xl text-xs font-medium border border-black/10 text-[#000435]/70">Publish reports</Link>
            <Link
              to={form.reportType === 'mid_term' ? smr('mid-term-reports') : smr('final-reports')}
              className="px-4 py-2 rounded-xl text-xs font-medium border border-black/10 text-[#000435]/70"
            >
              View reports
            </Link>
          </div>
        </Panel>
      )}
    </PageShell>
  );
}
