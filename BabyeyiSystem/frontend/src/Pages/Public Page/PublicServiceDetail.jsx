// ================================================================
// PublicServiceDetail — amber + #000435 navy redesign
// ================================================================
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MapPin,
  Sparkles,
  Wallet,
  Tag,
} from "lucide-react";
import { STUDENT_SERVICE_CHECKOUT_KEY } from "./StudentServiceCheckout";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API = `${SERVER}/api`;
const UPLOADS = import.meta.env.VITE_UPLOADS_BASE || SERVER;

function assetUrl(p) {
  if (!p || typeof p !== "string") return null;
  const x = p.replace(/\\/g, "/").trim();
  if (x.startsWith("http")) return x;
  const b = UPLOADS.replace(/\/$/, "");
  return b + (x.startsWith("/") ? x : `/${x}`);
}

function formatFrw(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-RW")} Frw`;
}

export default function PublicServiceDetail() {
  const { idOrCode } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [svc, setSvc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [step, setStep] = useState("detail");
  const [code, setCode] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErr, setQuoteErr] = useState("");
  const [quote, setQuote] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const enc = encodeURIComponent(idOrCode || "");
      const res = await fetch(`${API}/student-services/public/services/${enc}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) throw new Error(j.message || "Service not found");
      setSvc(j.data);
    } catch (e) {
      setErr(e.message || "Failed to load"); setSvc(null);
    } finally { setLoading(false); }
  }, [idOrCode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const fromUrl = searchParams.get("code");
    if (fromUrl) setCode(fromUrl);
  }, [searchParams]);

  const priceRows = svc?.prices || [];
  const byLevel = useMemo(() => priceRows.filter((p) => p.pricing_type === "level" && p.is_active), [priceRows]);
  const globalRow = useMemo(() => priceRows.find((p) => p.pricing_type === "global"), [priceRows]);
  const schoolRows = useMemo(() => priceRows.filter((p) => p.pricing_type === "school"), [priceRows]);

  const runQuote = async (e) => {
    e.preventDefault(); setQuoteErr(""); setQuote(null);
    const raw = code.trim();
    if (raw.length < 3) { setQuoteErr("Enter a valid student code or SDM ID."); return; }
    if (!svc?.id) return;
    setQuoteLoading(true);
    try {
      const res = await fetch(`${API}/student-services/public/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: svc.id, student_code: raw }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) { setQuoteErr(j.message || "Could not get price"); if (j.data?.student) setQuote({ error: true, partial: j.data }); return; }
      setQuote(j.data); setStep("confirm");
    } catch { setQuoteErr("Network error. Try again."); }
    finally { setQuoteLoading(false); }
  };

  const goPay = () => {
    if (!quote || !svc) return;
    try {
      sessionStorage.setItem(STUDENT_SERVICE_CHECKOUT_KEY, JSON.stringify({ service: svc, quote, studentCodeInput: code.trim(), savedAt: Date.now() }));
    } catch { setQuoteErr("Could not continue. Enable storage for this site."); return; }
    navigate("/services/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000435]">
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (err || !svc) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <p className="text-slate-700 font-semibold mb-4">{err || "Unavailable"}</p>
        <Link to="/services" className="text-amber-600 font-bold underline">All services</Link>
      </div>
    );
  }

  const img = assetUrl(svc.icon_url);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top nav ─────────────────────────────────────────── */}
      <div className="bg-[#000435] border-b-4 border-amber-400 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/services" className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300">
            <ArrowLeft size={18} /> Services
          </Link>
          <span className="text-xs font-black uppercase tracking-widest text-white/40">Detail</span>
        </div>
      </div>

      {/* ── Hero band ────────────────────────────────────────── */}
      <div className="bg-[#000435]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-10">
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1 mb-4">
            <Sparkles size={13} className="text-amber-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">{svc.category || "Service"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight">{svc.name}</h1>
          {svc.short_tagline && <p className="mt-2 text-lg text-amber-400 font-semibold">{svc.short_tagline}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
              <Calendar size={13} className="text-amber-400" /> Year {svc.academic_year}
            </span>
            {svc.validity_end && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
                Until {String(svc.validity_end).slice(0, 10)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left col */}
          <div className="space-y-6">
            {/* Image */}
            {img ? (
              <div className="rounded-2xl overflow-hidden border-2 border-amber-400/30 shadow-lg">
                <img src={img} alt="" className="w-full h-56 sm:h-72 object-cover" />
              </div>
            ) : (
              <div className="rounded-2xl h-56 sm:h-72 bg-[#000435] border-2 border-amber-400/30 flex items-center justify-center">
                <Wallet className="w-14 h-14 text-amber-400/40" />
              </div>
            )}

            {/* About */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-5 w-1 rounded-full bg-amber-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-[#000435]">About</h2>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {svc.description || "Professional student support service on Babyeyi."}
              </p>
              {svc.delivery_method && (
                <p className="mt-4 text-xs text-slate-500">
                  <strong className="text-slate-700">Delivery / collection:</strong> {svc.delivery_method}
                </p>
              )}
              {svc.terms_conditions && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-bold text-amber-700">Terms &amp; conditions</summary>
                  <p className="mt-2 text-xs text-slate-500 whitespace-pre-wrap">{svc.terms_conditions}</p>
                </details>
              )}
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-6">
            {/* Pricing */}
            <div className="rounded-2xl border-2 border-amber-400 bg-[#000435] p-6">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap size={18} className="text-amber-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">Pricing</h2>
              </div>

              {svc.default_pricing_type === "by_level" && (
                <p className="text-[11px] text-white/50 mb-4 leading-relaxed">
                  Student class maps to a level band: Nursery (N1–N3), Pre-primary (P1–P3), Upper-Primary (P4–P6), O-Level (S1–S3), A-Level (S4–S6).
                </p>
              )}
              {svc.default_pricing_type === "global" && globalRow && (
                <p className="text-3xl font-black text-white">
                  {formatFrw(globalRow.amount)}
                  <span className="text-sm font-semibold text-white/40 ml-2">{globalRow.currency || "FRW"}</span>
                </p>
              )}
              {svc.default_pricing_type === "by_level" && byLevel.length > 0 && (
                <ul className="divide-y divide-white/10">
                  {byLevel.map((r) => (
                    <li key={r.id} className="flex justify-between items-center py-2.5">
                      <span className="text-white/80 text-sm font-medium">{r.level}</span>
                      <span className="font-black text-amber-400">{formatFrw(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {svc.default_pricing_type === "by_school" && schoolRows.length > 0 && (
                <p className="text-xs text-white/50">Prices vary by school — your amount is calculated after student lookup.</p>
              )}
              {svc.price_from != null && (
                <p className="mt-3 text-[11px] text-white/40">
                  Range: {formatFrw(svc.price_from)}
                  {svc.price_to != null && Number(svc.price_to) !== Number(svc.price_from) ? ` – ${formatFrw(svc.price_to)}` : ""}
                </p>
              )}
            </div>

            {/* Pay form */}
            {step === "detail" && (
              <form onSubmit={runQuote} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet size={18} className="text-amber-500" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-[#000435]">Pay</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Enter the student's Babyeyi code or SDM ID. We'll map their class to a level band and apply the matching price.
                </p>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Student code / SDM ID</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-[#000435] font-semibold placeholder:text-slate-300 focus:border-amber-400 focus:outline-none min-h-[52px]"
                  placeholder="e.g. 040080001"
                  autoComplete="off"
                />
                {quoteErr && <p className="mt-3 text-sm text-red-600 font-medium">{quoteErr}</p>}
                <button
                  type="submit"
                  disabled={quoteLoading}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#000435] text-amber-400 font-black py-3.5 min-h-[52px] hover:bg-[#000c6b] transition disabled:opacity-50"
                >
                  {quoteLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Check price &amp; student <ArrowRight size={18} />
                </button>
              </form>
            )}

            {/* Confirm */}
            {step === "confirm" && quote && (
              <div className="rounded-2xl border-2 border-amber-400 bg-[#000435] p-6 space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider">
                  <CheckCircle2 size={18} /> Ready to pay
                </div>
                <div className="space-y-2 text-sm divide-y divide-white/10">
                  <div className="flex justify-between py-2.5">
                    <span className="text-white/50">Student</span>
                    <strong className="text-white">{quote.student.first_name} {quote.student.last_name}</strong>
                  </div>
                  <div className="flex items-start gap-2 py-2.5">
                    <MapPin size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-white/80">{quote.student.school_name}</span>
                  </div>
                  <div className="flex justify-between py-2.5">
                    <span className="text-white/50">Class</span>
                    <strong className="text-white">{quote.student.class_name || "—"}</strong>
                  </div>
                  {quote.inferred_level && (
                    <div className="flex justify-between py-2.5">
                      <span className="text-white/50">Level</span>
                      <strong className="text-amber-400">{quote.inferred_level}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-3">
                    <span className="text-white/50">Amount</span>
                    <span className="text-2xl font-black text-amber-400">{formatFrw(quote.amount)}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep("detail"); setQuote(null); }}
                    className="flex-1 rounded-xl border border-white/20 py-3 text-sm font-bold text-white/80 hover:bg-white/5 transition"
                  >
                    Edit code
                  </button>
                  <button
                    type="button"
                    onClick={goPay}
                    className="flex-1 rounded-xl bg-amber-400 text-[#000435] font-black py-3 text-sm hover:bg-amber-300 transition"
                  >
                    Continue to payment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}