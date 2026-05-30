import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";
import shuleKitHero from "../../assets/image2.png";
import mobileHero from "../../assets/mobile.png";
import {
  ArrowRight,
  CreditCard,
  Footprints,
  Shirt,
  PenLine,
  Store,
  Smartphone,
  Layers,
  Menu,
  User,
  MapPin,
  Globe,
  ChevronDown,
  LogIn,
  ExternalLink,
  GraduationCap,
  X,
  MessageCircle,
  Phone,
  Shield,
  Sparkles,
  BarChart3,
  Users,
  CheckCircle2,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
} from "lucide-react";

/* ─── Palette ─────────────────────────────────────────────── */
const NAVY  = "#000435";
const AMB   = "#FBBF24";
const AMB2  = "#F59E0B";
const MTN   = "'MTN Brighter Sans','Trebuchet MS','Segoe UI',sans-serif";
const PUBLIC_COMBINED_PAY_PATH = "/combined-tution-requrement";

function LanguageSwitcher({ compact = false }) {
  const { t, i18n } = useTranslation();
  const lang = String(i18n.language || "en").slice(0, 2).toLowerCase();
  const current = ["rw", "en", "fr"].includes(lang) ? lang : "en";

  return (
    <div
      className={`relative inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-white/90 ${
        compact ? "text-[11px]" : "text-[12px]"
      }`}
      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}
    >
      <Globe size={compact ? 12 : 13} className="text-amber-300" />
      <span className="font-semibold whitespace-nowrap">{t("language.label")}</span>
      <ChevronDown size={compact ? 12 : 13} className="text-white/70" />
      <select
        aria-label={t("language.switcherLabel")}
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        <option value="rw">🇷🇼 {t("language.rw")}</option>
        <option value="en">🇬🇧 {t("language.en")}</option>
        <option value="fr">🇫🇷 {t("language.fr")}</option>
      </select>
    </div>
  );
}

function Navbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const links = [
    { label: t("public.homePage"), href: "/" },
    { label: t("public.payFees"), href: "/combined-tution-requrement" },
    { label: t("public.services"), href: "/services" },
    { label: t("public.features"), href: "/features" },
    { label: t("public.schools"), href: "/schools" },
  ];

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 bg-[#000435]"
      style={{ borderBottom: "1px solid rgba(251,191,36,0.22)", boxShadow: "0 10px 32px rgba(0,4,53,0.25)" }}
    >
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 xl:px-10 flex items-center justify-between gap-2 h-12 sm:h-[62px] lg:h-14 xl:h-[70px]">
        <Link to="/" className="flex items-center shrink min-w-0 group">
          <img
            src={babyeyiLogo}
            alt="Babyeyi logo"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "/1BABYEYI LOGO FINAL.png";
            }}
            className="h-5 max-h-5 w-auto max-w-[74px] object-contain object-left transition-all duration-300 sm:h-7 sm:max-h-none sm:max-w-[110px] lg:h-8 xl:h-9"
          />
        </Link>

        <div className="hidden lg:flex items-center rounded-2xl px-1.5 xl:px-2 py-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {links.map((l) => (
            <Link key={l.label} to={l.href} className="relative px-2.5 xl:px-3 py-2 text-[13px] xl:text-[13.5px] font-semibold text-white hover:text-amber-300 transition-colors duration-200 group">
              {l.label}
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[1.5px] w-0 bg-amber-400 rounded-full transition-all duration-300 group-hover:w-3/4" />
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            to="/find-agent"
            className="group relative inline-flex items-center gap-2 min-h-[40px] px-3.5 rounded-xl text-[12px] font-bold text-white overflow-hidden whitespace-nowrap transition-all duration-300 hover:shadow-[0_6px_28px_rgba(251,191,36,0.3)] active:scale-[.97]"
            style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.22) 0%, rgba(245,158,11,0.2) 100%)",
              border: "1px solid rgba(251,191,36,0.45)",
            }}
          >
            <GraduationCap size={15} strokeWidth={2.5} className="relative z-[1] text-amber-200 group-hover:text-white transition-colors" />
            <span className="relative z-[1] tracking-tight whitespace-nowrap">{t("servicePage.navFindAgent")}</span>
            <ExternalLink size={12} strokeWidth={2.5} className="relative z-[1] opacity-70 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            to="/login-portal-select"
            className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-xl font-black text-[12px] text-[#000435] whitespace-nowrap transition-all duration-200 hover:shadow-[0_4px_20px_rgba(251,191,36,.4)] active:scale-[.97]"
            style={{ background: "linear-gradient(135deg,#FBBF24 0%,#F59E0B 100%)" }}
          >
            <LogIn size={14} strokeWidth={2.5} />
            {t("public.shuleManager")}
          </Link>
        </div>

        <div className="flex lg:hidden items-center gap-1.5 shrink-0">
          <Link
            to="/login-portal-select"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[#000435] text-[10px] font-bold whitespace-nowrap"
            style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}
          >
            <LogIn size={11} strokeWidth={2.5} /> {t("public.shuleManager")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {open ? <X size={15} className="text-white" /> : <Menu size={15} className="text-white" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-[#000120] border-t px-4 pb-5 pt-2 space-y-1" style={{ borderColor: "rgba(251,191,36,0.12)" }}>
          <div className="px-1 py-2">
            <LanguageSwitcher compact />
          </div>
          {links.map((l) => (
            <Link key={l.label} to={l.href} onClick={() => setOpen(false)} className="flex px-4 py-3 rounded-xl text-[14px] font-semibold text-white hover:bg-white/6 hover:text-amber-400 transition-all">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 space-y-2">
            <Link
              to="/find-agent"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:shadow-[0_4px_20px_rgba(251,191,36,0.3)]"
              style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.2) 100%)", border: "1px solid rgba(251,191,36,0.45)" }}
            >
              <GraduationCap size={16} strokeWidth={2.5} className="text-amber-200" />
              {t("servicePage.navFindAgent")}
            </Link>
            <Link
              to="/login-portal-select"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl text-[#000435] text-[14px] font-black"
              style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}
            >
              <LogIn size={16} strokeWidth={2.5} /> {t("public.shuleManager")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

function HeroPopup() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed right-3 sm:right-5 bottom-4 sm:bottom-6 z-40 transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <style>{`
        @keyframes pulseRing {
          0% { transform: scale(0.92); opacity: 0.7; }
          70% { transform: scale(1.12); opacity: 0; }
          100% { transform: scale(1.12); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          width: "min(92vw, 300px)",
          background: "linear-gradient(160deg,#000435 0%, #00094F 100%)",
          border: "1px solid rgba(251,191,36,0.35)",
          boxShadow: "0 18px 40px rgba(0,4,53,0.35)",
        }}
        className="rounded-2xl p-3.5 sm:p-4"
      >
        <div className="flex items-start gap-3">
          <span className="relative inline-flex w-9 h-9 rounded-xl items-center justify-center bg-amber-300/20 border border-amber-300/45 text-amber-200">
            <span style={{ position: "absolute", inset: -4, borderRadius: 14, border: "1px solid rgba(251,191,36,0.45)", animation: "pulseRing 1.8s ease-out infinite" }} />
            <MapPin size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] sm:text-[14px] font-extrabold text-white leading-tight">
              {t("servicePage.agentPopupTitle", { defaultValue: "Shakisha umukozi (Agent)" })}
            </p>
            <p className="text-[11px] sm:text-[12px] text-white/70 mt-1">
              {t("servicePage.agentPopupSub", { defaultValue: "Twandikire cyangwa udusabe hafi yawe." })}
            </p>
          </div>
        </div>
        <Link
          to="/find-agent"
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white text-[#000435] font-extrabold text-[12px] sm:text-[13px] px-3 py-2.5 hover:bg-amber-50 transition-colors"
        >
          <MessageCircle size={15} />
          {t("servicePage.agentPopupButton", { defaultValue: "Shakisha umukozi" })}
          <ArrowRight size={14} />
        </Link>
        <div className="mt-2.5 flex items-center gap-2 text-white/75 text-[11px]">
          <Phone size={12} />
          <span>{t("servicePage.agentPopupCall", { defaultValue: "Call us: +250 788 123 456" })}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Section heading ─────────────────────────────────────── */
function SecHead({ title, sub, right }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", alignItems:"flex-end", justifyContent:"space-between", gap:12, marginBottom:28 }}>
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
          <div style={{ width:4, height:22, borderRadius:2, background:AMB }}/>
          <h2 style={{ fontFamily:MTN, fontWeight:900, fontSize:"clamp(1.35rem,3vw,1.65rem)", color:NAVY, margin:0, letterSpacing:"-.01em" }}>{title}</h2>
        </div>
        {sub && <p style={{ fontFamily:MTN, fontSize:13.5, color:"#64748b", margin:"0 0 0 14px", maxWidth:500 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ─── Service card ────────────────────────────────────────── */
function SvcCard({ Icon, title, desc, cta, href, soon, priceLine, yearBadge }) {
  const [hov, setHov] = useState(false);
  return (
    <article onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:"#fff", border:`1.5px solid ${hov ? AMB : "#E2E8F0"}`, borderRadius:16, overflow:"hidden", display:"flex", flexDirection:"column", transition:"border-color .2s, box-shadow .2s", boxShadow: hov ? `0 0 0 1px ${AMB}` : "none", fontFamily:MTN }}>
      <div style={{ height:3, background: hov ? AMB : "transparent", transition:"background .25s" }}/>
      <div style={{ padding:"1.2rem 1.2rem 1.5rem" }}>
        <div style={{ width:44, height:44, borderRadius:10, background:NAVY, border:`2px solid ${AMB}`, display:"flex", alignItems:"center", justifyContent:"center", color:AMB, marginBottom:12 }}>
          <Icon size={20}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:4 }}>
          <h3 style={{ fontFamily:MTN, fontWeight:800, fontSize:14.5, color:NAVY, margin:0 }}>{title}</h3>
          {yearBadge && <span style={{ background:AMB, color:NAVY, fontFamily:MTN, fontWeight:800, fontSize:10, borderRadius:5, padding:"2px 7px", textTransform:"uppercase" }}>{yearBadge}</span>}
          {soon && <span style={{ border:`1px solid ${AMB}`, color:AMB2, background:"#FFFBEB", fontFamily:MTN, fontWeight:700, fontSize:10, borderRadius:5, padding:"2px 7px", textTransform:"uppercase" }}>Soon</span>}
        </div>
        {priceLine && <p style={{ fontFamily:MTN, fontWeight:700, fontSize:12, color:AMB2, margin:"0 0 4px" }}>{priceLine}</p>}
        <p style={{ fontFamily:MTN, fontSize:13, color:"#64748b", lineHeight:1.6, margin:"0 0 1rem" }}>{desc}</p>
        <Link to={href} style={{ display:"inline-flex", alignItems:"center", gap:6, background:NAVY, color:AMB, fontFamily:MTN, fontWeight:800, fontSize:13, borderRadius:10, padding:"9px 15px", textDecoration:"none", minHeight:42 }}>
          {cta} <ArrowRight size={13}/>
        </Link>
      </div>
    </article>
  );
}

function ShuleKitHeroCard() {
  const { t } = useTranslation();
  return (
    <>
      <style>{`
        .sk-hero { background:#fff; border:1px solid #E6EDF7; border-radius:22px; overflow:hidden; display:grid; grid-template-columns:1fr; box-shadow:0 14px 44px rgba(0,4,53,.09); }
        .sk-hero-media { position:relative; min-height:290px; background:linear-gradient(155deg,#FFF8E8 0%, #FFFDF6 100%); display:flex; align-items:center; justify-content:center; padding:1rem .8rem 0; overflow:hidden; }
        .sk-hero-media::before { content:""; position:absolute; width:235px; height:235px; border-radius:999px; background:radial-gradient(circle,#FBBF24 0%, #F59E0B 66%, rgba(245,158,11,.0) 69%); bottom:-52px; left:50%; transform:translateX(-50%); opacity:.95; }
        .sk-hero-media img {
          width:min(100%, 310px);
          height:min(100%, 265px);
          object-fit: contain;
          object-position: center;
          position:relative;
          z-index:2;
          transform: translateY(-8px);
        }
        .sk-hero-content { padding:1.25rem 1.2rem 1.35rem; display:flex; flex-direction:column; justify-content:center; }
        @media (min-width: 640px) {
          .sk-hero { grid-template-columns: 42% 58%; }
          .sk-hero-media { min-height:330px; }
          .sk-hero-content { padding:1.45rem 1.5rem; }
        }
        @media (min-width: 900px) {
          .sk-hero { grid-template-columns: 40% 60%; }
          .sk-hero-media { min-height:360px; }
          .sk-hero-content { padding:1.8rem 1.9rem; }
        }
      `}</style>
      <article className="sk-hero">
        <div className="sk-hero-media">
          <img src={shuleKitHero} alt={t("servicePage.shulekitImageAlt")} decoding="async" loading="lazy" />
        </div>
        <div className="sk-hero-content">
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:7, flexWrap:"wrap" }}>
            <span style={{ background:"#FFF6DD", color:"#9A670B", border:"1px solid #FDE3A3", fontFamily:MTN, fontWeight:900, fontSize:10, borderRadius:7, padding:"3px 8px", textTransform:"uppercase" }}>
              {t("servicePage.featured")}
            </span>
          </div>
          <h2 style={{ fontFamily:MTN, fontWeight:900, fontSize:"clamp(24px, 4.3vw, 34px)", color:NAVY, margin:"0 0 8px", letterSpacing:"-.01em" }}>
            {t("servicePage.shulekitTitle")}
          </h2>
          <p style={{ fontFamily:MTN, fontSize:"clamp(13px, 2.8vw, 15px)", color:"#64748B", lineHeight:1.65, margin:"0 0 1.2rem", maxWidth:520 }}>
            {t("servicePage.shulekitDesc")}
          </p>
          <div style={{ display:"grid", gap:10 }}>
            <Link
              to="/services/standard-shulekit"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                background: AMB,
                color: NAVY,
                fontFamily: MTN,
                fontWeight: 900,
                fontSize: "clamp(12px, 2.5vw, 14px)",
                borderRadius: 16,
                padding: "12px 16px",
                textDecoration: "none",
                minHeight: 54,
                width: "100%",
                boxShadow: "0 10px 20px rgba(251,191,36,.26)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                <Layers size={16} />
                {t("servicePage.standardShuleKit")}
              </span>
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/services/shulekit-pay"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                border: "1.5px solid #D7DFEB",
                color: NAVY,
                background: "#fff",
                fontFamily: MTN,
                fontWeight: 800,
                fontSize: "clamp(12px, 2.5vw, 14px)",
                borderRadius: 16,
                padding: "12px 16px",
                textDecoration: "none",
                minHeight: 54,
                width: "100%",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                <PenLine size={15} color={AMB2} />
                {t("servicePage.customShuleKit")}
              </span>
              <ArrowRight size={15} color={AMB2} />
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}

function ServicesBridge() {
  const { t } = useTranslation();
  const links = [
    { to: "/services/shoes-voucher", label: t("servicePage.bridgeCtaShoes", { defaultValue: "Shoes Voucher" }) },
    { to: "/services/uniform-voucher/request", label: t("servicePage.bridgeCtaUniform", { defaultValue: "Uniform Voucher" }) },
    { to: "/paid-at-school", label: t("servicePage.bridgeCtaPay", { defaultValue: "Pay at School" }) },
  ];

  return (
    <section
      style={{
        margin: "0 0 18px",
        borderRadius: 18,
        border: "1px solid rgba(251,191,36,0.35)",
        background: "linear-gradient(180deg,#000435 0%, #001055 100%)",
        padding: "1.1rem 1rem 1.15rem",
        boxShadow: "0 14px 34px rgba(0,4,53,0.26)",
      }}
    >
      <h3 style={{ margin: 0, fontFamily: MTN, color: "#fff", fontSize: "clamp(18px, 3.8vw, 22px)", fontWeight: 900 }}>
        {t("servicePage.bridgeTitle", { defaultValue: "Explore more school services" })}
      </h3>
      
     
    </section>
  );
}

function PremiumCTA() {
  const { t } = useTranslation();
  return (
    <section
      className="premium-cta-shell"
      style={{
        margin: "24px 0 18px",
        borderRadius: 26,
        border: "1px solid rgba(251,191,36,0.42)",
        background: "linear-gradient(132deg,#000435 0%, #00084B 58%, #FBBF24 58%, #F59E0B 100%)",
        boxShadow: "0 22px 50px rgba(0,4,53,0.34)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1.15rem 1rem 1.05rem" }}>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr" }} className="cta-grid-hero">
          <div style={{ position: "relative", zIndex: 2 }}>
            <div className="premium-cta-badge"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(251,191,36,0.38)" }}>
              <Sparkles size={13} color={AMB} />
              <span style={{ color: "#fff", fontFamily: MTN, fontSize: 11, fontWeight: 900 }}>
                {t("servicePage.premiumCtaBadge", { defaultValue: "Babyeyi App" })}
              </span>
            </div>
            <h3 className="premium-cta-title" style={{ margin: "0 0 8px", color: "#fff", fontFamily: MTN, fontWeight: 900, fontSize: "clamp(28px, 4.7vw, 48px)", lineHeight: 1.02 }}>
              {t("servicePage.premiumCtaTitle", { defaultValue: "Fata serivisi, ishyura cyangwa ubisabe babyeyi" })}
            </h3>
            <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.78)", fontFamily: MTN, fontSize: 14, lineHeight: 1.55, maxWidth: 620 }}>
              {t("servicePage.premiumCtaSub", { defaultValue: "Babyeyi app iguha uburenganzira bwo kubona serivisi z'uburezi, kwishyura amafaranga, kuganira na agent no gukurikirana byose aho uri hose." })}
            </p>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", marginBottom: 12 }}>
              <a className="premium-cta-btn-main" href="#" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 45, borderRadius: 12, textDecoration: "none", fontFamily: MTN, fontWeight: 900, fontSize: 13, color: NAVY, background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
                <Smartphone size={14} />
                App Store
              </a>
              <a className="premium-cta-btn-alt" href="#" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 45, borderRadius: 12, textDecoration: "none", fontFamily: MTN, fontWeight: 800, fontSize: 13, color: "#fff", border: "1px solid rgba(251,191,36,0.5)", background: "rgba(255,255,255,0.06)" }}>
                <Smartphone size={14} color={AMB} />
                Google Play
              </a>
              <Link className="premium-cta-btn-alt" to="/find-agent" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 45, borderRadius: 12, textDecoration: "none", fontFamily: MTN, fontWeight: 800, fontSize: 13, color: "#fff", border: "1px solid rgba(255,255,255,0.24)", background: "rgba(255,255,255,0.04)" }}>
                <MessageCircle size={14} />
                {t("servicePage.premiumCtaSecondary", { defaultValue: "Ganira na Agent" })}
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
              {[t("servicePage.premiumTrustSecure", { defaultValue: "Byihuse & byizewe" }), t("servicePage.premiumTrustFast", { defaultValue: "Ishyura umutekano" }), t("servicePage.premiumTrustCloud", { defaultValue: "Ganira na Agent" }), t("servicePage.premiumTrustRwanda", { defaultValue: "Amakuru ku gihe" })].map((tag) => (
                <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 9px", borderRadius: 10, border: "1px solid rgba(251,191,36,0.35)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: MTN, fontWeight: 700, fontSize: 11.5 }}>
                  <Shield size={12} color={AMB} />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="cta-visual-wrap premium-cta-visual" style={{ position: "relative", minHeight: 290 }}>
            <div style={{ position: "absolute", right: 6, top: 8, bottom: 8, left: "22%", borderRadius: 18, background: "rgba(0,4,53,0.12)", border: "1px solid rgba(255,255,255,0.25)" }} />
            <div
              className="premium-cta-card"
              style={{
                position: "absolute",
                left: "2%",
                top: "8%",
                width: "42%",
                maxWidth: 220,
                minWidth: 150,
                borderRadius: 24,
                background: "#fff",
                border: "6px solid #111",
                boxShadow: "0 20px 36px rgba(0,0,0,.24)",
                transform: "rotate(-4deg)",
                padding: 10,
              }}
            >
              <div style={{ height: 14, borderRadius: 99, background: "#E2E8F0", marginBottom: 10 }} />
              <div style={{ height: 18, borderRadius: 8, background: "#FFF4D6", marginBottom: 8 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                <div style={{ height: 34, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0" }} />
                <div style={{ height: 34, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0" }} />
              </div>
              <div style={{ height: 42, borderRadius: 10, background: "#000435", color: "#FBBF24", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MTN, fontSize: 11, fontWeight: 800 }}>
                babyeyi
              </div>
            </div>
            <img
              src={mobileHero}
              alt={t("servicePage.shulekitImageAlt")}
              style={{
                position: "absolute",
                right: 0,
                bottom: 0,
                width: "72%",
                maxWidth: 380,
                height: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 16px 26px rgba(0,4,53,.34))",
              }}
            />
          </div>
        </div>
      </div>
      <style>{`
        .premium-cta-shell {
          position: relative;
          isolation: isolate;
        }
        .premium-cta-shell::before {
          content: "";
          position: absolute;
          inset: -25% auto auto -20%;
          width: 52%;
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(251,191,36,0.22) 0%, rgba(251,191,36,0) 72%);
          pointer-events: none;
          animation: premiumCtaGlow 5.2s ease-in-out infinite;
        }
        .premium-cta-shell::after {
          content: "";
          position: absolute;
          inset: auto -18% -30% auto;
          width: 48%;
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 74%);
          pointer-events: none;
          animation: premiumCtaGlow 6.4s ease-in-out infinite reverse;
        }
        .premium-cta-badge { animation: premiumBadgeFloat 3.8s ease-in-out infinite; }
        .premium-cta-title { animation: premiumTitleIn .72s ease-out both; }
        .premium-cta-visual { animation: premiumVisualFloat 4.4s ease-in-out infinite; }
        .premium-cta-card { animation: premiumCardTilt 6s ease-in-out infinite; transform-origin: center; }
        .premium-cta-btn-main, .premium-cta-btn-alt { transition: transform .22s ease, box-shadow .22s ease, background .22s ease; }
        .premium-cta-btn-main:hover, .premium-cta-btn-alt:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,4,53,.22); }
        @keyframes premiumCtaGlow {
          0%, 100% { transform: scale(1); opacity: .6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes premiumBadgeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes premiumVisualFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes premiumCardTilt {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(-1deg); }
        }
        @keyframes premiumTitleIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 980px) {
          .cta-grid-hero { grid-template-columns: 56% 44% !important; align-items: center; min-height: 430px; }
        }
        @media (max-width: 640px) {
          .cta-visual-wrap { min-height: 220px !important; }
        }
      `}</style>
    </section>
  );
}

function ServiceFooter() {
  const { t, i18n } = useTranslation();
  const localizedDate = new Intl.DateTimeFormat(i18n.language || "en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const cols = [
    { title: t("public.footerPlatform"), links: [{ l: t("public.footerAbout"), h: "#about" }, { l: t("public.features"), h: "/features", i: true }, { l: t("public.homePage"), h: "/", i: true }, { l: t("public.footerPricing"), h: "#pricing" }] },
    { title: t("public.footerSchools"), links: [{ l: t("public.footerSearchSchools"), h: "/schools", i: true }, { l: t("public.footerPayByCode"), h: PUBLIC_COMBINED_PAY_PATH, i: true }, { l: t("public.registerSchool"), h: "/register", i: true }, { l: t("public.footerTvetTrades"), h: "/schools", i: true }] },
    { title: t("public.footerAccounts"), links: [{ l: t("public.footerSchoolManagerLogin"), h: "/login-portal-select", i: true }, { l: t("public.parentLogin"), h: "/parents/login", i: true }, { l: t("public.footerStaffLogin"), h: "/login/lite", i: true }, { l: t("public.services"), h: "/services", i: true }] },
    { title: t("public.footerSupport"), links: [{ l: t("public.footerHelpCenter"), h: "#" }, { l: t("public.contactUs"), h: "#contact" }, { l: t("public.privacyPolicy"), h: "#" }, { l: t("public.terms"), h: "#" }] },
  ];

  return (
    <footer style={{ background: "#000018" }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 pt-12 xl:pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 xl:gap-12 mb-10 xl:mb-14">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#FBBF24,#F59E0B)" }}>
                <GraduationCap size={17} className="text-[#000435]" />
              </div>
              <span className="font-black text-[17px] text-white">
                baby<span className="text-amber-400">eyi</span><span style={{ color: "rgba(251,191,36,0.5)" }}>.rw</span>
              </span>
            </Link>
            <p className="text-slate-600 leading-relaxed mb-5" style={{ fontSize: "clamp(12px,1vw,13px)" }}>
              {t("public.brandTagline")}
            </p>
            <div className="mb-4">
              <LanguageSwitcher compact />
            </div>
            <div className="flex gap-2">
              {[{ Icon: Facebook, bg: "#1877F2" }, { Icon: Twitter, bg: "#1DA1F2" }, { Icon: Instagram, bg: "#E4405F" }, { Icon: Youtube, bg: "#FF0000" }].map(({ Icon, bg }, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 hover:shadow-lg" style={{ background: bg }}>
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-black text-white text-[10.5px] uppercase tracking-[0.12em] mb-4 xl:mb-5">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(({ l, h, i }) => (
                  <li key={l}>
                    {i ? (
                      <Link to={h} className="text-slate-600 font-medium hover:text-amber-400 transition-colors" style={{ fontSize: "clamp(12px,1vw,13px)" }}>
                        {l}
                      </Link>
                    ) : (
                      <a href={h} className="text-slate-600 font-medium hover:text-amber-400 transition-colors" style={{ fontSize: "clamp(12px,1vw,13px)" }}>
                        {l}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 20 }} />
        <div className="flex flex-wrap gap-5 mb-6">
          {[{ Icon: Mail, v: "hello@babyeyi.rw" }, { Icon: Phone, v: "+250 788 000 000" }, { Icon: MapPin, v: "Kigali, Rwanda" }].map(({ Icon, v }) => (
            <div key={v} className="flex items-center gap-2 text-slate-600 font-medium" style={{ fontSize: "clamp(12px,1vw,13px)" }}>
              <Icon size={13} className="text-amber-400 shrink-0" /> {v}
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 20 }} />
        <p className="text-slate-700 mb-5" style={{ fontSize: "clamp(10px,0.85vw,12px)" }}>
          {t("public.today", { date: localizedDate })}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-700" style={{ fontSize: "clamp(10px,0.85vw,12px)" }}>
            © {new Date().getFullYear()} Babyeyi Rwanda. {t("public.allRightsReserved")}
          </p>
          <p className="text-slate-800" style={{ fontSize: "clamp(10px,0.85vw,12px)" }}>
            {t("public.madeWith")}
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function Service() {
  const { t } = useTranslation();
  const svcRef  = useRef(null);
  const SERVICES = [
    { key:"shulecard", Icon:Smartphone, title:t("servicePage.services.shulecard.title"), desc:t("servicePage.services.shulecard.desc"), href:"/services/shulecard", cta:t("servicePage.services.shulecard.cta") },
    { key:"shuleshoe", Icon:Footprints, title:t("servicePage.services.shuleshoe.title"), desc:t("servicePage.services.shuleshoe.desc"), href:"/services/shoes-voucher", cta:t("servicePage.services.shuleshoe.cta") },
    { key:"uniform", Icon:Shirt, title:t("servicePage.services.uniform.title"), desc:t("servicePage.services.uniform.desc"), href:"/services/uniform-voucher/request", cta:t("servicePage.services.uniform.cta") },
    { key:"mybabyeyi", Icon:User, title:t("servicePage.services.mybabyeyi.title"), desc:t("servicePage.services.mybabyeyi.desc"), href:"#", cta:t("servicePage.comingSoon"), soon:true },
    { key:"paidschool", Icon:CreditCard, title:t("servicePage.services.paidschool.title"), desc:t("servicePage.services.paidschool.desc"), href:"/paid-at-school", cta:t("servicePage.services.paidschool.cta") },
    { key:"requirementsOnly", Icon:Layers, title:t("servicePage.services.requirementsOnly.title"), desc:t("servicePage.services.requirementsOnly.desc"), href:"/services/shulekit-pay", cta:t("servicePage.services.requirementsOnly.cta") },
    { key:"papeterie", Icon:Store, title:t("servicePage.services.papeterie.title"), desc:t("servicePage.services.papeterie.desc"), href:"#", cta:t("servicePage.comingSoon"), soon:true },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#F3F6FB", fontFamily:MTN }}>
      <Navbar />

      {/* Services */}
      <section ref={svcRef} style={{ maxWidth:1152, margin:"0 auto", padding:"5.8rem 1rem 1.5rem" }}>
        <SecHead
          title={t("servicePage.sectionTitle")}
          sub={t("servicePage.sectionSub")}
        />
        <div style={{ marginBottom: 18 }}>
          <ShuleKitHeroCard />
        </div>
        <ServicesBridge />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:15 }}>
          {SERVICES.map(s => <SvcCard key={s.key} {...s}/>)}
        </div>
        <PremiumCTA />
      </section>

      <HeroPopup />
      <ServiceFooter />
    </div>
  );
}