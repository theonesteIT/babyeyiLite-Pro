import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';
const AMBER = '#f59e0b';

export default function AtRiskStudents() {
  const [params, setParams] = useState({});
  const { loading, error, atRiskStudents, filters, selected } = useTeacherMarksAnalytics(params);

  const critical = atRiskStudents.filter((s) => s.risk === 'Critical');
  const high = atRiskStudents.filter((s) => s.risk === 'High');

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>At-Risk Students</h1>
          <p className="text-gray-500 text-sm mt-1">Students below 50% in your classes</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
          <p className="text-[10px] font-bold uppercase text-red-600">Critical</p>
          <p className="text-3xl font-black text-red-700">{critical.length}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4">
          <p className="text-[10px] font-bold uppercase text-orange-600">High</p>
          <p className="text-3xl font-black text-orange-700">{high.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="text-[10px] font-bold uppercase text-amber-700">Total</p>
          <p className="text-3xl font-black" style={{ color: NAVY }}>{atRiskStudents.length}</p>
        </div>
      </div>

      {atRiskStudents.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-white border border-gray-200">
          <AlertTriangle className="mx-auto text-amber-500 mb-3" size={28} />
          <p className="font-semibold" style={{ color: NAVY }}>No at-risk students</p>
          <p className="text-sm text-gray-500 mt-1">All students are at or above the pass threshold.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {atRiskStudents.map((s) => (
            <div key={s.student_id} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold" style={{ color: NAVY }}>{s.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.class} · {s.reason}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-red-600">{s.average}%</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                  s.risk === 'Critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                }`}>{s.risk}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
