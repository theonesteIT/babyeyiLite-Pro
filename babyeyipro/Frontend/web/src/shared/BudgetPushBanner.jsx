import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import {
  getPortalPushState,
  isWebPushEnvironmentSupported,
  subscribePortalPush,
  unsubscribePortalPush,
} from './webPushPortal';

/**
 * Compact enable/disable control for budget web push alerts.
 * @param {import('axios').AxiosInstance} api
 */
export default function BudgetPushBanner({
  api,
  className = '',
  label = 'Budget alerts',
  enabledMessage = 'You will receive budget alerts on this device',
}) {
  const [state, setState] = useState({ supported: false, subscribed: false, permission: 'default' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    const s = await getPortalPushState();
    setState(s);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!isWebPushEnvironmentSupported()) return null;

  const toggle = async () => {
    setBusy(true);
    setMsg('');
    try {
      if (state.subscribed) {
        await unsubscribePortalPush(api);
        setMsg('Notifications turned off');
      } else {
        await subscribePortalPush(api);
        setMsg(enabledMessage);
      }
      await refresh();
    } catch (e) {
      setMsg(e.message || 'Could not update notifications');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold ${className}`}
      style={{ borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(255,251,235,0.9)' }}
    >
      <span className="flex items-center gap-2 text-slate-700">
        <Bell size={14} style={{ color: '#F59E0B' }} />
        {label}
        {state.subscribed && <span className="text-[9px] uppercase text-emerald-700 font-bold">On</span>}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase disabled:opacity-50"
        style={{ background: state.subscribed ? '#E5E7EB' : '#1E3A5F', color: state.subscribed ? '#374151' : '#fff' }}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : state.subscribed ? <BellOff size={12} /> : <Bell size={12} />}
        {state.subscribed ? 'Disable' : 'Enable'}
      </button>
      {msg && <p className="w-full text-[10px] text-slate-500 font-medium">{msg}</p>}
    </div>
  );
}
