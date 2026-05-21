import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  buildClassCatalog,
  buildClassNameFromParts,
  collectAcademicYears,
  mapApiStudentToPromotion,
  studentMatchesClassFilter,
  DEFAULT_TERMS,
  isFinalYearPromotionStudent,
} from '../utils/promotionMappers';
import {
  applyPromotion,
  fetchAcademicCalendarSettings,
  fetchPromotionHistory,
  fetchProgressIndex,
  fetchRegistryStats,
  fetchSchoolClasses,
  fetchSchoolStudents,
} from '../services/studentPromotionService';

const StudentPromotionDataContext = createContext(null);

export function StudentPromotionDataProvider({ children }) {
  const { teacher } = useAuth();
  const schoolId = teacher?.school?.id || teacher?.school_id || null;
  const schoolName = teacher?.school?.name || teacher?.school?.school_name || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classRows, setClassRows] = useState([]);
  const [apiClassNameOptions, setApiClassNameOptions] = useState([]);
  const [rawStudents, setRawStudents] = useState([]);
  const [registryStats, setRegistryStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('Term 3');
  const [progressById, setProgressById] = useState({});
  const [academicYearsRegistry, setAcademicYearsRegistry] = useState([]);

  const catalog = useMemo(
    () => buildClassCatalog(classRows, apiClassNameOptions),
    [classRows, apiClassNameOptions]
  );

  const classNameOptions = useMemo(() => {
    const fromStats = (registryStats?.classes || []).map((c) => c.class_name).filter(Boolean);
    const merged = new Set([...catalog.fullLabels, ...fromStats]);
    return [...merged].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [catalog.fullLabels, registryStats]);

  const academicYears = useMemo(() => {
    if (academicYearsRegistry.length) {
      return academicYearsRegistry.map((r) => r.academic_year);
    }
    const fromStudents = collectAcademicYears(rawStudents);
    return fromStudents.length ? fromStudents : [];
  }, [academicYearsRegistry, rawStudents]);

  const termsForYear = useCallback(
    (year) => {
      const hit = academicYearsRegistry.find((r) => r.academic_year === year);
      return hit?.active_terms?.length ? hit.active_terms : DEFAULT_TERMS;
    },
    [academicYearsRegistry]
  );

  const promotionStudents = useMemo(
    () => rawStudents.map((row) => mapApiStudentToPromotion(row, progressById)),
    [rawStudents, progressById]
  );

  const loadAll = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      setError('School not found in your session. Sign in again.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [{ classRows: rows, classNameOptions: opts }, students, stats, calendar] = await Promise.all([
        fetchSchoolClasses(schoolId),
        fetchSchoolStudents(),
        fetchRegistryStats().catch(() => null),
        fetchAcademicCalendarSettings().catch(() => ({})),
      ]);

      setClassRows(rows);
      setApiClassNameOptions(opts);
      const registry = Array.isArray(calendar.academic_years_registry)
        ? calendar.academic_years_registry
        : [];
      setAcademicYearsRegistry(registry);

      const defaultYear =
        calendar.current_academic_year ||
        registry.find((r) => r.is_current)?.academic_year ||
        collectAcademicYears(students)[0] ||
        '';
      const defaultTerms =
        calendar.active_terms?.length
          ? calendar.active_terms
          : registry.find((r) => r.academic_year === defaultYear)?.active_terms || DEFAULT_TERMS;
      const defaultTerm = defaultTerms[defaultTerms.length - 1] || DEFAULT_TERMS[2];

      setAcademicYear((prev) => prev || defaultYear);
      setTerm((prev) => (prev && defaultTerms.includes(prev) ? prev : defaultTerm));
      setRawStudents(students);
      if (stats) setRegistryStats(stats);

      const hist = await fetchPromotionHistory(defaultYear).catch(() => []);
      setHistory(hist);

      if (defaultYear) {
        const prog = await fetchProgressIndex(defaultYear, defaultTerm).catch(() => ({}));
        setProgressById(prog);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load school data');
      setRawStudents([]);
      setClassRows([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!schoolId || !academicYear) return;
    let cancelled = false;
    const termList = termsForYear(academicYear);
    const activeTerm = termList.includes(term) ? term : termList[termList.length - 1] || DEFAULT_TERMS[2];
    (async () => {
      try {
        const prog = await fetchProgressIndex(academicYear, activeTerm);
        if (!cancelled) setProgressById(prog);
        const hist = await fetchPromotionHistory(academicYear);
        if (!cancelled) setHistory(hist);
      } catch (_) {}
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, academicYear, term, termsForYear]);

  const getStudentsForClass = useCallback(
    (group, stream, fullLabel) =>
      promotionStudents.filter((s) =>
        studentMatchesClassFilter(s, { group, stream, fullLabel })
      ),
    [promotionStudents]
  );

  const searchStudents = useCallback(
    (query, limit = 40) => {
      const q = String(query || '').trim().toLowerCase();
      if (q.length < 2) return [];
      return promotionStudents
        .filter((s) => {
          const name = s.name.toLowerCase();
          const code = String(s.code || '').toLowerCase();
          return name.includes(q) || code.includes(q);
        })
        .slice(0, limit);
    },
    [promotionStudents]
  );

  const repeaters = useMemo(
    () => promotionStudents.filter((s) => s.status === 'Repeat Recommended'),
    [promotionStudents]
  );

  const graduated = useMemo(
    () => promotionStudents.filter((s) => isFinalYearPromotionStudent(s)),
    [promotionStudents]
  );

  const dashboardStats = useMemo(() => {
    const total = promotionStudents.length;
    const eligible = promotionStudents.filter((s) => s.status === 'Eligible').length;
    const rep = repeaters.length;
    const grad = graduated.length;
    const pending = promotionStudents.filter((s) => s.status === 'Risky').length;
    const pct = total ? Math.round((eligible / total) * 100) : 0;
    return { total, eligible, rep, grad, pending, pct };
  }, [promotionStudents, repeaters.length, graduated.length]);

  const submitPromotion = useCallback(
    async ({
      promoteIds,
      repeaterIds,
      destinationClassName,
      sourceClassName,
      promotionType,
      year,
      term: termVal,
    }) => {
      const result = await applyPromotion({
        student_ids: promoteIds,
        repeater_ids: repeaterIds,
        destination_class_name: destinationClassName,
        source_class_name: sourceClassName,
        academic_year: year || academicYear,
        term: termVal || term,
        promotion_type: promotionType,
      });
      await loadAll();
      return result;
    },
    [academicYear, term, loadAll]
  );

  const value = {
    schoolId,
    schoolName,
    loading,
    error,
    refresh: loadAll,
    classRows,
    catalog,
    classNameOptions,
    groups: catalog.groups,
    streams: catalog.streams,
    streamsByGroup: catalog.streamsByGroup,
    academicYears,
    academicYearsRegistry,
    terms: termsForYear(academicYear),
    termsForYear,
    academicYear,
    setAcademicYear,
    term,
    setTerm,
    students: promotionStudents,
    history,
    registryStats,
    getStudentsForClass,
    searchStudents,
    repeaters,
    graduated,
    dashboardStats,
    buildDestinationLabel: buildClassNameFromParts,
    submitPromotion,
  };

  return (
    <StudentPromotionDataContext.Provider value={value}>
      {children}
    </StudentPromotionDataContext.Provider>
  );
}

export function useStudentPromotionData() {
  const ctx = useContext(StudentPromotionDataContext);
  if (!ctx) {
    throw new Error('useStudentPromotionData must be used within StudentPromotionDataProvider');
  }
  return ctx;
}
