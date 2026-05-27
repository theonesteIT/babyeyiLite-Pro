import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Ban, BarChart2, BadgeCheck, Bell, CheckCircle2,
  ChevronDown, ChevronRight, Clock, DollarSign, Filter, Loader2, Lock, Search, Shield, Sliders, Square,
  CheckSquare, TrendingUp, Users, X, XCircle, Eye, Calendar,
  Building2, Wallet, ArrowUpRight, MoreVertical, RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import ManagerOchreHeroShell from '../components/ManagerOchreHeroShell';
import PayrollExportBar from '../../shared/payroll/PayrollExportBar';
import PayrollPaymentTrackerPanel from '../../shared/payroll/PayrollPaymentTrackerPanel';
import PayrollWorkspaceTabs from '../../shared/payroll/PayrollWorkspaceTabs';
import { collectAcademicYears } from '../../shared/payroll/payrollHelpers';
import { exportPayrollRequestsExcel, exportPayrollRequestsPdf } from '../../shared/payroll/payrollExport';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DEPARTMENTS = ['All', 'Mathematics', 'Sciences', 'Finance', 'Library', 'ICT', 'Administration', 'Languages', 'Student Affairs'];
const REJECTION_PRESETS = ['Incorrect amount', 'Duplicate request', 'Missing attendance data', 'Incorrect department', 'Pending documentation', 'Budget exceeded'];

/* ─── Helpers ────────────────────────────────────────────────────────── */
const fmt = (v) => new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0) + ' RWF';
const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
const fmtShort = (v) => {
  const n = Number(v) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(0)     + 'K';
  return String(n);
};

/** Rows from accountant_payroll_payments are read-only in manager workflow actions. */
const isPayrollWorkflowRequest = (row) =>
  row?.source !== 'accountant_payment' && !String(row?.payrollId || '').startsWith('APAY-');

const STATUS_CFG = {
  Pending:  { badge: 'bg-amber-100 text-amber-800 border-amber-200',  dot: 'bg-amber-500',   row: 'hover:bg-amber-50/40'   },
  Approved: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', row: 'hover:bg-emerald-50/40' },
  Rejected: { badge: 'bg-red-100 text-red-800 border-red-200',        dot: 'bg-red-500',     row: 'hover:bg-red-50/20'     },
  Paid:     { badge: 'bg-blue-100 text-blue-800 border-blue-200',     dot: 'bg-blue-500',    row: 'hover:bg-blue-50/20'    },
};

