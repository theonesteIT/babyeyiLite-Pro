import React from 'react';
import { Users, UserCog, Settings, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const tiles = [
  {
    icon: Users,
    label: 'Student Attendance',
    description: 'Record and track daily period attendance for all classes',
    color: 'text-primary',
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    path: '/attendance/students',
  },
  {
    icon: UserCog,
    label: 'Teacher Attendance',
    description: 'Monitor staff presence, punctuality and duty compliance',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    path: '/attendance/teachers',
  },
  {
    icon: Settings,
    label: 'Configurations',
    description: 'Set attendance rules, grace periods and notification thresholds',
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    path: '/attendance/config',
  },
];

export default function AttendanceHub() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-sans">
      {/* Top bar */}
      <div className="flex items-center px-6 h-14 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <CheckCircle size={18} className="text-primary" />
          <h1 className="text-base font-bold text-slate-800">Attendance</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 p-10">
        <div className="max-w-2xl w-full">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-black text-slate-800">Attendance Management</h2>
            <p className="text-sm text-slate-400 mt-1 font-medium">Choose a module to manage attendance records</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.path}
                  onClick={() => navigate(tile.path)}
                  className={`flex items-center gap-5 p-5 rounded-xl border ${tile.border} bg-white hover:shadow-md hover:-translate-y-0.5 transition-all text-left group`}
                >
                  <div className={`w-12 h-12 rounded-xl ${tile.bg} border ${tile.border} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                    <Icon size={22} className={tile.color} />
                  </div>
                  <div>
                    <p className={`font-black text-sm uppercase tracking-wider ${tile.color}`}>{tile.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{tile.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
