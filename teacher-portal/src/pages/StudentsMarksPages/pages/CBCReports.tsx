import { Download, Printer, Award } from 'lucide-react';

const cbcReports = [
  { id: 'C001', student: 'Jean Baptiste', class: 'Senior 3A', term: 'Term 2', competencies: 7, average: 'Very Good', date: '2026-03-15' },
  { id: 'C002', student: 'Eric Hakizimana', class: 'Senior 3A', term: 'Term 2', competencies: 7, average: 'Needs Improvement', date: '2026-03-15' },
  { id: 'C003', student: 'Alice Uwimana', class: 'Senior 3A', term: 'Term 2', competencies: 7, average: 'Good', date: '2026-03-15' },
  { id: 'C004', student: 'Grace Mugabo', class: 'Senior 3A', term: 'Term 2', competencies: 7, average: 'Excellent', date: '2026-03-15' },
];

const ratingColors: Record<string, string> = {
  'Excellent': 'bg-green-50 text-green-600',
  'Very Good': 'bg-blue-50 text-blue-600',
  'Good': 'bg-amber/10 text-amber',
  'Needs Improvement': 'bg-red-50 text-red-600',
};

export default function CBCReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">CBC Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Competency-Based Curriculum assessment reports</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
            <Download size={16} /> Export All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Student</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Class</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Term</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Competencies</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Average Rating</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cbcReports.map(r => (
                <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-navy">{r.student}</td>
                  <td className="px-4 py-3 text-sm">{r.class}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{r.term}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Award size={14} className="text-amber" /> {r.competencies}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ratingColors[r.average]}`}>{r.average}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-500">{r.date}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Download size={14} className="text-gray-400" /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Printer size={14} className="text-gray-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
