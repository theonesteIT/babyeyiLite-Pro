import { useState } from 'react'
import { ClipboardCheck, ScanLine, MapPin, ShieldCheck, Save, Search } from 'lucide-react'
import { auditItems } from '../data/mockData'

export default function Audit() {
  const [scanMode, setScanMode] = useState(false)

  const stats = [
    { label: 'Total Audited', value: auditItems.length, color: 'text-blue-600' },
    { label: 'Verified', value: auditItems.filter(a => a.verified).length, color: 'text-emerald-600' },
    { label: 'Missing', value: auditItems.filter(a => a.condition === 'Missing').length, color: 'text-red-600' },
    { label: 'Damaged', value: auditItems.filter(a => a.condition === 'Damaged').length, color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Asset Audit</h2>
        <p className="text-gray-500 text-sm mt-1">Physical verification of all assets</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="card text-center">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* QR Scanner Button */}
      <div className="card bg-navy text-white">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <ScanLine size={40} className="text-amber-500" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold">QR Code Scanner</h3>
            <p className="text-white/70 text-sm">Scan asset QR code to begin verification</p>
          </div>
          <button onClick={() => setScanMode(!scanMode)} className="bg-amber-500 text-navy font-semibold py-2 px-6 rounded-lg hover:bg-amber-400 transition-all">
            {scanMode ? 'Stop Scanning' : 'Start Scanning'}
          </button>
        </div>
        {scanMode && (
          <div className="mt-4 p-8 border-2 border-dashed border-white/20 rounded-xl text-center">
            <ScanLine size={48} className="mx-auto text-amber-500 mb-2 animate-pulse" />
            <p className="text-white/70">Camera active - Point at QR code</p>
          </div>
        )}
      </div>

      {/* Audit Process */}
      <div className="card">
        <h3 className="text-lg font-semibold text-navy mb-4">Audit Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr><th className="table-header">Asset</th><th className="table-header">Location</th><th className="table-header">Verified</th><th className="table-header">Condition</th><th className="table-header">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditItems.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium text-navy">{a.asset}</td>
                  <td className="table-cell">{a.location}</td>
                  <td className="table-cell">
                    <span className={`badge ${a.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {a.verified ? 'Verified' : 'Missing'}
                    </span>
                  </td>
                  <td className="table-cell">{a.condition}</td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200">Verify</button>
                      <button className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded hover:bg-amber-200">Report</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Verify */}
      <div className="card">
        <h3 className="text-lg font-semibold text-navy mb-4">Quick Verify</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scan QR</label>
            <div className="input-field flex items-center gap-2 cursor-pointer">
              <ScanLine size={18} className="text-amber-500" />
              <span className="text-gray-400">Click to scan</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verify Location</label>
            <div className="input-field flex items-center gap-2">
              <MapPin size={18} className="text-amber-500" />
              <span className="text-gray-400">Auto-detect</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verify Condition</label>
            <select className="select-field">
              <option>Excellent</option>
              <option>Good</option>
              <option>Fair</option>
              <option>Poor</option>
              <option>Damaged</option>
            </select>
          </div>
        </div>
        <button className="btn-primary mt-4 flex items-center gap-2">
          <Save size={18} /> Save Results
        </button>
      </div>
    </div>
  )
}
