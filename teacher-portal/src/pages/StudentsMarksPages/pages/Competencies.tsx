import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const competencyLevels = ['Excellent', 'Very Good', 'Good', 'Needs Improvement'] as const;
const competencyNames = ['Critical Thinking', 'Communication', 'Creativity', 'Collaboration', 'Problem Solving', 'Research Skills', 'Leadership'];

const students = [
  { id: 'S001', name: 'Jean Baptiste', class: 'Senior 3A' },
  { id: 'S002', name: 'Eric Hakizimana', class: 'Senior 3A' },
  { id: 'S003', name: 'Alice Uwimana', class: 'Senior 3A' },
];

const initialRatings: Record<string, Record<string, typeof competencyLevels[number]>> = {};
students.forEach(s => {
  initialRatings[s.id] = {};
  competencyNames.forEach(c => {
    initialRatings[s.id][c] = 'Good' as typeof competencyLevels[number];
  });
});

const trendData = [
  { term: 'Term 1', criticalThinking: 60, communication: 65, creativity: 55 },
  { term: 'Term 2', criticalThinking: 68, communication: 72, creativity: 62 },
  { term: 'Term 3', criticalThinking: 78, communication: 80, creativity: 75 },
];

export default function Competencies() {
  const [ratings, setRatings] = useState(initialRatings);

  const setRating = (studentId: string, competency: string, value: typeof competencyLevels[number]) => {
    setRatings(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [competency]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">CBC Competency-Based Assessment</h1>
        <p className="text-gray-500 text-sm mt-1">Track and assess student competencies per Rwanda CBC framework</p>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold text-navy mb-4">Competency Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="term" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="criticalThinking" stroke="#ffbf00" strokeWidth={2} name="Critical Thinking" />
            <Line type="monotone" dataKey="communication" stroke="#000435" strokeWidth={2} name="Communication" />
            <Line type="monotone" dataKey="creativity" stroke="#22c55e" strokeWidth={2} name="Creativity" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 min-w-[150px]">Student</th>
                {competencyNames.map(c => (
                  <th key={c} className="text-center px-2 py-3 text-xs font-medium text-gray-600 min-w-[100px]">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy">{student.name}</p>
                        <p className="text-xs text-gray-400">{student.class}</p>
                      </div>
                    </div>
                  </td>
                  {competencyNames.map(comp => (
                    <td key={comp} className="px-2 py-3 text-center">
                      <select
                        value={ratings[student.id][comp]}
                        onChange={e => setRating(student.id, comp, e.target.value as typeof competencyLevels[number])}
                        className={`text-xs px-1.5 py-1 rounded border outline-none ${
                          ratings[student.id][comp] === 'Excellent' ? 'bg-green-50 border-green-300 text-green-700' :
                          ratings[student.id][comp] === 'Very Good' ? 'bg-blue-50 border-blue-300 text-blue-700' :
                          ratings[student.id][comp] === 'Good' ? 'bg-amber/10 border-amber/30 text-amber' :
                          'bg-red-50 border-red-300 text-red-700'
                        }`}
                      >
                        {competencyLevels.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {competencyLevels.map(level => (
          <div key={level} className={`rounded-xl p-4 border ${
            level === 'Excellent' ? 'bg-green-50 border-green-200' :
            level === 'Very Good' ? 'bg-blue-50 border-blue-200' :
            level === 'Good' ? 'bg-amber/10 border-amber/30' :
            'bg-red-50 border-red-200'
          }`}>
            <p className="text-sm font-semibold">{level}</p>
            <p className="text-xs text-gray-500 mt-1">
              {level === 'Excellent' ? 'Outstanding performance' :
               level === 'Very Good' ? 'Above expectations' :
               level === 'Good' ? 'Meeting expectations' :
               'Requires improvement'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
