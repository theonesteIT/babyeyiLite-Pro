import { useState } from 'react'
import { BarChart3, FileText, DollarSign, ClipboardCheck, Download } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { lineChartData, pieChartData } from '../data/mockData'

const categories = [
  { icon: FileText, label: 'Asset Register', desc: 'Complete list of all assets' },
  { icon: BarChart3, label: 'Asset Summary', desc: 'Summary statistics and counts' },
  { icon: FileText, label: 'Asset Assignment', desc: 'Current assignments report' },
  { icon: DollarSign, label: 'Asset Value', desc: 'Financial valuation report' },
  { icon: BarChart3, label: 'Depreciation', desc: 'Depreciation schedule' },
  { icon: DollarSign, label: 'Maintenance Cost', desc: 'Total maintenance expenses' },
  { icon: ClipboardCheck, label: 'Missing Assets', desc: 'Lost and missing items' },
  { icon: ClipboardCheck, label: 'Verification', desc: 'Audit verification results' },
]

const exportOptions = [
  { icon: FileText, label: 'PDF', desc: 'Portable Document Format' },
  { icon: FileSpreadsheet, label: 'Excel', desc: 'Spreadsheet format' },
  { icon: FileCode, label: 'CSV', desc: 'Comma-separated values' },
]

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy">Reports Center</h2>
        <p className="text-gray-500 text-sm mt-1">Generate and export comprehensive reports</p>
      </div>

      {/* Report Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat, i) => {
          const Icon = cat.icon
          return (
            <div key={i} className="card cursor-pointer hover:border-amber-500 border-2 border-transparent transition-all group">
              <Icon size={24} className="text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-navy text-sm">{cat.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Charts Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-navy mb-4">Asset Value Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#000435" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold text-navy mb-4">Asset Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export Options */}
      <div className="card">
        <h3 className="text-lg font-semibold text-navy mb-4">Export Options</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {exportOptions.map((opt, i) => {
            const Icon = opt.icon
            return (
              <button key={i} className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-amber-500 transition-all group text-left">
                <Icon size={28} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
                <div>
                  <p className="font-semibold text-navy">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
                <Download size={18} className="ml-auto text-gray-300 group-hover:text-amber-500" />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FileSpreadsheet(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" x2="16" y1="13" y2="13"/><line x1="8" x2="16" y1="17" y2="17"/>
    </svg>
  )
}
function FileCode(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="m10 13-2 2 2 2"/><path d="m14 17 2-2-2-2"/>
    </svg>
  )
}
