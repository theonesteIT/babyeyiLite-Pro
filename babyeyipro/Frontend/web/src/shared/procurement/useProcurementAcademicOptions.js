import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE } from './procurementApi';

const STORAGE_KEY = 'babyeyi_procurement_academic_settings';

function inferCurrentTerm(activeTerms) {
  if (!activeTerms?.length) return 'Term 1';
  const m = new Date().getMonth();
  const n = activeTerms.length;
  const pos = m >= 8 ? m - 8 : m + 4;
  const idx = Math.min(Math.floor((pos / 12) * n), n - 1);
  return activeTerms[idx];
}

function buildYearList(currentYear, count = 5) {
  const [aStr] = String(currentYear || '').split('-');
  const a = Number(aStr);
  if (!a) return currentYear ? [currentYear] : [];
  return Array.from({ length: count }, (_, i) => `${a - i}-${a - i + 1}`);
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Loads academic year / term options for procurement date filters (all portals). */
export default function useProcurementAcademicOptions() {
  const cached = readCache();
  const [academicYear, setAcademicYear] = useState(cached?.academicYear || '');
  const [currentTerm, setCurrentTerm] = useState(cached?.currentTerm || '');
  const [activeTerms, setActiveTerms] = useState(cached?.activeTerms || ['Term 1', 'Term 2', 'Term 3']);
  const [academicYears, setAcademicYears] = useState(cached?.academicYears || []);
  const [termDates, setTermDates] = useState(cached?.termDates || []);
  const [academicYearsRegistry, setAcademicYearsRegistry] = useState(cached?.academicYearsRegistry || []);
  const [loading, setLoading] = useState(!cached);

  const apply = useCallback((data) => {
    const year = data.current_academic_year || '';
    const terms = Array.isArray(data.active_terms) && data.active_terms.length
      ? data.active_terms
      : ['Term 1', 'Term 2', 'Term 3'];
    const term = data.current_term || inferCurrentTerm(terms);
    const dates = Array.isArray(data.term_dates) ? data.term_dates : [];
    const registry = Array.isArray(data.academic_years_registry) ? data.academic_years_registry : [];
    const years = registry.length
      ? registry.map((r) => r.academic_year).filter(Boolean)
      : buildYearList(year || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, 6);

    setAcademicYear(year);
    setCurrentTerm(term);
    setActiveTerms(terms);
    setTermDates(dates);
    setAcademicYearsRegistry(registry);
    setAcademicYears(years.length ? years : buildYearList(year, 6));

    writeCache({
      academicYear: year,
      currentTerm: term,
      activeTerms: terms,
      termDates: dates,
      academicYearsRegistry: registry,
      academicYears: years.length ? years : buildYearList(year, 6),
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/dos/academic-calendar-settings');
      if (res.data?.success) {
        apply(res.data.data || {});
      } else {
        apply({});
      }
    } catch {
      if (!cached) apply({});
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => { refresh(); }, [refresh]);

  return useMemo(() => ({
    academicYear,
    currentTerm,
    activeTerms,
    academicYears,
    termDates,
    academicYearsRegistry,
    loading,
    refresh,
  }), [
    academicYear, currentTerm, activeTerms, academicYears,
    termDates, academicYearsRegistry, loading, refresh,
  ]);
}
