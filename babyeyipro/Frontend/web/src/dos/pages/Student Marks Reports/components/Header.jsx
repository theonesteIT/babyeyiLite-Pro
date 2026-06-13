import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { marksReportsPageKey } from '../utils/paths';
import { PAGE_TITLES } from '../navConfig';
import { useAuth } from '../../../context/AuthContext';
import { fetchAcademicCalendar } from '../services/marksAcademicApi';
import { currentAcademicYear, termsForYear, normalizeAcademicRegistry } from '../utils/academicRegistry';

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const { teacher } = useAuth();
  const key = marksReportsPageKey(location.pathname);
  const title = PAGE_TITLES[key] || 'Student Marks & Reports';
  const [termLabel, setTermLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAcademicCalendar();
        if (cancelled) return;
        const registry = normalizeAcademicRegistry(res?.data?.academic_years_registry);
        const year = currentAcademicYear(registry) || res?.data?.current_academic_year || '';
        const terms = termsForYear(registry, year);
        const term = terms[0] || res?.data?.active_terms?.[0] || 'Term 1';
        setTermLabel(year ? `${term} · ${year}` : '');
      } catch {
        if (!cancelled) setTermLabel('');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const initials = teacher
    ? `${(teacher.first_name || '')[0] || ''}${(teacher.last_name || '')[0] || ''}`.toUpperCase()
    : '?';

  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 bg-white/90 backdrop-blur-xl border-b border-black/5 sticky top-0 z-20 gap-3 shrink-0">
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 text-re-text-muted hover:bg-re-navy/5 hover:text-re-navy rounded-xl transition-all"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-[#000435] tracking-tight truncate">{title}</h1>
          <p className="text-[10px] font-medium text-slate-500 truncate">
            {termLabel ? `${termLabel} · Academic performance` : 'Academic performance'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all" aria-label="Alerts">
          <Bell size={17} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 border border-white rounded-full" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-amber-100 ring-1 ring-amber-200 flex items-center justify-center text-[11px] font-semibold text-[#000435]">
          {initials}
        </div>
      </div>
    </header>
  );
}
