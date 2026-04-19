import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Home,
  Loader2,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Shirt,
  Truck,
} from "lucide-react";
import { getApiBase, getApiOrigin } from "../../utils/apiBase";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";
import { UNIFORM_VOUCHER_CHECKOUT_KEY } from "./UniformVoucherCheckout";

const FONT = `"MTN Brighter Sans","Nunito","Varela Round",sans-serif`;
const API = getApiBase();
const ORIGIN = getApiOrigin();

const UNIFORM_STEPS = [
  { id: 1, label: "Student", short: "Code", icon: GraduationCap },
  { id: 2, label: "Uniform type", short: "Type", icon: Shirt },
  { id: 3, label: "Items", short: "Items", icon: Package },
  { id: 4, label: "Agent", short: "Agent", icon: MapPin },
  { id: 5, label: "Delivery", short: "Ship", icon: Truck },
  { id: 6, label: "Summary", short: "OK", icon: ClipboardList },
  { id: 7, label: "Pay", short: "Pay", icon: CreditCard },
];

function frw(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-RW")} Frw`;
}

function imgSrc(url) {
  if (!url) return null;
  if (String(url).startsWith("http")) return url;
  return `${ORIGIN}${String(url).startsWith("/") ? "" : "/"}${url}`;
}

const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&family=Varela+Round&display=swap');
    *{font-family:"MTN Brighter Sans","Nunito","Varela Round",sans-serif!important}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes pulseAmber{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.35)}50%{box-shadow:0 0 0 7px rgba(251,191,36,0)}}
    @keyframes stepIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
    .spin-anim{animation:spin .9s linear infinite}
    .step-in{animation:stepIn .32s cubic-bezier(.22,1,.36,1) both}
  `}</style>
);

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {UNIFORM_STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-[12px] transition-all duration-300 ${
                  done
                    ? "bg-amber-400 text-[#000435] shadow-md shadow-amber-400/30"
                    : active
                      ? "bg-[#000435] border-2 border-amber-400 text-amber-400 shadow-lg shadow-amber-400/15"
                      : "bg-white/5 border border-white/15 text-white/30"
                }`}
                style={active ? { animation: "pulseAmber 2.2s ease-in-out infinite" } : {}}
              >
                {done ? <Check size={15} strokeWidth={3} /> : <s.icon size={14} />}
              </div>
              <span
                className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[.06em] text-center leading-none hidden xs:block max-w-[56px] truncate ${
                  done ? "text-amber-400" : active ? "text-white" : "text-white/30"
                }`}
              >
                {s.short}
              </span>
            </div>
            {i < UNIFORM_STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-0.5 sm:mx-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{ width: done ? "100%" : active ? "50%" : "0%" }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-[.1em] text-white/40 mb-2">
        {label}
        {required && <span className="text-amber-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-white/35 mt-1.5">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, children, disabled = false }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full h-12 rounded-xl border border-white/15 bg-white/5 text-white text-[13px] font-bold px-4 outline-none appearance-none transition-all ${
          disabled ? "opacity-60 cursor-not-allowed" : "hover:border-white/25 focus:border-amber-400 focus:bg-amber-400/5 cursor-pointer"
        }`}
      >
        {children}
      </select>
      <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none rotate-90" />
    </div>
  );
}

function NavBtns({ onBack, onNext, nextLabel = "Continue", nextDisabled = false, nextLoading = false }) {
  return (
    <div className="flex items-center gap-3 pt-5 mt-1 border-t border-white/8">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/15 text-white/60 font-bold text-[13px] hover:border-white/30 hover:text-white transition-all min-h-[48px]"
        >
          <ArrowLeft size={15} /> Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || nextLoading}
        className={`flex-1 sm:flex-none sm:ml-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-[14px] min-h-[48px] transition-all ${
          nextDisabled || nextLoading ? "bg-white/8 text-white/25 cursor-not-allowed" : "bg-amber-400 text-[#000435] hover:bg-amber-300 shadow-xl shadow-amber-400/20 active:scale-[.98]"
        }`}
      >
        {nextLoading && <Loader2 size={16} className="spin-anim" />}
        {nextLabel} {!nextLoading && <ChevronRight size={16} />}
      </button>
    </div>
  );
}

