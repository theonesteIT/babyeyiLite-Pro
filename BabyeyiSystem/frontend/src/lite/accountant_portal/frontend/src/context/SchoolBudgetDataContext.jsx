import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchSchoolBudgetDashboard } from "../services/schoolBudgetApi";
import { getSelectedBudgetId, setSelectedBudgetId } from "../utils/selectedSchoolBudget";
import { deriveBudgetFinancials } from "../utils/deriveBudgetFinancials";

const SchoolBudgetDataContext = createContext(null);

export function SchoolBudgetDataProvider({ children }) {
  const [budgetId, setBudgetIdState] = useState(() => getSelectedBudgetId());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async (id) => {
    setLoading(true);
    setError("");
    try {
      const dash = await fetchSchoolBudgetDashboard(id || undefined);
      setData(dash);
    } catch (e) {
      setError(e.message || "Failed to load budget data");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload(budgetId);
  }, [budgetId, reload]);

  const setBudgetId = useCallback((id) => {
    setSelectedBudgetId(id);
    setBudgetIdState(id);
  }, []);

  const value = useMemo(() => {
    const totals = data?.totals || {};
    const financials = deriveBudgetFinancials(data);
    return {
      budgetId,
      setBudgetId,
      data,
      loading,
      error,
      reload: () => reload(budgetId),
      activeBudget: data?.activeBudget ?? null,
      budgetLines: data?.budgetLines || [],
      incomeSources: data?.incomeSources || [],
      monthlyData: data?.monthlyData || [],
      departmentSpending: data?.departmentSpending || [],
      alerts: data?.alerts || [],
      recentUsage: data?.recentUsage || [],
      auditLogs: data?.auditLogs || [],
      recentBudgets: data?.recentBudgets || [],
      schoolOverview: data?.schoolOverview || {},
      totals,
      financials,
      totalExpectedIncome: totals.totalExpectedIncome ?? 0,
      totalCollected: totals.totalCollected ?? 0,
      totalAllocated: totals.totalAllocated ?? 0,
      totalUsed: totals.totalUsed ?? 0,
      remainingUnallocated: totals.remainingUnallocated ?? 0,
      availableBalance: totals.availableBalance ?? 0,
      usagePct: totals.usagePct ?? 0,
    };
  }, [data, budgetId, error, loading, reload, setBudgetId]);

  return (
    <SchoolBudgetDataContext.Provider value={value}>
      {children}
    </SchoolBudgetDataContext.Provider>
  );
}

export function useSchoolBudgetData() {
  const ctx = useContext(SchoolBudgetDataContext);
  if (!ctx) throw new Error("useSchoolBudgetData must be used within SchoolBudgetDataProvider");
  return ctx;
}
