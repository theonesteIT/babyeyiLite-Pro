import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Users, Loader2 } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';
const AMBER = '#f59e0b';

export default function ClassPerformance() {
  const [params, setParams] = useState({});
  const { loading, error, classPerformance, filters, selected } = useTeacherMarksAnalytics(params);

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Class Performance</h1>
          <p className="text-gray-500 text-sm mt-1">Compare classes you teach</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      {classPerformance.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No class performance data yet</p>
      ) : (
        <>
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={classPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="average" radius={[6, 6, 0, 0]}>
                  {classPerformance.map((_, i) => <Cell key={i} fill={i === 0 ? AMBER : NAVY} opacity={1 - i * 0.08} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {classPerformance.map((c) => (
            <div key={c.name} className="bg-white rounded-xl p-5 border border-gray-200 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: NAVY }}>
                <Users size={18} /> {c.name}
                <span className="text-xs font-normal text-gray-400">#{c.rank}</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] text-gray-500 uppercase">Average</p><p className="text-xl font-bold" style={{ color: NAVY }}>{c.average ?? '—'}%</p></div>
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] text-gray-500 uppercase">Pass rate</p><p className="text-xl font-bold text-amber-600">{c.passRate ?? '—'}%</p></div>
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] text-gray-500 uppercase">Students</p><p className="text-xl font-bold" style={{ color: NAVY }}>{c.student_count}</p></div>
                <div className="rounded-xl bg-gray-50 p-3"><p className="text-[10px] text-gray-500 uppercase">Subjects</p><p className="text-xl font-bold" style={{ color: NAVY }}>{c.subject_count}</p></div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
