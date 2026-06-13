import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle,
  Download,
  Loader2,
  Printer,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import StudentReportCardView from '../dos/pages/Student Marks Reports/components/reports/StudentReportCardView';
import { exportReportCardToPdf } from '../dos/pages/Student Marks Reports/utils/reportPdfExport';
import {
  NAVY,
  reportTypeLabel,
  resolveAssetUrl,
} from '../dos/pages/Student Marks Reports/utils/reportCardHelpers';
import { fetchPublicStudentMarkReport } from '../services/publicStudentReportApi';

function StatusBadge({ status }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
        <ShieldCheck size={14} />
        Verified official report
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold text-sky-800 border border-sky-200">
      <QrCode size={14} />
      School report preview
    </span>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-cyan-50/30 px-4">
      <div className="rounded-2xl border border-white/80 bg-white/90 shadow-xl px-10 py-12 text-center backdrop-blur-sm">
        <Loader2 size={36} className="mx-auto animate-spin text-emerald-600" />
        <p className="mt-4 text-sm font-medium text-slate-700">Loading student report…</p>
        <p className="mt-1 text-xs text-slate-400">Please wait while we verify this report.</p>
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
        <p className="mt-4 text-[11px] text-slate-400">
          Contact your school office if you believe this is an error.
        </p>
      </div>
    </div>
  );
}

export default function StudentMarkReportQR() {
  const { snapshotId } = useParams();
  const reportRef = useRef(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

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
        const res = await fetchPublicStudentMarkReport(id);
        if (cancelled) return;
        if (!res?.success || !res?.data) {
          setError(res?.message || 'Report not found.');
          return;
        }
        setReport(res.data);
        const studentName = res.data.name || 'Student';
        const term = res.data.term || '';
        document.title = `${studentName} — ${reportTypeLabel(res.data.report_type)} ${term}`.trim();
      } catch (err) {
        if (cancelled) return;
        const msg = err.response?.data?.message || err.message || 'Failed to load report.';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [snapshotId]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadPdf = useCallback(async () => {
    const el = reportRef.current?.querySelector('[data-report-card]');
    if (!el || !report) return;
    setExporting(true);
    try {
      const safeName = String(report.name || 'student').replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '_');
      const filename = `${safeName}_${report.academic_year || 'report'}_${report.term || ''}.pdf`.replace(/_+/g, '_');
      await exportReportCardToPdf(el, filename);
    } catch {
      window.alert('Could not export PDF. Try using Print instead.');
    } finally {
      setExporting(false);
    }
  }, [report]);

  if (loading) return <LoadingState />;
  if (error || !report) return <ErrorState message={error} />;

  const school = report.school || {};
  const logoUrl = resolveAssetUrl(school.logo_url);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/50 to-cyan-50/40 print:bg-white">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur-md print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-10 h-10 rounded-full object-contain border border-slate-200 bg-white p-0.5 shrink-0" crossOrigin="anonymous" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-bold text-emerald-700">SCH</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{school.school_name || 'Student Report'}</p>
              <p className="text-[11px] text-slate-500 truncate">
                {report.name} · {report.class_name} · {report.academic_year}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={report.status} />
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Save PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 print:max-w-none print:p-0">
        <div className="mb-5 text-center print:hidden">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700/80">
            Digital report card
          </p>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">
            {reportTypeLabel(report.report_type)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Scanned from an official school report · {report.term} · {report.academic_year}
          </p>
        </div>

        <div ref={reportRef} className="shadow-2xl shadow-slate-300/30 rounded-2xl overflow-hidden print:shadow-none">
          <StudentReportCardView
            report={report}
            school={school}
            editable={false}
            readOnlyParent
            showExtraActivities={Boolean(report.include_extra_activities)}
          />
        </div>

        <footer className="mt-8 pb-10 text-center print:hidden">
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-md mx-auto">
            This page was opened from the QR code on a printed student report.
            For questions about marks or comments, please contact {school.school_name || 'your school'} directly.
          </p>
          <p className="mt-3 text-[10px] font-medium text-slate-300">
            Powered by Babyeyi Academic Reporting
          </p>
        </footer>
      </main>
    </div>
  );
}
