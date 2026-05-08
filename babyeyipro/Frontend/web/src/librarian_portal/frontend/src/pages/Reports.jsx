import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BarChart2, BookMarked, RotateCcw, Users, TrendingUp, ArrowRight, AlertTriangle, Printer, Layers, Download, Search,
} from 'lucide-react';
import api from '../services/api';
import { exportLibraryReportPdf } from '../utils/libraryPdf';
import * as XLSX from 'xlsx';

export default function Reports() {
  const location = useLocation();
  const view = useMemo(() => {
    const p = (location.pathname || '').toLowerCase();
    if (p.includes('/reports/circulation')) return 'circulation';
    if (p.includes('/reports/overdue') || p.includes('/reports/overdu')) return 'overdue';
    return 'overview';
  }, [location.pathname]);

  const [dash, setDash] = useState(null);
  const [books, setBooks] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [daily, setDaily] = useState(null);
  const [damaged, setDamaged] = useState([]);
  const [overdueRows, setOverdueRows] = useState([]);
  const [inventoryRows, setInventoryRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overdueTypeFilter, setOverdueTypeFilter] = useState('all');
  const [overdueTermFilter, setOverdueTermFilter] = useState('all');
  const [overdueYearFilter, setOverdueYearFilter] = useState('all');
  const [overdueSearch, setOverdueSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const [dRes, bRes, moRes, dmgRes, ovRes, invRes] = await Promise.all([
        api.get('/library/dashboard'),
        api.get('/books').catch(() => ({ data: { data: [] } })),
        api.get('/library/reports/monthly', { params: { year: y, month: m } }),
        api.get('/library/reports/condition').catch(() => ({ data: { data: [] } })),
        api.get('/library/reports/overdue').catch(() => ({ data: { data: [] } })),
        api.get('/library/reports/book-inventory').catch(() => ({ data: { data: [] } })),
      ]);
      setDash(dRes.data?.data || null);
      setBooks(bRes.data?.data || []);
      setMonthly(moRes.data || null);
      setDamaged(dmgRes.data?.data || []);
      setOverdueRows(ovRes.data?.data || []);
      setInventoryRows(invRes.data?.data || []);
    } catch {
      setDash(null);
      setBooks([]);
      setMonthly(null);
      setOverdueRows([]);
      setInventoryRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadDaily = useCallback(async () => {
    try {
      const res = await api.get('/library/reports/daily', { params: { date: dailyDate } });
      setDaily(res.data || null);
    } catch {
      setDaily(null);
    }
  }, [dailyDate]);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

  const genreStats = useMemo(() => {
    const map = {};
    (books || []).forEach((b) => {
      const g = b.category || 'Other';
      if (!map[g]) map[g] = { genre: g, titles: 0, copies: 0, borrowed: 0 };
      map[g].titles += 1;
      map[g].copies += Number(b.quantity) || 0;
      map[g].borrowed += (Number(b.quantity) || 0) - (Number(b.available_quantity) || 0);
    });
    return Object.values(map).sort((a, b) => b.copies - a.copies);
  }, [books]);

  const monthlyBars = useMemo(() => {
    const byDay = monthly?.borrowings_by_day || [];
    const days = byDay.map((r) => ({
      label: String(r.day || '').slice(8, 10) || '—',
      issued: Number(r.cnt) || 0,
      returned: 0,
    }));
    if (days.length > 0) {
      const max = Math.max(...days.map((d) => d.issued), 1);
      return { rows: days.slice(-12), max };
    }
    const summary = monthly?.summary || {};
    return {
      rows: [
        { label: 'Mo', issued: Number(summary.total_transactions) || 0, returned: Number(summary.returns_recorded) || 0 },
      ],
      max: Math.max(Number(summary.total_transactions) || 0, 1),
    };
  }, [monthly]);

  const loansThisMonth = Number(monthly?.summary?.total_transactions) || 0;
  const returnsThisMonth = Number(monthly?.summary?.returns_recorded) || 0;
  const overdue = dash?.overdue_loans ?? 0;
  const activeLoans = dash?.active_loans ?? 0;

  const computeTerm = (dateStr) => {
    const d = new Date(dateStr);
    const m = d.getMonth() + 1;
    if (m <= 4) return 'Term 1';
    if (m <= 8) return 'Term 2';
    return 'Term 3';
  };

  const computeAcademicYear = (dateStr) => {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const start = d.getMonth() + 1 >= 9 ? y : y - 1;
    return `${start}/${start + 1}`;
  };

  const overdueTermOptions = useMemo(() => {
    const set = new Set();
    overdueRows.forEach((r) => set.add(computeTerm(r.return_date || r.borrow_date || new Date().toISOString().slice(0, 10))));
    return Array.from(set);
  }, [overdueRows]);

  const overdueYearOptions = useMemo(() => {
    const set = new Set();
    overdueRows.forEach((r) => set.add(computeAcademicYear(r.return_date || r.borrow_date || new Date().toISOString().slice(0, 10))));
    return Array.from(set).sort().reverse();
  }, [overdueRows]);

  const filteredOverdueRows = useMemo(() => {
    const q = overdueSearch.trim().toLowerCase();
    return overdueRows.filter((r) => {
      const userTypeOk = overdueTypeFilter === 'all' || r.user_type === overdueTypeFilter;
      const term = computeTerm(r.return_date || r.borrow_date || new Date().toISOString().slice(0, 10));
      const termOk = overdueTermFilter === 'all' || overdueTermFilter === term;
      const year = computeAcademicYear(r.return_date || r.borrow_date || new Date().toISOString().slice(0, 10));
      const yearOk = overdueYearFilter === 'all' || overdueYearFilter === year;
      const queryOk = !q
        || (r.borrower_name || '').toLowerCase().includes(q)
        || (r.borrower_detail || '').toLowerCase().includes(q)
        || (r.book_title || '').toLowerCase().includes(q)
        || (r.book_isbn || '').toLowerCase().includes(q);
      return userTypeOk && termOk && yearOk && queryOk;
    });
  }, [overdueRows, overdueTypeFilter, overdueTermFilter, overdueYearFilter, overdueSearch]);

  const tabCls = ({ isActive }) =>
    `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest border transition-all ${isActive
      ? 'text-white border-transparent shadow-lg'
      : 'bg-white border-black/5 text-slate-500 hover:border-[#1E3A5F]/20'
    }`;

  const tabStyle = ({ isActive }) =>
    isActive ? { background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' } : {};

  const exportOverduePdf = () => {
    exportLibraryReportPdf({
      title: 'Overdue loans — past return date',
      subtitle: `Generated: ${new Date().toLocaleString()} · ${filteredOverdueRows.length} records`,
      fileName: 'library-overdue-report.pdf',
      columns: [
        { key: 'borrower_name', label: 'Borrower', w: 120 },
        { key: 'borrower_detail', label: 'Class / role', w: 90 },
        { key: 'book_title', label: 'Book', w: 150 },
        { key: 'borrow_date', label: 'Borrowed', w: 72 },
        { key: 'return_date', label: 'Due date', w: 72 },
        { key: 'days_past_due', label: 'Days late', w: 56 },
        {
          key: 'status',
          label: 'Status',
          w: 80,
          format: () => 'Overdue',
        },
      ],
      rows: filteredOverdueRows,
    });
  };

  const exportOverdueExcel = () => {
    const rows = filteredOverdueRows.map((r) => ({
      Borrower: r.borrower_name || '',
      Type: r.user_type === 'student' ? 'Student' : 'Staff',
      Details: r.borrower_detail || '',
      Book: r.book_title || '',
      ISBN: r.book_isbn || '',
      'Borrow Date': r.borrow_date || '',
      'Return Date': r.return_date || '',
      'Days Late': Number(r.days_past_due ?? 0),
      Status: 'Overdue',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Overdue');
    XLSX.writeFile(wb, 'library-overdue-report.xlsx');
  };

  const exportCirculationPdf = () => {
    exportLibraryReportPdf({
      title: 'Book circulation — stock, borrowed, returned',
      subtitle: `Generated: ${new Date().toLocaleString()} · ${inventoryRows.length} titles`,
      fileName: 'library-book-circulation.pdf',
      columns: [
        { key: 'title', label: 'Title', w: 160 },
        { key: 'isbn', label: 'ISBN', w: 90 },
        { key: 'total_copies', label: 'Quantity', w: 50 },
        { key: 'borrowed_qty', label: 'Borrowed', w: 56 },
        { key: 'returned_qty', label: 'Returned', w: 56 },
        { key: 'total_remain_in_stock', label: 'Remain', w: 52 },
        { key: 'on_loan_qty', label: 'Active out', w: 56 },
        { key: 'shelf_location', label: 'Shelf', w: 72 },
      ],
      rows: inventoryRows,
    });
  };

  const exportCirculationExcel = () => {
    const rows = inventoryRows.map((r) => ({
      Title: r.title || '',
      ISBN: r.isbn || '',
      Author: r.author || '',
      Category: r.category || '',
      Quantity: Number(r.total_copies ?? 0),
      Borrowed: Number(r.borrowed_qty ?? 0),
      Returned: Number(r.returned_qty ?? 0),
      'Remain In Stock': Number(r.total_remain_in_stock ?? r.in_library ?? 0),
      'Active Out': Number(r.on_loan_qty ?? 0),
      Shelf: r.shelf_location || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Book Stock');
    XLSX.writeFile(wb, 'library-book-stock-report.xlsx');
  };

  const exportOverviewSnippetPdf = () => {
    exportLibraryReportPdf({
      title: 'Library reports snapshot',
      subtitle: `Daily ${dailyDate} · Loans month: ${loansThisMonth} · Returns month: ${returnsThisMonth} · Overdue count: ${overdue}`,
      fileName: 'library-overview-snapshot.pdf',
      columns: [
        { key: 'k', label: 'Metric', w: 200 },
        { key: 'v', label: 'Value', w: 280 },
      ],
      rows: [
        { k: 'Loans this month', v: String(loansThisMonth) },
        { k: 'Returns this month', v: String(returnsThisMonth) },
        { k: 'Overdue (dashboard)', v: String(overdue) },
        { k: 'Active loan rows', v: String(activeLoans) },
        { k: 'Borrowed on selected day', v: String(daily?.borrowed?.length ?? 0) },
        { k: 'Returned on selected day', v: String(daily?.returned?.length ?? 0) },
      ],
    });
  };

  const subtitle =
    view === 'overdue'
      ? 'Loans past due date · filter by type, term, year · export PDF/Excel'
      : view === 'circulation'
        ? 'Per-title copies in library vs on loan · export PDF'
        : 'Daily · Monthly · Damaged books';

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
              Library Reports
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 -mt-12 sm:-mt-16 relative z-20 pb-16 sm:pb-20 space-y-4">
        <div className="bg-white rounded-[24px] sm:rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5 border-b border-black/5">
            {[
              { label: 'Loans this month', value: loansThisMonth, icon: <BookMarked size={14} className="text-blue-500" /> },
              { label: 'Returns this month', value: returnsThisMonth, icon: <RotateCcw size={14} className="text-emerald-500" /> },
              { label: 'Overdue currently', value: overdue, icon: <AlertTriangle size={14} className="text-red-500" /> },
              { label: 'Active loan rows', value: activeLoans, icon: <Users size={14} className="text-amber-500" /> },
            ].map((s, i) => (
              <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center">
                <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{s.icon}</div>
                <span className="text-lg sm:text-2xl font-semibold text-re-text">{loading ? '…' : s.value}</span>
                <p className="text-[6px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 p-4 sm:p-5 border-b border-black/5 bg-slate-50/80 items-center">
            <NavLink to="/librarian/reports" end className={tabCls} style={tabStyle}>
              <BarChart2 size={14} /> Overview
            </NavLink>
            <NavLink to="/librarian/reports/overdue" className={tabCls} style={tabStyle}>
              <AlertTriangle size={14} /> Overdue
            </NavLink>
            <NavLink to="/librarian/reports/circulation" className={tabCls} style={tabStyle}>
              <Layers size={14} /> Book stock
            </NavLink>
          </div>

          {view === 'overview' && (
            <>
              <div className="p-4 sm:p-6 border-b border-black/5 bg-re-bg/30 flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
                <div>
                  <label className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 block mb-1">Daily borrowing report</label>
                  <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className="h-10 px-3 rounded-xl border border-black/5 text-[12px] font-bold text-[#1E3A5F]" />
                </div>
                <div className="flex-1 text-[11px] font-bold text-slate-600">
                  Borrowed that day: <span className="text-[#1E3A5F]">{daily?.borrowed?.length ?? 0}</span>
                  {' · '}
                  Returned that day: <span className="text-emerald-600">{daily?.returned?.length ?? 0}</span>
                </div>
                <button
                  type="button"
                  onClick={exportOverviewSnippetPdf}
                  className="h-10 px-4 rounded-xl flex items-center gap-2 text-white font-semibold text-[9px] uppercase tracking-widest shadow-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
                >
                  <Printer size={14} /> PDF snapshot
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-black/5">
                <div className="p-6 sm:p-8">
                  <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <TrendingUp size={13} className="text-amber-500" /> Borrowing activity
                  </h3>
                  <div className="flex items-end gap-2 sm:gap-4 h-40 mb-4 overflow-x-auto pb-1">
                    {monthlyBars.rows.map((m) => (
                      <div key={m.label} className="flex-1 min-w-[36px] flex flex-col items-center gap-1">
                        <div className="w-full flex items-end gap-1 justify-center" style={{ height: 120 }}>
                          <div
                            className="flex-1 rounded-t-lg transition-all"
                            style={{
                              height: `${Math.round((m.issued / monthlyBars.max) * 100)}%`,
                              background: 'linear-gradient(180deg,#1E3A5F,#3D5A80)',
                              minHeight: m.issued ? 4 : 0,
                            }}
                            title={`Issued: ${m.issued}`}
                          />
                          {m.returned > 0 && (
                            <div
                              className="flex-1 rounded-t-lg transition-all"
                              style={{
                                height: `${Math.round((m.returned / monthlyBars.max) * 100)}%`,
                                background: 'linear-gradient(180deg,#FEBF10,#FF8C00)',
                                minHeight: 4,
                              }}
                              title={`Returned: ${m.returned}`}
                            />
                          )}
                        </div>
                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wider">{m.label}</p>
                      </div>
                    ))}
                    {monthlyBars.rows.length === 0 && !loading && (
                      <p className="text-[11px] font-bold text-slate-400 py-8 w-full text-center">No monthly data yet</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#1E3A5F' }} /><span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Issued</span></div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#FEBF10' }} /><span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Returned</span></div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <BarChart2 size={13} className="text-blue-500" /> By category
                  </h3>
                  <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                    {genreStats.length === 0 && !loading && (
                      <p className="text-[11px] font-bold text-slate-400">Add books to see categories.</p>
                    )}
                    {genreStats.map((g) => {
                      const pct = Math.round((g.borrowed / Math.max(g.copies, 1)) * 100);
                      return (
                        <div key={g.genre}>
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <span className="text-[10px] font-semibold text-slate-700 truncate">{g.genre}</span>
                            <div className="flex items-center gap-2 text-[9px] font-semibold text-slate-400 shrink-0">
                              <span>{g.titles} titles · {g.copies} copies</span>
                              <span className="text-[#1E3A5F]">{g.borrowed} out</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#1E3A5F,#3D5A80)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-black/5 px-4 sm:px-8 py-5">
                <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-red-500" /> Damaged books (condition = Damaged)
                </h3>
                {damaged.length === 0 ? (
                  <p className="text-[11px] font-bold text-slate-400">No damaged copies flagged in the catalogue.</p>
                ) : (
                  <ul className="space-y-2">
                    {damaged.map((b) => (
                      <li key={b.id} className="flex flex-wrap justify-between gap-2 text-[11px] font-bold text-slate-700 border-b border-black/5 pb-2 last:border-0">
                        <span className="truncate">{b.title}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{b.isbn}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {view === 'overdue' && (
            <div className="p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] uppercase tracking-tight">Overdue loans</h3>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                    Active loans whose return date is before today. {filteredOverdueRows.length} record(s).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportOverduePdf}
                    className="h-11 px-5 rounded-xl flex items-center justify-center gap-2 text-white font-semibold text-[9px] uppercase tracking-widest shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
                  >
                    <Printer size={14} /> Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={exportOverdueExcel}
                    className="h-11 px-5 rounded-xl flex items-center justify-center gap-2 bg-white border border-black/10 text-[#1E3A5F] font-semibold text-[9px] uppercase tracking-widest shadow-sm shrink-0"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
                <select
                  value={overdueTypeFilter}
                  onChange={(e) => setOverdueTypeFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-black/10 text-[11px] font-bold text-[#1E3A5F]"
                >
                  <option value="all">All borrowers</option>
                  <option value="student">Students only</option>
                  <option value="teacher">Staff only</option>
                </select>
                <select
                  value={overdueTermFilter}
                  onChange={(e) => setOverdueTermFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-black/10 text-[11px] font-bold text-[#1E3A5F]"
                >
                  <option value="all">All terms</option>
                  {overdueTermOptions.map((term) => <option key={term} value={term}>{term}</option>)}
                </select>
                <select
                  value={overdueYearFilter}
                  onChange={(e) => setOverdueYearFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-black/10 text-[11px] font-bold text-[#1E3A5F]"
                >
                  <option value="all">All academic years</option>
                  {overdueYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={overdueSearch}
                    onChange={(e) => setOverdueSearch(e.target.value)}
                    placeholder="Search borrower or book"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-black/10 text-[11px] font-bold text-[#1E3A5F]"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 overflow-hidden shadow-inner bg-slate-50/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[900px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#1E3A5F] to-[#3D5A80] text-white">
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest">Borrower</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest hidden md:table-cell">Borrower details</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest">Book</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right hidden sm:table-cell">Borrowed</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right">Due</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right">Days late</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white">
                      {filteredOverdueRows.map((r) => (
                        <tr key={r.id} className="hover:bg-amber-50/40">
                          <td className="px-4 py-3 text-[12px] font-semibold text-[#1E3A5F]">{r.borrower_name}</td>
                          <td className="px-4 py-3 text-[10px] font-bold text-slate-500 hidden md:table-cell">{r.borrower_detail} · {r.user_type === 'student' ? 'Student' : 'Staff'}</td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold text-slate-800">{r.book_title}</span>
                            <p className="text-[9px] font-mono text-slate-400">{r.book_isbn}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-[11px] font-bold hidden sm:table-cell">{r.borrow_date}</td>
                          <td className="px-4 py-3 text-right text-[11px] font-semibold text-red-600">{r.return_date}</td>
                          <td className="px-4 py-3 text-right text-[11px] font-semibold text-red-500">{r.days_past_due ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex px-2 py-0.5 rounded-lg text-[9px] font-semibold uppercase bg-red-100 text-red-700 border border-red-200">Overdue</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!loading && filteredOverdueRows.length === 0 && (
                  <p className="text-center py-12 text-[11px] font-bold text-slate-400">No overdue loans. Great work.</p>
                )}
              </div>
            </div>
          )}

          {view === 'circulation' && (
            <div className="p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-[#1E3A5F] uppercase tracking-tight">Book circulation</h3>
                  <p className="text-[11px] font-bold text-slate-500 mt-1">
                    All books with quantity, borrowed, returned, and remaining in stock.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportCirculationPdf}
                    className="h-11 px-5 rounded-xl flex items-center justify-center gap-2 text-white font-semibold text-[9px] uppercase tracking-widest shadow-lg shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#0D2644 100%)' }}
                  >
                    <Printer size={14} /> Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={exportCirculationExcel}
                    className="h-11 px-5 rounded-xl flex items-center justify-center gap-2 bg-white border border-black/10 text-[#1E3A5F] font-semibold text-[9px] uppercase tracking-widest shadow-sm shrink-0"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 overflow-hidden shadow-inner bg-slate-50/50">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[1100px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#1E3A5F] to-[#3D5A80] text-white">
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest">Title</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest hidden md:table-cell">ISBN</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right">Quantity</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right">Borrowed</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right">Returned</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right">Remain</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest text-right">Active out</th>
                        <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-widest hidden lg:table-cell">Shelf</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white">
                      {inventoryRows.map((r) => (
                        <tr key={r.id} className="hover:bg-emerald-50/30">
                          <td className="px-4 py-3">
                            <span className="text-[12px] font-semibold text-[#1E3A5F]">{r.title}</span>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{r.author || '—'} · {r.category || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-[10px] font-mono text-slate-500 hidden md:table-cell">{r.isbn || '—'}</td>
                          <td className="px-4 py-3 text-right text-[11px] font-semibold">{r.total_copies}</td>
                          <td className="px-4 py-3 text-right text-[11px] font-semibold text-amber-600">{r.borrowed_qty ?? 0}</td>
                          <td className="px-4 py-3 text-right text-[11px] font-semibold text-blue-600">{r.returned_qty ?? 0}</td>
                          <td className="px-4 py-3 text-right text-[11px] font-semibold text-emerald-600">{r.total_remain_in_stock ?? r.in_library}</td>
                          <td className="px-4 py-3 text-right text-[11px] font-semibold text-orange-600">{r.on_loan_qty}</td>
                          <td className="px-4 py-3 text-[10px] font-bold text-slate-500 hidden lg:table-cell">{r.shelf_location || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!loading && inventoryRows.length === 0 && (
                  <p className="text-center py-12 text-[11px] font-bold text-slate-400">No books in the catalogue yet.</p>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-black/5 px-4 sm:px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'View full catalogue', to: '/librarian/books', icon: BookMarked },
              { label: 'Active loans', to: '/librarian/borrowing', icon: BookMarked },
              { label: 'Returns history', to: '/librarian/returns', icon: RotateCcw },
            ].map(({ label, to, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-2 group hover:text-[#1E3A5F] transition-colors">
                <div className="w-8 h-8 rounded-xl bg-re-bg border border-black/5 flex items-center justify-center shrink-0 group-hover:bg-[#1E3A5F] group-hover:text-white transition-all">
                  <Icon size={13} />
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest group-hover:text-[#1E3A5F]">{label}</span>
                <ArrowRight size={10} className="ml-auto text-slate-200 group-hover:text-[#1E3A5F]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
