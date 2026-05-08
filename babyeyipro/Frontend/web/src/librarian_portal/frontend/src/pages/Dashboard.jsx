import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, BookMarked, RotateCcw, AlertTriangle,
  ArrowRight, TrendingUp, Activity, CheckCircle, MessageSquare,
  ChevronDown, Download, Printer, FileBarChart2, ShieldCheck,
} from 'lucide-react';
import api from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [recent, setRecent] = useState([]);
  const [heroDropdown, setHeroDropdown] = useState(null);

  const load = useCallback(async () => {
    try {
      const [dRes, bRes] = await Promise.all([
        api.get('/library/dashboard'),
        api.get('/borrowings', { params: { status: 'active' } }),
      ]);
      setDash(dRes.data?.data || null);
      const rows = bRes.data?.data || [];
      const sorted = [...rows].sort((a, b) => new Date(b.borrow_date) - new Date(a.borrow_date));
      setRecent(sorted.slice(0, 6));
    } catch {
      setDash(null);
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const TOTAL_TITLES = dash?.total_titles ?? 0;
  const TOTAL_COPIES = dash?.total_copies ?? 0;
  const AVAILABLE = dash?.available_copies ?? 0;
  const BORROWED_COPIES = dash?.borrowed_copies ?? 0;
  const ACTIVE_LOANS = dash?.active_loans ?? 0;
  const OVERDUE = dash?.overdue_loans ?? 0;
  const TOP_BOOKS = dash?.top_borrowed || [];
  const otherShelf = Math.max(0, TOTAL_COPIES - AVAILABLE - BORROWED_COPIES);

  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 100) : 0);

  const dashHeroStats = useMemo(() => ([
    {
      label: 'Total titles',
      value: TOTAL_TITLES,
      subValue: 'Library catalogue',
      icon: BookOpen,
      onClick: () => navigate('/librarian/books'),
    },
    {
      label: 'Total copies',
      value: TOTAL_COPIES,
      subValue: 'In inventory',
      icon: Activity,
      onClick: () => navigate('/librarian/books'),
    },
    {
      label: 'Active loans',
      value: ACTIVE_LOANS,
      subValue: 'Books out',
      icon: BookMarked,
      onClick: () => navigate('/librarian/borrowing'),
    },
    {
      label: 'Overdue loans',
      value: OVERDUE,
      subValue: OVERDUE > 0 ? 'Requires action' : 'All clear',
      icon: AlertTriangle,
      onClick: () => navigate('/librarian/borrowing'),
    },
  ]), [TOTAL_TITLES, TOTAL_COPIES, ACTIVE_LOANS, OVERDUE, navigate]);

  const quickActionItems = useMemo(() => ([
    { label: 'Issue book loan', path: '/librarian/borrowing' },
    { label: 'Process return', path: '/librarian/returns' },
    { label: 'Add new titles', path: '/librarian/books' },
    { label: 'Overdue report', path: '/librarian/reports/overdue' },
  ]), []);

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-full pb-24 lg:pb-10" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Hero (aligned with Manager portal pattern) */}
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              Librarian dashboard
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pt-2 relative z-20 mb-6 sm:mb-8">
        <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 xl:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/5">
              {dashHeroStats.map((stat) => (
                <button
                  key={stat.label}
                  type="button"
                  onClick={stat.onClick}
                  className="p-4 sm:p-5 flex flex-col items-center justify-center text-center group hover:bg-re-bg/40 transition-all cursor-pointer min-h-[7.5rem]"
                >
                  <div className="mb-1 sm:mb-1.5 opacity-40 shrink-0" style={{ color: '#FEBF10' }}>
                    <stat.icon size={12} className="mb-1.5 mx-auto" strokeWidth={2} aria-hidden />
                  </div>
                  <span className="text-sm sm:text-lg font-semibold text-re-text tabular-nums tracking-tight group-hover:text-[#1E3A5F] transition-colors leading-snug">
                    {stat.value}
                  </span>
                  <p className="text-[7px] sm:text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.12em] mt-0.5 opacity-65">
                    {stat.label}
                  </p>
                  {stat.subValue && (
                    <p className={`text-[6px] sm:text-[7px] font-semibold uppercase tracking-[0.14em] mt-1 opacity-80 max-w-[11rem] ${stat.label === 'Overdue loans' && OVERDUE > 0 ? 'text-rose-600' : 'text-[#1E3A5F]'}`}>
                      {stat.subValue}
                    </p>
                  )}
                </button>
              ))}
            </div>

            {/* Actions column */}
            <div className="hidden lg:flex flex-col border-t lg:border-t-0 lg:border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setHeroDropdown(heroDropdown === 'export' ? null : 'export')}
                  className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-medium text-[9px] uppercase tracking-widest border border-black/10 shadow-sm active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                >
                  <Download size={14} aria-hidden />
                  <span>Export records</span>
                  <ChevronDown size={12} className={`transition-transform duration-300 ${heroDropdown === 'export' ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                {heroDropdown === 'export' && (
                  <>
                    <button type="button" className="fixed inset-0 z-[40] cursor-default bg-transparent" aria-label="Dismiss" onClick={() => setHeroDropdown(null)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5"
                        onClick={() => {
                          window.print();
                          setHeroDropdown(null);
                        }}
                      >
                        <Printer size={14} style={{ color: '#FEBF10' }} aria-hidden /> Print overview
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors flex items-center gap-2.5 border-t border-black/5"
                        onClick={() => {
                          navigate('/librarian/reports');
                          setHeroDropdown(null);
                        }}
                      >
                        <FileBarChart2 size={14} style={{ color: '#FEBF10' }} aria-hidden /> Open library reports
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setHeroDropdown(heroDropdown === 'quick' ? null : 'quick');
                  }}
                  className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-medium text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg transition-all"
                >
                  <ShieldCheck size={14} style={{ color: '#FEBF10' }} aria-hidden />
                  <span>Quick actions</span>
                  <ChevronDown size={12} className={`transition-transform duration-300 ${heroDropdown === 'quick' ? 'rotate-180' : ''}`} aria-hidden />
                </button>
                {heroDropdown === 'quick' && (
                  <>
                    <button type="button" className="fixed inset-0 z-[40] cursor-default bg-transparent" aria-label="Dismiss" onClick={() => setHeroDropdown(null)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 shadow-md rounded-2xl overflow-hidden py-1 z-[50] animate-in slide-in-from-top-2 duration-200 max-h-[min(60vh,20rem)] overflow-y-auto">
                      {quickActionItems.map((item) => (
                        <button
                          key={item.path}
                          type="button"
                          className="w-full text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-re-text hover:bg-re-bg transition-colors border-t border-black/5 first:border-t-0"
                          onClick={() => {
                            navigate(item.path);
                            setHeroDropdown(null);
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: availability + top books */}
          <div className="space-y-6">
            {/* Availability donut bar */}
            <div className="bg-white border border-black/5 rounded-[24px] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckCircle size={13} className="text-emerald-500" /> Stock Availability
                </h3>
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Live</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Available', value: AVAILABLE, color: '#10b981', pct: pct(AVAILABLE, TOTAL_COPIES) },
                  { label: 'On loan', value: BORROWED_COPIES, color: '#1E3A5F', pct: pct(BORROWED_COPIES, TOTAL_COPIES) },
                  { label: 'Other / hold', value: otherShelf, color: '#e2e8f0', pct: pct(otherShelf, TOTAL_COPIES) },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-[10px] font-semibold text-slate-600">{s.label}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-800">{s.value} <span className="text-slate-400 font-bold">({s.pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top books */}
            <div className="bg-white border border-black/5 rounded-[24px] shadow-sm p-6">
              <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <TrendingUp size={13} className="text-amber-500" /> Most borrowed
              </h3>
              <div className="space-y-3">
                {TOP_BOOKS.length === 0 && (
                  <p className="text-[11px] font-bold text-slate-400 py-2">No borrowing history yet.</p>
                )}
                {TOP_BOOKS.slice(0, 8).map((b, i) => (
                  <div key={`${b.title}-${i}`} className="flex items-center gap-3">
                    <span className="text-[10px] font-semibold text-slate-300 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-800 truncate">{b.title}</p>
                    </div>
                    <span className="text-[9px] font-semibold text-[#1E3A5F] bg-re-bg px-2 py-0.5 rounded-lg border border-black/5 shrink-0">{b.borrow_count ?? 0}×</span>
                  </div>
                ))}
              </div>
              <Link to="/librarian/books" className="mt-4 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:gap-2.5 transition-all">
                Full catalogue <ArrowRight size={10} />
              </Link>
            </div>
          </div>

          {/* Right 2 cols: active loans table + quick actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active loans */}
            <div className="bg-white border border-black/5 rounded-[24px] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 bg-re-bg/30 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <BookMarked size={13} className="text-[#1E3A5F]" /> Recent / Active Loans
                </h3>
                <Link to="/librarian/borrowing" className="text-[9px] font-semibold text-[#1E3A5F] uppercase hover:underline">All loans</Link>
              </div>
              <div className="divide-y divide-black/5">
                {(recent.length ? recent : []).map((l) => (
                  <div key={l.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-re-bg/60 transition-all group ${l.overdue ? 'border-l-4 border-red-400' : ''}`}>
                    <div className={`w-9 h-9 rounded-xl border border-black/5 flex items-center justify-center shrink-0 text-[#1E3A5F] font-semibold group-hover:bg-[#1E3A5F] group-hover:text-white transition-all ${l.overdue ? 'bg-red-50 border-red-100' : 'bg-slate-50'}`}>
                      <BookMarked size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-[11px] tracking-tight truncate">{l.book_title}</p>
                      <p className="text-[9px] text-re-text-muted font-bold uppercase tracking-widest mt-0.5">{l.borrower_name} · {l.borrower_detail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[11px] font-semibold ${l.overdue ? 'text-red-500' : 'text-slate-600'}`}>Due {l.return_date}</p>
                      {l.overdue && <p className="text-[8px] font-semibold text-red-400 uppercase tracking-widest">Overdue</p>}
                    </div>
                  </div>
                ))}
                {recent.length === 0 && (
                  <p className="px-6 py-8 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-widest">No active loans</p>
                )}
              </div>
              <Link to="/librarian/borrowing" className="block p-4 bg-slate-50/50 border-t border-black/5 text-center text-[9px] font-semibold text-slate-400 uppercase tracking-widest hover:text-[#1E3A5F] transition-all">
                Manage all loans →
              </Link>
            </div>

            {/* Insights + CTA row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-black/5 rounded-[24px] shadow-sm p-6">
                <h3 className="text-[11px] font-semibold text-slate-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-[#1E3A5F]" /> Borrower insights
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Unique borrowers (est.)', value: ACTIVE_LOANS, color: '#1E3A5F' },
                    { label: 'Active loan rows', value: ACTIVE_LOANS, color: '#f59e0b' },
                    { label: 'Overdue loans', value: OVERDUE, color: '#ef4444' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-0">
                      <span className="text-[10px] font-bold text-slate-500">{s.label}</span>
                      <span className="text-[13px] font-semibold" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <Link to="/librarian/reports/overdue" className="mt-4 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-[#1E3A5F] hover:gap-2.5 transition-all">
                  Open overdue report <ArrowRight size={10} />
                </Link>
              </div>

              {/* CTA */}
              <div className="relative rounded-[24px] p-6 text-white overflow-hidden group cursor-pointer active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#3D5A80 100%)' }}>
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                    <MessageSquare size={18} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs tracking-widest uppercase" style={{ color: '#FEBF10' }}>Next action</h4>
                    <p className="text-[10px] text-white font-bold leading-snug mt-2 opacity-80">
                      {OVERDUE > 0
                        ? `${OVERDUE} loan(s) overdue. Follow up with borrowers and process returns at the desk.`
                        : 'No overdue loans right now. Great work keeping circulation on track.'}
                    </p>
                  </div>
                  <Link to="/librarian/borrowing" className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest hover:gap-2.5 transition-all" style={{ color: '#FEBF10' }}>
                    View overdue loans <ArrowRight size={12} />
                  </Link>
                </div>
                <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="absolute -top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

