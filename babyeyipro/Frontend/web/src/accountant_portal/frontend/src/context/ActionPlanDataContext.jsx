import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchActionPlanDashboard, fetchActionPlanOptions } from '../services/actionPlanApi';
import { getSelectedActionPlanId, setSelectedActionPlanId } from '../utils/selectedActionPlan';

const ActionPlanDataContext = createContext(null);

export function ActionPlanDataProvider({ children }) {
  const [planId, setPlanIdState] = useState(() => getSelectedActionPlanId());
  const [data, setData] = useState(null);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActionPlanOptions().then(setOptions).catch(() => setOptions(null));
  }, []);

  const reload = useCallback(async (id) => {
    setLoading(true);
    setError('');
    try {
      const dash = await fetchActionPlanDashboard(id || undefined);
      setData(dash);
    } catch (e) {
      setError(e.message || 'Failed to load action plan data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload(planId);
  }, [planId, reload]);

  const setPlanId = useCallback((id) => {
    setSelectedActionPlanId(id);
    setPlanIdState(id);
  }, []);

  const value = useMemo(() => ({
    planId,
    setPlanId,
    data,
    options,
    loading,
    error,
    reload: () => reload(planId),
    totals: data?.totals || {},
    activePlan: data?.activePlan || null,
    activities: data?.activities || [],
    notifications: data?.notifications || [],
    recentPlans: data?.recentPlans || [],
    departmentUsage: data?.departmentUsage || [],
    monthlyTimeline: data?.monthlyTimeline || [],
  }), [data, options, planId, loading, error, reload, setPlanId]);

  return (
    <ActionPlanDataContext.Provider value={value}>
      {children}
    </ActionPlanDataContext.Provider>
  );
}

export function useActionPlanData() {
  const ctx = useContext(ActionPlanDataContext);
  if (!ctx) throw new Error('useActionPlanData must be used within ActionPlanDataProvider');
  return ctx;
}
