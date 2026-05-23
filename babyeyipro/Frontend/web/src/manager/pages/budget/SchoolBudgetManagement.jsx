import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, BarChart3, Bell, CheckCircle2, ChevronDown, ClipboardList, Download,
  FileText, Filter, LayoutDashboard, Loader2, MoreVertical, PieChart, RefreshCw, Scale,
  Search, Shield, SlidersHorizontal, Snowflake, ThumbsDown, TrendingUp, X, XCircle,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart as RePieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  fetchManagerBudgetOverview, fetchManagerBudgets, fetchManagerBudget, fetchManagerBudgetLines,
  fetchManagerBudgetUsage, freezeManagerBudgetLine, reviewManagerBudget, fetchBudgetAuditLogs,
} from '../../services/managerBudgetApi';
import api from '../../services/api';
import { exportBudgetReportExcel, exportBudgetReportPdf } from '../../utils/budgetExport';
import BudgetPushBanner from '../../../shared/BudgetPushBanner';
import ManagerOchreHeroShell from '../../components/ManagerOchreHeroShell';

const NAVY = '#1E3A5F';
const AMBER = '#F59E0B';
const CHART_COLORS = ['#1E3A5F', '#F59E0B', '#10B981', '#6366F1', '#EF4444', '#8B5CF6', '#EC4899'];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Dashboard', Icon: LayoutDashboard },
  { id: 'budgets', label: 'All Budgets', mobileLabel: 'Budgets', Icon: ClipboardList },
  { id: 'lines', label: 'Budget Lines', mobileLabel: 'Lines', Icon: Scale },
  { id: 'tracking', label: 'Usage Tracking', mobileLabel: 'Usage', Icon: TrendingUp },
  { id: 'reports', label: 'Reports', mobileLabel: 'Reports', Icon: FileText },
  { id: 'analytics', label: 'Analytics', mobileLabel: 'Analytics', Icon: BarChart3 },
  { id: 'audit', label: 'Audit Logs', mobileLabel: 'Audit', Icon: Shield },
];

const REPORT_ITEMS = [
  { group: 'Budget Reports', items: ['Budget Summary Report', 'Budget vs Actual Report', 'Department Spending Report', 'Budget Usage Report', 'Budget Approval Report'] },
  { group: 'Financial Statements', items: ['Balance Sheet', 'Income Statement', 'Cash Flow Statement', 'Trial Balance', 'General Ledger'] },
];

const BUDGET_STATUSES = ['', 'draft', 'pending_approval', 'approved', 'rejected', 'closed'];
const REVIEW_DECISIONS = [
  { value: 'approve', label: 'Approve' },
  { value: 'reject', label: 'Reject' },
  { value: 'request revision', label: 'Request Revision' },
  { value: 'cancel', label: 'Cancel Budget' },
];

function money(v) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(v || 0));
}
function compactMoney(v) {
  const n = Number(v || 0);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}
