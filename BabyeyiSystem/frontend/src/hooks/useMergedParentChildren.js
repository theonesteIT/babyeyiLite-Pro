import { useState, useEffect, useMemo, useCallback } from "react";
import { getLocalChildren } from "../utils/parentLocalChildren";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

export function useMergedParentChildren() {
  const auth = useAuth();
  const [apiList, setApiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localTick, setLocalTick] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const refreshLocal = useCallback(() => setLocalTick((t) => t + 1), []);
  const refreshApi = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;

    // Guest ClassKit (?cks=) and other portals hit this hook too — skip parent-only API.
    if (auth.loading) {
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    const role = auth.role ? String(auth.role).toUpperCase() : "";
    if (!auth.isLoggedIn || role !== "PARENT") {
      setApiList([]);
      setError(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/api/parent-portal/children`, {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.message || "Could not load children");
          return;
        }
        setApiList(json.data || []);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, auth.loading, auth.isLoggedIn, auth.role]);

  const merged = useMemo(() => {
    const parentPhone = auth.user?.parent_phone || null;
    const locals = getLocalChildren(parentPhone);
    const school = (apiList || []).map((c) => ({ ...c, _source: "school" }));
    const schoolIds = new Set(
      school.map((c) => (c.id != null && c.id !== "" ? Number(c.id) : NaN)).filter((n) => Number.isFinite(n))
    );
    const localRows = locals
      .map((c) => ({ ...c, _source: "local" }))
      .filter((c) => {
        const id = c.id != null && c.id !== "" ? Number(c.id) : NaN;
        if (Number.isFinite(id) && schoolIds.has(id)) return false;
        return true;
      });
    return [...school, ...localRows];
  }, [apiList, localTick, auth.user?.parent_phone]);

  return { merged, loading, error, refreshLocal, refreshApi };
}
