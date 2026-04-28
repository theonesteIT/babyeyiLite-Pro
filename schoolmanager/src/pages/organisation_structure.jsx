import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  GraduationCap,
  BookOpen,
  Briefcase,
  ShieldCheck,
  UserCheck,
  Monitor,
  Search,
  Plus,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  UserPlus,
  PlusCircle,
  X,
  Loader2,
  CheckCircle2,
  Building2,
  ChevronRight,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const orgData = {
  id: 1,
  name: 'Dr. John Kalisa',
  role: 'Headmaster (HM)',
  avatar: 'https://i.pravatar.cc/150?u=1',
  status: 'active',
  type: 'root',
  children: [
    {
      id: 2,
      name: 'Academic Department',
      role: 'Core Education Wing',
      type: 'management',
      stat: '2 sub-depts',
      children: [
        {
          id: 4,
          name: 'Mrs. Sarah Uwase',
          role: 'Director of Studies (DOS)',
          avatar: 'https://i.pravatar.cc/150?u=2',
          status: 'active',
          type: 'academic',
          children: [
            {
              id: 7,
              name: 'ICT Department',
              role: 'Technology Hub',
              type: 'hod',
              stat: '3 teachers',
              children: [
                {
                  id: 9,
                  name: 'Mr. Robert Ntaganda',
                  role: 'HOD ICT',
                  avatar: 'https://i.pravatar.cc/150?u=9',
                  status: 'active',
                  type: 'teacher',
                },
                {
                  id: 11,
                  name: 'Mr. David Kagabo',
                  role: 'ICT Teacher',
                  avatar: 'https://i.pravatar.cc/150?u=11',
                  status: 'active',
                  type: 'teacher',
                },
                {
                  id: 17,
                  name: 'Ms. Sonia Uwera',
                  role: 'ICT Teacher',
                  avatar: 'https://i.pravatar.cc/150?u=17',
                  status: 'active',
                  type: 'teacher',
                },
              ],
            },
            {
              id: 8,
              name: 'Literature Department',
              role: 'Humanities & Arts',
              type: 'hod',
              stat: '3 teachers',
              children: [
                {
                  id: 10,
                  name: 'Ms. Diane Umutoni',
                  role: 'HOD Literature',
                  avatar: 'https://i.pravatar.cc/150?u=10',
                  status: 'away',
                  type: 'teacher',
                },
                {
                  id: 12,
                  name: 'Mr. Samuel Bizimana',
                  role: 'Literature Teacher',
                  avatar: 'https://i.pravatar.cc/150?u=12',
                  status: 'active',
                  type: 'teacher',
                },
                {
                  id: 18,
                  name: 'Mrs. Jane Doe',
                  role: 'Literature Teacher',
                  avatar: 'https://i.pravatar.cc/150?u=18',
                  status: 'active',
                  type: 'teacher',
                },
              ],
            },
            {
              id: 13,
              name: 'School Students',
              role: '1000+ Enrolled',
              type: 'students',
              stat: '1000+',
            },
          ],
        },
      ],
    },
    {
      id: 3,
      name: 'Ms. Alice Mukana',
      role: 'Secretary',
      avatar: 'https://i.pravatar.cc/150?u=6',
      status: 'active',
      type: 'admin',
    },
    {
      id: 5,
      name: 'Accounting Dept',
      role: 'Financial Operations',
      type: 'finance',
      stat: '1 staff',
      children: [
        {
          id: 15,
          name: 'Mr. Eric Kayisire',
          role: 'Chief Accountant',
          avatar: 'https://i.pravatar.cc/150?u=15',
          status: 'active',
          type: 'finance',
        },
      ],
    },
    {
      id: 6,
      name: 'Discipline Dept',
      role: 'Student Conduct',
      type: 'discipline',
      stat: '1 staff',
      children: [
        {
          id: 16,
          name: 'Mr. Jean Pierre',
          role: 'Prefect of Discipline',
          avatar: 'https://i.pravatar.cc/150?u=16',
          status: 'active',
          type: 'discipline',
        },
      ],
    },
  ],
};