const inp =
  "w-full h-12 rounded-xl border border-white/15 bg-white/5 text-white text-[14px] font-semibold px-4 outline-none placeholder:text-white/25 hover:border-white/25 focus:border-amber-400 focus:bg-amber-400/5";

/** Taller on mobile (touch + iOS 16px avoids zoom-on-focus) */
const inpStudentCode =
  "w-full flex-1 min-h-[52px] rounded-xl border border-white/15 bg-white/5 text-white font-semibold px-4 py-3.5 outline-none text-[16px] leading-snug sm:min-h-12 sm:h-12 sm:py-0 sm:text-[14px] placeholder:text-white/25 hover:border-white/25 focus:border-amber-400 focus:bg-amber-400/5";

/** Compact header actions — single row on mobile + desktop */
const headerBtnBase =
  "inline-flex items-center justify-center gap-1 min-h-[34px] sm:min-h-[38px] px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl font-black text-[9px] sm:text-[11px] leading-tight transition-all touch-manipulation active:scale-[0.98] shrink-0";

export default function PublicUniformVoucherRequestFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [studentCode, setStudentCode] = useState("");
  const [lookupErr, setLookupErr] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [student, setStudent] = useState(null);

  const [uniformType, setUniformType] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [cart, setCart] = useState({});

  const [deliveryMethod, setDeliveryMethod] = useState("school");
  const [deliveryDetail, setDeliveryDetail] = useState({
    district: "",
    sector: "",
    cell: "",
    village: "",
    phone: "",
    full_address: "",
    instructions: "",
  });

  const [locProvince, setLocProvince] = useState("");
  const [locDistrict, setLocDistrict] = useState("");
  const [locSector, setLocSector] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const [submitErr, setSubmitErr] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");

  const loadItems = useCallback(async (type) => {
    setItemsLoading(true);
    try {
      const r = await fetch(`${API}/uniform-vouchers/public/items?type=${encodeURIComponent(type)}`);
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Failed to load items");
      setItems(Array.isArray(j.data) ? j.data : []);
      setCart({});
      setSubmitErr("");
    } catch (e) {
      setItems([]);
      setSubmitErr(e.message || "Could not load catalog");
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 2 && uniformType) loadItems(uniformType);
  }, [step, uniformType, loadItems]);

  useEffect(() => {
    let off = false;
    fetch(`${API}/locations/provinces`)
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        setProvinces(Array.isArray(j.data) ? j.data : []);
      })
      .catch(() => {});
    return () => {
      off = true;
    };
  }, []);

  useEffect(() => {
    if (!locProvince) {
      setDistricts([]);
      setLocDistrict("");
      setSectors([]);
      setLocSector("");
      return;
    }
    let off = false;
    setGeoLoading(true);
    fetch(`${API}/locations/districts?province=${encodeURIComponent(locProvince)}`)
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        setDistricts(Array.isArray(j.data) ? j.data : []);
        setLocDistrict("");
        setSectors([]);
        setLocSector("");
      })
      .finally(() => !off && setGeoLoading(false));
    return () => {
      off = true;
    };
  }, [locProvince]);

  useEffect(() => {
    if (!locProvince || !locDistrict) {
      setSectors([]);
      setLocSector("");
      return;
    }
    let off = false;
    setGeoLoading(true);
    fetch(`${API}/locations/sectors?province=${encodeURIComponent(locProvince)}&district=${encodeURIComponent(locDistrict)}`)
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        setSectors(Array.isArray(j.data) ? j.data : []);
        setLocSector("");
      })
      .finally(() => !off && setGeoLoading(false));
    return () => {
      off = true;
    };
  }, [locProvince, locDistrict]);

  useEffect(() => {
    if (!locProvince || !locDistrict) {
      setAgents([]);
      setSelectedAgent(null);
      return;
    }
    let off = false;
    setAgentsLoading(true);
    const q = locSector
      ? `${API}/public/agents/find?province=${encodeURIComponent(locProvince)}&district=${encodeURIComponent(locDistrict)}&sector=${encodeURIComponent(locSector)}`
      : `${API}/public/agents/find?province=${encodeURIComponent(locProvince)}&district=${encodeURIComponent(locDistrict)}`;
    fetch(q)
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        if (!j.success) throw new Error(j.message || "Agents failed");
        setAgents(Array.isArray(j.data) ? j.data : []);
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
  }, [locProvince, locDistrict, locSector]);

  const onLookup = async (e) => {
    e.preventDefault();
    setLookupErr("");
    if (studentCode.trim().length < 2) {
      setLookupErr("Enter a valid student code.");
      return;
    }
    setLookupLoading(true);
    try {
      const r = await fetch(`${API}/uniform-vouchers/public/lookup-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_code: studentCode.trim() }),
      });
      const j = await r.json();
      if (!j.success) {
        setLookupErr(j.message || "Student not found");
        return;
      }
      setStudent(j.data.student);
      setStep(1);
    } catch {
      setLookupErr("Network error. Try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const initLine = (item) => {
    const sizes = item.sizes || [];
    const colors = item.colors || [];
    return {
      sel: false,
      size: sizes[0] ? String(sizes[0]) : "",
      color: colors[0] ? String(colors[0]) : "",
      qty: 1,
    };
  };

  const lineFor = (item) => cart[item.id] || initLine(item);

  const setLine = (item, patch) => {
    setCart((c) => ({
      ...c,
      [item.id]: { ...lineFor(item), ...patch },
    }));
  };

  const selectedLines = useMemo(() => {
    return items
      .filter((it) => lineFor(it).sel)
      .map((it) => {
        const L = lineFor(it);
        return {
          item_id: it.id,
          size: L.size,
          color: L.color || undefined,
          qty: L.qty,
        };
      });
  }, [items, cart]);

  const subtotal = useMemo(() => {
    let s = 0;
    for (const it of items) {
      const L = lineFor(it);
      if (!L.sel) continue;
      s += Number(it.price_rwf || 0) * Math.max(1, Number(L.qty) || 1);
    }
    return s;
  }, [items, cart]);

  const deliveryFee = deliveryMethod === "home" ? 2500 : 0;
  const total = subtotal + deliveryFee;

  const goPay = async () => {
    setSubmitErr("");
    if (!student || !uniformType || !selectedLines.length) return;
    if (!selectedAgent?.id) {
      setSubmitErr("Choose a field agent before paying.");
      return;
    }
    if (!payerName.trim() || !payerPhone.trim()) {
      setSubmitErr("Enter payer full name and MTN phone for MoMo (next step).");
      return;
    }
    setOrderBusy(true);
    try {
      const r = await fetch(`${API}/uniform-vouchers/public/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_code: studentCode.trim(),
          uniform_type: uniformType,
          lines: selectedLines,
          agent_user_id: selectedAgent.id,
          delivery_method: deliveryMethod,
          delivery_detail: deliveryMethod === "home" ? deliveryDetail : {},
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        throw new Error(j.message || "Could not create order");
      }
      const d = j.data || {};
      const lineRows = selectedLines.map((ln) => {
        const it = items.find((x) => x.id === ln.item_id);
        const unit = Math.round(Number(it?.price_rwf ?? 0));
        const qty = Math.max(1, Number(ln.qty) || 1);
        return {
          ...ln,
          name: it?.name,
          unit_price_rwf: unit,
          line_total_rwf: unit * qty,
        };
      });
      const clientSub = lineRows.reduce((s, r) => s + (Number(r.line_total_rwf) || 0), 0);
      const clientFee = deliveryMethod === "home" ? 2500 : 0;
      const clientTot = clientSub + clientFee;
      const apiTot = Number(d.total_rwf);
      const apiSub = Number(d.subtotal_rwf);
      const apiFee = Number(d.delivery_fee_rwf);
      const grandTotal =
        Number.isFinite(apiTot) && apiTot >= 0 ? Math.round(apiTot) : Math.round(clientTot);
      const subtotalFinal = Number.isFinite(apiSub) && apiSub >= 0 ? Math.round(apiSub) : Math.round(clientSub);
      const feeFinal =
        Number.isFinite(apiFee) && apiFee >= 0 ? Math.round(apiFee) : Math.round(clientFee);
      const payload = {
        orderId: d.order_id,
        voucherNumber: d.voucher_number,
        orderNumber: d.order_number,
        grandTotal,
        prepared: {
          student,
          uniform_type: uniformType,
          lines: lineRows,
          delivery_method: deliveryMethod,
          delivery_detail: deliveryMethod === "home" ? deliveryDetail : null,
          agent: selectedAgent,
          schoolLocation: { province: locProvince, district: locDistrict, sector: locSector || null },
          totals: {
            subtotal_rwf: subtotalFinal,
            delivery_fee_rwf: feeFinal,
            total_rwf: grandTotal,
          },
        },
      };
      try {
        sessionStorage.setItem(UNIFORM_VOUCHER_CHECKOUT_KEY, JSON.stringify(payload));
      } catch {
        setSubmitErr("Could not save checkout session.");
        return;
      }
      navigate("/payments", {
        state: {
          uniformVoucherPay: { payerName: payerName.trim(), payerPhone: payerPhone.trim() },
        },
      });
    } catch (e) {
      setSubmitErr(e.message || "Failed");
    } finally {
      setOrderBusy(false);
    }
  };

  const canDelivery = () => {
    if (deliveryMethod === "school") return true;
    const need = ["district", "sector", "cell", "village", "phone", "full_address"];
    return need.every((k) => String(deliveryDetail[k] || "").trim());
  };

  const stepDisplay = step + 1;

  return (
    <div className="min-h-screen bg-[#000435]" style={{ fontFamily: FONT }}>
      <FontLoader />

      <div className="sticky top-0 z-20 bg-[#000435]/95 backdrop-blur-xl border-b-[3px] border-amber-400">
        <div className="max-w-4xl mx-auto px-2 sm:px-6 py-2 sm:py-2.5">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-1.5 gap-y-1.5 sm:gap-2 min-w-0">
            <img
              src={babyeyiLogo}
              alt="Babyeyi"
              className="h-6 min-[380px]:h-7 sm:h-8 w-auto max-w-[min(30vw,108px)] min-[380px]:max-w-[118px] sm:max-w-[140px] object-contain object-left shrink-0"
            />
            <Link
              to="/services"
              title="Back to services"
              className={`${headerBtnBase} bg-white/8 border border-white/18 text-white/90 hover:bg-white/12 hover:border-white/28`}
            >
              <ArrowLeft size={12} className="shrink-0 sm:w-[14px] sm:h-[14px]" aria-hidden />
              <span className="text-center truncate max-[380px]:hidden">Back to services</span>
              <span className="text-center hidden max-[380px]:inline">Back</span>
            </Link>
            <Link
              to="/services/uniform-voucher/track"
              title="Track order"
              className={`${headerBtnBase} bg-amber-400 text-[#000435] border border-amber-400 shadow-sm shadow-amber-400/25 hover:bg-amber-300`}
            >
              <ClipboardList size={12} className="shrink-0 sm:w-[14px] sm:h-[14px]" aria-hidden />
              <span className="text-center truncate max-[380px]:hidden">Track order</span>
              <span className="text-center hidden max-[380px]:inline">Track</span>
            </Link>
            <div
              className="flex items-center gap-0.5 sm:gap-1 text-amber-400 shrink-0 ml-auto pl-0.5"
              title="Secure checkout"
              aria-label="Secure checkout"
            >
              <ShieldCheck size={12} className="shrink-0 sm:w-[14px] sm:h-[14px]" aria-hidden />
              <span className="text-[8px] sm:text-[10px] font-bold leading-none whitespace-nowrap max-[320px]:sr-only">Secure</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-7 sm:mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 px-3 py-1.5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-amber-400">Babyeyi Services</span>
          </div>
          <h1 className="font-black text-white text-[24px] sm:text-[28px] tracking-tight leading-tight mb-2">
            Uniform Voucher <span className="text-amber-400">Service</span>
          </h1>
          
        </div>

        <div className="rounded-2xl xl:rounded-3xl bg-white/4 border border-amber-400/20 overflow-hidden shadow-2xl shadow-black/30">
          <div className="px-5 sm:px-6 py-5 border-b border-white/8 bg-[#000435]/50">
            <StepIndicator current={stepDisplay} />
          </div>

          <div className="px-5 sm:px-6 py-6">
            {step === 0 && (
              <div className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1"> Enter Student Code</h2>
                
                <form onSubmit={onLookup}>
                  <Field label="">
                    <div className="flex flex-col sm:flex-row gap-2.5 sm:items-stretch">
                      <input
                        className={inpStudentCode}
                        value={studentCode}
                        onChange={(e) => setStudentCode(e.target.value)}
                        placeholder="e.g. 040080001"
                        autoComplete="off"
                        inputMode="text"
                      />
                      <button
                        type="submit"
                        disabled={lookupLoading}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-[#000435] font-black text-[14px] min-h-[52px] sm:min-h-[48px] w-full sm:w-auto hover:bg-amber-300 disabled:opacity-50 shrink-0"
                      >
                        {lookupLoading ? <Loader2 size={18} className="spin-anim" /> : <Search size={18} />}
                       Find
                      </button>
                    </div>
                  </Field>
                  {lookupErr && <p className="text-[13px] text-red-400 mt-3 font-semibold">{lookupErr}</p>}
                </form>
              </div>
            )}

            {step === 1 && student && (
              <div className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-3">Student &amp; school</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                  {[
                    ["Full name", student.full_name || `${student.first_name} ${student.last_name}`],
                    ["Student code", student.student_code || student.student_uid],
                    ["Gender", student.gender || "—"],
                    ["Class", student.class_name || "—"],
                    ["School", student.school_name || "—"],
                    ["District", student.school_district || student.district || "—"],
                    ["Sector", student.school_sector || student.sector || "—"],
                    ["Cell", student.cell || "—"],
                    ["Father", student.parent_guardian?.father_name || "—"],
                    ["Mother", student.parent_guardian?.mother_name || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                      <p className="text-[10px] font-black uppercase text-white/35 mb-1">{k}</p>
                      <p className="text-[13px] font-bold text-white">{v || "—"}</p>
                    </div>
                  ))}
                </div>
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-3">Choose uniform type</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  {[
                    { id: "school", title: "School uniform", sub: "Shirt, trousers, skirt, sweater…", Icon: Shirt },
                    { id: "sports", title: "Sports uniform", sub: "PE kit, tracksuit, sports shoes…", Icon: Package },
                  ].map(({ id, title, sub, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setUniformType(id);
                        setStep(2);
                      }}
                      className={`text-left rounded-2xl border-2 p-4 transition-all touch-manipulation ${
                        uniformType === id
                          ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/15"
                          : "border-white/12 bg-white/5 hover:border-amber-400/45"
                      }`}
                    >
                      <Icon size={22} className="text-amber-400" />
                      <p className="mt-3 font-black text-white text-[15px]">{title}</p>
                      <p className="mt-1 text-[12px] text-white/45">{sub}</p>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 pt-5 mt-2 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-white/15 text-white/60 font-bold text-[13px] hover:border-white/30 hover:text-white transition-all min-h-[48px]"
                  >
                    <ArrowLeft size={15} /> Back
                  </button>
                </div>
              </div>
            )}

            {step === 2 && uniformType && (
              <div className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1">Select items</h2>
                <p className="text-white/45 text-[13px] mb-4">Pick only what you need — one piece or a full set.</p>
                {itemsLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="spin-anim text-amber-400" size={36} />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((it) => {
                      const L = lineFor(it);
                      const src = imgSrc(it.image_url);
                      return (
                        <div
                          key={it.id}
                          className={`rounded-2xl border-2 p-3 sm:p-4 transition-all ${
                            L.sel ? "border-amber-400 bg-amber-400/10" : "border-white/12 bg-white/5"
                          }`}
                        >
                          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                            <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 shrink-0 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center">
                              {src ? (
                                <img src={src} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Shirt size={28} className="text-white/35" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-black text-white text-[15px]">{it.name}</p>
                                  {it.description && (
                                    <p className="text-[12px] text-white/45 mt-1 leading-snug">{it.description}</p>
                                  )}
                                </div>
                                <label className="flex items-center gap-2 text-[12px] font-bold text-amber-400 cursor-pointer shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={L.sel}
                                    onChange={(e) => setLine(it, { sel: e.target.checked })}
                                    className="h-4 w-4 rounded border-white/30 accent-amber-400"
                                  />
                                  Select
                                </label>
                              </div>
                              <p className="mt-2 font-black text-amber-400 text-[16px]">{frw(it.price_rwf)}</p>
                              {it.stock_qty != null && (
                                <p className={`text-[11px] mt-1 ${it.stock_qty < 5 ? "text-red-400" : "text-white/40"}`}>
                                  Stock: {it.stock_qty}
                                </p>
                              )}
                            </div>
                          </div>
                          {L.sel && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/10">
                              <Field label="Size">
                                <select
                                  value={L.size}
                                  onChange={(e) => setLine(it, { size: e.target.value })}
                                  className={`${inp} cursor-pointer appearance-none`}
                                >
                                  {(it.sizes || []).map((s) => (
                                    <option key={s} value={s} className="bg-[#000435]">
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </Field>
                              {(it.colors || []).length > 0 && (
                                <Field label="Colour">
                                  <select
                                    value={L.color}
                                    onChange={(e) => setLine(it, { color: e.target.value })}
                                    className={`${inp} cursor-pointer appearance-none`}
                                  >
                                    {(it.colors || []).map((s) => (
                                      <option key={s} value={s} className="bg-[#000435]">
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                              )}
                              <Field label="Qty">
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={L.qty}
                                  onChange={(e) =>
                                    setLine(it, { qty: Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)) })
                                  }
                                  className={inp}
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {submitErr && <p className="text-[13px] text-red-400 mt-3">{submitErr}</p>}
                <NavBtns
                  onBack={() => setStep(1)}
                  onNext={() => selectedLines.length && setStep(3)}
                  nextDisabled={!selectedLines.length}
                  nextLabel="Continue"
                />
              </div>
            )}

            {step === 3 && (
              <div className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-2 leading-tight">Find your agent</h2>
                <p className="text-white/45 text-[12px] sm:text-[13px] mb-4 leading-relaxed max-w-prose">
                  Choose province and district that match your school. Add sector if you know it — then we list agents for that area.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3 mb-4">
                  <Field label="Province" required>
                    <Select value={locProvince} onChange={(e) => setLocProvince(e.target.value)} disabled={geoLoading}>
                      <option value="">Choose…</option>
                      {provinces.map((p) => (
                        <option key={p} value={p} className="bg-[#000435]">
                          {p}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="District" required>
                    <Select value={locDistrict} onChange={(e) => setLocDistrict(e.target.value)} disabled={!locProvince || geoLoading}>
                      <option value="">Choose…</option>
                      {districts.map((d) => (
                        <option key={d} value={d} className="bg-[#000435]">
                          {d}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Sector (optional)" hint="Narrows the list when you know it.">
                      <Select value={locSector} onChange={(e) => setLocSector(e.target.value)} disabled={!locDistrict || geoLoading}>
                        <option value="">Any sector in district</option>
                        {sectors.map((s) => (
                          <option key={s} value={s} className="bg-[#000435]">
                            {s}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>

                {agentsLoading && (
                  <div className="flex justify-center py-10 sm:py-8">
                    <Loader2 className="spin-anim text-amber-400" size={34} />
                  </div>
                )}
                {!agentsLoading && locProvince && locDistrict && (
                  <div className="space-y-3 mb-6">
                    {agents.length === 0 ? (
                      <p className="text-[13px] sm:text-[14px] text-white/45 leading-relaxed px-0.5">
                        No agents match this location. Try another sector or contact support.
                      </p>
                    ) : (
                      <>
                        <div
                          className="rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-400/12 to-amber-400/5 px-3.5 py-3.5 sm:px-4 sm:py-4 mb-1"
                          role="status"
                        >
                          <div className="flex gap-2.5 sm:gap-3">
                            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 border border-amber-400/35">
                              <MapPin className="text-amber-300" size={20} strokeWidth={2.25} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-white text-[13px] sm:text-[14px] leading-snug">
                                Select the agent you want
                              </p>
                              <p className="text-white/55 text-[12px] sm:text-[13px] mt-1 leading-relaxed">
                                Based on your location, tap one agent below to continue.
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                      {agents.map((a) => {
                        const sel = selectedAgent?.id === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelectedAgent(a)}
                            className={`w-full min-h-[52px] text-left rounded-xl border px-3.5 py-3.5 sm:px-4 sm:py-4 transition-all touch-manipulation active:scale-[0.99] ${
                              sel ? "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/30" : "border-white/12 bg-white/5 hover:border-amber-400/40"
                            }`}
                          >
                            <p className="font-black text-white text-[14px] sm:text-[15px] leading-snug break-words">
                              {a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim()}
                            </p>
                            <p className="text-[11px] sm:text-[12px] text-amber-200/85 mt-1.5 leading-snug">
                              {a.district}
                              {a.all_sectors ? " · All sectors" : Array.isArray(a.sectors) && a.sectors.length ? ` · ${a.sectors.join(", ")}` : ""}
                            </p>
                            {(a.phone || a.email) && (
                              <p className="text-[11px] sm:text-[12px] text-white/45 mt-1.5 break-all">
                                {a.phone}
                                {a.email ? ` · ${a.email}` : ""}
                              </p>
                            )}
                          </button>
                        );
                      })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <NavBtns onBack={() => setStep(2)} onNext={() => selectedAgent && setStep(4)} nextDisabled={!selectedAgent} />
              </div>
            )}

            {step === 4 && (
              <div className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1">Delivery</h2>
                <p className="text-white/45 text-[13px] mb-4">After your agent, choose how uniforms reach the family.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {[
                    { id: "school", label: "Deliver to school", Icon: Building2, note: student?.school_name || "School address on file" },
                    { id: "home", label: "Deliver at home", Icon: Home, note: "+2,500 Frw delivery fee" },
                  ].map(({ id, label, Icon, note }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDeliveryMethod(id)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        deliveryMethod === id ? "border-amber-400 bg-amber-400/10" : "border-white/12 bg-white/5 hover:border-white/25"
                      }`}
                    >
                      <Icon size={20} className="text-amber-400" />
                      <p className="font-black text-[13px] text-white mt-2">{label}</p>
                      <p className="text-[11px] text-white/40">{note}</p>
                    </button>
                  ))}
                </div>
                {deliveryMethod === "school" && student && (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-400/6 p-4 text-[13px] text-white/80 mb-4">
                    <p className="font-black text-white">{student.school_name}</p>
                    <p className="mt-1">
                      {student.school_district || student.district} · {student.school_sector || student.sector}
                    </p>
                    <p className="mt-2 text-[12px] text-white/45">Uniforms are batched for school delivery where the programme allows.</p>
                  </div>
                )}
                {deliveryMethod === "home" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    {[
                      { key: "district", label: "District", required: true, ph: "District" },
                      { key: "sector", label: "Sector", required: true, ph: "Sector" },
                      { key: "cell", label: "Cell", required: true, ph: "Cell" },
                      { key: "village", label: "Village", required: true, ph: "Village" },
                      { key: "phone", label: "Contact phone", required: true, ph: "07…" },
                      { key: "full_address", label: "Full address", required: true, ph: "Street, house, landmark" },
                    ].map(({ key, label, required, ph }) => (
                      <Field key={key} label={label} required={required}>
                        <input
                          value={deliveryDetail[key]}
                          onChange={(e) => setDeliveryDetail((d) => ({ ...d, [key]: e.target.value }))}
                          className={inp}
                          placeholder={ph}
                          inputMode={key === "phone" ? "tel" : "text"}
                        />
                      </Field>
                    ))}
                    <div className="sm:col-span-2">
                      <Field label="Instructions" hint="Optional — gate, landmark, delivery notes">
                        <input
                          value={deliveryDetail.instructions}
                          onChange={(e) => setDeliveryDetail((d) => ({ ...d, instructions: e.target.value }))}
                          className={inp}
                          placeholder="Optional"
                        />
                      </Field>
                    </div>
                  </div>
                )}
                <NavBtns
                  onBack={() => setStep(3)}
                  onNext={() => canDelivery() && setStep(5)}
                  nextDisabled={!canDelivery()}
                  nextLabel="Continue"
                />
              </div>
            )}

            {step === 5 && (
              <div className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-4">Order summary</h2>
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/6 p-4 mb-4 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">Student</span>
                    <span className="text-white font-bold text-right">
                      {student?.full_name} · {student?.student_code || student?.student_uid}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">School</span>
                    <span className="text-white font-bold text-right">{student?.school_name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">Agent</span>
                    <span className="text-white font-bold text-right">
                      {selectedAgent?.full_name ||
                        `${selectedAgent?.first_name || ""} ${selectedAgent?.last_name || ""}`.trim() ||
                        "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">Uniform type</span>
                    <span className="text-white font-bold capitalize">{uniformType}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
                  <p className="text-[10px] font-black uppercase text-white/35 mb-3">Items</p>
                  {items
                    .filter((it) => lineFor(it).sel)
                    .map((it) => {
                      const L = lineFor(it);
                      return (
                        <div key={it.id} className="flex justify-between gap-2 py-2 border-b border-white/8 last:border-0 text-[13px]">
                          <span className="text-white/90">
                            {it.name} · {L.size}
                            {L.color ? ` · ${L.color}` : ""} × {L.qty}
                          </span>
                          <span className="font-bold text-amber-400 shrink-0">{frw(Number(it.price_rwf) * L.qty)}</span>
                        </div>
                      );
                    })}
                </div>
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/8 p-4 space-y-2">
                  <div className="flex justify-between text-white/85 text-[13px]">
                    <span>Subtotal</span>
                    <span className="font-bold">{frw(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-white/85 text-[13px]">
                    <span>Delivery</span>
                    <span className="font-bold">{frw(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-amber-400/25 font-black text-white text-[18px]">
                    <span>Total</span>
                    <span className="text-amber-400">{frw(total)}</span>
                  </div>
                </div>
                {submitErr && <p className="text-[13px] text-red-400 mt-3">{submitErr}</p>}
                <NavBtns onBack={() => setStep(4)} onNext={() => setStep(6)} nextLabel="Confirm & continue" />
              </div>
            )}

            {step === 6 && (
              <div className="step-in">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/40">
                    <CreditCard className="text-amber-400" size={22} />
                  </div>
                  <div>
                    <h2 className="font-black text-white text-[18px] sm:text-[20px]">Payment</h2>
                    <p className="text-white/45 text-[13px]">We create your order, then open secure MTN MoMo.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-4 text-[14px] text-white/85">
                  <p>
                    Amount due: <span className="font-black text-amber-400">{frw(total)}</span>
                  </p>
                  <p className="text-[12px] text-white/45 mt-2">Confirm who pays — the next screen starts MTN MoMo for this amount.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <Field label="Payer full name">
                    <input value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Parent or guardian" className={inp} />
                  </Field>
                  <Field label="Payer phone (MTN)">
                    <input value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="07…" className={inp} />
                  </Field>
                </div>
                {submitErr && <p className="text-[13px] text-red-400 mb-3">{submitErr}</p>}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(5)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/15 text-white/60 font-bold text-[13px] min-h-[48px] hover:text-white"
                  >
                    <ArrowLeft size={15} /> Back
                  </button>
                  <button
                    type="button"
                    disabled={orderBusy}
                    onClick={goPay}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-[#000435] font-black text-[14px] min-h-[48px] hover:bg-amber-300 disabled:opacity-60"
                  >
                    {orderBusy ? <Loader2 size={18} className="spin-anim" /> : <Truck size={18} />}
                    Create order &amp; pay
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
