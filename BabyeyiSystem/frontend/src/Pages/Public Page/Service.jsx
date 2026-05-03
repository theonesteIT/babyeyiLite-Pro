import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";
import shuleKitHero from "../../assets/image2.png";
import {
  ArrowRight, CreditCard, Footprints,
  Shirt, PenLine, Store, Smartphone, Layers,
  Menu, User, Home, LayoutGrid,
  MapPin,
} from "lucide-react";

/* ─── Palette ─────────────────────────────────────────────── */
const NAVY  = "#000435";
const AMB   = "#FBBF24";
const AMB2  = "#F59E0B";
const MTN   = "'MTN Brighter Sans','Trebuchet MS','Segoe UI',sans-serif";

/* ─── Static service list ─────────────────────────────────── */
const SERVICES = [
  { key:"shulecard",  Icon:Smartphone, title:"ShuleCard",           desc:"A digital tool that helps students manage transactions using an NFC wristband or card.", href:"/services/shulecard",       cta:"View & pay" },
  { key:"shuleshoe",  Icon:Footprints,  title:"Shoes Voucher",        desc:"Footwear support with voucher options, lookup, delivery and tracking.",                 href:"/services/shoes-voucher",        cta:"Open flow" },
  { key:"uniform",    Icon:Shirt,       title:"Uniform Voucher",     desc:"Ensures students have at least one set of new uniforms at the beginning of each academic year.", href:"/services/uniform-voucher/request", cta:"Open flow" },
  { key:"mybabyeyi",  Icon:User,        title:"My Babyeyi Account",  desc:"Your family dashboard for tracking all services and payments in one place.",              href:"#",                     cta:"Coming soon", soon:true },
  { key:"paidschool", Icon:CreditCard,  title:"Paid at School",      desc:"Easily pay school fees and school items through the portal using your school code.",    href:"/paid-at-school",                cta:"Pay by school code" },
  { key:"requirementsOnly", Icon:Layers, title:"Requirements Only",   desc:"Pay only school requirements using the custom ShuleKiti", href:"/services/shulekit-pay", cta:"Pay Requirements" },
  { key:"papeterie",  Icon:Store,       title:"Shule Papeterie",     desc:"Stationery and learning materials, fast and convenient.",                                  href:"#",       cta:"Coming soon", soon:true },
];

