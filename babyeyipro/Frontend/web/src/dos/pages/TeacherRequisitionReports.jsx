import { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { AlertTriangle, ArrowRightCircle, Banknote, Building2, Calendar, CheckCircle, ChevronRight, ClipboardList, Download, Eye, FileText, Loader2, Plus, RefreshCw, Send, ThumbsDown, ThumbsUp, Upload, User, Users, X } from 'lucide-react';
import api from '../services/api';
import DosOrangePageHero, { DosPageBody } from '../components/DosOrangePageHero';

const STATUS_OPTIONS = ['All', 'pending', 'approved', 'rejected', 'forwarded', 'issued', 'returned', 'cancelled'];
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
          : s === 'forwarded'
            ? 'bg-indigo-100 text-indigo-700'
            : s === 'cancelled'
              ? 'bg-slate-200 text-slate-600'
              : 'bg-amber-100 text-amber-700';
  return <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cls}`}>{s || 'pending'}</span>;
}

function destinationBadge(dest) {
  const d = String(dest || '').toLowerCase();
  const cfg = d === 'dos' ? ['bg-violet-50 text-violet-700 border-violet-200', 'DOS']
    : d === 'store' ? ['bg-cyan-50 text-cyan-700 border-cyan-200', 'Store']
    : d === 'all' ? ['bg-indigo-50 text-indigo-700 border-indigo-200', 'All']
    : ['bg-amber-50 text-amber-700 border-amber-200', 'Accountant'];
  return <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border ${cfg[0]}`}>{cfg[1]}</span>;
}

