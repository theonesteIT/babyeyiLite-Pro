import { TrendingDown, DollarSign, PiggyBank } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { depreciationData } from '../data/mockData'

export default function Depreciation() {
  const currentValue = 12400000
  const totalDep = 1240000
  const remaining = 11160000

  const methods = ['Straight Line', 'Declining Balance', 'Double Declining']

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Depreciation Management</h2>
        <p className="text-gray-500 text-sm mt-1">Track asset value depreciation over time</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <DollarSign size={18} className="text-emerald-500" />
            <span className="text-sm">Current Asset Value</span>
          </div>
          <p className="text-2xl font-bold text-navy">${(currentValue / 1000000).toFixed(1)}M</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <TrendingDown size={18} className="text-red-500" />
            <span className="text-sm">Total Depreciation</span>
          </div>
          <p className="text-2xl font-bold text-navy">${(totalDep / 1000000).toFixed(1)}M</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <PiggyBank size={18} className="text-amber-500" />
            <span className="text-sm">Remaining Value</span>
          </div>
          <p className="text-2xl font-bold text-navy">${(remaining / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      {/* Methods */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {methods.map((m) => (
          <div key={m} className="card cursor-pointer hover:border-amber-500 border-2 border-transparent transition-all">
            <h3 className="font-semibold text-navy">{m}</h3>
            <p className="text-xs text-gray-500 mt-1">Calculate depreciation using {m.toLowerCase()} method</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-navy mb-4">Yearly Depreciation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={depreciationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="depreciation" fill="#ffc107" radius={[6, 6, 0, 0]} name="Depreciation" />
              <Bar dataKey="remaining" fill="#000435" radius={[6, 6, 0, 0]} name="Remaining" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-navy mb-4">Value Decline Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={depreciationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#000435" strokeWidth={2} dot={{ fill: '#000435', r: 4 }} name="Asset Value" />
              <Line type="monotone" dataKey="remaining" stroke="#ffc107" strokeWidth={2} dot={{ fill: '#ffc107', r: 4 }} name="Remaining Value" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
