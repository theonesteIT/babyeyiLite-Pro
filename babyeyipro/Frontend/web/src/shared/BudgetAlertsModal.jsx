import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, BellRing, Loader2, X, CircleAlert, Info } from 'lucide-react';
import {
  getPortalPushState,
  isWebPushEnvironmentSupported,
  subscribePortalPush,
  unsubscribePortalPush,
} from './webPushPortal';

const NAVY = '#000435';
const AMBER = '#F59E0B';

/**
 * Modal to enable/disable budget web push alerts and review active alerts.
 * @param {import('axios').AxiosInstance} api
 */
export default function BudgetAlertsModal({ open, onClose, api, alerts = [], navy = NAVY, amber = AMBER }) {
  const [state, setState] = useState({ supported: false, subscribed: false, permission: 'default' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    const s = await getPortalPushState();
    setState(s);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const toggle = async () => {
    setBusy(true);
    setMsg('');
    try {
      if (state.subscribed) {
        await unsubscribePortalPush(api);
        setMsg('Budget alerts turned off on this device.');
      } else {
        await subscribePortalPush(api);
        setMsg('Budget alerts enabled — you will receive notifications on this device.');
      }
      await refresh();
    } catch (e) {
      setMsg(e.message || 'Could not update notifications');
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const supported = isWebPushEnvironmentSupported();
  const list = Array.isArray(alerts) ? alerts : [];

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/45"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="budget-alerts-title"
      >
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ background: navy, borderBottom: `3px solid ${amber}` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <BellRing size={20} style={{ color: amber }} />
            <div>
              <h2 id="budget-alerts-title" className="text-base font-bold" style={{ color: amber }}>
                Budget alerts
              </h2>
              <p className="text-[10px] font-medium opacity-80" style={{ color: '#FDE68A' }}>
                Push notifications for budget updates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: '#fff' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {!supported ? (
            <div className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <Info size={18} className="shrink-0 text-slate-400 mt-0.5" />
              <p className="text-[12px] text-slate-600 leading-relaxed">
                Push notifications are not supported in this browser. Try Chrome, Edge, or Firefox on desktop or Android.
              </p>
            </div>
          ) : (
            <div
              className="rounded-xl p-4 border"
              style={{ borderColor: `${amber}55`, background: 'linear-gradient(135deg, #FFFBEB 0%, #fff 100%)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Device notifications</p>
                  <p className="text-sm font-semibold" style={{ color: navy }}>
                    {state.subscribed ? 'Alerts are enabled' : 'Alerts are disabled'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {state.subscribed
                      ? 'You will receive alerts when budgets need approval or status changes.'
                      : 'Enable to get notified about pending approvals and budget updates.'}
                  </p>
                </div>
                <span
                  className="shrink-0 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase"
                  style={{
                    background: state.subscribed ? '#D1FAE5' : '#F3F4F6',
                    color: state.subscribed ? '#065F46' : '#6B7280',
                  }}
                >
                  {state.subscribed ? 'On' : 'Off'}
                </span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={toggle}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wide disabled:opacity-50 transition-opacity"
                style={{
                  background: state.subscribed ? '#E5E7EB' : navy,
                  color: state.subscribed ? '#374151' : '#fff',
                }}
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : state.subscribed ? (
                  <BellOff size={16} />
                ) : (
                  <Bell size={16} style={{ color: amber }} />
                )}
                {busy ? 'Updating…' : state.subscribed ? 'Disable alerts' : 'Enable alerts'}
              </button>
              {msg && (
                <p className="mt-3 text-[11px] font-medium text-slate-600 text-center">{msg}</p>
              )}
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
              <Bell size={12} style={{ color: amber }} />
              Current alerts ({list.length})
            </p>
            {list.length === 0 ? (
              <p className="text-[12px] text-slate-400 font-medium py-6 text-center bg-slate-50 rounded-xl border border-slate-100">
                No active alerts right now.
              </p>
            ) : (
              <ul className="space-y-2">
                {list.map((a) => {
                  const isDanger = a.type === 'danger';
                  const isWarn = a.type === 'warning';
                  return (
                    <li
                      key={a.id}
                      className={`flex gap-2.5 p-3 rounded-xl text-[12px] font-medium border ${
                        isDanger
                          ? 'bg-red-50 border-red-100 text-red-800'
                          : isWarn
                            ? 'bg-amber-50 border-amber-100 text-amber-900'
                            : 'bg-blue-50 border-blue-100 text-blue-900'
                      }`}
                    >
                      <CircleAlert size={16} className="shrink-0 mt-0.5" />
                      <span>{a.message}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-[12px] font-semibold border-2 transition-colors"
            style={{ borderColor: navy, color: navy }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
