import { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search, Mail, UserRound, Calendar, FileSpreadsheet, FileText, Eye, X, BellRing, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SERVER = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const API = `${SERVER}/api`;

export default function InvoicesListPage() {
  const auth = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    invoice_status: '',
    date_from: '',
    date_to: '',
    student: '',
    email: '',
    search: '',
    class_name: '',
    term: '',
    academic_year: '',
  });
  const [exporting, setExporting] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailPdfLoading, setDetailPdfLoading] = useState(false);
  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');

  const queryString = useMemo(() => {
    const q = new URLSearchParams({ page: String(page), limit: '20' });
    Object.entries(filters).forEach(([k, v]) => {
      if (String(v || '').trim()) q.set(k, String(v).trim());
    });
    return q.toString();
  }, [filters, page]);

  const pageSummary = useMemo(() => {
    const paidRows = rows.filter((r) => String(r.invoice_status || '').toUpperCase() === 'PAID');
    const unpaidRows = rows.filter((r) => String(r.invoice_status || '').toUpperCase() !== 'PAID');
    const paidAmount = paidRows.reduce((s, r) => s + Number(r.total_rwf || 0), 0);
    const unpaidAmount = unpaidRows.reduce((s, r) => s + Number(r.total_rwf || 0), 0);
    return { paidRows, unpaidRows, paidAmount, unpaidAmount };
  }, [rows]);

  const roleCode = String(auth?.user?.role?.code || auth?.user?.role_code || '').toUpperCase();
  const backPath = useMemo(() => {
    if (roleCode === 'ACCOUNTANT') return '/accountant/dashboard';
    if (roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER') return '/school-babyeyi-dashboard';
    if (roleCode === 'SUPER_ADMIN') return '/superadmin/dashboard';
    if (roleCode === 'FULL_SYSTEM_CONTROLLER') return '/superadmin/control';
    return '';
  }, [roleCode]);

  const backLabel = roleCode === 'ACCOUNTANT'
    ? 'Back to Accountant Dashboard'
    : (roleCode === 'SCHOOL_ADMIN' || roleCode === 'SCHOOL_MANAGER')
      ? 'Back to School Manager Dashboard'
      : roleCode === 'SUPER_ADMIN'
        ? 'Back to Super Admin Dashboard'
        : roleCode === 'FULL_SYSTEM_CONTROLLER'
          ? 'Back to System Control'
          : '';

  const canRunReminders = ['ACCOUNTANT', 'SCHOOL_MANAGER', 'SCHOOL_ADMIN'].includes(roleCode);

  const loadInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/public/babyeyi-pay/invoices?${queryString}`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load invoices');
      setRows(json.data || []);
      setTotalPages(Number(json.totalPages || 1));
      setTotal(Number(json.total || 0));
    } catch (e) {
      setError(e.message || 'Failed to load invoices');
      setRows([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const downloadExport = async (kind) => {
    try {
      setExporting(kind);
      const slug = kind === 'xlsx' ? 'export.xlsx' : 'export.pdf';
      const res = await fetch(`${API}/public/babyeyi-pay/invoices/${slug}?${queryString}`, { credentials: 'include' });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        if (ct.includes('application/json')) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.message || 'Export failed');
        }
        throw new Error('Export failed');
      }
      const blob = await res.blob();
      const dispo = res.headers.get('Content-Disposition') || '';
      let filename = kind === 'xlsx' ? 'invoices.xlsx' : 'invoices.pdf';
      const m = /filename\*=UTF-8''([^;\n]+)|filename="([^"]+)"/i.exec(dispo);
      const raw = m ? decodeURIComponent((m[1] || m[2] || '').trim()) : '';
      if (raw) filename = raw.replace(/^["']|["']$/g, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || 'Export failed');
    } finally {
      setExporting('');
    }
  };

  const runReminders = async () => {
    const ok = window.confirm('Are you sure you want to run reminders now?');
    if (!ok) return;
    try {
      setRunningReminders(true);
      setReminderMsg('');
      setError('');
      const res = await fetch(`${API}/public/babyeyi-pay/admin-invoices/reminders/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to run reminders');
      const sent = Number(json.sent || 0);
      const scanned = Number(json.scanned || 0);
      setReminderMsg(`Reminders sent: ${sent} (scanned ${scanned} unpaid invoices).`);
    } catch (e) {
      setError(e.message || 'Failed to run reminders');
    } finally {
      setRunningReminders(false);
    }
  };

  useEffect(() => {
    loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  const onFilter = (k, v) => {
    setPage(1);
    setFilters((p) => ({ ...p, [k]: v }));
  };

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setDetail(null);
    try {
      const res = await fetch(`${API}/public/babyeyi-pay/invoices/${id}/detail`, { credentials: 'include' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load invoice detail');
      setDetail(json.data || null);
    } catch (e) {
      setDetailError(e.message || 'Failed to load invoice detail');
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadInvoicePdf = async () => {
    if (!detail?.invoice?.id) return;
    try {
      setDetailPdfLoading(true);
      const res = await fetch(`${API}/public/babyeyi-pay/invoices/${detail.invoice.id}/print.pdf`, { credentials: 'include' });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok) {
        if (ct.includes('application/json')) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.message || 'Failed to download PDF');
        }
        throw new Error('Failed to download PDF');
      }
      const blob = await res.blob();
      const dispo = res.headers.get('Content-Disposition') || '';
      let filename = `${detail.invoice.invoice_no || `invoice-${detail.invoice.id}`}.pdf`;
      const m = /filename\*=UTF-8''([^;\n]+)|filename="([^"]+)"/i.exec(dispo);
      const raw = m ? decodeURIComponent((m[1] || m[2] || '').trim()) : '';
      if (raw) filename = raw.replace(/^["']|["']$/g, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setDetailError(e.message || 'Failed to download PDF');
    } finally {
      setDetailPdfLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFBE8] to-[#EEF5FF] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-black text-[#1A1200]">Invoices</h1>
            <p className="text-sm text-[#7A5C00]">Filter by status, date, student, and payer email.</p>
          </div>
          <div className="flex items-center gap-2">
            {backPath && (
              <Link
                to={backPath}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#FDEAA0] bg-[#FFF3CC] px-3 py-2.5 text-sm font-black text-[#1A1200] hover:bg-[#FDEAA0] min-h-[44px]"
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                {backLabel}
              </Link>
            )}
            <button
              type="button"
              onClick={() => downloadExport('xlsx')}
              disabled={!!exporting || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#FDEAA0] bg-white px-3 py-2 text-sm font-bold text-[#1A1200] hover:bg-[#FFF3CC] disabled:opacity-50"
            >
              {exporting === 'xlsx' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              Excel
            </button>
            <button
              type="button"
              onClick={() => downloadExport('pdf')}
              disabled={!!exporting || loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#CFE2FF] bg-white px-3 py-2 text-sm font-bold text-[#1A1200] hover:bg-[#EAF2FF] disabled:opacity-50"
            >
              {exporting === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              PDF
            </button>
            <button
              type="button"
              onClick={loadInvoices}
              className="inline-flex items-center gap-2 rounded-xl border border-[#FDEAA0] bg-white px-3 py-2 text-sm font-bold text-[#1A1200] hover:bg-[#FFF3CC]"
            >
            <RefreshCw size={16} /> Refresh
            </button>
            {canRunReminders && (
              <button
                type="button"
                onClick={runReminders}
                disabled={runningReminders}
                className="inline-flex items-center gap-2 rounded-xl border border-[#CFE2FF] bg-[#EAF2FF] px-3 py-2 text-sm font-bold text-[#123A86] hover:bg-[#DCEBFF] disabled:opacity-50"
                title="Run unpaid reminder schedules (7 days, 3 days, due day)"
              >
                {runningReminders ? <Loader2 size={16} className="animate-spin" /> : <BellRing size={16} />}
                Run reminders
              </button>
            )}
          </div>
        </div>
        {reminderMsg ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {reminderMsg}
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#FDEAA0] bg-white p-4 mb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-9 gap-3 shadow-sm">
          <label className="text-xs font-bold text-slate-500">
            Status
            <select
              value={filters.invoice_status}
              onChange={(e) => onFilter('invoice_status', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#FDEAA0] px-2.5 py-2 text-sm text-[#1A1200]"
            >
              <option value="">All</option>
              <option value="NOT_PAID">NOT_PAID</option>
              <option value="PAID">PAID</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><Calendar size={12} /> Date from</span>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => onFilter('date_from', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#FDEAA0] px-2.5 py-2 text-sm text-[#1A1200]"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><Calendar size={12} /> Date to</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => onFilter('date_to', e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#FDEAA0] px-2.5 py-2 text-sm text-[#1A1200]"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><UserRound size={12} /> Student</span>
            <input
              value={filters.student}
              onChange={(e) => onFilter('student', e.target.value)}
              placeholder="Name/code/UID"
              className="mt-1 w-full rounded-xl border border-[#CFE2FF] px-2.5 py-2 text-sm text-[#1A1200]"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><Mail size={12} /> Email</span>
            <input
              value={filters.email}
              onChange={(e) => onFilter('email', e.target.value)}
              placeholder="payer@email.com"
              className="mt-1 w-full rounded-xl border border-[#CFE2FF] px-2.5 py-2 text-sm text-[#1A1200]"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Class
            <input
              value={filters.class_name}
              onChange={(e) => onFilter('class_name', e.target.value)}
              placeholder="e.g. P4, S2"
              className="mt-1 w-full rounded-xl border border-[#CFE2FF] px-2.5 py-2 text-sm text-[#1A1200]"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Term
            <input
              value={filters.term}
              onChange={(e) => onFilter('term', e.target.value)}
              placeholder="Term 1"
              className="mt-1 w-full rounded-xl border border-[#CFE2FF] px-2.5 py-2 text-sm text-[#1A1200]"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Academic year
            <input
              value={filters.academic_year}
              onChange={(e) => onFilter('academic_year', e.target.value)}
              placeholder="2025-2026"
              className="mt-1 w-full rounded-xl border border-[#CFE2FF] px-2.5 py-2 text-sm text-[#1A1200]"
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><Search size={12} /> Quick search</span>
            <input
              value={filters.search}
              onChange={(e) => onFilter('search', e.target.value)}
              placeholder="school/payer/student"
              className="mt-1 w-full rounded-xl border border-[#CFE2FF] px-2.5 py-2 text-sm text-[#1A1200]"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-[#FDEAA0] bg-white p-3">
            <p className="text-[11px] text-slate-500 font-bold uppercase">Rows (page)</p>
            <p className="text-2xl font-black text-slate-900">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-[#CFE2FF] bg-[#EAF2FF] p-3">
            <p className="text-[11px] text-[#1F4B99] font-bold uppercase">Paid</p>
            <p className="text-2xl font-black text-[#123A86]">{pageSummary.paidRows.length}</p>
            <p className="text-xs text-[#1F4B99]">{pageSummary.paidAmount.toLocaleString()} RWF</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-[11px] text-amber-700 font-bold uppercase">Not Paid</p>
            <p className="text-2xl font-black text-amber-800">{pageSummary.unpaidRows.length}</p>
            <p className="text-xs text-amber-700">{pageSummary.unpaidAmount.toLocaleString()} RWF</p>
          </div>
          <div className="rounded-xl border border-[#CFE2FF] bg-white p-3">
            <p className="text-[11px] text-slate-500 font-bold uppercase">Total (all pages)</p>
            <p className="text-2xl font-black text-slate-900">{total}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#FDEAA0] bg-white overflow-hidden">
          {loading ? (
            <div className="py-14 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>
          ) : error ? (
            <div className="py-8 px-4 text-sm text-red-600 font-semibold">{error}</div>
          ) : (
            <>
              <div className="px-4 py-3 text-xs font-bold text-slate-500 border-b border-slate-200">
                Total invoices: <span className="text-slate-900">{total}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead className="bg-[#FFFBE8] text-[11px] uppercase text-[#7A5C00]">
                    <tr>
                      <th className="p-3 text-left">Invoice</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Student</th>
                      <th className="p-3 text-left">Payer Email</th>
                      <th className="p-3 text-left">School</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3 text-left">Created</th>
                      <th className="p-3 text-left">Paid At</th>
                      <th className="p-3 text-left">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-mono text-xs">{r.invoice_no || `INV-${r.id}`}</td>
                        <td className="p-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-black ${
                            String(r.invoice_status).toUpperCase() === 'PAID'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {String(r.invoice_status || 'NOT_PAID').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3">{r.student_name || r.student_code || r.student_uid || r.sdm_code || '—'}</td>
                        <td className="p-3">{r.payer_email || '—'}</td>
                        <td className="p-3">{r.school_name || '—'}</td>
                        <td className="p-3 text-right font-black">{Number(r.total_rwf || 0).toLocaleString()} RWF</td>
                        <td className="p-3">{r.created_at ? new Date(r.created_at).toLocaleString() : '—'}</td>
                        <td className="p-3">{r.invoice_paid_at ? new Date(r.invoice_paid_at).toLocaleString() : '—'}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => openDetail(r.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#CFE2FF] bg-[#EAF2FF] px-2.5 py-1.5 text-xs font-black text-[#123A86] hover:bg-[#DCEBFF]"
                          >
                            <Eye size={14} /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">No invoices found for current filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl border border-[#FDEAA0] bg-white shadow-2xl">
            <div className="px-4 sm:px-6 py-4 border-b border-[#FDEAA0] bg-gradient-to-r from-[#FFFBE8] to-[#EAF2FF] flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-[#1A1200]">Invoice Detail</h3>
                <p className="text-xs text-[#7A5C00]">Selected items (fees + requirements) and status</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadInvoicePdf}
                  disabled={!detail || detailLoading || detailPdfLoading}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#CFE2FF] bg-[#EAF2FF] px-3 py-2 text-xs font-black text-[#123A86] hover:bg-[#DCEBFF] disabled:opacity-50"
                >
                  {detailPdfLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="rounded-xl border border-[#FDEAA0] p-2 text-[#7A5C00] hover:bg-[#FFF3CC]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[78vh]">
              {detailLoading ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-[#B88A00]" /></div>
              ) : detailError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{detailError}</div>
              ) : detail ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-[#FDEAA0] bg-[#FFFBE8] p-3">
                      <p className="text-[11px] text-[#7A5C00] font-bold uppercase">Invoice</p>
                      <p className="font-mono text-sm text-[#1A1200] font-black">{detail.invoice?.invoice_no}</p>
                    </div>
                    <div className="rounded-xl border border-[#FDEAA0] bg-[#FFFBE8] p-3">
                      <p className="text-[11px] text-[#7A5C00] font-bold uppercase">Status</p>
                      <p className="text-sm font-black text-[#1A1200]">{String(detail.invoice?.invoice_status || 'NOT_PAID').toUpperCase()}</p>
                    </div>
                    <div className="rounded-xl border border-[#CFE2FF] bg-[#EAF2FF] p-3">
                      <p className="text-[11px] text-[#1F4B99] font-bold uppercase">Student</p>
                      <p className="text-sm font-black text-[#123A86]">{detail.student?.student_name || '—'}</p>
                      {!!(detail?.students || []).length && (
                        <p className="text-[11px] text-[#1F4B99] mt-1">
                          {(detail.students || []).length} student(s) on this invoice
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border border-[#CFE2FF] bg-[#EAF2FF] p-3">
                      <p className="text-[11px] text-[#1F4B99] font-bold uppercase">Total</p>
                      <p className="text-sm font-black text-[#123A86]">{Number(detail.invoice?.amount_rwf || 0).toLocaleString()} RWF</p>
                    </div>
                  </div>

                  {!!(detail?.students || []).length && (
                    <div className="rounded-2xl border border-[#CFE2FF] overflow-hidden">
                      <div className="px-4 py-2.5 bg-[#EAF2FF] border-b border-[#CFE2FF] text-xs font-black uppercase text-[#1F4B99]">Students Included On Invoice</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[520px]">
                          <thead className="bg-white text-[11px] uppercase text-slate-500">
                            <tr>
                              <th className="p-3 text-left">Student Name</th>
                              <th className="p-3 text-left">Class</th>
                              <th className="p-3 text-left">Code</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(detail.students || []).map((s, idx) => (
                              <tr key={`${s.student_uid || s.student_code || s.sdm_code || idx}`}>
                                <td className="p-3 font-semibold">{s.student_name || 'Student'}</td>
                                <td className="p-3">{s.class_name || '—'}</td>
                                <td className="p-3">{s.student_code || s.sdm_code || s.student_uid || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-[#FDEAA0] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#FFFBE8] border-b border-[#FDEAA0] text-xs font-black uppercase text-[#7A5C00]">Selected Fee Items</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[540px]">
                        <thead className="bg-white text-[11px] uppercase text-slate-500">
                          <tr>
                            <th className="p-3 text-left">Name</th>
                            <th className="p-3 text-right">Amount (RWF)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(detail.selected_fees || []).map((f) => (
                            <tr key={f.id}>
                              <td className="p-3">{f.name || 'Fee'}</td>
                              <td className="p-3 text-right font-black">{Number(f.amount || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                          {(detail.selected_fees || []).length === 0 && (
                            <tr><td colSpan={2} className="p-4 text-center text-slate-500">No fee items selected.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#CFE2FF] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#EAF2FF] border-b border-[#CFE2FF] text-xs font-black uppercase text-[#1F4B99]">Selected Requirement Items</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[700px]">
                        <thead className="bg-white text-[11px] uppercase text-slate-500">
                          <tr>
                            <th className="p-3 text-left">Item</th>
                            <th className="p-3 text-left">Description</th>
                            <th className="p-3 text-right">Qty</th>
                            <th className="p-3 text-right">Unit (RWF)</th>
                            <th className="p-3 text-right">Line (RWF)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(detail.selected_requirements || []).map((r) => (
                            <tr key={r.babyeyi_requirement_id}>
                              <td className="p-3 font-semibold">{r.requirement_name}</td>
                              <td className="p-3 text-slate-600">{r.description || '—'}</td>
                              <td className="p-3 text-right">{Number(r.quantity_value || 1).toLocaleString()}</td>
                              <td className="p-3 text-right">{Number(r.unit_price_rwf || 0).toLocaleString()}</td>
                              <td className="p-3 text-right font-black">{Number(r.line_total_rwf || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                          {(detail.selected_requirements || []).length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-slate-500">No requirement items selected.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No detail loaded.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
