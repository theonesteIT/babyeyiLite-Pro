import { Loader2, Send } from 'lucide-react';

import ModernStudentReportCard from './ModernStudentReportCard';

import { NAVY, AMBER } from '../../utils/reportCardHelpers';



function statusLabel(report) {

  const avg = report?.overall_average;

  if (avg == null) return 'Pending';

  if (avg >= 80) return 'Excellent';

  if (avg >= 65) return 'Good';

  if (avg >= 50) return 'Average';

  return 'At risk';

}



export default function StudentReportCardView({

  report,

  school,

  editable = false,

  onPublish,

  publishing = false,

  readOnlyParent = false,

  showExtraActivities = false,

  variant = 'card',

}) {

  if (!report) {

    return (

      <div className="h-full flex items-center justify-center text-sm text-slate-400 p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-white">

        Select a student from the table to preview their report card.

      </div>

    );

  }



  const footerSlot = !readOnlyParent && editable && report.status !== 'published' && onPublish ? (

    <div className="report-no-print flex flex-wrap items-center gap-2 pt-1">

      <button

        type="button"

        disabled={publishing}

        onClick={() => onPublish()}

        className="flex-1 min-w-[160px] h-10 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm"

        style={{ background: AMBER, color: NAVY }}

      >

        {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}

        Publish to parents

      </button>

      <span className="text-[10px] text-slate-400 ml-auto">{statusLabel(report)}</span>

    </div>

  ) : null;



  const shellClass = variant === 'fullscreen'

    ? 'bg-white shadow-xl rounded-2xl overflow-visible print:shadow-none print:rounded-none'

    : 'rounded-2xl border border-slate-200/80 shadow-md overflow-hidden bg-white';



  return (

    <div className={shellClass}>

      <ModernStudentReportCard

        report={report}

        school={school}

        footerSlot={footerSlot}

        compact

        showExtraActivities={showExtraActivities}
        printMode={variant === 'fullscreen'}

      />

    </div>

  );

}


