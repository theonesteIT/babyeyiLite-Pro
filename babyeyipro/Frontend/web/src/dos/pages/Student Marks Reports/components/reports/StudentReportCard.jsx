import ModernStudentReportCard from './ModernStudentReportCard';



export default function StudentReportCard({ report, school, onClose }) {

  if (!report) return null;



  return (

    <div className="space-y-3 max-h-[80vh] overflow-y-auto">

      {onClose && (

        <div className="flex justify-end">

          <button type="button" onClick={onClose} className="text-xs text-slate-400 hover:text-slate-700">Close</button>

        </div>

      )}

      <ModernStudentReportCard report={report} school={school} />

    </div>

  );

}


