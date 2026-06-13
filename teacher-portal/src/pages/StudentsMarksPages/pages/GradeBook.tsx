import { Search, Download } from 'lucide-react';

const gradeData = [
  { student: 'Jean Baptiste', class: 'Senior 3A', math: 85, eng: 78, kin: 92, phy: 72, chem: 80, bio: 76, hist: 88, geo: 82, fre: 65, avg: 79.8, grade: 'B' },
  { student: 'Eric Hakizimana', class: 'Senior 3A', math: 45, eng: 52, kin: 60, phy: 38, chem: 42, bio: 48, hist: 55, geo: 50, fre: 35, avg: 47.2, grade: 'F' },
  { student: 'Alice Uwimana', class: 'Senior 3A', math: 72, eng: 68, kin: 85, phy: 70, chem: 75, bio: 72, hist: 78, geo: 76, fre: 60, avg: 72.9, grade: 'B' },
  { student: 'Grace Mugabo', class: 'Senior 3A', math: 95, eng: 88, kin: 90, phy: 85, chem: 92, bio: 88, hist: 90, geo: 86, fre: 78, avg: 88.0, grade: 'A' },
  { student: 'Patrick Habimana', class: 'Senior 3A', math: 62, eng: 65, kin: 72, phy: 58, chem: 60, bio: 64, hist: 68, geo: 66, fre: 55, avg: 63.3, grade: 'C' },
];

const subjects = ['Math', 'Eng', 'Kin', 'Phy', 'Chem', 'Bio', 'Hist', 'Geo', 'Fre'];

export default function GradeBook() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Grade Book</h1>
          <p className="text-gray-500 text-sm mt-1">Comprehensive grade overview for all students</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
          <Download size={16} /> Export
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search students..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>All Classes</option>
            <option>Senior 3A</option>
            <option>Senior 3B</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>Term 2</option>
            <option>Term 1</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-3 font-medium text-gray-600 sticky left-0 bg-gray-50">Student</th>
                <th className="text-left px-3 py-3 font-medium text-gray-600">Class</th>
                {subjects.map(s => <th key={s} className="text-center px-2 py-3 font-medium text-gray-600">{s}</th>)}
                <th className="text-center px-3 py-3 font-medium text-gray-600 bg-gray-50">Avg</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600 bg-gray-50">Grade</th>
              </tr>
            </thead>
            <tbody>
              {gradeData.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-3 font-medium text-navy sticky left-0 bg-white">{row.student}</td>
                  <td className="px-3 py-3 text-gray-500">{row.class}</td>
                  {subjects.map(s => {
                    const key = s.toLowerCase() as keyof typeof row;
                    const val = row[key] as number;
                    return (
                      <td key={s} className={`text-center px-2 py-3 font-medium ${
                        val >= 80 ? 'text-green-600' : val >= 60 ? 'text-blue-600' : val >= 50 ? 'text-amber' : 'text-red-600'
                      }`}>{val}</td>
                    );
                  })}
                  <td className="text-center px-3 py-3 font-bold text-navy bg-gray-50">{row.avg}</td>
                  <td className="text-center px-3 py-3 bg-gray-50">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      row.grade === 'A' ? 'bg-green-50 text-green-600' :
                      row.grade === 'B' ? 'bg-blue-50 text-blue-600' :
                      row.grade === 'C' ? 'bg-amber/10 text-amber' :
                      'bg-red-50 text-red-600'
                    }`}>{row.grade}</span>
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
