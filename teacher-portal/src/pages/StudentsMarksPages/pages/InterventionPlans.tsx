import { Plus, Search, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { interventionPlans } from '../data/mockData';

export default function InterventionPlans() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Intervention Plans</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage student intervention programs</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy-600 transition-colors">
          <Plus size={16} /> New Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500">Total Plans</p>
          <p className="text-2xl font-bold text-navy">{interventionPlans.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{interventionPlans.filter(p => p.status === 'completed').length}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-xs text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{interventionPlans.filter(p => p.status === 'in-progress').length}</p>
        </div>
        <div className="bg-amber/10 rounded-xl p-4 border border-amber/30">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-amber">{interventionPlans.filter(p => p.status === 'pending').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input placeholder="Search intervention plans..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none" />
          </div>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber/50 outline-none">
            <option>All Status</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </div>
        <div className="divide-y divide-gray-100">
          {interventionPlans.map(plan => (
            <div key={plan.id} className="p-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    plan.status === 'completed' ? 'bg-green-50' :
                    plan.status === 'in-progress' ? 'bg-blue-50' : 'bg-amber/10'
                  }`}>
                    {plan.status === 'completed' ? <CheckCircle size={18} className="text-green-500" /> :
                     plan.status === 'in-progress' ? <Clock size={18} className="text-blue-500" /> :
                     <AlertTriangle size={18} className="text-amber" />}
                  </div>
                  <div>
                    <p className="font-medium text-navy text-sm">{plan.studentName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Issue: {plan.issue}</p>
                    <p className="text-xs text-gray-400 mt-1">Action: {plan.action}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    plan.status === 'completed' ? 'bg-green-50 text-green-600' :
                    plan.status === 'in-progress' ? 'bg-blue-50 text-blue-600' :
                    'bg-amber/10 text-amber'
                  }`}>
                    {plan.status}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">{plan.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
