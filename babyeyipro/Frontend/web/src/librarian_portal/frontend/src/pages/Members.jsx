import React, { useState, useMemo } from 'react';
import { Search, Users, User, BookOpen, CheckCircle, Activity, Printer, Plus, X, Save } from 'lucide-react';
import { createPortal } from 'react-dom';
import { jsPDF } from 'jspdf';

const MOCK_MEMBERS = [
  { id: 'M001', name: 'Uwimana Jean', type: 'Student', class_name: 'S4 PCB', books_borrowed: 3, active: true },
  { id: 'M002', name: 'Niyonkuru Alice', type: 'Student', class_name: 'S5 MCE', books_borrowed: 1, active: true },
  { id: 'M003', name: 'Mr. Habimana Eric', type: 'Staff', class_name: '—', books_borrowed: 1, active: true },
  { id: 'M004', name: 'Ishimwe Grace', type: 'Student', class_name: 'S3 A', books_borrowed: 1, active: true },
  { id: 'M005', name: 'Nkurunziza Patrick', type: 'Student', class_name: 'S4 PCB', books_borrowed: 1, active: true },
  { id: 'M006', name: 'Mukamana Diane', type: 'Student', class_name: 'S6 PCM', books_borrowed: 1, active: true },
  { id: 'M007', name: 'Ms. Umubyeyi Claire', type: 'Staff', class_name: '—', books_borrowed: 1, active: true },
  { id: 'M008', name: 'Hirwa Emmanuel', type: 'Student', class_name: 'S4 PCB', books_borrowed: 1, active: true },
  { id: 'M009', name: 'Kamanzi Serge', type: 'Student', class_name: 'S4 PCB', books_borrowed: 0, active: true },
  { id: 'M010', name: 'Mukagasana Solange', type: 'Student', class_name: 'S5 MCE', books_borrowed: 0, active: false },
  { id: 'M011', name: 'Mr. Rugamba Paul', type: 'Staff', class_name: '—', books_borrowed: 0, active: true },
  { id: 'M012', name: 'Ntakirutimana Ida', type: 'Student', class_name: 'S3 A', books_borrowed: 0, active: true },
];

let nextMid = MOCK_MEMBERS.length + 1;

const MemberModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', type: 'Student', class_name: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim();
  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] opacity-40">New member</p>
            <h3 className="font-semibold text-[#1E3A5F] text-base mt-0.5">Register member</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:rotate-90 transition-all"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Full name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Full name"
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]" />
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]">
              <option>Student</option><option>Staff</option><option>Other</option>
            </select>
          </div>
          {form.type === 'Student' && (
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Class</label>
              <input value={form.class_name} onChange={e => set('class_name', e.target.value)} placeholder="e.g. S4 PCB"
                className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]" />
            </div>
          )}
        </div>
        <div className="bg-white border-t border-black/5 px-6 py-4 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="h-9 px-4 rounded-lg border border-black/5 text-[#1E3A5F] font-semibold text-[9px] uppercase tracking-widest hover:bg-re-bg">Cancel</button>
          <button disabled={!valid} onClick={() => { if (valid) { onSave({ ...form, id: `M${String(nextMid++).padStart(3, '0')}`, books_borrowed: 0, active: true }); onClose(); } }}
            className="h-9 px-6 rounded-lg text-white font-semibold text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
            <Save size={12} className="inline mr-1" />Register
          </button>
        </div>
      </div>
    </div>, document.body
  );
};

