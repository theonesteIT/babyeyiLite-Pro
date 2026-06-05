import { Award, Search, AlertTriangle } from 'lucide-react'
import { warranties } from '../data/mockData'

export default function Warranty() {
  const active = warranties.filter(w => w.status === 'Active').length
  const expiring = warranties.filter(w => w.status === 'Expiring Soon').length
  const expired = warranties.filter(w => w.status === 'Expired').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Warranty Management</h2>
        <p className="text-gray-500 text-sm mt-1">Track warranty status and expiry alerts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-l-4 border-l-emerald-500">
          <p className="text-sm text-gray-500">Active Warranties</p>
          <p className="text-2xl font-bold text-emerald-600">{active}</p>
        </div>
        <div className="card border-l-4 border-l-amber-500">
          <p className="text-sm text-gray-500">Expiring Soon</p>
          <p className="text-2xl font-bold text-amber-600">{expiring}</p>
        </div>
        <div className="card border-l-4 border-l-red-500">
          <p className="text-sm text-gray-500">Expired</p>
          <p className="text-2xl font-bold text-red-600">{expired}</p>
        </div>
      </div>

      {/* Alerts */}
      <div className="card bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Upcoming Expiry Alerts</h3>
            <div className="mt-2 space-y-1 text-sm text-amber-700">
              <p>• Canon EOS R5 - Expires in 30 days (Jul 14, 2025)</p>
              <p>• Dell Latitude 5420 - Expires in 90 days</p>
              <p>• Server Rack Pro - Already expired</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-full sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search warranties..." className="input-field pl-10" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="table-header">Asset</th><th className="table-header">Provider</th><th className="table-header">Start Date</th><th className="table-header">End Date</th><th className="table-header">Cost</th><th className="table-header">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {warranties.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-navy">{w.asset}</td>
                  <td className="table-cell">{w.provider}</td>
                  <td className="table-cell">{w.startDate}</td>
                  <td className="table-cell">{w.endDate}</td>
                  <td className="table-cell">${w.cost}</td>
                  <td className="table-cell"><span className={`badge ${w.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : w.status === 'Expiring Soon' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{w.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
