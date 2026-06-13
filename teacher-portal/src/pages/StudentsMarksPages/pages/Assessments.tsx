import { useState } from 'react';
import { Plus, Search, Users, Clock, Edit2, Trash2 } from 'lucide-react';
import { assessments } from '../data/mockData';

export default function Assessments() {
  const [showCreate, setShowCreate] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    name: '', type: 'CAT', class: 'Senior 3A', subject: 'Mathematics', date: '', maxMarks: 20, weight: 10,
  });

  const handleCreate = () => {
    setShowCreate(false);
    setNewAssessment({ name: '', type: 'CAT', class: 'Senior 3A', subject: 'Mathematics', date: '', maxMarks: 20, weight: 10 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Assessments</h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage assessments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
          <Plus size={16} /> Create Assessment
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-navy mb-4">New Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Assessment Name</label>
              <input value={newAssessment.name} onChange={e => setNewAssessment(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Mathematics CAT 1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Type</label>
              <select value={newAssessment.type} onChange={e => setNewAssessment(p => ({ ...p, type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
                {['CAT', 'Quiz', 'Homework', 'Project', 'Practical', 'Mid-Term Exam', 'End-Term Exam'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Class</label>
              <select value={newAssessment.class} onChange={e => setNewAssessment(p => ({ ...p, class: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
                {['Senior 3A', 'Senior 3B', 'Senior 2A'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
              <select value={newAssessment.subject} onChange={e => setNewAssessment(p => ({ ...p, subject: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
                {['Mathematics', 'English', 'Kinyarwanda', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'French'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={newAssessment.date} onChange={e => setNewAssessment(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Maximum Marks</label>
              <input type="number" value={newAssessment.maxMarks} onChange={e => setNewAssessment(p => ({ ...p, maxMarks: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Weight (%)</label>
              <input type="number" value={newAssessment.weight} onChange={e => setNewAssessment(p => ({ ...p, weight: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleCreate} className="px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">Create</button>
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search assessments..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>All Classes</option>
            <option>Senior 3A</option>
            <option>Senior 3B</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Class</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Subject</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Max</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Weight</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Completed</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Missing</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Avg Score</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.map(a => (
                <tr key={a.id} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-navy">{a.name}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{a.type}</span></td>
                  <td className="px-4 py-3 text-sm">{a.class}</td>
                  <td className="px-4 py-3 text-sm">{a.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{a.date}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium">{a.maxMarks}</td>
                  <td className="px-4 py-3 text-sm text-center">{a.weight}%</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users size={14} className="text-green-500" />
                      <span>{a.completed}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={14} className="text-red-500" />
                      <span className="text-red-500">{a.missing}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-semibold">{a.averageScore}%</td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Edit2 size={14} className="text-gray-400" /></button>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Trash2 size={14} className="text-gray-400" /></button>
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
