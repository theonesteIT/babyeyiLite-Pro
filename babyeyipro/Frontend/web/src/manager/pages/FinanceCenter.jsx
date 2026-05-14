import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Calendar,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Loader2,
  PieChart,
  RefreshCw,
  Search,
  User,
  Wallet,
  X,
  AlertCircle,
} from 'lucide-react';

/** Matches manager theme; drawer is portaled so it needs its own stack. */
const FC_FONT = "'Montserrat', system-ui, sans-serif";

/* ─── helpers ─── */
function getAcademicYears() {
  const now = new Date().getFullYear();
  return ['ALL', ...[0, -1, -2, -3].map((offset) => {
    const y = now + offset;
    return `${y}-${y + 1}`;
  })];
}

function buildTermRange(academicYear, term) {
  const [a, b] = String(academicYear || '').split('-').map((v) => Number(v));
  if (!a || !b) return { from: '', to: '' };
  if (term === 'Term 1') return { from: `${a}-09-01`, to: `${a}-12-31` };
  if (term === 'Term 2') return { from: `${b}-01-01`, to: `${b}-04-30` };
  if (term === 'Term 3') return { from: `${b}-05-01`, to: `${b}-08-31` };
  return { from: `${a}-09-01`, to: `${b}-08-31` };
}

function dateOnly(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function inRange(dateValue, from, to) {
  const d = dateOnly(dateValue);
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function money(v) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(Number(v || 0));
}

function expenseCanDecide(r) {
  const s = String(r?.status || '').toLowerCase();
  return s === 'pending_approval' || s === 'pending';
}

function requisitionCanDecide(r) {
  const s = String(r?.status || '').toLowerCase();
  return s === 'pending' || s === 'pending_approval';
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
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadPdf({ filename, title, subtitle, headers, rows }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 54;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text(title, margin, y); y += 16;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text(subtitle, margin, y); y += 20;
  doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(headers.join(' | '), margin, y); y += 14;
  doc.setFont('helvetica', 'normal');
  rows.forEach((row) => {
    const line = headers.map((h) => String(row[h] ?? '')).join(' | ');
    const wrapped = doc.splitTextToSize(line, width - margin * 2);
    wrapped.forEach((part) => {
      if (y > height - 36) { doc.addPage(); y = 50; }
      doc.text(part, margin, y); y += 12;
    });
  });
  doc.save(filename);
}

/* ─── Toast ─── */
function Toast({ toast }) {
  if (!toast?.message) return null;
  const isError = toast.type === 'error';
  return (
    <div className="fixed top-5 right-5 z-[400] max-w-xs" style={{ fontFamily: FC_FONT }}>
      <div
        style={{
          background: isError ? '#fff0f0' : '#fff8e6',
          border: `1.5px solid ${isError ? '#fca5a5' : '#FBBF24'}`,
          color: isError ? '#991b1b' : '#000435',
          borderRadius: 14,
          padding: '12px 16px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.02em',
          boxShadow: '0 4px 24px rgba(0,4,53,0.10)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <AlertCircle size={14} />
        {toast.message}
      </div>
    </div>
  );
}

/* ─── Decision Modal ─── */
function DecisionModal({ open, title, actionLabel, loading, note, onNoteChange, onCancel, onConfirm, isApprove }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[350]" style={{ backdropFilter: 'blur(4px)', fontFamily: FC_FONT }}>
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div style={{
          background: '#fff',
          border: '1.5px solid rgba(0,4,53,0.10)',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(14,31,53,0.14)',
          width: '100%',
          maxWidth: 460,
          overflow: 'hidden',
        }}>
          {/* Header stripe */}
          <div style={{ background: '#000435', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: '#FBBF24', fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4 }}>
                Confirm decision
              </p>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h3>
            </div>
            <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#000435', opacity: 0.5, display: 'block', marginBottom: 8 }}>
              Optional note
            </label>
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Add a note for the record…"
              style={{
                width: '100%',
                minHeight: 100,
                resize: 'vertical',
                border: '1.5px solid rgba(0,4,53,0.12)',
                borderRadius: 12,
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 500,
                color: '#000435',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {/* Footer */}
          <div style={{ padding: '12px 24px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              disabled={loading}
              style={{
                height: 40, padding: '0 18px', borderRadius: 10,
                border: '1.5px solid rgba(0,4,53,0.15)', background: '#fff',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: '#000435', cursor: 'pointer', opacity: loading ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                height: 40, padding: '0 22px', borderRadius: 10,
                border: 'none',
                background: isApprove ? '#000435' : '#fff0f0',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: isApprove ? '#FBBF24' : '#991b1b',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Saving…' : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const configs = {
    pending: { bg: '#FFF8E1', color: '#92400E', border: '#FDE68A' },
    pending_approval: { bg: '#FFF8E1', color: '#92400E', border: '#FDE68A' },
    approved: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    paid: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    rejected: { bg: '#fff1f2', color: '#9f1239', border: '#fecdd3' },
    issued: { bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe' },
    returned: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
    cancelled: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
    forwarded: { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' },
  };
  const c = configs[s] || { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: '3px 10px',
      fontSize: 9, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
      display: 'inline-block',
    }}>
      {String(status || '—').replace(/_/g, ' ')}
    </span>
  );
}

/* ─── Detail Drawer ─── */
function FinanceDetailDrawer({ open, kind, row, onClose }) {
  if (!open || !row) return null;

  const portal = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 360, display: 'flex', justifyContent: 'flex-end', fontFamily: FC_FONT }}>
      <button
        aria-label="Close"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,4,53,0.35)', backdropFilter: 'blur(4px)', border: 'none', cursor: 'pointer' }}
      />
      <div style={{
        position: 'relative', height: '100%', width: '100%', maxWidth: 440,
        background: '#fff', boxShadow: '-20px 0 60px rgba(0,4,53,0.15)',
        display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(0,4,53,0.08)',
      }}>
        {/* Drawer header */}
        <div style={{ background: '#000435', padding: '24px 24px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: '#FBBF24', fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
                {kind === 'requisition' ? 'Requisition detail' : 'Expense detail'}
              </p>
              <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {kind === 'requisition' ? (row.requester || row.id) : (row.title || row.vendor || row.id)}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {kind === 'requisition' ? row.id : `${row.id} · ${row.category || 'General'}`}
              </p>
            </div>
            <button onClick={onClose} style={{ flexShrink: 0, background: 'rgba(255,255,255,0.10)', border: 'none', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#fff', display: 'flex' }}>
              <X size={18} />
            </button>
          </div>
          <div style={{
            marginTop: 16, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 4 }}>Amount</p>
              <p style={{ color: '#FBBF24', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{money(row.amount)}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
        </div>

        {/* Drawer body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {kind === 'expense' ? (
            <>
              <DrawerSection icon={<User size={13} />} title="Recorded by">
                <InfoRow label="Name" value={row.created_by_name || 'Not linked'} />
                {row.created_by_email && <InfoRow label="Email" value={row.created_by_email} />}
                {row.created_by_user_id && <InfoRow label="User ID" value={row.created_by_user_id} mono />}
              </DrawerSection>
              <DrawerSection icon={<FileText size={13} />} title="Details">
                {[['Vendor', row.vendor], ['Category', row.category], ['Due date', dateOnly(row.due_date)], ['Created', dateOnly(row.created_at)], ['Note', row.note]].map(([k, v]) =>
                  <InfoRow key={k} label={k} value={v || '—'} />
                )}
              </DrawerSection>
              <DrawerSection icon={<Wallet size={13} />} title="Payments">
                {Array.isArray(row.payments) && row.payments.length > 0 ? (
                  row.payments.map((p) => (
                    <div key={p.id} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#166534' }}>
                        <span>{money(p.amount)}</span>
                        <span style={{ color: '#475569', fontWeight: 500 }}>{dateOnly(p.date) || '—'}</span>
                      </div>
                      <p style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{p.method || 'Payment'}{p.reference ? ` · ${p.reference}` : ''}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '16px 0', borderTop: '1px dashed #e2e8f0' }}>No payments posted yet.</p>
                )}
              </DrawerSection>
            </>
          ) : (
            <>
              <DrawerSection icon={<User size={13} />} title="Requester">
                <InfoRow label="Name" value={row.requester || '—'} />
                <InfoRow label="Department" value={row.dept || '—'} />
              </DrawerSection>
              <DrawerSection icon={<FileText size={13} />} title="Request content">
                {[['Items', row.items], ['Purpose', row.purpose], ['Quantity', row.qty > 0 ? String(row.qty) : null], ['Priority', row.priority_level], ['Expected return', dateOnly(row.expected_return_date)], ['Note', row.note], ['Status note', row.status_note]].map(([k, v]) =>
                  <InfoRow key={k} label={k} value={v || '—'} />
                )}
              </DrawerSection>
              <DrawerSection icon={<Calendar size={13} />} title="Workflow">
                {[['Submitted', dateOnly(row.submitted)], ['Approved', dateOnly(row.approved_at)], ['Issued', dateOnly(row.issued_at)], ['Source portal', row.source_portal], ['Destination', row.destination], ['Forwarded to', row.forwarded_to]].map(([k, v]) =>
                  <InfoRow key={k} label={k} value={v || '—'} />
                )}
              </DrawerSection>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(portal, document.body);
}

function DrawerSection({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ color: '#FBBF24' }}>{icon}</span>
        <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000435', opacity: 0.45 }}>{title}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
      background: '#f8fafc', border: '1px solid rgba(0,4,53,0.06)',
      borderRadius: 8, padding: '8px 12px',
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#000435', textAlign: 'right', wordBreak: 'break-all', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

/* ─── Tab Button ─── */
function Tab({ id, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        padding: '9px 18px', borderRadius: 10,
        background: active ? '#000435' : 'transparent',
        color: active ? '#FBBF24' : '#64748b',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: active ? '0 4px 14px rgba(0,4,53,0.20)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

/* ─── Action Button ─── */
function ActionBtn({ children, onClick, disabled, variant = 'primary' }) {
  const variants = {
    primary: { background: '#000435', color: '#FBBF24', border: 'none' },
    approve: { background: '#000435', color: '#FBBF24', border: 'none' },
    reject: { background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3' },
    ghost: { background: '#fff', color: '#000435', border: '1.5px solid rgba(0,4,53,0.12)' },
    export: { background: '#fff', color: '#000435', border: '1.5px solid rgba(0,4,53,0.12)' },
  };
  const s = variants[variant] || variants.primary;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 36, padding: '0 14px', borderRadius: 10,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
        ...s,
      }}
    >
      {children}
    </button>
  );
}

/* ─── MAIN COMPONENT ─── */
export default function FinanceCenter() {
  const [activeTab, setActiveTab] = useState('expenses');
  const [academicYear, setAcademicYear] = useState('ALL');
  const [term, setTerm] = useState('All Terms');
  const [specificDate, setSpecificDate] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('all');
  const [requisitionStatusFilter, setRequisitionStatusFilter] = useState('all');

  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [toast, setToast] = useState(null);
  const [decisionModal, setDecisionModal] = useState({ open: false, kind: 'expense', row: null, decision: '', note: '' });
  const [detailDrawer, setDetailDrawer] = useState({ open: false, kind: 'expense', row: null });

  const [expenses, setExpenses] = useState([]);
  const [requisitions, setRequisitions] = useState([]);

  const resolvedRange = useMemo(() => {
    if (specificDate) return { from: specificDate, to: specificDate };
    if (fromDate || toDate) return { from: fromDate || '', to: toDate || '' };
    if (!academicYear || academicYear === 'ALL' || term === 'All Terms') return { from: '', to: '' };
    return buildTermRange(academicYear, term);
  }, [academicYear, term, specificDate, fromDate, toDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, reqRes] = await Promise.allSettled([
        api.get('/accountant/expenses'),
        api.get('/accountant/requisitions'),
      ]);
      setExpenses(expRes.status === 'fulfilled' && expRes.value.data?.success ? (expRes.value.data.data || []) : []);
      setRequisitions(reqRes.status === 'fulfilled' && reqRes.value.data?.success ? (reqRes.value.data.data || []) : []);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((r) => {
      const matchesRange = !resolvedRange.from && !resolvedRange.to ? true : inRange(r.created_at || r.due_date, resolvedRange.from, resolvedRange.to);
      const matchesQ = !q || [r.title, r.vendor, r.id].some((v) => String(v || '').toLowerCase().includes(q));
      const st = String(r.status || '').toLowerCase();
      const matchesStatus = expenseStatusFilter === 'all' ? true : expenseStatusFilter === 'pending' ? (st === 'pending_approval' || st === 'pending') : st === expenseStatusFilter;
      return matchesRange && matchesQ && matchesStatus;
    });
  }, [expenses, search, resolvedRange, expenseStatusFilter]);

  const filteredRequisitions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requisitions.filter((r) => {
      const matchesRange = !resolvedRange.from && !resolvedRange.to ? true : inRange(r.submitted, resolvedRange.from, resolvedRange.to);
      const matchesQ = !q || [r.requester, r.dept, r.id].some((v) => String(v || '').toLowerCase().includes(q));
      const st = String(r.status || '').toLowerCase();
      const matchesStatus = requisitionStatusFilter === 'all' ? true : requisitionStatusFilter === 'pending' ? (st === 'pending' || st === 'pending_approval') : st === requisitionStatusFilter;
      return matchesRange && matchesQ && matchesStatus;
    });
  }, [requisitions, search, resolvedRange, requisitionStatusFilter]);

  const headerStats = useMemo(() => {
    const pendingExpenses = filteredExpenses.filter((x) => { const st = String(x.status || '').toLowerCase(); return st === 'pending_approval' || st === 'pending'; }).length;
    const pendingReq = filteredRequisitions.filter((x) => { const st = String(x.status || '').toLowerCase(); return st === 'pending' || st === 'pending_approval'; }).length;
    return { pendingExpenses, pendingReq };
  }, [filteredExpenses, filteredRequisitions]);

  const exportConfig = useMemo(() => {
    if (activeTab === 'expenses') {
      const rows = filteredExpenses.map((r) => ({ expense_id: r.id, title: r.title || '', vendor: r.vendor || '', amount_rwf: Number(r.amount || 0), status: r.status || '', due_date: dateOnly(r.due_date), created_at: dateOnly(r.created_at) }));
      return { slug: 'expenses', title: 'Manager Expense Approvals', headers: ['expense_id', 'title', 'vendor', 'amount_rwf', 'status', 'due_date', 'created_at'], rows };
    }
    const rows = filteredRequisitions.map((r) => ({ requisition_id: r.id, requester: r.requester || '', department: r.dept || '', amount_rwf: Number(r.amount || 0), status: r.status || '', submitted_at: dateOnly(r.submitted) }));
    return { slug: 'requisitions', title: 'Manager Requisition Approvals', headers: ['requisition_id', 'requester', 'department', 'amount_rwf', 'status', 'submitted_at'], rows };
  }, [activeTab, filteredExpenses, filteredRequisitions]);

  const handleExportCsv = () => {
    if (!exportConfig.rows.length) { setToast({ type: 'error', message: 'No rows to export.' }); return; }
    downloadCsv(`${exportConfig.slug}-${Date.now()}.csv`, exportConfig.headers, exportConfig.rows);
    setToast({ type: 'success', message: 'CSV downloaded.' });
  };
  const handleExportPdf = () => {
    if (!exportConfig.rows.length) { setToast({ type: 'error', message: 'No rows to export.' }); return; }
    downloadPdf({ filename: `${exportConfig.slug}-${Date.now()}.pdf`, title: exportConfig.title, subtitle: `${academicYear} · ${term}`, headers: exportConfig.headers, rows: exportConfig.rows });
    setToast({ type: 'success', message: 'PDF downloaded.' });
  };
  const handleExportExcel = () => {
    if (!exportConfig.rows.length) { setToast({ type: 'error', message: 'No rows to export.' }); return; }
    const ws = XLSX.utils.json_to_sheet(exportConfig.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${exportConfig.slug}-${Date.now()}.xlsx`);
    setToast({ type: 'success', message: 'Excel downloaded.' });
  };

  const decideExpense = async (row, decision, note = '') => {
    const dbId = Number(row.db_id);
    if (!dbId) return;
    const key = `exp:${dbId}:${decision}`;
    setBusyKey(key);
    try {
      try {
        await api.patch(`/manager/expenses/${dbId}/decision`, { decision, note });
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        await api.patch(`/accountant/expenses/${dbId}/status`, { status: decision, note });
      }
      setToast({ type: 'success', message: `Expense ${decision}.` });
      await loadData();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Decision failed.' });
    } finally { setBusyKey(''); }
  };

  const decideRequisition = async (row, status, note = '') => {
    const dbId = Number(row.db_id);
    if (!dbId) return;
    const key = `req:${dbId}:${status}`;
    setBusyKey(key);
    try {
      try {
        await api.patch(`/manager/requisitions/${dbId}/decision`, { decision: status, note });
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        await api.patch(`/accountant/requisitions/${dbId}/status`, { status, note });
      }
      setToast({ type: 'success', message: `Requisition ${status}.` });
      await loadData();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Decision failed.' });
    } finally { setBusyKey(''); }
  };

  const submitDecision = async () => {
    if (!decisionModal.row || !decisionModal.decision) return;
    if (decisionModal.kind === 'expense') await decideExpense(decisionModal.row, decisionModal.decision, decisionModal.note || '');
    else await decideRequisition(decisionModal.row, decisionModal.decision, decisionModal.note || '');
    setDecisionModal({ open: false, kind: 'expense', row: null, decision: '', note: '' });
  };

  const tabs = [
    { id: 'expenses', label: 'Expenses' },
    { id: 'requisitions', label: 'Requisitions' },
  ];

  const financeHeroTiles = useMemo(
    () => [
      {
        key: 'pe',
        label: 'Pending expenses',
        value: headerStats.pendingExpenses,
        subValue: 'Tap to open queue',
        icon: Wallet,
        highlight: headerStats.pendingExpenses > 0,
        selected: activeTab === 'expenses' && expenseStatusFilter === 'pending',
        onClick: () => {
          setActiveTab('expenses');
          setExpenseStatusFilter('pending');
        },
      },
      {
        key: 'pr',
        label: 'Pending requisitions',
        value: headerStats.pendingReq,
        subValue: 'Tap to open queue',
        icon: ClipboardList,
        highlight: headerStats.pendingReq > 0,
        selected: activeTab === 'requisitions' && requisitionStatusFilter === 'pending',
        onClick: () => {
          setActiveTab('requisitions');
          setRequisitionStatusFilter('pending');
        },
      },
    ],
    [activeTab, expenseStatusFilter, requisitionStatusFilter, headerStats]
  );

  const fieldClass = 'h-11 w-full min-w-0 rounded-xl border border-slate-200/90 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm outline-none transition focus:border-[#1E3A5F]/35 focus:ring-2 focus:ring-[#1E3A5F]/10 placeholder:text-slate-400';

  return (
    <div
      className="animate-in fade-in duration-500 bg-re-bg min-h-screen pb-16 sm:pb-20 lg:pb-12 antialiased"
      style={{ fontFamily: FC_FONT }}
    >
      <Toast toast={toast} />
      <DecisionModal
        open={decisionModal.open}
        title={`${decisionModal.kind === 'requisition' ? 'Requisition' : 'Expense'} — ${String(decisionModal.decision || '').replace(/_/g, ' ')}`}
        actionLabel={decisionModal.decision ? `Confirm ${decisionModal.decision}` : 'Confirm'}
        isApprove={decisionModal.decision === 'approved'}
        loading={!!busyKey && !!decisionModal.row
          ? busyKey === `${decisionModal.kind === 'requisition' ? 'req' : 'exp'}:${decisionModal.row?.db_id}:${decisionModal.decision}`
          : false}
        note={decisionModal.note}
        onNoteChange={(v) => setDecisionModal((p) => ({ ...p, note: v }))}
        onCancel={() => setDecisionModal({ open: false, kind: 'expense', row: null, decision: '', note: '' })}
        onConfirm={submitDecision}
      />
      <FinanceDetailDrawer
        open={detailDrawer.open}
        kind={detailDrawer.kind}
        row={detailDrawer.row}
        onClose={() => setDetailDrawer({ open: false, kind: 'expense', row: null })}
      />

      {/* Hero — same institutional pattern as Dashboard.jsx */}
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 min-w-0">
              <div className="hidden sm:flex shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-3xl border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-sm">
                <PieChart size={36} className="text-[#FEBF10]" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="space-y-1 max-w-3xl min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
                </div>
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.28em] text-[#FEBF10]">School manager</p>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white tracking-tight leading-tight uppercase">
                  Financial overview
                </h1>
                <p className="text-xs sm:text-sm font-medium text-white/80 max-w-xl leading-relaxed tracking-wide">
                  Approvals and requisitions in one workspace — refine the view with the filters below.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" aria-hidden />
                {headerStats.pendingExpenses} expense{headerStats.pendingExpenses !== 1 ? 's' : ''} pending
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-[#FEBF10] shrink-0" aria-hidden />
                {headerStats.pendingReq} requisition{headerStats.pendingReq !== 1 ? 's' : ''} pending
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 mb-6 sm:mb-8">
        <div className="bg-white rounded-t-[28px] sm:rounded-t-[32px] rounded-b-[20px] sm:rounded-b-[28px] shadow-[0_12px_48px_-18px_rgba(14,31,53,0.12)] border border-slate-200/90 overflow-hidden flex flex-col">
          <div className="grid grid-cols-2 divide-x divide-y divide-black/5">
            {financeHeroTiles.map((stat) => {
              const Icon = stat.icon;
              const inner = (
                <>
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
                    <p className="text-[6px] sm:text-[7px] font-semibold uppercase tracking-widest mt-1 opacity-80 max-w-[11rem] text-[#1E3A5F]">
                      {stat.subValue}
                    </p>
                  ) : null}
                  {stat.highlight ? (
                    <span className="mt-1.5 inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[6px] sm:text-[7px] font-bold uppercase tracking-wider text-amber-900 ring-1 ring-amber-500/25">
                      Action
                    </span>
                  ) : null}
                </>
              );
              const cellClass = `p-4 sm:p-5 flex flex-col items-center justify-center text-center min-h-[6.75rem] sm:min-h-[7.5rem] ${stat.selected ? 'ring-2 ring-inset ring-[#FEBF10]/35 bg-[#FEBF10]/[0.06]' : ''}`;
              return (
                <button
                  key={stat.key}
                  type="button"
                  onClick={stat.onClick}
                  className={`${cellClass} hover:bg-re-bg/40 transition-all cursor-pointer group`}
                >
                  {inner}
                </button>
              );
            })}
          </div>

        {/* ── Filters + workspace ── */}
        <div className="border-t border-black/5 bg-gradient-to-b from-slate-50/50 to-white p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5">
          {/* Tabs row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="inline-flex w-full max-w-full flex-wrap rounded-xl border border-slate-200/80 bg-slate-100/90 p-1 shadow-inner gap-0.5 sm:w-auto">
              {tabs.map((t) => (
                <Tab key={t.id} id={t.id} label={t.label} active={activeTab === t.id} onClick={setActiveTab} />
              ))}
            </div>
            {(activeTab === 'expenses' || activeTab === 'requisitions') && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400">Status</span>
                <div className="relative min-w-[10rem] flex-1 sm:flex-initial">
                  <select
                    value={activeTab === 'expenses' ? expenseStatusFilter : requisitionStatusFilter}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (activeTab === 'expenses') setExpenseStatusFilter(v);
                      else setRequisitionStatusFilter(v);
                    }}
                    className={`${fieldClass} cursor-pointer appearance-none pr-9`}
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
                </div>
              </div>
            )}
          </div>

          {/* Filters grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-stretch">
            <div className="relative lg:col-span-4 min-w-0">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, vendor, requester…"
                className={`${fieldClass} pl-9`}
              />
            </div>
            <div className="relative lg:col-span-2 min-w-0">
              <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={`${fieldClass} cursor-pointer appearance-none pr-8`}>
                {getAcademicYears().map((y) => (
                  <option key={y} value={y}>{y === 'ALL' ? 'All Years' : y}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            </div>
            <div className="relative lg:col-span-2 min-w-0">
              <select value={term} onChange={(e) => setTerm(e.target.value)} className={`${fieldClass} cursor-pointer appearance-none pr-8`}>
                {['All Terms', 'Term 1', 'Term 2', 'Term 3', 'Annual'].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            </div>
            <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className={`${fieldClass} lg:col-span-2`} />
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="h-11 rounded-xl bg-[#000435] text-amber-300 text-[10px] font-bold uppercase tracking-wider shadow-sm border-0 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer hover:opacity-95 transition-opacity lg:col-span-2"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden />
              Refresh
            </button>
          </div>

          {/* Date range + export */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400 shrink-0">Date range</span>
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`${fieldClass} w-full min-w-0 sm:w-40`} />
                <span className="hidden sm:inline text-xs font-semibold text-slate-400">—</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={`${fieldClass} w-full min-w-0 sm:w-40`} />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:flex-wrap sm:gap-2">
              <span className="text-[10px] font-bold text-slate-400 sm:mr-1">
                {exportConfig.rows.length} row{exportConfig.rows.length !== 1 ? 's' : ''}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  ['CSV', handleExportCsv],
                  ['PDF', handleExportPdf],
                  ['Excel', handleExportExcel],
                ].map(([label, fn]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={fn}
                    disabled={loading || !exportConfig.rows.length}
                    className="h-9 px-3 rounded-lg border border-[#000435]/12 bg-white text-[10px] font-bold tracking-wide text-[#000435] inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                  >
                    <Download size={11} aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Data panel ── */}
        <div className="border-t border-black/5 bg-white overflow-hidden">
          {loading ? (
            <div style={{ padding: '64px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#64748b' }}>
              <Loader2 size={20} className="animate-spin text-slate-500" aria-hidden />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading workspace…</span>
            </div>
          ) : (
            <>
              {/* ── Expenses ── */}
              {activeTab === 'expenses' && (
                <>
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,4,53,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', color: '#000435', margin: 0 }}>Expense Approvals</h3>
                      <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Open any row for context, then approve or reject.</p>
                    </div>
                  </div>
                  {filteredExpenses.length === 0 ? (
                    <EmptyState message="No expenses match your filters." hint="Try widening the date range or selecting 'All statuses'." />
                  ) : (
                    <>
                      <div className="min-w-0 w-full overflow-x-auto">
                        <div className="min-w-[52rem]">
                          <TableHeader cols={['Expense', 'Vendor', 'Amount', 'Status', 'Actions']} widths={['3fr', '2fr', '1.5fr', '1fr', '2.5fr']} />
                          <div>
                        {filteredExpenses.map((r, i) => {
                          const canDecide = expenseCanDecide(r);
                          const approveBusy = busyKey === `exp:${r.db_id}:approved`;
                          const rejectBusy = busyKey === `exp:${r.db_id}:rejected`;
                          const byLine = [r.created_by_name, r.created_by_email].filter(Boolean).join(' · ') || 'Account office';
                          return (
                            <div
                              key={r.id}
                              className="transition-colors duration-150 hover:bg-slate-50/90"
                              style={{
                                display: 'grid', gridTemplateColumns: '3fr 2fr 1.5fr 1fr 2.5fr', gap: 16,
                                alignItems: 'center', padding: '14px 24px',
                                borderBottom: i < filteredExpenses.length - 1 ? '1px solid rgba(0,4,53,0.05)' : 'none',
                                background: i % 2 === 0 ? '#fff' : '#fafbfc',
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#000435', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || r.id}</p>
                                <p style={{ fontSize: 10, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.id} · {byLine}</p>
                              </div>
                              <div style={{ fontSize: 12, color: '#475569', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.vendor || '—'}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#000435', fontVariantNumeric: 'tabular-nums' }}>{money(r.amount)}</div>
                              <div><StatusBadge status={r.status} /></div>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <ActionBtn variant="ghost" onClick={() => setDetailDrawer({ open: true, kind: 'expense', row: r })}>
                                  <Eye size={12} /> View
                                </ActionBtn>
                                <ActionBtn variant="approve" disabled={!canDecide || approveBusy || rejectBusy}
                                  onClick={() => setDecisionModal({ open: true, kind: 'expense', row: r, decision: 'approved', note: '' })}>
                                  {approveBusy ? 'Saving…' : 'Approve'}
                                </ActionBtn>
                                <ActionBtn variant="reject" disabled={!canDecide || approveBusy || rejectBusy}
                                  onClick={() => setDecisionModal({ open: true, kind: 'expense', row: r, decision: 'rejected', note: '' })}>
                                  {rejectBusy ? 'Saving…' : 'Reject'}
                                </ActionBtn>
                              </div>
                            </div>
                          );
                        })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Requisitions ── */}
              {activeTab === 'requisitions' && (
                <>
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(0,4,53,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.04em', color: '#000435', margin: 0 }}>Requisition Approvals</h3>
                      <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>View shows requester, department, items, routing and timeline.</p>
                    </div>
                  </div>
                  {filteredRequisitions.length === 0 ? (
                    <EmptyState message="No requisitions match your filters." hint="Adjust status or search by requester or department." />
                  ) : (
                    <>
                      <div className="min-w-0 w-full overflow-x-auto">
                        <div className="min-w-[52rem]">
                          <TableHeader cols={['Requester', 'Department', 'Amount', 'Status', 'Actions']} widths={['3fr', '2fr', '1.5fr', '1fr', '2.5fr']} />
                          <div>
                        {filteredRequisitions.map((r, i) => {
                          const canDecide = requisitionCanDecide(r);
                          const approveBusy = busyKey === `req:${r.db_id}:approved`;
                          const rejectBusy = busyKey === `req:${r.db_id}:rejected`;
                          return (
                            <div
                              key={r.id}
                              className="transition-colors duration-150 hover:bg-slate-50/90"
                              style={{
                                display: 'grid', gridTemplateColumns: '3fr 2fr 1.5fr 1fr 2.5fr', gap: 16,
                                alignItems: 'center', padding: '14px 24px',
                                borderBottom: i < filteredRequisitions.length - 1 ? '1px solid rgba(0,4,53,0.05)' : 'none',
                                background: i % 2 === 0 ? '#fff' : '#fafbfc',
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: '#000435', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.requester || '—'}</p>
                                <p style={{ fontSize: 10, color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.items || r.purpose || r.id}</p>
                              </div>
                              <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{r.dept || '—'}</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#000435', fontVariantNumeric: 'tabular-nums' }}>{money(r.amount)}</div>
                              <div><StatusBadge status={r.status} /></div>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <ActionBtn variant="ghost" onClick={() => setDetailDrawer({ open: true, kind: 'requisition', row: r })}>
                                  <Eye size={12} /> View
                                </ActionBtn>
                                <ActionBtn variant="approve" disabled={!canDecide || approveBusy || rejectBusy}
                                  onClick={() => setDecisionModal({ open: true, kind: 'requisition', row: r, decision: 'approved', note: '' })}>
                                  {approveBusy ? 'Saving…' : 'Approve'}
                                </ActionBtn>
                                <ActionBtn variant="reject" disabled={!canDecide || approveBusy || rejectBusy}
                                  onClick={() => setDecisionModal({ open: true, kind: 'requisition', row: r, decision: 'rejected', note: '' })}>
                                  {rejectBusy ? 'Saving…' : 'Reject'}
                                </ActionBtn>
                              </div>
                            </div>
                          );
                        })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
        </div>

        {/* ── Footer ── */}
        <div className="mt-3 flex items-center gap-2 px-1 py-2.5 text-slate-500">
          <Calendar size={12} className="text-slate-400 shrink-0" />
          <span className="text-[10px] font-semibold tracking-wide text-slate-400">
            Date window: {resolvedRange.from || '—'} → {resolvedRange.to || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

function TableHeader({ cols, widths }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: widths.join(' '),
      gap: 16, padding: '12px 24px',
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      borderBottom: '1px solid rgba(0,4,53,0.07)',
      fontFamily: FC_FONT,
    }}>
      {cols.map((c, i) => (
        <span key={c} style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#64748b', textAlign: i === cols.length - 1 ? 'right' : 'left',
        }}>{c}</span>
      ))}
    </div>
  );
}

function EmptyState({ message, hint }) {
  return (
    <div style={{ padding: '56px 24px', textAlign: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: 16, background: '#FFF8E1', border: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <FileText size={20} color="#FBBF24" />
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#000435', marginBottom: 6 }}>{message}</p>
      <p style={{ fontSize: 12, color: '#94a3b8' }}>{hint}</p>
    </div>
  );
}
