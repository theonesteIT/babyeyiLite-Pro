import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const BABYEYI_LOGO_URL = "/1BABYEYI LOGO FINAL.png";

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Home page", href: "/" },
    { label: "Pay Fees", href: "/pay-by-school" },
    { label: "Services", href: "/services" },
    { label: "Features", href: "/features" },
    { label: "Schools", href: "/schools" },
  ];

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 border-b-[3px] border-amber-400 transition-all duration-300 ${scrolled ? "bg-[#000435] shadow-xl shadow-black/30" : "bg-[#000435]/88 backdrop-blur-md"}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 flex items-center justify-between h-14 sm:h-16 xl:h-[68px]">
        <Link to="/" className="flex items-center shrink-0">
          <img src={BABYEYI_LOGO_URL} alt="Babyeyi logo" className="h-9 sm:h-10 xl:h-11 w-auto object-contain" />
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {links.map((l) => (
            <Link key={l.label} to={l.href} className="px-3 xl:px-4 py-2 rounded-lg text-sm xl:text-[15px] font-semibold text-white/70 hover:text-white hover:bg-white/8 transition-all">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/register" className="px-4 py-2.5 rounded-xl text-sm font-bold text-white/80 border border-white/15 hover:border-amber-400/50 hover:text-amber-400 transition-all">Register School</Link>
          <a href="/login" className="inline-flex items-center gap-2 min-h-[40px] xl:min-h-[44px] px-5 xl:px-6 rounded-xl bg-amber-400 text-[#000435] text-sm xl:text-[15px] font-black hover:bg-amber-300 transition-all">
            <LogIn size={15} strokeWidth={2.5} /> Login
          </a>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <a href="/login" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-amber-400 text-[#000435] text-[12px] font-black">
            <LogIn size={13} strokeWidth={2.5} /> Login
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
          <Link to="/register" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 w-full mt-1 px-4 py-3 rounded-xl border border-amber-400/40 text-amber-400 text-[14px] font-bold">Register School</Link>
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
  return (
    <section className="pt-24 sm:pt-28 xl:pt-32 pb-12 sm:pb-16 bg-[#000435]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 text-center">
        <SH eyebrow="Platform Features" title="Everything Schools Need" sub="A complete digital platform built for speed, trust, and accessibility across Rwanda." light />
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/register" className="inline-flex w-[220px] sm:w-auto justify-center items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-[13px] font-black text-[#000435] hover:bg-amber-300 transition-colors">
            <Building2 size={15} /> Register School
          </Link>
          <Link to="/pay-by-school" className="inline-flex w-[220px] sm:w-auto justify-center items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-[13px] font-black text-white hover:bg-white/10 transition-colors">
            <CreditCard size={15} className="text-amber-300" /> Pay Fees
          </Link>
          <Link to="/online-service" className="inline-flex w-[220px] sm:w-auto justify-center items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-[13px] font-black text-white hover:bg-white/10 transition-colors">
            <UserCheck size={15} className="text-amber-300" /> OnlineService
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturesGridSection() {
  const ff = [
    { Icon: Globe, title: "School Mini-Websites", desc: "Every school gets a professional website with branding, domain slug, and full content management.", color: "#3B82F6" },
    { Icon: Users, title: "Parent Engagement", desc: "Parents follow school updates, view announcements, track programs, and stay connected daily.", color: "#10B981" },
    { Icon: BookOpen, title: "Academic Programs", desc: "A-Level combos, TVET trades, education levels, and detailed curriculum, fully searchable.", color: "#8B5CF6" },
    { Icon: Bell, title: "Events & Announcements", desc: "Schools post important dates and events that reach parents and community instantly.", color: "#F59E0B" },
    { Icon: Search, title: "Advanced School Search", desc: "Find any school in Rwanda by name, district, sector, education level, or TVET trade.", color: "#EC4899" },
    { Icon: GraduationCap, title: "Online Admissions", desc: "Custom admission forms. Students apply online and receive reference numbers instantly.", color: "#F97316" },
    { Icon: BarChart3, title: "Transparent Info", desc: "Fee structures, leadership teams, and school details are public and always up to date.", color: "#06B6D4" },
    { Icon: Shield, title: "Secure & Reliable", desc: "Secure data handling, reliable uptime, and a mobile-first design built for Rwanda.", color: "#84CC16" },
    { Icon: Smartphone, title: "Mobile Friendly", desc: "Every school website is fully responsive for phones, tablets, and desktop users.", color: "#A855F7" },
    { Icon: CreditCard, title: "Fee Payments", desc: "Parents pay school fees by school code, no account required, mobile-money powered.", color: "#FBBF24" },
    { Icon: UserCheck, title: "OnlineService", desc: "Students access their online service dashboard to view profile details and school-linked information.", color: "#1D4ED8" },
    { Icon: Package, title: "ShuleKit", desc: "Educational tools and stationery, standard or school-custom, delivered to families.", color: "#14B8A6" },
    { Icon: Bot, title: "Agent Assistant", desc: "In-platform assistant guiding parents and schools through payments, admissions, and support.", color: "#0EA5E9" },
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
  return (
    <section className="py-14 sm:py-20 bg-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 xl:px-10">
        <div className="rounded-3xl border border-amber-300/40 bg-gradient-to-r from-[#000435] to-[#00145a] p-6 sm:p-8 xl:p-10 text-center">
          <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-400 mb-4">
            <Sparkles size={13} /> Ready to get started?
          </div>
          <h3 className="font-black text-white tracking-tight mb-3" style={{ fontSize: "clamp(1.4rem,3vw,2.2rem)" }}>
            Launch your school with Babyeyi
          </h3>
          <p className="text-white/60 text-[14px] sm:text-[15px] max-w-2xl mx-auto mb-6">
            Create your school profile, publish your mini-website, and open payments and admissions in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-[13px] font-black text-[#000435] hover:bg-amber-300 transition-colors">
              Register School <ArrowRight size={14} />
            </Link>
            <Link to="/schools" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-[13px] font-black text-white hover:bg-white/15 transition-colors">
              Explore Schools
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { title: "Platform", links: [{ l: "About Babyeyi", h: "#about" }, { l: "Features", h: "/features", i: true }, { l: "Home page", h: "/", i: true }, { l: "Pricing", h: "#pricing" }] },
    { title: "Schools", links: [{ l: "Search Schools", h: "/schools", i: true }, { l: "Pay by School Code", h: "/pay-by-school", i: true }, { l: "Register School", h: "/register", i: true }, { l: "TVET Trades", h: "/schools", i: true }] },
    { title: "Accounts", links: [{ l: "School Manager Login", h: "/school-manager/login", i: true }, { l: "Parent Login", h: "/parents/login", i: true }, { l: "Staff Login", h: "/login", i: true }, { l: "Services", h: "/services", i: true }] },
    { title: "Support", links: [{ l: "Help Center", h: "#" }, { l: "Contact Us", h: "#contact" }, { l: "Privacy Policy", h: "#" }, { l: "Terms of Service", h: "#" }] },
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
            <p className="text-slate-500 text-[13px] leading-relaxed mb-5">Connecting schools, parents, and communities.</p>
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
          <p className="text-slate-600 text-[12px]">© {new Date().getFullYear()} Babyeyi Rwanda. All rights reserved.</p>
          <p className="text-slate-700 text-[12px]">Made with ❤️ for Rwanda's schools</p>
        </div>
      </div>
    </footer>
  );
}

export default function FeaturesPage() {
  useEffect(() => {
    document.title = "Babyeyi.rw — Platform Features";
  }, []);

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
