import { useCallback, useEffect, useState } from 'react';
import { fetchReportsAnalytics } from '../services/dosStudentReportsApi';

export function useReportsAnalytics(params = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchReportsAnalytics(params);
      if (res?.success) setData(res.data);
      else setError(res?.message || 'Failed to load analytics');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.school_kpis || {};
  const classPerformance = (data?.class_performance || []).map((c) => ({
    ...c,
    trend: c.trend ?? 0,
    passRate: c.passRate ?? c.pass_rate ?? null,
  }));

  return {
    data,
    loading,
    error,
    reload: load,
    kpis,
    classPerformance,
    subjectPerformance: data?.subject_performance || [],
    teacherPerformance: data?.teacher_performance || [],
    schoolRankings: data?.school_rankings || [],
    atRiskStudents: data?.at_risk_students || [],
    termTrend: data?.term_trend || [],
    comparativeTerms: data?.comparative_terms || [],
    examReadiness: data?.exam_readiness || [],
    smartInsights: data?.smart_insights || [],
    liveAlerts: data?.live_alerts || [],
    decisionActions: data?.decision_actions || [],
    filters: data?.filters,
    selected: data?.selected,
  };
}
