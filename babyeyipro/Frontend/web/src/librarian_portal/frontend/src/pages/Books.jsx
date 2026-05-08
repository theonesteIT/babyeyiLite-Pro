import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, BookOpen, RefreshCw, Filter, Printer, Edit2, Trash2, CheckCircle, AlertTriangle,
  Activity, X, Save, Upload, QrCode, Hash, Download,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '../services/api';

const CATEGORIES = ['All', 'Fiction', 'Non-Fiction', 'Science', 'History', 'Mathematics', 'Language', 'Religion', 'Reference', 'Other'];
const CONDITIONS = ['New', 'Good', 'Old', 'Damaged'];

/** Axios defaults to application/json; FormData needs the real multipart boundary (do not set Content-Type manually). */
const formDataAxiosConfig = {
  transformRequest: [
    (data, headers) => {
      if (data instanceof FormData) {
        delete headers['Content-Type'];
      }
      return data;
    },
  ],
};

const BookModal = ({ book, onClose, onSaved }) => {
  const isEdit = !!(book?.id);
  const [form, setForm] = useState({
    title: book?.title || '',
    isbn: book?.isbn || '',
    author: book?.author || '',
    category: book?.category || 'Fiction',
    quantity: book?.quantity != null ? String(book.quantity) : '',
    shelf_location: book?.shelf_location || '',
    condition: book?.condition || 'Good',
    publisher: book?.publisher || '',
    year: book?.year != null ? String(book.year) : '',
    edition: book?.edition || '',
    language: book?.language || '',
    description: book?.description || '',
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fieldError = (key) => {
    if (!submitAttempted) return '';
    const v = form[key];
    if (['title', 'isbn', 'author', 'category', 'shelf_location'].includes(key)) {
      if (!String(v || '').trim()) return 'This field is required';
    }
    if (key === 'quantity') {
      const n = parseInt(v, 10);
      if (!Number.isFinite(n) || n < 1) return 'This field is required';
    }
    if (key === 'condition' && !v) return 'This field is required';
    return '';
  };

  const errClass = (key) => (fieldError(key) ? 'required-input required-input--error' : 'required-input');

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    const q = parseInt(form.quantity, 10);
    if (
      !form.title.trim() || !form.isbn.trim() || !form.author.trim() || !form.category.trim()
      || !form.shelf_location.trim() || !Number.isFinite(q) || q < 1 || !form.condition
    ) return;

    setSaving(true);
    try {
      const jsonBody = {
        title: form.title.trim(),
        isbn: form.isbn.trim(),
        author: form.author.trim(),
        category: form.category.trim(),
        quantity: q,
        shelf_location: form.shelf_location.trim(),
        condition: form.condition,
        publisher: form.publisher.trim() || undefined,
        year: form.year.trim() || undefined,
        edition: form.edition.trim() || undefined,
        language: form.language.trim() || undefined,
        description: form.description.trim() || undefined,
      };

      if (coverFile) {
        const payload = new FormData();
        Object.entries(jsonBody).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') payload.append(k, String(v));
        });
        payload.append('cover_image', coverFile);
        if (isEdit) {
          await api.put(`/books/${book.id}`, payload, formDataAxiosConfig);
        } else {
          await api.post('/books', payload, formDataAxiosConfig);
        }
      } else if (isEdit) {
        await api.put(`/books/${book.id}`, jsonBody);
      } else {
        await api.post('/books', jsonBody);
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Save failed';
      window.alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-[32px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.3em] opacity-40">{isEdit ? 'Edit book' : 'Add book'}</p>
            <h3 className="font-semibold text-[#1E3A5F] text-base mt-0.5">{isEdit ? form.title || 'Edit' : 'New catalogue entry'}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:rotate-90 transition-all"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400">Required</p>
          {[
            { label: 'Book Title', key: 'title', placeholder: 'Book title', req: true },
            { label: 'ISBN / Book Code', key: 'isbn', placeholder: '978-…', req: true },
            { label: 'Author', key: 'author', placeholder: 'Author name', req: true },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">{f.label} *</label>
              <input
                type="text"
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className={`w-full bg-re-bg px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] ${errClass(f.key)}`}
              />
              {fieldError(f.key) && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldError(f.key)}</p>}
            </div>
          ))}
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className={`w-full bg-re-bg px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] transition-all shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] ${errClass('category')}`}
            >
              {CATEGORIES.filter((c) => c !== 'All').map((g) => <option key={g}>{g}</option>)}
            </select>
            {fieldError('category') && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldError('category')}</p>}
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Quantity *</label>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              placeholder="1"
              className={`w-full bg-re-bg px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] ${errClass('quantity')}`}
            />
            {fieldError('quantity') && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldError('quantity')}</p>}
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Shelf Location *</label>
            <input
              type="text"
              value={form.shelf_location}
              onChange={(e) => set('shelf_location', e.target.value)}
              placeholder="e.g. A1"
              className={`w-full bg-re-bg px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] ${errClass('shelf_location')}`}
            />
            {fieldError('shelf_location') && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldError('shelf_location')}</p>}
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Condition *</label>
            <select
              value={form.condition}
              onChange={(e) => set('condition', e.target.value)}
              className={`w-full bg-re-bg px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] ${errClass('condition')}`}
            >
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
            {fieldError('condition') && <p className="text-[10px] text-red-500 font-bold mt-0.5">{fieldError('condition')}</p>}
          </div>

          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 pt-2">Optional</p>
          {[
            { label: 'Publisher', key: 'publisher', ph: 'Publisher' },
            { label: 'Year of Publication', key: 'year', ph: '2024', type: 'number' },
            { label: 'Edition', key: 'edition', ph: '3rd' },
            { label: 'Language', key: 'language', ph: 'English' },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={form[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.ph}
                className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)]"
              />
            </div>
          ))}
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Summary or notes"
              className="w-full bg-re-bg border border-black/5 rounded-xl px-3 py-2.5 text-[11px] font-bold outline-none focus:border-[#1E3A5F]/20 text-[#1E3A5F] shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] resize-none"
            />
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-re-text-muted/50 block mb-1">Cover Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="w-full text-[10px] font-bold text-[#1E3A5F]"
            />
          </div>
        </div>
        <div className="bg-white border-t border-black/5 px-6 py-4 flex items-center justify-between shrink-0">
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-black/5 text-[#1E3A5F] font-semibold text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all">Cancel</button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="h-9 px-6 rounded-lg text-white font-semibold text-[9px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
          >
            <Save size={12} className="inline mr-1" />{saving ? 'Saving…' : isEdit ? 'Update' : 'Add book'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const QrModal = ({ bookId, onClose }) => {
  const [src, setSrc] = useState(null);
  const blobRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/books/${bookId}/qr.png`, { responseType: 'blob' });
        if (cancelled) return;
        if (blobRef.current) URL.revokeObjectURL(blobRef.current);
        blobRef.current = URL.createObjectURL(res.data);
        setSrc(blobRef.current);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();
    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [bookId]);

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose} role="presentation">
      <div className="bg-white rounded-[24px] shadow-2xl p-6 max-w-xs w-full text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Book QR</p>
        {src ? <img src={src} alt="QR" className="mx-auto w-48 h-48 object-contain" /> : <p className="text-sm text-slate-500">Could not load QR</p>}
        <button type="button" onClick={onClose} className="mt-4 h-9 px-6 rounded-xl border border-black/5 font-semibold text-[10px] uppercase">Close</button>
      </div>
    </div>,
    document.body
  );
};

const Books = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [qrBook, setQrBook] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortBy, setSortBy] = useState({ key: 'title', dir: 'asc' });
  const [bulkBusy, setBulkBusy] = useState(false);
  const csvRef = useRef(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = {};
      if (search.trim()) params.q = search.trim();
      if (category !== 'All') params.category = category;
      if (stockFilter === 'Available') params.availability = 'in_stock';
      if (stockFilter === 'Out') params.availability = 'out';
      if (stockFilter === 'Low') params.availability = 'low';
      const res = await api.get('/books', { params });
      setBooks(res.data?.data || []);
    } catch (e) {
      setLoadError(e.response?.data?.message || 'Failed to load books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, stockFilter]);

  useEffect(() => {
    const t = setTimeout(loadBooks, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadBooks, search, category, stockFilter]);

  const stats = useMemo(() => ({
    total: books.length,
    totalCopies: books.reduce((s, b) => s + (Number(b.quantity) || 0), 0),
    available: books.reduce((s, b) => s + (Number(b.available_quantity) || 0), 0),
    borrowed: books.reduce((s, b) => s + ((Number(b.quantity) || 0) - (Number(b.available_quantity) || 0)), 0),
    unavailable: books.filter((b) => (Number(b.available_quantity) || 0) === 0).length,
  }), [books]);

  const filtered = useMemo(() => {
    return [...books].sort((a, b) => {
      const dir = sortBy.dir === 'asc' ? 1 : -1;
      if (sortBy.key === 'title') return a.title.localeCompare(b.title) * dir;
      if (sortBy.key === 'available') return ((a.available_quantity || 0) - (b.available_quantity || 0)) * dir;
      if (sortBy.key === 'quantity') return ((a.quantity || 0) - (b.quantity || 0)) * dir;
      return (a.author || '').localeCompare(b.author || '') * dir;
    });
  }, [books, sortBy]);

  const toggleSort = (k) => setSortBy((p) => ({ key: k, dir: p.key === k ? (p.dir === 'asc' ? 'desc' : 'asc') : 'asc' }));
  const sortBadge = (k) => sortBy.key === k ? <span className="ml-1 text-[9px] font-semibold">{sortBy.dir === 'asc' ? '↑' : '↓'}</span> : null;

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
      { k: 'id', label: 'ID', w: 40 },
      { k: 'title', label: 'Title', w: 170 },
      { k: 'author', label: 'Author', w: 120 },
      { k: 'category', label: 'Category', w: 72 },
      { k: 'isbn', label: 'ISBN', w: 90 },
      { k: 'quantity', label: 'Copies', w: 44 },
      { k: 'available_quantity', label: 'Avail.', w: 44 },
      { k: 'shelf_location', label: 'Shelf', w: 44 },
    ];
    let y = 96;
    let x = 40;
    doc.setFillColor(241, 245, 249);
    doc.rect(40, y - 12, W - 80, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    cols.forEach((c) => { doc.text(c.label, x, y); x += c.w; });
    y += 18;
    doc.setFont('helvetica', 'normal');
    filtered.forEach((r) => {
      if (y > 520) { doc.addPage(); y = 40; }
      x = 40;
      cols.forEach((c) => { doc.text(String(r[c.k] ?? '').substring(0, 28), x, y); x += c.w; });
      y += 15;
    });
    doc.save('book-catalogue.pdf');
  };

  const downloadCsvTemplate = () => {
    const header = 'title,isbn,author,category,quantity,shelf_location,condition,publisher,year,edition,language,description';
    const row = 'Sample Book,978-0000000001,Author Name,Fiction,5,A1,Good,Publisher,2024,1st,English,';
    const blob = new Blob([`${header}\n${row}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'library-books-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onBulkCsv = async (file) => {
    if (!file) return;
    setBulkBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/books/bulk-csv', fd, formDataAxiosConfig);
      const { inserted, errors, message } = res.data || {};
      window.alert(`${message || 'Done'}\n${errors?.length ? `Issues: ${errors.length} row(s)` : ''}`);
      await loadBooks();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Import failed');
    } finally {
      setBulkBusy(false);
      if (csvRef.current) csvRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm?.id) return;
    try {
      await api.delete(`/books/${deleteConfirm.id}`);
      setDeleteConfirm(null);
      await loadBooks();
    } catch (e) {
      window.alert(e.response?.data?.message || 'Delete failed');
    }
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
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10]">Library Catalogue</p>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              Book Collection
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              Live API · Barcode/QR · Bulk CSV
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 -mt-12 sm:-mt-16 relative z-20 pb-16 sm:pb-20">
        <div className="bg-white rounded-t-[28px] sm:rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[480px]">

          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Total Titles', value: stats.total, icon: <BookOpen size={14} className="text-blue-500" /> },
                { label: 'Total Copies', value: stats.totalCopies, icon: <Activity size={14} className="text-[#1E3A5F]" /> },
                { label: 'Available Now', value: stats.available, icon: <CheckCircle size={14} className="text-emerald-500" /> },
                { label: 'Currently Out', value: stats.borrowed, icon: <AlertTriangle size={14} className="text-amber-500" /> },
              ].map((stat, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all">
                  <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{stat.icon}</div>
                  <span className="text-lg sm:text-2xl font-semibold text-re-text tracking-tighter group-hover:text-[#1E3A5F] transition-colors">{stat.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-4 sm:p-6 justify-center gap-2 sm:gap-3">
              <button type="button" onClick={exportPDF}
                className="w-full h-10 sm:h-11 flex items-center justify-center gap-2 text-white rounded-xl font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}>
                <Printer size={14} /><span>Print catalogue</span>
              </button>
              <button type="button" onClick={() => setModal({})}
                className="w-full h-10 sm:h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 transition-all group">
                <Plus size={14} className="text-amber-500 group-hover:rotate-90 transition-transform duration-300" />
                <span className="group-hover:text-[#1E3A5F] transition-colors">Add book</span>
              </button>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={downloadCsvTemplate}
                  className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-black/5 text-[8px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:bg-white">
                  <Download size={12} /> Template
                </button>
                <label className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#1E3A5F]/30 text-[8px] font-semibold uppercase tracking-widest text-[#1E3A5F] cursor-pointer hover:bg-white">
                  <Upload size={12} /> {bulkBusy ? '…' : 'CSV'}
                  <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" disabled={bulkBusy}
                    onChange={(e) => onBulkCsv(e.target.files?.[0])} />
                </label>
              </div>
            </div>
          </div>

          {loadError && (
            <div className="px-4 py-2 bg-red-50 text-red-700 text-[11px] font-bold border-b border-red-100">{loadError}</div>
          )}

          <div className="flex flex-col sm:flex-row flex-wrap px-3 py-3 border-b border-black/5 gap-2 bg-re-bg/20">
            <div className="relative w-full sm:w-[8rem] shrink-0">
              <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 z-[1] pointer-events-none" />
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 sm:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 text-[#1E3A5F] text-[9px] font-semibold uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] cursor-pointer appearance-none pl-8 pr-6">
                {CATEGORIES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="relative w-full sm:w-[8rem] shrink-0">
              <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}
                className="w-full h-9 sm:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 text-[#1E3A5F] text-[9px] font-semibold uppercase tracking-widest shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] cursor-pointer appearance-none pl-3 pr-6">
                {['All', 'Available', 'Out', 'Low'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px] group">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
              <input type="text" placeholder="Search title, author, ISBN…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 sm:h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 text-[#1E3A5F] text-[9px] font-semibold uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06)] placeholder:text-[#1E3A5F]/30 pl-8" />
            </div>
            <button type="button" onClick={loadBooks} className="h-9 sm:h-8 w-full sm:w-9 flex items-center justify-center bg-white border border-black/5 rounded-lg hover:bg-re-bg transition-all shadow-sm shrink-0">
              <RefreshCw size={12} className={`text-[#1E3A5F] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto bg-white flex-1 min-h-[320px] sm:min-h-[400px] -mx-0">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-re-bg/20 border-b border-black/5">
                  <th onClick={() => toggleSort('title')} className="px-3 sm:px-6 py-2.5 sm:py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer">Book {sortBadge('title')}</th>
                  <th className="hidden md:table-cell px-6 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Category</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">ISBN</th>
                  <th onClick={() => toggleSort('quantity')} className="hidden md:table-cell px-6 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer text-right">Copies {sortBadge('quantity')}</th>
                  <th onClick={() => toggleSort('available')} className="px-3 sm:px-6 py-2.5 sm:py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5 cursor-pointer text-right">Avail. {sortBadge('available')}</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Shelf</th>
                  <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] opacity-40">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors group">
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-black/5 bg-slate-100 flex items-center justify-center shadow-inner shrink-0 text-[#1E3A5F]">
                          <BookOpen size={14} className="opacity-60 sm:w-[15px] sm:h-[15px]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] sm:text-[13px] font-semibold text-[#1E3A5F] tracking-tight truncate">{b.title}</p>
                          <p className="text-[7px] sm:text-[8px] font-bold text-re-text-muted uppercase tracking-widest opacity-50 mt-0.5 truncate">{b.author} · #{b.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5">
                      <span className="bg-re-bg px-2 py-0.5 rounded-lg border border-black/5 text-[10px] font-semibold text-[#1E3A5F]">{b.category}</span>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 border-r border-black/5 font-mono text-[10px] font-bold text-slate-600">{b.isbn}</td>
                    <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-right font-semibold text-[#1E3A5F] text-[11px]">{b.quantity}</td>
                    <td className="px-3 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right">
                      <span className={`text-[12px] sm:text-[13px] font-semibold ${(b.available_quantity || 0) === 0 ? 'text-red-500' : (b.available_quantity || 0) < 3 ? 'text-amber-500' : 'text-emerald-600'}`}>{b.available_quantity}</span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 border-r border-black/5 font-semibold text-[#1E3A5F] text-[10px]">
                      <span className="bg-re-bg px-2 py-0.5 rounded-lg border border-black/5">{b.shelf_location}</span>
                    </td>
                    <td className="px-2 sm:px-6 py-2.5 sm:py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button type="button" title="QR" onClick={(e) => { e.stopPropagation(); setQrBook(b.id); }}
                          className="h-7 w-7 sm:h-7 sm:px-2 rounded-xl flex items-center justify-center bg-white border border-black/5 text-[#1E3A5F] shadow-sm hover:bg-re-bg">
                          <QrCode size={12} />
                        </button>
                        <button type="button" title="ISBN" onClick={(e) => { e.stopPropagation(); window.alert(`ISBN / barcode value:\n${b.isbn}`); }}
                          className="h-7 w-7 rounded-xl flex items-center justify-center bg-white border border-black/5 text-slate-500 hover:text-[#1E3A5F] shadow-sm">
                          <Hash size={12} />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setModal(b); }} className="h-7 px-2 sm:px-3 rounded-xl flex items-center gap-1 bg-white border border-black/5 text-[#1E3A5F] font-semibold text-[8px] sm:text-[9px] uppercase tracking-widest shadow-sm hover:bg-re-bg">
                          <Edit2 size={11} className="text-amber-500" /><span className="hidden xs:inline">Edit</span>
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(b); }} className="h-7 w-7 rounded-xl flex items-center justify-center bg-white border border-black/5 text-slate-300 hover:text-red-500 hover:bg-red-50 shadow-sm">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-[10px] font-semibold text-re-text-muted uppercase tracking-widest opacity-50">No books found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row px-4 sm:px-8 py-4 bg-slate-50/50 border-t border-black/5 items-start sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest italic opacity-60">Catalogue</p>
              </div>
              <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.2em] opacity-40 italic">{filtered.length} titles · {stats.available} copies available</p>
            </div>
          </div>
        </div>
      </div>

      {modal !== null && (
        <BookModal
          book={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={loadBooks}
        />
      )}
      {qrBook && <QrModal bookId={qrBook} onClose={() => setQrBook(null)} />}
      {deleteConfirm && createPortal(
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-red-500" /></div>
            <h3 className="font-semibold text-[#1E3A5F] mb-2">Remove &quot;{deleteConfirm.title}&quot;?</h3>
            <p className="text-[11px] font-bold text-slate-400 mb-6">This cannot be undone. Active loans block deletion.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-black/5 font-semibold text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-[10px] uppercase hover:bg-red-600">Remove</button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

export default Books;
