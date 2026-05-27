import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft, Loader2, MapPin, Check, X, User, Phone,
} from 'lucide-react';

export default function TichaDirectPayModal({
  open,
  onClose,
  product,
  quantity,
  amountRwf,
  deliveryMethod,
  initialPayerName = '',
  initialPayerPhone = '',
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [locProvince, setLocProvince] = useState('');
  const [locDistrict, setLocDistrict] = useState('');
  const [locSector, setLocSector] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError(null);
    setSelectedAgent(null);
    setLocProvince('');
    setLocDistrict('');
    setLocSector('');
    setAgents([]);
    setPayerName(String(initialPayerName || '').trim());
    setPayerPhone(String(initialPayerPhone || '').trim());
    let off = false;
    api.get('/locations/provinces')
      .then((r) => {
        if (off) return;
        setProvinces(Array.isArray(r.data?.data) ? r.data.data : []);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !locProvince) {
      setDistricts([]);
      setLocDistrict('');
      setSectors([]);
      setLocSector('');
      return;
    }
    let off = false;
    setGeoLoading(true);
    api.get('/locations/districts', { params: { province: locProvince } })
      .then((r) => {
        if (off) return;
        setDistricts(Array.isArray(r.data?.data) ? r.data.data : []);
        setLocDistrict('');
        setSectors([]);
        setLocSector('');
      })
      .finally(() => !off && setGeoLoading(false));
    return () => {
      off = true;
    };
  }, [open, locProvince]);

  useEffect(() => {
    if (!open || !locProvince || !locDistrict) {
      setSectors([]);
      setLocSector('');
      return;
    }
    let off = false;
    setGeoLoading(true);
    api.get('/locations/sectors', { params: { province: locProvince, district: locDistrict } })
      .then((r) => {
        if (off) return;
        setSectors(Array.isArray(r.data?.data) ? r.data.data : []);
        setLocSector('');
      })
      .finally(() => !off && setGeoLoading(false));
    return () => {
      off = true;
    };
  }, [open, locProvince, locDistrict]);

  useEffect(() => {
    if (!open || !locProvince || !locDistrict) {
      setAgents([]);
      setSelectedAgent(null);
      return;
    }
    let off = false;
    setAgentsLoading(true);
    const base = '/public/agents/find';
    const params = locSector
      ? { province: locProvince, district: locDistrict, sector: locSector }
      : { province: locProvince, district: locDistrict };
    api.get(base, { params })
      .then((r) => {
        if (off) return;
        const list = r.data?.success && Array.isArray(r.data.data) ? r.data.data : [];
        setAgents(list);
        setSelectedAgent(null);
      })
      .catch(() => {
        if (!off) {
          setAgents([]);
          setSelectedAgent(null);
        }
      })
      .finally(() => !off && setAgentsLoading(false));
    return () => {
      off = true;
    };
  }, [open, locProvince, locDistrict, locSector]);

  const goPayments = useCallback(async () => {
    setError(null);
    if (!payerName.trim() || !payerPhone.trim()) {
      setError('Enter payer full name and MTN mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/services/shule-avance/applicant/teacher-deal-pay-token', {
        deal_product_id: Number(product.id),
        quantity: Math.max(1, Number(quantity) || 1),
        agent_user_id: selectedAgent ? Number(selectedAgent.id ?? selectedAgent.user_id) : null,
        payer_name: payerName.trim(),
        payer_phone: payerPhone.trim(),
        province: locProvince,
        district: locDistrict,
        sector: locSector || '',
        delivery_method: deliveryMethod || '',
      });
      const token = res.data?.data?.token;
      if (!res.data?.success || !token) {
        throw new Error(res.data?.message || 'Could not start payment');
      }
      onClose();
      navigate(`/ticha-deals/pay?tdt=${encodeURIComponent(token)}`);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  }, [
    navigate,
    onClose,
    product?.id,
    quantity,
    selectedAgent,
    payerName,
    payerPhone,
    locProvince,
    locDistrict,
    locSector,
    deliveryMethod,
  ]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-[28px] w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl border border-black/5">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-black/5 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            {step === 2 && (
              <button
                type="button"
                onClick={() => { setStep(1); setError(null); }}
                className="p-2 rounded-xl hover:bg-slate-100 text-[#000435]"
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pay directly</p>
              <p className="text-sm font-black text-[#000435] truncate">{product?.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-[#f0f2f9] border border-black/5 px-4 py-3 flex justify-between items-center">
            <span className="text-[11px] font-bold text-slate-500">Total due</span>
            <span className="text-lg font-black text-[#f59e0b]">
              {Math.round(Number(amountRwf) || 0).toLocaleString()} RWF
            </span>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-3 py-2">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-[#000435]">
                <MapPin size={18} className="text-[#f59e0b] shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest">Pick your agent</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                Match province and district to your area. Sector is optional — leave blank to list all agents in the district.
              </p>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Province</label>
                <select
                  value={locProvince}
                  onChange={(e) => setLocProvince(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-slate-50 px-3 py-3 text-sm font-bold text-[#000435]"
                >
                  <option value="">Select province</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">District</label>
                <select
                  value={locDistrict}
                  onChange={(e) => setLocDistrict(e.target.value)}
                  disabled={!locProvince || geoLoading}
                  className="w-full rounded-xl border border-black/10 bg-slate-50 px-3 py-3 text-sm font-bold text-[#000435] disabled:opacity-50"
                >
                  <option value="">Select district</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sector (optional)</label>
                <select
                  value={locSector}
                  onChange={(e) => setLocSector(e.target.value)}
                  disabled={!locDistrict || geoLoading}
                  className="w-full rounded-xl border border-black/10 bg-slate-50 px-3 py-3 text-sm font-bold text-[#000435] disabled:opacity-50"
                >
                  <option value="">All sectors in district</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-3 min-h-[120px]">
                {agentsLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[11px] font-bold">Loading agents…</span>
                  </div>
                )}
                {!agentsLoading && locProvince && locDistrict && agents.length === 0 && (
                  <p className="text-[12px] font-bold text-slate-500 text-center py-6">
                    No agents match this location. Try another sector or continue without selecting (optional).
                  </p>
                )}
                {!agentsLoading && agents.length > 0 && (
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {agents.map((a) => {
                      const id = Number(a.id ?? a.user_id);
                      const sel = selectedAgent && Number(selectedAgent.id ?? selectedAgent.user_id) === id;
                      const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.name || `Agent #${id}`;
                      return (
                        <li key={id}>
                          <button
                            type="button"
                            onClick={() => setSelectedAgent(a)}
                            className={`w-full text-left rounded-xl px-3 py-2.5 border-2 transition-all flex items-center justify-between gap-2 ${
                              sel ? 'border-[#000435] bg-[#000435]/5' : 'border-black/10 hover:border-[#f59e0b]/50'
                            }`}
                          >
                            <span className="text-xs font-black text-[#000435] truncate">{name}</span>
                            {sel && <Check size={16} className="text-emerald-600 shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  if (!locProvince || !locDistrict) {
                    setError('Select province and district to continue.');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full py-4 rounded-2xl bg-[#000435] text-white font-black text-[11px] uppercase tracking-widest shadow-lg"
              >
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-[#000435]">
                <User size={18} className="text-[#f59e0b] shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest">Payer details</span>
              </div>
              <p className="text-[11px] font-bold text-slate-500">
                These details are stored with your payment session. On the next screen you choose MTN MoMo, Airtel, bank, or Visa and complete payment.
              </p>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full name</label>
                <input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-slate-50 px-3 py-3 text-sm font-bold"
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                  <Phone size={12} /> MTN Rwanda number
                </label>
                <input
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-black/10 bg-slate-50 px-3 py-3 text-sm font-bold"
                  placeholder="e.g. 078 …"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={goPayments}
                className="w-full py-4 rounded-2xl bg-[#f59e0b] text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#f59e0b]/25 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue to payment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
