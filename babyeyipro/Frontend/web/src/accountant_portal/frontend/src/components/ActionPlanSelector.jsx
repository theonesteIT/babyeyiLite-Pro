import { useEffect, useState } from 'react';
import { fetchActionPlans } from '../services/actionPlanApi';
import { AP_COLORS } from '../utils/actionPlanConstants';

export default function ActionPlanSelector({ planId, onPlanIdChange, fmt, fallbackPlans = [] }) {
  const [plans, setPlans] = useState(fallbackPlans);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    fetchActionPlans()
      .then((list) => {
        if (cancelled) return;
        setPlans(list);
        if (!planId && list[0]?.id) onPlanIdChange(list[0].id);
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e.message || 'Could not load plans');
        const fb = Array.isArray(fallbackPlans) ? fallbackPlans : [];
        setPlans(fb);
        if (!planId && fb[0]?.id) onPlanIdChange(fb[0].id);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [onPlanIdChange]);

  useEffect(() => {
    if (fallbackPlans?.length && !plans.length && !loading) {
      setPlans(fallbackPlans);
    }
  }, [fallbackPlans, plans.length, loading]);

  return (
    <div style={{ background: AP_COLORS.white, borderRadius: 12, padding: 16, border: `1px solid ${AP_COLORS.gray200}`, marginBottom: 16 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: AP_COLORS.gray400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Action plan
      </label>
      <select
        value={planId || ''}
        onChange={(e) => onPlanIdChange(Number(e.target.value) || null)}
        disabled={loading || !plans.length}
        style={{ width: '100%', marginTop: 8, border: `1px solid ${AP_COLORS.gray200}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: AP_COLORS.navy, background: AP_COLORS.white }}
      >
        <option value="">{loading ? 'Loading…' : 'Select action plan'}</option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title} · {p.term} ({p.statusLabel || p.status})
          </option>
        ))}
      </select>
      {loadError && (
        <p style={{ fontSize: 11, color: '#B45309', marginTop: 6, marginBottom: 0 }}>{loadError}</p>
      )}
      {planId && plans.find((p) => p.id === planId) && (
        <p style={{ fontSize: 12, color: AP_COLORS.gray600, marginTop: 8, marginBottom: 0 }}>
          Budget: {fmt(plans.find((p) => p.id === planId)?.estimatedBudget || 0)}
        </p>
      )}
    </div>
  );
}
