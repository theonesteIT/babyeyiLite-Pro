import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import babyeyiLogo from "../../assets/1BABYEYI LOGO FINAL.png";
import {
  ArrowRight, Bot, CreditCard, Footprints, Package,
  Shirt, Sparkles, X, Loader2, PenLine, Store, Smartphone, Layers,
  Menu, User, Home, LayoutGrid, Zap,
  MapPin,
} from "lucide-react";

/* ─── Palette ─────────────────────────────────────────────── */
const NAVY  = "#000435";
const AMB   = "#FBBF24";
const AMB2  = "#F59E0B";
const MTN   = "'MTN Brighter Sans','Trebuchet MS','Segoe UI',sans-serif";

/* ─── Static service list ─────────────────────────────────── */
const SERVICES = [
  { key:"shulecard",  Icon:Smartphone, title:"ShuleCard",           desc:"A digital tool that helps students manage transactions using an NFC wristband or card.", href:"/services/item/shulecard",       cta:"View & pay" },
  { key:"shuleshoe",  Icon:Footprints,  title:"Shoes Voucher",        desc:"Footwear support with voucher options, lookup, delivery and tracking.",                 href:"/services/shoes-voucher",        cta:"Open flow" },
  { key:"uniform",    Icon:Shirt,       title:"Uniform Voucher",     desc:"Ensures students have at least one set of new uniforms at the beginning of each academic year.", href:"/services/uniform-voucher", cta:"Open flow" },
  { key:"mybabyeyi",  Icon:User,        title:"My Babyeyi Account",  desc:"Your family dashboard for tracking all services and payments in one place.",              href:"/dashboard",                     cta:"Open Dashboard" },
  { key:"paidschool", Icon:CreditCard,  title:"Paid at School",      desc:"Pay school fees and requirements through the school portal with just a school code.",    href:"/pay-by-school",                 cta:"Pay by school code" },
  { key:"papeterie",  Icon:Store,       title:"Shule Papeterie",     desc:"Stationery and learning materials, fast and convenient.",                                  href:"/services/shule-papeterie",       cta:"Open store" },
];

const TOOLS = [
  { key:"markai", Icon:Sparkles, title:"Mark Me AI",       desc:"Designed to help parents support their children's homework and academic progress from home.",                                                   cta:"Try Mark Me AI",  ai:true  },
  { key:"agent",  Icon:Bot,      title:"Agent Assistant",  desc:"Strategic enabler bringing Babyeyi's services directly into communities where families routinely transact and seek support.", cta:"Coming soon", soon:true },
];

/* ─── Navbar ─────────────────────────────────────────────── */
function Navbar({ onServices, onTools }) {
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
          <button type="button" onClick={onTools}    style={{ ...lk, background:"none", border:"none", cursor:"pointer" }}><Zap size={14}/>Tools</button>
          <Link to="/find-agent" style={lk}><MapPin size={14}/>FindAgent</Link>
          <Link to="/pay-by-school" style={lk}><CreditCard size={14}/>Pay</Link>
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
            { label:"Pay", to:"/pay-by-school", Icon:CreditCard },
          ].map(({ label, to, Icon:I }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} style={mlk}><I size={15}/>{label}</Link>
          ))}
          <button type="button" onClick={() => { onServices(); setOpen(false); }} style={{ ...mlk, background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"left" }}><LayoutGrid size={15}/>Services</button>
          <button type="button" onClick={() => { onTools(); setOpen(false); }}    style={{ ...mlk, background:"none", border:"none", cursor:"pointer", width:"100%", textAlign:"left" }}><Zap size={15}/>Tools</button>
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
    <article style={{ gridColumn:"1/-1", background:NAVY, border:`2px solid ${AMB}`, borderRadius:18, overflow:"hidden", display:"flex", flexWrap:"wrap", fontFamily:MTN }}>
      <div style={{ background:AMB, display:"flex", alignItems:"center", justifyContent:"center", padding:"2rem 2.25rem", flexShrink:0 }}>
        <Package size={50} color={NAVY} strokeWidth={1.4}/>
      </div>
      <div style={{ padding:"1.5rem 1.75rem", flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:6 }}>
          <h2 style={{ fontFamily:MTN, fontWeight:900, fontSize:18, color:"#fff", margin:0 }}>ShuleKit (Classkit)</h2>
          <span style={{ background:AMB, color:NAVY, fontFamily:MTN, fontWeight:900, fontSize:10, borderRadius:5, padding:"3px 8px", textTransform:"uppercase" }}>Featured</span>
        </div>
        <p style={{ fontFamily:MTN, fontSize:14, color:"rgba(255,255,255,.58)", lineHeight:1.65, margin:"0 0 1.25rem", maxWidth:500 }}>
          Choose a Babyeyi standard kit by grade, or follow your school's custom list — same secure flow as paying fees by school.
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <Link to="/services/standard-shulekit" style={{ display:"inline-flex", alignItems:"center", gap:8, background:AMB, color:NAVY, fontFamily:MTN, fontWeight:900, fontSize:13, borderRadius:10, padding:"11px 18px", textDecoration:"none", minHeight:46 }}>
            <Layers size={15}/> Standard ShuleKit <ArrowRight size={13}/>
          </Link>
          <Link to="/pay-by-school?intent=classkit" style={{ display:"inline-flex", alignItems:"center", gap:8, border:`2px solid ${AMB}55`, color:"rgba(255,255,255,.88)", fontFamily:MTN, fontWeight:800, fontSize:13, borderRadius:10, padding:"11px 18px", textDecoration:"none", minHeight:46 }}>
            <PenLine size={14} color={AMB}/> Custom ShuleKit <ArrowRight size={13} color={AMB}/>
          </Link>
        </div>
      </div>
    </article>
  );
}

