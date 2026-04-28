import React from 'react';
import { 
  Search, 
  Settings, 
  Plus, 
  Users, 
  BookOpen, 
  Clock, 
  MapPin, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  List,
  Layout as LayoutIcon,
  Calendar as CalendarIcon,
  BarChart2
} from 'lucide-react';

const classes = [
  { id: 1, name: 'Senior 1A', teacher: 'Mr. James Wilson', students: 42, room: 'Block A - 101', stream: 'Science' },
  { id: 2, name: 'Senior 1B', teacher: 'Ms. Maria Garcia', students: 38, room: 'Block A - 102', stream: 'Arts' },
  { id: 3, name: 'Senior 2A', teacher: 'Mrs. Sarah Uwase', students: 45, room: 'Block B - 201', stream: 'General' },
  { id: 4, name: 'Senior 3', teacher: 'Mr. Robert Ntaganda', students: 35, room: 'ICT Lab', stream: 'Technical' },
  { id: 5, name: 'Primary 6', teacher: 'Ms. Alice Mukana', students: 50, room: 'Block C - 001', stream: 'Standard' },
];

const educationalLevels = [
  { name: 'All Levels', count: 12 },
  { name: 'Nursery', count: 3 },
  { name: 'Primary', count: 6 },
  { name: 'O-Level', count: 3 },
  { 
    name: 'A-Level', 
    count: 4,
    subItems: [
      { name: 'PCM (Physics, Chem, Math)', count: 1 },
      { name: 'PCB (Physics, Chem, Bio)', count: 1 },
      { name: 'MCB (Math, Chem, Bio)', count: 1 },
      { name: 'MEG (Math, Econ, Geog)', count: 1 },
    ]
  },
];

export default function Classes() {
  const [activeLevel, setActiveLevel] = React.useState('All Levels');

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden text-sm text-slate-700">
      
      {/* Action Bar */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <button className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide shadow-sm transition">
            New Class
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-slate-800">Academic Classes</h1>
            <Settings className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Search */}
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden focus-within:border-primary/60">
            <div className="flex items-center px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search classes..."
                className="w-52 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="px-2 py-2 border-l border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer">
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* View Switch */}
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
            <button className="p-2 hover:bg-slate-50 text-slate-400">
              <Grid className="w-4 h-4" />
            </button>
            <button className="p-2 bg-slate-50 text-primary border-x border-slate-300">
              <List className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-slate-50 text-slate-400">
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r border-slate-100 p-3 bg-white">
          <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <LayoutIcon className="w-3 h-3 text-primary" /> LEVELS
          </h2>
          <nav className="space-y-0.5">
            {educationalLevels.map((level) => (
              <div key={level.name}>
                <button 
                  onClick={() => setActiveLevel(level.name)}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs transition-all ${
                    activeLevel === level.name 
                      ? 'bg-primary/5 text-primary font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{level.name}</span>
                  <span className={`text-[10px] font-medium ${activeLevel === level.name ? 'text-primary' : 'text-slate-400'}`}>
                    {level.count}
                  </span>
                </button>
                
                {level.subItems && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">
                    {level.subItems.map((sub) => (
                      <button 
                        key={sub.name}
                        onClick={() => setActiveLevel(sub.name)}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-all duration-200 ${
                          activeLevel === sub.name 
                            ? 'text-primary font-bold bg-primary/5' 
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-2">{sub.name.split(' (')[0]}</span>
                        <span className="text-[9px] font-medium opacity-60">{sub.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800 text-[11px] font-bold bg-white sticky top-0 z-10">
                <th className="px-4 py-2 w-10 border-r border-slate-100"><input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/20" /></th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Class Name</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Class Teacher</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Students</th>
                <th className="px-4 py-2 uppercase tracking-wider">Room / Location</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {classes.map((cls, index) => (
                <tr key={cls.id} className={`border-b border-slate-200 cursor-pointer transition-colors hover:bg-primary/5 ${index % 2 !== 0 ? 'bg-slate-200' : 'bg-white'}`}>
                  <td className="px-4 py-1.5 w-10"><input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/20" /></td>
                  <td className="px-4 py-1.5">
                    <span className="font-medium text-slate-700">{cls.name}</span>
                  </td>
                  <td className="px-4 py-1.5 border-x border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden shadow-sm border border-primary/20">
                        {cls.teacher.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700">{cls.teacher}</span>
                    </div>
                  </td>
                  <td className="px-4 py-1.5 text-slate-600 font-medium border-r border-slate-100">{cls.students}</td>
                  <td className="px-4 py-1.5 text-slate-600 font-medium">{cls.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
