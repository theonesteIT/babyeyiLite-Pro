import { Bell, Wrench, Award, Undo2, ArrowLeftRight, ClipboardCheck, CheckCheck, X } from 'lucide-react'
import { notifications } from '../data/mockData'

const typeIcons = { maintenance: Wrench, warranty: Award, return: Undo2, transfer: ArrowLeftRight, audit: ClipboardCheck }

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy">Notifications</h2>
          <p className="text-gray-500 text-sm mt-1">Stay updated on asset activities</p>
        </div>
        <button className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
          <CheckCheck size={16} /> Mark all read
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { icon: Bell, label: 'All', count: notifications.length, color: 'text-navy' },
          { icon: Wrench, label: 'Maintenance', count: notifications.filter(n => n.type === 'maintenance').length, color: 'text-amber-600' },
          { icon: Award, label: 'Warranty', count: notifications.filter(n => n.type === 'warranty').length, color: 'text-emerald-600' },
          { icon: Undo2, label: 'Returns', count: notifications.filter(n => n.type === 'return').length, color: 'text-blue-600' },
          { icon: ClipboardCheck, label: 'Audit', count: notifications.filter(n => n.type === 'audit').length, color: 'text-purple-600' },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="card text-center cursor-pointer hover:border-amber-500 border-2 border-transparent transition-all">
              <Icon size={20} className={`mx-auto mb-1 ${item.color}`} />
              <p className="text-2xl font-bold text-navy">{item.count}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          )
        })}
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {notifications.map((n) => {
          const Icon = typeIcons[n.type] || Bell
          return (
            <div key={n.id} className={`card flex items-start gap-4 ${!n.read ? 'bg-amber-50 border-amber-200' : ''}`}>
              <div className={`p-2 rounded-lg ${!n.read ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <Icon size={20} className={!n.read ? 'text-amber-600' : 'text-gray-400'} />
              </div>
              <div className="flex-1">
                <p className={`text-sm ${!n.read ? 'font-semibold text-navy' : 'text-gray-600'}`}>{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{n.date}</p>
              </div>
              <div className="flex items-center gap-2">
                {!n.read && <div className="w-2 h-2 bg-amber-500 rounded-full" />}
                <button className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-600 transition-all">
                  <X size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
