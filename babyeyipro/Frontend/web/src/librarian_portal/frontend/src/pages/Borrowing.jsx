import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, BookMarked, Printer, RefreshCw, Filter,
  User, AlertTriangle, CheckCircle, Activity, X, Save, Calendar,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const MOCK_BOOKS = [
  { id: 'BK001', title: 'Things Fall Apart' }, { id: 'BK002', title: 'A Long Way Gone' },
  { id: 'BK003', title: 'Biology Form 4' }, { id: 'BK004', title: 'Mathematics S5' },
  { id: 'BK005', title: 'History of Rwanda' }, { id: 'BK006', title: 'English Grammar In Use' },
  { id: 'BK007', title: 'Chemistry S4' }, { id: 'BK008', title: 'Physics S6' },
  { id: 'BK010', title: 'Le Petit Prince' },
];

const MOCK_BORROWING = [
  { id: 'LN001', book_id: 'BK003', book_title: 'Biology Form 4', borrower_name: 'Uwimana Jean', borrower_type: 'Student', class_name: 'S4 PCB', borrow_date: '2025-04-01', due_date: '2025-04-15', returned: false, overdue: true },
  { id: 'LN002', book_id: 'BK004', book_title: 'Mathematics S5', borrower_name: 'Niyonkuru Alice', borrower_type: 'Student', class_name: 'S5 MCE', borrow_date: '2025-04-05', due_date: '2025-04-19', returned: false, overdue: false },
  { id: 'LN003', book_id: 'BK001', book_title: 'Things Fall Apart', borrower_name: 'Mr. Habimana Eric', borrower_type: 'Staff', class_name: '—', borrow_date: '2025-03-28', due_date: '2025-04-11', returned: false, overdue: true },
  { id: 'LN004', book_id: 'BK006', book_title: 'English Grammar In Use', borrower_name: 'Ishimwe Grace', borrower_type: 'Student', class_name: 'S3 A', borrow_date: '2025-04-08', due_date: '2025-04-22', returned: false, overdue: false },
  { id: 'LN005', book_id: 'BK007', book_title: 'Chemistry S4', borrower_name: 'Nkurunziza Patrick', borrower_type: 'Student', class_name: 'S4 PCB', borrow_date: '2025-04-02', due_date: '2025-04-16', returned: false, overdue: true },
  { id: 'LN006', book_id: 'BK008', book_title: 'Physics S6', borrower_name: 'Mukamana Diane', borrower_type: 'Student', class_name: 'S6 PCM', borrow_date: '2025-04-10', due_date: '2025-04-24', returned: false, overdue: false },
  { id: 'LN007', book_id: 'BK002', book_title: 'A Long Way Gone', borrower_name: 'Ms. Umubyeyi Claire', borrower_type: 'Staff', class_name: '—', borrow_date: '2025-04-09', due_date: '2025-04-23', returned: false, overdue: false },
  { id: 'LN008', book_id: 'BK003', book_title: 'Biology Form 4', borrower_name: 'Hirwa Emmanuel', borrower_type: 'Student', class_name: 'S4 PCB', borrow_date: '2025-04-03', due_date: '2025-04-17', returned: false, overdue: true },
];

let nextId = MOCK_BORROWING.length + 1;

