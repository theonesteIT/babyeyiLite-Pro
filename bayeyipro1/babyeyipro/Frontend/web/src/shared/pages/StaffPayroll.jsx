import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Wallet, Clock, CheckCircle2, XCircle, Bell } from 'lucide-react';

const fmt = (v) => `${new Intl.NumberFormat('en-RW', { maximumFractionDigits: 0 }).format(Number(v) || 0)} RWF`;

function StatusChip({ status }) {
  const map = {
    Paid: 'bg-blue-100 text-blue-800 border-blue-200',
    Approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${map[status] || map.Pending}`}>{status}</span>;
}

export default function StaffPayroll({ apiClient, endpoint = '/staff/payroll/my' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get(endpoint);
        if (!active) return;
        setData(res.data?.data || null);
      } catch (e) {
        if (!active) return;
        setError(e?.response?.data?.message || e?.message || 'Failed to load payroll');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [apiClient, endpoint]);

  const history = data?.history || [];
  const paidTotal = useMemo(() => history.filter((h) => h.status === 'Paid').reduce((s, h) => s + Number(h.paid || 0), 0), [history]);
  const pendingCount = useMemo(() => history.filter((h) => h.status === 'Pending').length, [history]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#000435]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 space-y-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="rounded-2xl bg-[#000435] text-white p-5">
        <p className="text-[10px] uppercase tracking-widest text-amber-400 font-black">My Payroll</p>
        <h1 className="text-xl font-black mt-1">{data?.staff?.fullName || 'Staff'}</h1>
        <p className="text-xs text-slate-300">{data?.staff?.staffCode} · {data?.staff?.role} · {data?.staff?.department}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Current Net</p>
          <p className="text-lg font-black text-[#000435]">{fmt(data?.currentSalary?.net)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Paid Total</p>
          <p className="text-lg font-black text-emerald-700">{fmt(paidTotal)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Pending Requests</p>
          <p className="text-lg font-black text-amber-700">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Advance Remaining</p>
          <p className="text-lg font-black text-orange-700">{fmt(data?.advance?.remaining)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="font-black text-[#000435]">Payroll History</p>
          <Bell size={14} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Net</th>
                <th className="px-4 py-3 text-left">Paid</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payroll records yet.</td></tr>
              ) : history.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#000435]">{row.month} {row.year}</p>
                    <p className="text-[10px] text-slate-400">{row.term}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt(row.net)}</td>
                  <td className="px-4 py-3 font-black text-blue-700">{fmt(row.paid)}</td>
                  <td className="px-4 py-3"><StatusChip status={row.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {row.status === 'Paid' ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} /> Paid</span> : row.status === 'Rejected' ? <span className="inline-flex items-center gap-1"><XCircle size={12} /> Rejected</span> : <span className="inline-flex items-center gap-1"><Clock size={12} /> Waiting</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

