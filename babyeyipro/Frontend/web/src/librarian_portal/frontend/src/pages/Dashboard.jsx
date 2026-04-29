import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, BookMarked, RotateCcw, Users, AlertTriangle,
  ArrowRight, TrendingUp, Activity, CheckCircle, MessageSquare,
} from 'lucide-react';

// ── Inline mock snapshots ────────────────────────────────────
const TOTAL_TITLES = 12;
const TOTAL_COPIES = 239;
const AVAILABLE = 182;
const ACTIVE_LOANS = 8;
const OVERDUE = 4;
const TOTAL_MEMBERS = 12;

const RECENT_LOANS = [
  { id: 'LN006', book: 'Physics S6',          borrower: 'Mukamana Diane',    class: 'S6 PCM', due: '2025-04-24', overdue: false },
  { id: 'LN007', book: 'A Long Way Gone',      borrower: 'Ms. Umubyeyi Claire', class: 'Staff', due: '2025-04-23', overdue: false },
  { id: 'LN002', book: 'Mathematics S5',       borrower: 'Niyonkuru Alice',   class: 'S5 MCE', due: '2025-04-19', overdue: false },
  { id: 'LN001', book: 'Biology Form 4',       borrower: 'Uwimana Jean',      class: 'S4 PCB', due: '2025-04-15', overdue: true },
  { id: 'LN005', book: 'Chemistry S4',         borrower: 'Nkurunziza Patrick', class: 'S4 PCB', due: '2025-04-16', overdue: true },
  { id: 'LN003', book: 'Things Fall Apart',    borrower: 'Mr. Habimana Eric', class: 'Staff',  due: '2025-04-11', overdue: true },
];

const TOP_BOOKS = [
  { title: 'Biology Form 4',         borrows: 5 },
  { title: 'Mathematics S5',         borrows: 4 },
  { title: 'Chemistry S4',           borrows: 4 },
  { title: 'English Grammar In Use', borrows: 3 },
  { title: 'Physics S6',             borrows: 3 },
];

