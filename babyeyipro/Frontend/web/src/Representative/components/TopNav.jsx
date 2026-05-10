import { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User, Building2, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRepresentativeData } from '../context/RepresentativeContext';
import { h } from '../utils/href';

export default function RepresentativeTopNav({ title, onMenuClick }) {
  const navigate = useNavigate();
  const { manager, logout } = useAuth();
  const { schools, activeSchool, activeSchoolId, setActiveSchoolId } = useRepresentativeData();
  const [userOpen, setUserOpen] = useState(false);
  const [netOpen, setNetOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const userRef = useRef(null);
  const netRef = useRef(null);

  const networkLabel = activeSchool
    ? activeSchool.school_name
    : schools.length
      ? `All schools (${schools.length})`
      : 'All schools';

  const filteredSchools = schools.filter((s) => {
    if (!schoolFilter.trim()) return true;
    const q = schoolFilter.trim().toLowerCase();
    return (
      String(s.school_name || '').toLowerCase().includes(q) ||
      String(s.school_code || '').toLowerCase().includes(q) ||
      String(s.district || '').toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (netRef.current && !netRef.current.contains(e.target)) setNetOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = manager
    ? `${(manager.first_name || '')[0] || ''}${(manager.last_name || '')[0] || ''}`.toUpperCase()
    : '?';

  return (
    <header className="relative h-14 sm:h-[3.75rem] flex items-center gap-3 sm:gap-4 px-3 sm:px-5 md:px-7 bg-white border-b border-slate-200/90 shadow-[0_1px_0_rgba(15,23,42,0.06)] sticky top-0 z-20 font-sans transition-all duration-300">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-[#000435] text-amber-400 shadow-sm border border-amber-400/25 hover:bg-[#00052a] active:scale-[0.97] transition-all lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={2.25} />
        </button>
        <h1 className="text-[15px] sm:text-base font-bold text-[#000435] tracking-tight truncate">{title || 'Dashboard'}</h1>
      </div>

      <div className="hidden md:flex shrink-0 relative" ref={netRef}>
        <button
          type="button"
          onClick={() => setNetOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl border border-black/10 bg-slate-50/90 px-3 py-2 text-left hover:bg-white hover:border-amber-400/35 transition-all max-w-[260px] lg:max-w-[320px]"
          aria-expanded={netOpen}
          aria-haspopup="listbox"
        >
          <Building2 size={16} className="text-amber-600 shrink-0" strokeWidth={1.75} />
          <span className="text-[11px] font-bold text-[#000435] truncate uppercase tracking-tight">{networkLabel}</span>
          <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${netOpen ? 'rotate-180' : ''}`} />
        </button>
        {netOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 w-[min(92vw,340px)] rounded-2xl border border-black/10 bg-white shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <input
                type="search"
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                placeholder="Filter schools…"
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-amber-400/50"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSchoolId(null);
                setNetOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-tight border-b border-slate-100 hover:bg-amber-50 ${
                !activeSchoolId ? 'text-amber-700 bg-amber-50/80' : 'text-[#000435]'
              }`}
            >
              All schools ({schools.length})
            </button>
            <div className="max-h-[260px] overflow-y-auto">
              {filteredSchools.length === 0 ? (
                <p className="px-4 py-3 text-[11px] text-slate-500">
                  {schools.length === 0
                    ? 'No schools assigned yet. Ask your Super Admin.'
                    : 'No schools match this search.'}
                </p>
              ) : (
                filteredSchools.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActiveSchoolId(s.id);
                      setNetOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 hover:bg-amber-50 flex items-center gap-2 ${
                      Number(activeSchoolId) === Number(s.id) ? 'bg-amber-50/80' : ''
                    }`}
                  >
                    <Building2 size={14} className="text-amber-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#000435] truncate uppercase tracking-tight">
                        {s.school_name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {s.school_code || '—'}
                        {s.district ? ` · ${s.district}` : ''}
                      </p>
                    </div>
                    {s.is_primary ? <Star size={12} className="text-amber-500 shrink-0" /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex justify-center max-md:hidden">
        <div className="relative w-full max-w-2xl group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-[#000435] transition-colors">
            <Search size={18} strokeWidth={2} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200/90 rounded-full py-2.5 pl-11 pr-4 text-[13px] font-medium outline-none shadow-inner focus:bg-white focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 transition-all text-[#000435] placeholder:text-slate-400"
            placeholder="Search schools, students, fees, alerts…"
          />
        </div>
      </div>

      <div className="md:hidden flex-1 flex justify-end min-w-0">
        <div className="relative w-full max-w-[140px] group">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-2 text-xs font-medium outline-none focus:border-amber-400/40 text-[#000435] placeholder:text-slate-400"
            placeholder="Search…"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          type="button"
          className="relative p-2.5 text-slate-500 hover:bg-slate-100 hover:text-[#000435] rounded-xl transition-all"
          aria-label="Notifications"
        >
          <Bell size={20} strokeWidth={1.75} />
          <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-[#000435] border-2 border-white">
            5
          </span>
        </button>

        <div className="hidden sm:block h-8 w-px bg-slate-200" />

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 sm:gap-2.5 hover:bg-slate-50 rounded-xl px-1.5 sm:px-2 py-1.5 transition-all group"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-[#000435] text-amber-400 flex items-center justify-center font-semibold text-xs border-2 border-amber-400/40 shadow-md transition-transform">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="hidden sm:block text-left max-w-[160px] md:max-w-[220px]">
              <p className="text-xs font-medium text-[#000435] leading-tight uppercase tracking-tight truncate">
                {manager?.first_name || 'Representative'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium leading-tight uppercase tracking-wide truncate">
                {networkLabel}
              </p>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 hidden sm:block transition-transform shrink-0 ${userOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {userOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-2xl shadow-sm border border-black/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-black/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl text-[#000435] flex items-center justify-center font-medium text-sm shadow-sm border border-amber-400/40 shrink-0 bg-amber-400">
                    {initials}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#000435] uppercase tracking-tight">
                      {manager?.first_name} {manager?.last_name}
                    </p>
                    <p className="text-[10px] text-re-text-muted/70 truncate max-w-[120px]">{manager?.email}</p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    navigate(h('/settings'));
                    setUserOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-re-text-muted hover:bg-amber-50 hover:text-[#000435] transition-all"
                >
                  <User size={13} /> Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate(h('/settings'));
                    setUserOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-re-text-muted hover:bg-amber-50 hover:text-[#000435] transition-all"
                >
                  <Settings size={13} /> Settings
                </button>
              </div>

              <div className="border-t border-black/5 py-1">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
