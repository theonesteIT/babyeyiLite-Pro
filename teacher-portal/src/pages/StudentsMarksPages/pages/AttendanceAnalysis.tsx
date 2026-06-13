import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Legend, LineChart, Line } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { attendanceVsPerformance } from '../data/mockData';

const weeklyAttendance = [
  { week: 'Week 1', rate: 88 },
  { week: 'Week 2', rate: 85 },
  { week: 'Week 3', rate: 82 },
  { week: 'Week 4', rate: 79 },
  { week: 'Week 5', rate: 76 },
  { week: 'Week 6', rate: 81 },
  { week: 'Week 7', rate: 84 },
  { week: 'Week 8', rate: 87 },
];

const classAttendance = [
  { class: 'Senior 3A', rate: 85 },
  { class: 'Senior 3B', rate: 72 },
  { class: 'Senior 2A', rate: 78 },
  { class: 'Senior 2B', rate: 68 },
  { class: 'Senior 1A', rate: 90 },
  { class: 'Senior 1B', rate: 82 },
];

export default function AttendanceAnalysis() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Attendance Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Compare attendance rates with performance trends</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Overall Attendance</p>
          <p className="text-2xl font-bold text-navy">82%</p>
          <span className="text-xs text-green-600 flex items-center gap-1 mt-1"><TrendingUp size={12} /> +3% this term</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Low Attendance Classes</p>
          <p className="text-2xl font-bold text-red-600">2</p>
          <span className="text-xs text-red-600">Below 75% threshold</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Attendance Impact Score</p>
          <p className="text-2xl font-bold text-purple-600">0.82</p>
          <span className="text-xs text-gray-500">High correlation with performance</span>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Students Below 80%</p>
          <p className="text-2xl font-bold text-amber">4</p>
          <span className="text-xs text-amber">Need monitoring</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-navy mb-4">Weekly Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyAttendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#000435" strokeWidth={2} dot={{ fill: '#000435', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <h3 className="font-semibold text-navy mb-4">Attendance by Class</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classAttendance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="class" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="rate" fill="#ffbf00" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold text-navy mb-4">Attendance vs Performance Correlation</h3>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="attendance" name="Attendance %" tick={{ fontSize: 12 }} />
            <YAxis dataKey="performance" name="Performance %" tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="Students" data={attendanceVsPerformance} fill="#ffbf00" />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber" />
            <p className="text-sm text-gray-700">
              <strong>Insight:</strong> Students with attendance below 60% show an average performance of 38%, 
              while those with 90%+ attendance average 82%. This indicates a <strong>strong correlation</strong> 
              between attendance and academic performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
