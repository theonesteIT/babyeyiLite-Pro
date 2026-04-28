import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Save, Search, ChevronDown, CheckCircle,
    X, FileText, Users, Download, Filter, Check, Minus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Class Hierarchy ────────────────────────────────────────────────────────
const classHierarchy = [
  { name: 'Nursery', children: [{ name: 'Baby Class' }, { name: 'Middle Class' }, { name: 'Top Class' }] },
  { name: 'Primary', children: [{ name: 'P1' }, { name: 'P2' }, { name: 'P3' }, { name: 'P4' }, { name: 'P5' }, { name: 'P6' }] },
  {
    name: 'Secondary',
    children: [
      { name: 'S1' }, { name: 'S2' }, { name: 'S3' },
      { name: 'S4', children: [{ name: 'S4 PCM' }, { name: 'S4 PCB' }, { name: 'S4 MCB' }, { name: 'S4 MEG' }] },
      { name: 'S6', children: [{ name: 'S6 PCM' }, { name: 'S6 MCB' }] }
    ]
  }
];

// ─── Period Definitions ─────────────────────────────────────────────────────
// type: 'p' = attendable period | 'break' | 'lunch'
const ALL_PERIODS = [
  { label: '8:30',  sublabel: '9:10',   type: 'p' },
  { label: '9:10',  sublabel: '10:50',  type: 'p' },
  { label: 'BRK',   sublabel: '',       type: 'break' },
  { label: '10:51', sublabel: '12:00',  type: 'p' },
  { label: '12:00', sublabel: '13:10',  type: 'p' },
  { label: 'LCH',   sublabel: '',       type: 'lunch' },
  { label: '13:30', sublabel: '14:10',  type: 'p' },
  { label: '14:10', sublabel: '15:00',  type: 'p' },
  { label: 'BRK',   sublabel: '',       type: 'break' },
  { label: '15:10', sublabel: '16:00',  type: 'p' },
  { label: '16:00', sublabel: '16:50',  type: 'p' },
];

// Generate Mon–Fri dates for the current week
function getCurrentWeekDays() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      iso: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };
  });
}

const WEEK_DAYS = getCurrentWeekDays();

// ─── Mock Students ──────────────────────────────────────────────────────────
const PERIOD_COUNT = ALL_PERIODS.length;

function buildInitialStudents() {
  const names = [
    'Kevin Mugisha', 'Grace Mutoni', 'Safi Ishimwe', 'David Rukundo',
    'Aline Uwase', 'Eric Niyonsenga', 'Sarah Iribagiza', 'John Doe',
    'Jane Smith', 'Alex Johnson',
  ];
  // attendance[dayIndex][periodIndex] = 'present' | 'absent' | 'na'
  return names.map((name, i) => ({
    id: i + 1,
    name,
    attendance: WEEK_DAYS.map(() =>
      ALL_PERIODS.map(p => p.type === 'p' ? 'na' : 'skip')
    ),
  }));
}

