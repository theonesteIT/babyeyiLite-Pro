import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PublicHeader, { usePublicHeaderState } from "../../components/public/Header";
import PublicFooter from "../../components/public/Footer";
import { publicHeaderPaddingClass } from "../../components/public/publicSiteConstants";
import {
  GraduationCap,
  Users,
  BookOpen,
  Bell,
  Search,
  BarChart3,
  Shield,
  Smartphone,
  Building2,
  CreditCard,
  Package,
  Bot,
  UserCheck,
  Sparkles,
  ArrowRight,
  Globe,
} from "lucide-react";

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

function FeaturesHero({ bannerVisible }) {
  const { t } = useTranslation();
  return (
    <section className={`${publicHeaderPaddingClass(bannerVisible)} pb-12 sm:pb-16 bg-[#000435]`}>
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

export default function FeaturesPage() {
  const { t } = useTranslation();
  const { bannerVisible, dismissBanner, banners } = usePublicHeaderState();

  useEffect(() => {
    document.title = t("featuresPage.documentTitle");
  }, [t]);

  return (
    <div>
      <PublicHeader bannerVisible={bannerVisible} onBannerClose={dismissBanner} banners={banners} />
      <FeaturesHero bannerVisible={bannerVisible} />
      <FeaturesGridSection />
      <CTASection />
      <PublicFooter />
    </div>
  );
}