const IssueModal = ({ onClose, onIssue }) => {
  const today = new Date().toISOString().split('T')[0];
  const defaultDue = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  const [form, setForm] = useState({ book_id: '', borrower_name: '', borrower_type: 'Student', class_name: '', borrow_date: today, due_date: defaultDue });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.book_id && form.borrower_name.trim();

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">New loan</p>
            <h3 className="font-black text-[#1E3A5F] text-base mt-0.5">Issue book</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:rotate-90 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/50 block mb-1">Book *</label>
            <select value={form.book_id} onChange={e => set('book_id', e.target.value)}
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]">
              <option value="">Select book…</option>
              {MOCK_BOOKS.map(b => <option key={b.id} value={b.id}>{b.title} ({b.id})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/50 block mb-1">Borrower name *</label>
            <input value={form.borrower_name} onChange={e => set('borrower_name', e.target.value)} placeholder="Full name"
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]" />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/50 block mb-1">Borrower type</label>
            <select value={form.borrower_type} onChange={e => set('borrower_type', e.target.value)}
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]">
              <option>Student</option><option>Staff</option><option>Other</option>
            </select>
          </div>
          {form.borrower_type === 'Student' && (
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/50 block mb-1">Class</label>
              <input value={form.class_name} onChange={e => set('class_name', e.target.value)} placeholder="e.g. S4 PCB"
                className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]" />
            </div>
          )}
          {[
            { label: 'Borrow date', key: 'borrow_date', type: 'date' },
            { label: 'Due date', key: 'due_date', type: 'date' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/50 block mb-1">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]" />
            </div>
          ))}
        </div>
        <div className="bg-white border-t border-black/5 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-30 italic hidden sm:block">Ready to issue</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-black/5 text-[#1E3A5F] font-black text-[9px] uppercase tracking-widest hover:bg-re-bg">Cancel</button>
            <button disabled={!valid} onClick={() => { if (valid) { onIssue({ ...form, book_title: MOCK_BOOKS.find(b => b.id === form.book_id)?.title || form.book_id, returned: false, overdue: new Date(form.due_date) < new Date() }); onClose(); }}}
              className="h-9 px-6 rounded-lg text-white font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
              <Save size={12} className="inline mr-1" />Issue book
            </button>
          </div>
        </div>
      </div>
    </div>, document.body
  );
};