/* ─── Tool card ──────────────────────────────────────────── */
function ToolCard({ Icon, title, desc, cta, soon, onClick }) {
  return (
    <article style={{ background:"#fff", border:"1.5px solid #E2E8F0", borderRadius:16, padding:"1.4rem", display:"flex", gap:14, alignItems:"flex-start", fontFamily:MTN }}>
      <div style={{ width:46, height:46, borderRadius:11, background:NAVY, border:`2px solid ${AMB}`, display:"flex", alignItems:"center", justifyContent:"center", color:AMB, flexShrink:0 }}>
        <Icon size={21}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
          <h3 style={{ fontFamily:MTN, fontWeight:800, fontSize:15, color:NAVY, margin:0 }}>{title}</h3>
          {soon && <span style={{ border:`1px solid ${AMB}`, color:AMB2, background:"#FFFBEB", fontFamily:MTN, fontWeight:700, fontSize:10, borderRadius:5, padding:"2px 7px", textTransform:"uppercase" }}>Soon</span>}
        </div>
        <p style={{ fontFamily:MTN, fontSize:13.5, color:"#64748b", lineHeight:1.6, margin:"0 0 1rem" }}>{desc}</p>
        <button type="button" onClick={soon ? undefined : onClick} disabled={soon}
          style={{ display:"inline-flex", alignItems:"center", gap:7, background: soon ? "#F1F5F9" : NAVY, color: soon ? "#94A3B8" : AMB, fontFamily:MTN, fontWeight:800, fontSize:13, borderRadius:10, padding:"10px 16px", border:"none", cursor: soon ? "not-allowed" : "pointer", minHeight:42 }}>
          {cta}{!soon && <ArrowRight size={13}/>}
        </button>
      </div>
    </article>
  );
}