/* ─── Navbar ─────────────────────────────────────────────── */
function Navbar({ onServices }) {
  const [open, setOpen] = useState(false);
  const lk = { color:"rgba(255,255,255,.75)", textDecoration:"none", fontFamily:MTN, fontWeight:700, fontSize:14, display:"inline-flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:8 };
  const mlk = { ...lk, display:"flex", borderRadius:0, borderBottom:"1px solid rgba(255,255,255,.07)", padding:"13px 4px" };
  return (
    <nav style={{ background:NAVY, borderBottom:`3px solid ${AMB}`, position:"sticky", top:0, zIndex:100, fontFamily:MTN }}>
      <div className="nb-inner" style={{ maxWidth:1152, margin:"0 auto", padding:"0 1rem", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        {/* Brand */}
        <Link to="/" style={{ display:"flex", alignItems:"center", textDecoration:"none" }}>
          <img
            src={babyeyiLogo}
            alt="Babyeyi logo"
            style={{ height:36, width:"auto", objectFit:"contain" }}
          />
        </Link>
        {/* Desktop links */}
        <div className="nb-links" style={{ display:"flex", alignItems:"center", gap:2 }}>
          <Link to="/" style={lk}><Home size={14}/>Home</Link>
          <button type="button" onClick={onServices} style={{ ...lk, background:"none", border:"none", cursor:"pointer" }}><LayoutGrid size={14}/>Services</button>
          <Link to="/find-agent" style={lk}><MapPin size={14}/>FindAgent</Link>
          <Link to="/paid-at-school" style={lk}><CreditCard size={14}/>Pay</Link>
          <Link to="/dashboard" style={{ ...lk, marginLeft:8, background:AMB, color:NAVY, fontWeight:900 }}>My Account</Link>
        </div>
        {/* Hamburger */}
        <button type="button" className="nb-ham" onClick={() => setOpen(!open)}
          style={{ display:"none", background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.15)", borderRadius:8, padding:8, cursor:"pointer" }}>
          <Menu size={20} color="#fff" />
        </button>
      </div>
      {/* Mobile menu */}
      {open && (
        <div style={{ background:NAVY, borderTop:"1px solid rgba(255,255,255,.08)", padding:"0.5rem 1rem 1rem" }}>
          {[
            { label:"Home", to:"/", Icon:Home },
            { label:"FindAgent", to:"/find-agent", Icon:MapPin },
            { label:"Pay", to:"/paid-at-school", Icon:CreditCard },
          ].map(({ label, to, Icon:I }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} style={mlk}><I size={15}/>{label}</Link>
          ))}
          <button type="button" onClick={() => { onServices(); setOpen(false); }} style={{ ...mlk, background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"left" }}><LayoutGrid size={15}/>Services</button>
          <Link to="/dashboard" onClick={() => setOpen(false)} style={{ ...mlk, background:AMB, color:NAVY, fontWeight:900, borderRadius:10, marginTop:8, border:"none", justifyContent:"center" }}>My Account</Link>
        </div>
      )}
      <style>{`.nb-links{} @media(max-width:768px){.nb-links{display:none!important}.nb-ham{display:flex!important}}`}</style>
    </nav>
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

/* ─── ShuleKit hero card ─────────────────────────────────── */
function ShuleKitCard() {
  return (
    <>
      <style>{`
        .sk-hero {
          grid-column: 1 / -1;
          background: ${NAVY};
          border: 2px solid ${AMB};
          border-radius: 18px;
          overflow: hidden;
          display: flex;
          flex-wrap: wrap;
          align-items: stretch;
          font-family: ${MTN};
        }
        .sk-hero-media {
          flex: 1 1 100%;
          min-height: 160px;
          max-height: 210px;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid rgba(251, 191, 36, 0.35);
          background: rgba(0, 4, 53, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.45rem 0.6rem 0.2rem;
          isolation: isolate;
        }
        .sk-hero-media img {
          width: min(100%, 300px);
          height: min(100%, 200px);
          min-height: 140px;
          object-fit: contain;
          object-position: center bottom;
          display: block;
          mix-blend-mode: multiply;
          filter: contrast(1.02) saturate(0.98);
        }
        .sk-hero-content {
          padding: 1.35rem 1.2rem 1.25rem;
          flex: 1;
          min-width: min(100%, 280px);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        @media (min-width: 640px) {
          .sk-hero-media {
            flex: 0 0 30%;
            max-width: 34%;
            min-height: 210px;
            max-height: none;
            border-bottom: none;
            border-right: 1px solid rgba(251, 191, 36, 0.35);
            padding: 0.75rem 0.7rem 0.3rem;
          }
          .sk-hero-media img {
            width: min(100%, 270px);
            height: min(100%, 200px);
            min-height: 170px;
          }
          .sk-hero-content {
            padding: 1.5rem 1.45rem 1.35rem;
          }
        }
        @media (min-width: 900px) {
          .sk-hero-media {
            flex: 0 0 28%;
            max-width: 31%;
            min-height: 220px;
          }
          .sk-hero-media img {
            width: min(100%, 250px);
            height: min(100%, 210px);
          }
          .sk-hero-content {
            padding: 1.75rem 1.6rem 1.55rem;
          }
        }
      `}</style>
      <article className="sk-hero">
        <div className="sk-hero-media">
          <img src={shuleKitHero} alt="ShuleKit — standard and custom school kits" decoding="async" loading="lazy" />
        </div>
        <div className="sk-hero-content">
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:6, flexWrap:"wrap" }}>
            <h2 style={{ fontFamily:MTN, fontWeight:900, fontSize:"clamp(16px, 3.5vw, 18px)", color:"#fff", margin:0 }}>ShuleKit (Classkit)</h2>
            <span style={{ background:AMB, color:NAVY, fontFamily:MTN, fontWeight:900, fontSize:10, borderRadius:5, padding:"3px 8px", textTransform:"uppercase" }}>Featured</span>
          </div>
          <p style={{ fontFamily:MTN, fontSize:"clamp(13px, 2.8vw, 14px)", color:"rgba(255,255,255,.58)", lineHeight:1.65, margin:"0 0 1.1rem", maxWidth:520 }}>
            Choose a Babyeyi standard kit by grade, or follow your school's custom list — same secure flow as paying fees by school.
          </p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <Link to="/services/standard-shulekit" style={{ display:"inline-flex", alignItems:"center", gap:8, background:AMB, color:NAVY, fontFamily:MTN, fontWeight:900, fontSize:"clamp(12px, 2.5vw, 13px)", borderRadius:10, padding:"10px 16px", textDecoration:"none", minHeight:44, flex:"1 1 auto", justifyContent:"center" }}>
              <Layers size={15}/> Standard ShuleKit <ArrowRight size={13}/>
            </Link>
            <Link to="/services/shulekit-pay" style={{ display:"inline-flex", alignItems:"center", gap:8, border:`2px solid ${AMB}55`, color:"rgba(255,255,255,.88)", fontFamily:MTN, fontWeight:800, fontSize:"clamp(12px, 2.5vw, 13px)", borderRadius:10, padding:"10px 16px", textDecoration:"none", minHeight:44, flex:"1 1 auto", justifyContent:"center" }}>
              <PenLine size={14} color={AMB}/> Custom ShuleKit <ArrowRight size={13} color={AMB}/>
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function Service() {
  const svcRef  = useRef(null);
  const go = r => r.current?.scrollIntoView({ behavior:"smooth", block:"start" });

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC", fontFamily:MTN }}>
      <Navbar onServices={() => go(svcRef)} />

      {/* Services */}
      <section ref={svcRef} style={{ maxWidth:1152, margin:"0 auto", padding:"3.5rem 1rem 0" }}>
        <SecHead
          title="Services"
          sub="Open any service to see details, then pay with a student code — no login required."
        />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:15 }}>
          <ShuleKitCard/>
          {SERVICES.map(s => <SvcCard key={s.key} {...s}/>)}
        </div>
      </section>

      {/* Tip */}
      

    </div>
  );
}