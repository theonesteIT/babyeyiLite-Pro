import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PlusCircle } from 'lucide-react';
import { AP_COLORS } from '../utils/actionPlanConstants';
import ActionPlanCreateForm from './ActionPlanCreateForm';

const NAVY = AP_COLORS.navy;
const AMBER = AP_COLORS.amber;

export default function CreateActionPlanModal({ open, onClose, options, onCreated }) {
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

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ap-create-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
      className="sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(0,4,53,0.55)',
          backdropFilter: 'blur(2px)',
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 720,
          maxHeight: '92vh',
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 24px 48px rgba(0,4,53,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 22px',
            background: `linear-gradient(135deg, ${NAVY}, #1e3a5f)`,
            color: '#fff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', opacity: 0.85 }}>
              <PlusCircle size={16} color={AMBER} />
              NEW ACTION PLAN
            </div>
            <h2 id="ap-create-title" style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800 }}>Create Action Plan</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>
              Plan school activities for a term or full academic year
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 8, cursor: 'pointer', color: '#fff' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 22px' }}>
          <ActionPlanCreateForm
            options={options}
            compact
            onSuccess={(plan) => {
              onCreated?.(plan);
              setTimeout(onClose, 500);
            }}
          />
        </div>
      </div>
      <style>{`
        @media (min-width: 640px) {
          [role="dialog"].sm\\:items-center { align-items: center !important; padding: 1rem !important; }
        }
        @media (max-width: 640px) {
          .ap-modal-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>,
    document.body
  );
}