// ─── Type Config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  root:       { banner: '#7F77DD', iconBg: '#EEEDFE', iconColor: '#3C3489', accent: '#7F77DD' },
  management: { banner: '#1e40af', iconBg: '#dbeafe', iconColor: '#1e40af', accent: '#1e40af' },
  academic:   { banner: '#378ADD', iconBg: '#E6F1FB', iconColor: '#185FA5', accent: '#378ADD' },
  hod:        { banner: '#0f766e', iconBg: '#ccfbf1', iconColor: '#0f766e', accent: '#0f766e' },
  teacher:    { banner: '#639922', iconBg: '#EAF3DE', iconColor: '#3B6D11', accent: '#639922' },
  students:   { banner: '#6d28d9', iconBg: '#ede9fe', iconColor: '#4c1d95', accent: '#6d28d9' },
  discipline: { banner: '#A32D2D', iconBg: '#FCEBEB', iconColor: '#A32D2D', accent: '#A32D2D' },
  finance:    { banner: '#BA7517', iconBg: '#FAEEDA', iconColor: '#854F0B', accent: '#BA7517' },
  admin:      { banner: '#888780', iconBg: '#F1EFE8', iconColor: '#5F5E5A', accent: '#888780' },
};

// Department-type nodes (rendered differently from staff)
const DEPT_TYPES = new Set(['management', 'hod', 'finance', 'discipline', 'students']);

const getIcon = (type, size = 18) => {
  switch (type) {
    case 'students':    return <GraduationCap size={size} />;
    case 'teacher':     return <BookOpen size={size} />;
    case 'discipline':  return <ShieldCheck size={size} />;
    case 'finance':     return <Briefcase size={size} />;
    case 'hod':         return <Monitor size={size} />;
    case 'management':  return <Building2 size={size} />;
    default:            return <UserCheck size={size} />;
  }
};

// ─── Shared Modal UI ──────────────────────────────────────────────────────────

const PRIMARY = '#000435';
const ACCENT  = '#f59e0b';

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

