import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { AlertTriangle, ClipboardList, Download, Loader2, RefreshCw } from 'lucide-react';
import api from '../services/api';
import DosOchreHero from '../components/DosOchreHero';

const STATUS_OPTIONS = ['All', 'pending', 'approved', 'rejected', 'issued', 'returned', 'cancelled'];
const TERM_OPTIONS = ['All', 'Term 1', 'Term 2', 'Term 3'];

function fmtDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: '2-digit' });
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  const cls = s === 'approved'
    ? 'bg-emerald-100 text-emerald-700'
    : s === 'rejected'
      ? 'bg-red-100 text-red-700'
      : s === 'issued'
        ? 'bg-blue-100 text-blue-700'
        : s === 'returned'
          ? 'bg-purple-100 text-purple-700'
          : s === 'cancelled'
            ? 'bg-slate-200 text-slate-600'
            : 'bg-amber-100 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cls}`}>{s || 'pending'}</span>;
}

export default function TeacherRequisitionReports() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState('All');
  const [term, setTerm] = useState('All');
  const [academicYear, setAcademicYear] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (status !== 'All') params.status = status;
      if (term !== 'All') params.term = term;
      if (academicYear.trim()) params.academic_year = academicYear.trim();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get('/dos/reports/requisitions/teacher', { params });
      if (res.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
        setSummary(res.data.summary || null);
      }
    } catch (e) {
      setToast({
        type: 'error',
        message: e?.response?.data?.message || e?.message || 'Failed to load report.',
        retryAction: 'load',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const derived = useMemo(() => {
    if (summary) return summary;
    return {
      total_requests: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      issued: rows.filter((r) => r.status === 'issued').length,
      returned: rows.filter((r) => r.status === 'returned').length,
    };
  }, [rows, summary]);

  const exportExcel = () => {
    const out = rows.map((r) => ({
      request_id: r.id,
      equipment: r.item_name || r.items || '',
      qty: Number(r.qty || 0),
      requester: r.requester || '',
      department: r.dept || '',
      purpose: r.purpose || '',
      priority: r.priority_level || '',
      status: r.status || '',
      submitted_date: String(r.submitted || '').slice(0, 10),
      approved_at: String(r.approved_at || '').slice(0, 10),
      issued_at: String(r.issued_at || '').slice(0, 10),
      returned_at: String(r.returned_at || '').slice(0, 10),
    }));
    const ws = XLSX.utils.json_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TeacherRequisitions');
    XLSX.writeFile(wb, 'teacher-requisition-report.xlsx');
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Teacher Requisition Report', 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 58);
    let y = 82;
    rows.forEach((r) => {
      if (y > 780) {
        doc.addPage();
        y = 40;
      }
      const line = `${r.id} | ${r.item_name || r.items} | qty ${r.qty || 0} | ${r.status} | ${String(r.submitted || '').slice(0, 10)}`;
      doc.text(line, 40, y);
      y += 14;
    });
    doc.save('teacher-requisition-report.pdf');
  };

  return (
    <div className="min-h-screen bg-re-bg font-sans">
      <DosOchreHero
        eyebrow="DOS reports"
        titleLine="Teacher"
        titleAccent="requisitions"
        subtitle="Filter, review, and export teacher requisition records."
        icon={ClipboardList}
        rightSlot={
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={load}
              className="h-9 px-3 rounded-xl border border-white/20 bg-white/10 text-[10px] font-medium text-white flex items-center gap-1 hover:bg-white/15 transition-all"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="h-9 px-3 rounded-xl border border-[#FEBF10]/40 bg-[#FEBF10]/15 text-[10px] font-medium text-white flex items-center gap-1"
            >
              <Download size={13} />
              Excel
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="h-9 px-3 rounded-xl border border-[#FEBF10]/40 bg-[#FEBF10]/15 text-[10px] font-medium text-white flex items-center gap-1"
            >
              <Download size={13} />
              PDF
            </button>
          </div>
        }
      />

      <div className="animate-in fade-in duration-500 max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-10 space-y-4">

        <div className="bg-white border border-black/5 rounded-2xl p-4 flex flex-wrap gap-2 items-center">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={term} onChange={(e) => setTerm(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
            {TERM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="Academic year e.g. 2025-2026" className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600 min-w-[200px]" />
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600" />
          <button onClick={load} className="h-9 px-3 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-wider">Apply filters</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            ['Total', derived.total_requests || 0],
            ['Pending', derived.pending || 0],
            ['Approved', derived.approved || 0],
            ['Rejected', derived.rejected || 0],
            ['Issued', derived.issued || 0],
            ['Returned', derived.returned || 0],
          ].map(([k, v]) => (
            <div key={k} className="bg-white border border-black/5 rounded-xl p-3 text-center">
              <p className="text-[11px] font-black text-[#1E3A5F]">{v}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{k}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 flex items-center gap-2 text-slate-400 text-[11px] font-black uppercase"><Loader2 size={16} className="animate-spin" />Loading report...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-black/5">
                    {['Request', 'Equipment', 'Qty', 'Requester', 'Dept', 'Status', 'Submitted', 'Approval', 'Issued'].map((h) => (
                      <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-3 text-[10px] font-black text-[#1E3A5F]">{r.id}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-600">{r.item_name || r.items || '—'}</td>
                      <td className="px-4 py-3 text-[11px] font-black text-slate-700">{r.qty || 0}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-600">{r.requester || '—'}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{r.dept || '—'}</td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{fmtDate(r.submitted)}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{fmtDate(r.approved_at)}</td>
                      <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{fmtDate(r.issued_at)}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">
                        No teacher requisition records for selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast ? (
        <div className="fixed right-4 top-4 z-[260]">
          <div className="max-w-[360px] px-3 py-2 rounded-xl border shadow-lg flex items-start gap-2 bg-red-50 border-red-200 text-red-700">
            <AlertTriangle size={14} className="mt-[1px]" />
            <div className="space-y-1">
              <p className="text-[11px] font-black">{toast.message}</p>
              {toast.retryAction === 'load' ? (
                <button
                  type="button"
                  onClick={() => {
                    setToast(null);
                    load();
                  }}
                  className="h-6 px-2 rounded-md border border-current/30 bg-white/70 text-[9px] font-black uppercase tracking-wider"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

