import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { Building2, CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react';

/** Demo: same behaviour as accountant portal — shared in-memory API. */
export default function ShuleAvanceFinanceApprovals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get('/services/shule-avance/finance/pending-invoices');
      if (res.data?.success) setRows(res.data.data || []);
      else setMsg(res.data?.message || 'Could not load pending requests.');
    } catch (e) {
      setMsg(e.response?.data?.message || 'Finance queue unavailable (check login & API).');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id, payer) => {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await api.patch(`/services/shule-avance/finance/invoice-requests/${id}/approve`, { payer });
      if (!res.data?.success) throw new Error(res.data?.message);
      await load();
    } catch (e) {
      setMsg(e.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    const note = window.prompt('Optional note for staff (demo):') || '';
    setBusyId(id);
    setMsg(null);
    try {
      const res = await api.patch(`/services/shule-avance/finance/invoice-requests/${id}/reject`, { note });
      if (!res.data?.success) throw new Error(res.data?.message);
      await load();
    } catch (e) {
      setMsg(e.response?.data?.message || e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-black/5 overflow-hidden mb-8">
      <div className="px-6 md:px-8 py-5 border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-re-navy" />
          <h2 className="text-sm font-black text-re-navy uppercase tracking-tight">ShuleAvance · Finance approvals (demo)</h2>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-black/5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-re-bg"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      {msg && (
        <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-950">{msg}</div>
      )}
      <div className="p-6 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest">Loading…</span>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-[12px] font-bold text-slate-400 py-10">No pending invoice requests for this school.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-black/5 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-re-bg/20"
              >
                <div>
                  <p className="font-black text-re-navy text-sm">{r.staff_name}</p>
                  <p className="text-[11px] font-bold text-slate-600 mt-1">{r.vendor_label}</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xl">{r.details}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">
                    Req #{r.id} · {r.terms_months} mo · {r.invoice_file_name}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <p className="text-lg font-black text-re-navy sm:mr-4">{Number(r.amount_rwf).toLocaleString()} RWF</p>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => approve(r.id, 'school')}
                    className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-md disabled:opacity-50 bg-re-navy hover:opacity-95"
                  >
                    <CheckCircle size={14} className="inline mr-1 align-text-bottom" />
                    Approve · school pays
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => approve(r.id, 'partner')}
                    className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-re-navy/30 text-re-navy bg-white hover:bg-re-bg disabled:opacity-50"
                  >
                    Approve · partner pays
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => reject(r.id)}
                    className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle size={14} className="inline mr-1 align-text-bottom" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