function ModalShell({ title, subtitle, width = 'max-w-lg', onClose, children, footer }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className={`relative bg-white rounded-xl shadow-2xl w-full ${width} flex flex-col overflow-hidden`}
      style={{ maxHeight: '90vh', boxShadow: '0 24px 64px rgba(0,4,53,0.18)' }}
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

// ─── Modals ───────────────────────────────────────────────────────────────────

function AddStaffModal({ onClose, node }) {
  const [source, setSource] = useState('select');
  return (
    <ModalShell title={source === 'select' ? 'Select Existing Staff' : 'Register New Staff'}
      subtitle={`Organisation · Add to ${node.name}`} width="max-w-md" onClose={onClose}
      footer={<><BtnGhost onClick={onClose}>Cancel</BtnGhost><BtnPrimary onClick={onClose} color={PRIMARY}><UserPlus size={13} />{source === 'select' ? 'Add Staff' : 'Register & Add'}</BtnPrimary></>}>
      <div className="space-y-6">
        <div className="flex p-1 bg-slate-100 rounded-lg">
          {['select','create'].map(s => (
            <button key={s} onClick={() => setSource(s)}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${source === s ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {s === 'select' ? 'Select Existing' : 'Create New'}
            </button>
          ))}
        </div>
        {source === 'select' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
              <input type="text" placeholder="Search staff by name or ID..." className="w-full pl-7 py-2 text-sm bg-transparent border-b border-slate-200 focus:outline-none focus:border-[#000435] transition-colors" />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer group transition-all">
                  <div className="flex items-center gap-3">
                    <img src={`https://i.pravatar.cc/150?u=${i+20}`} className="w-8 h-8 rounded-full" alt="" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">Staff Member {i}</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">ID: SM-00{i}</p>
                    </div>
                  </div>
                  <CheckCircle2 size={14} className="text-blue-500 opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <FieldRow label="Full Name" required><TextInput placeholder="e.g. John Doe" /></FieldRow>
            <FieldRow label="Work Email" required><TextInput type="email" placeholder="john@school.com" /></FieldRow>
            <FieldRow label="Position"><TextInput placeholder="e.g. Senior Teacher" /></FieldRow>
            <FieldRow label="Type"><SelectInput><option>Full Time</option><option>Part Time</option><option>Contract</option></SelectInput></FieldRow>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function AddDeptModal({ onClose, node }) {
  return (
    <ModalShell title="Add New Department" subtitle={`Organisation · Sub-unit of ${node.name}`}
      width="max-w-md" onClose={onClose}
      footer={<><BtnGhost onClick={onClose}>Discard</BtnGhost><BtnPrimary onClick={onClose} color={ACCENT}><PlusCircle size={13} className="text-white" /><span className="text-white">Create Department</span></BtnPrimary></>}>
      <div className="space-y-5">
        <FieldRow label="Dept Name" required><TextInput placeholder="e.g. Mathematics Dept" /></FieldRow>
        <FieldRow label="HOD / Lead"><SelectInput><option value="">Select existing staff...</option><option>Mr. Robert Ntaganda</option><option>Ms. Diane Umutoni</option></SelectInput></FieldRow>
        <FieldRow label="Dept Type"><SelectInput><option>Academic</option><option>Administrative</option><option>Discipline</option><option>Finance</option></SelectInput></FieldRow>
        <FieldRow label="Description"><TextInput placeholder="Optional purpose of this unit..." /></FieldRow>
      </div>
    </ModalShell>
  );
}

// ─── Department Card (wider, horizontal layout) ───────────────────────────────

const DeptCard = ({ node, onAddStaff, onAddDept }) => {
  const cfg = TYPE_CONFIG[node.type] || TYPE_CONFIG.admin;
  const isDept = DEPT_TYPES.has(node.type);

  return (
    <div style={{
      width: 220,
      background: '#ffffff',
      borderRadius: 12,
      border: `1px solid ${cfg.accent}22`,
      overflow: 'visible',
      position: 'relative',
      boxShadow: `0 2px 12px ${cfg.accent}18`,
      flexShrink: 0,
    }}>
      {/* Left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0,
        width: 4, borderRadius: '12px 0 0 12px',
        background: cfg.accent,
      }} />

      <div style={{ padding: '16px 14px 16px 18px' }}>
        {/* Top row: name & role */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.25, marginBottom: 2 }}>
            {node.name}
          </div>
          <div style={{ fontSize: 10, color: '#999', lineHeight: 1.3 }}>{node.role}</div>
        </div>

        {/* Stat badge + actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          {node.stat ? (
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              background: cfg.iconBg, color: cfg.iconColor,
              padding: '3px 8px', borderRadius: 20,
            }}>
              {node.stat}
            </span>
          ) : <span />}

          <div style={{ display: 'flex', gap: 5 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onAddStaff(node); }}
              title="Add Staff"
              className="p-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all active:scale-95"
            >
              <UserPlus size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddDept(node); }}
              title="Add Sub-department"
              className="p-1.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all active:scale-95"
            >
              <PlusCircle size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Staff Card (original avatar-banner style) ────────────────────────────────

const StaffCard = ({ node, onAddStaff, onAddDept }) => {
  const cfg = TYPE_CONFIG[node.type] || TYPE_CONFIG.admin;

  return (
    <div style={{
      width: 175,
      background: '#ffffff',
      borderRadius: 10,
      border: '0.5px solid #e2e2e0',
      overflow: 'visible',
      position: 'relative',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      flexShrink: 0,
    }}>
      <div style={{ height: 36, borderRadius: '10px 10px 0 0', background: cfg.banner }} />

      {node.avatar ? (
        <img src={node.avatar} alt={node.name} style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          width: 44, height: 44, borderRadius: '50%', border: '2.5px solid #ffffff', objectFit: 'cover',
        }} />
      ) : (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          width: 44, height: 44, borderRadius: '50%', border: '2.5px solid #ffffff',
          background: cfg.iconBg, color: cfg.iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {getIcon(node.type)}
        </div>
      )}

      {node.status && (
        <div style={{
          position: 'absolute', top: 46, right: 10, width: 9, height: 9,
          borderRadius: '50%', border: '1.5px solid #ffffff', zIndex: 2,
          background: node.status === 'active' ? '#4CAF50' : node.status === 'away' ? '#FFA726' : '#9E9E9E',
        }} />
      )}

      <div style={{ padding: '28px 10px 10px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3, marginBottom: 3 }}>{node.name}</div>
        <div style={{ fontSize: 10, color: '#888', lineHeight: 1.4 }}>{node.role}</div>
      </div>

      <div style={{
        borderTop: '0.5px solid #f0f0ee', padding: '8px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 5, background: '#fafafa', borderRadius: '0 0 10px 10px',
      }}>
        <button onClick={(e) => { e.stopPropagation(); onAddStaff(node); }}
          title="Add Staff"
          className="p-1.5 bg-white hover:bg-slate-50 text-slate-400 border border-slate-100 transition-all rounded-lg active:scale-95">
          <UserPlus size={13} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onAddDept(node); }}
          title="Add Branch"
          className="p-1.5 bg-white hover:bg-slate-50 text-slate-400 border border-slate-100 transition-all rounded-lg active:scale-95">
          <PlusCircle size={13} />
        </button>
      </div>
    </div>
  );
};

// ─── OrgCard dispatcher ───────────────────────────────────────────────────────

const OrgCard = ({ node, onAddStaff, onAddDept }) => {
  // If it has an avatar or isn't a known dept type, it's a person/staff card
  const isPerson = node.avatar || !DEPT_TYPES.has(node.type);
  
  return isPerson
    ? <StaffCard node={node} onAddStaff={onAddStaff} onAddDept={onAddDept} />
    : <DeptCard node={node} onAddStaff={onAddStaff} onAddDept={onAddDept} />;
};

// ─── Tree ─────────────────────────────────────────────────────────────────────

const CONNECTOR = '#d1d0ce';
const V = 32;
const GAP = 20;

// Returns the visual "center offset" of a card for connector alignment
const cardHalfWidth = (node) => {
  const isPerson = node.avatar || !DEPT_TYPES.has(node.type);
  return isPerson ? 88 : 110;
};

const TreeLevel = ({ children, onAddStaff, onAddDept }) => {
  if (!children || children.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {children.length > 1 && (
        <div style={{ position: 'relative', width: '100%', height: 0 }}>
          <div style={{
            position: 'absolute', top: 0,
            left: `calc(${cardHalfWidth(children[0])}px - 0.5px)`,
            right: `calc(${cardHalfWidth(children[children.length - 1])}px - 0.5px)`,
            height: 1, background: CONNECTOR,
          }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
        {children.map((child) => (
          <div key={child.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 1, height: V, background: CONNECTOR }} />
            <OrgCard node={child} onAddStaff={onAddStaff} onAddDept={onAddDept} />
            {child.children?.length > 0 && (
              <>
                <div style={{ width: 1, height: V, background: CONNECTOR }} />
                <TreeLevel children={child.children} onAddStaff={onAddStaff} onAddDept={onAddDept} />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Page Header ──────────────────────────────────────────────────────────────

const PageHeader = () => (
  <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white z-10 flex-shrink-0">
    <div>
      <h1 className="text-base font-bold text-slate-800 leading-tight">Staff &amp; Departments</h1>
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Organisation Structure</p>
    </div>
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
        <Users size={12} />
        <span>4 Departments</span>
      </div>
    </div>
  </div>
);

// ─── Zoom Controls ────────────────────────────────────────────────────────────

const ZoomControls = ({ scale, onZoomIn, onZoomOut, onReset }) => (
  <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-20">
    <div className="flex flex-col bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <button onClick={onZoomIn} className="p-2.5 hover:bg-slate-50 text-slate-500 transition-colors border-b border-slate-100" title="Zoom In"><ZoomIn size={16} /></button>
      <button onClick={onZoomOut} className="p-2.5 hover:bg-slate-50 text-slate-500 transition-colors border-b border-slate-100" title="Zoom Out"><ZoomOut size={16} /></button>
      <button onClick={onReset} className="p-2.5 hover:bg-slate-50 text-slate-500 transition-colors" title="Reset"><RotateCcw size={16} /></button>
    </div>
    <div className="bg-white rounded-lg shadow border border-slate-200 px-3 py-1.5 text-[10px] font-black text-slate-400 text-center uppercase tracking-widest">
      {Math.round(scale * 100)}%
    </div>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────


// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OrganisationStructure() {
  const [scale, setScale] = useState(0.55);
  const [modal, setModal] = useState({ isOpen: false, type: '', node: null });

  const zoomIn    = () => setScale(p => Math.min(p + 0.1, 1.5));
  const zoomOut   = () => setScale(p => Math.max(p - 0.1, 0.2));
  const resetZoom = () => setScale(0.55);

  const openAddStaff = (node) => setModal({ isOpen: true, type: 'staff', node });
  const openAddDept  = (node) => setModal({ isOpen: true, type: 'dept',  node: node || orgData });

  return (
    <div className="flex flex-col h-full bg-[#f7f7f5] overflow-hidden relative">
      <PageHeader onAddDept={() => openAddDept(orgData)} />

      <div className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center">
        <motion.div
          drag
          dragMomentum={false}
          animate={{ scale }}
          style={{ transformOrigin: 'center center', display: 'inline-block', padding: '200px' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="flex flex-col items-center mx-auto">
            <OrgCard node={orgData} onAddStaff={openAddStaff} onAddDept={openAddDept} />
            {orgData.children?.length > 0 && (
              <div style={{ width: 1, height: V, background: CONNECTOR }} />
            )}
            <TreeLevel children={orgData.children} onAddStaff={openAddStaff} onAddDept={openAddDept} />
          </div>
        </motion.div>
      </div>

      <ZoomControls scale={scale} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />

      <AnimatePresence>
        {modal.isOpen && (
          <ModalBackdrop onClose={() => setModal({ ...modal, isOpen: false })}>
            {modal.type === 'staff'
              ? <AddStaffModal node={modal.node} onClose={() => setModal({ ...modal, isOpen: false })} />
              : <AddDeptModal  node={modal.node} onClose={() => setModal({ ...modal, isOpen: false })} />
            }
          </ModalBackdrop>
        )}
      </AnimatePresence>
    </div>
  );
}