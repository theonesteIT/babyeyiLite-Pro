import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Settings, 
  Plus, 
  Users, 
  BookOpen, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Grid,
  List,
  Layout as LayoutIcon,
  Calendar as CalendarIcon,
  BarChart2,
  PlusCircle,
  UserPlus,
  Home,
  GraduationCap,
  X,
  Loader2,
  Layers
} from 'lucide-react';

const studentsData = [
  { id: 1, name: 'Jean Baptiste Murenzi', gender: 'M', class: 'Senior 1A', parent: 'Murenzi Eric', status: 'Active' },
  { id: 2, name: 'Marie Claire Uwase', gender: 'F', class: 'Senior 1A', parent: 'Uwase Sarah', status: 'Active' },
  { id: 3, name: 'Samuel Bizimana', gender: 'M', class: 'Senior 4 PCM', parent: 'Bizimana Jean', status: 'Active' },
  { id: 4, name: 'Diane Umutoni', gender: 'F', class: 'Primary 6', parent: 'Umutoni Alice', status: 'Inactive' },
  { id: 5, name: 'Robert Ntaganda', gender: 'M', class: 'Senior 3', parent: 'Ntaganda Pierre', status: 'Active' },
];

const classHierarchy = [
  {
    name: 'Nursery',
    count: 120,
    children: [
      { name: 'Baby Class', count: 40 },
      { name: 'Middle Class', count: 40 },
      { name: 'Top Class', count: 40 },
    ]
  },
  {
    name: 'Primary',
    count: 450,
    children: [
      { name: 'P1', count: 75 },
      { name: 'P2', count: 75 },
      { name: 'P3', count: 75 },
      { name: 'P4', count: 75 },
      { name: 'P5', count: 75 },
      { name: 'P6', count: 75 },
    ]
  },
  {
    name: 'Secondary',
    count: 320,
    children: [
      { name: 'S1', count: 80 },
      { name: 'S2', count: 80 },
      { name: 'S3', count: 80 },
      { 
        name: 'S4', 
        count: 80,
        children: [
          { name: 'PCM', count: 20 },
          { name: 'PCB', count: 20 },
          { name: 'MCB', count: 20 },
          { name: 'MEG', count: 20 },
        ]
      }
    ]
  }
];

const TreeItem = ({ item, depth = 0, onAddClass }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div className="mb-0.5">
      <div 
        className={`flex items-center justify-between group px-2 py-1 rounded transition-all cursor-pointer text-xs ${
          depth === 0 ? 'text-slate-800 font-semibold uppercase tracking-tight' : 'text-slate-600 hover:bg-slate-50'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {hasChildren && (
            <ChevronDown 
              size={11} 
              className={`text-slate-400 transition-transform ${!isOpen ? '-rotate-90' : ''}`} 
            />
          )}
          <span className="truncate">
            {item.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-medium ${depth === 0 ? 'text-slate-500' : 'text-slate-400'}`}>
            {item.count}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                if (typeof onAddClass === 'function') onAddClass(item); 
              }}
              className="p-0.5 hover:bg-white rounded text-primary border border-transparent hover:border-primary/20 transition-all" 
              title="Add Class to this level"
            >
              <PlusCircle size={10} />
            </button>
          </div>
        </div>
      </div>
      
      {isOpen && hasChildren && (
        <div className="ml-3.5 mt-0.5 border-l border-slate-100 pl-1.5">
          {item.children.map((child, idx) => (
            <TreeItem key={idx} item={child} depth={depth + 1} onAddClass={onAddClass} />
          ))}
        </div>
      )}
    </div>
  );
};

const PRIMARY = '#000435';
const ACCENT = '#f59e0b';

// ─── Modal Components ────────────────────────────────────────────────────────
function ModalBackdrop({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
}

function ModalShell({ title, subtitle, width = 'max-w-md', onClose, children, footer }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className={`relative bg-white rounded-xl shadow-2xl w-full ${width} flex flex-col overflow-hidden`}
    >
      <div className="flex items-start justify-between px-7 pt-6 pb-4 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{subtitle}</p>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors mt-0.5 ml-4">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>
      {footer && (
        <div className="px-7 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          {footer}
        </div>
      )}
    </motion.div>
  );
}

