import { Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const gapData = [
  { subject: 'Algebra', mastery: 45, gap: 55, students: 15 },
  { subject: 'Geometry', mastery: 62, gap: 38, students: 10 },
  { subject: 'Trigonometry', mastery: 38, gap: 62, students: 18 },
  { subject: 'Statistics', mastery: 70, gap: 30, students: 8 },
  { subject: 'Calculus', mastery: 35, gap: 65, students: 20 },
];

export default function LearningGaps() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Learning Gaps</h1>
        <p className="text-gray-500 text-sm mt-1">Knowledge gap analysis by subject and class</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Average Gap Score</p>
          <p className="text-2xl font-bold text-red-600">50%</p>
          <span className="text-xs text-red-500">Moderate learning gaps detected</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Critical Gaps (70%+)</p>
          <p className="text-2xl font-bold text-amber">2</p>
          <span className="text-xs text-amber">Algebra, Calculus</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Affected Students</p>
          <p className="text-2xl font-bold text-navy">25</p>
          <span className="text-xs text-gray-500">Need remediation</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-navy mb-4">Knowledge Gaps by Topic</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gapData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="subject" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="gap" fill="#ef4444" radius={[0, 6, 6, 0]} name="Gap %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-navy mb-4">Mastery vs Gap Analysis</h3>
          <div className="space-y-4">
            {gapData.map(topic => (
              <div key={topic.subject}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{topic.subject}</span>
                  <span className="font-medium text-navy">Mastery: {topic.mastery}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="bg-navy h-full rounded-l-full" style={{ width: `${topic.mastery}%` }} />
                  <div className="bg-red-400 h-full rounded-r-full" style={{ width: `${topic.gap}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{topic.students} students struggling</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-amber" />
          <h3 className="font-semibold text-navy">Recommended Remediation</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="font-semibold text-red-700 text-sm">Calculus</p>
            <p className="text-xs text-red-600 mt-1">20 students need foundation review</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="font-semibold text-orange-700 text-sm">Algebra</p>
            <p className="text-xs text-orange-600 mt-1">15 students need practice exercises</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="font-semibold text-yellow-700 text-sm">Trigonometry</p>
            <p className="text-xs text-yellow-600 mt-1">18 students need visual learning aids</p>
          </div>
        </div>
      </div>
    </div>
  );
}
