import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, BookMarked, RotateCcw, Users, TrendingUp, ArrowRight, AlertTriangle } from 'lucide-react';

const GENRE_STATS = [
  { genre: 'Science',     titles: 4, copies: 113, borrowed: 9 },
  { genre: 'Mathematics', titles: 1, copies: 38,  borrowed: 4 },
  { genre: 'Language',    titles: 2, copies: 56,  borrowed: 4 },
  { genre: 'Fiction',     titles: 2, copies: 10,  borrowed: 3 },
  { genre: 'History',     titles: 1, copies: 5,   borrowed: 1 },
  { genre: 'Non-Fiction', titles: 1, copies: 3,   borrowed: 0 },
  { genre: 'Religion',    titles: 1, copies: 20,  borrowed: 0 },
];

const MONTHLY = [
  { month: 'Jan', issued: 12, returned: 10 },
  { month: 'Feb', issued: 18, returned: 16 },
  { month: 'Mar', issued: 15, returned: 13 },
  { month: 'Apr', issued: 9,  returned: 6 },
];

const MAX_BAR = Math.max(...MONTHLY.map(m => Math.max(m.issued, m.returned)));

export default function Reports() {
  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="relative w-full min-h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]" />
        <img src="/teacher.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
          <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl group">
            <BarChart2 size={40} style={{ color: '#FEBF10' }} className="group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2"><span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }} /><p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>Library</p></div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none uppercase">Library <span style={{ color: '#FEBF10' }}>Reports</span></h1>
            <p className="text-[10px] font-bold text-white/40 max-w-lg uppercase tracking-widest italic opacity-60">Usage analytics · Genre breakdown · Circulation trends</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden">

          {/* Stats header */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5 border-b border-black/5">
            {[
              { label: 'Loans this month',    value: 9,  icon: <BookMarked size={14} className="text-blue-500" /> },
              { label: 'Returns this month',  value: 6,  icon: <RotateCcw size={14} className="text-emerald-500" /> },
              { label: 'Overdue currently',   value: 4,  icon: <AlertTriangle size={14} className="text-red-500" /> },
              { label: 'Active members',      value: 12, icon: <Users size={14} className="text-amber-500" /> },
            ].map((s, i) => (
              <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                <div className="mb-1.5 sm:mb-2 opacity-40 shrink-0">{s.icon}</div>
                <span className="text-sm sm:text-2xl font-black text-re-text tracking-tighter group-hover:text-[#1E3A5F]">{s.value}</span>
                <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-black/5">
            {/* Monthly bar chart */}
            <div className="p-8">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <TrendingUp size={13} className="text-amber-500" /> Monthly Circulation
              </h3>
              <div className="flex items-end gap-4 h-40 mb-4">
                {MONTHLY.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-1 justify-center" style={{ height: 120 }}>
                      <div className="flex-1 rounded-t-lg transition-all" style={{ height: `${Math.round((m.issued / MAX_BAR) * 100)}%`, background: 'linear-gradient(180deg,#1E3A5F,#3D5A80)', minHeight: 4 }} title={`Issued: ${m.issued}`} />
                      <div className="flex-1 rounded-t-lg transition-all" style={{ height: `${Math.round((m.returned / MAX_BAR) * 100)}%`, background: 'linear-gradient(180deg,#FEBF10,#FF8C00)', minHeight: 4 }} title={`Returned: ${m.returned}`} />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{m.month}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#1E3A5F' }} /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Issued</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm shrink-0" style={{ background: '#FEBF10' }} /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Returned</span></div>
              </div>
            </div>

            {/* Genre breakdown */}
            <div className="p-8">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <BarChart2 size={13} className="text-blue-500" /> By Genre
              </h3>
              <div className="space-y-3">
                {GENRE_STATS.map(g => {
                  const pct = Math.round((g.borrowed / Math.max(g.copies, 1)) * 100);
                  return (
                    <div key={g.genre}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-700">{g.genre}</span>
                        <div className="flex items-center gap-3 text-[9px] font-black text-slate-400">
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

          {/* Quick links footer */}
          <div className="border-t border-black/5 px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'View full catalogue', to: '/books', icon: BookMarked },
              { label: 'Active loans',        to: '/borrowing', icon: BookMarked },
              { label: 'Returns history',     to: '/returns', icon: RotateCcw },
              { label: 'Library members',     to: '/members', icon: Users },
            ].map(({ label, to, icon: Icon }) => (
              <Link key={to} to={to} className="flex items-center gap-2 group hover:text-[#1E3A5F] transition-colors">
                <div className="w-8 h-8 rounded-xl bg-re-bg border border-black/5 flex items-center justify-center shrink-0 group-hover:bg-[#1E3A5F] group-hover:text-white transition-all">
                  <Icon size={13} />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-[#1E3A5F]">{label}</span>
                <ArrowRight size={10} className="ml-auto text-slate-200 group-hover:text-[#1E3A5F]" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
