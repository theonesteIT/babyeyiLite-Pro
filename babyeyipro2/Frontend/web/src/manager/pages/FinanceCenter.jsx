import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react';
import {
  RegistryPageShell,
  RegistryPageHeader,
  RegistryStatGrid,
  RegistryCard,
  ExportSplitButton,
} from '../components/RegistryPageChrome';
import { useAuth } from '../context/AuthContext';

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

function csvCell(v) {
  const s = String(v ?? '');
  if (s.includes('"') || s.includes(',') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => csvCell(row[h])).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPdf({ filename, title, subtitle, headers, rows }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = 54;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(subtitle, margin, y);
  y += 20;

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(headers.join(' | '), margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');

  rows.forEach((row) => {
    const line = headers.map((h) => String(row[h] ?? '')).join(' | ');
    const wrapped = doc.splitTextToSize(line, width - margin * 2);
    wrapped.forEach((part) => {
      if (y > height - 36) {
        doc.addPage();
        y = 50;
      }
      doc.text(part, margin, y);
      y += 12;
    });
  });

  doc.save(filename);
}

function Toast({ toast }) {
  if (!toast?.message) return null;
  const error = toast.type === 'error';
  return (
    <div className="fixed top-4 right-4 z-[300] max-w-sm w-[calc(100%-2rem)] sm:w-auto">
      <div className={`rounded-xl border px-4 py-3 text-[11px] font-black uppercase tracking-wide shadow-xl ${error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
        {toast.message}
      </div>
    </div>
  );
}

function DecisionModal({ open, title, actionLabel, loading, note, onNoteChange, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[320]">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-black/10 shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#1E3A5F]">{title}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
              Optional note for manager decision
            </p>
          </div>
          <div className="p-5">
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Write note (optional)..."
              className="w-full min-h-[110px] rounded-xl border border-black/10 px-3 py-2 text-[11px] font-bold text-slate-700 outline-none focus:border-[#1E3A5F]/30"
            />
          </div>
          <div className="px-5 py-4 border-t border-black/5 bg-slate-50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="h-9 px-3 rounded-xl border border-black/10 bg-white text-[10px] font-black uppercase tracking-wider text-slate-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="h-9 px-4 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? 'Saving…' : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinanceCenter() {
  const { manager } = useAuth();
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
  const [decisionModal, setDecisionModal] = useState({
    open: false,
    kind: 'expense',
    row: null,
    decision: '',
    note: '',
  });

  const [expenses, setExpenses] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [staffAttendance, setStaffAttendance] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);

  const resolvedRange = useMemo(() => {
    if (specificDate) return { from: specificDate, to: specificDate };
    if (fromDate || toDate) return { from: fromDate || '', to: toDate || '' };
    if (!academicYear || academicYear === 'ALL' || term === 'All Terms') return { from: '', to: '' };
    return buildTermRange(academicYear, term);
  }, [academicYear, term, specificDate, fromDate, toDate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const attendanceParams = {};
      if (resolvedRange.from) attendanceParams.from = resolvedRange.from;
      if (resolvedRange.to) attendanceParams.to = resolvedRange.to;
      const [expRes, reqRes, payRes, staffRes, stuRes] = await Promise.allSettled([
        api.get('/accountant/expenses'),
        api.get('/accountant/requisitions'),
        api.get('/accountant/payroll'),
        api.get('/dos/reports/attendance/by-teacher', { params: attendanceParams }),
        api.get('/dos/reports/attendance/by-class', { params: attendanceParams }),
      ]);

      setExpenses(expRes.status === 'fulfilled' && expRes.value.data?.success ? (expRes.value.data.data || []) : []);
      setRequisitions(reqRes.status === 'fulfilled' && reqRes.value.data?.success ? (reqRes.value.data.data || []) : []);
      setPayroll(payRes.status === 'fulfilled' && payRes.value.data?.success ? (payRes.value.data.data || []) : []);
      setStaffAttendance(staffRes.status === 'fulfilled' && staffRes.value.data?.success ? (staffRes.value.data.data?.staff || []) : []);
      setStudentAttendance(stuRes.status === 'fulfilled' && stuRes.value.data?.success ? (stuRes.value.data.data?.classes || []) : []);
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Failed to load finance center data.' });
    } finally {
      setLoading(false);
    }
  }, [resolvedRange.from, resolvedRange.to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((r) => {
      const matchesRange = inRange(r.created_at || r.due_date, resolvedRange.from, resolvedRange.to);
      const matchesQ = !q || String(r.title || '').toLowerCase().includes(q) || String(r.vendor || '').toLowerCase().includes(q) || String(r.id || '').toLowerCase().includes(q);
      const st = String(r.status || '').toLowerCase();
      const matchesStatus =
        expenseStatusFilter === 'all'
          ? true
          : expenseStatusFilter === 'pending'
            ? st === 'pending_approval' || st === 'pending'
            : st === expenseStatusFilter;
      return matchesRange && matchesQ && matchesStatus;
    });
  }, [expenses, search, resolvedRange.from, resolvedRange.to, expenseStatusFilter]);

  const filteredRequisitions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requisitions.filter((r) => {
      const matchesRange = inRange(r.submitted, resolvedRange.from, resolvedRange.to);
      const matchesQ = !q || String(r.requester || '').toLowerCase().includes(q) || String(r.dept || '').toLowerCase().includes(q) || String(r.id || '').toLowerCase().includes(q);
      const st = String(r.status || '').toLowerCase();
      const matchesStatus =
        requisitionStatusFilter === 'all'
          ? true
          : requisitionStatusFilter === 'pending'
            ? st === 'pending' || st === 'pending_approval'
            : st === requisitionStatusFilter;
      return matchesRange && matchesQ && matchesStatus;
    });
  }, [requisitions, search, resolvedRange.from, resolvedRange.to, requisitionStatusFilter]);

  const filteredPayroll = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payroll.filter((r) => {
      const matchesRange = inRange(r.paymentDate, resolvedRange.from, resolvedRange.to);
      const matchesQ = !q || String(r.staffName || '').toLowerCase().includes(q) || String(r.payrollId || '').toLowerCase().includes(q);
      return matchesRange && matchesQ;
    });
  }, [payroll, search, resolvedRange.from, resolvedRange.to]);

  const filteredStaffAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffAttendance.filter((r) => !q || String(r.name || '').toLowerCase().includes(q) || String(r.department || '').toLowerCase().includes(q));
  }, [staffAttendance, search]);

  const filteredStudentAttendance = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentAttendance.filter((r) => !q || String(r.class || '').toLowerCase().includes(q) || String(r.headTeacher || '').toLowerCase().includes(q));
  }, [studentAttendance, search]);

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
        // Backward compatibility: older backend builds only expose accountant status endpoint.
        await api.patch(`/accountant/expenses/${dbId}/status`, { status: decision, note });
      }
      setToast({ type: 'success', message: `Expense ${row.id} ${decision}.` });
      await loadData();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Expense decision failed.' });
    } finally {
      setBusyKey('');
    }
  };

  const openExpenseDecisionModal = (row, decision) => {
    setDecisionModal({
      open: true,
      kind: 'expense',
      row,
      decision,
      note: '',
    });
  };

  const openRequisitionDecisionModal = (row, decision) => {
    setDecisionModal({
      open: true,
      kind: 'requisition',
      row,
      decision,
      note: '',
    });
  };

  const submitExpenseDecision = async () => {
    if (!decisionModal.row || !decisionModal.decision) return;
    if (decisionModal.kind === 'expense') {
      await decideExpense(decisionModal.row, decisionModal.decision, decisionModal.note || '');
    } else {
      await decideRequisition(decisionModal.row, decisionModal.decision, decisionModal.note || '');
    }
    setDecisionModal({ open: false, kind: 'expense', row: null, decision: '', note: '' });
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
        // Backward compatibility: older backend builds only expose accountant status endpoint.
        await api.patch(`/accountant/requisitions/${dbId}/status`, { status, note });
      }
      setToast({ type: 'success', message: `Requisition ${row.id} ${status}.` });
      await loadData();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || e.message || 'Requisition decision failed.' });
    } finally {
      setBusyKey('');
    }
  };

  const headerStats = useMemo(() => {
    const pendingExpenses = filteredExpenses.filter((x) => x.status === 'pending_approval').length;
    const pendingReq = filteredRequisitions.filter((x) => x.status === 'pending').length;
    const payrollTotal = filteredPayroll.reduce((s, x) => s + Number(x.netSalaryPaid || 0), 0);
    const staffPresenceAvg = filteredStaffAttendance.length
      ? Math.round(filteredStaffAttendance.reduce((s, x) => s + Number(x.presenceRate || 0), 0) / filteredStaffAttendance.length)
      : 0;
    return { pendingExpenses, pendingReq, payrollTotal, staffPresenceAvg };
  }, [filteredExpenses, filteredPayroll, filteredRequisitions, filteredStaffAttendance]);

  const registryStatItems = useMemo(
    () => {
      const windowHint =
        resolvedRange.from || resolvedRange.to
          ? `${resolvedRange.from || '…'} → ${resolvedRange.to || '…'}`
          : 'All dates in range';
      return [
        {
          label: 'Pending expenses',
          value: String(headerStats.pendingExpenses),
          trend: windowHint,
          icon: Wallet,
          tone: 'navy',
        },
        {
          label: 'Pending requisitions',
          value: String(headerStats.pendingReq),
          trend: 'Awaiting decision',
          icon: ClipboardList,
          tone: 'gold',
        },
        {
          label: 'Payroll total (filtered)',
          value: money(headerStats.payrollTotal),
          trend: `${filteredPayroll.length} rows`,
          icon: Briefcase,
          tone: 'emerald',
        },
        {
          label: 'Staff presence avg',
          value: `${headerStats.staffPresenceAvg}%`,
          trend: filteredStaffAttendance.length ? `${filteredStaffAttendance.length} staff` : 'No attendance rows',
          icon: CheckCircle2,
          tone: 'violet',
        },
      ];
    },
    [headerStats, resolvedRange.from, resolvedRange.to, filteredPayroll.length, filteredStaffAttendance.length]
  );

  const exportConfig = useMemo(() => {
    if (activeTab === 'expenses') {
      const rows = filteredExpenses.map((r) => ({
        expense_id: r.id,
        title: r.title || '',
        vendor: r.vendor || '',
        amount_rwf: Number(r.amount || 0),
        status: r.status || '',
        due_date: dateOnly(r.due_date),
        created_at: dateOnly(r.created_at),
      }));
      return { slug: 'expenses', title: 'Manager Expense Approvals', headers: ['expense_id', 'title', 'vendor', 'amount_rwf', 'status', 'due_date', 'created_at'], rows };
    }
    if (activeTab === 'requisitions') {
      const rows = filteredRequisitions.map((r) => ({
        requisition_id: r.id,
        requester: r.requester || '',
        department: r.dept || '',
        amount_rwf: Number(r.amount || 0),
        status: r.status || '',
        submitted_at: dateOnly(r.submitted),
      }));
      return { slug: 'requisitions', title: 'Manager Requisition Approvals', headers: ['requisition_id', 'requester', 'department', 'amount_rwf', 'status', 'submitted_at'], rows };
    }
    if (activeTab === 'payroll') {
      const rows = filteredPayroll.map((r) => ({
        payroll_id: r.payrollId,
        staff_name: r.staffName || '',
        role: r.role || '',
        month: r.month,
        year: r.year,
        status: r.paymentStatus || '',
        net_salary_rwf: Number(r.netSalaryPaid || 0),
        payment_date: dateOnly(r.paymentDate),
      }));
      return { slug: 'payroll', title: 'Manager Payroll Report', headers: ['payroll_id', 'staff_name', 'role', 'month', 'year', 'status', 'net_salary_rwf', 'payment_date'], rows };
    }
    if (activeTab === 'attendance-staff') {
      const rows = filteredStaffAttendance.map((r) => ({
        staff_id: r.id,
        name: r.name || '',
        department: r.department || '',
        presence_rate_pct: Number(r.presenceRate || 0),
        absences: Number(r.absences || 0),
        status: r.status || '',
      }));
      return { slug: 'attendance-staff', title: 'Teacher & Staff Attendance Report', headers: ['staff_id', 'name', 'department', 'presence_rate_pct', 'absences', 'status'], rows };
    }
    const rows = filteredStudentAttendance.map((r) => ({
      class_id: r.id,
      class_name: r.class || '',
      head_teacher: r.headTeacher || '',
      presence_rate_pct: Number(r.presenceRate || 0),
      absences: Number(r.absences || 0),
      status: r.status || '',
    }));
    return { slug: 'attendance-students', title: 'Student Attendance Report', headers: ['class_id', 'class_name', 'head_teacher', 'presence_rate_pct', 'absences', 'status'], rows };
  }, [activeTab, filteredExpenses, filteredPayroll, filteredRequisitions, filteredStaffAttendance, filteredStudentAttendance]);

  const handleExportCsv = () => {
    if (!exportConfig.rows.length) {
      setToast({ type: 'error', message: 'No rows to export for current filter.' });
      return;
    }
    const filename = `${exportConfig.slug}-${academicYear}-${resolvedRange.from || 'from'}-${resolvedRange.to || 'to'}.csv`;
    downloadCsv(filename, exportConfig.headers, exportConfig.rows);
    setToast({ type: 'success', message: 'CSV export downloaded.' });
  };

  const handleExportPdf = () => {
    if (!exportConfig.rows.length) {
      setToast({ type: 'error', message: 'No rows to export for current filter.' });
      return;
    }
    const subtitle = `Academic year: ${academicYear} | Term: ${term} | Date window: ${resolvedRange.from || '—'} to ${resolvedRange.to || '—'} | Search: ${search || 'none'}`;
    const filename = `${exportConfig.slug}-${academicYear}-${resolvedRange.from || 'from'}-${resolvedRange.to || 'to'}.pdf`;
    downloadPdf({
      filename,
      title: exportConfig.title,
      subtitle,
      headers: exportConfig.headers,
      rows: exportConfig.rows,
    });
    setToast({ type: 'success', message: 'PDF export downloaded.' });
  };

  const handleExportExcel = () => {
    if (!exportConfig.rows.length) {
      setToast({ type: 'error', message: 'No rows to export for current filter.' });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportConfig.rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const filename = `${exportConfig.slug}-${academicYear}-${resolvedRange.from || 'from'}-${resolvedRange.to || 'to'}.xlsx`;
    XLSX.writeFile(wb, filename);
    setToast({ type: 'success', message: 'Excel export downloaded.' });
  };

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-full pb-20 lg:pb-12">
      <Toast toast={toast} />
      <DecisionModal
        open={decisionModal.open}
        title={`${decisionModal.kind === 'requisition' ? 'Requisition' : 'Expense'} ${decisionModal.decision || 'decision'}`}
        actionLabel={decisionModal.decision ? `Confirm ${decisionModal.decision}` : 'Confirm'}
        loading={
          !!busyKey && decisionModal.row
            ? decisionModal.kind === 'requisition'
              ? busyKey === `req:${decisionModal.row.db_id}:${decisionModal.decision}`
              : busyKey === `exp:${decisionModal.row.db_id}:${decisionModal.decision}`
            : false
        }
        note={decisionModal.note}
        onNoteChange={(v) => setDecisionModal((p) => ({ ...p, note: v }))}
        onCancel={() => setDecisionModal({ open: false, kind: 'expense', row: null, decision: '', note: '' })}
        onConfirm={submitExpenseDecision}
      />

      <RegistryPageShell>
        <RegistryPageHeader
          overline="Finance center"
          title="Financial overview"
          subtitle={`Approvals, payroll, and attendance in one workspace — same layout as HR Central. ${manager?.school?.name ? `School: ${manager.school.name}.` : ''}`}
          secondaryAction={(
            <ExportSplitButton
              open={exportOpen}
              onOpen={setExportOpen}
              onClose={() => setExportOpen(false)}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => { handleExportCsv(); setExportOpen(false); }}
              >
                <FileText size={16} className="text-re-gold shrink-0" /> Export CSV
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => { handleExportPdf(); setExportOpen(false); }}
              >
                <FileText size={16} className="text-re-gold shrink-0" /> Export PDF
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => { handleExportExcel(); setExportOpen(false); }}
              >
                <FileSpreadsheet size={16} className="text-re-gold shrink-0" /> Export Excel
              </button>
            </ExportSplitButton>
          )}
          primaryAction={(
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-re-gold px-5 py-2.5 text-[13px] font-bold text-[#0b1530] shadow-[0_4px_14px_rgba(254,191,16,0.35)] hover:bg-re-gold-light transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} strokeWidth={2.5} />
              Refresh data
            </button>
          )}
        />

        <RegistryStatGrid items={registryStatItems} />

        <RegistryCard>
          <div className="space-y-4 border-b border-slate-100 bg-white p-4 sm:p-6">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Report type</p>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                {[
                  ['expenses', 'Expense approvals'],
                  ['requisitions', 'Requisition approvals'],
                  ['payroll', 'Payroll reports'],
                  ['attendance-staff', 'Teacher & staff attendance'],
                  ['attendance-students', 'Student attendance'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-all sm:px-4 ${activeTab === id
                      ? 'border-re-navy bg-re-navy text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {(activeTab === 'expenses' || activeTab === 'requisitions') && (
              <div className="flex flex-wrap gap-2">
                {(activeTab === 'expenses'
                  ? [
                    ['all', 'All'],
                    ['pending', 'Pending only'],
                    ['approved', 'Approved'],
                    ['rejected', 'Rejected'],
                  ]
                  : [
                    ['all', 'All'],
                    ['pending', 'Pending only'],
                    ['approved', 'Approved'],
                    ['rejected', 'Rejected'],
                  ]).map(([value, label]) => {
                    const current = activeTab === 'expenses' ? expenseStatusFilter : requisitionStatusFilter;
                    const onPick = () =>
                      activeTab === 'expenses'
                        ? setExpenseStatusFilter(value)
                        : setRequisitionStatusFilter(value);
                    return (
                      <button
                        key={`${activeTab}-${value}`}
                        type="button"
                        onClick={onPick}
                        className={`rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-all ${current === value
                          ? 'border-re-navy bg-re-navy text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="relative lg:col-span-2">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search records…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition-all focus:border-re-gold/40 focus:bg-white focus:ring-2 focus:ring-re-gold/20"
                />
              </div>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                {getAcademicYears().map((y) => (
                  <option key={y} value={y}>
                    {y === 'ALL' ? 'All years' : y}
                  </option>
                ))}
              </select>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              >
                <option>All terms</option>
                <option>Term 1</option>
                <option>Term 2</option>
                <option>Term 3</option>
                <option>Annual</option>
              </select>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
              />
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-wide text-re-navy hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Sync
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">From</p>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-800"
                />
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">To</p>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-800"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700 tabular-nums">{exportConfig.rows.length}</span>
              {' '}
              rows match current tab and filters (export uses the same set).
            </p>
          </div>

          <div className="p-4 md:p-6">
            {loading ? (
              <div className="py-16 flex items-center justify-center gap-2 text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-widest">Loading manager workspace...</span>
              </div>
            ) : (
              <>
                {activeTab === 'expenses' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-black/10 text-[9px] uppercase tracking-widest text-slate-400">
                          <th className="py-2">Expense</th>
                          <th className="py-2">Vendor</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.map((r) => {
                          const canDecide = r.status === 'pending_approval';
                          const approveBusy = busyKey === `exp:${r.db_id}:approved`;
                          const rejectBusy = busyKey === `exp:${r.db_id}:rejected`;
                          return (
                            <tr key={r.id} className="border-b border-black/5">
                              <td className="py-3 font-black text-[#1E3A5F]">{r.title || r.id}</td>
                              <td className="py-3">{r.vendor || '—'}</td>
                              <td className="py-3 font-bold">{money(r.amount)}</td>
                              <td className="py-3 uppercase font-black text-[10px]">{r.status}</td>
                              <td className="py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button disabled={!canDecide || approveBusy || rejectBusy} onClick={() => openExpenseDecisionModal(r, 'approved')} className="h-8 px-3 rounded-lg text-[10px] font-black uppercase bg-emerald-600 text-white disabled:opacity-40">{approveBusy ? 'Saving…' : 'Approve'}</button>
                                  <button disabled={!canDecide || approveBusy || rejectBusy} onClick={() => openExpenseDecisionModal(r, 'rejected')} className="h-8 px-3 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100 disabled:opacity-40">{rejectBusy ? 'Saving…' : 'Reject'}</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'requisitions' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-black/10 text-[9px] uppercase tracking-widest text-slate-400">
                          <th className="py-2">Requisition</th>
                          <th className="py-2">Dept</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRequisitions.map((r) => {
                          const approveBusy = busyKey === `req:${r.db_id}:approved`;
                          const rejectBusy = busyKey === `req:${r.db_id}:rejected`;
                          return (
                            <tr key={r.id} className="border-b border-black/5">
                              <td className="py-3 font-black text-[#1E3A5F]">{r.requester}</td>
                              <td className="py-3">{r.dept}</td>
                              <td className="py-3 font-bold">{money(r.amount)}</td>
                              <td className="py-3 uppercase font-black text-[10px]">{r.status}</td>
                              <td className="py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button disabled={approveBusy || rejectBusy} onClick={() => openRequisitionDecisionModal(r, 'approved')} className="h-8 px-3 rounded-lg text-[10px] font-black uppercase bg-emerald-600 text-white disabled:opacity-40">{approveBusy ? 'Saving…' : 'Approve'}</button>
                                  <button disabled={approveBusy || rejectBusy} onClick={() => openRequisitionDecisionModal(r, 'rejected')} className="h-8 px-3 rounded-lg text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100 disabled:opacity-40">{rejectBusy ? 'Saving…' : 'Reject'}</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'payroll' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-black/10 text-[9px] uppercase tracking-widest text-slate-400">
                          <th className="py-2">Payroll ID</th>
                          <th className="py-2">Staff</th>
                          <th className="py-2">Month/Year</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Net paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayroll.map((r) => (
                          <tr key={r.payrollId} className="border-b border-black/5">
                            <td className="py-3 font-black text-[#1E3A5F]">{r.payrollId}</td>
                            <td className="py-3">{r.staffName}</td>
                            <td className="py-3">{String(r.month).padStart(2, '0')}/{r.year}</td>
                            <td className="py-3 uppercase font-black text-[10px]">{r.paymentStatus}</td>
                            <td className="py-3 text-right font-bold">{money(r.netSalaryPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'attendance-staff' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredStaffAttendance.map((r) => (
                      <div key={r.id} className="rounded-2xl border border-black/10 p-4 bg-white">
                        <p className="text-sm font-black text-[#1E3A5F]">{r.name}</p>
                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1">{r.department}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-500">Presence</span>
                          <span className="text-lg font-black text-emerald-600">{r.presenceRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'attendance-students' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredStudentAttendance.map((r) => (
                      <div key={r.id} className="rounded-2xl border border-black/10 p-4 bg-white">
                        <p className="text-sm font-black text-[#1E3A5F]">{r.class}</p>
                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-1">{r.headTeacher || '—'}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-slate-500">Presence</span>
                          <span className="text-lg font-black text-emerald-600">{r.presenceRate}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-start gap-2 text-xs font-medium text-slate-600 sm:items-center">
              <Calendar size={16} className="mt-0.5 shrink-0 text-re-gold sm:mt-0" />
              <span>
                Date window:{' '}
                <span className="font-semibold tabular-nums text-slate-800">{resolvedRange.from || '—'}</span>
                {' → '}
                <span className="font-semibold tabular-nums text-slate-800">{resolvedRange.to || '—'}</span>
              </span>
            </div>
            <p className="text-[11px] leading-snug text-slate-400">Filters apply to the active tab and export.</p>
          </div>
        </RegistryCard>
      </RegistryPageShell>
    </div>
  );
}

