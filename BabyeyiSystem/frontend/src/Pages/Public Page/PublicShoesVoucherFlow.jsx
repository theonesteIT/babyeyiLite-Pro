/**
 * Shoes Voucher — wizard aligned with PublicPayBySchool (#000435 + amber)
 * Steps: Student → Shoe details → Package & price → Agent → Delivery → Review → /payments
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle, ArrowLeft, Building2, Check, ChevronRight, Footprints,
  GraduationCap, Home, Loader2, MapPin, Search, ShieldCheck, Truck,
  ShoppingBag, X, ZoomIn,
} from "lucide-react";
import { getApiBase, getApiOrigin } from "../../utils/apiBase";
import { STUDENT_SERVICE_CHECKOUT_KEY } from "./StudentServiceCheckout";
import mentorImg from "../../assets/shoe-models/mentor.png";
import bataToughesImg from "../../assets/shoe-models/bata-toughes.png";
import crabkidsImg from "../../assets/shoe-models/crabkids.png";

const API = getApiBase();
const FONT = `"MTN Brighter Sans","Nunito","Varela Round",sans-serif`;

/** Shown as a top-right toast when the chosen size is not allowed for the package / catalog. */
const SIZE_UNAVAILABLE_FOR_PACKAGE_MSG = "This size is not available for this package.";
const SIZE_TOAST_MS = 5200;

/** Saved when navigating to /payments so “Back to shoes voucher” can reopen the review step. */
const SHOES_VOUCHER_WIZARD_RESUME_KEY = "babyeyi_shoes_voucher_wizard_resume_v1";

const FontLoader = () => (
  <style>{`
    @keyframes stepIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes pulseAmber{0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,.35)}50%{box-shadow:0 0 0 7px rgba(251,191,36,0)}}
    @keyframes toastSlideIn{from{opacity:0;transform:translateX(calc(100% + 24px))}to{opacity:1;transform:translateX(0)}}
    @keyframes toastProgress{from{transform:scaleX(1)}to{transform:scaleX(0)}}
    .step-in{animation:stepIn .32s cubic-bezier(.22,1,.36,1) both}
    .fade-in{animation:fadeIn .28s cubic-bezier(.22,1,.36,1) both}
    .spin-anim{animation:spin .9s linear infinite}
    .toast-banner{animation:toastSlideIn .42s cubic-bezier(.22,1,.36,1) both}
    .toast-progress-bar{transform-origin:left center;animation:toastProgress ${SIZE_TOAST_MS}ms linear forwards}
  `}</style>
);

