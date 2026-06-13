import { useEffect, useRef, useState } from 'react';

import { createPortal } from 'react-dom';

import { Download, Loader2, Printer, X } from 'lucide-react';

import StudentReportCardView from './StudentReportCardView';

import { exportReportCardToPdf, printReportCard } from '../../utils/reportPdfExport';

import { AMBER, NAVY } from '../../utils/reportCardHelpers';



export default function ReportViewModal({

  open,

  onClose,

  report,

  school,

  loading = false,

  editable = false,

  onPublish,

  publishing = false,

  showExtraActivities = false,

  onToggleExtraActivities,

}) {

  const cardRef = useRef(null);

  const [exporting, setExporting] = useState(false);



  useEffect(() => {

    if (!open) return undefined;

    const prev = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };

    window.addEventListener('keydown', onKey);

    return () => {

      document.body.style.overflow = prev;

      window.removeEventListener('keydown', onKey);

    };

  }, [open, onClose]);



  const handlePdf = async () => {

    if (!cardRef.current) return;

    setExporting(true);

    try {

      const name = (report?.name || 'student').replace(/[^\w.-]+/g, '_');

      await exportReportCardToPdf(cardRef.current, `${name}-report.pdf`);

    } finally {

      setExporting(false);

    }

  };



  if (!open) return null;



  return createPortal(

    <div className="fixed inset-0 z-[200] flex flex-col h-[100dvh] w-screen report-print-root" style={{ background: NAVY }}>

      <div

        className="report-print-chrome shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-white/10 shadow-md"

        style={{ background: NAVY }}

      >

        <div className="min-w-0">

          <p className="text-sm sm:text-base font-bold text-white truncate">

            {report?.name || 'Student report'}

          </p>

          <p className="text-[11px] text-amber-200/90 truncate">

            {report?.class_name} · {report?.academic_year} · {report?.term}

          </p>

        </div>

        <div className="flex items-center gap-2 shrink-0">

          {onToggleExtraActivities && (

            <label className="hidden sm:flex items-center gap-2 text-[11px] text-white/80 mr-1 cursor-pointer">

              <input

                type="checkbox"

                checked={showExtraActivities}

                onChange={(e) => onToggleExtraActivities(e.target.checked)}

                className="rounded border-white/30 text-amber-500 focus:ring-amber-400"

              />

              Include extra activities

            </label>

          )}

          <button

            type="button"

            onClick={handlePdf}

            disabled={!report || exporting || loading}

            className="h-9 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"

            style={{ background: AMBER, color: NAVY }}

          >

            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}

            PDF

          </button>

          <button

            type="button"

            onClick={() => printReportCard()}

            disabled={!report || loading}

            className="h-9 px-3 rounded-xl border border-white/20 text-xs text-white inline-flex items-center gap-1.5 hover:bg-white/10"

          >

            <Printer size={14} />

          </button>

          <button

            type="button"

            onClick={onClose}

            className="h-9 w-9 rounded-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/10"

            aria-label="Close"

          >

            <X size={18} />

          </button>

        </div>

      </div>



      <div className="report-print-surface flex-1 min-h-0 overflow-y-auto overscroll-contain bg-slate-100 print:bg-white">

        {loading ? (

          <div className="flex items-center justify-center min-h-[50vh]">

            <Loader2 className="animate-spin" size={36} style={{ color: AMBER }} />

          </div>

        ) : (

          <div className="w-full min-h-full py-4 sm:py-6 px-3 sm:px-6 md:px-8 pb-12">

            <div ref={cardRef} className="w-full max-w-5xl mx-auto print:max-w-none">

              <StudentReportCardView

                report={report}

                school={school}

                editable={editable}

                onPublish={onPublish}

                publishing={publishing}

                showExtraActivities={showExtraActivities}

                variant="fullscreen"

              />

            </div>

          </div>

        )}

      </div>

    </div>,

    document.body,

  );

}


