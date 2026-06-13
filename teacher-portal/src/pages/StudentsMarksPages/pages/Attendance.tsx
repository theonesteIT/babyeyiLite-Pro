import { useState } from 'react';
import { CheckCircle, Save } from 'lucide-react';

const students = [
  { id: 'S001', name: 'Jean Baptiste', class: 'Senior 3A' },
  { id: 'S002', name: 'Eric Hakizimana', class: 'Senior 3A' },
  { id: 'S003', name: 'Alice Uwimana', class: 'Senior 3A' },
  { id: 'S004', name: 'David Niyonzima', class: 'Senior 3A' },
  { id: 'S005', name: 'Grace Mugabo', class: 'Senior 3A' },
  { id: 'S006', name: 'Patrick Habimana', class: 'Senior 3A' },
];

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export default function Attendance() {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getStatusColor = (status?: AttendanceStatus) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-300';
      case 'absent': return 'bg-red-100 text-red-700 border-red-300';
      case 'late': return 'bg-amber/10 text-amber border-amber/30';
      case 'excused': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-400 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Take Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Record daily student attendance</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm bg-green-50 px-3 py-1.5 rounded-lg">
              <CheckCircle size={16} /> Attendance saved
            </span>
          )}
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
            <Save size={16} /> Save Attendance
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>Senior 3A</option>
            <option>Senior 3B</option>
            <option>Senior 2A</option>
          </select>
          <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>Morning Session</option>
            <option>Afternoon Session</option>
          </select>
          <div className="flex gap-2 items-center text-sm text-gray-500">
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Present</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Absent</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber" /> Late</div>
            <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Excused</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">#</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Student Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Class</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Current Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-navy">{student.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{student.class}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(status => (
                      <button
                        key={status}
                        onClick={() => setStatus(student.id, status)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                          attendance[student.id] === status
                            ? getStatusColor(status)
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'late' ? 'L' : 'E'}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {attendance[student.id] ? (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getStatusColor(attendance[student.id])}`}>
                      {attendance[student.id].charAt(0).toUpperCase() + attendance[student.id].slice(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">Not marked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-2xl font-bold text-green-600">{Object.values(attendance).filter(s => s === 'present').length}</p>
          <p className="text-sm text-green-700">Present</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
          <p className="text-2xl font-bold text-red-600">{Object.values(attendance).filter(s => s === 'absent').length}</p>
          <p className="text-sm text-red-700">Absent</p>
        </div>
        <div className="bg-amber/10 rounded-xl p-4 border border-amber/30">
          <p className="text-2xl font-bold text-amber">{Object.values(attendance).filter(s => s === 'late').length}</p>
          <p className="text-sm text-amber">Late</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{Object.values(attendance).filter(s => s === 'excused').length}</p>
          <p className="text-sm text-blue-700">Excused</p>
        </div>
      </div>
    </div>
  );
}
