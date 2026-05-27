import { useEffect, useState } from 'react';
import { fetchActionPlans } from '../services/actionPlanApi';
import { AP_COLORS } from '../utils/actionPlanConstants';

export default function ActionPlanSelector({ planId, onPlanIdChange, fmt }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActionPlans()
      .then((list) => {
        setPlans(list);
        if (!planId && list[0]?.id) onPlanIdChange(list[0].id);
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [planId, onPlanIdChange]);

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
      {planId && plans.find((p) => p.id === planId) && (
        <p style={{ fontSize: 12, color: AP_COLORS.gray600, marginTop: 8, marginBottom: 0 }}>
          Budget: {fmt(plans.find((p) => p.id === planId)?.estimatedBudget || 0)}
        </p>
      )}
    </div>
  );
}
