import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Settings, 
  Plus, 
  Users, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  List,
  Layout as LayoutIcon,
  Calendar as CalendarIcon,
  BarChart2,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  X,
  Loader2,
  Heart
} from 'lucide-react';

const parentsData = [
  { id: 1, name: 'Eric Kayisire', phone: '(+250) 788-111-222', location: 'Kigali, Gasabo', relation: 'Father', children: [
    { name: 'Jean Baptiste Murenzi', color: '#EEF2FF', text: '#4338CA' },
    { name: 'Alice Murenzi', color: '#FDF2F8', text: '#BE185D' }
  ]},
  { id: 2, name: 'Sarah Uwase', phone: '(+250) 788-333-444', location: 'Kigali, Kicukiro', relation: 'Mother', children: [
    { name: 'Marie Claire Uwase', color: '#F0FDF4', text: '#15803D' }
  ]},
  { id: 3, name: 'Jean Bizimana', phone: '(+250) 788-555-666', location: 'Musanze, Muhoza', relation: 'Father', children: [
    { name: 'Samuel Bizimana', color: '#FFF7ED', text: '#C2410C' }
  ]},
  { id: 4, name: 'Alice Umutoni', phone: '(+250) 788-777-888', location: 'Rubavu, Gisenyi', relation: 'Mother', children: [
    { name: 'Diane Umutoni', color: '#F5F3FF', text: '#6D28D9' }
  ]},
  { id: 5, name: 'Pierre Ntaganda', phone: '(+250) 788-999-000', location: 'Kigali, Nyarugenge', relation: 'Guardian', children: [
    { name: 'Robert Ntaganda', color: '#ECFEFF', text: '#0E7490' }
  ]},
];

const filterGroups = [
  { name: 'All Parents', count: 450 },
  { name: 'Fathers', count: 210 },
  { name: 'Mothers', count: 195 },
  { name: 'Guardians', count: 45 },
];

export default function Parents() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden text-sm text-slate-700">
      
      {/* Action Bar */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 bg-white relative">
        <div className="flex items-center gap-3">
          <Link to="/students/parents/new" className="bg-[#000435] hover:bg-[#000435]/90 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide shadow-sm transition no-underline">
            New
          </Link>
          <div className="flex items-center gap-2 relative">
            <h1 className="text-base font-semibold text-slate-800">Parents</h1>
            <div className="relative">
              <Settings 
                className={`w-4 h-4 cursor-pointer transition-colors ${showSettings ? 'text-[#000435]' : 'text-slate-400 hover:text-slate-600'}`} 
                onClick={() => setShowSettings(!showSettings)}
              />
              
              <AnimatePresence>
                {showSettings && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowSettings(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-2 z-30 overflow-hidden"
                      style={{ top: '100%' }}
                    >
                      <button className="w-full px-4 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-[#000435] flex items-center gap-2 transition-colors">
                        <Users size={14} className="text-slate-400" />
                        Import Parents
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button className="w-full px-4 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-[#000435] flex items-center gap-2 transition-colors">
                        <BarChart2 size={14} className="text-slate-400" />
                        Export to Excel
                      </button>
                      <button className="w-full px-4 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-[#000435] flex items-center gap-2 transition-colors">
                        <BarChart2 size={14} className="text-slate-400" />
                        Export to PDF
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden focus-within:border-[#000435]/60">
            <div className="flex items-center px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search parents..."
                className="w-52 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="px-2 py-2 border-l border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer">
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <span>1-10 / 450</span>
            <button className="p-1 hover:bg-slate-100 rounded">
              <ChevronLeft size={16} />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
            <button className="p-2 hover:bg-slate-50 text-slate-400">
              <Grid size={16} />
            </button>
            <button className="p-2 bg-slate-50 text-[#000435] border-x border-slate-300">
              <List size={16} />
            </button>
            <button className="p-2 hover:bg-slate-50 text-slate-400">
              <LayoutIcon size={16} />
            </button>
            <button className="p-2 hover:bg-slate-50 text-slate-400 border-x border-slate-300">
              <CalendarIcon size={16} />
            </button>
            <button className="p-2 hover:bg-slate-50 text-slate-400">
              <BarChart2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-56 border-r border-slate-100 p-3 bg-white overflow-y-auto">
          <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Heart className="w-3 h-3 text-[#000435]" /> RELATIONSHIPS
          </h2>
          
          <nav className="space-y-0.5">
            {filterGroups.map((group, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs transition-all ${group.name === 'All Parents' ? 'bg-[#000435]/5 text-[#000435] font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span>{group.name}</span>
                <span className={`text-[10px] font-medium ${group.name === 'All Parents' ? 'text-[#000435]' : 'text-slate-400'}`}>{group.count}</span>
              </div>
            ))}
          </nav>

          <div className="mt-8 p-3 rounded bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Quick Actions</p>
            <button className="w-full flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded hover:border-[#000435]/30 transition-all text-[9px] font-bold text-slate-500 uppercase">
              <UserPlus size={13} className="text-[#000435]" />
              Assign to Student
            </button>
          </div>
        </aside>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800 text-[11px] font-bold bg-white sticky top-0 z-10">
                <th className="px-4 py-2 w-10 border-r border-slate-100"><input type="checkbox" className="rounded border-slate-300 text-[#000435] focus:ring-[#000435]/20" /></th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider w-1/4">Name</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider w-1/4">Contacts</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider w-1/4">Students</th>
                <th className="px-4 py-2 uppercase tracking-wider w-1/4">Location</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {parentsData.map((parent, index) => (
                <tr key={parent.id} className={`border-b border-slate-200 cursor-pointer transition-colors hover:bg-[#000435]/5 ${index % 2 !== 0 ? 'bg-slate-200' : 'bg-white'}`}>
                  <td className="px-4 py-2 w-10"><input type="checkbox" className="rounded border-slate-300 text-[#000435] focus:ring-[#000435]/20" /></td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#000435]/10 flex items-center justify-center text-[10px] font-bold text-[#000435] border border-[#000435]/20 uppercase">
                        {parent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block">{parent.name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{parent.relation}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone size={10} className="text-slate-400" />
                      <span className="font-medium">{parent.phone}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
                      {parent.children.map((child, i) => (
                        <React.Fragment key={i}>
                          <div className="flex items-center gap-1.5">
                            <div 
                              className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold shadow-sm border border-black/5 flex-shrink-0"
                              style={{ background: child.color, color: child.text }}
                            >
                              {child.name.charAt(0)}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 truncate max-w-[100px]">
                              {child.name}
                            </span>
                          </div>
                          {i < parent.children.length - 1 && (
                            <div className="w-1 h-1 rounded-full bg-slate-200 flex-shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin size={10} className="text-slate-400" />
                      {parent.location}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
