import { Trash2, Search, CheckCircle2, Clock, UserCheck, FileText, DollarSign, ChevronRight } from 'lucide-react'
import { disposals } from '../data/mockData'

export default function Disposal() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Disposal Management</h2>
        <p className="text-gray-500 text-sm mt-1">Manage asset disposal with approval workflow</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Sale', value: disposals.filter(d => d.type === 'Sale').length, color: 'text-emerald-600' },
          { label: 'Donation', value: disposals.filter(d => d.type === 'Donation').length, color: 'text-blue-600' },
          { label: 'Scrap', value: disposals.filter(d => d.type === 'Scrap').length, color: 'text-amber-600' },
          { label: 'Write Off', value: disposals.filter(d => d.type === 'Write Off').length, color: 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="card text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Approval Workflow */}
      <div className="card">
        <h3 className="text-lg font-semibold text-navy mb-4">Approval Workflow</h3>
        <div className="flex flex-wrap items-center gap-4 justify-between">
          {[
            { icon: FileText, label: 'Request', desc: 'Disposal request submitted' },
            { icon: UserCheck, label: 'Manager', desc: 'Manager approval' },
            { icon: DollarSign, label: 'Finance', desc: 'Financial review' },
            { icon: CheckCircle2, label: 'Approved', desc: 'Final approval' },
          ].map((step, i) => {
            const Icon = step.icon
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Icon size={22} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-sm text-navy">{step.label}</p>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                </div>
                {i < 3 && <ChevronRight size={20} className="text-gray-300 hidden sm:block" />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search disposals..." className="input-field pl-10" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="table-header">Asset</th><th className="table-header">Type</th><th className="table-header">Reason</th><th className="table-header">Value</th><th className="table-header">Date</th><th className="table-header">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {disposals.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-navy">{d.asset}</td>
                  <td className="table-cell"><span className={`badge ${d.type === 'Sale' ? 'bg-emerald-100 text-emerald-700' : d.type === 'Donation' ? 'bg-blue-100 text-blue-700' : d.type === 'Scrap' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{d.type}</span></td>
                  <td className="table-cell">{d.reason}</td>
                  <td className="table-cell">{d.value === 0 ? 'N/A' : `$${d.value}`}</td>
                  <td className="table-cell">{d.date}</td>
                  <td className="table-cell"><span className={`badge ${d.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : d.status === 'Pending Manager' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


