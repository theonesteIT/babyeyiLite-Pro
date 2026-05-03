import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Receipt, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getApiBase } from '../../utils/apiBase';
import { BABYEYI_FONT_STACK, BABYEYI_PAGE_BG } from '../../theme/babyeyiDashboardTheme';

const API = getApiBase();

function fmtDt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso).slice(0, 16) : d.toLocaleString();
}

export default function TichaDealRequest() {
  const location = useLocation();
  const isAgent = location.pathname.startsWith('/agent');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/services/shule-avance/portal/teacher-deal-payment-requests`, {
        credentials: 'include',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || `HTTP ${res.status}`);
      if (!j.success) throw new Error(j.message || 'Could not load');
      setRows(Array.isArray(j.data) ? j.data : []);
    } catch (e) {
      setRows([]);
      setError(e?.message || 'Failed to load payment requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind && String(r.kind) !== kind) return false;
      const dateStr = String(r.created_at || '').slice(0, 10);
      if (from && dateStr && dateStr < from) return false;
      if (to && dateStr && dateStr > to) return false;
      if (!q) return true;
      const hay = [
        r.kind,
        r.token,
        r.product_name,
        r.payer_name,
        r.payer_phone,
        r.province,
        r.district,
        r.sector,
        r.school_name,
        r.channel,
        r.bank_name,
        r.payer_hint,
        r.mtn_status,
        r.teacher?.name,
        r.teacher?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, kind, from, to]);

  const shell = isAgent
    ? { className: 'space-y-4', style: {} }
    : {
        className: 'min-h-screen p-5 md:p-8 space-y-5',
        style: { background: BABYEYI_PAGE_BG, fontFamily: BABYEYI_FONT_STACK },
      };

  return (
    <div {...shell}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
            {isAgent ? 'Field coverage' : 'Super Admin'}
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
            <Receipt className="w-7 h-7 text-amber-600 shrink-0" />
            Ticha Deal payment requests
          </h1>
          <p className="text-xs font-bold text-amber-800/80 mt-1 max-w-2xl">
            Pay sessions (links opened after teacher pay setup) and alternate-channel payment intents (bank, Airtel, card).
            {isAgent ? ' Filtered to your field coverage.' : ' System-wide view.'}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 px-4 rounded-xl border border-amber-300 bg-white text-[10px] font-black uppercase tracking-widest text-amber-800 inline-flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border-2 border-amber-100 bg-white p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search teacher, payer, school, token…"
          className="rounded-xl border border-amber-200 px-3 py-2 text-sm lg:col-span-2"
        />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-xl border border-amber-200 px-3 py-2 text-sm">
          <option value="">All types</option>
          <option value="pay_session">Pay session</option>
          <option value="payment_intent">Payment intent</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-amber-200 px-3 py-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-amber-200 px-3 py-2 text-sm" />
      </div>

      <div className="rounded-2xl border-2 border-amber-100 bg-white overflow-auto">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-amber-50 text-amber-900 text-[11px] uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Teacher / payer</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left">Location</th>
              <th className="px-3 py-2 text-left">School</th>
              <th className="px-3 py-2 text-left">Status / channel</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-amber-800">
                  <Loader2 className="w-8 h-8 animate-spin inline text-amber-600" />
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const key = r.kind === 'payment_intent' ? `pi-${r.intent_id}` : `ps-${r.token}`;
                const isSession = r.kind === 'pay_session';
                return (
                  <tr key={key} className="border-t border-amber-100/60">
                    <td className="px-3 py-2 font-bold">
                      {isSession ? (
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px]">
                          Pay session
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-900">
                          {String(r.channel || 'intent')}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-[12px]">{fmtDt(r.created_at)}</td>
                    <td className="px-3 py-2">
                      {isSession ? (
                        <div>
                          <div className="font-semibold text-[#111827]">{r.teacher?.name || '—'}</div>
                          <div className="text-[11px] text-amber-900/70">
                            Payer: {r.payer_name || r.payer_phone || '—'}
                          </div>
                        </div>
                      ) : (
                        <div className="font-semibold text-[#111827]">{r.payer_hint || '—'}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isSession && r.amount_rwf != null ? `${Number(r.amount_rwf).toLocaleString()} RWF` : '—'}
                    </td>
                    <td className="px-3 py-2 text-[12px]">
                      {[r.province, r.district, r.sector].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-3 py-2 text-[12px]">{r.school_name || '—'}</td>
                    <td className="px-3 py-2 text-[12px]">
                      {isSession ? (
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                              r.consumed ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-200'
                            }`}
                          >
                            {r.consumed ? 'Consumed' : 'Open'}
                          </span>
                          {r.mtn_status ? (
                            <div className="text-[11px] text-slate-600">MoMo: {r.mtn_status}</div>
                          ) : null}
                          {r.product_name ? (
                            <div className="text-[11px] text-slate-600 truncate max-w-[200px]" title={r.product_name}>
                              {r.product_name}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {r.bank_name ? <div>{r.bank_name}</div> : null}
                          {r.transfer_note ? (
                            <div className="text-[11px] text-slate-600 truncate max-w-[220px]" title={r.transfer_note}>
                              {r.transfer_note}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {!loading && !filtered.length ? (
          <p className="py-8 text-center text-sm text-slate-500">No requests match these filters.</p>
        ) : null}
      </div>
    </div>
  );
}