function FieldRow({ label, required, children }) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <label className="text-sm font-semibold text-slate-700">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function TextInput({ ...props }) {
  return (
    <input {...props} className="w-full text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-[#000435] transition-colors" />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <div className="relative">
      <select {...props} className="w-full text-sm bg-transparent border-b border-slate-200 py-1.5 focus:outline-none focus:border-[#000435] appearance-none cursor-pointer transition-colors">
        {children}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

function BtnPrimary({ children, onClick, disabled, loading, color = PRIMARY }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="hover:opacity-90 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider shadow-md transition-all flex items-center gap-2"
      style={{ background: color }}>
      {loading && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

function BtnGhost({ children, onClick }) {
  return (
    <button onClick={onClick} className="text-slate-500 hover:text-slate-700 px-5 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider border border-slate-200 hover:border-slate-300 transition-all">
      {children}
    </button>
  );
}

// ─── Specific Modals ─────────────────────────────────────────────────────────
function AddClassModal({ onClose }) {
  return (
    <ModalShell title="Create New Class" subtitle="Academic · Add Class Unit" onClose={onClose}
      footer={<><BtnGhost onClick={onClose}>Cancel</BtnGhost><BtnPrimary onClick={onClose} color={PRIMARY}><PlusCircle size={13} />Create Class</BtnPrimary></>}>
      <div className="space-y-5">
        <FieldRow label="Class Name" required><TextInput placeholder="e.g. Senior 1 A" /></FieldRow>
        <FieldRow label="Level" required>
          <SelectInput>
            <option>Nursery</option>
            <option>Primary</option>
            <option>Secondary (O-Level)</option>
            <option>Secondary (A-Level)</option>
          </SelectInput>
        </FieldRow>
        <FieldRow label="Class Teacher">
          <SelectInput>
            <option value="">Select teacher...</option>
            <option>Mr. Robert Ntaganda</option>
            <option>Ms. Diane Umutoni</option>
          </SelectInput>
        </FieldRow>
        <FieldRow label="Max Capacity"><TextInput type="number" placeholder="40" /></FieldRow>
      </div>
    </ModalShell>
  );
}

function AddLevelModal({ onClose }) {
  return (
    <ModalShell title="Add Academic Level" subtitle="Organisation · Scale Tiers" onClose={onClose}
      footer={<><BtnGhost onClick={onClose}>Cancel</BtnGhost><BtnPrimary onClick={onClose} color={ACCENT}><Layers size={13} />Add Level</BtnPrimary></>}>
      <div className="space-y-5">
        <FieldRow label="Level Name" required><TextInput placeholder="e.g. Vocational Training" /></FieldRow>
        <FieldRow label="Category" required>
          <SelectInput>
            <option>Basic Education</option>
            <option>Advanced Level</option>
            <option>Special Needs</option>
          </SelectInput>
        </FieldRow>
        <FieldRow label="Description"><TextInput placeholder="Optional purpose of this tier..." /></FieldRow>
      </div>
    </ModalShell>
  );
}

export default function Students() {
  const [showSettings, setShowSettings] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, type: '' });

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 overflow-hidden text-sm text-slate-700">
      
      {/* Action Bar */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <Link to="/students/new" className="bg-primary hover:bg-primary/90 text-white px-4 py-1.5 rounded-md text-sm font-semibold tracking-wide shadow-sm transition no-underline">
            New Student
          </Link>
          <div className="flex items-center gap-2 relative">
            <h1 className="text-base font-semibold text-slate-800">Students</h1>
            <Settings 
              className={`w-4 h-4 cursor-pointer transition-colors ${showSettings ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`} 
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
                      <button className="w-full px-4 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-primary flex items-center gap-2 transition-colors">
                        <Users size={14} className="text-slate-400" />
                        Import Students
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button className="w-full px-4 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-primary flex items-center gap-2 transition-colors">
                        <BarChart2 size={14} className="text-slate-400" />
                        Export to Excel
                      </button>
                      <button className="w-full px-4 py-2 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-primary flex items-center gap-2 transition-colors">
                        <BarChart2 size={14} className="text-slate-400" />
                        Export to PDF
                      </button>
                    </motion.div>
                  </>
                )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Search */}
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden focus-within:border-primary/60">
            <div className="flex items-center px-3 py-1.5">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search students..."
                className="w-52 text-sm bg-transparent focus:outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="px-2 py-2 border-l border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer">
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <span>1-10 / 45</span>
            <button className="p-1 hover:bg-slate-100 rounded">
              <ChevronLeft size={16} />
            </button>
            <button className="p-1 hover:bg-slate-100 rounded">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* View Switch */}
          <div className="flex items-center border border-slate-300 rounded-md overflow-hidden bg-white shadow-sm">
            <button className="p-2 hover:bg-slate-50 text-slate-400">
              <Grid size={16} />
            </button>
            <button className="p-2 bg-slate-50 text-primary border-x border-slate-300">
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
        {/* Left Sidebar - Classes Hierarchy */}
        <aside className="w-56 border-r border-slate-100 p-3 bg-white overflow-y-auto">
          <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <LayoutIcon className="w-3 h-3 text-primary" /> CLASSES
          </h2>
          
          <nav className="space-y-0.5">
            <div className="mb-1">
              <button 
                className="w-full flex items-center justify-between px-2 py-1 rounded cursor-pointer text-xs transition-all bg-primary/5 text-primary font-semibold"
              >
                <span>All Classes</span>
                <span className="text-[10px] font-medium text-primary">890</span>
              </button>
            </div>
            {classHierarchy.map((level, idx) => (
              <TreeItem 
                key={idx} 
                item={level} 
                onAddClass={() => setModal({ isOpen: true, type: 'class' })}
              />
            ))}
          </nav>

          <div className="mt-8 p-3 rounded bg-slate-50 border border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Management</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setModal({ isOpen: true, type: 'class' })}
                className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded hover:border-primary/30 transition-all group"
              >
                <PlusCircle size={13} className="text-primary mb-1" />
                <span className="text-[9px] font-bold text-slate-500 uppercase">Class</span>
              </button>
              <button 
                onClick={() => setModal({ isOpen: true, type: 'level' })}
                className="flex flex-col items-center justify-center p-2 bg-white border border-slate-200 rounded hover:border-accent/30 transition-all group"
              >
                <PlusCircle size={13} className="text-accent mb-1" />
                <span className="text-[9px] font-bold text-slate-500 uppercase">Level</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Table Content */}
        <div className="flex-1 overflow-auto bg-gray-100">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-slate-200 text-slate-800 text-[11px] font-bold bg-white sticky top-0 z-10">
                <th className="px-4 py-2 w-10 border-r border-slate-100"><input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/20" /></th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Name</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Gender</th>
                <th className="px-4 py-2 border-r border-slate-100 uppercase tracking-wider">Class</th>
                <th className="px-4 py-2 uppercase tracking-wider">Parent/Guardian</th>
              </tr>
            </thead>
            <tbody className="text-[11px]">
              {studentsData.map((stu, index) => (
                <tr key={stu.id} className={`border-b border-slate-200 cursor-pointer transition-colors hover:bg-primary/5 ${index % 2 !== 0 ? 'bg-slate-200' : 'bg-white'}`}>
                  <td className="px-4 py-1.5 w-10"><input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary/20" /></td>
                  <td className="px-4 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden shadow-sm border border-primary/20">
                        {stu.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-700">{stu.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-1.5 text-slate-600 font-medium text-center border-x border-slate-100">{stu.gender}</td>
                  <td className="px-4 py-1.5 text-slate-600 font-medium border-r border-slate-100">{stu.class}</td>
                  <td className="px-4 py-1.5 text-slate-600 font-medium">{stu.parent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modal.isOpen && (
          <ModalBackdrop onClose={() => setModal({ isOpen: false, type: '' })}>
            {modal.type === 'class' 
              ? <AddClassModal onClose={() => setModal({ isOpen: false, type: '' })} />
              : <AddLevelModal onClose={() => setModal({ isOpen: false, type: '' })} />
            }
          </ModalBackdrop>
        )}
      </AnimatePresence>
    </div>
  );
}
