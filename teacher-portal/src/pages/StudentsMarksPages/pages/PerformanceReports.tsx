import { Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RPieChart, Pie, Cell } from 'recharts';
import { monthlyProgress, gradeDistribution, passRateTrend } from '../data/mockData';

const COLORS = ['#ffbf00', '#000435', '#22c55e', '#ef4444', '#8b5cf6'];

export default function PerformanceReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Performance Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Comprehensive performance analysis reports</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
          <Download size={16} /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-navy mb-4">Pass Rate Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={passRateTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="term" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="rate" fill="#000435" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-navy mb-4">Grade Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RPieChart>
              <Pie data={Object.entries(gradeDistribution).map(([k, v]) => ({ name: k, value: v }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {Object.entries(gradeDistribution).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </RPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold text-navy mb-4">Monthly Performance Progress</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyProgress}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="average" stroke="#ffbf00" strokeWidth={2} dot={{ fill: '#ffbf00', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
