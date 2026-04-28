import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Settings, 
  Calendar as CalendarIcon, 
  UserPlus, 
  Search 
} from 'lucide-react';

const sampleEnrollmentData = [
  { id: 101, name: 'Kevin Mugisha', level: 'Primary 1', stage: 'Draft', date: '2024-04-22', progress: 45 },
  { id: 102, name: 'Grace Mutoni', level: 'Senior 1 A', stage: 'Draft', date: '2024-04-23', progress: 20 },
  { id: 103, name: 'Safi Ishimwe', level: 'Nursery 1', stage: 'Review', date: '2024-04-20', progress: 100 },
  { id: 104, name: 'David Rukundo', level: 'Senior 4 PCM', stage: 'Review', date: '2024-04-21', progress: 100 },
];

export default function StudentEnrollment() {
  const stages = ['Draft', 'Review'];
  
  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Enrollment Pipeline</h1>
          <p className="text-xs text-slate-500 font-medium">Manage and track new student registrations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search registrations..." 
              className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex gap-6 p-6 overflow-x-auto">
        {stages.map(stage => (
          <div key={stage} className="flex-shrink-0 w-80 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{stage}</h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {sampleEnrollmentData.filter(d => d.stage === stage).length}
                </span>
              </div>
              <Plus size={14} className="text-slate-400 cursor-pointer hover:text-[#000435] transition-colors" />
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
              {sampleEnrollmentData.filter(d => d.stage === stage).map(student => (
                <motion.div 
                  key={student.id}
                  layoutId={student.id.toString()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#000435]/20 transition-all group cursor-pointer relative overflow-hidden"
                >
                   <div className="absolute top-0 left-0 w-1 h-full bg-[#000435]/10 group-hover:bg-[#000435] transition-colors" />
                   
                   <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#000435]/5 flex items-center justify-center text-[10px] font-bold text-[#000435] border border-[#000435]/10 uppercase">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 group-hover:text-[#000435] transition-colors">{student.name}</h4>
                          <p className="text-[10px] text-slate-400 font-medium">{student.level}</p>
                        </div>
                      </div>
                      <Settings size={12} className="text-slate-300 hover:text-slate-500" />
                   </div>

                   <div className="space-y-2">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                        <span>Registration Progress</span>
                        <span>{student.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${student.progress}%` }}
                          className={`h-full ${student.stage === 'Review' ? 'bg-amber-500' : 'bg-[#000435]'}`}
                        />
                      </div>
                   </div>

                   <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1">
                        <CalendarIcon size={10} /> {student.date}
                      </span>
                      <button className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                        student.stage === 'Draft' 
                          ? 'bg-[#000435]/5 text-[#000435] hover:bg-[#000435] hover:text-white' 
                          : 'bg-amber-500/5 text-amber-600 hover:bg-amber-500 hover:text-white'
                      }`}>
                        {student.stage === 'Draft' ? 'Resume' : 'Verify'}
                      </button>
                   </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex-shrink-0 w-80 flex flex-col h-full opacity-40 grayscale pointer-events-none">
            <div className="flex items-center gap-2 mb-4 px-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider italic">Registered</h3>
            </div>
            <div className="flex-1 bg-slate-100/50 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-3 p-8 text-center">
               <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-300 border border-slate-200">
                  <UserPlus size={24} />
               </div>
               <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Students move here after review</p>
            </div>
        </div>
      </div>
    </div>
  );
}