const StatCard = ({ icon: Icon, label, value, accent, to }) => (
  <div className="bg-white border border-black/5 rounded-[24px] shadow-2xl p-5 flex flex-col gap-3 hover:bg-re-bg/20 transition-all group">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${accent}18` }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      {to && <Link to={to} className="text-[9px] font-black uppercase tracking-widest text-re-text-muted/40 group-hover:text-[#1E3A5F] flex items-center gap-1 transition-colors">View <ArrowRight size={10} /></Link>}
    </div>
    <div>
      <p className="text-2xl font-black text-re-text tracking-tighter leading-none">{value}</p>
      <p className="text-[9px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-1 opacity-60">{label}</p>
    </div>
  </div>
);

export default function Dashboard() {
  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* Hero banner */}
      <div className="relative w-full min-h-[260px] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]" />
        <img src={import.meta.env.BASE_URL + "teacher.jpg"} alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10" />
        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-14 pb-24 flex items-center gap-8">
          <div className="hidden md:flex shrink-0 w-20 h-20 rounded-[28px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl group">
            <BookOpen size={36} style={{ color: '#FEBF10' }} className="group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>School Library</p>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none uppercase">
              Library <span style={{ color: '#FEBF10' }}>Overview</span>
            </h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest italic opacity-60">Books · Borrowing · Members · Activity</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-20 relative z-20 pb-20 space-y-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={BookOpen}   label="Total Titles"   value={TOTAL_TITLES}  accent="#1E3A5F"  to="/books" />
          <StatCard icon={Activity}   label="Total Copies"   value={TOTAL_COPIES}  accent="#FEBF10"  to="/books" />
          <StatCard icon={BookMarked} label="Active Loans"   value={ACTIVE_LOANS}  accent="#3B82F6"  to="/borrowing" />
          <StatCard icon={AlertTriangle} label="Overdue"     value={OVERDUE}       accent="#ef4444"  to="/borrowing" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: availability + top books */}
          <div className="space-y-6">
            {/* Availability donut bar */}
            <div className="bg-white border border-black/5 rounded-[24px] shadow-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CheckCircle size={13} className="text-emerald-500" /> Stock Availability
                </h3>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Available',   value: AVAILABLE,                         color: '#10b981', pct: Math.round(AVAILABLE / TOTAL_COPIES * 100) },
                  { label: 'On loan',     value: ACTIVE_LOANS,                      color: '#3B82F6', pct: Math.round(ACTIVE_LOANS / TOTAL_COPIES * 100) },
                  { label: 'Unavailable', value: TOTAL_COPIES - AVAILABLE - ACTIVE_LOANS, color: '#e2e8f0', pct: Math.round((TOTAL_COPIES - AVAILABLE - ACTIVE_LOANS) / TOTAL_COPIES * 100) },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-[10px] font-black text-slate-600">{s.label}</span>
                      </div>
                      <span className="text-[10px] font-black text-slate-800">{s.value} <span className="text-slate-400 font-bold">({s.pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top books */}
            <div className="bg-white border border-black/5 rounded-[24px] shadow-2xl p-6">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <TrendingUp size={13} className="text-amber-500" /> Most borrowed
              </h3>
              <div className="space-y-3">
                {TOP_BOOKS.map((b, i) => (
                  <div key={b.title} className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-300 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-800 truncate">{b.title}</p>
                    </div>
                    <span className="text-[9px] font-black text-[#1E3A5F] bg-re-bg px-2 py-0.5 rounded-lg border border-black/5 shrink-0">{b.borrows}×</span>
                  </div>
                ))}
              </div>
              <Link to="/books" className="mt-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#1E3A5F] hover:gap-2.5 transition-all">
                Full catalogue <ArrowRight size={10} />
              </Link>
            </div>
          </div>

          {/* Right 2 cols: active loans table + quick actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active loans */}
            <div className="bg-white border border-black/5 rounded-[24px] shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-black/5 bg-re-bg/30 flex items-center justify-between">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <BookMarked size={13} className="text-blue-500" /> Recent / Active Loans
                </h3>
                <Link to="/borrowing" className="text-[9px] font-black text-[#1E3A5F] uppercase hover:underline">All loans</Link>
              </div>
              <div className="divide-y divide-black/5">
                {RECENT_LOANS.map(l => (
                  <div key={l.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-re-bg/60 transition-all group ${l.overdue ? 'border-l-4 border-red-400' : ''}`}>
                    <div className={`w-9 h-9 rounded-xl border border-black/5 flex items-center justify-center shrink-0 text-[#1E3A5F] font-black group-hover:bg-[#1E3A5F] group-hover:text-white transition-all ${l.overdue ? 'bg-red-50 border-red-100' : 'bg-slate-50'}`}>
                      <BookMarked size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-[11px] tracking-tight truncate">{l.book}</p>
                      <p className="text-[9px] text-re-text-muted font-bold uppercase tracking-widest mt-0.5">{l.borrower} · {l.class}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-[11px] font-black ${l.overdue ? 'text-red-500' : 'text-slate-600'}`}>Due {l.due}</p>
                      {l.overdue && <p className="text-[8px] font-black text-red-400 uppercase tracking-widest">Overdue</p>}
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/borrowing" className="block p-4 bg-slate-50/50 border-t border-black/5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-[#1E3A5F] transition-all">
                Manage all loans →
              </Link>
            </div>

            {/* Members + CTA row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-black/5 rounded-[24px] shadow-2xl p-6">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <Users size={13} className="text-[#1E3A5F]" /> Members
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Total members', value: TOTAL_MEMBERS, color: '#1E3A5F' },
                    { label: 'With books out', value: ACTIVE_LOANS, color: '#f59e0b' },
                    { label: 'Overdue borrowers', value: OVERDUE, color: '#ef4444' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-black/5 last:border-0">
                      <span className="text-[10px] font-bold text-slate-500">{s.label}</span>
                      <span className="text-[13px] font-black" style={{ color: s.color }}>{s.value}</span>
                    </div>
                  ))}
                </div>
                <Link to="/members" className="mt-4 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#1E3A5F] hover:gap-2.5 transition-all">
                  View members <ArrowRight size={10} />
                </Link>
              </div>

              {/* CTA */}
              <div className="relative rounded-[24px] p-6 text-white overflow-hidden group cursor-pointer active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#3D5A80 100%)' }}>
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                    <MessageSquare size={18} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-black text-xs tracking-widest uppercase" style={{ color: '#FEBF10' }}>Next action</h4>
                    <p className="text-[10px] text-white font-bold leading-snug mt-2 opacity-80">
                      {OVERDUE} books are overdue. Follow up with borrowers and process any returns at the desk.
                    </p>
                  </div>
                  <Link to="/borrowing" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest hover:gap-2.5 transition-all" style={{ color: '#FEBF10' }}>
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