/* ─── AI Modal ───────────────────────────────────────────── */
function AiModal({ onClose }) {
  const [inp, setInp] = useState({ code:"", req:"" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const run = async (e) => {
    e.preventDefault(); setErr(null); setResult(null);
    if (!inp.code.trim()) { setErr("Enter a student code."); return; }
    if (!inp.req.trim())  { setErr("Describe what you need help with."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setResult({ title:"Mark Me AI (Demo)", body:`Student: ${inp.code}\nRequest: ${inp.req}\n\nConnect a backend endpoint to generate tailored guidance.` });
    setLoading(false);
  };
  const ib = { width:"100%", border:`2px solid #E2E8F0`, borderRadius:10, padding:"12px 14px", fontFamily:MTN, fontWeight:600, fontSize:14, color:NAVY, outline:"none", boxSizing:"border-box", minHeight:48 };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <button type="button" onClick={onClose} aria-label="Close" style={{ position:"absolute", inset:0, background:`${NAVY}CC`, border:"none", cursor:"pointer" }}/>
      <div style={{ position:"relative", width:"100%", maxWidth:470, maxHeight:"90vh", overflowY:"auto", borderRadius:20, border:`2px solid ${AMB}`, background:"#fff" }}>
        <div style={{ background:NAVY, padding:"1rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Sparkles size={17} color={AMB}/>
            <span style={{ fontFamily:MTN, fontWeight:900, fontSize:15, color:"#fff" }}>Mark Me AI</span>
          </div>
          <button type="button" onClick={onClose} style={{ background:"rgba(255,255,255,.1)", border:"none", borderRadius:8, width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={15} color="rgba(255,255,255,.7)"/>
          </button>
        </div>
        <form onSubmit={run} style={{ padding:"1.25rem", display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ display:"block", fontFamily:MTN, fontWeight:700, fontSize:10, color:"#94A3B8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:6 }}>Student code / UID</label>
            <input value={inp.code} onChange={e => setInp(p=>({...p,code:e.target.value}))} placeholder="e.g. 040030001" style={ib}/>
          </div>
          <div>
            <label style={{ display:"block", fontFamily:MTN, fontWeight:700, fontSize:10, color:"#94A3B8", textTransform:"uppercase", letterSpacing:".1em", marginBottom:6 }}>Request</label>
            <textarea rows={4} value={inp.req} onChange={e => setInp(p=>({...p,req:e.target.value}))} placeholder="What would you like help with?" style={{ ...ib, resize:"none", minHeight:"auto" }}/>
          </div>
          {err    && <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, padding:"10px 14px", fontFamily:MTN, fontSize:13, color:"#DC2626" }}>{err}</div>}
          {result && (
            <div style={{ background:"#FFFBEB", border:`2px solid ${AMB}`, borderRadius:10, padding:"12px 14px" }}>
              <div style={{ fontFamily:MTN, fontWeight:900, fontSize:13, color:NAVY, marginBottom:6 }}>{result.title}</div>
              <pre style={{ fontFamily:MTN, fontSize:13, color:"#475569", whiteSpace:"pre-wrap", margin:0 }}>{result.body}</pre>
            </div>
          )}
          <div style={{ display:"flex", gap:10, flexDirection:"row-reverse" }}>
            <button type="submit" disabled={loading} style={{ flex:1, display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, background:NAVY, color:AMB, fontFamily:MTN, fontWeight:900, fontSize:14, border:"none", borderRadius:10, padding:13, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .6 : 1, minHeight:48 }}>
              {loading ? <><Loader2 size={15} className="spin"/> Working…</> : "Run Mark Me AI"}
            </button>
            <button type="button" onClick={onClose} style={{ padding:"13px 18px", fontFamily:MTN, fontWeight:700, fontSize:14, background:"#F8FAFC", border:"2px solid #E2E8F0", borderRadius:10, cursor:"pointer", color:"#475569" }}>Cancel</button>
          </div>
        </form>
      </div>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function Service() {
  const [aiOpen, setAiOpen] = useState(false);
  const svcRef  = useRef(null);
  const toolRef = useRef(null);
  const go = r => r.current?.scrollIntoView({ behavior:"smooth", block:"start" });

  return (
    <div style={{ minHeight:"100vh", background:"#F8FAFC", fontFamily:MTN }}>
      <Navbar onServices={() => go(svcRef)} onTools={() => go(toolRef)}/>

      {/* Services */}
      <section ref={svcRef} style={{ maxWidth:1152, margin:"0 auto", padding:"3.5rem 1rem 0" }}>
        <SecHead
          title="Services"
          sub="Open any service to see details, then pay with a student code — no login required."
          right={<button type="button" onClick={() => go(toolRef)} style={{ fontFamily:MTN, fontWeight:700, fontSize:11, color:AMB2, background:"none", border:"none", cursor:"pointer", textTransform:"uppercase", letterSpacing:".08em" }}>Jump to Tools →</button>}
        />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:15 }}>
          <ShuleKitCard/>
          {SERVICES.map(s => <SvcCard key={s.key} {...s}/>)}
        </div>
      </section>

      {/* Divider */}
      <div style={{ maxWidth:1152, margin:"3rem auto 0", padding:"0 1rem" }}>
        <hr style={{ border:"none", borderTop:"2px dashed #E2E8F0", margin:0 }}/>
      </div>

      {/* Tools */}
      <section ref={toolRef} style={{ maxWidth:1152, margin:"0 auto", padding:"3.5rem 1rem" }}>
        <SecHead
          title="Tools"
          sub="AI and assistants that connect families to Babyeyi where they already spend time."
          right={<button type="button" onClick={() => go(svcRef)} style={{ fontFamily:MTN, fontWeight:700, fontSize:11, color:AMB2, background:"none", border:"none", cursor:"pointer", textTransform:"uppercase", letterSpacing:".08em" }}>← Back to Services</button>}
        />
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:15 }}>
          {TOOLS.map(t => <ToolCard key={t.key} {...t} onClick={t.ai ? () => setAiOpen(true) : undefined}/>)}
        </div>
      </section>

      {/* Tip */}
      <div style={{ maxWidth:1152, margin:"0 auto", padding:"0 1rem 3.5rem" }}>
        <div style={{ borderLeft:`4px solid ${AMB}`, background:"#fff", borderRadius:"0 12px 12px 0", padding:"13px 18px" }}>
          <p style={{ fontFamily:MTN, fontSize:13.5, color:"#475569", margin:0, lineHeight:1.6 }}>
            <strong style={{ color:NAVY }}>Tip:</strong> Most services let you go straight to student code entry and payment — parent login is optional for the full dashboard.
          </p>
        </div>
      </div>

      {aiOpen && <AiModal onClose={() => setAiOpen(false)}/>}
    </div>
  );
}