const Borrowing = () => {
  const [loans, setLoans] = useState(MOCK_BORROWING);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState({ key: 'due_date', dir: 'asc' });

  const stats = useMemo(() => ({
    active: loans.filter(l => !l.returned).length,
    overdue: loans.filter(l => !l.returned && l.overdue).length,
    students: loans.filter(l => !l.returned && l.borrower_type === 'Student').length,
    staff: loans.filter(l => !l.returned && l.borrower_type === 'Staff').length,
  }), [loans]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter(l => {
      const tOk = typeFilter === 'All' || l.borrower_type === typeFilter;
      const oOk = !overdueOnly || l.overdue;
      const qOk = !q || l.borrower_name.toLowerCase().includes(q) || l.book_title.toLowerCase().includes(q) || l.id.toLowerCase().includes(q);
      return !l.returned && tOk && oOk && qOk;
    }).sort((a, b) => {
      const dir = sortBy.dir === 'asc' ? 1 : -1;
      if (sortBy.key === 'due_date') return (new Date(a.due_date) - new Date(b.due_date)) * dir;
      return a.borrower_name.localeCompare(b.borrower_name) * dir;
    });
  }, [loans, search, typeFilter, overdueOnly, sortBy]);

  const toggleSort = k => setSortBy(p => ({ key: k, dir: p.key === k ? (p.dir === 'asc' ? 'desc' : 'asc') : 'asc' }));
  const sortBadge = k => sortBy.key === k ? <span className="ml-1 text-[9px] font-black">{sortBy.dir === 'asc' ? '↑' : '↓'}</span> : null;

  const handleIssue = (loan) => setLoans(p => [...p, { ...loan, id: `LN${String(nextId++).padStart(3, '0')}` }]);
  const handleReturn = (id) => setLoans(p => p.map(l => l.id === id ? { ...l, returned: true, return_date: new Date().toISOString().split('T')[0] } : l));

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95); doc.rect(0, 0, W, 56, 'F');
    doc.setFillColor(254, 191, 16); doc.rect(0, 53, W, 3, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
    doc.text('Active Loans — Babyeyi School Library', 40, 36);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} · ${filtered.length} active loans`, 40, 72);
    const cols = [
      { k: 'id', label: 'Loan ID', w: 65 }, { k: 'book_title', label: 'Book', w: 160 },
      { k: 'borrower_name', label: 'Borrower', w: 150 }, { k: 'class_name', label: 'Class', w: 70 },
      { k: 'borrow_date', label: 'Issued', w: 80 }, { k: 'due_date', label: 'Due', w: 80 },
    ];
    let y = 96, x = 40;
    doc.setFillColor(241, 245, 249); doc.rect(40, y - 12, W - 80, 20, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    cols.forEach(c => { doc.text(c.label, x, y); x += c.w; }); y += 18;
    doc.setFont('helvetica', 'normal');
    filtered.forEach(r => {
      if (y > 520) { doc.addPage(); y = 40; }
      x = 40; cols.forEach(c => { doc.text(String(r[c.k] ?? '').substring(0, 24), x, y); x += c.w; }); y += 15;
    });
    doc.save('active-loans.pdf');
  };

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Hero */}
      <div className="relative w-full min-h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]" />
        <img src={import.meta.env.BASE_URL + "teacher.jpg"} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
          <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl group">
            <BookMarked size={40} style={{ color: '#FEBF10' }} className="group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>Circulation</p>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">
              Active <span style={{ color: '#FEBF10' }}>Loans</span>
            </h1>
            <p className="text-[10px] font-bold text-white/40 max-w-lg uppercase tracking-widest italic opacity-60">Books currently borrowed · Due dates · Overdue alerts</p>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[500px]">
          {/* Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Active Loans',  value: stats.active,   icon: <BookMarked size={14} className="text-blue-500" /> },
                { label: 'Overdue',       value: stats.overdue,  icon: <AlertTriangle size={14} className="text-red-500" /> },
                { label: 'Students',      value: stats.students, icon: <User size={14} className="text-[#1E3A5F]" /> },
                { label: 'Staff Loans',   value: stats.staff,    icon: <Activity size={14} className="text-amber-500" /> },
              ].map((s, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                  <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{s.icon}</div>
                  <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{s.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
              <button onClick={exportPDF} className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
                <Printer size={14} /><span>Print loans</span>
              </button>
              <button onClick={() => setModalOpen(true)} className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 transition-all group">
                <Plus size={14} className="text-amber-500 group-hover:rotate-90 transition-transform duration-300" />
                <span className="group-hover:text-[#1E3A5F] transition-colors">Issue book</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="hidden lg:flex px-3 py-2 border-b border-black/5 flex-nowrap items-center gap-2 bg-re-bg/20">
            <div className="relative w-[8rem] shrink-0">
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] cursor-pointer appearance-none pl-3 pr-6">
                {['All','Student','Staff','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={() => setOverdueOnly(p => !p)}
              className={`h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${overdueOnly ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white border-black/5 text-re-text-muted hover:border-red-200'}`}>
              Overdue only
            </button>
            <div className="relative w-[16rem] group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors pointer-events-none" />
              <input type="text" placeholder="Search borrower or book…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 pl-8" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white flex-1 min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th onClick={() => toggleSort('borrower_name')} className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer hover:opacity-70">Borrower {sortBadge('borrower_name')}</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Book</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 text-right">Issued</th>
                  <th onClick={() => toggleSort('due_date')} className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer text-right hover:opacity-70">Due {sortBadge('due_date')}</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map(l => (
                  <tr key={l.id} className={`hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group ${l.overdue ? 'border-l-4 border-red-400' : ''}`}>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-black/5 bg-slate-100 flex items-center justify-center shadow-inner shrink-0 text-[#1E3A5F]">
                          <User size={16} className="opacity-75" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-[#1E3A5F] tracking-tight">{l.borrower_name}</p>
                          <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest opacity-50 mt-0.5">{l.borrower_type}{l.class_name && l.class_name !== '—' ? ` · ${l.class_name}` : ''} · {l.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5">
                      <span className="text-[11px] font-black text-[#1E3A5F]">{l.book_title}</span>
                      <p className="text-[8px] font-bold text-re-text-muted opacity-40 mt-0.5">{l.book_id}</p>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right font-black text-[#1E3A5F] text-[11px]">{l.borrow_date}</td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right">
                      <p className={`text-[13px] font-black ${l.overdue ? 'text-red-500' : 'text-slate-600'}`}>{l.due_date}</p>
                      {l.overdue && <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Overdue</p>}
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                      <button onClick={() => handleReturn(l.id)}
                        className="h-7 px-3 rounded-xl flex items-center justify-center gap-1.5 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg hover:text-[#1E3A5F] transition-all ml-auto">
                        <CheckCircle size={12} className="text-amber-500" /><span>Return</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-[10px] font-black text-re-text-muted uppercase tracking-widest opacity-50">No active loans</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex px-8 py-4 bg-slate-50/50 border-t border-black/5 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">Live circulation</p></div>
              <div className="w-px h-3 bg-black/10" />
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-40 italic">{filtered.length} active · {stats.overdue} overdue</p>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && <IssueModal onClose={() => setModalOpen(false)} onIssue={handleIssue} />}
    </div>
  );
};

export default Borrowing;
