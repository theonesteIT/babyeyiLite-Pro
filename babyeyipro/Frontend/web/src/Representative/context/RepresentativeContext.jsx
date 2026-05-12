import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMySchools, fetchRepresentativeSummary } from '../services/api';

const RepresentativeContext = createContext(null);

const STORAGE_KEY = 'babyeyi.representative.activeSchoolId';

export function RepresentativeDataProvider({ children }) {
  const [schools, setSchools] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSchoolId, setActiveSchoolIdState] = useState(() => {
    if (typeof window === 'undefined') return null;
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v ? Number(v) : null;
  });

  const setActiveSchoolId = useCallback((id) => {
    const value = id ? Number(id) : null;
    setActiveSchoolIdState(value);
    try {
      if (value) window.localStorage.setItem(STORAGE_KEY, String(value));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchMySchools().catch(() => ({ success: false, data: [] }));
      const list = s?.success ? s.data || [] : [];
      setSchools(list);

      let targetSchoolId = activeSchoolId;
      if (list.length) {
        if (targetSchoolId != null && targetSchoolId !== '') {
          const stillExists = list.some((row) => Number(row.id) === Number(targetSchoolId));
          if (!stillExists) {
            const primary = list.find((row) => row.is_primary) || list[0];
            targetSchoolId = primary?.id ?? null;
            setActiveSchoolId(targetSchoolId);
          }
        }
      } else {
        targetSchoolId = null;
        setActiveSchoolId(null);
      }

      const schoolParam =
        targetSchoolId != null && targetSchoolId !== '' ? Number(targetSchoolId) : undefined;

      const kpi = await fetchRepresentativeSummary(schoolParam).catch(() => ({
        success: false,
        data: null,
      }));
      setSummary(kpi?.success ? kpi.data : null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load representative data.');
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeSchool = useMemo(
    () => schools.find((s) => Number(s.id) === Number(activeSchoolId)) || null,
    [schools, activeSchoolId]
  );

  const value = useMemo(
    () => ({
      schools,
      summary,
      loading,
      error,
      activeSchoolId,
      activeSchool,
      setActiveSchoolId,
      refresh,
    }),
    [schools, summary, loading, error, activeSchoolId, activeSchool, setActiveSchoolId, refresh]
  );

  return <RepresentativeContext.Provider value={value}>{children}</RepresentativeContext.Provider>;
}

export function useRepresentativeData() {
  const ctx = useContext(RepresentativeContext);
  if (!ctx) throw new Error('useRepresentativeData must be used within RepresentativeDataProvider');
  return ctx;
}
