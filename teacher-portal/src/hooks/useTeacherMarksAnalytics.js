import { useCallback, useEffect, useState } from 'react';
import { fetchMarksAnalytics } from '../services/marksApi';

export function useTeacherMarksAnalytics(initialParams = {}) {
  const [params, setParams] = useState(initialParams);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMarksAnalytics(params);
      if (res?.success) setData(res.data);
      else setError(res?.message || 'Failed to load analytics');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { load(); }, [load]);

  return {
    data,
    loading,
    error,
    reload: load,
    params,
    setParams,
    kpis: data?.kpis || {},
    classPerformance: data?.class_performance || [],
    students: data?.students || [],
    atRiskStudents: data?.at_risk_students || [],
    termTrend: data?.term_trend || [],
    insights: data?.insights || [],
    filters: data?.filters,
    selected: data?.selected,
  };
}
