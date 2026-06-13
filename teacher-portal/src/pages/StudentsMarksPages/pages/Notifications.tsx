import { AlertTriangle, CheckCircle, X, CheckCheck, Info } from 'lucide-react';
import { alerts } from '../data/mockData';

const notifications = [
  ...alerts,
  { id: 'N005', type: 'info' as const, message: 'New assessment template available for CBC competencies', time: '5 hours ago' },
  { id: 'N006', type: 'success' as const, message: 'Term 2 marks submission deadline extended to March 20', time: '1 day ago' },
  { id: 'N007', type: 'info' as const, message: 'Parent-teacher meeting scheduled for next Friday', time: '2 days ago' },
  { id: 'N008', type: 'warning' as const, message: 'Curriculum update for Senior 3 Mathematics', time: '3 days ago' },
  { id: 'N009', type: 'success' as const, message: 'Grace Mugabo achieved perfect score in Mathematics', time: '4 days ago' },
];

const typeConfig = {
  warning: { icon: AlertTriangle, color: 'text-amber', bg: 'bg-amber/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
  error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
};

export default function Notifications() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Stay updated with alerts and announcements</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
          <CheckCheck size={16} /> Mark All Read
        </button>
      </div>

      <div className="space-y-2">
        {notifications.map(n => {
          const config = typeConfig[n.type];
          const Icon = config.icon;
          return (
            <div key={n.id} className="bg-white rounded-xl p-4 border border-gray-200 flex items-start gap-3 hover:shadow-sm transition-shadow">
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <Icon size={18} className={config.color} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{n.time}</p>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                <X size={14} className="text-gray-300" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
