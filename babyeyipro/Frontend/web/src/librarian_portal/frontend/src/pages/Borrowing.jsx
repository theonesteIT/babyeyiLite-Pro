import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, BookMarked, Printer, RefreshCw, User, AlertTriangle, CheckCircle, Activity,
  X, Save, GraduationCap, Briefcase, ChevronRight, ArrowLeft, BookOpen,
} from 'lucide-react';
import api from '../services/api';
import { exportLibraryReportPdf } from '../utils/libraryPdf';

const stepBadge = (n, active, done) => (
  <div
    className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-semibold shrink-0 transition-all ${active ? 'bg-[#1E3A5F] text-white shadow-lg' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
      }`}
  >
    {done ? <CheckCircle size={16} /> : n}
  </div>
);

const Borrowing = () => {
  const [step, setStep] = useState(1);
  const [userKind, setUserKind] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState(null);

  const [books, setBooks] = useState([]);
  const [bookSearch, setBookSearch] = useState('');
  const [bookOpen, setBookOpen] = useState(false);
  const bookDdRef = useRef(null);

  const [form, setForm] = useState({
    book_id: '',
    borrow_date: new Date().toISOString().split('T')[0],
    return_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    quantity: '1',
    notes: '',
  });
  const [touched, setTouched] = useState(false);
  const [issueBusy, setIssueBusy] = useState(false);

  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(true);
  const [limits, setLimits] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortBy, setSortBy] = useState({ key: 'due_date', dir: 'asc' });

  const loadLoans = useCallback(async () => {
    setLoansLoading(true);
    try {
      const res = await api.get('/borrowings', { params: { status: 'active' } });
      setLoans(res.data?.data || []);
    } catch {
      setLoans([]);
    } finally {
      setLoansLoading(false);
    }
  }, []);

  const loadBooks = useCallback(async () => {
    try {
      const res = await api.get('/books', { params: { availability: 'in_stock' } });
      setBooks(res.data?.data || []);
    } catch {
      setBooks([]);
    }
  }, []);

  const loadLimits = useCallback(async () => {
    try {
      const res = await api.get('/library/limits');
      setLimits(res.data?.data || null);
    } catch {
      setLimits(null);
    }
  }, []);

  useEffect(() => {
    loadLoans();
    loadBooks();
    loadLimits();
  }, [loadLoans, loadBooks, loadLimits]);

  useEffect(() => {
    const onDoc = (e) => {
      if (bookDdRef.current && !bookDdRef.current.contains(e.target)) setBookOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    if (!userKind || searchQ.trim().length < 1) {
      setSearchResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const path = userKind === 'student' ? '/students/search' : '/staff/search';
        const res = await api.get(path, { params: { q: searchQ.trim() } });
        setSearchResults(res.data?.data || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [searchQ, userKind]);

  const pickUser = (row) => {
    setSelected(row);
    setStep(2);
  };

  const resetFlow = () => {
    setStep(1);
    setUserKind(null);
    setSearchQ('');
    setSearchResults([]);
    setSelected(null);
    setForm((f) => ({
      ...f,
      book_id: '',
      borrow_date: new Date().toISOString().split('T')[0],
      return_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      quantity: '1',
      notes: '',
    }));
    setTouched(false);
  };

  const borrowerLabel = () => {
    if (!selected) return '';
    if (userKind === 'student') return selected.name;
    return selected.name;
  };

  const borrowerSub = () => {
    if (!selected) return '';
    if (userKind === 'student') return `${selected.class_name || '—'} · ${selected.code || selected.student_code || ''}`;
    return `${selected.role || 'Staff'} · ${selected.staff_id || ''}`;
  };

  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    return books.filter((b) => {
      if (!q) return true;
      return (
        (b.title || '').toLowerCase().includes(q)
        || (b.isbn || '').toLowerCase().includes(q)
        || String(b.id).includes(q)
      );
    });
  }, [books, bookSearch]);

  const selectedBook = useMemo(() => books.find((b) => String(b.id) === String(form.book_id)), [books, form.book_id]);

  const fieldErr = (key) => {
    if (!touched) return '';
    if (key === 'book_id' && !form.book_id) return 'This field is required';
    if (key === 'borrow_date' && !form.borrow_date) return 'This field is required';
    if (key === 'return_date' && !form.return_date) return 'This field is required';
    if (key === 'quantity') {
      const n = parseInt(form.quantity, 10);
      if (!Number.isFinite(n) || n < 1) return 'This field is required';
    }
    return '';
  };

  const inputCls = (key) =>
    `w-full bg-re-bg border rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] ${fieldErr(key) ? 'border-red-500 ring-1 ring-red-500/30' : 'border-black/5 focus:border-[#1E3A5F]/20'
    }`;

  const submitBorrow = async () => {
    setTouched(true);
    const qty = parseInt(form.quantity, 10);
    if (!form.book_id || !form.borrow_date || !form.return_date || !Number.isFinite(qty) || qty < 1) return;
    if (new Date(form.return_date) < new Date(form.borrow_date)) {
      window.alert('Return date must be on or after borrow date');
      return;
    }
    const user_id = userKind === 'student' ? selected.id : selected.user_id;
    setIssueBusy(true);
    try {
      await api.post('/borrowings', {
        user_type: userKind,
        user_id,
        book_id: parseInt(form.book_id, 10),
        quantity: qty,
        borrow_date: form.borrow_date,
        return_date: form.return_date,
        notes: form.notes.trim() || undefined,
      });
      await loadLoans();
      await loadBooks();
      resetFlow();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Could not issue book');
    } finally {
      setIssueBusy(false);
    }
  };

  const handleReturn = async (id) => {
    try {
      await api.put(`/borrowings/return/${id}`);
      await loadLoans();
      await loadBooks();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Return failed');
    }
  };

  const stats = useMemo(() => ({
    active: loans.filter((l) => l.status !== 'returned').length,
    overdue: loans.filter((l) => l.overdue).length,
    students: loans.filter((l) => l.user_type === 'student').length,
    staff: loans.filter((l) => l.user_type === 'teacher').length,
  }), [loans]);

  const qtyByBorrower = useMemo(() => {
    const m = {};
    loans.forEach((l) => {
      const k = `${l.user_type}:${l.user_id}`;
      m[k] = (m[k] || 0) + (Number(l.quantity) || 0);
    });
    return m;
  }, [loans]);

  const maxForLoan = (l) => {
    if (!limits) return null;
    return l.user_type === 'student' ? limits.max_student_books : limits.max_teacher_books;
  };

  const loadLabel = (l) => {
    const k = `${l.user_type}:${l.user_id}`;
    const q = qtyByBorrower[k] || 0;
    const max = maxForLoan(l);
    if (max == null) return `${q} out`;
    const atCap = q >= max;
    return { text: `${q} / ${max}`, atCap };
  };

  const filtered = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return loans.filter((l) => {
      const tOk = typeFilter === 'All'
        || (typeFilter === 'Student' && l.user_type === 'student')
        || (typeFilter === 'Staff' && l.user_type === 'teacher');
      const oOk = !overdueOnly || l.overdue;
      const qOk = !q
        || (l.borrower_name || '').toLowerCase().includes(q)
        || (l.book_title || '').toLowerCase().includes(q)
        || String(l.id).includes(q);
      return tOk && oOk && qOk;
    }).sort((a, b) => {
      const dir = sortBy.dir === 'asc' ? 1 : -1;
      if (sortBy.key === 'due_date') return (new Date(a.return_date) - new Date(b.return_date)) * dir;
      if (sortBy.key === 'borrower_name') return (a.borrower_name || '').localeCompare(b.borrower_name || '') * dir;
      return (a.borrower_name || '').localeCompare(b.borrower_name || '') * dir;
    });
  }, [loans, listSearch, typeFilter, overdueOnly, sortBy]);

  const toggleSort = (k) => setSortBy((p) => ({ key: k, dir: p.key === k ? (p.dir === 'asc' ? 'desc' : 'asc') : 'asc' }));
  const sortBadge = (k) => sortBy.key === k ? <span className="ml-1 text-[9px] font-semibold">{sortBy.dir === 'asc' ? '↑' : '↓'}</span> : null;

  const exportPDF = () => {
    exportLibraryReportPdf({
      title: 'Active Loans — Babyeyi School Library',
      subtitle: `Generated: ${new Date().toLocaleString()} · ${filtered.length} active loans`,
      fileName: 'active-loans.pdf',
      columns: [
        { k: 'id', label: 'Loan ID', w: 50 },
        { k: 'book_title', label: 'Book', w: 140 },
        { k: 'borrower_name', label: 'Borrower', w: 120 },
        { k: 'borrower_detail', label: 'Class / Role', w: 72 },
        { k: 'borrow_date', label: 'Issued', w: 68 },
        { k: 'return_date', label: 'Due', w: 68 },
        { k: 'quantity', label: 'Qty', w: 32 },
        {
          k: '_st',
          label: 'Status',
          w: 64,
          format: (r) => (r.overdue ? `Overdue (${r.days_overdue || 0}d)` : 'Active'),
        },
      ],
      rows: filtered,
    });
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
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10]">Circulation</p>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              Active Loans
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              Step-based issue · Loan caps: students {limits?.max_student_books ?? '—'} · staff {limits?.max_teacher_books ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 -mt-12 sm:-mt-16 relative z-20 pb-16 space-y-4">
        {/* Issue wizard card */}
        <div className="bg-white rounded-[24px] sm:rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden">
          <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-black/5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-gradient-to-r from-[#1E3A5F]/5 to-transparent">
            <div className="flex items-center gap-3">
              {stepBadge(1, step === 1, step > 1)}
              <ChevronRight size={16} className="text-slate-300 hidden sm:block" />
              {stepBadge(2, step === 2, false)}
              <div className="ml-1 min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-slate-400">New loan</p>
                <p className="text-sm font-semibold text-[#1E3A5F] truncate">
                  {step === 1 ? 'Who is borrowing?' : `Issue book · ${borrowerLabel()}`}
                </p>
              </div>
            </div>
            {step === 2 && (
              <button
                type="button"
                onClick={() => { setStep(1); setSelected(null); setTouched(false); }}
                className="h-10 px-4 rounded-xl border border-black/5 text-[9px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-re-bg flex items-center gap-2 self-start sm:self-auto"
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>

          {step === 1 && (
            <div className="p-4 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setUserKind('student'); setSearchQ(''); setSearchResults([]); setSelected(null); }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${userKind === 'student' ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 shadow-md' : 'border-black/5 hover:border-[#1E3A5F]/30'
                    }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center text-[#1E3A5F]">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">Step 1</p>
                    <p className="font-semibold text-[#1E3A5F]">Select Student</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Search name, code, or SDMS</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setUserKind('teacher'); setSearchQ(''); setSearchResults([]); setSelected(null); }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${userKind === 'teacher' ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 shadow-md' : 'border-black/5 hover:border-[#1E3A5F]/30'
                    }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-600">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">Step 1</p>
                    <p className="font-semibold text-[#1E3A5F]">Select Teacher / Staff</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">Search name or staff ID</p>
                  </div>
                </button>
              </div>

              {userKind && (
                <div className="space-y-3">
                  <label className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Search</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder={userKind === 'student' ? 'Name, student code, SDMS…' : 'Name or staff ID…'}
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-black/5 bg-re-bg text-[12px] font-bold text-[#1E3A5F] outline-none focus:border-[#1E3A5F]/30"
                    />
                    {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400">…</span>}
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-xl border border-black/5 divide-y divide-black/5 bg-white">
                    {searchResults.length === 0 && searchQ.trim().length >= 1 && !searching && (
                      <p className="p-4 text-center text-[11px] font-bold text-slate-400">No matches</p>
                    )}
                    {searchResults.map((row) => (
                      <button
                        type="button"
                        key={userKind === 'student' ? row.id : row.user_id}
                        onClick={() => pickUser(row)}
                        className="w-full text-left p-4 hover:bg-re-bg/80 flex items-center justify-between gap-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1E3A5F] text-[13px] truncate">{userKind === 'student' ? row.name : row.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">
                            {userKind === 'student'
                              ? `${row.class_name || '—'} · ${row.code || row.student_code || ''}`
                              : `${row.role || 'Staff'} · ${row.course_teaching || '—'}`}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && selected && (
            <div className="p-4 sm:p-8 space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-re-bg/80 border border-black/5">
                <div className="w-11 h-11 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-[#1E3A5F] shrink-0">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Borrower</p>
                  <p className="font-semibold text-[#1E3A5F] text-[15px] leading-tight">{borrowerLabel()}</p>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">{borrowerSub()}</p>
                </div>
              </div>

              <div className="relative" ref={bookDdRef}>
                <label className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Book *</label>
                <button
                  type="button"
                  onClick={() => setBookOpen((o) => !o)}
                  className={inputCls('book_id') + ' flex items-center justify-between text-left cursor-pointer'}
                >
                  <span className="truncate">
                    {selectedBook ? `${selectedBook.title} (${selectedBook.available_quantity} avail.)` : 'Search and select book…'}
                  </span>
                  <BookOpen size={14} className="shrink-0 opacity-50" />
                </button>
                {fieldErr('book_id') && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldErr('book_id')}</p>}
                {bookOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-black/10 rounded-xl shadow-2xl max-h-64 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-black/5">
                      <input
                        value={bookSearch}
                        onChange={(e) => setBookSearch(e.target.value)}
                        placeholder="Filter by title, ISBN…"
                        className="w-full h-9 px-3 rounded-lg border border-black/5 text-[11px] font-bold outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto max-h-52">
                      {filteredBooks.map((b) => (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => { setForm((f) => ({ ...f, book_id: String(b.id) })); setBookOpen(false); setBookSearch(''); }}
                          className="w-full text-left px-3 py-2.5 text-[11px] font-bold hover:bg-re-bg border-b border-black/5 last:border-0"
                        >
                          {b.title} <span className="text-slate-400 font-mono text-[10px]">{b.isbn}</span>
                          <span className="float-right text-emerald-600">{b.available_quantity} left</span>
                        </button>
                      ))}
                      {filteredBooks.length === 0 && (
                        <p className="p-4 text-center text-[11px] text-slate-400 font-bold">No copies in stock</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Borrow date *</label>
                  <input type="date" value={form.borrow_date} onChange={(e) => setForm((f) => ({ ...f, borrow_date: e.target.value }))} className={inputCls('borrow_date')} />
                  {fieldErr('borrow_date') && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldErr('borrow_date')}</p>}
                </div>
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Return date *</label>
                  <input type="date" value={form.return_date} onChange={(e) => setForm((f) => ({ ...f, return_date: e.target.value }))} className={inputCls('return_date')} />
                  {fieldErr('return_date') && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldErr('return_date')}</p>}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Quantity *</label>
                <input
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  className={inputCls('quantity')}
                />
                {fieldErr('quantity') && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldErr('quantity')}</p>}
              </div>

              <div>
                <label className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 block mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                  className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={submitBorrow}
                  disabled={issueBusy}
                  className="flex-1 h-11 rounded-xl text-white font-semibold text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
                >
                  <Save size={14} /> {issueBusy ? 'Issuing…' : 'Issue book'}
                </button>
                <button type="button" onClick={resetFlow} className="h-11 px-6 rounded-xl border border-black/5 font-semibold text-[10px] uppercase text-slate-500 hover:bg-re-bg">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loans table */}
        <div className="bg-white rounded-[24px] sm:rounded-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[400px]">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Active Loans', value: stats.active, icon: <BookMarked size={14} className="text-blue-500" /> },
                { label: 'Overdue', value: stats.overdue, icon: <AlertTriangle size={14} className="text-red-500" /> },
                { label: 'Students', value: stats.students, icon: <User size={14} className="text-[#1E3A5F]" /> },
                { label: 'Staff Loans', value: stats.staff, icon: <Activity size={14} className="text-amber-500" /> },
              ].map((s, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center">
                  <div className="mb-1.5 opacity-40">{s.icon}</div>
                  <span className="text-lg sm:text-2xl font-semibold text-re-text">{s.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-1 opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-4 sm:p-6 justify-center gap-2 sm:gap-3">
              <button type="button" onClick={exportPDF} className="w-full h-10 sm:h-11 flex items-center justify-center gap-2 text-white rounded-xl font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
                <Printer size={14} /><span>Print loans</span>
              </button>
              <button type="button" onClick={() => { resetFlow(); setStep(1); }} className="w-full h-10 sm:h-11 flex items-center justify-center gap-2 bg-white border border-black/5 rounded-xl font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest hover:bg-re-bg">
                <Plus size={14} className="text-amber-500" /><span>Issue book</span>
              </button>
              <button type="button" onClick={loadLoans} className="w-full h-9 flex items-center justify-center gap-2 text-[9px] font-semibold uppercase text-slate-500 border border-black/5 rounded-xl hover:bg-white">
                <RefreshCw size={12} className={loansLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row flex-wrap px-3 py-2 border-b border-black/5 gap-2 bg-re-bg/20">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 w-full lg:w-[8rem] bg-white/80 rounded-lg border border-black/5 text-[9px] font-semibold uppercase tracking-widest px-2">
              {['All', 'Student', 'Staff'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <button type="button" onClick={() => setOverdueOnly((p) => !p)}
              className={`h-9 px-3 rounded-lg text-[9px] font-semibold uppercase border w-full lg:w-auto ${overdueOnly ? 'bg-red-100 text-red-600 border-red-200' : 'bg-white border-black/5'}`}>
              Overdue only
            </button>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={listSearch} onChange={(e) => setListSearch(e.target.value)} placeholder="Search borrower or book…"
                className="w-full h-9 pl-8 pr-3 rounded-lg border border-black/5 bg-white/80 text-[9px] font-semibold uppercase" />
            </div>
          </div>

          <div className="overflow-x-auto flex-1 min-h-[280px]">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th onClick={() => toggleSort('borrower_name')} className="px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r cursor-pointer">Borrower {sortBadge('borrower_name')}</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase opacity-40 border-r text-right">Load</th>
                  <th className="hidden md:table-cell px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase opacity-40 border-r">Book</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase opacity-40 border-r text-right">Qty</th>
                  <th className="hidden md:table-cell px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase opacity-40 border-r text-right">Issued</th>
                  <th onClick={() => toggleSort('due_date')} className="px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase opacity-40 border-r cursor-pointer text-right">Due {sortBadge('due_date')}</th>
                  <th className="px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase opacity-40 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((l) => {
                  const load = loadLabel(l);
                  const loadText = typeof load === 'string' ? load : load.text;
                  const loadWarn = typeof load === 'object' && load.atCap;
                  return (
                    <tr key={l.id} className={`hover:bg-re-bg/60 ${l.overdue ? 'border-l-4 border-red-400' : ''}`}>
                      <td className="px-4 py-3 border-r">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full border border-black/5 bg-slate-100 flex items-center justify-center shrink-0">
                            <User size={14} className="text-[#1E3A5F] opacity-75" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-[#1E3A5F] truncate">{l.borrower_name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{l.borrower_detail} · {l.user_type}</p>
                            <p className="lg:hidden text-[8px] font-semibold mt-0.5 uppercase">
                              <span className={loadWarn ? 'text-red-500' : 'text-slate-500'}>Load {loadText}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 border-r text-right">
                        <span className={`text-[11px] font-semibold ${loadWarn ? 'text-red-500' : 'text-slate-600'}`}>{loadText}</span>
                        {loadWarn && <p className="text-[7px] font-semibold text-red-400 uppercase">At limit</p>}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 border-r">
                        <span className="text-[11px] font-semibold text-[#1E3A5F]">{l.book_title}</span>
                        <p className="text-[8px] font-bold text-slate-400">{l.book_isbn}</p>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 border-r text-right font-semibold text-[11px]">{l.quantity}</td>
                      <td className="hidden md:table-cell px-4 py-3 border-r text-right text-[11px] font-semibold">{l.borrow_date}</td>
                      <td className="px-4 py-3 border-r text-right">
                        <p className={`text-[12px] font-semibold ${l.overdue ? 'text-red-500' : 'text-slate-600'}`}>{l.return_date}</p>
                        {l.overdue && <p className="text-[8px] font-semibold text-red-400 uppercase">Overdue</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => handleReturn(l.id)}
                          className="h-8 px-3 rounded-xl inline-flex items-center gap-1.5 bg-white border border-black/5 font-semibold text-[8px] uppercase tracking-widest hover:bg-re-bg">
                          <CheckCircle size={12} className="text-amber-500" /> Return
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loansLoading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-[10px] font-semibold text-slate-400 uppercase">No active loans</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Borrowing;
