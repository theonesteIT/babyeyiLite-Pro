import { useState } from 'react';
import { FileText, Download, Printer, FileSpreadsheet, Eye, FileBarChart, ScrollText, PieChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { classPerformance, subjectScores, monthlyProgress } from '../data/mockData';

const reports = [
  { id: 'R001', name: 'Class Report - Senior 3A', type: 'Class', date: '2026-03-15', pages: 12 },
  { id: 'R002', name: 'Subject Analysis - Mathematics', type: 'Subject', date: '2026-03-14', pages: 8 },
  { id: 'R003', name: 'Student Rankings - Term 2', type: 'Rankings', date: '2026-03-13', pages: 5 },
  { id: 'R004', name: 'Pass Rate Analysis', type: 'Analysis', date: '2026-03-12', pages: 6 },
  { id: 'R005', name: 'Student Report - Jean Baptiste', type: 'Student', date: '2026-03-11', pages: 3 },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'class' | 'subject' | 'student'>('class');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Academic Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Generate and export comprehensive reports</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
            <Download size={16} /> Export All
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(['class', 'subject', 'student'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab ? 'text-navy border-navy' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab === 'class' ? <FileBarChart size={16} /> : tab === 'subject' ? <ScrollText size={16} /> : <PieChart size={16} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Reports
            </button>
          ))}
        </div>

        {activeTab === 'class' && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {Object.entries(classPerformance).map(([cls, data]) => (
                <div key={cls} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-navy">{cls}</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>Average: <strong>{data.average}%</strong></p>
                    <p>Pass Rate: <strong>{data.passRate}%</strong></p>
                    <p>Students: <strong>{data.totalStudents}</strong></p>
                  </div>
                  <button className="mt-3 flex items-center gap-1 text-xs text-amber hover:text-amber-600 transition-colors">
                    <Download size={12} /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subject' && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {subjectScores['Senior 3A'].map(subj => (
                <div key={subj.subject} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold text-navy">{subj.subject}</p>
                  <p className="text-2xl font-bold mt-1">{subj.score}%</p>
                  <button className="mt-2 flex items-center gap-1 text-xs text-amber hover:text-amber-600 transition-colors">
                    <Download size={12} /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'student' && (
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Report Name</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Pages</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-sm font-medium text-navy">{r.name}</td>
                      <td className="px-4 py-3"><span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{r.type}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{r.date}</td>
                      <td className="px-4 py-3 text-sm text-center">{r.pages}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Eye size={14} className="text-gray-400" /></button>
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Download size={14} className="text-gray-400" /></button>
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg"><Printer size={14} className="text-gray-400" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h3 className="font-semibold text-navy mb-4">Performance Overview</h3>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-amber/50 transition-colors text-sm font-medium text-gray-700 hover:text-amber">
          <FileSpreadsheet size={18} className="text-green-500" /> Export as Excel
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-amber/50 transition-colors text-sm font-medium text-gray-700 hover:text-amber">
          <FileText size={18} className="text-red-500" /> Export as PDF
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-amber/50 transition-colors text-sm font-medium text-gray-700 hover:text-amber">
          <Printer size={18} className="text-navy" /> Print
        </button>
      </div>
    </div>
  );
}
