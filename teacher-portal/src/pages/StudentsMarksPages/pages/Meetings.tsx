import { Calendar, User, CheckCircle, XCircle, Video, Phone } from 'lucide-react';

const meetings = [
  { id: 'M001', parent: 'Marie Hakizimana', student: 'Eric Hakizimana', date: '2026-03-20', time: '10:00 AM', type: 'In-person', status: 'scheduled' },
  { id: 'M002', parent: 'Jean Niyonzima', student: 'David Niyonzima', date: '2026-03-22', time: '2:00 PM', type: 'Video Call', status: 'scheduled' },
  { id: 'M003', parent: 'Esther Mugabo', student: 'Grace Mugabo', date: '2026-03-15', time: '11:30 AM', type: 'Phone', status: 'completed' },
  { id: 'M004', parent: 'Patrick Ishimwe', student: 'Diane Ishimwe', date: '2026-03-10', time: '9:00 AM', type: 'In-person', status: 'completed' },
];

export default function Meetings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Meetings</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule and manage parent-teacher meetings</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
          <Calendar size={16} /> Schedule Meeting
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Parent</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Student</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Time</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Type</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map(m => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm font-medium text-navy">{m.parent}</td>
                  <td className="px-4 py-3 text-sm">{m.student}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.time}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="flex items-center gap-1">
                      {m.type === 'Video Call' ? <Video size={14} className="text-blue-500" /> :
                       m.type === 'Phone' ? <Phone size={14} className="text-green-500" /> :
                       <User size={14} className="text-gray-500" />}
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      m.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {m.status === 'scheduled' ? (
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1.5 hover:bg-green-50 rounded-lg"><CheckCircle size={14} className="text-green-500" /></button>
                        <button className="p-1.5 hover:bg-red-50 rounded-lg"><XCircle size={14} className="text-red-500" /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
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
