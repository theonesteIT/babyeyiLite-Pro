import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const predictionData = [
  { month: 'Jan', actual: 65, predicted: null },
  { month: 'Feb', actual: 68, predicted: null },
  { month: 'Mar', actual: 72, predicted: null },
  { month: 'Apr', actual: 70, predicted: 73 },
  { month: 'May', actual: 74, predicted: 76 },
  { month: 'Jun', actual: 78, predicted: 80 },
  { month: 'Jul', actual: null, predicted: 82 },
  { month: 'Aug', actual: null, predicted: 85 },
];

const dropoutPredictions = [
  { name: 'Eric Hakizimana', risk: 78, class: 'Senior 3A', factors: ['Low attendance', 'Declining grades'] },
  { name: 'David Niyonzima', risk: 85, class: 'Senior 3A', factors: ['Chronic absenteeism', 'Below 40%'] },
  { name: 'Samuel Nkundiye', risk: 92, class: 'Senior 3B', factors: ['Very low attendance', 'Multiple failures'] },
  { name: 'Angelique Uwase', risk: 45, class: 'Senior 3B', factors: ['Borderline performance'] },
];

export default function AIPredictions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">AI Predictions</h1>
        <p className="text-gray-500 text-sm mt-1">Predictive analytics for student performance and risk</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-navy to-navy-700 rounded-xl p-4 text-white">
          <p className="text-xs text-white/60">Predicted Pass Rate</p>
          <p className="text-2xl font-bold">82%</p>
          <span className="text-xs text-green-400">+4% from current</span>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-4 text-white">
          <p className="text-xs text-white/60">Dropout Risk Students</p>
          <p className="text-2xl font-bold">4</p>
          <span className="text-xs text-amber">Need intervention</span>
        </div>
        <div className="bg-gradient-to-br from-amber to-amber-600 rounded-xl p-4 text-navy">
          <p className="text-xs text-navy/60">Expected Improvement</p>
          <p className="text-2xl font-bold">+6%</p>
          <span className="text-xs text-navy/70">Next term projection</span>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-4 text-white">
          <p className="text-xs text-white/60">Exam Success Rate</p>
          <p className="text-2xl font-bold">78%</p>
          <span className="text-xs text-green-200">Predicted</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold text-navy mb-4">Performance Prediction</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={predictionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="actual" stroke="#ffbf00" fill="#ffbf00" fillOpacity={0.2} name="Actual" strokeWidth={2} />
            <Area type="monotone" dataKey="predicted" stroke="#000435" fill="#000435" fillOpacity={0.1} name="Predicted" strokeWidth={2} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold text-navy mb-4">Dropout Risk Prediction</h3>
        <div className="space-y-3">
          {dropoutPredictions.map(s => (
            <div key={s.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-navy text-sm">{s.name}</p>
                <p className="text-xs text-gray-500">{s.class}</p>
                <div className="flex gap-1 mt-1">
                  {s.factors.map(f => (
                    <span key={f} className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full">{f}</span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.risk > 70 ? 'bg-red-500' : s.risk > 50 ? 'bg-amber' : 'bg-green-500'}`} style={{ width: `${s.risk}%` }} />
                  </div>
                  <span className={`text-sm font-bold ${s.risk > 70 ? 'text-red-600' : s.risk > 50 ? 'text-amber' : 'text-green-600'}`}>{s.risk}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
