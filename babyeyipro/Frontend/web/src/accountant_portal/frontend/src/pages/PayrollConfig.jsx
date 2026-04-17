import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, Search, Settings2, Upload } from 'lucide-react';
import api from '../services/api';

function formatMoneyRWF(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n);
}

export default function PayrollConfig() {
  const [search, setSearch] = useState('');

  const [rates, setRates] = useState([]);
  const [staff, setStaff] = useState([]);

  const fetchConfig = async () => {
    try {
      const res = await api.get('/accountant/payroll/config');
      if (!res.data?.success) return;
      const d = res.data.data || {};
      setRates(Array.isArray(d.rates) ? d.rates : []);
      setStaff(Array.isArray(d.staff) ? d.staff : []);
    } catch (e) {
      console.warn('[PayrollConfig] Failed to load payroll config:', e.message);
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveRates = async () => {
    try {
      await api.put('/accountant/payroll/rates', {
        rates: rates.map((r) => ({ role: r.role, base: r.base, allowance: r.allowance })),
      });
      await fetchConfig();
    } catch (e) {
      console.warn('[PayrollConfig] Failed to save rates:', e.message);
    }
  };

  const patchStaff = async (userId, body) => {
    try {
      await api.patch(`/accountant/payroll/staff/${userId}`, body);
    } catch (e) {
      console.warn('[PayrollConfig] Failed to update staff assignment:', e.message);
    }
  };

  const isPersistedRateId = (rateId) => /^RATE-\d+$/.test(String(rateId || ''));

  const rateById = useMemo(() => Object.fromEntries(rates.map((r) => [r.id, r])), [rates]);
  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.dept.toLowerCase().includes(q));
  }, [staff, search]);

  const estimated = useMemo(() => {
    const active = staff.filter((s) => s.active);
    const gross = active.reduce((sum, s) => {
      const r = rateById[s.rateId];
      return sum + (Number(r?.base) || 0) + (Number(r?.allowance) || 0);
    }, 0);
    return { activeCount: active.length, gross };
  }, [staff, rateById]);

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <div className="relative w-full min-h-[280px] overflow-hidden">
        <div className="absolute inset-0 bg-[#0a192f]/85 z-10 backdrop-blur-[2px]"></div>
        <img src="/teacher.jpg" alt="Hero Background" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1E3A5F]/40 via-transparent to-transparent z-10 max-w-[1600px] mx-auto"></div>

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-16 pb-24 flex items-center gap-8">
          <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FEBF10]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <Settings2 size={40} style={{ color: '#FEBF10' }} className="group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-1 rounded-full animate-pulse" style={{ background: '#FEBF10' }}></span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#FEBF10' }}>Payroll Setup</p>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-2 mt-2 uppercase">
              Configure <span style={{ color: '#FEBF10' }}>Payroll</span>
            </h1>
            <p className="text-[8px] sm:text-[10px] md:text-xs font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">
              Define rates, assign staff, and estimate payroll
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-24 relative z-20 pb-20">
        <div className="bg-white rounded-t-[32px] shadow-2xl border border-black/5 overflow-hidden flex flex-col min-h-[520px]">
          {/* Top stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 border-b border-black/5">
            <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-black/5">
              {[
                { label: 'Active staff', value: String(estimated.activeCount), tone: 'text-emerald-600' },
                { label: 'Estimated gross', value: formatMoneyRWF(estimated.gross).replace('RWF', ''), tone: 'text-[#1E3A5F]' },
                { label: 'Rates', value: String(rates.length), tone: 'text-slate-600' },
                { label: 'Currency', value: 'RWF', tone: 'text-slate-600' },
              ].map((s, i) => (
                <div key={i} className="p-4 sm:p-8 flex flex-col items-center justify-center text-center group hover:bg-re-bg/20 transition-all cursor-default">
                  <span className={`text-sm sm:text-2xl font-black tracking-tighter ${s.tone}`}>{s.value}</span>
                  <p className="text-[6px] sm:text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mt-0.5 sm:mt-1 opacity-60">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="hidden lg:flex flex-col border-l border-black/5 bg-re-bg/30 p-6 justify-center gap-3 relative">
              <button
                type="button"
                onClick={() => saveRates()}
                className="w-full h-11 flex items-center justify-center gap-2 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
              >
                <Save size={14} />
                <span>Save config</span>
              </button>
              <button
                type="button"
                className="w-full h-11 flex items-center justify-center gap-2 bg-white border border-black/5 text-re-text font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-re-bg hover:border-[#1E3A5F]/20 hover:shadow-re-soft transition-all group"
              >
                <Upload size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" style={{ color: '#1E3A5F' }} />
                <span className="group-hover:text-[#1E3A5F]">Import staff</span>
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="hidden lg:flex px-4 py-4 lg:px-3 lg:py-2 border-b border-black/5 flex-nowrap items-center justify-start gap-2 bg-re-bg/20 transition-all">
            <div className="flex flex-nowrap items-center gap-2">
              <div className="relative w-[14rem] group">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-[#1E3A5F] transition-colors z-[1] pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-tight shadow-[inset_0_2px_8px_rgba(15,23,42,0.06),inset_0_-1px_0_rgba(255,255,255,0.5)] placeholder:text-[#1E3A5F]/30 !pl-8"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchConfig()}
              className="h-8 w-8 flex items-center justify-center bg-white border border-black/5 rounded-lg hover:bg-re-bg transition-all shadow-sm disabled:opacity-40 shrink-0 ml-auto"
            >
              <RefreshCw size={12} className="text-[#1E3A5F]" />
            </button>
          </div>

          {/* Rates + staff table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-black/5 bg-re-bg/10 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-[#1E3A5F] uppercase tracking-widest">Rates</p>
                <button
                  type="button"
                  onClick={() => setRates((prev) => [{ id: `RATE-${Date.now()}`, role: 'New role', base: 0, allowance: 0 }, ...prev])}
                  className="h-8 px-3 rounded-xl bg-white border border-black/5 text-[#1E3A5F] font-black text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all"
                >
                  Add rate
                </button>
              </div>
              <div className="space-y-2">
                {rates.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-white border border-black/5 shadow-sm p-4">
                    <input
                      value={r.role}
                      onChange={(e) => setRates((prev) => prev.map((x) => (x.id === r.id ? { ...x, role: e.target.value } : x)))}
                      className="w-full h-9 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[10px] font-black uppercase tracking-widest shadow-inner"
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <input
                        value={String(r.base)}
                        onChange={(e) => setRates((prev) => prev.map((x) => (x.id === r.id ? { ...x, base: Number(e.target.value.replace(/[^\d]/g, '')) || 0 } : x)))}
                        placeholder="Base"
                        className="w-full h-9 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-inner placeholder:text-re-text-muted/40"
                      />
                      <input
                        value={String(r.allowance)}
                        onChange={(e) => setRates((prev) => prev.map((x) => (x.id === r.id ? { ...x, allowance: Number(e.target.value.replace(/[^\d]/g, '')) || 0 } : x)))}
                        placeholder="Allowance"
                        className="w-full h-9 rounded-lg bg-re-bg px-3 outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-inner placeholder:text-re-text-muted/40"
                      />
                    </div>
                    <p className="text-[8px] font-black text-re-text-muted uppercase tracking-widest opacity-50 mt-2">
                      Gross: {formatMoneyRWF((Number(r.base) || 0) + (Number(r.allowance) || 0)).replace('RWF', '')} RWF
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-re-bg/20 border-b border-black/5">
                    <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Staff</th>
                    <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Department</th>
                    <th className="hidden md:table-cell px-6 py-3 text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Rate</th>
                    <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 border-r border-black/5">Gross</th>
                    <th className="px-4 sm:px-6 py-2.5 sm:py-3 text-right text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {filteredStaff.map((s) => {
                    const r = rateById[s.rateId];
                    const gross = (Number(r?.base) || 0) + (Number(r?.allowance) || 0);
                    const userId = s.db_user_id ?? (String(s.id || '').startsWith('STF-') ? Number(String(s.id).replace('STF-', '')) : null);
                    return (
                      <tr key={s.id} className="hover:bg-re-bg/60 even:bg-re-bg/20 transition-colors">
                        <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5">
                          <p className="text-[13px] font-black text-[#1E3A5F] tracking-tight truncate">{s.name}</p>
                          <p className="text-[8px] font-bold text-re-text-muted uppercase tracking-widest leading-none mt-1 opacity-50">{s.id} · {s.role}</p>
                        </td>
                        <td className="hidden md:table-cell px-6 py-3 border-r border-black/5 text-[11px] font-black text-[#1E3A5F]">{s.dept}</td>
                        <td className="hidden md:table-cell px-6 py-3 border-r border-black/5">
                          <select
                            value={s.rateId}
                            onChange={(e) => {
                              const next = e.target.value;
                              setStaff((prev) => prev.map((x) => (x.id === s.id ? { ...x, rateId: next } : x)));
                              if (userId && isPersistedRateId(next)) patchStaff(userId, { rateId: next });
                            }}
                            className="w-full h-8 bg-white/80 rounded-lg outline-none border border-black/5 focus:border-[#1E3A5F]/20 focus:bg-white transition-all text-[#1E3A5F] text-[9px] font-black uppercase tracking-widest shadow-inner cursor-pointer appearance-none px-3"
                          >
                            {rates.map((rr) => (
                              <option key={rr.id} value={rr.id}>{rr.role}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 sm:px-6 py-2.5 sm:py-3 border-r border-black/5 text-right text-[12px] font-black text-[#1E3A5F]">
                          {formatMoneyRWF(gross).replace('RWF', '')}
                        </td>
                        <td className="px-4 sm:px-6 py-2.5 sm:py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              const nextActive = !s.active;
                              setStaff((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: nextActive } : x)));
                              if (userId) patchStaff(userId, { active: nextActive });
                            }}
                            className={`h-7 px-3 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all ${
                              s.active
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-white border-black/5 text-slate-400 hover:bg-re-bg'
                            }`}
                          >
                            {s.active ? 'On' : 'Off'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStaff.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest opacity-40">No staff found.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex px-4 sm:px-8 py-5 bg-re-bg/20 border-t border-black/5 items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <p className="text-[8px] font-black text-re-text-muted uppercase tracking-widest italic opacity-60">
                {filteredStaff.length} staff
              </p>
            </div>
            <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] opacity-40 italic">
              RWF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

