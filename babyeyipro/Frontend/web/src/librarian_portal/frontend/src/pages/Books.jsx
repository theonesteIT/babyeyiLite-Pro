import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, BookOpen, Download, RefreshCw, Filter,
  User, Printer, Eye, Edit2, Trash2, CheckCircle, AlertTriangle,
  Tag, Activity, TrendingUp, X, Save,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const GENRES = ['All','Fiction','Non-Fiction','Science','History','Mathematics','Language','Religion','Reference','Other'];
const YEARS = ['2025-2026','2024-2025','2023-2024'];

// ── Mock data ─────────────────────────────────────────────────
const MOCK_BOOKS = [
  { id: 'BK001', title: 'Things Fall Apart', author: 'Chinua Achebe', genre: 'Fiction', isbn: '978-0385474542', copies: 6, available: 4, shelf: 'A1', year: 2019 },
  { id: 'BK002', title: 'A Long Way Gone', author: 'Ishmael Beah', genre: 'Non-Fiction', isbn: '978-0374531263', copies: 3, available: 3, shelf: 'B2', year: 2020 },
  { id: 'BK003', title: 'Biology Form 4', author: 'REB', genre: 'Science', isbn: '978-9999000001', copies: 40, available: 32, shelf: 'C1', year: 2022 },
  { id: 'BK004', title: 'Mathematics S5', author: 'REB', genre: 'Mathematics', isbn: '978-9999000002', copies: 38, available: 25, shelf: 'C2', year: 2022 },
  { id: 'BK005', title: 'History of Rwanda', author: 'Alison Des Forges', genre: 'History', isbn: '978-1564321503', copies: 5, available: 2, shelf: 'D3', year: 2018 },
  { id: 'BK006', title: 'English Grammar In Use', author: 'Raymond Murphy', genre: 'Language', isbn: '978-1107539334', copies: 12, available: 9, shelf: 'A4', year: 2021 },
  { id: 'BK007', title: 'Chemistry S4', author: 'REB', genre: 'Science', isbn: '978-9999000003', copies: 35, available: 28, shelf: 'C3', year: 2022 },
  { id: 'BK008', title: 'Physics S6', author: 'REB', genre: 'Science', isbn: '978-9999000004', copies: 30, available: 18, shelf: 'C4', year: 2023 },
  { id: 'BK009', title: 'Kinyarwanda S3', author: 'REB', genre: 'Language', isbn: '978-9999000005', copies: 44, available: 44, shelf: 'A5', year: 2023 },
  { id: 'BK010', title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry', genre: 'Fiction', isbn: '978-2070408504', copies: 4, available: 0, shelf: 'A2', year: 2017 },
  { id: 'BK011', title: 'Atlas of Africa', author: 'Philip\'s', genre: 'Reference', isbn: '978-0540088736', copies: 2, available: 2, shelf: 'E1', year: 2016 },
  { id: 'BK012', title: 'The Bible', author: 'Various', genre: 'Religion', isbn: '978-0195288100', copies: 20, available: 15, shelf: 'F1', year: 2020 },
];

const BookModal = ({ book, onClose, onSave }) => {
  const isEdit = !!book?.id;
  const [form, setForm] = useState({
    title: book?.title || '', author: book?.author || '', genre: book?.genre || 'Fiction',
    isbn: book?.isbn || '', copies: book?.copies ?? '', available: book?.available ?? '',
    shelf: book?.shelf || '', year: book?.year ?? new Date().getFullYear(),
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.author.trim() && Number(form.copies) > 0;

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">{isEdit ? 'Edit book' : 'Add book'}</p>
            <h3 className="font-black text-[#1E3A5F] text-base mt-0.5">{isEdit ? form.title : 'New catalogue entry'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:rotate-90 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {[
            { label: 'Title *', key: 'title', placeholder: 'Book title' },
            { label: 'Author *', key: 'author', placeholder: 'Author name' },
            { label: 'ISBN', key: 'isbn', placeholder: '978-…' },
            { label: 'Total copies *', key: 'copies', type: 'number', placeholder: '1' },
            { label: 'Available copies', key: 'available', type: 'number', placeholder: '1' },
            { label: 'Shelf location', key: 'shelf', placeholder: 'e.g. A1' },
            { label: 'Year published', key: 'year', type: 'number', placeholder: '2024' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/50 block mb-1">{f.label}</label>
              <input type={f.type || 'text'} value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]" />
            </div>
          ))}
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/50 block mb-1">Genre</label>
            <select value={form.genre} onChange={e => set('genre', e.target.value)}
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] transition-all shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]">
              {GENRES.filter(g => g !== 'All').map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="bg-white border-t border-black/5 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-[7px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-30 italic hidden sm:block">Ready to save</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-black/5 text-[#1E3A5F] font-black text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all">Cancel</button>
            <button disabled={!valid} onClick={() => { if (valid) { onSave({ ...book, ...form, copies: Number(form.copies), available: Number(form.available ?? form.copies) }); onClose(); }}}
              className="h-9 px-6 rounded-lg text-white font-black text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
              <Save size={12} className="inline mr-1" />{isEdit ? 'Update' : 'Add book'}
            </button>
          </div>
        </div>
      </div>
    </div>, document.body
  );
};

const Books = () => {
  const [books, setBooks] = useState(MOCK_BOOKS);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortBy, setSortBy] = useState({ key: 'title', dir: 'asc' });

  const stats = useMemo(() => ({
    total: books.length,
    totalCopies: books.reduce((s, b) => s + b.copies, 0),
    available: books.reduce((s, b) => s + b.available, 0),
    borrowed: books.reduce((s, b) => s + (b.copies - b.available), 0),
    unavailable: books.filter(b => b.available === 0).length,
  }), [books]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter(b => {
      const gOk = genre === 'All' || b.genre === genre;
      const sOk = stockFilter === 'All' || (stockFilter === 'Available' && b.available > 0) || (stockFilter === 'Out' && b.available === 0) || (stockFilter === 'Low' && b.available > 0 && b.available < 3);
      const qOk = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.isbn?.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
      return gOk && sOk && qOk;
    }).sort((a, b) => {
      const dir = sortBy.dir === 'asc' ? 1 : -1;
      if (sortBy.key === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortBy.key === 'available') return (a.available - b.available) * dir;
      if (sortBy.key === 'copies') return (a.copies - b.copies) * dir;
      return a.author.localeCompare(b.author) * dir;
    });
  }, [books, search, genre, stockFilter, sortBy]);

  const toggleSort = k => setSortBy(p => ({ key: k, dir: p.key === k ? (p.dir === 'asc' ? 'desc' : 'asc') : 'asc' }));
  const sortBadge = k => sortBy.key === k ? <span className="ml-1 text-[9px] font-black">{sortBy.dir === 'asc' ? '↑' : '↓'}</span> : null;

  const handleSave = (book) => {
    if (book.id && books.find(b => b.id === book.id)) setBooks(prev => prev.map(b => b.id === book.id ? book : b));
    else setBooks(prev => [...prev, { ...book, id: `BK${String(prev.length + 1).padStart(3, '0')}` }]);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, W, 56, 'F');
    doc.setFillColor(254, 191, 16);
    doc.rect(0, 53, W, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Book Catalogue — Babyeyi School Library', 40, 36);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()} · ${filtered.length} titles`, 40, 72);
    const cols = [
      { k: 'id', label: 'ID', w: 55 },
      { k: 'title', label: 'Title', w: 170 },
      { k: 'author', label: 'Author', w: 130 },
      { k: 'genre', label: 'Genre', w: 80 },
      { k: 'copies', label: 'Copies', w: 55 },
      { k: 'available', label: 'Avail.', w: 50 },
      { k: 'shelf', label: 'Shelf', w: 50 },
    ];
    let y = 96, x = 40;
    doc.setFillColor(241, 245, 249);
    doc.rect(40, y - 12, W - 80, 20, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    cols.forEach(c => { doc.text(c.label, x, y); x += c.w; });
    y += 18;
    doc.setFont('helvetica', 'normal');
    filtered.forEach(r => {
      if (y > 520) { doc.addPage(); y = 40; }
      x = 40;
      cols.forEach(c => { doc.text(String(r[c.k] ?? '').substring(0, 28), x, y); x += c.w; });
      y += 15;
    });
    doc.save('book-catalogue.pdf');
  };

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>

      {/* ── Hero ── */}
      <div className="relative w-full min-h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]" />
        <img src={import.meta.env.BASE_URL + "teacher.jpg"} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10" />
        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
          <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <BookOpen size={40} style={{ color: '#FEBF10' }} className="group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>Library Catalogue</p>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">
              Book <span style={{ color: '#FEBF10' }}>Collection</span>
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">
              Full catalogue · Availability · Shelf locations
            </p>
          </div>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[500px]">

          {/* Stats header */}
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Total Titles',    value: stats.total,        icon: <BookOpen size={14} className="text-blue-500" /> },
                { label: 'Total Copies',    value: stats.totalCopies,  icon: <Activity size={14} className="text-[#1E3A5F]" /> },
                { label: 'Available Now',   value: stats.available,    icon: <CheckCircle size={14} className="text-emerald-500" /> },
                { label: 'Currently Out',   value: stats.borrowed,     icon: <AlertTriangle size={14} className="text-amber-500" /> },
              ].map((stat, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                  <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{stat.icon}</div>
                  <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{stat.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3">
              <button onClick={exportPDF}
                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
                <Printer size={14} /><span>Print catalogue</span>
              </button>
              <button onClick={() => setModal({})}
                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 transition-all group">
                <Plus size={14} className="text-amber-500 group-hover:rotate-90 transition-transform duration-300" />
                <span className="group-hover:text-[#1E3A5F] transition-colors">Add book</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="hidden lg:flex px-3 py-2 border-b border-black/5 flex-nowrap items-center gap-2 bg-re-bg/20">
            <div className="relative w-[8rem] shrink-0">
              <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 z-[1]" />
              <select value={genre} onChange={e => setGenre(e.target.value)}
                className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] cursor-pointer appearance-none pl-8 pr-6">
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="relative w-[8rem] shrink-0">
              <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}
                className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] cursor-pointer appearance-none pl-3 pr-6">
                {['All','Available','Out','Low'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="relative w-[16rem] group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
              <input type="text" placeholder="Search title, author, ISBN…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 pl-8" />
            </div>
            <button onClick={() => {}} className="h-8 w-8 flex items-center justify-center bg-white border border-black/5 rounded-lg hover:bg-re-bg transition-all shadow-sm ml-auto shrink-0">
              <RefreshCw size={12} className="text-[#1E3A5F]" />
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white flex-1 min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th onClick={() => toggleSort('title')} className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer select-none hover:opacity-70">Book {sortBadge('title')}</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Genre</th>
                  <th onClick={() => toggleSort('copies')} className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer text-right">Copies {sortBadge('copies')}</th>
                  <th onClick={() => toggleSort('available')} className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer text-right">Available {sortBadge('available')}</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Shelf</th>
                  <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group cursor-pointer">
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-black/5 bg-slate-100 flex items-center justify-center shadow-inner shrink-0 text-[#1E3A5F]">
                          <BookOpen size={15} className="opacity-60" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-[#1E3A5F] tracking-tight">{b.title}</p>
                          <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest opacity-50 mt-0.5">{b.author} · {b.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5">
                      <span className="bg-re-bg px-2 py-0.5 rounded-lg border border-black/5 text-[10px] font-black text-[#1E3A5F]">{b.genre}</span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right font-black text-[#1E3A5F] text-[11px]">{b.copies}</td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right">
                      <span className={`text-[13px] font-black ${b.available === 0 ? 'text-red-500' : b.available < 3 ? 'text-amber-500' : 'text-emerald-600'}`}>{b.available}</span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 font-black text-[#1E3A5F] text-[10px]">
                      <span className="bg-re-bg px-2 py-0.5 rounded-lg border border-black/5">{b.shelf}</span>
                    </td>
                    <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); setModal(b); }} className="h-7 px-3 rounded-xl flex items-center gap-1.5 bg-white border border-black/5 text-[#1E3A5F] font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg transition-all">
                          <Edit2 size={11} className="text-amber-500" /><span>Edit</span>
                        </button>
                        <button onClick={e => { e.stopPropagation(); setDeleteConfirm(b); }} className="h-7 w-7 rounded-xl flex items-center justify-center bg-white border border-black/5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-[10px] font-black text-re-text-muted uppercase tracking-widest opacity-50">No books found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex px-8 py-4 bg-slate-50/50 border-t border-black/5 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic opacity-60">Catalogue</p>
              </div>
              <div className="w-px h-3 bg-black/10" />
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-40 italic">{filtered.length} titles · {books.reduce((s,b)=>s+b.available,0)} copies available</p>
            </div>
          </div>
        </div>
      </div>

      {modal !== null && <BookModal book={modal} onClose={() => setModal(null)} onSave={handleSave} />}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-red-500" /></div>
            <h3 className="font-black text-[#1E3A5F] mb-2">Remove "{deleteConfirm.title}"?</h3>
            <p className="text-[11px] font-bold text-slate-400 mb-6">This will remove the book from the catalogue.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-black/5 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { setBooks(p => p.filter(b => b.id !== deleteConfirm.id)); setDeleteConfirm(null); }} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase hover:bg-red-600">Remove</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default Books;