const STEPS = [
  { id: 1, label: "Student", short: "Code", icon: GraduationCap },
  { id: 2, label: "Shoe details", short: "Size", icon: Footprints },
  { id: 3, label: "Package & price", short: "Price", icon: ShoppingBag },
  { id: 4, label: "Agent", short: "Agent", icon: MapPin },
  { id: 5, label: "Delivery", short: "Ship", icon: Truck },
  { id: 6, label: "Review", short: "OK", icon: ShoppingBag },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {STEPS.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-[12px] transition-all duration-300 ${
                  done ? "bg-amber-400 text-[#000435] shadow-md shadow-amber-400/30"
                    : active ? "bg-[#000435] border-2 border-amber-400 text-amber-400 shadow-lg shadow-amber-400/15"
                    : "bg-white/5 border border-white/15 text-white/30"
                }`}
                style={active ? { animation: "pulseAmber 2.2s ease-in-out infinite" } : {}}
              >
                {done ? <Check size={15} strokeWidth={3} /> : <s.icon size={14} />}
              </div>
              <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-[.06em] text-center leading-none hidden xs:block max-w-[56px] truncate ${
                done ? "text-amber-400" : active ? "text-white" : "text-white/30"
              }`}>{s.short}</span>
            </div>
            {i < STEPS.length - 1 && (
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

const fallbackVouchers = [
  { id: "shoe-nursery", name: "Nursery Shoes Voucher", short_tagline: "Nursery", description: "Comfortable school shoes for nursery students.", price_from: 9500, status: "active", service_code: "SHOE-NURSERY" },
  { id: "shoe-primary", name: "Primary Shoes Voucher", short_tagline: "P1–P6", description: "Durable, daily-use shoes for primary school learners.", price_from: 13000, status: "active", service_code: "SHOE-PRIMARY" },
  { id: "shoe-secondary", name: "Secondary Shoes Voucher", short_tagline: "S1–S6", description: "Formal school shoes for lower and upper secondary.", price_from: 18000, status: "active", service_code: "SHOE-SECONDARY" },
  { id: "shoe-sports", name: "Sports Shoes Voucher", short_tagline: "Sports", description: "Athletic shoes for school sports and activities.", price_from: 22000, status: "active", service_code: "SHOE-SPORTS" },
];

const SHOE_MODELS = [
  {
    id: "mentor",
    name: "Mentor",
    blurb: "Classic school profile",
    src: mentorImg,
  },
  {
    id: "bata-toughes",
    name: "Bata Toughes",
    blurb: "Hard-wearing everyday",
    src: bataToughesImg,
  },
  {
    id: "crabkids",
    name: "Crabkids",
    blurb: "Youth-friendly fit",
    src: crabkidsImg,
  },
];

/** Normalizes slugs/names so Super Admin "Bata Toughes" matches id `bata-toughes`. */
function normShoeModelSlug(x) {
  return String(x ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

/**
 * Whether a catalog package belongs to a canonical line (mentor | bata-toughes | crabkids).
 * Super Admin assigns `shoe_brand_model_id` (slug + name on `shoe_brand_models`); legacy rows may use JSON `shoe_models[].model_id`.
 */
function voucherBelongsToCanonicalShoesModel(voucher, canonicalSlug) {
  const want = normShoeModelSlug(canonicalSlug);
  if (!SHOE_MODELS.some((m) => m.id === want)) return false;

  const preset = SHOE_MODELS.find((m) => m.id === want);

  const bm = voucher?.shoe_brand_model;
  if (bm && (bm.slug || bm.name)) {
    if (bm.slug && normShoeModelSlug(bm.slug) === want) return true;
    if (preset && bm.name) {
      const bn = bm.name.trim().toLowerCase().replace(/\s+/g, "");
      const pn = preset.name.trim().toLowerCase().replace(/\s+/g, "");
      if (bn === pn) return true;
    }
  }

  const raw = voucher?.shoe_models;
  if (Array.isArray(raw)) {
    for (const m of raw) {
      const mid = m?.model_id ?? m?.id;
      if (mid != null && normShoeModelSlug(mid) === want) return true;
    }
  }

  return false;
}

function frw(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-RW")} Frw`;
}

/** Normalize shoe size for comparison (matches Super Admin comma list, e.g. 20, 36) */
function normSizeStr(s) {
  return String(s ?? "").trim();
}

function parseAvailableSizes(v) {
  const raw = v?.available_sizes;
  if (Array.isArray(raw)) return raw.map((x) => normSizeStr(x)).filter(Boolean);
  return [];
}

function sizesMatch(entered, allowed) {
  const a = normSizeStr(entered);
  const b = normSizeStr(allowed);
  if (!a || !b) return false;
  if (a.toLowerCase() === b.toLowerCase()) return true;
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb) && na === nb) return true;
  return false;
}

function unionAvailableSizes(voucherList) {
  const set = new Set();
  for (const v of voucherList) {
    for (const x of parseAvailableSizes(v)) set.add(normSizeStr(x));
  }
  return [...set];
}

function sizeAllowedInList(size, list) {
  if (!list.length) return true;
  return list.some((s) => sizesMatch(size, s));
}

/** Models offered for a package: brand model from Super Admin, else JSON list, else default 3 local assets */
function buildPublicModelOptions(voucher) {
  const origin = getApiOrigin();
  const bm = voucher?.shoe_brand_model;
  if (bm && (bm.name || bm.image_url)) {
    const u = bm.image_url ? String(bm.image_url) : "";
    const src = u
      ? (u.startsWith("http") ? u : `${origin}${u.startsWith("/") ? u : `/${u}`}`)
      : SHOE_MODELS[0]?.src;
    const id = bm.slug ? String(bm.slug) : `bm-${bm.id}`;
    return [{ id, name: bm.name || "Shoe model", blurb: "", src: src || SHOE_MODELS[0]?.src }];
  }
  const raw = voucher?.shoe_models;
  if (Array.isArray(raw) && raw.length) {
    return raw.map((m) => {
      const id = m.model_id || m.id;
      const preset = SHOE_MODELS.find((x) => x.id === id);
      let src = preset?.src;
      if (m.image_url) {
        const u = String(m.image_url);
        src = u.startsWith("http") ? u : `${origin}${u.startsWith("/") ? u : `/${u}`}`;
      }
      return {
        id,
        name: preset?.name || id,
        blurb: preset?.blurb || "",
        src: src || preset?.src,
      };
    });
  }
  return SHOE_MODELS.map((m) => ({ id: m.id, name: m.name, blurb: m.blurb, src: m.src }));
}

/** Hero image for a catalog package card (brand model photo, else first configured style, else default). */
function packageHeroImage(voucher) {
  const origin = getApiOrigin();
  const bm = voucher?.shoe_brand_model;
  if (bm?.image_url) {
    const u = String(bm.image_url);
    return u.startsWith("http") ? u : `${origin}${u.startsWith("/") ? u : `/${u}`}`;
  }
  const opts = buildPublicModelOptions(voucher);
  if (opts.length && opts[0].src) return opts[0].src;
  return mentorImg;
}

/** Preferred style id for checkout meta (single- or multi-package). */
function pickPreferredModelForPackage(voucher, shoeState) {
  const opts = buildPublicModelOptions(voucher);
  if (!opts.length) return "";
  if (opts.length === 1) return opts[0].id;
  if (shoeState.preferredModel && opts.some((o) => o.id === shoeState.preferredModel)) {
    return shoeState.preferredModel;
  }
  return opts[0].id;
}

function Field({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-[.1em] text-white/40 mb-2">
        {label}{required && <span className="text-amber-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-400 font-semibold mt-1.5">{error}</p>}
      {hint && !error && <p className="text-[11px] text-white/35 mt-1.5">{hint}</p>}
    </div>
  );
}

function SizeUnavailableToast({ message, animationKey, onDismiss }) {
  if (!message) return null;
  return (
    <div
      className="toast-banner fixed top-4 right-4 z-[200] w-[min(92vw,380px)] pointer-events-auto"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-[#06082e] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65),0_0_0_1px_rgba(251,191,36,0.15)] backdrop-blur-xl"
        style={{ boxShadow: "0 20px 50px -12px rgba(0,0,0,0.65), 0 0 40px -8px rgba(251,191,36,0.25)" }}
      >
        <div className="flex gap-3 p-4 pr-10">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-400/40">
            <AlertCircle className="text-amber-400" size={22} strokeWidth={2.25} aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400/90 mb-1">Size unavailable</p>
            <p className="text-[14px] font-semibold leading-snug text-white">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Dismiss notification"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
        <div className="h-1 w-full bg-white/10">
          <div key={animationKey} className="toast-progress-bar h-full bg-gradient-to-r from-amber-500 to-amber-300" />
        </div>
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", icon: Icon, className = "", onKeyDown, onBlur: onBlurProp }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border transition-all ${
      focused ? "border-amber-400 bg-amber-400/5 shadow-lg shadow-amber-400/10" : "border-white/15 bg-white/5 hover:border-white/25"
    } px-3.5 h-12`}>
      {Icon && <Icon size={15} className={focused ? "text-amber-400" : "text-white/35"} />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          onBlurProp?.(e);
        }}
        className={`flex-1 bg-transparent text-white text-[14px] font-semibold placeholder:text-white/25 outline-none ${className}`}
      />
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

/** Tap thumbnail → large preview (Escape or backdrop to close). */
function ShoeImageLightbox({ preview, onClose }) {
  useEffect(() => {
    if (!preview?.src) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [preview?.src, onClose]);

  if (!preview?.src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged shoe image"
      className="fixed inset-0 z-[240] flex flex-col items-center justify-center p-3 sm:p-6 bg-black/82 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors"
        aria-label="Close image preview"
      >
        <X size={22} strokeWidth={2.5} />
      </button>
      <div
        className="relative w-full max-w-[min(96vw,920px)] max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 bg-[#0a0c3a] max-h-[calc(90vh-3rem)] flex items-center justify-center">
          <img
            src={preview.src}
            alt={preview.label ? `${preview.label} — enlarged` : "Shoe — enlarged"}
            className="max-h-[min(78vh,820px)] w-auto max-w-full object-contain"
            draggable={false}
          />
        </div>
        {preview.label ? (
          <p className="mt-3 sm:mt-4 text-center text-white font-bold text-[13px] sm:text-[14px] px-2 leading-snug max-w-lg">
            {preview.label}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-white/45">Tap outside or press Esc to close</p>
      </div>
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
          nextDisabled || nextLoading
            ? "bg-white/8 text-white/25 cursor-not-allowed"
            : "bg-amber-400 text-[#000435] hover:bg-amber-300 shadow-xl shadow-amber-400/20 active:scale-[.98]"
        }`}
      >
        {nextLoading && <Loader2 size={16} className="spin-anim" />}
        {nextLabel} {!nextLoading && <ChevronRight size={16} />}
      </button>
    </div>
  );
}

function normalizeMethod(m) {
  const v = String(m || "").toLowerCase();
  if (v.includes("home")) return "home_delivery";
  if (v.includes("branch") || v.includes("office")) return "branch_collection";
  return "school_collection";
}

export default function PublicShoesVoucherFlow() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const shoesResumeAgentPickRef = useRef(null);
  const shoesResumeAppliedRef = useRef(false);
  const [step, setStep] = useState(1);
  const [stepKey, setStepKey] = useState(0);
  const goStep = useCallback((n) => {
    setStep(n);
    setStepKey((k) => k + 1);
  }, []);

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [voucherErr, setVoucherErr] = useState("");
  const [vouchers, setVouchers] = useState([]);
  const [defaultServiceId, setDefaultServiceId] = useState(null);

  const [studentCode, setStudentCode] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErr, setQuoteErr] = useState("");
  const [quote, setQuote] = useState(null);

  const [shoe, setShoe] = useState({
    size: "",
    genderType: "",
    category: "",
    preferredModel: "",
    quantity: 1,
  });

  /** Step 3: multi-select package ids (packages under chosen Shoes Model) */
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  /** Step 3: canonical slug mentor | bata-toughes | crabkids (matches Super Admin shoe_brand_models.slug) */
  const [selectedShoesModelSlug, setSelectedShoesModelSlug] = useState(null);
  const [priceQuoteLoading, setPriceQuoteLoading] = useState(false);
  /** Step 2: blocks Continue when entered size is outside catalog sizes (toast shows the message). */
  const [sizeNotAllowed, setSizeNotAllowed] = useState(false);
  const [sizeToast, setSizeToast] = useState({ text: null, tick: 0 });
  /** Step 3: full-screen shoe photo preview */
  const [shoeImagePreview, setShoeImagePreview] = useState(null);
  const closeShoePreview = useCallback(() => setShoeImagePreview(null), []);

  const showSizeUnavailableToast = useCallback((msg = SIZE_UNAVAILABLE_FOR_PACKAGE_MSG) => {
    setSizeToast((t) => ({ text: msg, tick: t.tick + 1 }));
  }, []);

  useEffect(() => {
    if (!sizeToast.text) return;
    const id = setTimeout(
      () => setSizeToast((t) => ({ ...t, text: null })),
      SIZE_TOAST_MS
    );
    return () => clearTimeout(id);
  }, [sizeToast.text, sizeToast.tick]);

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

  const [delivery, setDelivery] = useState({
    method: "school_collection",
    district: "",
    sector: "",
    cell: "",
    village: "",
    phone: "",
    exactAddress: "",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setCatalogLoading(true);
      setVoucherErr("");
      try {
        const r = await fetch(`${API}/student-services/public/services`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.success) throw new Error(j.message || "Failed to load services");
        const list = Array.isArray(j.data) ? j.data : [];
        const shoes = list.filter((s) => {
          const hay = `${s.name || ""} ${s.service_code || ""} ${s.category || ""}`.toLowerCase();
          return hay.includes("shoe") || hay.includes("voucher");
        });
        if (!mounted) return;
        const use = shoes.length ? shoes : fallbackVouchers;
        setVouchers(use);
        const firstNum = use.find((x) => Number.isFinite(Number(x.id)));
        if (firstNum) setDefaultServiceId(Number(firstNum.id));
      } catch (e) {
        if (!mounted) return;
        setVoucherErr(e.message || "Could not load catalog");
        setVouchers(fallbackVouchers);
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

  useEffect(() => {
    if (!shoesResumeAgentPickRef.current || !agents.length) return;
    const want = shoesResumeAgentPickRef.current;
    const wantId = Number(want?.id ?? want?.user_id);
    if (!Number.isFinite(wantId)) return;
    const m = agents.find((a) => Number(a?.id ?? a?.user_id) === wantId);
    if (m) {
      setSelectedAgent(m);
      shoesResumeAgentPickRef.current = null;
    }
  }, [agents]);

  useEffect(() => {
    if (shoesResumeAppliedRef.current) return;
    if (searchParams.get("resumeStep") !== "6") return;
    if (!vouchers.length) return;
    let raw;
    try {
      raw = sessionStorage.getItem(SHOES_VOUCHER_WIZARD_RESUME_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let blob;
    try {
      blob = JSON.parse(raw);
    } catch {
      return;
    }
    if (!blob?.quote) return;
    shoesResumeAppliedRef.current = true;
    setStudentCode(String(blob.studentCode || "").trim());
    setShoe(
      blob.shoe && typeof blob.shoe === "object"
        ? { size: "", genderType: "", category: "", preferredModel: "", quantity: 1, ...blob.shoe }
        : { size: "", genderType: "", category: "", preferredModel: "", quantity: 1 }
    );
    setDelivery(
      blob.delivery && typeof blob.delivery === "object"
        ? {
            method: "school_collection",
            district: "",
            sector: "",
            cell: "",
            village: "",
            phone: "",
            exactAddress: "",
            ...blob.delivery,
          }
        : {
            method: "school_collection",
            district: "",
            sector: "",
            cell: "",
            village: "",
            phone: "",
            exactAddress: "",
          }
    );
    setSelectedPackageIds(Array.isArray(blob.selectedPackageIds) ? blob.selectedPackageIds : []);
    setSelectedShoesModelSlug(blob.selectedShoesModelSlug || null);
    setLocProvince(String(blob.locProvince || ""));
    setLocDistrict(String(blob.locDistrict || ""));
    window.setTimeout(() => {
      setLocSector(blob.locSector != null ? String(blob.locSector) : "");
    }, 120);
    setQuote(blob.quote);
    if (blob.selectedAgent) shoesResumeAgentPickRef.current = blob.selectedAgent;
    goStep(6);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("resumeStep");
        return n;
      },
      { replace: true }
    );
  }, [searchParams, vouchers, goStep, setSearchParams]);

  const packagesForStep3 = useMemo(() => {
    if (!selectedShoesModelSlug) return [];
    return vouchers.filter((v) => voucherBelongsToCanonicalShoesModel(v, selectedShoesModelSlug));
  }, [vouchers, selectedShoesModelSlug]);

  const student = quote?.student || {};

  const selectedPackages = useMemo(() => {
    const set = new Set(selectedPackageIds);
    return packagesForStep3.filter((v) => set.has(v.id));
  }, [packagesForStep3, selectedPackageIds]);

  const primaryPackage = selectedPackages[0] || null;

  const baseAmount = useMemo(() => {
    const q = Math.max(1, Number(shoe.quantity || 1));
    if (selectedPackages.length) {
      return selectedPackages.reduce(
        (sum, v) => sum + Math.max(0, Number(v.price_from || 0)) * q,
        0
      );
    }
    const a = quote?.amount ?? 0;
    return Math.max(0, Number(a) || 0);
  }, [selectedPackages, quote, shoe.quantity]);

  const configuredDeliveryFee = useMemo(() => {
    if (!selectedPackages.length) return 0;
    return Math.max(0, ...selectedPackages.map((v) => Number(v.delivery_fee ?? 0) || 0));
  }, [selectedPackages]);

  const deliveryFee = useMemo(() => {
    if (delivery.method === "home_delivery") return configuredDeliveryFee;
    return 0;
  }, [delivery.method, configuredDeliveryFee]);

  const total = Math.max(0, baseAmount + deliveryFee);

  const modelOptionsForSelected = useMemo(
    () => (primaryPackage ? buildPublicModelOptions(primaryPackage) : []),
    [primaryPackage]
  );

  const stylePickRequired = useMemo(() => {
    if (selectedPackages.length !== 1) return false;
    return buildPublicModelOptions(selectedPackages[0]).length > 1;
  }, [selectedPackages]);

  useEffect(() => {
    if (selectedPackages.length !== 1 || !primaryPackage) return;
    const ids = buildPublicModelOptions(primaryPackage).map((m) => m.id);
    setShoe((p) => {
      if (ids.length === 1) return { ...p, preferredModel: ids[0] };
      if (p.preferredModel && !ids.includes(p.preferredModel)) return { ...p, preferredModel: "" };
      return p;
    });
  }, [selectedPackages.length, primaryPackage]);

  const togglePackageSelect = useCallback((pkg) => {
    const id = pkg.id;
    setSelectedPackageIds((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }, []);

  const runStudentLookup = async () => {
    setQuoteErr("");
    if (studentCode.trim().length < 3) {
      setQuoteErr("Enter student code or registration number.");
      return;
    }
    if (!defaultServiceId) {
      setQuoteErr("Service catalog not ready. Try again in a moment.");
      return;
    }
    setQuoteLoading(true);
    try {
      const res = await fetch(`${API}/student-services/public/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: defaultServiceId, student_code: studentCode.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.success && j.data) {
        setQuote(j.data);
        goStep(2);
        return;
      }
      if (j.data?.student) {
        setQuote({
          student: j.data.student,
          amount: null,
          service: j.data.service,
          inferred_level: j.data.inferred_level,
          message: j.message,
        });
        goStep(2);
        return;
      }
      throw new Error(j.message || "Could not find student or price.");
    } catch (e2) {
      setQuoteErr(e2.message || "Lookup failed");
    } finally {
      setQuoteLoading(false);
    }
  };

  const refreshPriceForVoucher = async (v) => {
    if (!v || !Number.isFinite(Number(v.id))) {
      setQuote((q) => ({ ...q, amount: Number(v.price_from || 0) }));
      return true;
    }
    setPriceQuoteLoading(true);
    try {
      const res = await fetch(`${API}/student-services/public/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: Number(v.id), student_code: studentCode.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.success && j.data) {
        setQuote(j.data);
        return true;
      }
      if (j.data?.student && v.price_from != null) {
        setQuote((prev) => ({
          ...prev,
          student: j.data.student || prev?.student,
          amount: Number(v.price_from),
          message: j.message,
        }));
        return true;
      }
      throw new Error(j.message || "Could not price this package.");
    } catch (e) {
      setQuoteErr(e.message || "Price failed");
      return false;
    } finally {
      setPriceQuoteLoading(false);
    }
  };

  const toDelivery = () => {
    if (!shoe.size || !shoe.genderType || !shoe.category) return;
    const union = unionAvailableSizes(vouchers);
    if (union.length && !sizeAllowedInList(shoe.size, union)) {
      setSizeNotAllowed(true);
      showSizeUnavailableToast(SIZE_UNAVAILABLE_FOR_PACKAGE_MSG);
      return;
    }
    setSizeNotAllowed(false);
    setSelectedShoesModelSlug(null);
    setSelectedPackageIds([]);
    setShoe((p) => ({ ...p, preferredModel: "" }));
    goStep(3);
  };

  const afterAgent = () => {
    if (!selectedAgent) return;
    goStep(5);
  };

  const toReview = () => {
    if (delivery.method === "home_delivery") {
      const needed = [delivery.district, delivery.sector, delivery.cell, delivery.village, delivery.phone, delivery.exactAddress];
      if (needed.some((v) => !String(v || "").trim())) return;
    }
    goStep(6);
  };

  const goPayments = () => {
    if (!selectedPackages.length || !selectedPackages.every((v) => Number.isFinite(Number(v.id)))) {
      setQuoteErr("Select at least one shoe package.");
      return;
    }
    const qty = Math.max(1, Number(shoe.quantity || 1));
    const lines = selectedPackages.map((v) => ({
      service_id: Number(v.id),
      quantity: qty,
    }));
    const meta = {
      shoe,
      delivery,
      deliveryFee,
      agent: selectedAgent,
      schoolLocation: { province: locProvince, district: locDistrict, sector: locSector || null },
      flow: "shoes-voucher",
      shoes_cart: selectedPackages.map((v) => ({
        service_id: v.id,
        name: v.name,
        preferred_model: pickPreferredModelForPackage(v, shoe),
      })),
    };
    try {
      sessionStorage.setItem(
        STUDENT_SERVICE_CHECKOUT_KEY,
        JSON.stringify({
          service: selectedPackages[0],
          lines,
          quote: { ...quote, amount: total },
          studentCodeInput: studentCode.trim(),
          meta,
          savedAt: Date.now(),
        })
      );
    } catch {
      return;
    }
    try {
      sessionStorage.setItem(
        SHOES_VOUCHER_WIZARD_RESUME_KEY,
        JSON.stringify({
          studentCode,
          shoe,
          delivery,
          selectedPackageIds,
          selectedShoesModelSlug,
          selectedPackages,
          selectedAgent,
          locProvince,
          locDistrict,
          locSector,
          quote,
        })
      );
    } catch {
      /* non-fatal */
    }
    navigate("/payments", {
      state: {
        studentServicePay: { payerName: "", payerPhone: "" },
        shoesVoucherExtendedPay: true,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#000435]" style={{ fontFamily: FONT }}>
      <FontLoader />

      <SizeUnavailableToast
        message={sizeToast.text}
        animationKey={sizeToast.tick}
        onDismiss={() => setSizeToast((t) => ({ ...t, text: null }))}
      />

      <ShoeImageLightbox preview={shoeImagePreview} onClose={closeShoePreview} />

      <div className="sticky top-0 z-20 bg-[#000435]/95 backdrop-blur-xl border-b-[3px] border-amber-400">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <Link to="/services" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/6 border border-white/12 text-white/60 font-bold text-[12px] hover:bg-white/10 hover:text-white transition-all">
            <ArrowLeft size={14} /> Services
          </Link>
          <div className="flex items-center gap-2 ml-1">
            <Footprints size={14} className="text-amber-400" />
            <span className="font-black text-[12px] sm:text-[13px] text-white/90 uppercase tracking-widest">Shoes Voucher</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto text-[11px] font-bold text-amber-400">
            <ShieldCheck size={14} />
            <span className="hidden sm:inline">Secure</span>
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
            Shoes Voucher <span className="text-amber-400">Service</span>
          </h1>
          <p className="text-white/45 text-[13px] sm:text-[14px] max-w-lg">
            Enter student code, choose shoe details and package, pick your local agent, then delivery and payment — same secure checkout as school fees.
          </p>
        </div>

        <div className="rounded-2xl xl:rounded-3xl bg-white/4 border border-amber-400/20 overflow-hidden shadow-2xl shadow-black/30">
          <div className="px-5 sm:px-6 py-5 border-b border-white/8 bg-[#000435]/50">
            <StepIndicator current={step} />
          </div>

          <div className="px-5 sm:px-6 py-6">
            {/* Step 1 */}
            {step === 1 && (
              <div key={stepKey} className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1.5">Student lookup</h2>
                <p className="text-white/45 text-[13px] mb-5">Official student code, UID, or SDM ID.</p>
                {catalogLoading && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="spin-anim text-amber-400" size={36} />
                  </div>
                )}
                {!catalogLoading && (
                  <>
                    {voucherErr && <p className="text-[13px] text-amber-200/90 mb-3 font-medium">{voucherErr}</p>}
                    <Field label="Student code" required error={quoteErr}>
                      <div className="flex gap-2.5">
                        <div className="flex-1">
                          <Input
                            value={studentCode}
                            onChange={(e) => {
                              setStudentCode(e.target.value);
                              setQuoteErr("");
                            }}
                            placeholder="e.g. 040080001"
                            icon={Search}
                            onKeyDown={(e) => e.key === "Enter" && runStudentLookup()}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => runStudentLookup()}
                          disabled={quoteLoading}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-400 text-[#000435] font-black text-[13px] hover:bg-amber-300 transition-all disabled:opacity-50 shrink-0 min-h-[48px]"
                        >
                          {quoteLoading ? <Loader2 size={15} className="spin-anim" /> : <Search size={15} />}
                          <span className="hidden sm:inline">Find</span>
                        </button>
                      </div>
                    </Field>
                    <NavBtns onNext={() => runStudentLookup()} nextLabel="Continue" nextDisabled={!studentCode.trim() || quoteLoading} nextLoading={quoteLoading} />
                  </>
                )}
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div key={stepKey} className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1">Shoe details</h2>
                <p className="text-white/45 text-[13px] mb-5">Size, gender, category, and quantity. You will choose the shoe model in the next step after picking a package.</p>
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 p-4 mb-5 fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center font-black text-[13px] text-amber-400">
                      {`${student.first_name || " "}`[0]}
                      {`${student.last_name || " "}`[0]}
                    </div>
                    <div>
                      <p className="font-black text-white text-[15px]">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-[12px] text-white/45">
                        {student.school_name || "—"} · {student.class_name || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  <Field label="Shoe size" required>
                    <Input
                      value={shoe.size}
                      onChange={(e) => {
                        setSizeNotAllowed(false);
                        setShoe((p) => ({ ...p, size: e.target.value }));
                      }}
                      onBlur={(e) => {
                        const v = e.target.value;
                        const union = unionAvailableSizes(vouchers);
                        if (!normSizeStr(v) || !union.length) return;
                        if (!sizeAllowedInList(v, union)) {
                          setSizeNotAllowed(true);
                          showSizeUnavailableToast(SIZE_UNAVAILABLE_FOR_PACKAGE_MSG);
                        }
                      }}
                      placeholder="e.g. 36"
                    />
                  </Field>
                  <Field label="Gender" required>
                    <Select value={shoe.genderType} onChange={(e) => setShoe((p) => ({ ...p, genderType: e.target.value }))}>
                      <option value="">Select…</option>
                      <option value="Boy">Boy</option>
                      <option value="Girl">Girl</option>
                      <option value="Unisex">Unisex</option>
                    </Select>
                  </Field>
                  <Field label="Shoe category" required>
                    <Select value={shoe.category} onChange={(e) => setShoe((p) => ({ ...p, category: e.target.value }))}>
                      <option value="">Select…</option>
                      <option value="School shoe">School shoe</option>
                      <option value="Sports Shoes">Sports Shoes</option>
                    </Select>
                  </Field>
                  <Field label="Quantity">
                    <Input
                      type="number"
                      min={1}
                      value={shoe.quantity}
                      onChange={(e) => setShoe((p) => ({ ...p, quantity: Math.max(1, Number(e.target.value || 1)) }))}
                    />
                  </Field>
                </div>

                <NavBtns
                  onBack={() => goStep(1)}
                  onNext={toDelivery}
                  nextDisabled={
                    sizeNotAllowed
                    || !shoe.size
                    || !shoe.genderType
                    || !shoe.category
                  }
                />
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div key={stepKey} className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1">Package, price &amp; model</h2>
                {quoteErr && <p className="text-[13px] text-red-400 mb-3">{quoteErr}</p>}
                {priceQuoteLoading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="spin-anim text-amber-400" size={36} />
                  </div>
                ) : (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-[.1em] text-white/35 mb-2">1 · Shoes model</p>
                    <Field label="Shoes Model" required>
                      <Select
                        value={selectedShoesModelSlug || ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          setSelectedShoesModelSlug(raw ? raw : null);
                          setSelectedPackageIds([]);
                          setShoe((p) => ({ ...p, preferredModel: "" }));
                          setQuoteErr("");
                        }}
                      >
                        <option value="">Select Shoes Model</option>
                        {SHOE_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    {!selectedShoesModelSlug && (
                      <p className="text-[12px] text-amber-200/85 mb-4 font-semibold">
                        Select Mentor, Bata Toughes, or Crabkids to see shoes your school listed for that line (same assignment as Super Admin → Shoes Voucher).
                      </p>
                    )}

                    {selectedShoesModelSlug && packagesForStep3.length === 0 && (
                      <p className="text-[13px] text-white/45 mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                        No shoes are available for this model yet. Ask your administrator to publish shoe packages and assign a Shoes Model, or try another model.
                      </p>
                    )}

                    {packagesForStep3.length > 0 && (
                      <>
                        <p className="text-[10px] font-black uppercase tracking-[.1em] text-white/35 mb-2 mt-1">2 · Available shoes</p>
                        <p className="text-[12px] text-white/40 mb-3">
                          Use the checkboxes to add shoes to your package — you can select{" "}
                          <span className="text-amber-400/95 font-bold">multiple</span>. Quantity from the previous step applies to each selected line.
                        </p>
                        <div className="flex flex-col gap-3 mb-4">
                          {packagesForStep3.map((v) => {
                            const sel = selectedPackageIds.includes(v.id);
                            const q = Math.max(1, Number(shoe.quantity || 1));
                            const lineTotal = Math.max(0, Number(v.price_from || 0)) * q;
                            return (
                              <div
                                key={v.id}
                                className={`flex flex-row gap-3 sm:gap-4 rounded-2xl border-2 p-3 sm:p-3.5 transition-all touch-manipulation ${
                                  sel
                                    ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/12 ring-1 ring-amber-400/15"
                                    : "border-white/12 bg-white/5 hover:border-amber-400/40"
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShoeImagePreview({ src: packageHeroImage(v), label: v.name })
                                  }
                                  className="group relative w-[88px] h-[88px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-xl bg-white/10 overflow-hidden ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#000435]"
                                  aria-label={`Enlarge photo: ${v.name}`}
                                  title="Tap to enlarge"
                                >
                                  <img
                                    src={packageHeroImage(v)}
                                    alt=""
                                    className="w-full h-full object-cover transition-transform duration-200 group-active:scale-105"
                                    loading="lazy"
                                  />
                                  <span
                                    className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                                    aria-hidden
                                  >
                                    <ZoomIn className="text-white drop-shadow-md" size={26} strokeWidth={2.25} />
                                  </span>
                                  <span
                                    className="pointer-events-none absolute bottom-1 right-1 rounded-md bg-black/55 p-1 sm:hidden"
                                    aria-hidden
                                  >
                                    <ZoomIn className="text-amber-300" size={14} strokeWidth={2.5} />
                                  </span>
                                </button>
                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 pr-1">
                                  <p className="font-black text-white text-[14px] sm:text-[15px] leading-snug">{v.name}</p>
                                  {v.short_tagline ? (
                                    <p className="text-[11px] font-bold text-amber-400/80 truncate">{v.short_tagline}</p>
                                  ) : null}
                                  <p className="text-[13px] sm:text-[14px] font-black text-amber-400 tabular-nums">
                                    Price: {frw(v.price_from)}
                                    {q > 1 ? <span className="text-white/45 font-semibold text-[12px]"> × {q} = {frw(lineTotal)}</span> : null}
                                  </p>
                                </div>
                                <label className="flex flex-col items-center justify-center gap-1.5 shrink-0 cursor-pointer select-none min-w-[72px]">
                                  <input
                                    type="checkbox"
                                    checked={sel}
                                    onChange={() => {
                                      togglePackageSelect(v);
                                      setQuoteErr("");
                                    }}
                                    className="h-5 w-5 rounded border-2 border-white/35 bg-[#000435] text-amber-400 focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer accent-amber-400"
                                  />
                                  <span className="text-[10px] font-black uppercase tracking-[.08em] text-white/50">Select</span>
                                </label>
                              </div>
                            );
                          })}
                        </div>

                        {selectedPackages.length > 0 && (
                          <div className="rounded-xl border border-amber-400/30 bg-amber-400/6 p-4 mb-3 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[.12em] text-amber-400/95">Selected items</p>
                            <ul className="space-y-2">
                              {selectedPackages.map((p) => {
                                const q = Math.max(1, Number(shoe.quantity || 1));
                                const lineTot = Math.max(0, Number(p.price_from || 0)) * q;
                                return (
                                  <li key={p.id} className="flex justify-between gap-3 text-[13px] text-white/90">
                                    <span className="flex items-start gap-2 min-w-0">
                                      <Check className="text-amber-400 shrink-0 mt-0.5" size={16} strokeWidth={2.5} aria-hidden />
                                      <span className="leading-snug">{p.name}</span>
                                    </span>
                                    <span className="font-bold text-amber-400/95 tabular-nums shrink-0">{frw(lineTot)}</span>
                                  </li>
                                );
                              })}
                            </ul>
                            <div className="border-t border-amber-400/25 pt-3 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1">
                              <span className="text-[13px] font-black text-white">Total</span>
                              <span className="text-[18px] font-black text-amber-400 tabular-nums">{frw(baseAmount)}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {selectedPackages.length === 1 && modelOptionsForSelected.length > 1 && (
                      <>
                        <p className="text-[10px] font-black uppercase tracking-[.1em] text-white/35 mb-2">
                          3 · Choose shoe style
                        </p>
                        <p className="text-[12px] text-white/40 mb-3">Tap the style that matches this package.</p>
                        <div className="grid sm:grid-cols-3 gap-3 mb-6">
                          {modelOptionsForSelected.map((m) => {
                            const sel = shoe.preferredModel === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setShoe((p) => ({ ...p, preferredModel: m.id }))}
                                className={`rounded-xl border-2 text-left overflow-hidden transition-all ${
                                  sel ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10" : "border-white/12 bg-white/5 hover:border-white/25"
                                }`}
                              >
                                <div className="aspect-[4/3] bg-white/10 overflow-hidden">
                                  <img src={m.src} alt={`${m.name} shoe`} className="w-full h-full object-cover" loading="lazy" />
                                </div>
                                <div className="p-3">
                                  <p className="font-black text-white text-[13px]">{m.name}</p>
                                  <p className="text-[11px] text-white/40">{m.blurb}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </>
                )}
                <NavBtns
                  onBack={() => goStep(2)}
                  onNext={async () => {
                    setQuoteErr("");
                    if (!selectedShoesModelSlug) {
                      setQuoteErr("Select a shoes model.");
                      return;
                    }
                    if (!selectedPackages.length) {
                      setQuoteErr("Select at least one shoe.");
                      return;
                    }
                    for (const v of selectedPackages) {
                      const pkgSizes = parseAvailableSizes(v);
                      if (pkgSizes.length && !sizeAllowedInList(shoe.size, pkgSizes)) {
                        showSizeUnavailableToast(SIZE_UNAVAILABLE_FOR_PACKAGE_MSG);
                        return;
                      }
                    }
                    if (stylePickRequired) {
                      const allowedIds = modelOptionsForSelected.map((x) => x.id);
                      if (!shoe.preferredModel || !allowedIds.includes(shoe.preferredModel)) {
                        setQuoteErr("Choose a shoe style to continue.");
                        return;
                      }
                    }
                    const ok = await refreshPriceForVoucher(selectedPackages[0]);
                    if (ok) goStep(4);
                  }}
                  nextDisabled={
                    !selectedShoesModelSlug
                    || selectedPackages.length === 0
                    || priceQuoteLoading
                    || (stylePickRequired && !modelOptionsForSelected.some((m) => m.id === shoe.preferredModel))
                  }
                  nextLoading={priceQuoteLoading}
                />
              </div>
            )}

            {/* Step 4 — Agent */}
            {step === 4 && (
              <div key={stepKey} className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1">Find your agent</h2>
                <p className="text-white/45 text-[13px] mb-5">
                  Match province and district to your school. Sector is optional — leave it blank to see all agents in the district.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  <Field label="Province" required>
                    <Select value={locProvince} onChange={(e) => setLocProvince(e.target.value)} disabled={geoLoading}>
                      <option value="">Choose…</option>
                      {provinces.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="District" required>
                    <Select value={locDistrict} onChange={(e) => setLocDistrict(e.target.value)} disabled={!locProvince || geoLoading}>
                      <option value="">Choose…</option>
                      {districts.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Sector (optional)" hint="Narrows the list when you know it.">
                    <Select value={locSector} onChange={(e) => setLocSector(e.target.value)} disabled={!locDistrict || geoLoading}>
                      <option value="">Any sector in district</option>
                      {sectors.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {agentsLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="spin-anim text-amber-400" size={32} />
                  </div>
                )}
                {!agentsLoading && locProvince && locDistrict && (
                  <div className="space-y-2 mb-6">
                    {agents.length === 0 ? (
                      <p className="text-[13px] text-white/40">No agents match this location. Try another sector or contact support.</p>
                    ) : (
                      agents.map((a) => {
                        const sel = selectedAgent?.id === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelectedAgent(a)}
                            className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                              sel ? "border-amber-400 bg-amber-400/10" : "border-white/12 bg-white/5 hover:border-white/25"
                            }`}
                          >
                            <p className="font-black text-white">{a.full_name || `${a.first_name} ${a.last_name}`}</p>
                            <p className="text-[11px] text-amber-200/80 mt-1">
                              {a.district}
                              {a.all_sectors ? " · All sectors" : Array.isArray(a.sectors) && a.sectors.length ? ` · ${a.sectors.join(", ")}` : ""}
                            </p>
                            {(a.phone || a.email) && (
                              <p className="text-[11px] text-white/45 mt-1">
                                {a.phone}
                                {a.email ? ` · ${a.email}` : ""}
                              </p>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}

                <NavBtns onBack={() => goStep(3)} onNext={afterAgent} nextDisabled={!selectedAgent} />
              </div>
            )}

            {/* Step 5 — Delivery */}
            {step === 5 && (
              <div key={stepKey} className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-1">Collection or delivery</h2>
                <p className="text-white/45 text-[13px] mb-5">After your agent, choose how shoes reach the family.</p>
                <div className="grid sm:grid-cols-3 gap-3 mb-5">
                  {[
                    { id: "school_collection", label: "At school", Icon: Building2, desc: "Deliver to school" },
                    {
                      id: "home_delivery",
                      label: "Home",
                      Icon: Home,
                      desc: configuredDeliveryFee > 0 ? `+${frw(configuredDeliveryFee)}` : "Fee set in package",
                    },
                    { id: "branch_collection", label: "Branch", Icon: MapPin, desc: "Pick up at branch / office" },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setDelivery((p) => ({ ...p, method: normalizeMethod(o.id) }))}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        delivery.method === normalizeMethod(o.id) ? "border-amber-400 bg-amber-400/10" : "border-white/12 bg-white/5"
                      }`}
                    >
                      <o.Icon size={20} className="text-amber-400" />
                      <p className="font-black text-[13px] text-white mt-2">{o.label}</p>
                      <p className="text-[11px] text-white/40">{o.desc}</p>
                    </button>
                  ))}
                </div>
                {delivery.method === "home_delivery" && (
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    {["district", "sector", "cell", "village", "phone"].map((k) => (
                      <Field key={k} label={`${k.charAt(0).toUpperCase() + k.slice(1)} *`}>
                        <Input value={delivery[k]} onChange={(e) => setDelivery((p) => ({ ...p, [k]: e.target.value }))} placeholder={k} />
                      </Field>
                    ))}
                    <div className="sm:col-span-2">
                      <Field label="Exact address *">
                        <Input value={delivery.exactAddress} onChange={(e) => setDelivery((p) => ({ ...p, exactAddress: e.target.value }))} placeholder="Street, landmark…" />
                      </Field>
                    </div>
                  </div>
                )}
                <NavBtns onBack={() => goStep(4)} onNext={toReview} nextDisabled={delivery.method === "home_delivery" && [delivery.district, delivery.sector, delivery.cell, delivery.village, delivery.phone, delivery.exactAddress].some((v) => !String(v || "").trim())} />
              </div>
            )}

            {/* Step 6 — Review */}
            {step === 6 && (
              <div key={stepKey} className="step-in">
                <h2 className="font-black text-white text-[18px] sm:text-[20px] mb-4">Review</h2>
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/6 p-4 mb-4 space-y-2 text-[13px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">Student</span>
                    <span className="text-white font-bold text-right">
                      {student.first_name} {student.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-white/45 shrink-0">Shoes</span>
                    <span className="text-white font-bold text-right max-w-[65%] text-[12px] leading-snug">
                      {selectedPackages.map((p) => p.name).join(" · ")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-white/45 shrink-0">Styles</span>
                    <span className="text-white font-bold text-right max-w-[65%] text-[12px] leading-snug">
                      {selectedPackages.length === 1
                        ? modelOptionsForSelected.find((x) => x.id === shoe.preferredModel)?.name || shoe.preferredModel || "—"
                        : selectedPackages
                            .map((p) => {
                              const opts = buildPublicModelOptions(p);
                              const id = pickPreferredModelForPackage(p, shoe);
                              return opts.find((x) => x.id === id)?.name || id || "—";
                            })
                            .join(" · ")}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">Category / size</span>
                    <span className="text-white font-bold text-right">
                      {shoe.category} · {shoe.size}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">Agent</span>
                    <span className="text-white font-bold text-right">{selectedAgent?.full_name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-white/45">Delivery</span>
                    <span className="text-white font-bold text-right">{delivery.method.replace(/_/g, " ")}</span>
                  </div>
                  <div className="border-t border-amber-400/20 pt-3 mt-2 flex justify-between items-center">
                    <span className="font-black text-white">Total</span>
                    <span className="font-black text-amber-400 text-[20px]">{frw(total)}</span>
                  </div>
                </div>
                <NavBtns
                  onBack={() => goStep(5)}
                  onNext={goPayments}
                  nextLabel="Continue to payment"
                  nextDisabled={!selectedPackages.length || !selectedPackages.every((v) => Number.isFinite(Number(v.id)))}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
