import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, Edit2 } from 'lucide-react';
import { AP_COLORS } from '../utils/actionPlanConstants';

const NAVY = AP_COLORS.navy;
const AMBER = AP_COLORS.amber;

const fmtMoney = (n) => new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(n) || 0);

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-RW', { year: 'numeric', month: 'short', day: 'numeric' });
};

function Detail({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: AP_COLORS.gray400, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: NAVY }}>{value || '—'}</p>
    </div>
  );
}

export default function ActionPlanViewModal({ open, onClose, plan, onEdit }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !plan) return null;

  const progress = plan.statusLabel === 'Completed'
    ? 100
    : plan.activityCount
      ? Math.round((Number(plan.completedActivities || 0) / plan.activityCount) * 100)
      : 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ap-view-title"
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0 }}
      className="sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, border: 'none', background: 'rgba(0,4,53,0.55)', backdropFilter: 'blur(2px)', cursor: 'pointer' }}
      />
      <div
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: 640, maxHeight: '92vh',
          background: '#fff', borderRadius: '20px 20px 0 0', boxShadow: '0 24px 48px rgba(0,4,53,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        className="sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '18px 22px', background: `linear-gradient(135deg, ${NAVY}, #1e3a5f)`, color: '#fff', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85 }}>
              <Eye size={16} color={AMBER} />
              ACTION PLAN DETAILS
            </div>
            <h2 id="ap-view-title" style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800 }}>{plan.title}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>
              {plan.planCode ? `${plan.planCode} · ` : ''}{plan.statusLabel} · {plan.term}, {plan.academicYear}
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <Detail label="Department" value={plan.department} />
            <Detail label="Priority" value={plan.priorityLevel} />
            <Detail label="Status" value={plan.statusLabel} />
            <Detail label="Responsible" value={plan.responsibleName} />
            <Detail label="Start date" value={fmtDate(plan.startDate)} />
            <Detail label="End date" value={fmtDate(plan.endDate)} />
            <Detail label="Estimated budget" value={`${fmtMoney(plan.estimatedBudget)} RWF`} />
            <Detail label="Used budget" value={`${fmtMoney(plan.usedBudget)} RWF`} />
            <Detail label="Funding source" value={plan.fundingSource} />
            <Detail label="Activities" value={`${plan.activityCount || 0} total · ${plan.completedActivities || 0} completed`} />
            <Detail label="Progress" value={`${progress}%`} />
            <Detail label="Strategic objective" value={plan.strategicObjective} full />
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: `1px solid ${AP_COLORS.gray200}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${AP_COLORS.gray200}`, background: '#fff', color: AP_COLORS.gray600, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => { onClose(); onEdit(plan); }}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: AMBER, color: NAVY, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Edit2 size={16} /> Edit plan
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
