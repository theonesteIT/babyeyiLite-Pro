import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, RefreshCw, Send, XCircle } from 'lucide-react';
import api from '../services/api';

function fmtMoney(v) {
  const n = Number(v || 0);
  return `${n.toLocaleString()} RWF`;
}

export default function ShuleAvanceFinanceApprovals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/services/shule-avance/finance/pending-invoices');
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load queue');
      setRows(res.data.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load queue');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendToManager = async (id) => {
    const note = window.prompt('Optional accountant note to manager and teacher:') || '';
    setBusyId(id);
    setMsg('');
    setErr('');
    try {
      const res = await api.patch(`/services/shule-avance/finance/invoice-requests/${id}/send-to-manager`, { note });
      if (!res.data?.success) throw new Error(res.data?.message || 'Action failed');
      setMsg('Request sent to school manager.');
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not send to manager.');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    const note = window.prompt('Reason for rejection (shown to teacher):') || '';
    setBusyId(id);
    setMsg('');
    setErr('');
    try {
      const res = await api.patch(`/services/shule-avance/finance/invoice-requests/${id}/reject`, { note });
      if (!res.data?.success) throw new Error(res.data?.message || 'Action failed');
      setMsg('Request rejected.');
      await load();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Could not reject request.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-[28px] shadow-2xl border border-black/5 overflow-hidden">
      <div className="px-6 md:px-8 py-5 border-b border-black/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-[#1E3A5F]" />
          <h2 className="text-sm font-black text-[#1E3A5F] uppercase tracking-tight">ShuleAvance · Accountant Queue</h2>
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

      {msg ? <div className="mx-6 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-900">{msg}</div> : null}
      {err ? <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-bold text-red-700">{err}</div> : null}

      <div className="p-6 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-[11px] font-black uppercase tracking-widest">Loading...</span>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-[12px] font-bold text-slate-400 py-10">No pending requests for accountant review.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-black/5 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-re-bg/20"
              >
                <div>
                  <p className="font-black text-[#1E3A5F] text-sm">{r.staff_name || `Teacher #${r.teacher_user_id}`}</p>
                  <p className="text-[11px] font-bold text-slate-600 mt-1">{r.vendor_label || 'No vendor provided'}</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-xl">{r.purpose}</p>
                  {r.details ? <p className="text-[10px] text-slate-500 mt-1 max-w-xl">{r.details}</p> : null}
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">
                    Req #{r.id} · {r.repayment_term_months} mo · {r.invoice_file_name || 'No invoice filename'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                  <p className="text-lg font-black text-[#1E3A5F] sm:mr-4">{fmtMoney(r.amount_rwf)}</p>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => sendToManager(r.id)}
                    className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-md disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#1E3A5F,#0D2644)' }}
                  >
                    <Send size={14} className="inline mr-1 align-text-bottom" />
                    Send To Manager
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
