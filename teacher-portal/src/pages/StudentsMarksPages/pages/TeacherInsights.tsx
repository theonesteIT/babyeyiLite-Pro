import { TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { monthlyProgress } from '../data/mockData';

const insights = [
  { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50', title: 'Mathematics performance increased by 12%', desc: 'Compared to last term. Keep up the good work!' },
  { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', title: '15 students are struggling with Algebra', desc: 'Consider remedial sessions and extra practice materials.' },
  { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Attendance has improved by 8%', desc: 'Positive trend across all classes this term.' },
  { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50', title: 'Pass rate increased from 72% to 81%', desc: 'Significant improvement in overall performance.' },
];

const recommendations = [
  { title: 'Conduct Algebra revision', priority: 'High', students: 15, impact: 'Medium' },
  { title: 'Provide support to 5 students below 40%', priority: 'High', students: 5, impact: 'High' },
  { title: 'Arrange parent meeting for high-risk students', priority: 'Medium', students: 3, impact: 'High' },
  { title: 'Implement peer tutoring program', priority: 'Medium', students: 10, impact: 'Medium' },
  { title: 'Review French curriculum for Senior 3', priority: 'Low', students: 20, impact: 'Low' },
];

const predictedData = monthlyProgress.map(m => ({ ...m, predicted: m.average + 5 }));

export default function TeacherInsights() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">AI Insights</h1>
        <p className="text-gray-500 text-sm mt-1">Automatically generated insights and recommendations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item, i) => (
          <div key={i} className={`${item.bg} rounded-xl p-5 border border-transparent`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <item.icon size={20} className={item.color} />
              </div>
              <div>
                <h3 className="font-semibold text-navy text-sm">{item.title}</h3>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold text-navy mb-4">Performance Trend with Prediction</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={predictedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="average" stroke="#ffbf00" strokeWidth={2} name="Actual" dot={{ fill: '#ffbf00', r: 4 }} />
            <Line type="monotone" dataKey="predicted" stroke="#000435" strokeWidth={2} strokeDasharray="5 5" name="Predicted" dot={{ fill: '#000435', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Target size={18} className="text-amber" />
          <h3 className="font-semibold text-navy">AI Recommendations</h3>
        </div>
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${rec.priority === 'High' ? 'bg-red-500' : rec.priority === 'Medium' ? 'bg-amber' : 'bg-green-500'}`} />
                <div>
                  <p className="text-sm font-medium text-navy">{rec.title}</p>
                  <p className="text-xs text-gray-400">Affects {rec.students} students · Impact: {rec.impact}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                rec.priority === 'High' ? 'bg-red-50 text-red-600' :
                rec.priority === 'Medium' ? 'bg-amber/10 text-amber' :
                'bg-green-50 text-green-600'
              }`}>
                {rec.priority}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
