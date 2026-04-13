// ================================================================
// StudentServiceCheckout — amber + #000435 redesign, no gradients
// ================================================================
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, ArrowRight, Shield, User, Phone } from "lucide-react";

export const STUDENT_SERVICE_CHECKOUT_KEY = "babyeyi_student_service_checkout";

function formatFrw(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-RW")} Frw`;
}

export default function StudentServiceCheckout() {
  const navigate = useNavigate();
  const [payload, setPayload] = useState(null);
  const [bad, setBad] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STUDENT_SERVICE_CHECKOUT_KEY);
      if (!raw) { setBad(true); return; }
      const p = JSON.parse(raw);
      if (!p?.service?.id || !p?.quote?.amount) { setBad(true); return; }
      setPayload(p);
    } catch { setBad(true); }
  }, []);

  const continueToPay = (e) => {
    e.preventDefault(); setErr("");
    if (!name.trim() || !phone.trim()) { setErr("Enter payer name and MTN full number."); return; }
    if (!payload) return;
    navigate("/payments", { state: { studentServicePay: { payerName: name.trim(), payerPhone: phone.trim() } } });
  };

  if (bad) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <p className="text-slate-700 font-semibold mb-4">Session expired. Start again from the service page.</p>
        <Link to="/services" className="text-amber-600 font-bold underline">Services</Link>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000435]">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  const { service, quote } = payload;
  const st = quote.student;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="bg-[#000435] border-b-4 border-amber-400 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1">
            <Shield size={13} className="text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Secure</span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-10 sm:py-14">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-[#000435] tracking-tight">Payment</h1>
          <p className="mt-1 text-sm font-semibold text-amber-600">{service.name}</p>
        </div>

        {/* Order summary card */}
        <div className="rounded-2xl border-2 border-amber-400 bg-[#000435] p-6 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <div className="h-5 w-1 rounded-full bg-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">Order Summary</span>
          </div>
          <div className="space-y-0 divide-y divide-white/10">
            <div className="flex justify-between items-center py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">Student</span>
              <span className="font-bold text-white text-sm">{st?.first_name} {st?.last_name}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">Service</span>
              <span className="font-semibold text-white/80 text-sm text-right max-w-[55%]">{service.name}</span>
            </div>
            <div className="flex justify-between items-center py-4">
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">Amount due</span>
              <span className="text-2xl font-black text-amber-400">{formatFrw(quote.amount)}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={continueToPay} className="space-y-5">
          {/* Payer name */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <label className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <User size={13} className="text-amber-500" /> Payer Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[15px] font-semibold text-[#000435] placeholder:text-slate-300 focus:border-amber-400 focus:outline-none min-h-[52px]"
              placeholder="Full name"
              autoComplete="name"
            />
          </div>

          {/* Phone */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <label className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <Phone size={13} className="text-amber-500" /> MTN Full Number
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[15px] font-semibold text-[#000435] placeholder:text-slate-300 focus:border-amber-400 focus:outline-none min-h-[52px]"
              placeholder="e.g. 0781234567 or 25078…"
              inputMode="tel"
              autoComplete="tel"
            />
            <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              Rwanda MTN: use your full number including 07… — it will be carried to the payment step.
            </p>
          </div>

          {/* Error */}
          {err && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 font-medium">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
            </div>
          )}

          {/* CTA */}
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-4 text-base font-black text-[#000435] min-h-[56px] hover:bg-amber-300 transition"
          >
            Continue to pay
            <ArrowRight className="h-5 w-5" />
          </button>

          {/* Trust note */}
          <div className="text-center">
            <span className="text-xs text-slate-400 font-medium">🔒 Secured by Babyeyi · MTN MoMo Rwanda</span>
          </div>
        </form>
      </div>
    </div>
  );
}