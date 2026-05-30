import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";
import {
  GraduationCap,
  Globe,
  Users,
  BookOpen,
  Bell,
  Search,
  BarChart3,
  Shield,
  Smartphone,
  Menu,
  X,
  Building2,
  LogIn,
  Facebook,
  Twitter,
  Instagram,
  Mail,
  Phone,
  Youtube,
  CreditCard,
  Package,
  Bot,
  UserCheck,
  Sparkles,
  ArrowRight,
  MapPin,
} from "lucide-react";

function Navbar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: t("featuresPage.homePage"), href: "/" },
    { label: t("featuresPage.payFees"), href: "/paid-at-school" },
    { label: t("featuresPage.services"), href: "/services" },
    { label: t("featuresPage.features"), href: "/features" },
    { label: t("featuresPage.schools"), href: "/schools" },
  ];

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 border-b-[3px] border-amber-400 transition-all duration-300 ${scrolled ? "bg-[#000435] shadow-xl shadow-black/30" : "bg-[#000435]/88 backdrop-blur-md"}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 flex items-center justify-between h-14 sm:h-16 xl:h-[68px]">
        <Link to="/" className="flex items-center shrink-0">
          <img src={babyeyiLogo} alt="Babyeyi logo" className="h-9 sm:h-10 xl:h-11 w-auto object-contain" />
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {links.map((l) => (
            <Link key={l.label} to={l.href} className="px-3 xl:px-4 py-2 rounded-lg text-sm xl:text-[15px] font-semibold text-white/70 hover:text-white hover:bg-white/8 transition-all">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/register" className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/80 border border-white/15 hover:border-amber-400/50 hover:text-amber-400 transition-all">{t("featuresPage.registerSchool")}</Link>
          <a href="/login" className="inline-flex items-center gap-2 min-h-[40px] xl:min-h-[44px] px-5 xl:px-6 rounded-xl bg-amber-400 text-[#000435] text-sm xl:text-[15px] font-black hover:bg-amber-300 transition-all">
            <LogIn size={15} strokeWidth={2.5} /> {t("featuresPage.login")}
          </a>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <a href="/login" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-amber-400 text-[#000435] text-[12px] font-black">
            <LogIn size={13} strokeWidth={2.5} /> {t("featuresPage.login")}
          </a>
          <button type="button" onClick={() => setOpen(!open)} className="w-9 h-9 rounded-lg bg-white/8 border border-white/15 flex items-center justify-center">
            {open ? <X size={17} className="text-white" /> : <Menu size={17} className="text-white" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-[#000435] border-t border-white/8 px-4 pb-4 space-y-1">
          {links.map((l) => (
            <Link key={l.label} to={l.href} onClick={() => setOpen(false)} className="flex px-4 py-3 rounded-xl text-[14px] font-bold text-white/75 hover:bg-white/8 hover:text-white">
              {l.label}
            </Link>
          ))}
          <Link to="/register" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 w-full mt-1 px-4 py-3 rounded-xl border border-amber-400/40 text-amber-400 text-[14px] font-bold">{t("featuresPage.registerSchool")}</Link>
        </div>
      )}
    </nav>
  );
}

function SH({ eyebrow, title, sub, light = false }) {
  return (
    <div className="text-center mb-10 sm:mb-14 xl:mb-16">
      <div className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] mb-3 ${light ? "text-amber-400" : "text-amber-600"}`}>
        <span className={`w-8 h-px ${light ? "bg-amber-400" : "bg-amber-500"}`} />
        {eyebrow}
        <span className={`w-8 h-px ${light ? "bg-amber-400" : "bg-amber-500"}`} />
      </div>
      <h2 className={`font-black tracking-tight mb-3 ${light ? "text-white" : "text-[#000435]"}`} style={{ fontSize: "clamp(1.5rem,3.2vw,2.6rem)" }}>
        {title}
      </h2>
      {sub && <p className={`text-[15px] xl:text-[16px] max-w-lg xl:max-w-xl mx-auto ${light ? "text-white/50" : "text-slate-500"}`}>{sub}</p>}
    </div>
  );
}

function FeaturesHero() {
  const { t } = useTranslation();
  return (
    <section className="pt-24 sm:pt-28 xl:pt-32 pb-12 sm:pb-16 bg-[#000435]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 text-center">
        <SH eyebrow={t("featuresPage.heroEyebrow")} title={t("featuresPage.heroTitle")} sub={t("featuresPage.heroSub")} light />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="inline-flex w-[220px] sm:w-auto justify-center items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-[13px] font-black text-[#000435] hover:bg-amber-300 transition-colors">
            <Building2 size={15} /> {t("featuresPage.registerSchool")}
          </Link>
          <Link to="/paid-at-school" className="inline-flex w-[220px] sm:w-auto justify-center items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-[13px] font-black text-white hover:bg-white/10 transition-colors">
            <CreditCard size={15} className="text-amber-300" /> {t("featuresPage.payFees")}
          </Link>
          <Link to="/online-service" className="inline-flex w-[220px] sm:w-auto justify-center items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-[13px] font-black text-white hover:bg-white/10 transition-colors">
            <UserCheck size={15} className="text-amber-300" /> {t("featuresPage.onlineService")}
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturesGridSection() {
  const { t } = useTranslation();
  const ff = [
    { Icon: Globe, title: t("featuresPage.grid1Title"), desc: t("featuresPage.grid1Desc"), color: "#3B82F6" },
    { Icon: Users, title: t("featuresPage.grid2Title"), desc: t("featuresPage.grid2Desc"), color: "#10B981" },
    { Icon: BookOpen, title: t("featuresPage.grid3Title"), desc: t("featuresPage.grid3Desc"), color: "#8B5CF6" },
    { Icon: Bell, title: t("featuresPage.grid4Title"), desc: t("featuresPage.grid4Desc"), color: "#F59E0B" },
    { Icon: Search, title: t("featuresPage.grid5Title"), desc: t("featuresPage.grid5Desc"), color: "#EC4899" },
    { Icon: GraduationCap, title: t("featuresPage.grid6Title"), desc: t("featuresPage.grid6Desc"), color: "#F97316" },
    { Icon: BarChart3, title: t("featuresPage.grid7Title"), desc: t("featuresPage.grid7Desc"), color: "#06B6D4" },
    { Icon: Shield, title: t("featuresPage.grid8Title"), desc: t("featuresPage.grid8Desc"), color: "#84CC16" },
    { Icon: Smartphone, title: t("featuresPage.grid9Title"), desc: t("featuresPage.grid9Desc"), color: "#A855F7" },
    { Icon: CreditCard, title: t("featuresPage.grid10Title"), desc: t("featuresPage.grid10Desc"), color: "#FBBF24" },
    { Icon: UserCheck, title: t("featuresPage.grid11Title"), desc: t("featuresPage.grid11Desc"), color: "#1D4ED8" },
    { Icon: Package, title: t("featuresPage.grid12Title"), desc: t("featuresPage.grid12Desc"), color: "#14B8A6" },
    { Icon: Bot, title: t("featuresPage.grid13Title"), desc: t("featuresPage.grid13Desc"), color: "#0EA5E9" },
  ];

  return (
    <section id="features" className="py-16 sm:py-24 xl:py-28 bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 xl:gap-5">
          {ff.map((f, i) => (
            <div key={i} className="group bg-white rounded-2xl p-5 xl:p-6 border border-slate-200 hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform" style={{ background: `${f.color}18`, color: f.color }}>
                <f.Icon size={20} />
              </div>
              <h3 className="font-bold text-[#000435] text-[15px] mb-2">{f.title}</h3>
              <p className="text-slate-500 text-[13px] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useTranslation();
  return (
    <section className="py-14 sm:py-20 bg-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 xl:px-10">
        <div className="rounded-3xl border border-amber-300/40 bg-gradient-to-r from-[#000435] to-[#00145a] p-6 sm:p-8 xl:p-10 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-400 mb-4">
            <Sparkles size={13} /> {t("featuresPage.ctaReady")}
          </div>
          <h3 className="font-black text-white tracking-tight mb-3" style={{ fontSize: "clamp(1.4rem,3vw,2.2rem)" }}>
            {t("featuresPage.ctaTitle")}
          </h3>
          <p className="text-white/60 text-[14px] sm:text-[15px] max-w-2xl mx-auto mb-6">
            {t("featuresPage.ctaSub")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-[13px] font-black text-[#000435] hover:bg-amber-300 transition-colors">
              {t("featuresPage.registerSchool")} <ArrowRight size={14} />
            </Link>
            <Link to="/schools" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-[13px] font-black text-white hover:bg-white/15 transition-colors">
              {t("featuresPage.exploreSchools")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();
  const cols = [
    { title: t("featuresPage.footerPlatform"), links: [{ l: t("featuresPage.footerAbout"), h: "#about" }, { l: t("featuresPage.features"), h: "/features", i: true }, { l: t("featuresPage.homePage"), h: "/", i: true }, { l: t("featuresPage.footerPricing"), h: "#pricing" }] },
    { title: t("featuresPage.footerSchools"), links: [{ l: t("featuresPage.footerSearchSchools"), h: "/schools", i: true }, { l: t("featuresPage.footerPayBySchoolCode"), h: "/paid-at-school", i: true }, { l: t("featuresPage.registerSchool"), h: "/register", i: true }, { l: t("featuresPage.footerTvetTrades"), h: "/schools", i: true }] },
    { title: t("featuresPage.footerAccounts"), links: [{ l: t("featuresPage.footerSchoolManagerLogin"), h: "/school-manager/login", i: true }, { l: t("featuresPage.footerParentLogin"), h: "/parents/login", i: true }, { l: t("featuresPage.footerStaffLogin"), h: "/login", i: true }, { l: t("featuresPage.services"), h: "/services", i: true }] },
    { title: t("featuresPage.footerSupport"), links: [{ l: t("featuresPage.footerHelpCenter"), h: "#" }, { l: t("featuresPage.footerContactUs"), h: "#contact" }, { l: t("featuresPage.footerPrivacyPolicy"), h: "#" }, { l: t("featuresPage.footerTerms"), h: "#" }] },
  ];

  return (
    <footer className="bg-[#000018]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 pt-12 xl:pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 xl:gap-12 mb-10 xl:mb-14">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center"><GraduationCap size={17} className="text-[#000435]" /></div>
              <span className="font-black text-[17px] text-white">baby<span className="text-amber-400">eyi</span><span className="text-amber-400/60">.rw</span></span>
            </Link>
            <p className="text-slate-500 text-[13px] leading-relaxed mb-5">{t("featuresPage.footerTagline")}</p>
            <div className="flex gap-2">
              {[{ Icon: Facebook, bg: "#1877F2" }, { Icon: Twitter, bg: "#1DA1F2" }, { Icon: Instagram, bg: "#E4405F" }, { Icon: Youtube, bg: "#FF0000" }].map(({ Icon, bg }, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform" style={{ background: bg }}><Icon size={14} /></a>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-black text-white text-[11px] uppercase tracking-[0.1em] mb-4 xl:mb-5">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(({ l, h, i }) => (
                  <li key={l}>{i ? <Link to={h} className="text-slate-500 text-[13px] font-medium hover:text-amber-400 transition-colors">{l}</Link> : <a href={h} className="text-slate-500 text-[13px] font-medium hover:text-amber-400 transition-colors">{l}</a>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-5 pb-6 border-b border-white/5">
          {[{ Icon: Mail, v: "hello@babyeyi.rw" }, { Icon: Phone, v: "+250 788 000 000" }, { Icon: MapPin, v: "Kigali, Rwanda" }].map(({ Icon, v }) => (
            <div key={v} className="flex items-center gap-2 text-[13px] text-slate-500 font-medium"><Icon size={13} className="text-amber-400" /> {v}</div>
          ))}
        </div>
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-600 text-[12px]">© {new Date().getFullYear()} Babyeyi Rwanda. {t("featuresPage.footerAllRightsReserved")}</p>
          <p className="text-slate-700 text-[12px]">{t("featuresPage.footerMadeWithLove")}</p>
        </div>
      </div>
    </footer>
  );
}

export default function FeaturesPage() {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = t("featuresPage.documentTitle");
  }, [t]);

  return (
    <div>
      <Navbar />
      <FeaturesHero />
      <FeaturesGridSection />
      <CTASection />
      <Footer />
    </div>
  );
}
