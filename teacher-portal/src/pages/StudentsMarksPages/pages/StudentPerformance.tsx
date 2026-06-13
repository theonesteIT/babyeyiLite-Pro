import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useTeacherMarksAnalytics } from '../../../hooks/useTeacherMarksAnalytics';
import MarksAnalyticsFilters from '../components/MarksAnalyticsFilters';

const NAVY = '#000435';

export default function StudentPerformance() {
  const [params, setParams] = useState({});
  const [q, setQ] = useState('');
  const { loading, error, students, filters, selected } = useTeacherMarksAnalytics(params);

  const filtered = students.filter((s) => {
    const hay = `${s.name} ${s.student_uid || ''} ${s.class_name}`.toLowerCase();
    return !q || hay.includes(q.toLowerCase());
  });

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
  if (error) return <div className="rounded-xl bg-red-50 border border-red-100 text-red-800 p-4 text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: NAVY }}>Student Performance</h1>
          <p className="text-gray-500 text-sm mt-1">Ranked by average across your subjects</p>
        </div>
        <MarksAnalyticsFilters filters={filters} selected={selected} onChange={setParams} />
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search students..."
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-400/40 outline-none"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-400">
              <th className="text-left py-3 px-4">Rank</th>
              <th className="text-left py-3 px-4">Student</th>
              <th className="text-left py-3 px-4">Class</th>
              <th className="text-left py-3 px-4">Average</th>
              <th className="text-left py-3 px-4">Grade</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.student_id} className="border-b border-gray-50 hover:bg-amber-50/30">
                <td className="py-3 px-4 text-gray-400 font-semibold">#{s.rank ?? '—'}</td>
                <td className="py-3 px-4 font-semibold" style={{ color: NAVY }}>{s.name}</td>
                <td className="py-3 px-4 text-gray-500">{s.class_name}</td>
                <td className="py-3 px-4 font-bold">{s.average_percent != null ? `${s.average_percent}%` : '—'}</td>
                <td className="py-3 px-4"><span className="px-2 py-0.5 rounded-lg bg-[#000435]/5 text-xs font-bold">{s.grade || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="text-center text-gray-400 py-10 text-sm">No students found</p>}
      </div>
    </div>
  );
}
