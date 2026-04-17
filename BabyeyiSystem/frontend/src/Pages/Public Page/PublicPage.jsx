/**
 * PublicPage.jsx — Babyeyi Landing Page
 * #000435 navy + amber · Tailwind only · Fully responsive (320px → 2560px)
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  GraduationCap, Globe, Users, BookOpen, Bell, Search, Star,
  ArrowRight, MapPin, BarChart3, Shield, Smartphone,
  Menu, X, Building2, Layers, Heart, Sparkles,
  LogIn, Facebook, Twitter, Instagram, Mail, Phone,
  Youtube, ChevronDown, CreditCard, Send, Bot, Loader2, Package,
  UserCheck, ExternalLink,
} from "lucide-react";

import Heroimage from "../../assets/hero-image.png";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5100";

/* ── Font ──────────────────────────────────────────────────────── */
const FontLoader = () => (
  <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');*{font-family:'Barlow','Trebuchet MS',sans-serif!important}`}</style>
);

/* ── Counter ───────────────────────────────────────────────────── */
function useCounter(target, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) return;
    let s = null;
    const step = (ts) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);
  return [count, () => setStarted(true)];
}

function useVisible(ref) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return v;
}

/* ── Navbar ────────────────────────────────────────────────────── */
function Navbar({ onHowItWorksClick }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const BABYEYI_LOGO_URL = "/1BABYEYI LOGO FINAL.png";
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label: "Pay Fees", href: "/pay-by-school", i: true },
    { label: "Services", href: "/services",      i: true },
    { label: "How It Works", href: "#how", isHow: true },
    { label: "Features", href: "#features" },
    { label: "Schools",  href: "/schools",       i: true },
  ];

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 border-b-[3px] border-amber-400 transition-all duration-300 ${scrolled ? "bg-[#000435] shadow-xl shadow-black/30" : "bg-[#000435]/88 backdrop-blur-md"}`}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 flex items-center justify-between h-14 sm:h-16 xl:h-[68px]">
        <Link to="/" className="flex items-center shrink-0">
          <img
            src={BABYEYI_LOGO_URL}
            alt="Babyeyi logo"
            className="h-9 sm:h-10 xl:h-11 w-auto object-contain"
          />
        </Link>

        <div className="hidden lg:flex items-center gap-0.5 xl:gap-1">
          {links.map((l) => l.i
            ? <Link key={l.label} to={l.href} className="px-3 xl:px-4 py-2 rounded-lg text-sm xl:text-[15px] font-semibold text-white/70 hover:text-white hover:bg-white/8 transition-all">{l.label}</Link>
            : <a
                key={l.label}
                href={l.href}
                onClick={(e) => {
                  if (l.isHow) {
                    e.preventDefault();
                    onHowItWorksClick?.();
                  }
                }}
                className="px-3 xl:px-4 py-2 rounded-lg text-sm xl:text-[15px] font-semibold text-white/70 hover:text-white hover:bg-white/8 transition-all"
              >
                {l.label}
              </a>
          )}
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
          {links.map((l) => l.i
            ? <Link key={l.label} to={l.href} onClick={() => setOpen(false)} className="flex px-4 py-3 rounded-xl text-[14px] font-bold text-white/75 hover:bg-white/8 hover:text-white">{l.label}</Link>
            : <a
                key={l.label}
                href={l.href}
                onClick={(e) => {
                  if (l.isHow) {
                    e.preventDefault();
                    onHowItWorksClick?.();
                  }
                  setOpen(false);
                }}
                className="flex px-4 py-3 rounded-xl text-[14px] font-bold text-white/75 hover:bg-white/8 hover:text-white"
              >
                {l.label}
              </a>
          )}
          <Link to="/register" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 w-full mt-1 px-4 py-3 rounded-xl border border-amber-400/40 text-amber-400 text-[14px] font-bold">Register School</Link>
          <a href="/login" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 w-full mt-1 px-4 py-3.5 rounded-xl bg-amber-400 text-[#000435] text-[14px] font-black">
            <LogIn size={16} strokeWidth={2.5} /> Login to Babyeyi
          </a>
        </div>
      )}
    </nav>
  );
}

/* ── AI Search Box ─────────────────────────────────────────────── */
function AISearchBox() {
  const [val, setVal] = useState("");
  const [ph, setPh] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const timer = useRef(null);
  const pi = useRef(0); const ci = useRef(0);

  const prompts = ["Enter student code or SDM ID (e.g. BEY123456789)…", "Find me a good school in Musanze with TVET programs…", "Which schools offer A-Level Sciences near Kigali?", "Look up my child's Babyeyi student UID…"];

  useEffect(() => {
    const type = () => {
      const cur = prompts[pi.current];
      if (ci.current < cur.length) { setPh(cur.slice(0, ci.current + 1)); ci.current++; timer.current = setTimeout(type, 45); }
      else { timer.current = setTimeout(() => { const e = () => { if (ci.current > 0) { ci.current--; setPh(cur.slice(0, ci.current)); timer.current = setTimeout(e, 22); } else { pi.current = (pi.current + 1) % prompts.length; timer.current = setTimeout(type, 400); } }; e(); }, 2200); }
    };
    timer.current = setTimeout(type, 800);
    return () => clearTimeout(timer.current);
  }, []);

  const lookup = async () => {
    const q = val.trim(); setErr(null); setResult(null);
    if (!q) { setErr("Enter a student UID, code, or school directory code."); return; }
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/public/student-code-lookup`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({code:q}) });
      const j = await r.json().catch(()=>({}));
      if (!r.ok || j.success===false) { setErr(j.message||"Lookup failed."); return; }
      if (j.found) { setResult({data:j.data}); return; }
      const sr = await fetch(`${API_BASE}/api/public/public-pay/school-catalog`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({school_code:q}) });
      const sj = await sr.json().catch(()=>({}));
      if (sr.ok && sj.success && sj.data?.school) { setResult({school:sj.data}); return; }
      setResult({notFound:true});
    } catch { setErr("Network error — check your connection."); }
    finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-xl 2xl:max-w-2xl mt-6">
      <div className="flex items-center gap-2 mb-2 pl-1">
        {[0,200,400].map(d=><span key={d} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" style={{animationDelay:`${d}ms`}}/>)}
        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-400">Enter SDMS CODE/ SHULECARD ID</span>
      </div>
      <div className="flex items-center gap-2 p-2.5 rounded-2xl border border-amber-400/30 bg-black/50 backdrop-blur-md">
        <div className="w-9 h-9 rounded-xl bg-amber-400/15 flex items-center justify-center shrink-0"><Bot size={16} className="text-amber-400"/></div>
        <input type="text" value={val} onChange={e=>{setVal(e.target.value);setErr(null);setResult(null);}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();lookup();}}} placeholder={ph||"Student code or question…"} className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[14px] text-white/90 placeholder:text-white/35 outline-none caret-amber-400"/>
        <button type="button" onClick={lookup} disabled={loading} className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-60 ${val?"bg-amber-400 hover:bg-amber-300":"bg-amber-400/12"}`}>
          {loading ? <Loader2 size={16} className={`animate-spin ${val?"text-[#000435]":"text-amber-400/50"}`}/> : <Send size={14} className={val?"text-[#000435]":"text-amber-400/50"} strokeWidth={2.5}/>}
        </button>
      </div>
      {err && <p className="text-[12px] text-amber-200/80 font-medium mt-2 pl-1">{err}</p>}
      {result && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={()=>setResult(null)}/>
          <div className="relative z-10 w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl border-2 border-amber-400/40 bg-[#000435] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2"><GraduationCap size={17} className="text-amber-400"/><span className="text-[14px] font-black text-white">{result.data?"Learner Profile":result.school?"School Details":"No Match Found"}</span></div>
              <button type="button" onClick={()=>setResult(null)} className="p-1.5 rounded-lg hover:bg-white/10"><X size={18} className="text-white/70"/></button>
            </div>
            <div className="overflow-y-auto px-5 py-5 flex-1 space-y-3">
              {result.notFound && (<div><p className="text-[15px] font-bold text-white mb-2">No Learner or School Found</p><p className="text-[13px] text-white/60 leading-relaxed mb-4">Check the student UID, official code, or school directory code.</p><div className="flex gap-2"><Link to="/schools" onClick={()=>setResult(null)} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-[13px] font-black text-[#000435]">Find a School</Link></div></div>)}
              {(result.data||result.school)&&(<div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">{(result.data?[["Student",`${result.data.first_name||""} ${result.data.last_name||""}`.trim()],["UID",result.data.student_uid||"—"],["Class",result.data.class_name||"—"],["School",result.data.school_name||"—"]]:result.school?[["School",result.school.school?.school_name||"—"],["Code",result.school.school?.school_code||"—"],["Location",[result.school.school?.district,result.school.school?.province].filter(Boolean).join(", ")||"—"]]:[]).map(([k,v])=><div key={k} className="flex justify-between gap-3 border-b border-white/8 last:border-0 pb-2 last:pb-0"><span className="text-[11px] font-bold uppercase tracking-wider text-white/45">{k}</span><span className="text-[13px] font-semibold text-white text-right">{v}</span></div>)}</div>)}
            </div>
            <div className="px-5 py-4 border-t border-white/10 shrink-0 space-y-3">
              {result.data && (() => {
                const sc = String(result.data.school_code || "").trim();
                const payCode = encodeURIComponent(sc);
                const st =
                  String(result.data.student_uid || result.data.student_code || result.data.sdm_code || "").trim();
                const payStudent = encodeURIComponent(st);
                const payHref =
                  sc && st
                    ? `/pay-by-school?code=${payCode}&student_uid=${payStudent}`
                    : sc
                      ? `/pay-by-school?code=${payCode}`
                      : "/pay-by-school";
                const slug = String(result.data.mini_website_slug || "").trim();
                return (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      to={payHref}
                      onClick={() => setResult(null)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-[13px] font-black text-[#000435] hover:bg-amber-300 transition-colors"
                    >
                      <CreditCard size={16} strokeWidth={2.5} />
                      Pay fees for this student
                    </Link>
                    {slug ? (
                      <Link
                        to={`/school/${encodeURIComponent(slug)}`}
                        onClick={() => setResult(null)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-amber-400/50 bg-white/10 px-4 py-3 text-[13px] font-black text-white hover:bg-white/15 transition-colors"
                      >
                        <Globe size={16} strokeWidth={2.25} />
                        School mini-website
                        <ExternalLink size={14} className="opacity-70" />
                      </Link>
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/20 px-3 py-2.5 text-[11px] font-semibold text-white/45 text-center">
                        Mini-website not published for this school yet
                      </div>
                    )}
                  </div>
                );
              })()}
              <button type="button" onClick={()=>setResult(null)} className="w-full py-3 rounded-xl bg-white/10 text-white text-[14px] font-bold border border-white/15 hover:bg-white/15">Close</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}

/* ── Hero ──────────────────────────────────────────────────────── */
function HeroSection() {
  const navigate = useNavigate();
  return (
    <section className="relative w-full overflow-hidden pt-14 sm:pt-16 xl:pt-[68px]" style={{minHeight:"100svh"}}>
      <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:`url(${Heroimage})`,backgroundSize:"cover",backgroundPosition:"center top"}}/>
      <div className="absolute inset-0 pointer-events-none" style={{background:"linear-gradient(90deg,rgba(0,4,53,.97) 0%,rgba(0,4,53,.92) 22%,rgba(0,4,53,.72) 48%,rgba(0,4,53,.28) 72%,rgba(0,4,53,.05) 92%)"}}/>
      <div className="absolute inset-0 pointer-events-none md:hidden" style={{background:"rgba(0,4,53,0.72)"}}/>
      <div className="absolute bottom-0 inset-x-0 h-24 sm:h-32 pointer-events-none" style={{background:"linear-gradient(to top,#f8fafc,transparent)"}}/>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 flex flex-col justify-center py-12 sm:py-16 xl:py-20" style={{minHeight:"calc(100svh - 60px)"}}>
        <div className="max-w-lg sm:max-w-xl xl:max-w-2xl 2xl:max-w-3xl">
          <h1 className="font-black text-white leading-[1.04] tracking-tight mb-4 xl:mb-5" style={{fontSize:"clamp(1.9rem,4.5vw,4.25rem)"}}>
            An Integrated <span className="text-amber-400">Digital Platform</span> for Equitable School Readiness
          </h1>
          <div className="w-14 h-[3px] rounded-full bg-amber-400 mb-5"/>
          <p className="text-white/60 text-[15px] xl:text-[17px] leading-relaxed max-w-lg 2xl:max-w-xl mb-8">
            Connecting schools, parents, and communities across Rwanda — payments, admissions, services, and more.
          </p>


          {/* CTA grid */}
          <div className="flex flex-col gap-3 w-full max-w-md xl:max-w-lg">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/pay-by-school" className="inline-flex items-center justify-center gap-2 min-h-[50px] xl:min-h-[54px] rounded-xl bg-amber-400 text-[#000435] font-black text-[13px] xl:text-[15px] hover:bg-amber-300 transition-all active:scale-[.98]">
                <CreditCard size={16} strokeWidth={2.5}/> Pay Fees
              </Link>
              <a href="/login" className="inline-flex items-center justify-center gap-2 min-h-[50px] xl:min-h-[54px] rounded-xl border-2 border-white/20 text-white font-black text-[13px] xl:text-[15px] hover:border-amber-400/60 hover:bg-white/5 transition-all">
                <LogIn size={16} className="text-amber-300"/> Login
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 min-h-[48px] xl:min-h-[52px] rounded-xl border border-amber-400/40 bg-amber-400/8 text-white font-bold text-[13px] xl:text-[14px] hover:bg-amber-400/14 transition-all">
                <Building2 size={16} className="text-amber-400"/> Register School
              </Link>
              <Link to="/services" className="inline-flex items-center justify-center gap-2 min-h-[48px] xl:min-h-[52px] rounded-xl border border-white/15 bg-white/5 text-white font-bold text-[13px] xl:text-[14px] hover:bg-white/10 transition-all">
                <Sparkles size={16} className="text-amber-200/80"/> Services
              </Link>
            </div>
            <button type="button" onClick={()=>navigate("/schools")} className="inline-flex items-center justify-center gap-2 min-h-[46px] rounded-xl border border-amber-400/30 bg-[#000435]/40 text-white font-bold text-[13px] xl:text-[14px] hover:border-amber-400 hover:bg-amber-400/10 transition-all w-full">
              <Search size={16} className="text-amber-400"/> Explore Schools <ArrowRight size={14} className="text-amber-400 ml-auto"/>
            </button>
          </div>

          {/* Stat badges */}
          <div className="hidden sm:flex flex-wrap gap-2 mt-6">
            {[["500+","Schools"],["50K+","Teachers"],["2M+","Students"],["Free","To Access"]].map(([v,l])=>(
              <div key={l} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/6 border border-white/10">
                <span className="font-bold text-[14px] xl:text-[15px] text-amber-400">{v}</span>
                <span className="text-[10px] xl:text-[11px] font-medium text-white/40">{l}</span>
              </div>
            ))}
          </div>
          <AISearchBox/>
        </div>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-30 animate-bounce pointer-events-none z-10">
        <ChevronDown size={20} className="text-amber-400"/>
      </div>
    </section>
  );
}

/* ── Section Header ────────────────────────────────────────────── */
function SH({ eyebrow, title, sub, light=false }) {
  return (
    <div className="text-center mb-10 sm:mb-14 xl:mb-16">
      <div className={`inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] mb-3 ${light?"text-amber-400":"text-amber-600"}`}>
        <span className={`w-8 h-px ${light?"bg-amber-400":"bg-amber-500"}`}/>{eyebrow}<span className={`w-8 h-px ${light?"bg-amber-400":"bg-amber-500"}`}/>
      </div>
      <h2 className={`font-black tracking-tight mb-3 ${light?"text-white":"text-[#000435]"}`} style={{fontSize:"clamp(1.5rem,3.2vw,2.6rem)"}}>
        {title}
      </h2>
      {sub && <p className={`text-[15px] xl:text-[16px] max-w-lg xl:max-w-xl mx-auto ${light?"text-white/50":"text-slate-500"}`}>{sub}</p>}
    </div>
  );
}

/* ── Features ──────────────────────────────────────────────────── */
function FeaturesSection() {
  const ff = [
    {Icon:Globe,title:"School Mini-Websites",desc:"Every school gets a professional website with branding, domain slug, and full content management.",color:"#3B82F6"},
    {Icon:Users,title:"Parent Engagement",desc:"Parents follow school updates, view announcements, track programs, and stay connected daily.",color:"#10B981"},
    {Icon:BookOpen,title:"Academic Programs",desc:"A-Level combos, TVET trades, education levels, and detailed curriculum — fully searchable.",color:"#8B5CF6"},
    {Icon:Bell,title:"Events & Announcements",desc:"Schools post important dates and events that reach parents and community instantly.",color:"#F59E0B"},
    {Icon:Search,title:"Advanced School Search",desc:"Find any school in Rwanda by name, district, sector, education level, or TVET trade.",color:"#EC4899"},
    {Icon:GraduationCap,title:"Online Admissions",desc:"Custom admission forms. Students apply online and receive reference numbers instantly.",color:"#F97316"},
    {Icon:BarChart3,title:"Transparent Info",desc:"Fee structures, leadership teams, and school details — public and always up-to-date.",color:"#06B6D4"},
    {Icon:Shield,title:"Secure & Reliable",desc:"Secure data handling, reliable uptime, and a mobile-first design built for Rwanda.",color:"#84CC16"},
    {Icon:Smartphone,title:"Mobile Friendly",desc:"Every school website is fully responsive — parents access information on any device.",color:"#A855F7"},
    {Icon:CreditCard,title:"Fee Payments",desc:"Parents pay school fees by school code — no account required, mobile-money powered.",color:"#FBBF24"},
    {Icon:Package,title:"ShuleKit",desc:"Essential educational tools and stationery — standard or school-custom — delivered.",color:"#14B8A6"},
    {Icon:Bot,title:"Agent Assistant",desc:"In-platform assistant guiding parents and schools through payments, admissions, and support.",color:"#0EA5E9"},
  ];
  return (
    <section id="features" className="py-16 sm:py-24 xl:py-32 bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="Platform Features" title="Everything Schools Need" sub="A complete digital platform designed for Rwanda's education ecosystem."/>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 xl:gap-5">
          {ff.map((f,i)=>(
            <div key={i} className="group bg-white rounded-2xl p-5 xl:p-6 border border-slate-200 hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
              <div className="w-11 h-11 xl:w-12 xl:h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform" style={{background:`${f.color}18`,color:f.color}}>
                <f.Icon size={20}/>
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

/* ── How It Works ──────────────────────────────────────────────── */
function HowItWorksSection() {
  const ss = [
    {step:"01",title:"School Registers",desc:"School administrators register and set up their Babyeyi profile quickly.",Icon:Building2},
    {step:"02",title:"Build Mini-Website",desc:"Add programs, fees, gallery, leadership, and admission forms via a guided wizard.",Icon:Layers},
    {step:"03",title:"Publish & Share",desc:"Publish at babyeyi.rw/school/your-slug and share the link with families.",Icon:Globe},
    {step:"04",title:"Parents Connect",desc:"Families find your school, view all details, and apply for admission online.",Icon:Heart},
  ];
  return (
    <section id="how" className="py-16 sm:py-24 xl:py-32 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="How It Works" title="Simple. Fast. Powerful." sub="Get your school online in minutes, not months."/>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
          {ss.map((s,i)=>(
            <div key={i} className="group rounded-2xl p-6 xl:p-8 border border-slate-100 hover:border-amber-400 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative">
              <span className="font-black text-slate-100 leading-none mb-4 block" style={{fontSize:"3rem",letterSpacing:"-0.04em"}}>{s.step}</span>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-amber-400/12 group-hover:bg-amber-400 transition-colors">
                <s.Icon size={20} className="text-amber-600 group-hover:text-[#000435] transition-colors"/>
              </div>
              <h3 className="font-bold text-[#000435] text-[15px] xl:text-[16px] mb-2">{s.title}</h3>
              <p className="text-slate-500 text-[13px] leading-relaxed">{s.desc}</p>
              {i<ss.length-1&&<ArrowRight size={18} className="absolute top-1/2 -right-3 -translate-y-1/2 text-amber-300 hidden xl:block"/>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Demo Video ────────────────────────────────────────────────── */
function DemoSection() {
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-[#1F2937]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="Platform Demo" title="See Babyeyi in Action" light sub="Demo video is coming soon." />
        <div className="relative rounded-2xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl" style={{ paddingBottom: "56.25%" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-700">
            <div className="px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-amber-400/40 bg-amber-400/15 text-amber-400">
              Coming Soon
            </div>
            <p className="text-sm font-semibold text-white/55 mt-4">
              Demo video will be available here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Stats Section ─────────────────────────────────────────────── */
function StatsSection() {
  const ss = [{target:500,suffix:"+",label:"Schools",Icon:Building2},{target:200000,suffix:"+",label:"Students",Icon:GraduationCap},{target:10000,suffix:"+",label:"Teachers",Icon:Users},{target:30,suffix:"",label:"Districts",Icon:MapPin}];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-[#000435]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="By the Numbers" title="Growing Every Day" light sub="Trusted by schools and families across all provinces of Rwanda."/>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 xl:gap-6">
          {ss.map((s,i)=>{
            const ref=useRef(null); const visible=useVisible(ref); const [count,start]=useCounter(s.target,1800);
            useEffect(()=>{if(visible)start();},[visible]);
            return (
              <div ref={ref} key={i} className="flex flex-col items-center text-center rounded-2xl border border-amber-400/20 bg-white/4 p-6 xl:p-8 hover:border-amber-400/50 transition-colors">
                <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-xl bg-amber-400/12 flex items-center justify-center mb-4"><s.Icon size={22} className="text-amber-400"/></div>
                <span className="font-black text-[2.25rem] xl:text-[3rem] text-white leading-none">{count.toLocaleString()}{s.suffix}</span>
                <span className="text-white/50 text-[13px] xl:text-[14px] font-semibold mt-1">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── Testimonials ──────────────────────────────────────────────── */
function TestimonialsSection() {
  const tt=[{quote:"Babyeyi has transformed how we communicate with parents. All school information at their fingertips.",author:"Jean Pierre Nkurunziza",role:"Headmaster, GS Gahini",initials:"JN"},{quote:"As a parent, I love checking programs, fee structure, and applying for my child's admission online.",author:"Ange Uwimana",role:"Parent, Kigali",initials:"AU"},{quote:"The admission system saves so much time. Everything is digital, organised, and instant.",author:"Marie Claire Ingabire",role:"School Secretary, GS Kayonza",initials:"MI"}];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-slate-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="Testimonials" title="Trusted Across Rwanda" sub="Hear from schools and parents already using Babyeyi."/>
        <div className="grid md:grid-cols-3 gap-4 xl:gap-6">
          {tt.map((t,i)=>(
            <div key={i} className="bg-white rounded-2xl p-6 xl:p-8 border border-slate-100 hover:border-amber-400 hover:shadow-lg transition-all duration-200 relative overflow-hidden">
              <span className="absolute top-4 right-5 text-[5rem] font-black leading-none text-slate-50 select-none">❝</span>
              <div className="flex gap-0.5 mb-5">{[...Array(5)].map((_,j)=><Star key={j} size={13} className="fill-amber-400 text-amber-400"/>)}</div>
              <p className="text-slate-600 text-[13px] xl:text-[14px] leading-relaxed mb-6 relative z-10">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#000435] flex items-center justify-center font-black text-[13px] text-amber-400">{t.initials}</div>
                <div><p className="font-bold text-[#000435] text-[13px]">{t.author}</p><p className="text-slate-400 text-[11px]">{t.role}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Quick Actions ─────────────────────────────────────────────── */
function QuickActionsSection() {
  const aa=[
    {Icon:Search,title:"Find a School",desc:"Search 500+ schools by district, level, or TVET trade. Compare programs, fees, and facilities.",cta:"Explore Schools",href:"/schools",accent:"#3B82F6"},
    {Icon:CreditCard,title:"Pay School Fees",desc:"Pay fees online using your school code and MTN Mobile Money. No account needed — fast and safe.",cta:"Pay Now",href:"/pay-by-school",accent:"#FBBF24",highlight:true},
    {Icon:GraduationCap,title:"Apply for Admission",desc:"Submit your child's admission application online. Get a reference number instantly.",cta:"Start Application",href:"/schools",accent:"#10B981"},
    {Icon:UserCheck,title:"Parent Dashboard",desc:"Track your child's school, payments, services, and more in one secure parent account.",cta:"Parent Login",href:"/parents/login",accent:"#8B5CF6"},
    {Icon:Package,title:"Order a ShuleKit",desc:"Get your child's school kit — uniforms, shoes, stationery — delivered or collected at school.",cta:"Shop Services",href:"/services",accent:"#F97316"},
    {Icon:Building2,title:"Register Your School",desc:"Get your school online in minutes. Mini-website, admissions, and reach more families.",cta:"Register Free",href:"/register",accent:"#EC4899"},
  ];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16">
        <SH eyebrow="Get Started" title="What Would You Like to Do?" sub="Jump straight to what you need — no browsing required."/>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 xl:gap-5">
          {aa.map((a,i)=>(
            <div key={i} className={`group relative rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${a.highlight?"border-amber-400 bg-[#000435]":"border-slate-200 bg-white hover:border-amber-400"}`}>
              <div className="h-[3px] w-0 group-hover:w-full transition-all duration-300" style={{background:a.highlight?"#FBBF24":a.accent}}/>
              <div className="p-5 xl:p-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform group-hover:scale-105" style={{background:a.highlight?"rgba(251,191,36,0.2)":(`${a.accent}14`),color:a.highlight?"#FBBF24":a.accent,border:`2px solid ${a.highlight?"#FBBF24":"#000435"}`}}>
                  <a.Icon size={22}/>
                </div>
                <h3 className={`font-black text-[16px] xl:text-[17px] mb-2 ${a.highlight?"text-amber-400":"text-[#000435]"}`}>{a.title}</h3>
                <p className={`text-[13px] leading-relaxed mb-5 ${a.highlight?"text-white/60":"text-slate-500"}`}>{a.desc}</p>
                <Link to={a.href} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-black min-h-[42px] transition-all ${a.highlight?"bg-amber-400 text-[#000435] hover:bg-amber-300":"bg-[#000435] text-amber-400 hover:bg-[#000c6b]"}`}>
                  {a.cta} <ArrowRight size={13}/>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Partners ──────────────────────────────────────────────────── */
