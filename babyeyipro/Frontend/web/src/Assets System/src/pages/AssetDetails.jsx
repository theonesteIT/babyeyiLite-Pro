import { useState } from 'react'
import { useParams } from 'react-router-dom'
import QRCode from '../../../assets_portal/components/AssetQrCode'
import { assets, recentActivities, maintenanceRecords } from '../data/mockData'
import { Eye, Edit3, ArrowLeftRight, Wrench, Trash2, Clock, User, MapPin, FileText, Activity, Download, Printer } from 'lucide-react'

const tabs = ['Overview', 'Assignment History', 'Transfer History', 'Maintenance Records', 'Audit Records', 'Documents', 'Activity Timeline']

export default function AssetDetails() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('Overview')
  const asset = assets.find(a => a.id === id) || assets[0]

  const getStatusBadge = (status) => {
    const map = { 'Active': 'badge-active', 'Assigned': 'badge-assigned', 'Under Maintenance': 'badge-maintenance', 'Damaged': 'badge-damaged', 'Lost': 'badge-lost' }
    return map[status] || 'badge-active'
  }

  return (
    <div className="space-y-6">
      {/* Asset Header */}
      <div className="card">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center flex-shrink-0">
            <Eye size={36} className="text-navy" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-bold text-navy">{asset.name}</h2>
              <span className={getStatusBadge(asset.status)}>{asset.status}</span>
            </div>
            <p className="text-gray-500 mt-1">Code: <span className="font-mono font-medium text-navy">{asset.code}</span> | Category: {asset.category} | Location: {asset.location}</p>
          </div>
          <div className="flex items-center gap-2">
            <QRCode value={asset.id} size={80} bgColor="#ffffff" fgColor="#000435" />
          </div>
          <div className="flex gap-2">
            <button className="btn-outline text-sm py-1.5 px-3 flex items-center gap-1.5"><Edit3 size={15} /> Edit</button>
            <button className="btn-outline text-sm py-1.5 px-3 flex items-center gap-1.5"><Printer size={15} /> Print</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Asset Name</p><p className="font-medium text-navy mt-1">{asset.name}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Asset Code</p><p className="font-medium text-navy mt-1 font-mono">{asset.code}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Category</p><p className="font-medium text-navy mt-1">{asset.category} / {asset.subCategory}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Purchase Date</p><p className="font-medium text-navy mt-1">{asset.purchaseDate}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Purchase Cost</p><p className="font-medium text-navy mt-1">${asset.value.toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Supplier</p><p className="font-medium text-navy mt-1">{asset.supplier}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Department</p><p className="font-medium text-navy mt-1">{asset.department}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Assigned To</p><p className="font-medium text-navy mt-1">{asset.assignedTo}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Location</p><p className="font-medium text-navy mt-1">{asset.location}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Status</p><p className="mt-1"><span className={getStatusBadge(asset.status)}>{asset.status}</span></p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Current Value</p><p className="font-medium text-navy mt-1">${(asset.value * 0.85).toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500 uppercase tracking-wider">Depreciation</p><p className="font-medium text-navy mt-1">${(asset.value * 0.15).toLocaleString()} (15%)</p></div>
          </div>
        )}
        {activeTab === 'Maintenance Records' && (
          <div className="space-y-4">
            {maintenanceRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-navy">{r.asset} - <span className="text-gray-600">{r.problem}</span></p>
                  <p className="text-sm text-gray-500 mt-1">{r.technician} | ${r.cost} | {r.date}</p>
                </div>
                <span className={`badge ${r.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : r.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : r.status === 'Scheduled' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'Activity Timeline' && (
          <div className="space-y-0 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
            {recentActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-4 pb-6 relative">
                <div className={`w-4 h-4 rounded-full mt-0.5 ring-4 ring-white flex-shrink-0 ${a.type === 'add' ? 'bg-emerald-500' : a.type === 'transfer' ? 'bg-blue-500' : a.type === 'assign' ? 'bg-amber-500' : a.type === 'maintenance' ? 'bg-purple-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-medium text-navy text-sm">{a.action}</p>
                  <p className="text-sm text-gray-600">{a.item}</p>
                  <p className="text-xs text-gray-400 mt-0.5">by {a.user} - {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {(activeTab === 'Assignment History' || activeTab === 'Transfer History' || activeTab === 'Audit Records' || activeTab === 'Documents') && (
          <div className="text-center py-12 text-gray-400">
            <FileText size={48} className="mx-auto mb-3 opacity-50" />
            <p>No records found for this section</p>
          </div>
        )}
      </div>
    </div>
  )
}
