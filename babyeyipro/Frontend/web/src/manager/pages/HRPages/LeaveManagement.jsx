import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar, Plus, Check, X, Download, ChevronDown, Search, RotateCcw,
  Loader2, Users, Clock, CheckCircle, XCircle, CalendarOff, Eye,
} from 'lucide-react';
import {
  HrPageLayout, HrPanel, HrBtnPrimary, HrSearch, HrSelect, HrBadge, statusToBadge,
  HrStatCard, HrHeroAction, HrInput, HrModal, HrBtnOutline,
} from './hrUi';
import { LEAVE_TYPES, HR_DEPARTMENTS } from './hrConstants';
import hrService from '../../services/hrService';
import LeaveRegisterModal from './LeaveRegisterModal';

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function LeaveManagement() {
  const [searchParams] = useSearchParams();
  const preStaffId = searchParams.get('staff') || '';
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, on_leave: 0, annual_balance: 0 });
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState('All');
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('All');
  const [leaveType, setLeaveType] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewReq, setViewReq] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, leaveRes, dirRes] = await Promise.all([
        hrService.getLeaveStats(),
        hrService.getLeaveRequests({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          department: dept !== 'All' ? dept : undefined,
          leave_type: leaveType !== 'All' ? leaveType : undefined,
          staff_user_id: employeeFilter !== 'All' ? employeeFilter : undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          search: search || undefined,
        }),
        hrService.getDirectory(),
      ]);
      if (statsRes?.success) setStats(statsRes.data || {});
      if (leaveRes?.success) setRequests(leaveRes.data || []);
      if (dirRes?.success) setEmployees(dirRes.data || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [search, dept, leaveType, statusFilter, dateFrom, dateTo, employeeFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (preStaffId && employees.length) setShowModal(true);
  }, [preStaffId, employees.length]);

  const tabFiltered = useMemo(() => {
    if (tab === 'All') return requests;
    if (tab === 'Pending Approval') return requests.filter((r) => r.status === 'Pending');
    if (tab === 'Approved') return requests.filter((r) => r.status === 'Approved');
    if (tab === 'Rejected') return requests.filter((r) => r.status === 'Rejected');
    return requests;
  }, [requests, tab]);

  const totalPages = Math.max(1, Math.ceil(tabFiltered.length / rowsPerPage));
  const paginated = tabFiltered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleStatus = async (id, status) => {
    try {
      await hrService.updateLeaveStatus(id, status);
      load();
    } catch {
      /* ignore */
    }
  };

  const clearFilters = () => {
    setSearch('');
    setDept('All');
    setLeaveType('All');
    setStatusFilter('All');
    setDateFrom('');
    setDateTo('');
    setEmployeeFilter('All');
  };

  const tabs = [
    { id: 'All', label: 'All Requests' },
    { id: 'Pending Approval', label: `Pending (${stats.pending || 0})` },
    { id: 'Approved', label: `Approved (${stats.approved || 0})` },
    { id: 'Rejected', label: `Rejected (${stats.rejected || 0})` },
  ];

  return (
    <HrPageLayout
      title="Leave Management"
      subtitle="Manage employee leave requests and balances"
      HeroIcon={Calendar}
      headerRight={
        <div className="flex gap-2">
          <button type="button" className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-[10px] text-white flex items-center gap-1.5 uppercase tracking-wider" style={{ fontWeight: 500 }}>
            <Download size={13} /> Export <ChevronDown size={12} />
          </button>
          <HrHeroAction icon={Plus} onClick={() => setShowModal(true)}>Register leave</HrHeroAction>
        </div>
      }
      contentClassName="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-5"
    >
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <HrStatCard icon={Calendar} label="Total Requests" value={String(stats.total || 0)} sub="All time" iconClass="text-sky-600 bg-sky-50" />
        <HrStatCard icon={Clock} label="Pending" value={String(stats.pending || 0)} sub="Awaiting approval" iconClass="text-orange-600 bg-orange-50" />
        <HrStatCard icon={CheckCircle} label="Approved" value={String(stats.approved || 0)} sub="This year" iconClass="text-emerald-600 bg-emerald-50" />
        <HrStatCard icon={XCircle} label="Rejected" value={String(stats.rejected || 0)} sub="This year" iconClass="text-red-600 bg-red-50" />
        <HrStatCard icon={CalendarOff} label="On Leave" value={String(stats.on_leave || 0)} sub="Currently away" iconClass="text-violet-600 bg-violet-50" />
        <HrStatCard icon={Users} label="Annual Balance" value={String(Math.round(stats.annual_balance || 0))} sub="Days remaining (school)" iconClass="text-amber-600 bg-amber-50" />
      </div>

      <HrPanel className="p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <HrSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leave requests…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <HrSelect value={dept} onChange={(e) => setDept(e.target.value)} className="!w-auto min-w-[140px]">
            <option value="All">All Departments</option>
            {HR_DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </HrSelect>
          <HrSelect value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="!w-auto min-w-[130px]">
            <option value="All">All Leave Types</option>
            {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </HrSelect>
          <HrSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto min-w-[120px]">
            {['All', 'Pending', 'Approved', 'Rejected', 'Draft'].map((s) => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
          </HrSelect>
          <HrInput type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="!w-auto text-xs py-2" />
          <HrInput type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="!w-auto text-xs py-2" />
          <HrSelect value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="!w-auto min-w-[160px]">
            <option value="All">All Employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </HrSelect>
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#c87800] px-2">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </HrPanel>

      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs transition-all ${tab === t.id ? 'bg-[#c87800] text-white' : 'text-slate-500 hover:text-slate-700'}`}
            style={{ fontWeight: 500 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <HrPanel className="overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-xs text-slate-500">
          <span>Showing {tabFiltered.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, tabFiltered.length)} of {tabFiltered.length} entries</span>
          <HrSelect value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} className="!w-auto py-1 text-xs">
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </HrSelect>
        </div>
        {loading ? (
          <div className="flex justify-center py-16 text-slate-400 gap-2"><Loader2 className="animate-spin" size={22} /> Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b bg-slate-50/80">
                  {['Employee', 'Leave Type', 'Duration', 'Leave Dates', 'Status', 'Applied On', 'Actions'].map((c) => (
                    <th key={c} className="text-left px-4 py-3 text-[10px] text-slate-400 uppercase tracking-wide" style={{ fontWeight: 500 }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {paginated.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No leave requests found.</td></tr>
                ) : paginated.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="text-xs text-[#000435]" style={{ fontWeight: 500 }}>{req.employee_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{req.employee_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-[#c87800]" style={{ fontWeight: 500 }}>{req.leave_type_code || req.leave_type}</p>
                      <p className="text-[10px] text-slate-400">{req.department}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{req.total_days} day{req.total_days !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{fmtDate(req.start_date)} → {fmtDate(req.end_date)}</td>
                    <td className="px-4 py-3"><HrBadge variant={statusToBadge(req.status)}>{req.status}</HrBadge></td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(req.applied_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewReq(req)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-[#c87800] text-[10px]"
                          style={{ fontWeight: 600 }}
                          title="View request"
                        >
                          <Eye size={12} /> View
                        </button>
                        {req.status === 'Pending' && (
                          <>
                          <button type="button" onClick={() => handleStatus(req.id, 'Approved')} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100" title="Approve"><Check size={14} /></button>
                          <button type="button" onClick={() => handleStatus(req.id, 'Rejected')} className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Reject"><X size={14} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 py-3 border-t border-slate-100">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} type="button" onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs ${page === p ? 'bg-[#c87800] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{p}</button>
              );
            })}
          </div>
        )}
      </HrPanel>

      <div className="flex justify-end sm:hidden">
        <HrBtnPrimary icon={Plus} onClick={() => setShowModal(true)}>Register leave</HrBtnPrimary>
      </div>

      <LeaveRegisterModal
        open={showModal}
        onClose={() => setShowModal(false)}
        employees={employees}
        onSubmitted={load}
        initialStaffUserId={preStaffId}
      />

      <HrModal
        open={!!viewReq}
        onClose={() => setViewReq(null)}
        title="Leave Request Details"
        wide
        footer={(
          <>
            <HrBtnOutline className="flex-1" onClick={() => setViewReq(null)}>Close</HrBtnOutline>
          </>
        )}
      >
        {viewReq ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-400">Employee</p>
                <p className="text-xs text-[#000435] mt-1" style={{ fontWeight: 600 }}>{viewReq.employee_name}</p>
                <p className="text-[11px] text-slate-500">{viewReq.employee_id} · {viewReq.department || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-400">Leave Type</p>
                <p className="text-xs text-[#000435] mt-1" style={{ fontWeight: 600 }}>{viewReq.leave_type}</p>
                <p className="text-[11px] text-slate-500">{viewReq.total_days} day(s)</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] uppercase text-slate-400">Status</p>
                <p className="mt-1"><HrBadge variant={statusToBadge(viewReq.status)}>{viewReq.status}</HrBadge></p>
                <p className="text-[11px] text-slate-500 mt-1">Applied {fmtDate(viewReq.applied_at)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase text-slate-400 mb-2">Request Summary</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs">
                <p><span className="text-slate-400">Leave dates:</span> <span className="text-slate-700" style={{ fontWeight: 500 }}>{fmtDate(viewReq.start_date)} → {fmtDate(viewReq.end_date)}</span></p>
                <p><span className="text-slate-400">Position:</span> <span className="text-slate-700" style={{ fontWeight: 500 }}>{viewReq.position || '—'}</span></p>
                <p><span className="text-slate-400">Emergency phone:</span> <span className="text-slate-700" style={{ fontWeight: 500 }}>{viewReq.emergency_phone || '—'}</span></p>
                <p><span className="text-slate-400">Alternative contact:</span> <span className="text-slate-700" style={{ fontWeight: 500 }}>{viewReq.alt_contact || '—'}</span></p>
                <p className="sm:col-span-2"><span className="text-slate-400">Address during leave:</span> <span className="text-slate-700" style={{ fontWeight: 500 }}>{viewReq.leave_address || '—'}</span></p>
                <p className="sm:col-span-2"><span className="text-slate-400">Reason:</span> <span className="text-slate-700" style={{ fontWeight: 500 }}>{viewReq.reason || '—'}</span></p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase text-slate-400 mb-2">Documents</p>
              {Array.isArray(viewReq.attachments) && viewReq.attachments.length > 0 ? (
                <div className="space-y-1.5">
                  {viewReq.attachments.map((doc, idx) => (
                    <div key={`${doc}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-700 truncate" style={{ fontWeight: 500 }}>{doc}</p>
                      <span className="text-[10px] text-slate-400">Attached</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No supporting documents attached.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] uppercase text-slate-400 mb-2">Approval Timeline</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-sky-500" />
                  <div>
                    <p className="text-xs text-slate-700" style={{ fontWeight: 600 }}>Request submitted</p>
                    <p className="text-[11px] text-slate-400">{fmtDate(viewReq.applied_at)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className={`mt-1 w-2 h-2 rounded-full ${viewReq.status === 'Approved' ? 'bg-emerald-500' : viewReq.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className="text-xs text-slate-700" style={{ fontWeight: 600 }}>
                      {viewReq.status === 'Pending' ? 'Awaiting approval' : `Request ${viewReq.status.toLowerCase()}`}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {viewReq.status === 'Pending'
                        ? `${viewReq.approver_name || 'HR Manager'} (${viewReq.approver_position || 'HR'})`
                        : `${viewReq.approver_name || 'HR Manager'} (${viewReq.approver_position || 'HR'}) · ${fmtDate(viewReq.updated_at)}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </HrModal>
    </HrPageLayout>
  );
}