function PartnersSection() {
  const pp=[
    {name:"MINEDUC",full:"Ministry of Education",abbr:"MI",color:"#1D4ED8",bg:"#EFF6FF"},
    {name:"REB",full:"Rwanda Education Board",abbr:"RE",color:"#059669",bg:"#ECFDF5"},
    {name:"NESA",full:"National Exam & School Inspection",abbr:"NE",color:"#DC2626",bg:"#FEF2F2"},
    {name:"HOSO",full:"Higher Education Council",abbr:"HO",color:"#7C3AED",bg:"#F5F3FF"},
    {name:"RPSA",full:"Rwanda Private Sector Association",abbr:"RP",color:"#B45309",bg:"#FFFBEB"},
    {name:"MTN RW",full:"MTN Rwanda — Mobile Payments",abbr:"MT",color:"#F59E0B",bg:"#FFFBEB"},
    
  ];
  const loop=[...pp,...pp];
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-[#000435] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 mb-10 sm:mb-14">
        <SH eyebrow="Partners & Ecosystem" title="Aligned with Rwanda's Education System" light sub="Babyeyi works within Rwanda's national education institutions and regulatory bodies."/>
      </div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-16 sm:w-32 z-10 pointer-events-none" style={{background:"linear-gradient(to right,#000435,transparent)"}}/>
        <div className="absolute inset-y-0 right-0 w-16 sm:w-32 z-10 pointer-events-none" style={{background:"linear-gradient(to left,#000435,transparent)"}}/>
        <div className="flex gap-4 hover:[animation-play-state:paused]" style={{width:"max-content",animation:"marquee 28s linear infinite"}}>
          {loop.map((p,i)=>(
            <div key={i} className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-amber-400/15 bg-white/4 shrink-0 min-w-[180px] hover:border-amber-400/50 hover:bg-white/8 transition-all duration-200 cursor-default group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[13px] shrink-0 group-hover:scale-105 transition-transform" style={{background:p.bg,color:p.color}}>{p.abbr}</div>
              <div className="min-w-0"><p className="font-black text-white text-[14px] leading-none">{p.name}</p><p className="text-white/40 text-[11px] mt-0.5 truncate">{p.full}</p></div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </section>
  );
}

/* ── CTA ───────────────────────────────────────────────────────── */
function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="py-16 sm:py-24 xl:py-32 bg-[#000435] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{backgroundImage:"linear-gradient(rgba(251,191,36,.8) 1px,transparent 1px),linear-gradient(90deg,rgba(251,191,36,.8) 1px,transparent 1px)",backgroundSize:"50px 50px"}}/>
      <div className="relative z-10 max-w-3xl xl:max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-400 mb-4"><span className="w-8 h-px bg-amber-400"/>Get Started Today<span className="w-8 h-px bg-amber-400"/></div>
        <h2 className="font-black text-white tracking-tight mb-4" style={{fontSize:"clamp(1.7rem,4vw,3.2rem)"}}>Bring Your School<br/><span className="text-amber-400">Online Today</span></h2>
        <p className="text-white/50 text-[15px] xl:text-[16px] mb-10 max-w-lg mx-auto leading-relaxed">Join hundreds of Rwandan schools already using Babyeyi to connect with parents and communities.</p>
        <div className="max-w-xl mx-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={()=>navigate("/schools")} className="inline-flex items-center justify-center gap-2 min-h-[50px] xl:min-h-[54px] rounded-xl bg-amber-400 text-[#000435] font-black text-[13px] xl:text-[15px] hover:bg-amber-300 transition-all active:scale-[.98]"><Search size={16} strokeWidth={2.5}/>Explore Schools</button>
            <Link to="/register" className="inline-flex items-center justify-center gap-2 min-h-[50px] xl:min-h-[54px] rounded-xl border-2 border-white/20 text-white font-black text-[13px] xl:text-[15px] hover:border-amber-400/60 hover:bg-white/5 transition-all"><Building2 size={16} className="text-amber-300"/>Register School</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/school-manager/login" className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-amber-400/40 bg-amber-400/8 text-white font-bold text-[13px] xl:text-[14px] hover:bg-amber-400/14 transition-all"><GraduationCap size={16} className="text-amber-400"/>School Manager</Link>
            <Link to="/parents/login" className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-white/15 bg-white/5 text-white font-bold text-[13px] xl:text-[14px] hover:bg-white/10 transition-all"><Users size={16} className="text-amber-200/80"/>Parent Login</Link>
          </div>
        </div>
        <p className="text-white/25 text-[11px] mt-6">No credit card needed · Free for all Rwandan schools</p>
      </div>
    </section>
  );
}

/* ── Footer ────────────────────────────────────────────────────── */
function Footer() {
  const cols=[
    {title:"Platform",links:[{l:"About Babyeyi",h:"#about"},{l:"Features",h:"#features"},{l:"How It Works",h:"#how"},{l:"Pricing",h:"#pricing"}]},
    {title:"Schools",links:[{l:"Search Schools",h:"/schools",i:true},{l:"Pay by School Code",h:"/pay-by-school",i:true},{l:"Register School",h:"/register",i:true},{l:"TVET Trades",h:"/schools",i:true}]},
    {title:"Accounts",links:[{l:"School Manager Login",h:"/school-manager/login",i:true},{l:"Parent Login",h:"/parents/login",i:true},{l:"Staff Login",h:"/login",i:true},{l:"Services",h:"/services",i:true}]},
    {title:"Support",links:[{l:"Help Center",h:"#"},{l:"Contact Us",h:"#contact"},{l:"Privacy Policy",h:"#"},{l:"Terms of Service",h:"#"}]},
  ];
  return (
    <footer className="bg-[#000018]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 xl:px-10 2xl:px-16 pt-12 xl:pt-16 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 xl:gap-12 mb-10 xl:mb-14">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center"><GraduationCap size={17} className="text-[#000435]"/></div>
              <span className="font-black text-[17px] text-white">baby<span className="text-amber-400">eyi</span><span className="text-amber-400/60">.rw</span></span>
            </Link>
            <p className="text-slate-500 text-[13px] leading-relaxed mb-5">Connecting schools, parents, and communities.</p>
            <div className="flex gap-2">
              {[{Icon:Facebook,bg:"#1877F2"},{Icon:Twitter,bg:"#1DA1F2"},{Icon:Instagram,bg:"#E4405F"},{Icon:Youtube,bg:"#FF0000"}].map(({Icon,bg},i)=>(
                <a key={i} href="#" className="w-9 h-9 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform" style={{background:bg}}><Icon size={14}/></a>
              ))}
            </div>
          </div>
          {cols.map(col=>(
            <div key={col.title}>
              <h4 className="font-black text-white text-[11px] uppercase tracking-[0.1em] mb-4 xl:mb-5">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(({l,h,i})=>(
                  <li key={l}>{i?<Link to={h} className="text-slate-500 text-[13px] font-medium hover:text-amber-400 transition-colors">{l}</Link>:<a href={h} className="text-slate-500 text-[13px] font-medium hover:text-amber-400 transition-colors">{l}</a>}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-5 pb-6 border-b border-white/5">
          {[{Icon:Mail,v:"hello@babyeyi.rw"},{Icon:Phone,v:"+250 788 000 000"},{Icon:MapPin,v:"Kigali, Rwanda"}].map(({Icon,v})=>(
            <div key={v} className="flex items-center gap-2 text-[13px] text-slate-500 font-medium"><Icon size={13} className="text-amber-400"/> {v}</div>
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

export default function PublicPage() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const handleHowItWorksClick = () => {
    setShowHowItWorks(true);
    if (window.location.hash !== "#how") {
      window.history.replaceState(null, "", "#how");
    }
    window.setTimeout(() => {
      document.getElementById("how")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  useEffect(()=>{ document.title="Babyeyi.rw — Connecting Schools & Communities in Rwanda"; },[]);
  useEffect(() => {
    if (window.location.hash === "#how") {
      handleHowItWorksClick();
    }
  }, []);

  return (
    <div>
      <FontLoader/>
      <Navbar onHowItWorksClick={handleHowItWorksClick}/>
      <HeroSection/>
      <FeaturesSection/>
      <DemoSection/>
      <TestimonialsSection/>
      <QuickActionsSection/>
      <PartnersSection/>
      {showHowItWorks && <HowItWorksSection/>}
      <CTASection/>
      <Footer/>
    </div>
  );
}