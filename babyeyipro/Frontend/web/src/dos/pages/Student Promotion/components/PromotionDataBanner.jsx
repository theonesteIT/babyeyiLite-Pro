import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useStudentPromotionData } from '../context/StudentPromotionDataContext';

export default function PromotionDataBanner() {
  const { loading, error, refresh, schoolName, students } = useStudentPromotionData();

  if (loading) {
    return (
      <div className="mx-4 md:mx-6 mt-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
        <Loader2 size={18} className="animate-spin flex-shrink-0" />
        Loading classes and students from {schoolName || 'your school'}…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-4 md:mx-6 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
        <AlertCircle size={18} className="flex-shrink-0" />
        <span className="flex-1">{error}</span>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold border border-red-200 hover:bg-red-100"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!students.length) {
    return (
      <div className="mx-4 md:mx-6 mt-3 rounded-xl border border-black/5 bg-white px-4 py-3 text-[13px] font-medium text-re-text-muted">
        No students found for this school. Add learners in Student Records first.
      </div>
    );
  }

  return null;
}
