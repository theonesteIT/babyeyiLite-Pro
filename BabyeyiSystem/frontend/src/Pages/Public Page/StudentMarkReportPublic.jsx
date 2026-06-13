/**
 * Public student mark report — opened from QR on printed report cards (no login).
 * Route: /student-mark-report/:snapshotId
 * Legacy: /pro/student-mark-report/:snapshotId (old QR codes)
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Loader2, Printer, ShieldCheck } from 'lucide-react';
import ParentStudentReportCard from '../../components/Parents/ParentStudentReportCard';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '');

async function fetchPublicReport(snapshotId) {
  const res = await fetch(`${API_BASE}/api/public/student-mark-reports/${snapshotId}`, {
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Report not found');
  }
  return data;
}

function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100 px-4">
      <div className="rounded-2xl border border-white/80 bg-white/90 shadow-xl px-10 py-12 text-center">
        <Loader2 size={36} className="mx-auto animate-spin text-[#000435]" />
        <p className="mt-4 text-sm font-medium text-slate-700">Loading student report…</p>
      </div>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/30 to-red-50/20 px-4">
      <div className="max-w-md w-full rounded-2xl border border-red-100 bg-white shadow-xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900">Report unavailable</h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          {message || 'This report could not be found. It may have been removed or the QR code may be outdated.'}
        </p>
      </div>
    </div>
  );
}

export default function StudentMarkReportPublic() {
  const { snapshotId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setReport(null);
      const id = Number(snapshotId);
      if (!id) {
        setError('Invalid report link.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetchPublicReport(id);
        if (cancelled) return;
        if (!res?.success || !res?.data) {
          setError(res?.message || 'Report not found.');
          return;
        }
        setReport(res.data);
        const studentName = res.data.name || 'Student';
        document.title = `${studentName} — Student Report`;
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load report.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [snapshotId]);

  if (loading) return <LoadingState />;
  if (error || !report) return <ErrorState message={error} />;

  const school = report.school || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-amber-50/40 to-slate-50 print:bg-white">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/85 backdrop-blur-md print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#000435] truncate">{school.school_name || 'Student Report'}</p>
            <p className="text-[11px] text-slate-500 truncate">
              {report.name} · {report.class_name} · {report.academic_year}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
              <ShieldCheck size={14} />
              Official school report
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 print:max-w-none print:p-0">
        <div className="shadow-2xl shadow-slate-300/30 rounded-2xl overflow-hidden print:shadow-none">
          <ParentStudentReportCard report={report} school={school} />
        </div>
        <footer className="mt-8 pb-10 text-center print:hidden">
          <p className="text-[11px] text-slate-400">
            Opened from QR on a printed student report · Contact {school.school_name || 'your school'} for questions.
          </p>
        </footer>
      </main>
    </div>
  );
}