const Members = () => {
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState({ key: 'name', dir: 'asc' });

  const stats = useMemo(() => ({
    total: members.length,
    students: members.filter(m => m.type === 'Student').length,
    staff: members.filter(m => m.type === 'Staff').length,
    active: members.filter(m => m.books_borrowed > 0).length,
  }), [members]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter(m => {
      const tOk = typeFilter === 'All' || m.type === typeFilter;
      const qOk = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.class_name?.toLowerCase().includes(q);
      return tOk && qOk;
    }).sort((a, b) => {
      const dir = sortBy.dir === 'asc' ? 1 : -1;
      if (sortBy.key === 'books') return (a.books_borrowed - b.books_borrowed) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
  }, [members, search, typeFilter, sortBy]);

  const toggleSort = k => setSortBy(p => ({ key: k, dir: p.key === k ? (p.dir === 'asc' ? 'desc' : 'asc') : 'asc' }));
  const sortBadge = k => sortBy.key === k ? <span className="ml-1 text-[9px] font-semibold">{sortBy.dir === 'asc' ? '↑' : '↓'}</span> : null;

  const exportPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95); doc.rect(0, 0, W, 56, 'F');
    doc.setFillColor(254, 191, 16); doc.rect(0, 53, W, 3, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
    doc.text('Library Members — Babyeyi School', 40, 36);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} · ${filtered.length} members`, 40, 72);
    const cols = [{ k: 'id', label: 'ID', w: 60 }, { k: 'name', label: 'Name', w: 170 }, { k: 'type', label: 'Type', w: 70 }, { k: 'class_name', label: 'Class', w: 80 }, { k: 'books_borrowed', label: 'Books out', w: 70 }];
    let y = 96, x = 40;
    doc.setFillColor(241, 245, 249); doc.rect(40, y - 12, W - 80, 20, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    cols.forEach(c => { doc.text(c.label, x, y); x += c.w; }); y += 18;
    doc.setFont('helvetica', 'normal');
    filtered.forEach(r => { if (y > 760) { doc.addPage(); y = 40; } x = 40; cols.forEach(c => { doc.text(String(r[c.k] ?? '').substring(0, 28), x, y); x += c.w; }); y += 15; });
    doc.save('library-members.pdf');
  };

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24 flex items-center justify-between">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10]">Library</p>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              Library Members
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              Registered borrowers · Students & staff
            </p>
          </div>
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 -mt-12 sm:-mt-16 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[500px]">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Total Members', value: stats.total, icon: <Users size={14} className="text-blue-500" /> },
                { label: 'Students', value: stats.students, icon: <User size={14} className="text-[#1E3A5F]" /> },
                { label: 'Staff', value: stats.staff, icon: <Activity size={14} className="text-amber-500" /> },
                { label: 'Books Out', value: stats.active, icon: <BookOpen size={14} className="text-emerald-500" /> },
              ].map((s, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                  <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{s.icon}</div>
                  <span className="text-sm sm:text-2xl font-semibold text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{s.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
              <button onClick={exportPDF} className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-semibold text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all" style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
                <Printer size={14} /><span>Print members</span>
              </button>
              <button onClick={() => setModalOpen(true)} className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 font-semibold text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 transition-all group">
                <Plus size={14} className="text-amber-500 group-hover:rotate-90 transition-transform duration-300" /><span className="group-hover:text-[#1E3A5F]">Add member</span>
              </button>
            </div>
          </div>
          <div className="hidden lg:flex px-3 py-2 border-b border-black/5 items-center gap-2 bg-re-bg/20">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
              className="h-8 bg-white/80 rounded-lg outline-none border border-black/5 text-[#1E3A5F] text-[9px] font-semibold uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] cursor-pointer appearance-none px-3 pr-6">
              {['All', 'Student', 'Staff', 'Other'].map(t => <option key={t}>{t}</option>)}
            </select>
            <div className="relative w-[16rem] group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 pointer-events-none" />
              <input type="text" placeholder="Search name, ID or class…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 text-[#1E3A5F] text-[9px] font-semibold shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 pl-8" />
            </div>
          </div>
          <div className="overflow-x-auto bg-white flex-1 min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th onClick={() => toggleSort('name')} className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer hover:opacity-70">Member {sortBadge('name')}</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Type</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Class</th>
                  <th onClick={() => toggleSort('books')} className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer text-right hover:opacity-70">Books out {sortBadge('books')}</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group">
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-black/5 bg-slate-100 flex items-center justify-center shadow-inner shrink-0 text-[#1E3A5F]"><User size={16} className="opacity-75" /></div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#1E3A5F] tracking-tight">{m.name}</p>
                          <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest opacity-50 mt-0.5">{m.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5"><span className="bg-re-bg px-2 py-0.5 rounded-lg border border-black/5 text-[10px] font-semibold text-[#1E3A5F]">{m.type}</span></td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 font-semibold text-[#1E3A5F] text-[10px]">{m.class_name || '—'}</td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right">
                      <span className={`text-[13px] font-semibold ${m.books_borrowed > 0 ? 'text-amber-500' : 'text-slate-300'}`}>{m.books_borrowed}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-semibold uppercase border ${m.books_borrowed > 0 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                        {m.books_borrowed > 0 ? 'Has books' : 'Clear'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-[10px] font-semibold text-re-text-muted uppercase tracking-widest opacity-50">No members found</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex px-8 py-4 bg-slate-50/50 border-t border-black/5 items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /><p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest italic opacity-60">Member registry</p></div>
              <div className="w-px h-3 bg-black/10" />
              <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em] opacity-40 italic">{filtered.length} members</p>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && <MemberModal onClose={() => setModalOpen(false)} onSave={m => setMembers(p => [...p, m])} />}
    </div>
  );
};

export default Members;