// ─── Tree Item ──────────────────────────────────────────────────────────────
const TreeItem = ({ item, depth = 0, selectedClass, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedClass === item.name;

  return (
    <div className="mb-0.5">
      <div
        className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-[10px] transition-all ${
          depth === 0
            ? 'text-slate-800 font-bold uppercase tracking-tight mt-2'
            : isSelected
            ? 'bg-primary/5 text-primary font-black uppercase tracking-tight border border-primary/20'
            : 'text-slate-600 hover:bg-slate-50 uppercase tracking-tight font-medium border border-transparent'
        }`}
        onClick={() => hasChildren ? setIsOpen(!isOpen) : onSelect(item.name)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {hasChildren && (
            <ChevronDown size={11} className={`text-slate-400 transition-transform ${!isOpen ? '-rotate-90' : ''}`} />
          )}
          {!hasChildren && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 shrink-0" />}
          <span className="truncate">{item.name}</span>
        </div>
      </div>
      {isOpen && hasChildren && (
        <div className="ml-3 border-l border-slate-100 pl-1.5 space-y-0.5 mt-0.5">
          {item.children.map((child, idx) => (
            <TreeItem key={idx} item={child} depth={depth + 1} selectedClass={selectedClass} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Attendance Cell ─────────────────────────────────────────────────────────
// Cycle: na → present → absent → na
const AttCell = ({ status, onClick }) => {
  if (status === 'skip') {
    return (
      <td className="border border-slate-200 bg-slate-100/60 text-center" style={{ width: 28, minWidth: 28 }}>
        <span className="text-[8px] text-slate-300 select-none">–</span>
      </td>
    );
  }

  const cfg =
    status === 'present'
      ? { bg: 'bg-emerald-50 hover:bg-emerald-100', icon: <Check size={10} className="text-emerald-600 stroke-[3] mx-auto" /> }
      : status === 'absent'
      ? { bg: 'bg-rose-50 hover:bg-rose-100', icon: <X size={10} className="text-rose-500 stroke-[3] mx-auto" /> }
      : { bg: 'hover:bg-slate-50', icon: <span className="text-[8px] text-slate-300 select-none">–</span> };

  return (
    <td
      onClick={onClick}
      className={`border border-slate-200 cursor-pointer transition-colors text-center ${cfg.bg}`}
      style={{ width: 28, minWidth: 28 }}
    >
      <div className="flex items-center justify-center py-2">{cfg.icon}</div>
    </td>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Attendance() {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState(buildInitialStudents);

  const toggle = (studentId, dayIdx, periodIdx) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const att = s.attendance.map(day => [...day]);
      const cur = att[dayIdx][periodIdx];
      att[dayIdx][periodIdx] = cur === 'na' ? 'present' : cur === 'present' ? 'absent' : 'na';
      return { ...s, attendance: att };
    }));
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats for selected day (today = index 0..4 by weekday)
  const todayIdx = Math.min(Math.max((new Date().getDay() - 1), 0), 4);
  const presentCount = students.reduce((acc, s) =>
    acc + s.attendance[todayIdx].filter(v => v === 'present').length, 0
  );
  const absentCount = students.reduce((acc, s) =>
    acc + s.attendance[todayIdx].filter(v => v === 'absent').length, 0
  );

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden font-sans">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-5 border-b border-slate-200 bg-white sticky top-0 z-20 shrink-0 h-14">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/students')}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-xs font-semibold shadow-sm transition flex items-center gap-2"
          >
            <Save size={13} /> Submit Register
          </button>
          <h1 className="text-sm font-semibold text-slate-800">Weekly Attendance</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1 text-emerald-600">
              <Check size={10} className="stroke-[3]" /> {presentCount} Present
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <X size={10} className="stroke-[3]" /> {absentCount} Absent
            </span>
          </div>
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white px-2.5 py-1.5">
            <Calendar size={12} className="text-slate-400 mr-1.5" />
            <span className="text-xs font-semibold text-slate-700">
              {WEEK_DAYS[0].label} – {WEEK_DAYS[4].label}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-56 border-r border-slate-100 p-3 bg-white overflow-y-auto shrink-0">
          <div className="mb-4">
            <div className="relative">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 text-[10px] border border-slate-200 rounded-md outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Users size={9} className="text-primary" /> Classes
          </h2>
          <nav>
            {classHierarchy.map((node, idx) => (
              <TreeItem key={idx} item={node} selectedClass={selectedClass} onSelect={setSelectedClass} />
            ))}
          </nav>

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-1">
            <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <Filter size={9} className="text-primary" /> Reports
            </h2>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-all uppercase tracking-tight">
              <Download size={12} className="text-slate-300" /> Export PDF
            </button>
            <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-primary transition-all uppercase tracking-tight">
              <FileText size={12} className="text-slate-300" /> Attendance Log
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-auto bg-slate-50/50 flex flex-col">
          <AnimatePresence mode="wait">
            {!selectedClass ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={28} className="text-slate-300" />
                </div>
                <h2 className="text-base font-bold text-slate-800">No Class Selected</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Select a class from the sidebar to view the weekly attendance roster.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className=" flex-1 overflow-hidden flex flex-col"
              >
                <div className="bg-white border border-slate-200 overflow-hidden flex flex-col h-full">
                  <div className="overflow-auto flex-1">
                    {/*
                      TABLE LAYOUT:
                      - Col 1: # (index)
                      - Col 2: Student name
                      - Then for each of 5 days: 11 sub-columns (periods)
                      Header row 1: spans 2 + date label spans 11 per day
                      Header row 2: period labels per day
                    */}
                    <table
                      className="border-collapse text-left"
                      style={{ tableLayout: 'fixed', minWidth: 900 }}
                    >
                      <thead className="sticky top-0 z-10 bg-white">
                        {/* Row 1: Day date headers */}
                        <tr className="border-b border-slate-200">
                          <th
                            rowSpan={2}
                            className="border-r border-slate-200 bg-slate-50 text-center text-[9px] font-black uppercase tracking-wider text-slate-400"
                            style={{ width: 28, minWidth: 28 }}
                          >#</th>
                          <th
                            rowSpan={2}
                            className="px-3 border-r border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-600"
                            style={{ width: 140, minWidth: 140 }}
                          >Student</th>
                          {WEEK_DAYS.map((day, dIdx) => (
                            <th
                              key={dIdx}
                              colSpan={ALL_PERIODS.length}
                              className="border-r border-slate-300 text-center text-[9px] font-black uppercase tracking-widest text-slate-700 bg-slate-50 py-1.5"
                            >
                              {day.label}
                            </th>
                          ))}
                        </tr>

                        {/* Row 2: Period labels per day */}
                        <tr className="border-b border-slate-200 bg-slate-50">
                          {WEEK_DAYS.map((_, dIdx) =>
                            ALL_PERIODS.map((p, pIdx) => (
                              <th
                                key={`${dIdx}-${pIdx}`}
                                className={`text-center py-1 border-r text-[7.5px] font-black uppercase tracking-tight leading-tight ${
                                  p.type === 'break' || p.type === 'lunch'
                                    ? 'border-slate-200 text-slate-400 bg-slate-100/80'
                                    : 'border-slate-200 text-slate-500'
                                } ${pIdx === ALL_PERIODS.length - 1 ? 'border-r-slate-300' : ''}`}
                                style={{ width: 28, minWidth: 28 }}
                              >
                                <div>{p.label}</div>
                                {p.sublabel && <div className="text-[6.5px] text-slate-400">{p.sublabel}</div>}
                              </th>
                            ))
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {filteredStudents.map((student, rowIdx) => (
                          <tr
                            key={student.id}
                            className={`border-b border-slate-100 hover:bg-primary/[0.02] transition-colors ${
                              rowIdx % 2 !== 0 ? 'bg-slate-50/60' : 'bg-white'
                            }`}
                          >
                            {/* # */}
                            <td
                              className="border-r border-slate-200 text-center text-[8px] text-slate-400 font-bold"
                              style={{ width: 28 }}
                            >
                              {rowIdx + 1}
                            </td>

                            {/* Name */}
                            <td
                              className="px-2 border-r border-slate-200"
                              style={{ width: 140 }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary shrink-0 border border-primary/15">
                                  {student.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] font-bold text-slate-800 truncate leading-tight">{student.name}</p>
                                </div>
                              </div>
                            </td>

                            {/* Attendance cells: 5 days × 11 periods */}
                            {WEEK_DAYS.map((_, dIdx) =>
                              ALL_PERIODS.map((p, pIdx) => (
                                <AttCell
                                  key={`${dIdx}-${pIdx}`}
                                  status={student.attendance[dIdx][pIdx]}
                                  onClick={p.type === 'p' ? () => toggle(student.id, dIdx, pIdx) : undefined}
                                />
                              ))
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}