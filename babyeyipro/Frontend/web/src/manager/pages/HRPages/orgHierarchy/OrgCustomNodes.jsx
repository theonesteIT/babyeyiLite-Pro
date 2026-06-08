import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Building2, GraduationCap, Crown, ChevronDown, ChevronRight,
  MoreVertical, Eye, Pencil, UserPlus, ArrowRightLeft, TrendingUp, Trash2,
  Users, Briefcase,
} from 'lucide-react';
import { resolveStaffPhotoUrl } from '../hrConstants';
import { formatRwf, initials } from './buildOrgGraph';

const avatarColors = ['bg-amber-500', 'bg-teal-500', 'bg-sky-500', 'bg-violet-500', 'bg-emerald-500'];
const avatarColor = (id) =>
  avatarColors[Math.abs(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarColors.length];

function NodeMenu({ onAction, nodeType }) {
  return (
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <details className="relative">
        <summary className="list-none cursor-pointer p-1 rounded-lg hover:bg-slate-100 text-slate-400">
          <MoreVertical size={14} />
        </summary>
        <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 text-[11px] z-20">
          {[
            { label: 'View Details', icon: Eye, action: 'view' },
            { label: 'Edit', icon: Pencil, action: 'edit' },
            ...(nodeType === 'department' || nodeType === 'position'
              ? [{ label: 'Add Child Position', icon: UserPlus, action: 'add-position' }]
              : []),
            { label: 'Assign Employee', icon: UserPlus, action: 'assign' },
            { label: 'Transfer Employee', icon: ArrowRightLeft, action: 'transfer' },
            { label: 'Promote Employee', icon: TrendingUp, action: 'promote' },
            { label: 'Delete', icon: Trash2, action: 'delete', danger: true },
          ].map(({ label, icon: Icon, action, danger }) => (
            <button
              key={action}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAction?.(action);
              }}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 ${
                danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-600'
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

function StaffAvatar({ emp, size = 'md' }) {
  const photo = resolveStaffPhotoUrl(emp.photo);
  const sz = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';
  if (photo) {
    return <img src={photo} alt={emp.name} className={`${sz} rounded-lg object-cover border border-white shadow`} />;
  }
  return (
    <div className={`${sz} rounded-lg ${avatarColor(emp.id)} flex items-center justify-center text-white font-semibold`}>
      {initials(emp.name)}
    </div>
  );
}

export const LeaderNode = memo(({ data, selected }) => (
  <div
    className={`group relative bg-white rounded-2xl border-2 shadow-lg px-4 py-3 min-w-[220px] transition-all ${
      selected ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30' : 'border-[#000435]'
    }`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#000435]" />
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-[#000435] flex items-center justify-center shrink-0">
        <Crown size={22} className="text-[#F59E0B]" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Executive</p>
        <p className="text-sm font-semibold text-[#000435]">{data.label}</p>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-[#000435]" />
  </div>
));

export const HeadNode = memo(({ data, selected }) => (
  <div
    className={`group relative bg-white rounded-2xl border-2 shadow-md px-4 py-3 min-w-[200px] transition-all ${
      selected ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30' : 'border-[#000435]/80'
    }`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#000435]" />
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-[#000435]/10 flex items-center justify-center">
        <GraduationCap size={18} className="text-[#000435]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#000435]">{data.label}</p>
        <p className="text-[10px] text-slate-500">Reports to {data.reportsTo}</p>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-[#000435]" />
  </div>
));

export const DepartmentNode = memo(({ data, selected }) => (
  <div
    className={`group relative bg-white rounded-2xl border-2 shadow-md min-w-[240px] overflow-hidden transition-all cursor-pointer ${
      selected ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30' : 'border-[#000435]/70 hover:border-[#000435]'
    }`}
  >
    <Handle type="target" position={Position.Top} className="!bg-[#000435]" />
    <NodeMenu nodeType="department" onAction={data.onMenuAction} />

    <div className="px-4 pt-4 pb-2 text-center border-b border-slate-100">
      <div className="w-10 h-10 mx-auto rounded-xl bg-[#F59E0B]/15 flex items-center justify-center mb-2">
        <Building2 size={18} className="text-[#F59E0B]" />
      </div>
      <p className="text-sm font-semibold text-[#000435] leading-tight">{data.name}</p>
      <p className="text-[10px] text-slate-500 mt-1">
        Head: <span className="font-medium text-slate-700">{data.head}</span>
      </p>
    </div>

    <div className="grid grid-cols-3 gap-1 px-3 py-2 text-center text-[10px]">
      <div>
        <p className="font-bold text-[#F59E0B] tabular-nums">{data.staffCount}</p>
        <p className="text-slate-400 uppercase tracking-wide">Staff</p>
      </div>
      <div>
        <p className="font-bold text-[#000435] tabular-nums">{data.positions?.length || 0}</p>
        <p className="text-slate-400 uppercase tracking-wide">Roles</p>
      </div>
      <div>
        <p className={`font-bold tabular-nums ${data.vacancies ? 'text-red-500' : 'text-emerald-600'}`}>
          {data.vacancies || 0}
        </p>
        <p className="text-slate-400 uppercase tracking-wide">Vacant</p>
      </div>
    </div>

    <div className="px-3 pb-2">
      <p className="text-[9px] text-slate-400 text-center">{formatRwf(data.payroll)}/mo</p>
    </div>

    <div className="flex border-t border-slate-100">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onView?.();
        }}
        className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#000435] hover:bg-slate-50"
      >
        View
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onEdit?.();
        }}
        className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide text-[#F59E0B] hover:bg-amber-50 border-l border-slate-100"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onToggleExpand?.();
        }}
        className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50 border-l border-slate-100 flex items-center justify-center gap-0.5"
      >
        {data.expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {data.expanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-[#000435]" />
  </div>
));

export const PositionNode = memo(({ data, selected }) => {
  const vacant = !data.members?.length;
  return (
    <div
      className={`group relative bg-white rounded-xl border shadow-sm min-w-[200px] transition-all ${
        selected ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30' : vacant ? 'border-red-200' : 'border-slate-200'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-[#000435]" />
      <NodeMenu nodeType="position" onAction={data.onMenuAction} />

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase size={14} className="text-[#F59E0B] shrink-0" />
            <p className="text-xs font-semibold text-[#000435] truncate">{data.title}</p>
          </div>
          {vacant && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-red-100 text-red-600 text-[8px] font-bold uppercase">
              Vacant
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          Reports to: <span className="text-slate-700">{data.reportsTo}</span>
        </p>
        <div className="flex items-center justify-between mt-2 text-[10px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Users size={10} /> {data.members?.length || 0} assigned
          </span>
          {vacant && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onRecruit?.();
              }}
              className="text-red-600 font-semibold hover:underline"
            >
              Recruit
            </button>
          )}
        </div>
      </div>

      {!vacant && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleExpand?.();
          }}
          className="w-full py-1.5 border-t border-slate-100 text-[9px] font-semibold uppercase text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-1"
        >
          {data.expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          {data.expanded ? 'Hide staff' : 'Show staff'}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  );
});

export const EmployeeNode = memo(({ data, selected }) => (
  <div
    className={`group relative bg-white rounded-xl border shadow-sm min-w-[180px] transition-all ${
      selected ? 'border-[#F59E0B] ring-2 ring-[#F59E0B]/30' : 'border-slate-200 hover:border-[#000435]/30'
    }`}
  >
    <Handle type="target" position={Position.Top} className="!bg-slate-400" />
    <NodeMenu nodeType="employee" onAction={data.onMenuAction} />

    <div className="p-3 flex items-center gap-2.5">
      <StaffAvatar emp={data} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#000435] truncate">{data.name}</p>
        <p className="text-[10px] text-[#F59E0B] truncate">{data.positionTitle || data.position}</p>
        <span
          className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
            (data.status || 'Active') === 'Active'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {data.status || 'Active'}
        </span>
      </div>
    </div>

    <div className="flex border-t border-slate-100 text-[9px] font-semibold uppercase">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onProfile?.();
        }}
        className="flex-1 py-1.5 text-[#000435] hover:bg-slate-50"
      >
        Profile
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onTransfer?.();
        }}
        className="flex-1 py-1.5 text-slate-500 hover:bg-slate-50 border-l border-slate-100"
      >
        Transfer
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          data.onPromote?.();
        }}
        className="flex-1 py-1.5 text-[#F59E0B] hover:bg-amber-50 border-l border-slate-100"
      >
        Promote
      </button>
    </div>
  </div>
));

export const nodeTypes = {
  leader: LeaderNode,
  head: HeadNode,
  department: DepartmentNode,
  position: PositionNode,
  employee: EmployeeNode,
};