export default function TeacherRequisitionReports() {
  const [activeTab, setActiveTab] = useState('teacher');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [dosRows, setDosRows] = useState([]);
  const [dosLoading, setDosLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [dosSummary, setDosSummary] = useState(null);
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState('All');
  const [term, setTerm] = useState('All');
  const [academicYear, setAcademicYear] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [addForm, setAddForm] = useState({ dept: '', requester: '', items: '', amount: '', submitted: new Date().toISOString().slice(0, 10), description: '', attachmentName: '' });
  const [actionModal, setActionModal] = useState(null);
  const [actionNote, setActionNote] = useState('');
  const [actionSaving, setActionSaving] = useState(false);
  const [viewReq, setViewReq] = useState(null);

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
      const res = await api.get('/reports/requisitions/teacher', { params });
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

  const loadDos = async () => {
    setDosLoading(true);
    try {
      const params = { source: 'dos' };
      if (status !== 'All') params.status = status;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get('/reports/requisitions/teacher', { params });
      if (res.data?.success) {
        setDosRows(Array.isArray(res.data.data) ? res.data.data : []);
        setDosSummary(res.data.summary || null);
      }
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Failed to load DOS requests.' });
    } finally {
      setDosLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadDos();
  }, []);

  const openAddModal = () => {
    setAddForm({ dept: '', requester: '', items: '', amount: '', submitted: new Date().toISOString().slice(0, 10), description: '', attachmentName: '' });
    setAddStep(1);
    setShowAddModal(true);
  };

  const submitRequisition = async () => {
    if (!addForm.dept.trim() || !addForm.requester.trim() || !addForm.items.trim() || !addForm.description.trim()) return;
    setAddSaving(true);
    try {
      await api.post('/teacher-portal/requisitions', {
        dept: addForm.dept.trim(),
        requester: addForm.requester.trim(),
        items: addForm.items.trim(),
        amount: Number(addForm.amount) || 0,
        submitted: addForm.submitted,
        attachmentName: addForm.attachmentName || '',
        description: addForm.description.trim(),
        note: addForm.description.trim(),
      });
      setToast({ type: 'success', message: 'Requisition submitted successfully.' });
      setShowAddModal(false);
      load();
      loadDos();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Failed to submit requisition.' });
    } finally {
      setAddSaving(false);
    }
  };

  const performAction = async () => {
    if (!actionModal) return;
    setActionSaving(true);
    try {
      const dbId = actionModal.req.db_id || String(actionModal.req.id).replace('REQ-', '');
      await api.patch(`/reports/requisitions/teacher/${dbId}/action`, {
        action: actionModal.action,
        note: actionNote.trim(),
      });
      const labels = { approve: 'approved', reject: 'rejected', forward_to_accountant: 'forwarded to accountant' };
      setToast({ type: 'success', message: `Requisition ${labels[actionModal.action] || 'updated'} successfully.` });
      setActionModal(null);
      setActionNote('');
      load();
      loadDos();
    } catch (e) {
      setToast({ type: 'error', message: e?.response?.data?.message || 'Failed to perform action.' });
    } finally {
      setActionSaving(false);
    }
  };

  const derived = useMemo(() => {
    if (summary) return summary;
    return {
      total_requests: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      approved: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      forwarded: rows.filter((r) => r.status === 'forwarded').length,
      issued: rows.filter((r) => r.status === 'issued').length,
      returned: rows.filter((r) => r.status === 'returned').length,
    };
  }, [rows, summary]);

  const dosDerived = useMemo(() => {
    if (dosSummary) return dosSummary;
    return {
      total_requests: dosRows.length,
      pending: dosRows.filter((r) => r.status === 'pending').length,
      approved: dosRows.filter((r) => r.status === 'approved').length,
      rejected: dosRows.filter((r) => r.status === 'rejected').length,
      forwarded: dosRows.filter((r) => r.status === 'forwarded').length,
      issued: dosRows.filter((r) => r.status === 'issued').length,
      returned: dosRows.filter((r) => r.status === 'returned').length,
    };
  }, [dosRows, dosSummary]);

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
    <div className="min-h-screen bg-white font-sans">
      <DosOrangePageHero
        title="Teacher requisitions"
        subtitle="Filter, review, and export teacher requisition records."
        onRefresh={load}
        refreshing={loading}
      >
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#000435] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 shadow-lg transition hover:bg-[#0a0a52]"
            >
              <Plus size={14} strokeWidth={3} />
              Add Request
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-1 rounded-xl border border-white/35 bg-white/15 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white transition hover:bg-white/25"
            >
              <Download size={13} />
              Excel
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-1 rounded-xl border border-white/35 bg-white/15 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white transition hover:bg-white/25"
            >
              <Download size={13} />
              PDF
            </button>
      </DosOrangePageHero>

      <DosPageBody className="max-w-[1500px] -mt-4 sm:-mt-5 md:-mt-6 space-y-4">

        {/* Tabs */}
        <div className="bg-white border border-black/5 rounded-2xl p-1.5 flex gap-1">
          {[
            { key: 'teacher', label: 'Teacher Requests', icon: Users, count: rows.length },
            { key: 'dos', label: 'DOS Requests', icon: Send, count: dosRows.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === tab.key
                  ? 'bg-[#1E3A5F] text-white shadow-lg shadow-[#1E3A5F]/20'
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
              }`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white border border-black/5 rounded-2xl p-4 flex flex-wrap gap-2 items-center">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {activeTab === 'teacher' && (
            <>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black uppercase text-slate-600">
                {TERM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="Academic year e.g. 2025-2026" className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600 min-w-[200px]" />
            </>
          )}
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600" />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 rounded-xl border border-black/10 px-3 text-[10px] font-black text-slate-600" />
          <button onClick={() => { load(); loadDos(); }} className="h-9 px-3 rounded-xl bg-[#1E3A5F] text-white text-[10px] font-black uppercase tracking-wider">Apply filters</button>
        </div>

        {/* Summary cards */}
        {(() => {
          const d = activeTab === 'dos' ? dosDerived : derived;
          return (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              {[
                ['Total', d.total_requests || 0],
                ['Pending', d.pending || 0],
                ['Approved', d.approved || 0],
                ['Rejected', d.rejected || 0],
                ['Forwarded', d.forwarded || 0],
                ['Issued', d.issued || 0],
                ['Returned', d.returned || 0],
              ].map(([k, v]) => (
                <div key={k} className="bg-white border border-black/5 rounded-xl p-3 text-center">
                  <p className="text-[11px] font-black text-[#1E3A5F]">{v}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{k}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Teacher Requests Table */}
        {activeTab === 'teacher' && (
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 flex items-center gap-2 text-slate-400 text-[11px] font-black uppercase"><Loader2 size={16} className="animate-spin" />Loading report...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black/5">
                      {['Request', 'Items / Equipment', 'Requester', 'Dept', 'Dest.', 'Status', 'Submitted', 'Actions'].map((h) => (
                        <th key={h} className="px-3 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {rows.map((r) => {
                      const isPending = r.status === 'pending';
                      return (
                        <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-3">
                            <p className="text-[10px] font-black text-[#1E3A5F]">{r.id}</p>
                            <p className="text-[9px] text-slate-400 tabular-nums mt-0.5">{Number(r.amount || 0).toLocaleString()} RWF</p>
                          </td>
                          <td className="px-3 py-3 max-w-[200px]">
                            <p className="text-[10px] font-bold text-slate-700 truncate">{r.item_name || r.items || '—'}</p>
                            {r.note && <p className="text-[9px] text-slate-400 truncate mt-0.5 italic">{r.note}</p>}
                          </td>
                          <td className="px-3 py-3 text-[10px] font-bold text-slate-600">{r.requester || '—'}</td>
                          <td className="px-3 py-3 text-[10px] font-bold text-slate-500">{r.dept || '—'}</td>
                          <td className="px-3 py-3">{destinationBadge(r.destination)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col gap-1">
                              {statusBadge(r.status)}
                              {r.forwarded_to && (
                                <span className="text-[8px] font-bold text-indigo-500">→ {r.forwarded_to}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-[10px] font-bold text-slate-500 whitespace-nowrap">{fmtDate(r.submitted)}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setViewReq(r)}
                                title="View details"
                                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#1E3A5F] hover:border-[#1E3A5F]/30 hover:bg-blue-50/50 transition-all"
                              >
                                <Eye size={12} />
                              </button>
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { setActionModal({ req: r, action: 'approve' }); setActionNote(''); }}
                                    title="Approve"
                                    className="h-7 w-7 rounded-lg border border-emerald-200 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all"
                                  >
                                    <ThumbsUp size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setActionModal({ req: r, action: 'reject' }); setActionNote(''); }}
                                    title="Reject"
                                    className="h-7 w-7 rounded-lg border border-red-200 flex items-center justify-center text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                                  >
                                    <ThumbsDown size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setActionModal({ req: r, action: 'forward_to_accountant' }); setActionNote(''); }}
                                    title="Forward to Accountant"
                                    className="h-7 px-2 rounded-lg border border-indigo-200 flex items-center gap-1 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-all text-[9px] font-bold"
                                  >
                                    <ArrowRightCircle size={12} /> Fwd
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!rows.length && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">
                          No teacher requisition records for selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* DOS Requests Table */}
        {activeTab === 'dos' && (
          <div className="bg-white border border-black/5 rounded-2xl overflow-hidden">
            {dosLoading ? (
              <div className="p-8 flex items-center gap-2 text-slate-400 text-[11px] font-black uppercase"><Loader2 size={16} className="animate-spin" />Loading DOS requests...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black/5">
                      {['Request', 'Items / Description', 'Amount (RWF)', 'Requester', 'Dept', 'Status', 'Submitted', 'Note'].map((h) => (
                        <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {dosRows.map((r) => (
                      <tr key={r.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-[10px] font-black text-[#1E3A5F]">{r.id}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-600 max-w-[220px]">
                          <p className="truncate">{r.item_name || r.items || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-black text-slate-700 tabular-nums">{Number(r.amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-600">{r.requester || '—'}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{r.dept || '—'}</td>
                        <td className="px-4 py-3">{statusBadge(r.status)}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-500">{fmtDate(r.submitted)}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-400 max-w-[160px]">
                          <p className="truncate">{r.note || r.status_note || '—'}</p>
                        </td>
                      </tr>
                    ))}
                    {!dosRows.length && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <Send size={28} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No DOS requisition requests yet</p>
                          <p className="text-[10px] text-slate-400 mt-1">Click "Add Request" to create your first requisition</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </DosPageBody>

      {/* Add Requisition Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="relative p-5 bg-gradient-to-br from-[#1E3A5F] to-[#0d1f3c] overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FEBF10]/10 blur-3xl rounded-full -mr-8 -mt-8" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FEBF10]/15 border border-[#FEBF10]/25 flex items-center justify-center">
                    <ClipboardList size={18} className="text-[#FEBF10]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">New Requisition</h3>
                    <p className="text-[10px] font-bold text-white/40 mt-0.5">DOS · Official Request</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white/70 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2 mt-4 relative z-10">
                {[1, 2].map((s) => (
                  <div key={s} className={`flex-1 h-1 rounded-full transition-all ${addStep >= s ? 'bg-[#FEBF10]' : 'bg-white/15'}`} />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {addStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FEBF10]" />
                      <input value={addForm.dept} onChange={(e) => setAddForm((p) => ({ ...p, dept: e.target.value }))} placeholder="e.g. ICT Department" className="w-full h-11 rounded-xl bg-slate-50 pl-10 pr-3 text-xs font-bold border border-transparent focus:border-[#FEBF10]/30 focus:ring-2 focus:ring-[#FEBF10]/10 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requester <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FEBF10]" />
                      <input value={addForm.requester} onChange={(e) => setAddForm((p) => ({ ...p, requester: e.target.value }))} placeholder="Full name" className="w-full h-11 rounded-xl bg-slate-50 pl-10 pr-3 text-xs font-bold border border-transparent focus:border-[#FEBF10]/30 focus:ring-2 focus:ring-[#FEBF10]/10 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FEBF10]" />
                      <input type="date" value={addForm.submitted} onChange={(e) => setAddForm((p) => ({ ...p, submitted: e.target.value }))} className="w-full h-11 rounded-xl bg-slate-50 pl-10 pr-3 text-xs font-bold border border-transparent focus:border-[#FEBF10]/30 focus:ring-2 focus:ring-[#FEBF10]/10 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount RWF <span className="text-slate-300">(optional)</span></label>
                    <div className="relative">
                      <Banknote size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FEBF10]" />
                      <input value={addForm.amount} onChange={(e) => setAddForm((p) => ({ ...p, amount: e.target.value.replace(/[^\d]/g, '') }))} inputMode="numeric" placeholder="0" className="w-full h-11 rounded-xl bg-slate-50 pl-10 pr-3 text-sm font-bold tabular-nums border border-transparent focus:border-[#FEBF10]/30 focus:ring-2 focus:ring-[#FEBF10]/10 outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description <span className="text-red-400">*</span></label>
                    <textarea value={addForm.description} onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))} placeholder="Write a clear description for review..." rows={2} className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold border border-transparent focus:border-[#FEBF10]/30 focus:ring-2 focus:ring-[#FEBF10]/10 outline-none resize-none" />
                  </div>
                </div>
              )}
              {addStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Items / Services <span className="text-red-400">*</span></label>
                    <textarea value={addForm.items} onChange={(e) => setAddForm((p) => ({ ...p, items: e.target.value }))} placeholder="List the items or services you are requesting with estimated costs..." rows={4} className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold border border-transparent focus:border-[#FEBF10]/30 focus:ring-2 focus:ring-[#FEBF10]/10 outline-none resize-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Attachment name <span className="text-slate-300">(optional)</span></label>
                    <div className="relative">
                      <Upload size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FEBF10]" />
                      <input value={addForm.attachmentName} onChange={(e) => setAddForm((p) => ({ ...p, attachmentName: e.target.value }))} placeholder="e.g. invoice.pdf" className="w-full h-11 rounded-xl bg-slate-50 pl-10 pr-3 text-xs font-bold border border-transparent focus:border-[#FEBF10]/30 focus:ring-2 focus:ring-[#FEBF10]/10 outline-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-black/5 flex items-center justify-between gap-3 shrink-0">
              <button type="button" onClick={() => { if (addStep === 1) setShowAddModal(false); else setAddStep(1); }} className="h-10 px-5 rounded-xl bg-white border border-black/5 text-[#1E3A5F] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
                {addStep === 1 ? 'Cancel' : 'Back'}
              </button>
              {addStep === 1 ? (
                <button type="button" onClick={() => setAddStep(2)} className="h-10 px-6 rounded-xl bg-[#1E3A5F] text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-[#162e4d] transition-all">
                  Continue <ChevronRight size={13} />
                </button>
              ) : (
                <button type="button" disabled={addSaving} onClick={submitRequisition} className="h-10 px-6 rounded-xl bg-[#FEBF10] text-[#1E3A5F] font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 hover:bg-[#ffc933] transition-all disabled:opacity-60 shadow-lg shadow-[#FEBF10]/20">
                  {addSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  Submit Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Requisition Detail Modal */}
      {viewReq && (
        <div className="fixed inset-0 z-[310] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setViewReq(null)}>
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-br from-[#1E3A5F] to-[#0d1f3c]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FEBF10]/15 border border-[#FEBF10]/25 flex items-center justify-center">
                    <FileText size={16} className="text-[#FEBF10]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{viewReq.id}</h3>
                    <p className="text-[10px] font-bold text-white/40 mt-0.5">{viewReq.requester} · {viewReq.dept}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setViewReq(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {[
                ['Items / Equipment', viewReq.item_name || viewReq.items],
                ['Amount', `${Number(viewReq.amount || 0).toLocaleString()} RWF`],
                ['Priority', viewReq.priority_level],
                ['Status', viewReq.status],
                ['Destination', viewReq.destination],
                ['Forwarded To', viewReq.forwarded_to],
                ['Submitted', fmtDate(viewReq.submitted)],
                ['Approved', fmtDate(viewReq.approved_at)],
                ['Issued', fmtDate(viewReq.issued_at)],
                ['Returned', fmtDate(viewReq.returned_at)],
                ['Attachment', viewReq.attachmentName],
                ['Note', viewReq.note || viewReq.status_note],
                ['Purpose', viewReq.purpose],
              ].filter(([, v]) => v && v !== '—' && v !== '0 RWF').map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">{label}</span>
                  <span className="text-[11px] font-bold text-slate-700 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DOS Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setActionModal(null)}>
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className={`p-5 ${
              actionModal.action === 'approve' ? 'bg-gradient-to-br from-emerald-600 to-emerald-800'
              : actionModal.action === 'reject' ? 'bg-gradient-to-br from-red-600 to-red-800'
              : 'bg-gradient-to-br from-indigo-600 to-indigo-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                    {actionModal.action === 'approve' ? <ThumbsUp size={16} className="text-white" />
                      : actionModal.action === 'reject' ? <ThumbsDown size={16} className="text-white" />
                      : <ArrowRightCircle size={16} className="text-white" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white capitalize">
                      {actionModal.action === 'forward_to_accountant' ? 'Forward to Accountant' : actionModal.action} Requisition
                    </h3>
                    <p className="text-[10px] font-bold text-white/50 mt-0.5">{actionModal.req.id} · {actionModal.req.requester}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setActionModal(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/70 hover:text-white transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500"><span className="font-black text-slate-700">Items:</span> {actionModal.req.item_name || actionModal.req.items || '—'}</p>
                <p className="text-[10px] font-bold text-slate-500"><span className="font-black text-slate-700">Amount:</span> {Number(actionModal.req.amount || 0).toLocaleString()} RWF</p>
                <p className="text-[10px] font-bold text-slate-500"><span className="font-black text-slate-700">Dept:</span> {actionModal.req.dept || '—'}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add a note (optional)</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={actionModal.action === 'reject' ? 'Reason for rejection...' : actionModal.action === 'forward_to_accountant' ? 'Message for accountant...' : 'Any remarks...'}
                  rows={3}
                  className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold border border-transparent focus:border-slate-300 focus:ring-2 focus:ring-slate-200 outline-none resize-none"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-black/5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setActionModal(null)} className="h-10 px-5 rounded-xl bg-white border border-black/5 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all">
                Cancel
              </button>
              <button
                type="button"
                disabled={actionSaving}
                onClick={performAction}
                className={`h-10 px-6 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all disabled:opacity-60 shadow-lg ${
                  actionModal.action === 'approve' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                  : actionModal.action === 'reject' ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {actionSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                {actionModal.action === 'approve' ? 'Approve' : actionModal.action === 'reject' ? 'Reject' : 'Forward'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast ? (
        <div className="fixed right-4 top-4 z-[260]">
          <div className={`max-w-[360px] px-3 py-2 rounded-xl border shadow-lg flex items-start gap-2 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {toast.type === 'success' ? <CheckCircle size={14} className="mt-[1px]" /> : <AlertTriangle size={14} className="mt-[1px]" />}
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