/* ─── Sub-components ─────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${c.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {status}
    </span>
  );
}

function MiniBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Toast({ toast }) {
  if (!toast.message) return null;
  const isErr = toast.type === 'error';
  return (
    <div className={`fixed top-4 right-4 z-[400] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-sm border text-sm font-semibold max-w-xs
      ${isErr ? 'bg-red-600 border-red-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white'}`}>
      {isErr ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
      {toast.message}
    </div>
  );
}

/* ─── Detail Modal ───────────────────────────────────────────────────── */
function DetailModal({ row, onClose, onDecide, loading }) {
  const [action,        setAction]        = useState(null); // 'approve'|'reject'
  const [approveMode,   setApproveMode]   = useState('approve'); // 'approve'|'pay'
  const [rejectReason,  setRejectReason]  = useState('');
  const [customReason,  setCustomReason]  = useState('');

  const finalReason = rejectReason === '__custom__' ? customReason : rejectReason;

  const canSubmitReject = finalReason.trim().length > 0;

  const canWorkflowAction = isPayrollWorkflowRequest(row);
  const warnings = [];
  if (!canWorkflowAction) warnings.push('This record comes from the accountant payroll ledger (read-only here).');
  if (row.amount > row.finalPayable) warnings.push('Requested amount exceeds final payable salary.');
  if (row.status === 'Rejected' || row.status === 'Paid') warnings.push('This record is locked and cannot be modified.');

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[96dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-sm flex flex-col">

        {/* header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-5 py-4 flex items-start justify-between rounded-t-3xl sm:rounded-t-3xl">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Payroll Request Detail</p>
            <h3 className="text-lg font-semibold text-[#000435]">{row.staffName}</h3>
            <p className="text-xs text-slate-500 font-medium">{row.staffCode} · {row.role} · {row.department}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            <button onClick={onClose} className="h-8 w-8 rounded-xl border border-slate-200 inline-flex items-center justify-center hover:bg-slate-50 transition">
              <X size={14} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Warnings */}
          {warnings.map((w) => (
            <div key={w} className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-semibold">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {w}
            </div>
          ))}

          {/* Salary breakdown */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Salary Breakdown</p>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              {[
                { label: 'Basic Salary',       value: fmt(row.basic),        color: 'text-slate-800' },
                { label: 'Allowances',         value: `+ ${fmt(row.allowances)}`, color: 'text-emerald-700' },
                { label: 'Deductions ',  value: `− ${fmt(row.deductions)}`, color: 'text-red-600'     },
                { label: 'Net Salary',         value: fmt(row.netSalary),    color: 'text-[#000435] font-semibold', divider: true },
                { label: 'Advance Deduction',  value: `− ${fmt(row.advance)}`,   color: 'text-orange-600'  },
                { label: 'Final Payable',      value: fmt(row.finalPayable), color: 'text-emerald-700 font-semibold text-base', divider: true },
                { label: 'Amount Requested',   value: fmt(row.amount),       color: row.amount > row.finalPayable ? 'text-red-600 font-semibold' : 'text-[#000435] font-semibold' },
              ].map(({ label, value, color, divider }) => (
                <div key={label}>
                  {divider && <div className="h-px bg-slate-100" />}
                  <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                    <span className="text-slate-500">{label}</span>
                    <span className={color}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="grid grid-cols-3 gap-3">
            {[['Month', row.month], ['Term', row.term], ['Year', String(row.year)]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{k}</p>
                <p className="font-semibold text-[#000435] mt-1">{v}</p>
              </div>
            ))}
          </div>

          {/* Audit */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Audit Trail</p>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Clock size={11} className="text-amber-600" /></div>
                <div>
                  <p className="font-semibold text-slate-700">
                    Submitted by {row.submittedBy || 'Accountant'}
                    {row.submittedByRole ? ` (${row.submittedByRole})` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400">{fmtDateTime(row.submittedAt || row.createdAt)}</p>
                </div>
            </div>
            {row.approvedBy && row.approvedAt && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5"><BadgeCheck size={11} className="text-emerald-600" /></div>
                <div><p className="font-semibold text-slate-700">Approved by {row.approvedBy}{row.approvedByRole ? ` (${row.approvedByRole})` : ''}</p><p className="text-[11px] text-slate-400">{fmtDateTime(row.approvedAt)}</p></div>
              </div>
            )}
            {row.status === 'Paid' && (row.paidBy || row.approvedBy) && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5"><DollarSign size={11} className="text-blue-600" /></div>
                <div>
                  <p className="font-semibold text-slate-700">
                    Paid by {row.paidBy || row.approvedBy}
                    {row.paidByRole ? ` (${row.paidByRole})` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400">{fmtDateTime(row.paidAt || row.approvedAt)}</p>
                </div>
              </div>
            )}
            {row.rejectionReason && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Ban size={11} className="text-red-600" /></div>
                <div><p className="font-semibold text-red-700">Rejected — {row.rejectionReason}</p></div>
              </div>
            )}
          </div>

          {/* Action area */}
          {canWorkflowAction && (row.status === 'Pending' || row.status === 'Approved') && !action && (
            <div className="flex flex-wrap gap-3">
              {row.status === 'Pending' && (
                <button onClick={() => setAction('approve')} className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] uppercase tracking-widest inline-flex items-center justify-center gap-2 transition active:scale-95">
                  <CheckCircle2 size={15} /> Approve
                </button>
              )}
              {row.status === 'Approved' && (
                <button onClick={() => onDecide(row.id, 'pay')} disabled={loading} className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] uppercase tracking-widest inline-flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={15} />} Mark as Paid
                </button>
              )}
              {row.status !== 'Rejected' && (
                <button onClick={() => setAction('reject')} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-[11px] uppercase tracking-widest inline-flex items-center justify-center gap-2 transition active:scale-95">
                  <Ban size={15} /> Reject
                </button>
              )}
            </div>
          )}

          {/* Approve confirm */}
          {action === 'approve' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <p className="font-semibold text-emerald-800 text-sm">Confirm Approval</p>
              <div className="flex flex-col gap-2">
                {[['approve','Mark as Approved only'],['pay','Mark as Approved & Paid immediately']].map(([v, lbl]) => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="radio" className="accent-emerald-600" name="approveMode" value={v} checked={approveMode===v} onChange={() => setApproveMode(v)} />
                    <span className="text-sm text-slate-700 font-semibold">{lbl}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAction(null)} className="h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-semibold uppercase hover:bg-white transition">Cancel</button>
                <button
                  onClick={() => { onDecide(row.id, approveMode); setAction(null); }}
                  disabled={loading}
                  className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold uppercase transition active:scale-95 disabled:opacity-50 inline-flex items-center justify-center gap-1"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Confirm
                </button>
              </div>
            </div>
          )}

          {/* Reject form */}
          {action === 'reject' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="font-semibold text-red-800 text-sm">Rejection Reason</p>
              <div className="flex flex-wrap gap-2">
                {REJECTION_PRESETS.map((r) => (
                  <button key={r} onClick={() => { setRejectReason(r); setCustomReason(''); }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${rejectReason===r ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700 border-slate-200 hover:border-red-400'}`}>
                    {r}
                  </button>
                ))}
                <button onClick={() => setRejectReason('__custom__')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${rejectReason==='__custom__' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-700 border-slate-200 hover:border-red-400'}`}>
                  Custom reason…
                </button>
              </div>
              {rejectReason === '__custom__' && (
                <textarea rows={3} value={customReason} onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full rounded-xl border border-red-200 p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="Enter custom rejection reason…" />
              )}
              <div className="flex gap-2">
                <button onClick={() => { setAction(null); setRejectReason(''); setCustomReason(''); }} className="h-9 px-4 rounded-xl border border-slate-200 text-[11px] font-semibold uppercase hover:bg-white transition">Cancel</button>
                <button
                  onClick={() => { onDecide(row.id, 'reject', finalReason); setAction(null); }}
                  disabled={!canSubmitReject || loading}
                  className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold uppercase transition active:scale-95 disabled:opacity-40 inline-flex items-center justify-center gap-1"
                >
                  {loading ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Confirm Reject
                </button>
              </div>
            </div>
          )}

          {/* Locked notice */}
          {(row.status === 'Rejected' || row.status === 'Paid') && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500 font-semibold">
              <Lock size={14} /> This record is locked and cannot be modified.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Analytics Mini-charts (CSS bars) ──────────────────────────────── */
function AnalyticsPanel({ requests }) {
  const byDept = useMemo(() => {
    const m = {};
    requests.filter((r) => r.status === 'Paid' || r.status === 'Approved').forEach((r) => {
      m[r.department] = (m[r.department] || 0) + r.amount;
    });
    return Object.entries(m).sort((a,b) => b[1]-a[1]).slice(0,5);
  }, [requests]);

  const byMonth = useMemo(() => {
    const m = {};
    requests.filter((r) => r.status === 'Paid').forEach((r) => {
      m[r.month] = (m[r.month] || 0) + r.amount;
    });
    return Object.entries(m).slice(-5);
  }, [requests]);

  const total    = requests.length || 1;
  const approved = requests.filter((r) => r.status === 'Approved' || r.status === 'Paid').length;
  const rate     = Math.round((approved / total) * 100);
  const maxDept  = byDept[0]?.[1] || 1;
  const maxMonth = Math.max(...byMonth.map(([,v]) => v), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Approval rate */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Approval Rate</p>
        <div className="flex items-center justify-center">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="3"
                strokeDasharray={`${rate} ${100 - rate}`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-[#000435]">{rate}%</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Rate</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
          {[['Approved', approved, 'text-emerald-600'], ['Pending', requests.filter(r=>r.status==='Pending').length, 'text-amber-600'],
            ['Rejected', requests.filter(r=>r.status==='Rejected').length, 'text-red-600'], ['Paid', requests.filter(r=>r.status==='Paid').length, 'text-blue-600']]
            .map(([lbl,n,cls]) => (
              <div key={lbl} className="rounded-lg bg-slate-50 py-2">
                <p className={`font-semibold text-base ${cls}`}>{n}</p>
                <p className="text-slate-400 text-[10px] font-semibold">{lbl}</p>
              </div>
          ))}
        </div>
      </div>

      {/* Dept breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Dept. Payroll (RWF)</p>
        <div className="space-y-3">
          {byDept.length ? byDept.map(([dept, total]) => (
            <div key={dept}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 truncate max-w-[60%]">{dept}</span>
                <span className="font-semibold text-[#000435]">{fmtShort(total)}</span>
              </div>
              <MiniBar value={total} max={maxDept} color="bg-amber-500" />
            </div>
          )) : <p className="text-sm text-slate-400 text-center py-4">No data yet.</p>}
        </div>
      </div>

      {/* Monthly cost */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Monthly Paid (RWF)</p>
        <div className="flex items-end gap-1.5 h-28">
          {byMonth.length ? byMonth.map(([month, val]) => {
            const pct = Math.max(8, (val / maxMonth) * 100);
            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-semibold text-slate-500">{fmtShort(val)}</span>
                <div className="w-full rounded-t-md bg-[#000435] transition-all" style={{ height: `${pct}%` }} />
                <span className="text-[8px] text-slate-400 font-semibold">{month.slice(0,3)}</span>
              </div>
            );
          }) : (
            <p className="text-sm text-slate-400 text-center py-4 w-full">No paid data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────── */
export default function Payroll() {
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState({ fetch: false, action: false });
  const [filters,     setFilters]     = useState({ month: 'All', term: 'All', year: 'All', status: 'All', department: 'All', search: '' });
  const [page,        setPage]        = useState(1);
  const [limit,       setLimit]       = useState(20);
  const [pagination,  setPagination]  = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [selected,    setSelected]    = useState([]); // bulk
  const [detailRow,   setDetailRow]   = useState(null);
  const [finishModal, setFinishModal] = useState({ open: false, row: null, amount: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [toast,       setToast]       = useState({ type: '', message: '' });
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState('requests');
  const notifRef = useRef(null);

  const schoolName = useMemo(() => {
    try {
      const m = JSON.parse(localStorage.getItem('manager') || '{}');
      return m?.school?.name || '';
    } catch {
      return '';
    }
  }, []);

  const trackerYearOptions = useMemo(
    () => collectAcademicYears(requests, ['2024', '2025', '2026', '2027', '2028']),
    [requests],
  );
  const roleTokens = useMemo(() => {
    const set = new Set();
    const add = (v) => {
      const s = String(v || '').trim().toUpperCase();
      if (s) set.add(s);
    };
    try {
      const rawManager = JSON.parse(localStorage.getItem('manager') || '{}');
      const rawUser = JSON.parse(localStorage.getItem('user') || '{}');
      [rawManager, rawUser].forEach((obj) => {
        add(obj?.role);
        add(obj?.role_code);
        add(obj?.user_type);
        add(obj?.staff_role);
        add(obj?.account_type);
        if (Array.isArray(obj?.roles)) obj.roles.forEach(add);
      });
    } catch {
      // ignore parse issues and fallback below
    }
    return set;
  }, []);
  const canActionFinishPayment = roleTokens.size === 0
    ? true
    : ['SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'ACCOUNTANT'].some((r) => roleTokens.has(r));

  const notify = (type, message) => {
    setToast({ type, message });
    clearTimeout(window.__mgr_toast);
    window.__mgr_toast = setTimeout(() => setToast({ type: '', message: '' }), 3500);
  };

  /* fetch */
  const fetchRequests = async (activeFilters = filters, activePage = page, activeLimit = limit) => {
    setLoading((p) => ({ ...p, fetch: true }));
    try {
      const params = {};
      if (activeFilters.month && activeFilters.month !== 'All') params.month = activeFilters.month;
      if (activeFilters.term && activeFilters.term !== 'All') params.term = activeFilters.term;
      if (activeFilters.year && activeFilters.year !== 'All') params.year = activeFilters.year;
      if (activeFilters.status && activeFilters.status !== 'All') params.status = activeFilters.status;
      if (activeFilters.department && activeFilters.department !== 'All') params.department = activeFilters.department;
      if (activeFilters.search && String(activeFilters.search).trim()) params.query = String(activeFilters.search).trim();
      params.page = activePage;
      params.limit = activeLimit;
      const res = await api.get('/manager/payroll-requests', { params });
      if (res.data?.success === false) {
        throw new Error(res.data?.message || 'Failed to load payroll requests');
      }
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setRequests(rows);
      setPagination(res.data?.pagination || { page: activePage, limit: activeLimit, total: rows.length, totalPages: 1 });
      setSelected([]);
    } catch (e) {
      notify('error', e?.response?.data?.message || e?.message || 'Failed to load payroll requests');
    } finally {
      setLoading((p) => ({ ...p, fetch: false }));
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filters.month, filters.term, filters.year, filters.status, filters.search, filters.department]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRequests(filters, page, limit);
    }, 280);
    return () => clearTimeout(t);
  }, [filters.month, filters.term, filters.year, filters.status, filters.search, filters.department, page, limit]); /* eslint-disable-line */

  /* close notif on outside click */
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* decide */
  const decide = async (id, decision, reason = '') => {
    const row = requests.find((r) => r.id === id);
    if (row && !isPayrollWorkflowRequest(row)) {
      notify('error', 'This record was created in the accountant payroll ledger and cannot be updated from manager workflow.');
      return;
    }
    setLoading((p) => ({ ...p, action: true }));
    try {
      await api.patch(`/manager/payroll-requests/${id}/decision`, { decision, reason });
      const map = { approve: 'approved', pay: 'paid', reject: 'rejected' };
      notify('success', `Request ${map[decision] || decision} successfully.`);
      await fetchRequests();
      if (['approve','pay'].includes(decision)) {
        const actionLabel = decision === 'approve' ? 'approved' : 'marked as paid';
        setNotifications((p) => [{ id: Date.now(), text: `You ${actionLabel} a payroll request.`, time: 'just now', read: true }, ...p]);
      }
    } catch (e) {
      notify('error', e?.response?.data?.message || e?.message || 'Action failed');
    } finally {
      setLoading((p) => ({ ...p, action: false }));
    }
  };

  /* bulk */
  const bulkDecide = async (decision) => {
    if (decision === 'reject') {
      notify('error', 'Bulk reject requires individual rejection reasons.');
      return;
    }
    for (const id of selected) await decide(id, decision);
    setSelected([]);
  };

  const openFinishPaymentModal = (row) => {
    setFinishModal({
      open: true,
      row,
      amount: String(Math.round(Number(row?.remaining || 0))),
    });
  };

  const confirmFinishPayment = async () => {
    const row = finishModal.row;
    const amount = Number(finishModal.amount || 0);
    if (!row) return;
    if (amount <= 0) return notify('error', 'Amount must be greater than zero.');
    if (amount > Number(row.remaining || 0)) return notify('error', `Amount exceeds remaining balance (${fmt(row.remaining)}).`);
    setLoading((p) => ({ ...p, action: true }));
    try {
      const res = await api.post('/accountant/payroll-requests/finish-payment', {
        staffUserId: row.staffUserId,
        month: row.month,
        term: row.term,
        year: Number(row.year),
        amount,
      });
      notify('success', res.data?.message || 'Payment updated');
      setFinishModal({ open: false, row: null, amount: '' });
      await fetchRequests();
    } catch (e) {
      notify('error', e?.response?.data?.message || e?.message || 'Failed to finish payment');
    } finally {
      setLoading((p) => ({ ...p, action: false }));
    }
  };

  /* filtered rows */
  const filtered = useMemo(() => requests, [requests]);

  /* stats */
  const stats = useMemo(() => {
    const cur  = requests.filter((r) => r.month === MONTHS[new Date().getMonth()]);
    return {
      total:    cur.length,
      pending:  cur.filter((r) => r.status === 'Pending').length,
      approved: cur.filter((r) => r.status === 'Approved' || r.status === 'Paid').length,
      rejected: cur.filter((r) => r.status === 'Rejected').length,
      totalAmt: cur.reduce((s, r) => s + r.amount, 0),
      pendingAmt: cur.filter((r) => r.status === 'Pending').reduce((s, r) => s + r.amount, 0),
    };
  }, [requests]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const allSelected  = filtered.length > 0 && selected.length === filtered.length;
  const someSelected = selected.length > 0;
  const toggleAll    = () => setSelected(allSelected ? [] : filtered.map((r) => r.id));
  const toggleRow    = (id) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const exportRequestsExcel = () => exportPayrollRequestsExcel({
    rows: filtered,
    portalLabel: 'School Manager — Payroll requests',
    filename: `manager-payroll-requests-${Date.now()}.xlsx`,
  });

  const exportRequestsPdf = () => exportPayrollRequestsPdf({
    rows: filtered,
    portalLabel: 'School Manager — Payroll requests',
    schoolName,
    filename: `manager-payroll-requests-${Date.now()}.pdf`,
  });

  /* ─ Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-100" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <Toast toast={toast} />
      {detailRow && (
        <DetailModal
          row={requests.find((r) => r.id === detailRow.id) || detailRow}
          onClose={() => setDetailRow(null)}
          onDecide={decide}
          loading={loading.action}
        />
      )}

      <ManagerOchreHeroShell
        outerClassName="min-h-screen bg-slate-100 pb-10"
        eyebrow={`School manager · ${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()} · T2`}
        title="Payroll control center"
        subtitle="Review, approve, and manage all staff salary requests"
        HeroIcon={Wallet}
        headerRight={(
          <>
            {workspaceTab === 'requests' && (
              <PayrollExportBar
                compact
                disabled={!filtered.length}
                onExportExcel={exportRequestsExcel}
                onExportPdf={exportRequestsPdf}
              />
            )}
            <button
              type="button"
              onClick={() => setShowAnalytics((p) => !p)}
              className={`h-9 px-3 rounded-xl border text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 transition ${
                showAnalytics ? 'border-[#FEBF10] bg-[#FEBF10]/20 text-white' : 'border-white/25 text-white/90 hover:bg-white/10'
              }`}
            >
              <BarChart2 size={12} />
              Analytics
            </button>
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotif((p) => !p)}
                className="relative h-9 w-9 rounded-xl border border-white/25 bg-white/10 inline-flex items-center justify-center text-white hover:bg-white/15 transition-colors"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-0.5 rounded-full bg-[#FEBF10] text-[#1E3A5F] text-[8px] font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 top-11 w-72 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#000435] uppercase tracking-wider">Notifications</p>
                    <button
                      type="button"
                      onClick={() => setNotifications((p) => p.map((n) => ({ ...n, read: true })))}
                      className="text-[10px] text-amber-600 font-bold hover:underline"
                    >
                      Mark all read
                    </button>
                  </div>
                  {notifications.map((n) => (
                    <div key={n.id} className={`px-4 py-3 border-b border-slate-50 ${n.read ? '' : 'bg-amber-50'}`}>
                      <p className="text-xs font-semibold text-slate-700">{n.text}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={fetchRequests}
              className="h-9 w-9 rounded-xl border border-white/25 bg-white/10 inline-flex items-center justify-center text-white hover:bg-white/15 transition-colors"
            >
              <RefreshCw size={13} className={loading.fetch ? 'animate-spin' : ''} />
            </button>
          </>
        )}
        kpiTiles={[
          { key: 'tot', label: 'Total requests', value: stats.total, icon: Users },
          { key: 'pen', label: 'Pending', value: stats.pending, subValue: `${fmt(stats.pendingAmt)}`, icon: Clock },
          { key: 'app', label: 'Approved', value: stats.approved, icon: BadgeCheck },
          { key: 'rej', label: 'Rejected', value: stats.rejected, icon: Ban },
          { key: 'pay', label: 'Total payable', value: `${fmtShort(stats.totalAmt)} RWF`, icon: TrendingUp },
        ]}
        kpiGridClassName="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        overlapClassName="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 mb-6"
        pageBody={(
      <div className="px-3 sm:px-6 lg:px-8 py-5 space-y-5">

        {/* ── Analytics Panel ─────────────────────────────────────────── */}
        {showAnalytics && <AnalyticsPanel requests={requests} />}

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1 min-w-0 max-w-xl">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                  className="h-10 w-full pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  placeholder="Search by name or staff ID…"
                />
              </div>
              <PayrollWorkspaceTabs active={workspaceTab} onChange={setWorkspaceTab} className="w-full lg:w-auto shrink-0" />
              {workspaceTab === 'requests' && (
                <button
                  type="button"
                  onClick={() => setShowFilters((p) => !p)}
                  className={`h-10 px-3 rounded-xl border text-[10px] font-semibold uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition shrink-0 ${showFilters ? 'bg-[#000435] border-[#000435] text-white' : 'border-slate-200 text-slate-600 hover:border-amber-400'}`}
                >
                  <Sliders size={12} /> Filters {showFilters ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                </button>
              )}
            </div>
          </div>
          {workspaceTab === 'requests' && showFilters && (
            <div className="px-4 sm:px-5 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
              {[
                { key: 'month',      opts: ['All', ...MONTHS],                         label: 'Month'  },
                { key: 'term',       opts: ['All','T1','T2','T3'],                     label: 'Term'   },
                { key: 'year',       opts: ['All','2024','2025','2026','2027','2028'],  label: 'Year'   },
                { key: 'status',     opts: ['All','Pending','Approved','Rejected','Paid'], label: 'Status' },
                { key: 'department', opts: DEPARTMENTS,                                label: 'Dept'   },
              ].map(({ key, opts, label }) => (
                <select
                  key={key}
                  aria-label={label}
                  value={filters[key]}
                  onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 text-[11px] font-bold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {opts.map((o) => <option key={o}>{o}</option>)}
                </select>
              ))}
              <button onClick={() => setFilters({ month: 'All', term: 'All', year: 'All', status: 'All', department: 'All', search: '' })}
                className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-bold bg-white text-slate-500 hover:text-red-600 hover:border-red-200 transition">
                Clear
              </button>
            </div>
          )}

          {workspaceTab === 'requests' && someSelected && (
            <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2.5 bg-amber-50 border-b border-amber-100">
              <span className="text-xs font-semibold text-amber-800">{selected.length} selected</span>
              <div className="flex flex-wrap gap-2 ml-2">
                <button onClick={() => bulkDecide('approve')} disabled={loading.action} className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-[10px] font-semibold uppercase hover:bg-emerald-700 transition disabled:opacity-50">Approve All</button>
                <button onClick={() => bulkDecide('pay')}      disabled={loading.action} className="h-8 px-3 rounded-lg bg-blue-600 text-white text-[10px] font-semibold uppercase hover:bg-blue-700 transition disabled:opacity-50">Mark Paid</button>
                <button onClick={() => bulkDecide('reject')}   disabled={loading.action} className="h-8 px-3 rounded-lg bg-red-600 text-white text-[10px] font-semibold uppercase hover:bg-red-700 transition disabled:opacity-50">Reject All</button>
                <button onClick={() => setSelected([])} className="h-8 px-3 rounded-lg border border-slate-200 text-[10px] font-semibold uppercase text-slate-600 hover:bg-white transition">Clear</button>
              </div>
            </div>
          )}

          {workspaceTab === 'tracker' && (
            <PayrollPaymentTrackerPanel
              requests={requests}
              loading={loading.fetch}
              portalLabel="School Manager — Payment tracker"
              schoolName={schoolName}
              academicYearOptions={trackerYearOptions}
              onFinishPayment={openFinishPaymentModal}
              canFinishPayment={canActionFinishPayment}
              showFinishAction
              finishActionLabel="Mark paid"
              finishActionHint="Approve pending requests first"
            />
          )}

          {workspaceTab === 'requests' && (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-[9px] uppercase tracking-[0.15em] text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleAll} className="text-slate-400 hover:text-[#000435] transition">
                      {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>
                  </th>
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Role</th>
                  <th className="px-4 py-3 hidden md:table-cell">Period</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Net Salary</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading.fetch ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" /> Loading payroll requests…
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    <Filter size={28} className="mx-auto mb-2 opacity-30" />
                    No records match the selected filters.
                  </td></tr>
                ) : filtered.map((row) => {
                  const isSelected = selected.includes(row.id);
                  const cfg        = STATUS_CFG[row.status] || {};
                  const hasWarn    = row.amount > row.finalPayable;
                  return (
                    <tr
                      key={row.id}
                      className={`transition cursor-pointer ${cfg.row || 'hover:bg-slate-50'} ${isSelected ? 'bg-amber-50/60' : ''}`}
                      onClick={() => setDetailRow(row)}
                    >
                      <td className="px-4 py-3.5" onClick={(e) => { e.stopPropagation(); toggleRow(row.id); }}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                          {isSelected && <CheckCircle2 size={10} className="text-white" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#000435] to-blue-700 flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                            {row.staffName.split(' ').map((w) => w[0]).slice(0,2).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-[#000435] text-xs leading-tight">{row.staffName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{row.staffCode}</p>
                          </div>
                          {hasWarn && <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" title="Amount exceeds net salary" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <p className="text-xs font-semibold text-slate-700">{row.role}</p>
                        <p className="text-[10px] text-slate-400">{row.department}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <p className="text-xs font-semibold text-slate-700">{row.month} {row.year}</p>
                        <p className="text-[10px] text-slate-400">{row.term}</p>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <p className="text-xs font-semibold text-slate-700">{fmt(row.netSalary)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className={`text-xs font-semibold ${row.amount > row.finalPayable ? 'text-red-600' : 'text-[#000435]'}`}>{fmt(row.amount)}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => setDetailRow(row)}
                            className="h-7 w-7 rounded-lg border border-slate-200 inline-flex items-center justify-center hover:bg-slate-100 transition"
                            title="View details"
                          >
                            <Eye size={12} className="text-slate-500" />
                          </button>
                          {row.status === 'Pending' && isPayrollWorkflowRequest(row) && (
                            <>
                              <button onClick={() => decide(row.id, 'approve')} disabled={loading.action}
                                className="h-7 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-semibold uppercase tracking-wider disabled:opacity-40 transition active:scale-95">
                                ✓
                              </button>
                              <button onClick={() => setDetailRow(row)} disabled={loading.action}
                                className="h-7 px-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[9px] font-semibold uppercase tracking-wider disabled:opacity-40 transition active:scale-95">
                                ✕
                              </button>
                            </>
                          )}
                          {row.status === 'Approved' && isPayrollWorkflowRequest(row) && (
                            <button onClick={() => decide(row.id, 'pay')} disabled={loading.action}
                              className="h-7 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-semibold uppercase tracking-wider disabled:opacity-40 transition active:scale-95">
                              Pay
                            </button>
                          )}
                          {(row.status === 'Rejected' || row.status === 'Paid') && (
                            <Lock size={12} className="text-slate-400" />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-slate-400 font-semibold">
                Showing <strong className="text-slate-600">{filtered.length}</strong> of <strong className="text-slate-600">{pagination.total}</strong> requests
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-slate-400 font-semibold mr-1">
                  Page <strong className="text-slate-600">{pagination.page}</strong> / <strong className="text-slate-600">{pagination.totalPages}</strong>
                </p>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="h-8 px-2 rounded-lg border border-slate-200 text-[11px] font-bold bg-white text-slate-700"
                >
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}/page</option>)}
                </select>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || loading.fetch}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-semibold uppercase text-slate-600 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages || loading.fetch}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-[11px] font-semibold uppercase text-slate-600 disabled:opacity-40"
                >
                  Next
                </button>
                <p className="text-[11px] text-slate-400 font-semibold ml-2">
                  Page total: <strong className="text-[#000435]">{fmt(filtered.reduce((s,r) => s+r.amount,0))}</strong>
                </p>
              </div>
            </div>
          )}
          </>
          )}
        </div>

        {/* ── Pending Alerts ──────────────────────────────────────────── */}
        {requests.filter((r) => r.amount > r.finalPayable && r.status === 'Pending').length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-600" />
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-800">Smart Alerts</p>
            </div>
            <div className="space-y-2">
              {requests.filter((r) => r.amount > r.finalPayable && r.status === 'Pending').map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-amber-800 font-semibold">
                    ⚠️ <strong>{r.staffName}</strong> — requested {fmt(r.amount)} but max payable is {fmt(r.finalPayable)}
                  </span>
                  <button onClick={() => setDetailRow(r)} className="text-[10px] font-semibold text-amber-700 underline hover:text-amber-900">Review</button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
        )}
      />

      {finishModal.open && finishModal.row && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setFinishModal({ open: false, row: null, amount: '' })} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Finish Payment</p>
            <h3 className="text-lg font-semibold text-[#000435] mt-1">{finishModal.row.staffName}</h3>
            <p className="text-xs text-slate-500">{finishModal.row.month} / {finishModal.row.term} / {finishModal.row.year}</p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Final Payable</span><strong className="text-emerald-700">{fmt(finishModal.row.finalPayable)}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Already Paid</span><strong className="text-blue-700">{fmt(finishModal.row.paidAmount)}</strong></div>
              <div className="h-px bg-slate-200 my-1" />
              <div className="flex justify-between"><span className="font-semibold text-slate-700">Remaining</span><strong className="text-orange-600">{fmt(finishModal.row.remaining)}</strong></div>
            </div>
            {canActionFinishPayment ? (
              <>
                <div className="mt-4">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">Pay Amount (RWF)</label>
                  <input
                    value={finishModal.amount}
                    onChange={(e) => setFinishModal((p) => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '') }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                    placeholder="0"
                  />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={() => setFinishModal({ open: false, row: null, amount: '' })} className="h-10 px-4 rounded-xl border border-slate-200 text-[11px] font-semibold uppercase tracking-widest hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button onClick={confirmFinishPayment} disabled={loading.action} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50 transition active:scale-95">
                    {loading.action ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Mark Paid
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-5 flex justify-end">
                <button onClick={() => setFinishModal({ open: false, row: null, amount: '' })} className="h-10 px-4 rounded-xl border border-slate-200 text-[11px] font-semibold uppercase tracking-widest hover:bg-slate-50 transition">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}