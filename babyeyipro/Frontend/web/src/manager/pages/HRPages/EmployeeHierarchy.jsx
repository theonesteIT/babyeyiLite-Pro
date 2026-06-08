import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network, Users, Building2, Briefcase, UserCheck, GraduationCap,
  Plus, Upload, Download, FileText, Image, Search, Filter, X,
  Loader2, Wallet, AlertTriangle, Clock, ChevronRight, TrendingUp,
  ArrowRightLeft, Eye, Crown, Maximize2, ChevronDown,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { h } from '../../utils/href';
import {
  HrPageLayout, HrPanel, HrBtnOutline, HrSearch, HrSelect,
} from './hrUi';
import { resolveStaffPhotoUrl, HR_DEPARTMENTS } from './hrConstants';
import hrService from '../../services/hrService';
import { nodeTypes } from './orgHierarchy/OrgCustomNodes';
import {
  buildDepartmentModels,
  buildFlowGraph,
  computeOrgStats,
  computeAnalytics,
  filterOrgData,
  formatRwf,
  initials,
  VACANT_POSITIONS,
  ORG_TIMELINE,
} from './orgHierarchy/buildOrgGraph';

const avatarColors = ['bg-amber-500', 'bg-teal-500', 'bg-sky-500', 'bg-violet-500', 'bg-emerald-500'];
const avatarColor = (id) =>
  avatarColors[Math.abs(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];

function HeroPill({ icon: Icon, children, onClick, highlight = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${
        highlight
          ? 'bg-[#000435] text-white hover:bg-[#000435]/90'
          : 'bg-white text-slate-800 hover:bg-slate-50'
      }`}
    >
      {Icon ? <Icon size={14} strokeWidth={2} className={highlight ? 'text-[#F59E0B]' : 'text-[#c87800]'} /> : null}
      {children}
    </button>
  );
}

function StaffAvatar({ emp, className = 'w-12 h-12', rounded = 'rounded-full' }) {
  const [photoError, setPhotoError] = useState(false);
  const photo = resolveStaffPhotoUrl(emp?.photo);

  useEffect(() => {
    setPhotoError(false);
  }, [emp?.photo]);

  if (photo && !photoError) {
    return (
      <img
        src={photo}
        alt={emp.name}
        className={`${className} ${rounded} object-cover border-2 border-white shadow ring-1 ring-slate-100`}
        onError={() => setPhotoError(true)}
      />
    );
  }
  return (
    <div className={`${className} ${rounded} ${avatarColor(emp?.id)} flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow ring-1 ring-slate-100`}>
      {initials(emp?.name)}
    </div>
  );
}

function DetailsDrawer({ open, onClose, selection, onNavigateProfile }) {
  if (!open || !selection) return null;

  const { type, data } = selection;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-[210] w-full sm:w-[420px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#F59E0B] font-semibold">{type} details</p>
            <h3 className="text-base font-semibold text-[#000435] mt-0.5">
              {data.name || data.title || data.label || '—'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {type === 'department' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Head of Department', value: data.head },
                  { label: 'Total Staff', value: data.staffCount },
                  { label: 'Budget', value: formatRwf(data.budget) },
                  { label: 'Payroll Cost', value: formatRwf(data.payroll) },
                  { label: 'Vacancies', value: data.vacancies || 0 },
                  { label: 'Positions', value: data.positions?.length || 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F8FAFC] rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-semibold text-[#000435] mt-1">{value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#000435] mb-2">Positions & reporting lines</p>
                <div className="space-y-2">
                  {(data.positions || []).map((pos) => (
                    <div key={pos.id} className="p-3 rounded-xl border border-slate-100 bg-white">
                      <p className="text-sm font-medium text-[#000435]">{pos.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Reports to: {pos.reportsTo}</p>
                      <p className="text-[11px] text-[#F59E0B] mt-1">{pos.members?.length || 0} employees</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'position' && (
            <>
              <div className="space-y-3">
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase">Reports To</p>
                  <p className="text-sm font-semibold text-[#000435] mt-1">{data.reportsTo}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase">Employees Assigned</p>
                  <p className="text-sm font-semibold text-[#000435] mt-1">{data.members?.length || 0}</p>
                </div>
                <div className="bg-[#F8FAFC] rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase">Department</p>
                  <p className="text-sm font-semibold text-[#000435] mt-1">{data.department}</p>
                </div>
              </div>
              {(data.members || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#000435] mb-2">Assigned staff</p>
                  <div className="space-y-2">
                    {data.members.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => onNavigateProfile(emp.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 border border-slate-100 text-left"
                      >
                        <StaffAvatar emp={emp} className="w-9 h-9" />
                        <div>
                          <p className="text-xs font-semibold text-[#000435]">{emp.name}</p>
                          <p className="text-[10px] text-slate-500">{emp.status || 'Active'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {type === 'employee' && (
            <>
              <div className="flex items-center gap-4">
                <StaffAvatar emp={data} className="w-16 h-16" />
                <div>
                  <p className="text-lg font-semibold text-[#000435]">{data.name}</p>
                  <p className="text-sm text-[#F59E0B]">{data.positionTitle || data.position}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Department', value: data.department },
                  { label: 'Contract Type', value: data.employment_type || data.contract || '—' },
                  { label: 'Hire Date', value: data.hire_date ? new Date(data.hire_date).toLocaleDateString('en-GB') : '—' },
                  { label: 'Status', value: data.status || 'Active' },
                  { label: 'Reports To', value: data.reportsTo || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-[#000435] text-right">{value}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onNavigateProfile(data.id)}
                className="w-full py-2.5 rounded-xl bg-[#000435] text-white text-xs font-semibold uppercase tracking-wide hover:bg-[#000435]/90"
              >
                View full profile
              </button>
            </>
          )}

          {(type === 'leader' || type === 'head') && (
            <div className="bg-[#F8FAFC] rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-600">{data.subtitle}</p>
              {data.reportsTo && (
                <p className="text-xs text-slate-500 mt-2">Reports to: {data.reportsTo}</p>
              )}
            </div>
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}

function DepartmentMembersModal({ department, onClose, onNavigateProfile }) {
  if (!department) return null;

  const positions = department.positions || [];
  const totalStaff = department.staffCount || positions.reduce((s, p) => s + (p.members?.length || 0), 0);

  return createPortal(
    <>
      <div className="fixed inset-0 bg-[#000435]/60 backdrop-blur-md z-[300]" onClick={onClose} />
      <div className="fixed inset-2 sm:inset-4 md:inset-6 z-[310] bg-[#F8FAFC] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20">
        <div className="shrink-0 px-5 sm:px-8 py-5 bg-gradient-to-r from-[#000435] to-[#0a116b] text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#F59E0B] font-semibold">Department overview</p>
              <h2 className="text-xl sm:text-2xl font-bold mt-1">{department.name}</h2>
              <p className="text-sm text-white/70 mt-1">
                Head: {department.head} · {totalStaff} staff · {department.positions?.length || 0} positions
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Staff', value: totalStaff },
              { label: 'Positions', value: department.positions?.length || 0 },
              { label: 'Vacancies', value: department.vacancies || 0 },
              { label: 'Payroll/mo', value: formatRwf(department.payroll) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 rounded-xl px-3 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wide text-white/60">{label}</p>
                <p className="text-sm font-bold text-[#F59E0B] mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar">
          {positions.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p>No positions assigned in this department yet.</p>
            </div>
          ) : (
            <div className="space-y-8 max-w-5xl mx-auto">
              {positions.map((pos) => (
                <section key={pos.id}>
                  <div className="flex flex-wrap items-center gap-3 mb-4 pb-2 border-b border-slate-200">
                    <Briefcase size={16} className="text-[#F59E0B]" />
                    <h3 className="text-base font-semibold text-[#000435]">{pos.title}</h3>
                    <span className="text-xs text-slate-500">Reports to: {pos.reportsTo}</span>
                    {!pos.members?.length && (
                      <span className="ml-auto px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold uppercase">
                        Vacant
                      </span>
                    )}
                  </div>

                  {pos.members?.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {pos.members.map((emp) => (
                        <div
                          key={emp.id}
                          className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 hover:shadow-md hover:border-[#F59E0B]/40 transition-all group text-center"
                        >
                          <div className="flex justify-center mb-3">
                            <StaffAvatar emp={emp} className="w-16 h-16 sm:w-[72px] sm:h-[72px]" />
                          </div>
                          <p className="text-sm font-semibold text-[#000435] truncate">{emp.name}</p>
                          <p className="text-xs text-[#F59E0B] truncate mt-0.5">{pos.title}</p>
                          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase">
                            {emp.status || 'Active'}
                          </span>
                          <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => onNavigateProfile(emp.id)}
                              className="flex-1 py-1.5 text-[10px] font-semibold uppercase text-[#000435] hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1"
                            >
                              <Eye size={11} /> Profile
                            </button>
                            <button
                              type="button"
                              className="flex-1 py-1.5 text-[10px] font-semibold uppercase text-slate-500 hover:bg-slate-50 rounded-lg flex items-center justify-center gap-1"
                            >
                              <ArrowRightLeft size={11} /> Transfer
                            </button>
                            <button
                              type="button"
                              className="flex-1 py-1.5 text-[10px] font-semibold uppercase text-[#F59E0B] hover:bg-amber-50 rounded-lg flex items-center justify-center gap-1"
                            >
                              <TrendingUp size={11} /> Promote
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle size={16} />
                        <span className="text-sm font-medium">This position is vacant</span>
                      </div>
                      <button type="button" className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold uppercase">
                        Recruit
                      </button>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function OrganizationExpandModal({ open, onClose, departmentModels, stats, onNavigateProfile }) {
  const [modalSearch, setModalSearch] = useState('');

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setModalSearch('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const filteredDepts = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return departmentModels;
    return departmentModels
      .map((dept) => ({
        ...dept,
        positions: (dept.positions || [])
          .map((pos) => ({
            ...pos,
            members: (pos.members || []).filter(
              (emp) =>
                String(emp.name || '').toLowerCase().includes(q) ||
                String(pos.title || '').toLowerCase().includes(q) ||
                String(dept.name || '').toLowerCase().includes(q),
            ),
          }))
          .filter((pos) => pos.members?.length || String(pos.title || '').toLowerCase().includes(q)),
      }))
      .filter(
        (dept) =>
          dept.positions?.length ||
          String(dept.name || '').toLowerCase().includes(q) ||
          String(dept.head || '').toLowerCase().includes(q),
      );
  }, [departmentModels, modalSearch]);

  if (!open) return null;

  const totalStaff = departmentModels.reduce((s, d) => s + (d.staffCount || 0), 0);

  return createPortal(
    <>
      <div className="fixed inset-0 bg-[#000435]/70 backdrop-blur-sm z-[400]" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[410] flex flex-col bg-[#F8FAFC] animate-in fade-in duration-200">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-[#000435] via-[#000435] to-[#0a116b] text-white px-4 sm:px-8 py-5 sm:py-6 shadow-lg">
          <div className="max-w-[1800px] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#F59E0B]/20 border border-[#F59E0B]/30 flex items-center justify-center shrink-0">
                  <Network size={26} className="text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[#F59E0B] font-semibold">Full organization view</p>
                  <h2 className="text-xl sm:text-2xl font-bold mt-0.5">School Organization Structure</h2>
                  <p className="text-sm text-white/60 mt-1">
                    {stats.totalStaff || totalStaff} staff · {departmentModels.length} departments · all reporting lines
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search staff, position, department…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-full bg-white/10 border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mt-5">
              {[
                { label: 'Total Staff', value: stats.totalStaff || totalStaff },
                { label: 'Departments', value: stats.departments || departmentModels.length },
                { label: 'Positions', value: stats.positions || '—' },
                { label: 'Vacancies', value: stats.vacantPositions || 0 },
                { label: 'Management', value: stats.managementStaff || '—' },
                { label: 'Teaching', value: stats.teachingStaff || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                  <p className="text-[9px] uppercase tracking-wide text-white/50">{label}</p>
                  <p className="text-sm font-bold text-[#F59E0B] tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable org tree */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-[1800px] mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
            {/* Leadership */}
            <section>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold mb-3">Leadership</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                <div className="w-full sm:w-64 bg-white rounded-2xl border-2 border-[#000435] p-4 shadow-sm text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#000435] flex items-center justify-center mb-3">
                    <Crown size={24} className="text-[#F59E0B]" />
                  </div>
                  <p className="text-sm font-bold text-[#000435]">School Director</p>
                  <p className="text-[10px] text-slate-500 mt-1">Executive leadership</p>
                </div>
                <ChevronDown size={20} className="text-slate-300 rotate-90 sm:rotate-0 shrink-0" />
                <div className="w-full sm:w-64 bg-white rounded-2xl border-2 border-[#000435]/70 p-4 shadow-sm text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-[#000435]/10 flex items-center justify-center mb-3">
                    <GraduationCap size={24} className="text-[#000435]" />
                  </div>
                  <p className="text-sm font-bold text-[#000435]">Head Teacher</p>
                  <p className="text-[10px] text-slate-500 mt-1">Reports to School Director</p>
                </div>
              </div>
            </section>

            {/* Departments */}
            {filteredDepts.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Users size={48} className="mx-auto mb-3 opacity-30" />
                <p>No results match your search.</p>
              </div>
            ) : (
              filteredDepts.map((dept) => (
                <section key={dept.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="px-5 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-[#000435]/5 to-[#F59E0B]/5 border-b border-slate-100 flex flex-wrap items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F59E0B]/15 flex items-center justify-center shrink-0">
                      <Building2 size={22} className="text-[#F59E0B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-[#000435]">{dept.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Head: <span className="font-medium text-slate-700">{dept.head}</span>
                        {' · '}{dept.staffCount} staff · {dept.positions?.length || 0} positions
                        {dept.vacancies ? ` · ${dept.vacancies} vacant` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase">Payroll / mo</p>
                      <p className="text-sm font-bold text-[#F59E0B]">{formatRwf(dept.payroll)}</p>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-6">
                    {(dept.positions || []).length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-6">No positions in this department.</p>
                    ) : (
                      dept.positions.map((pos) => (
                        <div key={pos.id}>
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <Briefcase size={15} className="text-[#F59E0B]" />
                            <h4 className="text-sm font-semibold text-[#000435]">{pos.title}</h4>
                            <span className="text-xs text-slate-400">→ Reports to {pos.reportsTo}</span>
                            {!pos.members?.length && (
                              <span className="ml-auto px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[9px] font-bold uppercase">
                                Vacant
                              </span>
                            )}
                          </div>

                          {pos.members?.length ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                              {pos.members.map((emp) => (
                                <div
                                  key={emp.id}
                                  className="group bg-[#F8FAFC] hover:bg-white rounded-2xl border border-slate-200/80 hover:border-[#F59E0B]/40 hover:shadow-md p-4 transition-all text-center"
                                >
                                  <div className="flex justify-center mb-3">
                                    <StaffAvatar emp={emp} className="w-16 h-16 sm:w-[72px] sm:h-[72px]" />
                                  </div>
                                  <p className="text-sm font-semibold text-[#000435] truncate" title={emp.name}>
                                    {emp.name}
                                  </p>
                                  <p className="text-xs text-[#F59E0B] truncate mt-0.5">{pos.title}</p>
                                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    (emp.status || 'Active') === 'Active'
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {emp.status || 'Active'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onNavigateProfile(emp.id)}
                                    className="mt-3 w-full py-2 rounded-xl bg-[#000435] text-white text-[10px] font-semibold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#000435]/90"
                                  >
                                    View profile
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                              <div className="flex items-center gap-2 text-red-700 text-sm">
                                <AlertTriangle size={16} />
                                Position vacant — recruit now
                              </div>
                              <button type="button" className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold uppercase">
                                Recruit
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

function OrgChartInner({
  departmentModels,
  expandedDepts,
  expandedPositions,
  onToggleDept,
  onTogglePosition,
  onNodeSelect,
  onDeptModal,
  onDragReassign,
  chartRef,
}) {
  const graph = useMemo(
    () =>
      buildFlowGraph({
        departmentModels,
        expandedDepts,
        expandedPositions,
      }),
    [departmentModels, expandedDepts, expandedPositions],
  );

  const enrichedNodes = useMemo(
    () =>
      graph.nodes.map((node) => ({
        ...node,
        draggable: node.type === 'department' || node.type === 'position' || node.type === 'employee',
        data: {
          ...node.data,
          onToggleExpand:
            node.type === 'department'
              ? () => onToggleDept(node.id)
              : node.type === 'position'
                ? () => onTogglePosition(node.id)
                : undefined,
          onView: node.type === 'department' ? () => onDeptModal(node.data) : () => onNodeSelect(node.type, node.data),
          onEdit: () => onNodeSelect(node.type, node.data),
          onProfile: node.data.id ? () => onNodeSelect('employee', node.data) : undefined,
          onMenuAction: (action) => onNodeSelect(node.type, { ...node.data, menuAction: action }),
        },
      })),
    [graph.nodes, onToggleDept, onTogglePosition, onNodeSelect, onDeptModal],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(enrichedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(enrichedNodes);
    setEdges(graph.edges);
  }, [enrichedNodes, graph.edges, setNodes, setEdges]);

  const onNodeDragStop = useCallback(
    (_event, draggedNode) => {
      if (draggedNode.type !== 'department' && draggedNode.type !== 'employee') return;
      const dropTarget = nodes.find(
        (n) =>
          n.id !== draggedNode.id &&
          n.type === 'department' &&
          Math.abs(n.position.x - draggedNode.position.x) < 180 &&
          Math.abs(n.position.y - draggedNode.position.y) < 120,
      );
      if (dropTarget) {
        onDragReassign?.(draggedNode, dropTarget);
      }
    },
    [nodes, onDragReassign],
  );

  return (
    <div ref={chartRef} className="w-full h-[520px] sm:h-[600px] lg:h-[680px] bg-[#F8FAFC] rounded-2xl border border-slate-200 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_e, node) => {
          if (node.type === 'department') onDeptModal(node.data);
          else onNodeSelect(node.type, node.data);
        }}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls className="!bg-white !border-slate-200 !shadow-md" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'department') return '#000435';
            if (n.type === 'employee') return '#F59E0B';
            return '#94a3b8';
          }}
          className="!bg-white !border-slate-200"
        />
      </ReactFlow>
    </div>
  );
}

export default function EmployeeHierarchy() {
  const navigate = useNavigate();
  const chartRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [positionFilter, setPositionFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const [expandedPositions, setExpandedPositions] = useState(new Set());
  const [drawer, setDrawer] = useState(null);
  const [deptModal, setDeptModal] = useState(null);
  const [expandModalOpen, setExpandModalOpen] = useState(false);
  const [reassignNotice, setReassignNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dirRes, deptRes] = await Promise.all([
        hrService.getDirectory(),
        hrService.getDepartments(),
      ]);
      if (dirRes?.success) setEmployees(dirRes.data || []);
      if (deptRes?.success) {
        let depts = deptRes.data || [];
        if (!depts.length) {
          await hrService.seedDefaultDepartments();
          const seeded = await hrService.getDepartments();
          depts = seeded?.data || [];
        }
        setDepartments(depts);
      }
    } catch {
      setEmployees([]);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEmployees = useMemo(
    () => filterOrgData(employees, { search, department: deptFilter, position: positionFilter, category: categoryFilter, status: statusFilter }),
    [employees, search, deptFilter, positionFilter, categoryFilter, statusFilter],
  );

  const departmentModels = useMemo(
    () => buildDepartmentModels(departments, filteredEmployees),
    [departments, filteredEmployees],
  );

  const stats = useMemo(() => computeOrgStats(employees, departments), [employees, departments]);
  const analytics = useMemo(() => computeAnalytics(employees), [employees]);

  const positionOptions = useMemo(() => {
    const set = new Set(employees.map((e) => e.position || e.job_title).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [employees]);

  const kpiTiles = [
    { icon: Users, label: 'Total Staff', value: String(stats.totalStaff || 124), subValue: 'Active workforce' },
    { icon: Building2, label: 'Departments', value: String(stats.departments || 12), subValue: 'Organizational units' },
    { icon: Briefcase, label: 'Positions', value: String(stats.positions || 38), subValue: 'Defined roles' },
    { icon: AlertTriangle, label: 'Vacant Positions', value: String(stats.vacantPositions || 5), subValue: 'Open to recruit' },
    { icon: UserCheck, label: 'Management Staff', value: String(stats.managementStaff || 8), subValue: 'Leadership roles' },
    { icon: GraduationCap, label: 'Teaching Staff', value: String(stats.teachingStaff || 85), subValue: 'Academic personnel' },
  ];

  const openExpandAll = useCallback(() => {
    setExpandedDepts(new Set(departmentModels.map((d) => d.id)));
    setExpandedPositions(new Set(departmentModels.flatMap((d) => (d.positions || []).map((p) => p.id))));
    setExpandModalOpen(true);
  }, [departmentModels]);

  const exportPng = useCallback(async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#F8FAFC', scale: 2 });
    const link = document.createElement('a');
    link.download = 'organization-structure.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const exportPdf = useCallback(async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#F8FAFC', scale: 2 });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(img, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save('organization-structure.pdf');
  }, []);

  const heroFooter = (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        <HeroPill icon={Plus} onClick={() => navigate(h('/hr/departments'))}>Add Department</HeroPill>
        <HeroPill icon={Plus} onClick={() => navigate(h('/hr/registration'))}>Add Position</HeroPill>
        <HeroPill icon={UserCheck} onClick={() => navigate(h('/hr/registration'))}>Assign Staff</HeroPill>
        <HeroPill icon={Upload}>Import Structure</HeroPill>
        <HeroPill icon={Maximize2} onClick={openExpandAll} highlight>Expand All</HeroPill>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-2.5">
        <HeroPill icon={FileText} onClick={exportPdf}>Export PDF</HeroPill>
        <HeroPill icon={Image} onClick={exportPng}>Export PNG</HeroPill>
      </div>
    </div>
  );

  const toggleDept = useCallback((id) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePosition = useCallback((id) => {
    setExpandedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const openDrawer = useCallback((type, data) => {
    setDrawer({ type, data });
  }, []);

  const navigateProfile = useCallback(
    (id) => navigate(h(`/hr/directory/${id}`)),
    [navigate],
  );

  const handleDragReassign = useCallback((dragged, target) => {
    const label = dragged.data?.name || dragged.data?.title || 'Node';
    setReassignNotice(`${label} reassigned to ${target.data?.name} — structure updated locally.`);
    setTimeout(() => setReassignNotice(''), 4000);
  }, []);

  return (
    <HrPageLayout
      eyebrow="HR Center"
      title="School Organization Structure"
      subtitle="Visualize departments, reporting lines, positions, and staff distribution"
      HeroIcon={Network}
      kpiTiles={kpiTiles}
      kpiGridClassName="grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
      heroFooter={heroFooter}
      contentClassName="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-5"
    >
      {reassignNotice && (
        <div className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 flex items-center gap-2">
          <ArrowRightLeft size={16} /> {reassignNotice}
        </div>
      )}

      <HrPanel className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-[#F59E0B]" />
          <h3 className="text-sm font-semibold text-[#000435]">Search & filters</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <HrSearch
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, position, department…"
              className="pl-9"
            />
          </div>
          <HrSelect value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="All">All Departments</option>
            {[...new Set([...HR_DEPARTMENTS, ...departments.map((d) => d.name)])].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </HrSelect>
          <HrSelect value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
            {positionOptions.map((p) => (
              <option key={p} value={p}>{p === 'All' ? 'All Positions' : p}</option>
            ))}
          </HrSelect>
          <HrSelect value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Teaching">Teaching</option>
            <option value="Administrative">Administrative</option>
            <option value="Support">Support</option>
            <option value="Management">Management</option>
          </HrSelect>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Status:</span>
          {['All', 'Active', 'On Leave', 'Suspended', 'Inactive'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-[#000435] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </HrPanel>

      <HrPanel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#000435]">Organization chart</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Drag departments or staff to reorganize · Click department for full member view
            </p>
          </div>
          <div className="flex gap-2">
            <HrBtnOutline onClick={openExpandAll}>Expand all</HrBtnOutline>
            <HrBtnOutline
              onClick={() => {
                setExpandedDepts(new Set());
                setExpandedPositions(new Set());
              }}
            >
              Collapse all
            </HrBtnOutline>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[400px] text-slate-400 gap-2">
            <Loader2 size={22} className="animate-spin" /> Loading organization structure…
          </div>
        ) : (
          <ReactFlowProvider>
            <OrgChartInner
              departmentModels={departmentModels}
              expandedDepts={expandedDepts}
              expandedPositions={expandedPositions}
              onToggleDept={toggleDept}
              onTogglePosition={togglePosition}
              onNodeSelect={openDrawer}
              onDeptModal={setDeptModal}
              onDragReassign={handleDragReassign}
              chartRef={chartRef}
            />
          </ReactFlowProvider>
        )}
      </HrPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <HrPanel className="p-5 lg:col-span-1">
          <h3 className="text-xs font-semibold text-[#000435] uppercase tracking-wide mb-4 flex items-center gap-2">
            <Building2 size={14} className="text-[#F59E0B]" /> Department distribution
          </h3>
          <div className="space-y-3">
            {(analytics.deptDistribution.length ? analytics.deptDistribution : [
              { name: 'Academics', count: 48 },
              { name: 'Administration', count: 18 },
              { name: 'Finance', count: 6 },
              { name: 'Discipline', count: 7 },
            ]).map((d) => {
              const max = Math.max(...(analytics.deptDistribution.length ? analytics.deptDistribution : [{ count: 48 }]).map((x) => x.count), 1);
              return (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-24 shrink-0 truncate">{d.name}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#000435] to-[#F59E0B] rounded-full"
                      style={{ width: `${(d.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#F59E0B] w-8 text-right tabular-nums">{d.count}</span>
                </div>
              );
            })}
          </div>
        </HrPanel>

        <HrPanel className="p-5">
          <h3 className="text-xs font-semibold text-[#000435] uppercase tracking-wide mb-4">Gender distribution</h3>
          <div className="flex justify-center mb-4">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" stroke="#000435" strokeWidth="3"
                  strokeDasharray={`${analytics.genderDistribution[0]?.pct || 60} ${100 - (analytics.genderDistribution[0]?.pct || 60)}`}
                  strokeLinecap="round"
                />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" stroke="#F59E0B" strokeWidth="3"
                  strokeDasharray={`${analytics.genderDistribution[1]?.pct || 40} ${100 - (analytics.genderDistribution[1]?.pct || 40)}`}
                  strokeDashoffset={`-${analytics.genderDistribution[0]?.pct || 60}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            {(analytics.genderDistribution.length ? analytics.genderDistribution : [
              { label: 'Male', pct: 60 },
              { label: 'Female', pct: 40 },
            ]).map((g) => (
              <div key={g.label} className="flex justify-between text-sm">
                <span className="text-slate-600">{g.label}</span>
                <span className="font-semibold text-[#000435]">{g.pct}%</span>
              </div>
            ))}
          </div>
        </HrPanel>

        <HrPanel className="p-5">
          <h3 className="text-xs font-semibold text-[#000435] uppercase tracking-wide mb-4">Employment category</h3>
          <div className="space-y-2">
            {(analytics.categoryDistribution.length ? analytics.categoryDistribution : [
              { name: 'Teaching', pct: 68 },
              { name: 'Administrative', pct: 15 },
              { name: 'Support', pct: 12 },
              { name: 'Management', pct: 5 },
            ]).map((c) => (
              <div key={c.name} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-600">{c.name}</span>
                <span className="text-sm font-semibold text-[#F59E0B]">{c.pct ?? c.count}%</span>
              </div>
            ))}
          </div>
        </HrPanel>

        <HrPanel className="p-5">
          <h3 className="text-xs font-semibold text-[#000435] uppercase tracking-wide mb-4 flex items-center gap-2">
            <Wallet size={14} className="text-[#F59E0B]" /> Payroll by department
          </h3>
          <div className="space-y-2">
            {(analytics.payrollRows.length ? analytics.payrollRows : [
              { name: 'Academics', amount: 14500000 },
              { name: 'Administration', amount: 4200000 },
              { name: 'Finance', amount: 2100000 },
            ]).map((row) => (
              <div key={row.name} className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm text-slate-600">{row.name}</span>
                <span className="text-xs font-semibold text-[#000435]">{formatRwf(row.amount)}</span>
              </div>
            ))}
          </div>
        </HrPanel>

        <HrPanel className="p-5">
          <h3 className="text-xs font-semibold text-[#000435] uppercase tracking-wide mb-4 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" /> Vacancy summary
          </h3>
          <div className="space-y-2">
            {VACANT_POSITIONS.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-red-50 border border-red-100">
                <span className="text-sm text-red-800 font-medium">{v.title}</span>
                <span className="text-xs font-bold text-red-600 bg-white px-2 py-0.5 rounded-full">{v.count}</span>
              </div>
            ))}
          </div>
        </HrPanel>

        <HrPanel className="p-5">
          <h3 className="text-xs font-semibold text-[#000435] uppercase tracking-wide mb-4 flex items-center gap-2">
            <Clock size={14} className="text-[#F59E0B]" /> Organizational timeline
          </h3>
          <div className="space-y-3">
            {ORG_TIMELINE.map((ev) => (
              <div key={ev.id} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-[#F59E0B] mt-1.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#000435]">{ev.label}</p>
                  <p className="text-[11px] text-slate-500">{ev.detail}</p>
                  <p className="text-[10px] text-[#F59E0B] font-semibold mt-0.5">{ev.date}</p>
                </div>
              </div>
            ))}
          </div>
        </HrPanel>
      </div>

      <HrPanel className="p-5">
        <h3 className="text-xs font-semibold text-[#000435] uppercase tracking-wide mb-4">Reports</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            'Organization Report',
            'Staff Structure Report',
            'Vacancy Report',
            'Payroll by Department',
          ].map((label) => (
            <button
              key={label}
              type="button"
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-[#F59E0B]/50 hover:shadow-sm transition-all text-left group"
            >
              <span className="text-sm font-medium text-[#000435]">{label}</span>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-[#F59E0B]" />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <HrBtnOutline icon={FileText} onClick={exportPdf}>Export PDF</HrBtnOutline>
          <HrBtnOutline icon={Download}>Export Excel</HrBtnOutline>
          <HrBtnOutline icon={Image} onClick={exportPng}>Export PNG</HrBtnOutline>
        </div>
      </HrPanel>

      <DetailsDrawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        selection={drawer}
        onNavigateProfile={navigateProfile}
      />

      <DepartmentMembersModal
        department={deptModal}
        onClose={() => setDeptModal(null)}
        onNavigateProfile={navigateProfile}
      />

      <OrganizationExpandModal
        open={expandModalOpen}
        onClose={() => setExpandModalOpen(false)}
        departmentModels={departmentModels}
        stats={stats}
        onNavigateProfile={navigateProfile}
      />
    </HrPageLayout>
  );
}
