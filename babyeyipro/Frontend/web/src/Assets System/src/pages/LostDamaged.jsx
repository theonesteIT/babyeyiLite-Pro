import { AlertTriangle, Search } from 'lucide-react'
import { lostDamaged } from '../data/mockData'

export default function LostDamaged() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Lost & Damaged Assets</h2>
        <p className="text-gray-500 text-sm mt-1">Track and manage problematic assets</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Lost', value: lostDamaged.filter(a => a.type === 'Lost').length, color: 'text-gray-600' },
          { label: 'Stolen', value: lostDamaged.filter(a => a.type === 'Stolen').length, color: 'text-red-600' },
          { label: 'Damaged', value: lostDamaged.filter(a => a.type === 'Damaged').length, color: 'text-amber-600' },
          { label: 'Destroyed', value: lostDamaged.filter(a => a.type === 'Destroyed').length, color: 'text-red-800' },
        ].map((s, i) => (
          <div key={i} className="card text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search incidents..." className="input-field pl-10" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="table-header">Asset</th><th className="table-header">Type</th><th className="table-header">Reported By</th><th className="table-header">Date</th><th className="table-header">Reason</th><th className="table-header">Recovery Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lostDamaged.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-navy">{a.asset}</td>
                  <td className="table-cell">
                    <span className={`badge ${a.type === 'Lost' ? 'bg-gray-100 text-gray-700' : a.type === 'Stolen' ? 'bg-red-100 text-red-700' : a.type === 'Damaged' ? 'bg-amber-100 text-amber-700' : 'bg-red-200 text-red-800'}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="table-cell">{a.reportedBy}</td>
                  <td className="table-cell">{a.date}</td>
                  <td className="table-cell">{a.reason}</td>
                  <td className="table-cell"><span className={`badge ${a.recovery === 'Under Investigation' ? 'bg-amber-100 text-amber-700' : a.recovery === 'Sent for Repair' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{a.recovery}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investigation Form */}
      <div className="card">
        <h3 className="text-lg font-semibold text-navy mb-4">Report Incident</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset *</label>
            <select className="select-field"><option>Select asset</option><option>iPhone 15 Pro</option><option>Canon EOS R5</option></select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
            <select className="select-field"><option>Lost</option><option>Stolen</option><option>Damaged</option><option>Destroyed</option></select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reported By</label>
            <input type="text" className="input-field" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input type="text" className="input-field" placeholder="Describe what happened" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Status</label>
            <select className="select-field"><option>Under Investigation</option><option>Sent for Repair</option><option>Insurance Claim</option><option>Police Report Filed</option></select>
          </div>
        </div>
        <button className="btn-primary mt-4">Submit Report</button>
      </div>
    </div>
  )
}
