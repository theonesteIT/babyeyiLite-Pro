import { useState } from 'react'
import { ShieldCheck, Clock, Bell, Mail, Smartphone } from 'lucide-react'

const schedules = [
  { id: 1, asset: 'Server Rack Pro', type: 'Weekly', task: 'Cooling system check', nextDate: '2026-06-10', status: 'Active' },
  { id: 2, asset: 'Toyota Camry 2023', type: 'Monthly', task: 'Oil change & tire rotation', nextDate: '2026-06-15', status: 'Active' },
  { id: 3, asset: 'Dell Latitude 5420', type: 'Quarterly', task: 'Software update & cleanup', nextDate: '2026-07-01', status: 'Active' },
  { id: 4, asset: 'Building A HVAC', type: 'Yearly', task: 'Full system inspection', nextDate: '2026-09-01', status: 'Scheduled' },
  { id: 5, asset: 'Fire Extinguishers', type: 'Monthly', task: 'Pressure check', nextDate: '2026-06-12', status: 'Active' },
]

export default function PreventiveMaintenance() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Preventive Maintenance</h2>
        <p className="text-gray-500 text-sm mt-1">Schedule and automate routine maintenance tasks</p>
      </div>

      {/* Schedule Types */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((type) => (
          <div key={type} className="card text-center cursor-pointer hover:border-amber-500 border-2 border-transparent transition-all">
            <Clock size={24} className="mx-auto text-amber-500 mb-2" />
            <p className="font-semibold text-navy">{type}</p>
            <p className="text-xs text-gray-500 mt-1">{schedules.filter(s => s.type === type).length} tasks</p>
          </div>
        ))}
      </div>

      {/* Alert Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold text-navy mb-4">Automatic Alerts</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { icon: Mail, label: 'Email', desc: 'Send email notifications' },
            { icon: Smartphone, label: 'SMS', desc: 'Send text messages' },
            { icon: Bell, label: 'Push', desc: 'In-app notifications' },
          ].map((alert) => {
            const Icon = alert.icon
            return (
              <label key={alert.label} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-amber-500 transition-colors">
                <Icon size={20} className="text-amber-500" />
                <div>
                  <p className="font-medium text-sm text-navy">{alert.label}</p>
                  <p className="text-xs text-gray-500">{alert.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="ml-4 rounded text-amber-500 focus:ring-amber-500" />
              </label>
            )
          })}
        </div>
      </div>

      {/* Schedule Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-navy">Maintenance Schedules</h3>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-1.5 px-3">+ Add Schedule</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="table-header">Asset</th><th className="table-header">Type</th><th className="table-header">Task</th><th className="table-header">Next Date</th><th className="table-header">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-navy">{s.asset}</td>
                  <td className="table-cell"><span className="badge bg-amber-100 text-amber-700">{s.type}</span></td>
                  <td className="table-cell">{s.task}</td>
                  <td className="table-cell">{s.nextDate}</td>
                  <td className="table-cell"><span className={s.status === 'Active' ? 'badge-active' : 'badge-maintenance'}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
