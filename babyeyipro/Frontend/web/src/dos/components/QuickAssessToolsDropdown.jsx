import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardList,
  Eye,
  GraduationCap,
  FileBarChart,
  LineChart,
  BookMarked,
  Users,
  SlidersHorizontal,
  LayoutGrid,
} from 'lucide-react';
import { h } from '../utils/href';

const AMBER = '#c87800';
const NAVY = '#000435';

const TOOL_ITEMS = [
  { title: 'Record Marks', desc: 'Enter assessments and gradebook columns', icon: ClipboardList, path: '/marks/record', accent: NAVY },
  { title: 'View Marks', desc: 'School-wide performance by class and subject', icon: Eye, path: '/marks/view', accent: '#059669' },
  { title: 'Student Reports', desc: 'Report cards and marks analytics', icon: BookMarked, path: '/student-marks-reports', accent: '#2563eb' },
  { title: 'Teacher Assignments', desc: 'Assign teachers to classes and subjects', icon: Users, path: '/teacher-assignments', accent: AMBER },
  { title: 'Staff & Courses', desc: 'Subjects, teachers, and timetable setup', icon: GraduationCap, path: '/academic-setup', accent: '#7c3aed' },
  { title: 'Academic Progress', desc: 'Learner status and term progress', icon: LineChart, path: '/progress', accent: '#059669', pro: true },
  { title: 'DOS Reports', desc: 'Summaries and exports by class', icon: FileBarChart, path: '/reports', accent: '#2563eb', pro: true },
  { title: 'DOS Settings', desc: 'Gradebook defaults and academic config', icon: SlidersHorizontal, path: '/dos-settings', accent: '#7c3aed', pro: true },
];

export default function QuickAssessToolsDropdown({ proAccessEffective = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const items = TOOL_ITEMS.filter((t) => !t.pro || proAccessEffective);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
        style={{ background: AMBER }}
      >
        <LayoutGrid size={16} />
        Quick Assess Tools
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(100vw-2rem,420px)] rounded-2xl border border-[#000435]/10 bg-white shadow-xl shadow-[#000435]/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-[#000435]/8 bg-gradient-to-r from-amber-50 to-white">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#000435]/45">Assessment suite</p>
            <p className="text-xs font-semibold text-[#000435] mt-0.5">Marks, reports, and academic tools</p>
          </div>
          <div className="p-2 max-h-[min(70vh,380px)] overflow-y-auto">
            {items.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={h(tool.path)}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-[#000435]/[0.04] transition-colors group"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${tool.accent}14`, color: tool.accent }}
                  >
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#000435] group-hover:text-[#000435]">{tool.title}</p>
                    <p className="text-[11px] text-[#000435]/50 leading-snug mt-0.5">{tool.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