function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return { bg: '#D1FAE5', color: '#065F46', label: 'Approved' };
  if (s === 'pending_approval') return { bg: '#FEF3C7', color: '#92400E', label: 'Pending Approval' };
  if (s === 'rejected') return { bg: '#FEE2E2', color: '#991B1B', label: 'Rejected' };
  if (s === 'closed') return { bg: '#E5E7EB', color: '#374151', label: 'Closed' };
  if (s === 'draft') return { bg: '#F3F4F6', color: '#4B5563', label: 'Draft' };
  return { bg: '#EFF6FF', color: '#1E40AF', label: status || '—' };
}
function lineStatusStyle(key) {
  if (key === 'frozen') return { bg: '#E0E7FF', color: '#3730A3' };
  if (key === 'exhausted') return { bg: '#FEE2E2', color: '#991B1B' };
  if (key === 'critical') return { bg: '#FEE2E2', color: '#B91C1C' };
  if (key === 'warning') return { bg: '#FEF3C7', color: '#92400E' };
  return { bg: '#D1FAE5', color: '#065F46' };
}
function dateOnly(v) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}
function budgetDbId(b) {
  return b?.db_id ?? (String(b?.id || '').startsWith('BGT-') ? Number(String(b.id).replace('BGT-', '')) : Number(b?.id));
}
function csvCell(v) {
  const s = String(v ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadCsv(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function monthKey(d) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
function monthLabel(key) {
  if (!key) return '—';
  const [y, m] = key.split('-');
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[Number(m) - 1] || m} ${y}`;
}

function StatCard({ label, value, sub, accent = NAVY }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-1 truncate" style={{ color: accent }}>{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function FilterStatCard({ label, value, sub, accent = NAVY, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-100/90 bg-gradient-to-br from-white to-slate-50/90 p-3 min-w-0 shadow-sm hover:border-[#1E3A5F]/15 transition-colors">
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-snug">{label}</p>
        {Icon ? <Icon size={11} className="shrink-0 opacity-35" style={{ color: accent }} aria-hidden /> : null}
      </div>
      <p className="text-sm sm:text-base font-bold mt-1.5 truncate tabular-nums" style={{ color: accent }}>{value}</p>
      {sub ? <p className="text-[9px] text-slate-400 mt-0.5 truncate">{sub}</p> : null}
    </div>
  );
}

const EMPTY_FILTERS = { search: '', academicYear: '', term: '', status: '', department: '' };

function countActiveFilters(filters) {
  return Object.values(filters).filter(Boolean).length;
}

function Badge({ status }) {
  const s = statusBadge(status);
  return (
    <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function LineBadge({ statusKey, label }) {
  const s = lineStatusStyle(statusKey);
  return (
    <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{ background: s.bg, color: s.color }}>
      {label || statusKey}
    </span>
  );
}

function Spinner({ className = '' }) {
  return <Loader2 size={22} className={`animate-spin text-slate-300 mx-auto ${className}`} />;
}

function Empty({ text = 'No records found' }) {
  return <p className="text-center py-10 text-[11px] font-bold text-slate-300 uppercase tracking-widest">{text}</p>;
}

function ActionsMenu({ items, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 z-30 min-w-[160px] bg-white border border-slate-100 rounded-xl shadow-lg py-1">
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          disabled={it.disabled}
          onClick={() => { it.onClick(); onClose(); }}
          className="w-full text-left px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100" style={{ background: `${NAVY}08` }}>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function ApprovalModal({ budget, onClose, onSubmit, busy, initialDecision = 'approve' }) {
  const [decision, setDecision] = useState(initialDecision);
  const [notes, setNotes] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const needsNotes = decision === 'reject' || decision === 'cancel';

  useEffect(() => {
    setDecision(initialDecision);
    setNotes('');
  }, [initialDecision, budget?.db_id, budget?.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (needsNotes && !notes.trim()) return;
    onSubmit({ decision, notes: notes.trim(), effectiveDate });
  };

  const decisionCards = [
    { value: 'approve', label: 'Approve', icon: CheckCircle2, color: '#10B981', bg: '#D1FAE5' },
    { value: 'reject', label: 'Reject', icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
    { value: 'request revision', label: 'Revision', icon: RefreshCw, color: '#D97706', bg: '#FEF3C7' },
    { value: 'cancel', label: 'Cancel', icon: ThumbsDown, color: '#64748B', bg: '#F1F5F9' },
  ];

  return (
    <Modal title="Budget approval review" onClose={onClose} wide>
      <div className="mb-4 p-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-amber-50/30">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget under review</p>
        <p className="text-base font-bold text-slate-800 mt-1">{budget?.title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{budget?.budgetCode} · {budget?.academicYear} · {budget?.term}</p>
        <p className="text-sm font-bold mt-2" style={{ color: NAVY }}>{money(budget?.totalExpectedIncome)} expected income</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Approval decision</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {decisionCards.map((d) => {
              const Icon = d.icon;
              const active = decision === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDecision(d.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${active ? 'border-[#1E3A5F] shadow-md' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                  style={{ background: active ? d.bg : undefined }}
                >
                  <Icon size={20} style={{ color: d.color }} />
                  <span className="text-[10px] font-bold uppercase" style={{ color: d.color }}>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Effective date</label>
          <input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="mt-1 w-full px-3 py-2.5 text-[11px] font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Notes {needsNotes && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Approval notes, rejection reason, or revision instructions…"
            className="mt-1 w-full px-3 py-2.5 text-[11px] font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 resize-none"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || (needsNotes && !notes.trim())}
            className="flex-1 py-2.5 rounded-xl text-white text-[11px] font-semibold uppercase tracking-wide disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: NAVY }}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Submit
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BudgetDetailModal({ budgetId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const row = await fetchManagerBudget(budgetId);
        if (!cancelled) setData(row);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Failed to load budget');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [budgetId]);

  return (
    <Modal title="Budget details" onClose={onClose} wide>
      {loading && <Spinner />}
      {err && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-bold">
          <AlertTriangle size={14} /> {err}
        </div>
      )}
      {!loading && !err && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Code</p><p className="text-sm font-bold text-slate-800">{data.budgetCode || data.id}</p></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Status</p><Badge status={data.status} /></div>
            <div className="sm:col-span-2"><p className="text-[9px] font-bold text-slate-400 uppercase">Title</p><p className="text-sm font-bold text-slate-800">{data.title}</p></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Academic year</p><p className="text-sm font-semibold text-slate-700">{data.academicYear}</p></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Term</p><p className="text-sm font-semibold text-slate-700">{data.term}</p></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Type</p><p className="text-sm font-semibold text-slate-700">{data.budgetType}</p></div>
            <div><p className="text-[9px] font-bold text-slate-400 uppercase">Period</p><p className="text-sm font-semibold text-slate-700">{dateOnly(data.startDate)} — {dateOnly(data.endDate)}</p></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatCard label="Expected income" value={money(data.totalExpectedIncome)} accent={NAVY} />
            <StatCard label="Allocated" value={money(data.totalAllocated)} accent={AMBER} />
            <StatCard label="Remaining" value={money(data.remainingBalance)} />
            <StatCard label="Usage" value={`${data.budgetUsagePct || 0}%`} sub="of expected income" />
          </div>
          {data.description && (
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Description</p>
              <p className="text-[11px] text-slate-600">{data.description}</p>
            </div>
          )}
          {Array.isArray(data.incomeSources) && data.incomeSources.length > 0 && (
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Income sources</p>
              <ul className="space-y-1.5">
                {data.incomeSources.map((inc) => (
                  <li key={inc.id} className="flex justify-between text-[11px] font-semibold text-slate-700 border-b border-slate-50 pb-1">
                    <span>{inc.incomeSource || inc.incomeSourceKey}</span>
                    <span style={{ color: NAVY }}>{money(inc.expectedAmount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function FilterPanel({ filters, setFilters, years, departments, statCards, loading, open, onToggle }) {
  const [statsOpen, setStatsOpen] = useState(true);
  const activeCount = countActiveFilters(filters);
  const fieldClass = 'w-full px-3 py-2.5 text-[11px] font-semibold border border-slate-200/90 rounded-xl bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/15 focus:border-[#1E3A5F]/30';

  return (
    <aside className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col max-h-none lg:max-h-[calc(100vh-8rem)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-4 text-left border-b border-slate-100 bg-gradient-to-r from-slate-50/90 to-white hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#1E3A5F]/8 flex items-center justify-center shrink-0">
            <SlidersHorizontal size={14} style={{ color: NAVY }} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filters & insights</p>
            <p className="text-[9px] text-slate-400 font-semibold truncate">
              {open
                ? (activeCount ? `${activeCount} active · stats update live` : 'All records · adjust to refine')
                : (activeCount ? `${activeCount} filter${activeCount !== 1 ? 's' : ''} applied · tap to open` : 'Tap to open filters & statistics')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeCount > 0 && (
            <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#1E3A5F] text-white text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>

      {open && (
        <>
      <div className="p-4 border-b border-slate-100 bg-white space-y-3">
        <div className="flex items-center justify-end">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-[9px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search budgets, lines, usage…"
            className={`${fieldClass} pl-8`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select value={filters.academicYear} onChange={(e) => setFilters((f) => ({ ...f, academicYear: e.target.value }))} className={fieldClass}>
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.term} onChange={(e) => setFilters((f) => ({ ...f, term: e.target.value }))} className={fieldClass}>
            <option value="">All terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
          <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className={fieldClass}>
            <option value="">All statuses</option>
            {BUDGET_STATUSES.filter(Boolean).map((s) => (
              <option key={s} value={s}>{statusBadge(s).label}</option>
            ))}
          </select>
          <select value={filters.department} onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))} className={fieldClass}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {activeCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filters.academicYear && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1E3A5F]/8 text-[9px] font-bold text-[#1E3A5F] uppercase">
                {filters.academicYear}
                <button type="button" onClick={() => setFilters((f) => ({ ...f, academicYear: '' }))} className="hover:text-red-600"><X size={10} /></button>
              </span>
            )}
            {filters.term && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1E3A5F]/8 text-[9px] font-bold text-[#1E3A5F] uppercase">
                {filters.term}
                <button type="button" onClick={() => setFilters((f) => ({ ...f, term: '' }))} className="hover:text-red-600"><X size={10} /></button>
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-[9px] font-bold text-amber-900 uppercase">
                {statusBadge(filters.status).label}
                <button type="button" onClick={() => setFilters((f) => ({ ...f, status: '' }))} className="hover:text-red-600"><X size={10} /></button>
              </span>
            )}
            {filters.department && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 uppercase">
                {filters.department}
                <button type="button" onClick={() => setFilters((f) => ({ ...f, department: '' }))} className="hover:text-red-600"><X size={10} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="border-b border-slate-100">
        <button
          type="button"
          onClick={() => setStatsOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors"
        >
          <span className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <BarChart3 size={12} style={{ color: '#FEBF10' }} />
            Budget statistics
            {activeCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-[#1E3A5F] text-white text-[8px]">Filtered</span>
            )}
          </span>
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${statsOpen ? 'rotate-180' : ''}`} />
        </button>
        {statsOpen && (
          <div className="px-3 pb-4 lg:overflow-y-auto lg:max-h-[min(28rem,calc(100vh-20rem))]">
            {loading ? (
              <div className="py-8"><Spinner /></div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {statCards.map((c) => (
                  <FilterStatCard key={c.key} label={c.label} value={c.value} sub={c.sub} accent={c.accent} icon={c.icon} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}
    </aside>
  );
}

function NotificationsPanel({ alerts }) {
  const list = Array.isArray(alerts) ? alerts : [];
  return (
    <aside className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
      <BudgetPushBanner api={api} />
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <Bell size={12} style={{ color: AMBER }} /> Alerts
      </div>
      {list.length === 0 ? (
        <p className="text-[10px] text-slate-400 font-bold">No alerts</p>
      ) : (
        <ul className="space-y-2 max-h-[320px] overflow-y-auto">
          {list.map((a) => {
            const isDanger = a.type === 'danger';
            const isWarn = a.type === 'warning';
            return (
              <li
                key={a.id}
                className={`flex gap-2 p-2.5 rounded-xl text-[10px] font-semibold border ${
                  isDanger ? 'bg-red-50 border-red-100 text-red-700' : isWarn ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-blue-50 border-blue-100 text-blue-800'
                }`}
              >
                {isDanger ? <XCircle size={14} className="shrink-0" /> : isWarn ? <AlertTriangle size={14} className="shrink-0" /> : <Bell size={14} className="shrink-0" />}
                <span>{a.message}</span>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

export default function SchoolBudgetManagement() {
  const [tab, setTab] = useState('budgets');
  const [overview, setOverview] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [lines, setLines] = useState([]);
  const [usage, setUsage] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [filters, setFilters] = useState({ search: '', academicYear: '', term: '', status: '', department: '' });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [approvalBudget, setApprovalBudget] = useState(null);
  const [approvalInitialDecision, setApprovalInitialDecision] = useState('approve');
  const [detailBudgetId, setDetailBudgetId] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [freezeBusyId, setFreezeBusyId] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadOverview = useCallback(async () => {
    const data = await fetchManagerBudgetOverview();
    setOverview(data);
    return data;
  }, []);

  const loadBudgets = useCallback(async () => {
    const params = {};
    if (filters.status) params.status = filters.status;
    const data = await fetchManagerBudgets(params);
    setBudgets(data);
    return data;
  }, [filters.status]);

  const loadLines = useCallback(async () => {
    const data = await fetchManagerBudgetLines({});
    setLines(data);
    return data;
  }, []);

  const loadUsage = useCallback(async () => {
    const data = await fetchManagerBudgetUsage({});
    setUsage(data);
    return data;
  }, []);

  const loadAudit = useCallback(async () => {
    const data = await fetchBudgetAuditLogs({ entity: 'school_budget', limit: 150 });
    setAuditLogs(data);
    return data;
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadOverview(), loadBudgets(), loadLines(), loadUsage()]);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadBudgets, loadLines, loadUsage]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  useEffect(() => {
    if (tab === 'audit') {
      setTabLoading(true);
      loadAudit().catch((e) => setError(e.message)).finally(() => setTabLoading(false));
    }
  }, [tab, loadAudit]);

  const years = useMemo(() => {
    const set = new Set(budgets.map((b) => b.academicYear).filter(Boolean));
    return [...set].sort().reverse();
  }, [budgets]);

  const departments = useMemo(() => {
    const set = new Set(lines.map((l) => l.department).filter(Boolean));
    return [...set].sort();
  }, [lines]);

  const filteredBudgets = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return budgets.filter((b) => {
      if (filters.academicYear && b.academicYear !== filters.academicYear) return false;
      if (filters.term && b.term !== filters.term) return false;
      if (filters.status && String(b.status).toLowerCase() !== filters.status) return false;
      if (q) {
        const hay = `${b.title} ${b.budgetCode} ${b.id} ${b.academicYear} ${b.term}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [budgets, filters]);

  const filteredLines = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return lines.filter((l) => {
      if (filters.department && l.department !== filters.department) return false;
      if (filters.academicYear || filters.term) {
        const parent = budgets.find((b) => budgetDbId(b) === l.budgetId);
        if (filters.academicYear && parent?.academicYear !== filters.academicYear) return false;
        if (filters.term && parent?.term !== filters.term) return false;
      }
      if (q) {
        const hay = `${l.lineName} ${l.department} ${l.budgetCategory}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [lines, budgets, filters]);

  const filteredUsage = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return usage.filter((u) => {
      const lineId = u.lineId ?? u.budget_line_id ?? u.budgetLineId;
      const line = lineId != null ? lines.find((l) => (l.db_id ?? l.id) === lineId) : null;
      if (filters.department) {
        const dept = line?.department || u.department;
        if (dept !== filters.department) return false;
      }
      if (filters.academicYear || filters.term) {
        const parent = line
          ? budgets.find((b) => budgetDbId(b) === line.budgetId)
          : null;
        if (filters.academicYear && parent?.academicYear !== filters.academicYear) return false;
        if (filters.term && parent?.term !== filters.term) return false;
      }
      if (q) {
        const hay = `${u.lineName} ${u.description} ${u.expenseCategory} ${u.department || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [usage, lines, budgets, filters]);

  const advanced = useMemo(() => {
    const approved = filteredBudgets.filter((b) => String(b.status).toLowerCase() === 'approved');
    const termBudget = approved.find((b) => (!filters.term || b.term === filters.term) && (!filters.academicYear || b.academicYear === filters.academicYear))
      || approved[0];
    const yearRows = filters.academicYear
      ? approved.filter((b) => b.academicYear === filters.academicYear)
      : approved;
    const yearIncome = yearRows.reduce((s, b) => s + Number(b.totalExpectedIncome || 0), 0);
    const yearAllocated = yearRows.reduce((s, b) => s + Number(b.totalAllocated || 0), 0);
    const surplus = yearIncome - yearAllocated;

    const monthlyTotal = filteredUsage.reduce((s, u) => s + Number(u.usageAmount || 0), 0);

    const deptSpend = {};
    filteredLines.forEach((l) => {
      const d = l.department || 'Other';
      deptSpend[d] = (deptSpend[d] || 0) + Number(l.usedAmount || 0);
    });
    const topDept = Object.entries(deptSpend).sort((a, b) => b[1] - a[1])[0];

    return { termBudget, yearIncome, yearAllocated, surplus, monthlyTotal, topDept };
  }, [filteredBudgets, filteredLines, filteredUsage, filters.academicYear, filters.term]);

  const pieData = useMemo(() => {
    const map = {};
    filteredLines.forEach((l) => {
      const d = l.department || 'Other';
      map[d] = (map[d] || 0) + Number(l.plannedAmount || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredLines]);

  const barDeptData = useMemo(() => {
    const map = {};
    filteredLines.forEach((l) => {
      const d = l.department || 'Other';
      map[d] = (map[d] || 0) + Number(l.usedAmount || 0);
    });
    return Object.entries(map).map(([name, spent]) => ({ name, spent })).sort((a, b) => b.spent - a.spent);
  }, [filteredLines]);

  const lineChartData = useMemo(() => {
    const map = {};
    usage.forEach((u) => {
      const k = monthKey(u.usageDate || u.createdAt);
      if (!k) return;
      map[k] = (map[k] || 0) + Number(u.usageAmount || 0);
    });
    return Object.keys(map).sort().map((k) => ({ month: monthLabel(k), amount: map[k] }));
  }, [usage]);

  const pendingSelected = useMemo(() => {
    return [...selectedIds].filter((id) => {
      const b = budgets.find((x) => budgetDbId(x) === id);
      return b && String(b.status).toLowerCase() === 'pending_approval';
    });
  }, [selectedIds, budgets]);

  const pendingBudgets = useMemo(
    () => budgets.filter((b) => String(b.status).toLowerCase() === 'pending_approval'),
    [budgets],
  );

  const openReview = (budget, decision = 'approve') => {
    setApprovalInitialDecision(decision);
    setApprovalBudget(budget);
    setOpenMenuId(null);
  };

  const quickApprove = async (budget) => {
    if (!window.confirm(`Approve "${budget.title}"?`)) return;
    await handleReview(budget, { decision: 'approve', notes: 'Approved by school manager', effectiveDate: new Date().toISOString().slice(0, 10) });
  };

  const handleReview = async (budget, payload) => {
    const id = budgetDbId(budget);
    setReviewBusy(true);
    try {
      const body = {
        decision: payload.decision,
        approvalNotes: payload.notes || (payload.effectiveDate ? `Effective: ${payload.effectiveDate}` : ''),
        notes: payload.notes,
        effectiveDate: payload.effectiveDate,
      };
      await reviewManagerBudget(id, body);
      const msg = payload.decision === 'approve' ? 'Budget approved' : payload.decision === 'reject' ? 'Budget rejected' : 'Review submitted';
      showToast(msg);
      setApprovalBudget(null);
      await Promise.all([loadOverview(), loadBudgets()]);
    } catch (e) {
      showToast(e.message || 'Review failed', 'error');
    } finally {
      setReviewBusy(false);
    }
  };

  const batchApprove = async () => {
    if (!pendingSelected.length) {
      showToast('Select pending budgets first', 'error');
      return;
    }
    setReviewBusy(true);
    try {
      for (const id of pendingSelected) {
        await reviewManagerBudget(id, { decision: 'approve', notes: 'Batch approval' });
      }
      showToast(`${pendingSelected.length} budget(s) approved`);
      setSelectedIds(new Set());
      await Promise.all([loadOverview(), loadBudgets()]);
    } catch (e) {
      showToast(e.message || 'Batch approval failed', 'error');
    } finally {
      setReviewBusy(false);
    }
  };

  const exportBudgetsCsv = () => {
    const headers = ['id', 'title', 'academicYear', 'term', 'status', 'expectedIncome', 'allocated', 'remaining'];
    const rows = filteredBudgets.map((b) => ({
      id: b.budgetCode || b.id,
      title: b.title,
      academicYear: b.academicYear,
      term: b.term,
      status: b.status,
      expectedIncome: b.totalExpectedIncome,
      allocated: b.totalAllocated,
      remaining: b.remainingBalance,
    }));
    downloadCsv(`school-budgets-${Date.now()}.csv`, headers, rows);
    showToast('CSV exported');
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFreeze = async (line) => {
    const id = line.db_id ?? line.id;
    setFreezeBusyId(id);
    try {
      await freezeManagerBudgetLine(id, !line.isFrozen);
      showToast(line.isFrozen ? 'Line unfrozen' : 'Line frozen');
      await Promise.all([loadLines(), loadOverview()]);
    } catch (e) {
      showToast(e.message || 'Freeze failed', 'error');
    } finally {
      setFreezeBusyId(null);
    }
  };

  const ov = overview || {};

  const filteredStatCards = useMemo(() => {
    const rows = filteredBudgets;
    const lineRows = filteredLines;
    const expectedIncome = rows.reduce((s, b) => s + Number(b.totalExpectedIncome || 0), 0);
    const allocated = rows.reduce((s, b) => s + Number(b.totalAllocated || 0), 0);
    const used = lineRows.reduce((s, l) => s + Number(l.usedAmount || 0), 0);
    const remaining = rows.reduce((s, b) => s + Number(b.remainingBalance ?? 0), 0);
    const pending = rows.filter((b) => String(b.status).toLowerCase() === 'pending_approval').length;
    const rejected = rows.filter((b) => String(b.status).toLowerCase() === 'rejected').length;
    const exhausted = lineRows.filter((l) => {
      const k = String(l.statusKey || l.status || '').toLowerCase();
      return k === 'exhausted';
    }).length;
    const usagePct = expectedIncome > 0 ? Math.round((used / expectedIncome) * 100) : 0;
    const surplusAccent = advanced.surplus >= 0 ? '#10B981' : '#EF4444';

    return [
      { key: 'remaining', label: 'Remaining', value: compactMoney(remaining), sub: money(remaining), accent: NAVY, icon: PieChart },
      { key: 'pending', label: 'Pending approvals', value: pending, sub: pending ? 'Needs review' : 'None waiting', accent: AMBER, icon: Bell },
      { key: 'rejected', label: 'Rejected', value: rejected, accent: NAVY, icon: XCircle },
      { key: 'exhausted', label: 'Exhausted lines', value: exhausted, accent: NAVY, icon: AlertTriangle },
      { key: 'usage', label: 'Budget usage', value: `${usagePct}%`, sub: 'of expected income', accent: NAVY, icon: BarChart3 },
      { key: 'term', label: 'Current term budget', value: advanced.termBudget?.title || '—', sub: advanced.termBudget ? money(advanced.termBudget.totalExpectedIncome) : undefined, accent: NAVY, icon: FileText },
      { key: 'yearIncome', label: 'Academic year income', value: compactMoney(advanced.yearIncome), sub: money(advanced.yearIncome), accent: NAVY, icon: TrendingUp },
      { key: 'yearAlloc', label: 'Year allocated', value: compactMoney(advanced.yearAllocated), sub: money(advanced.yearAllocated), accent: AMBER, icon: Scale },
      {
        key: 'surplus',
        label: advanced.surplus >= 0 ? 'Surplus' : 'Deficit',
        value: compactMoney(Math.abs(advanced.surplus)),
        sub: money(advanced.surplus),
        accent: surplusAccent,
        icon: CheckCircle2,
      },
      { key: 'monthly', label: 'Monthly spending', value: compactMoney(advanced.monthlyTotal), sub: 'from usage records', accent: AMBER, icon: TrendingUp },
      {
        key: 'topDept',
        label: 'Top spending dept',
        value: advanced.topDept?.[0] || '—',
        sub: advanced.topDept ? money(advanced.topDept[1]) : undefined,
        accent: NAVY,
        icon: Filter,
      },
      { key: 'total', label: 'Total budgets', value: rows.length, sub: `${rows.length} in view`, accent: NAVY, icon: ClipboardList },
      { key: 'income', label: 'Expected income', value: compactMoney(expectedIncome), sub: money(expectedIncome), accent: NAVY, icon: TrendingUp },
      { key: 'allocated', label: 'Allocated', value: compactMoney(allocated), sub: money(allocated), accent: AMBER, icon: Scale },
      { key: 'used', label: 'Used', value: compactMoney(used), sub: money(used), accent: AMBER, icon: BarChart3 },
    ];
  }, [filteredBudgets, filteredLines, advanced]);

  const budgetHeroKpis = useMemo(
    () => [
      { key: 'total', label: 'Total budgets', value: ov.totalBudgets ?? '—', subValue: 'All periods', icon: ClipboardList },
      { key: 'income', label: 'Expected income', value: compactMoney(ov.totalExpectedIncome), subValue: money(ov.totalExpectedIncome), icon: TrendingUp },
      { key: 'allocated', label: 'Allocated', value: compactMoney(ov.totalAllocatedBudget), subValue: money(ov.totalAllocatedBudget), icon: Scale },
      { key: 'used', label: 'Used', value: compactMoney(ov.totalUsedBudget), subValue: money(ov.totalUsedBudget), icon: BarChart3 },
    ],
    [ov.totalBudgets, ov.totalExpectedIncome, ov.totalAllocatedBudget, ov.totalUsedBudget],
  );

  const budgetHeroActions = (compact = false) => (
    <>
      <button
        type="button"
        onClick={batchApprove}
        disabled={reviewBusy || !pendingSelected.length}
        className={`${compact ? 'flex-1 min-w-[10rem]' : 'w-full'} h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50`}
        style={{ background: NAVY }}
      >
        <CheckCircle2 size={14} />
        <span>Approve selected ({pendingSelected.length})</span>
      </button>
      <button
        type="button"
        onClick={exportBudgetsCsv}
        className={`${compact ? 'flex-1 min-w-[10rem]' : 'w-full'} h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all`}
      >
        <Download size={14} style={{ color: '#FEBF10' }} />
        <span>Export CSV</span>
      </button>
      <button
        type="button"
        onClick={refreshAll}
        disabled={loading}
        className={`${compact ? 'flex-1 min-w-[10rem]' : 'w-full'} h-11 flex items-center justify-center gap-2 rounded-xl font-medium text-[9px] uppercase tracking-widest text-[#1E3A5F] border border-[#FEBF10]/40 bg-[#FEBF10]/15 hover:bg-[#FEBF10]/25 transition-all disabled:opacity-50`}
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        <span>Refresh data</span>
      </button>
    </>
  );

  const renderBudgetRowActions = (b) => {
    const id = budgetDbId(b);
    const isPending = String(b.status).toLowerCase() === 'pending_approval';
    if (isPending) {
      return (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={reviewBusy}
            onClick={() => quickApprove(b)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 size={12} /> Approve
          </button>
          <button
            type="button"
            disabled={reviewBusy}
            onClick={() => openReview(b, 'reject')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle size={12} /> Reject
          </button>
          <button type="button" onClick={() => openReview(b, 'approve')} className="p-1.5 rounded-lg hover:bg-slate-100" title="More options">
            <MoreVertical size={14} className="text-slate-500" />
          </button>
        </div>
      );
    }
    return (
      <button type="button" onClick={() => setDetailBudgetId(id)} className="text-[10px] font-bold uppercase text-[#1E3A5F] hover:underline">
        View
      </button>
    );
  };

  const PendingApprovalsBanner = () => {
    if (!pendingBudgets.length) return null;
    return (
      <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-50/50 p-4 md:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Action required</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{pendingBudgets.length} budget{pendingBudgets.length > 1 ? 's' : ''} pending approval</h3>
          </div>
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, status: 'pending_approval' }))}
            className="text-[10px] font-bold uppercase px-3 py-2 rounded-xl border border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            Show pending only
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pendingBudgets.slice(0, 4).map((b) => (
            <div key={budgetDbId(b)} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{b.title}</p>
                  <p className="text-[10px] text-slate-500">{b.budgetCode} · {b.term}</p>
                </div>
                <Badge status={b.status} />
              </div>
              <p className="text-lg font-bold mt-2" style={{ color: NAVY }}>{money(b.totalExpectedIncome)}</p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => quickApprove(b)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <CheckCircle2 size={14} /> Approve
                </button>
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => openReview(b, 'reject')}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[10px] font-bold uppercase hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BudgetsTab = () => (
    <div className="space-y-4">
      <PendingApprovalsBanner />
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-3 py-3 w-8" />
              {['Code', 'Title', 'Year', 'Term', 'Status', 'Income', 'Allocated', 'Actions'].map((h) => (
                <th key={h || 'act'} className="px-3 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabLoading ? (
              <tr><td colSpan={9} className="py-12"><Spinner /></td></tr>
            ) : filteredBudgets.length === 0 ? (
              <tr><td colSpan={9}><Empty /></td></tr>
            ) : filteredBudgets.map((b) => {
              const id = budgetDbId(b);
              const isPending = String(b.status).toLowerCase() === 'pending_approval';
              return (
                <tr key={id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-3 py-3">
                    {isPending && (
                      <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleSelect(id)} className="rounded" />
                    )}
                  </td>
                  <td className="px-3 py-3 text-[11px] font-bold text-slate-700">{b.budgetCode || b.id}</td>
                  <td className="px-3 py-3 text-[11px] font-semibold text-slate-700 max-w-[140px] truncate">{b.title}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{b.academicYear}</td>
                  <td className="px-3 py-3 text-[11px] text-slate-600">{b.term}</td>
                  <td className="px-3 py-3"><Badge status={b.status} /></td>
                  <td className="px-3 py-3 text-[11px] font-bold" style={{ color: NAVY }}>{money(b.totalExpectedIncome)}</td>
                  <td className="px-3 py-3 text-[11px] font-bold text-amber-700">{money(b.totalAllocated)}</td>
                  <td className="px-3 py-3">{renderBudgetRowActions(b)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {filteredBudgets.map((b) => {
          const id = budgetDbId(b);
          return (
            <div key={id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-[11px] font-bold text-slate-800">{b.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{b.budgetCode || b.id}</p>
                </div>
                <Badge status={b.status} />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">{b.academicYear} · {b.term}</p>
              <p className="text-sm font-bold mt-2" style={{ color: NAVY }}>{money(b.totalExpectedIncome)}</p>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={() => setDetailBudgetId(id)} className="flex-1 py-2 rounded-xl border border-slate-200 text-[10px] font-bold uppercase">View</button>
                {String(b.status).toLowerCase() === 'pending_approval' && (
                  <>
                    <button type="button" disabled={reviewBusy} onClick={() => quickApprove(b)} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-bold uppercase">Approve</button>
                    <button type="button" disabled={reviewBusy} onClick={() => openReview(b, 'reject')} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-[10px] font-bold uppercase">Reject</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const LinesTab = () => (
    <div className="space-y-4">
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Line', 'Department', 'Planned', 'Used', 'Usage %', 'Status', ''].map((h) => (
                <th key={h || 'a'} className="px-4 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredLines.length === 0 ? (
              <tr><td colSpan={7}><Empty /></td></tr>
            ) : filteredLines.map((l) => (
              <tr key={l.db_id ?? l.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{l.lineName}</td>
                <td className="px-4 py-3 text-[11px] text-slate-600">{l.department}</td>
                <td className="px-4 py-3 text-[11px] font-bold">{money(l.plannedAmount)}</td>
                <td className="px-4 py-3 text-[11px] font-bold text-amber-700">{money(l.usedAmount)}</td>
                <td className="px-4 py-3 text-[11px] font-bold">{l.usagePct}%</td>
                <td className="px-4 py-3"><LineBadge statusKey={l.statusKey} label={l.statusLabel} /></td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={freezeBusyId === (l.db_id ?? l.id)}
                    onClick={() => handleFreeze(l)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold hover:bg-slate-50 disabled:opacity-50"
                  >
                    {freezeBusyId === (l.db_id ?? l.id) ? <Loader2 size={12} className="animate-spin" /> : <Snowflake size={12} />}
                    {l.isFrozen ? 'Unfreeze' : 'Freeze'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {filteredLines.map((l) => (
          <div key={l.db_id ?? l.id} className="bg-white border border-slate-100 rounded-2xl p-4">
            <div className="flex justify-between"><p className="font-bold text-sm">{l.lineName}</p><LineBadge statusKey={l.statusKey} label={l.statusLabel} /></div>
            <p className="text-[10px] text-slate-500">{l.department} · {l.usagePct}% used</p>
            <p className="text-sm font-bold mt-1">{money(l.usedAmount)} / {money(l.plannedAmount)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const TrackingTab = () => (
    <div className="space-y-4">
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Date', 'Line', 'Amount', 'Category', 'Payment', 'Description'].map((h) => (
                <th key={h} className="px-4 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsage.length === 0 ? (
              <tr><td colSpan={6}><Empty text="No usage records" /></td></tr>
            ) : filteredUsage.map((u) => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3 text-[11px]">{dateOnly(u.usageDate)}</td>
                <td className="px-4 py-3 text-[11px] font-bold">{u.lineName}</td>
                <td className="px-4 py-3 text-[11px] font-bold" style={{ color: NAVY }}>{money(u.usageAmount)}</td>
                <td className="px-4 py-3 text-[11px]">{u.expenseCategory || '—'}</td>
                <td className="px-4 py-3 text-[11px]">{u.paymentMethod || '—'}</td>
                <td className="px-4 py-3 text-[11px] text-slate-500 max-w-[200px] truncate">{u.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {filteredUsage.map((u) => (
          <div key={u.id} className="bg-white border border-slate-100 rounded-2xl p-4">
            <p className="font-bold text-sm">{u.lineName}</p>
            <p className="text-[10px] text-slate-500">{dateOnly(u.usageDate)}</p>
            <p className="text-lg font-bold mt-1" style={{ color: NAVY }}>{money(u.usageAmount)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const reportContext = useMemo(
    () => ({ budgets: filteredBudgets, lines: filteredLines, usage: filteredUsage, overview: ov }),
    [filteredBudgets, filteredLines, filteredUsage, ov],
  );

  const handleReportPdf = (name) => {
    try {
      const cfg = exportBudgetReportPdf(name, reportContext);
      if (!cfg.rows.length) showToast('No data for this report', 'error');
      else showToast(`${name} PDF downloaded`);
    } catch (e) {
      showToast(e.message || 'PDF export failed', 'error');
    }
  };

  const handleReportExcel = (name) => {
    try {
      const cfg = exportBudgetReportExcel(name, reportContext);
      if (!cfg.rows.length) showToast('No data for this report', 'error');
      else showToast(`${name} Excel downloaded`);
    } catch (e) {
      showToast(e.message || 'Excel export failed', 'error');
    }
  };

  const ReportsTab = () => (
    <div className="space-y-6">
      <BudgetPushBanner api={api} />
      {REPORT_ITEMS.map((grp) => (
        <div key={grp.group}>
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{grp.group}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {grp.items.map((name) => (
              <div key={name} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-700">{name}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => handleReportPdf(name)} className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-[9px] font-bold uppercase hover:bg-slate-50">PDF</button>
                  <button type="button" onClick={() => handleReportExcel(name)} className="px-2 py-1 rounded-lg text-white text-[9px] font-bold uppercase" style={{ background: NAVY }}>Excel</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const AnalyticsTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><PieChart size={12} /> Allocation by department</h3>
        {pieData.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <RePieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => money(v)} />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl p-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={12} /> Department spending</h3>
        {barDeptData.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barDeptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={compactMoney} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="spent" fill={NAVY} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl p-4 lg:col-span-2">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={12} /> Monthly expenses</h3>
        {lineChartData.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={compactMoney} />
              <Tooltip formatter={(v) => money(v)} />
              <Line type="monotone" dataKey="amount" stroke={AMBER} strokeWidth={2} dot={{ fill: NAVY }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  const AuditTab = () => (
    <div className="space-y-4">
      <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Action', 'Entity', 'User', 'Time', 'Details'].map((h) => (
                <th key={h} className="px-4 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabLoading ? (
              <tr><td colSpan={5} className="py-12"><Spinner /></td></tr>
            ) : auditLogs.length === 0 ? (
              <tr><td colSpan={5}><Empty text="No audit logs" /></td></tr>
            ) : auditLogs.map((log) => (
              <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{log.action_name || log.action || '—'}</td>
                <td className="px-4 py-3 text-[11px]">{log.entity_type} #{log.entity_id}</td>
                <td className="px-4 py-3 text-[11px]">{log.role_code || log.user_id || '—'}</td>
                <td className="px-4 py-3 text-[11px]">{dateOnly(log.created_at)}</td>
                <td className="px-4 py-3 text-[10px] text-slate-500 max-w-[200px] truncate">{log.endpoint || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden space-y-3">
        {auditLogs.map((log) => (
          <div key={log.id} className="bg-white border border-slate-100 rounded-2xl p-4">
            <p className="font-bold text-sm">{log.action_name || log.action}</p>
            <p className="text-[10px] text-slate-500">{log.entity_type} · {dateOnly(log.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const DashboardTab = () => (
    <div className="space-y-4">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        Adjust filters in the left panel to refine statistics across all tabs.
      </p>
      <div>
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Recent budgets</h3>
        <BudgetsTab />
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <ManagerOchreHeroShell
        outerClassName="animate-in fade-in duration-500 bg-re-bg min-h-screen pb-20"
        overlapClassName="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 mb-6"
        eyebrow="Finance"
        title="School budget management"
        subtitle="Approve, track & analyze school budgets"
        HeroIcon={PieChart}
        kpiTiles={[]}
        cardBody={(
          <>
            <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
              <div className="lg:col-span-3 grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-black/5">
                {budgetHeroKpis.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.key}
                      className="p-4 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/40 transition-all min-h-[7.5rem]"
                    >
                      <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                        <Icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
                      </div>
                      <span className="text-sm sm:text-lg font-semibold text-re-text tabular-nums tracking-tight leading-snug">
                        {stat.value}
                      </span>
                      <p className="text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.12em] mt-0.5 opacity-65">
                        {stat.label}
                      </p>
                      {stat.subValue ? (
                        <p className="text-[6px] sm:text-[7px] font-semibold uppercase tracking-[0.14em] mt-1 opacity-80 max-w-[11rem] text-[#1E3A5F]">
                          {stat.subValue}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="hidden lg:flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
                {budgetHeroActions(false)}
              </div>
            </div>

            <div className="flex lg:hidden flex-wrap gap-2 p-4 border-b border-black/5 bg-slate-50/80">
              {budgetHeroActions(true)}
            </div>

            <nav
              className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-2 sm:px-4 py-2.5 sm:py-3"
              aria-label="Budget sections"
            >
              <div
                className="flex gap-1.5 sm:gap-2 overflow-x-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 lg:overflow-visible lg:flex-wrap lg:gap-1 lg:p-1 lg:rounded-xl lg:bg-slate-100/90 lg:border lg:border-slate-200/80 lg:snap-none"
                role="tablist"
              >
                {TABS.map((t) => {
                  const Icon = t.Icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => setTab(t.id)}
                      className={`snap-start shrink-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[3.25rem] sm:min-h-0 min-w-[4.75rem] sm:min-w-0 lg:flex-1 lg:min-w-[7rem] px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wide sm:tracking-widest whitespace-nowrap transition-all border touch-manipulation ${
                        active
                          ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm ring-1 ring-[#1E3A5F]/20'
                          : 'bg-white text-slate-500 border-slate-200/90 hover:border-slate-300 hover:text-[#1E3A5F] hover:bg-slate-50 active:scale-[0.98]'
                      }`}
                    >
                      <Icon size={15} className="shrink-0 sm:w-[14px] sm:h-[14px]" strokeWidth={active ? 2.25 : 2} aria-hidden />
                      <span className="leading-tight text-center sm:text-left max-w-[5rem] sm:max-w-none">
                        <span className="sm:hidden">{t.mobileLabel}</span>
                        <span className="hidden sm:inline">{t.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 px-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider lg:hidden">
                Swipe for more sections
              </p>
            </nav>
          </>
        )}
        pageBody={(
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-bold">
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {loading && tab === 'dashboard' ? (
              <div className="py-20"><Spinner /></div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className={`order-1 ${filtersOpen ? 'xl:col-span-4' : 'xl:col-span-12'}`}>
                  <FilterPanel
                    filters={filters}
                    setFilters={setFilters}
                    years={years}
                    departments={departments}
                    statCards={filteredStatCards}
                    loading={loading}
                    open={filtersOpen}
                    onToggle={() => setFiltersOpen((o) => !o)}
                  />
                </div>

                <div className={`order-2 ${filtersOpen ? 'xl:col-span-6' : 'xl:col-span-8'}`}>
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-4 md:p-6">
                    {tab === 'dashboard' && <DashboardTab />}
                    {tab === 'budgets' && <BudgetsTab />}
                    {tab === 'lines' && <LinesTab />}
                    {tab === 'tracking' && <TrackingTab />}
                    {tab === 'reports' && <ReportsTab />}
                    {tab === 'analytics' && <AnalyticsTab />}
                    {tab === 'audit' && <AuditTab />}
                  </div>
                </div>

                <div className={`order-3 ${filtersOpen ? 'xl:col-span-2' : 'xl:col-span-4'}`}>
                  <NotificationsPanel alerts={ov.alerts} />
                </div>
              </div>
            )}
          </div>
        )}
      />

      {toast && createPortal(
        <div className={`fixed top-5 right-5 z-[300] px-4 py-3 rounded-xl text-[11px] font-bold shadow-lg ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-800 border border-emerald-100'}`}>
          {toast.message}
        </div>,
        document.body,
      )}

      {approvalBudget && (
        <ApprovalModal
          budget={approvalBudget}
          initialDecision={approvalInitialDecision}
          onClose={() => setApprovalBudget(null)}
          onSubmit={(payload) => handleReview(approvalBudget, payload)}
          busy={reviewBusy}
        />
      )}
      {detailBudgetId && <BudgetDetailModal budgetId={detailBudgetId} onClose={() => setDetailBudgetId(null)} />}
    </div>
  );
}
