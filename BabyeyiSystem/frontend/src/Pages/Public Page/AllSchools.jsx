/**
 * AllSchools.jsx — Modern redesign
 * #000435 navy + amber-400 · Tailwind only · Fully responsive
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, GraduationCap, Building2, Award, Wrench,
  ChevronRight, X, SlidersHorizontal, BookOpen, Users,
  Loader2, AlertCircle, ChevronDown, ChevronUp,
  ArrowLeft, Sparkles, LayoutGrid, List, Check, Filter,
} from "lucide-react";

const SERVER = import.meta.env.VITE_API_URL || "http://localhost:5100";
const API = `${SERVER}/api/mini-websites`;

function imgUrl(p) {
  if(!p) return null;
  if(p.startsWith("http")||p.startsWith("blob:")) return p;
  let norm=p.replace(/\\/g,"/");
  const stripped=norm.replace(/^\//,"");
  const idx=stripped.indexOf("uploads/");
  if(idx!==-1) norm="/"+stripped.slice(idx);
  return `${SERVER}${norm.startsWith("/")?norm:"/"+norm}`;
}

const SCHOOL_TYPES = ["Public","Private","Government Aided","Faith Based"];
const EDUCATION_LEVELS = ["Nursery / Pre-Primary","Primary School","Secondary School (O-Level)","Secondary School (A-Level)","TVET"];

function normalizeOwnership(val) {
  const raw=String(val||"").trim(); if(!raw)return "";
  const k=raw.toLowerCase().replace(/[\s-]+/g,"_");
  if(k==="public"||k==="government")return "Public";
  if(k==="private")return "Private";
  if(k==="government_aided"||k==="gov_aided")return "Government Aided";
  if(k==="faith_based"||k==="religious")return "Faith Based";
  return raw.split(/[\s_]+/g).filter(Boolean).map(w=>w.length?(w[0].toUpperCase()+w.slice(1).toLowerCase()):w).join(" ");
}

function normalizeEducationLevels(levels) {
  const arr=Array.isArray(levels)?levels:[]; const out=[];
  for(const v of arr){
    const raw=String(v||"").trim(); if(!raw)continue;
    const k=raw.toLowerCase().replace(/[\s-]+/g,"_");
    if(k==="nursery"||k==="pre_primary"||k==="nursery_pre_primary")out.push("Nursery / Pre-Primary");
    else if(k==="primary"||k==="primary_school")out.push("Primary School");
    else if(k==="o_level"||k==="olevel"||k==="o")out.push("Secondary School (O-Level)");
    else if(k==="a_level"||k==="alevel"||k==="a")out.push("Secondary School (A-Level)");
    else if(k==="tvet")out.push("TVET");
    else if(EDUCATION_LEVELS.includes(raw))out.push(raw);
  }
  return [...new Set(out)];
}

function normalizeComboCode(v) {
  const code=typeof v==="object"?(v.code||v.name||""):v;
  return String(code||"").trim().toUpperCase();
}

const LEVEL_STYLE = {
  "Nursery / Pre-Primary":     { label:"Nursery", bg:"#FEF3C7", text:"#92400E" },
  "Primary School":             { label:"Primary", bg:"#FDE68A", text:"#78350F" },
  "Secondary School (O-Level)": { label:"O-Level", bg:"#FCD34D", text:"#78350F" },
  "Secondary School (A-Level)": { label:"A-Level", bg:"#FBBF24", text:"#000435" },
  "TVET":                       { label:"TVET",    bg:"#000435", text:"#FBBF24" },
};

/* ── Filter section ──────────────────────────────────────────── */
function FilterSection({ title, icon, children, defaultOpen=true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-bold text-[#000435] hover:bg-amber-50/50 transition-colors">
        <span className="flex items-center gap-2">{icon}{title}</span>
        {open?<ChevronUp size={13} className="text-amber-400"/>:<ChevronDown size={13} className="text-slate-300"/>}
      </button>
      {open&&<div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function CheckItem({ label, checked, onChange, count }) {
  return (
    <label onClick={onChange} className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors">
      <div className="w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all border-2" style={{background:checked?"#FBBF24":"white",borderColor:checked?"#FBBF24":"#CBD5E1"}}>
        {checked&&<Check size={9} className="text-[#000435]" strokeWidth={3}/>}
      </div>
      <span className={`text-[13px] flex-1 ${checked?"font-bold text-[#000435]":"font-medium text-slate-500"}`}>{label}</span>
      {count!==undefined&&<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${checked?"bg-amber-100 text-amber-800":"bg-slate-100 text-slate-400"}`}>{count}</span>}
      <input type="checkbox" checked={checked} onChange={()=>{}} className="sr-only"/>
    </label>
  );
}

/* ── School card (grid) ──────────────────────────────────────── */
function SchoolCard({ school, onClick, index }) {
  const logoSrc = imgUrl(school.logoPreview||school.logo_url);
  const coverSrc = imgUrl(school.coverPreview||school.cover_url);
  const levels = school.educationLevels||[];

  return (
    <div onClick={onClick} className="group bg-white rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
      style={{animationDelay:`${(index%12)*40}ms`}}>
      {/* Cover */}
      <div className="relative h-[120px] sm:h-[130px] overflow-hidden shrink-0">
        {coverSrc
          ?<img src={coverSrc} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
          :<div className="w-full h-full bg-[#000435]"/>
        }
        <div className="absolute inset-0 bg-[#000435]/40"/>
        {school.ownership&&(
          <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#000435]/80 text-amber-400 border border-amber-400/30">{school.ownership}</div>
        )}
        <div className="absolute bottom-0 left-4 translate-y-1/2 z-10">
          <div className="w-[48px] h-[48px] rounded-xl shadow-lg overflow-hidden ring-2 ring-white">
            {logoSrc
              ?<img src={logoSrc} alt="logo" className="w-full h-full object-cover"/>
              :<div className="w-full h-full bg-[#000435] flex items-center justify-center font-black text-lg text-amber-400">{(school.name||"S")[0].toUpperCase()}</div>
            }
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pt-8 px-4 pb-4 flex flex-col flex-1">
        <h3 className="font-black text-[14px] xl:text-[15px] text-[#000435] leading-tight mb-1 line-clamp-2 group-hover:text-amber-700 transition-colors">{school.name}</h3>
        <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-3">
          <MapPin size={10} className="text-amber-400 shrink-0"/>
          <span className="truncate">{school.district}{school.province?`, ${school.province}`:""}</span>
        </div>
        {levels.length>0&&(
          <div className="flex flex-wrap gap-1 mb-3">
            {levels.slice(0,3).map(l=>{const s=LEVEL_STYLE[l]||{label:l,bg:"#F1F5F9",text:"#000435"};return <span key={l} className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{background:s.bg,color:s.text}}>{s.label}</span>;})}
            {levels.length>3&&<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">+{levels.length-3}</span>}
          </div>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
          <span className="text-[11px] text-slate-400">{school.category||"School"}</span>
          <div className="flex items-center gap-1 text-[12px] font-bold text-amber-500 group-hover:gap-1.5 transition-all">View <ChevronRight size={12}/></div>
        </div>
      </div>
    </div>
  );
}

/* ── School card (list) ──────────────────────────────────────── */
function ListCard({ school, onClick }) {
  const logoSrc = imgUrl(school.logoPreview||school.logo_url);
  const levels = school.educationLevels||[];
  return (
    <div onClick={onClick} className="group bg-white rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 border-slate-100">
        {logoSrc?<img src={logoSrc} alt="logo" className="w-full h-full object-cover"/>:<div className="w-full h-full bg-[#000435] flex items-center justify-center font-black text-amber-400">{(school.name||"S")[0]}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-[14px] text-[#000435] truncate group-hover:text-amber-700 transition-colors">{school.name}</h3>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
          <span className="flex items-center gap-1"><MapPin size={9} className="text-amber-400"/>{school.district}</span>
          {school.ownership&&<span>{school.ownership}</span>}
        </div>
        {levels.length>0&&<div className="flex flex-wrap gap-1 mt-1.5">{levels.slice(0,4).map(l=>{const s=LEVEL_STYLE[l]||{label:l,bg:"#F1F5F9",text:"#000435"};return <span key={l} className="px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{background:s.bg,color:s.text}}>{s.label}</span>;})}</div>}
      </div>
      <ChevronRight size={15} className="text-slate-200 shrink-0"/>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function AllSchools() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterOpts, setFilterOpts] = useState({ aLevelCombos:[], tvetTrades:[] });

  const [search, setSearch] = useState("");
  const [selTypes, setSelTypes] = useState([]);
  const [selLevels, setSelLevels] = useState([]);
  const [selALevel, setSelALevel] = useState([]);
  const [selTVET, setSelTVET] = useState([]);
  const [selDistrict, setSelDistrict] = useState("");
  const [mobileFilter, setMobileFilter] = useState(false);
  const [view, setView] = useState("list");

  useEffect(()=>{
    fetch(`${API}?status=published&limit=500`).then(r=>r.json()).then(d=>{
      const rows=Array.isArray(d.data)?d.data:[];
      setSchools(rows.filter(s=>s.slug).map(s=>({
        ...s,
        name:s.school_name||s.name||"",
        code:s.school_code||s.code||"",
        ownership:normalizeOwnership(s.ownership_type||s.ownership),
        category:s.school_category||s.category||"",
        district:s.district||"", province:s.province||"",
        logoPreview:s.logoUrl||s.logo_url||null,
        coverPreview:s.coverUrl||s.cover_url||null,
        educationLevels:normalizeEducationLevels(Array.isArray(s.educationLevels)?s.educationLevels:(Array.isArray(s.education_levels)?s.education_levels:[])),
        aLevelCombos:(Array.isArray(s.aLevelCombos)?s.aLevelCombos:(Array.isArray(s.a_level_combinations)?s.a_level_combinations:[])).map(c=>typeof c==="object"?{...c,code:normalizeComboCode(c),full:c.full||c.name||""}:normalizeComboCode(c)).filter(Boolean),
        tvetTrades:Array.isArray(s.tvetTrades)?s.tvetTrades:(Array.isArray(s.tvet_trades)?s.tvet_trades:[]),
      })));
    }).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{
    fetch(`${API}/filter-options`).then(r=>r.json()).then(d=>{if(d.success&&d.data)setFilterOpts(d.data);}).catch(()=>{});
  },[]);

  const derivedFilterOpts = useMemo(()=>{
    const aSet=new Set(); const tSet=new Set();
    schools.forEach(s=>{(s.aLevelCombos||[]).forEach(c=>{const code=normalizeComboCode(c);if(code)aSet.add(code);});(s.tvetTrades||[]).forEach(t=>tSet.add(t));});
    const normalizedFilterCombos=(filterOpts.aLevelCombos||[]).map(c=>({code:normalizeComboCode(c),full:(c&&(c.full||c.name))||""})).filter(c=>c.code);
    return {aLevelCombos:normalizedFilterCombos.length>0?normalizedFilterCombos:[...aSet].map(c=>({code:c,full:c})),tvetTrades:filterOpts.tvetTrades.length>0?filterOpts.tvetTrades:[...tSet]};
  },[schools,filterOpts]);

  const districts = useMemo(()=>[...new Set(schools.map(s=>s.district).filter(Boolean))].sort(),[schools]);
  const activeFilters = selTypes.length+selLevels.length+selALevel.length+selTVET.length+(selDistrict?1:0);

  const filtered = useMemo(()=>{
    let out=schools;
    const q=search.trim().toLowerCase();
    if(q)out=out.filter(s=>(s.name||"").toLowerCase().includes(q)||(s.district||"").toLowerCase().includes(q)||(s.province||"").toLowerCase().includes(q)||(s.category||"").toLowerCase().includes(q));
    if(selDistrict)out=out.filter(s=>s.district===selDistrict);
    if(selTypes.length)out=out.filter(s=>selTypes.includes(s.ownership));
    if(selLevels.length)out=out.filter(s=>selLevels.some(l=>(s.educationLevels||[]).includes(l)));
    if(selALevel.length)out=out.filter(s=>{const codes=(s.aLevelCombos||[]).map(c=>normalizeComboCode(c)).filter(Boolean);return selALevel.some(a=>codes.includes(normalizeComboCode(a)));});
    if(selTVET.length)out=out.filter(s=>selTVET.some(t=>(s.tvetTrades||[]).includes(t)));
    return out;
  },[schools,search,selDistrict,selTypes,selLevels,selALevel,selTVET]);

  const toggle=(arr,setArr,val)=>setArr(prev=>prev.includes(val)?prev.filter(x=>x!==val):[...prev,val]);
  const clearAll=()=>{setSearch("");setSelTypes([]);setSelLevels([]);setSelALevel([]);setSelTVET([]);setSelDistrict("");};

  const activeChips=[
    ...selTypes.map(v=>({label:v,clear:()=>toggle(selTypes,setSelTypes,v)})),
    ...selLevels.map(v=>({label:LEVEL_STYLE[v]?.label||v,clear:()=>toggle(selLevels,setSelLevels,v)})),
    ...selALevel.map(v=>({label:v,clear:()=>toggle(selALevel,setSelALevel,v)})),
    ...selTVET.map(v=>({label:v,clear:()=>toggle(selTVET,setSelTVET,v)})),
    ...(selDistrict?[{label:selDistrict,clear:()=>setSelDistrict("")}]:[]),
  ];

  const SidebarContent = () => (
    <div>
      <FilterSection title="District" icon={<MapPin size={13} className="text-amber-400"/>}>
        <div className="relative">
          <select value={selDistrict} onChange={e=>setSelDistrict(e.target.value)} className="w-full px-3 py-2.5 text-[13px] rounded-xl border-2 border-slate-200 appearance-none focus:outline-none focus:border-amber-400 bg-white font-semibold text-[#000435]">
            <option value="">All Districts</option>
            {districts.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-amber-400"/>
        </div>
      </FilterSection>
      <FilterSection title="School Type" icon={<Building2 size={13} className="text-amber-400"/>}>
        {SCHOOL_TYPES.map(t=><CheckItem key={t} label={t} checked={selTypes.includes(t)} onChange={()=>toggle(selTypes,setSelTypes,t)} count={schools.filter(s=>s.ownership===t).length}/>)}
      </FilterSection>
      <FilterSection title="Education Level" icon={<GraduationCap size={13} className="text-amber-400"/>}>
        {EDUCATION_LEVELS.map(l=><CheckItem key={l} label={LEVEL_STYLE[l]?.label||l} checked={selLevels.includes(l)} onChange={()=>toggle(selLevels,setSelLevels,l)} count={schools.filter(s=>(s.educationLevels||[]).includes(l)).length}/>)}
      </FilterSection>
      <FilterSection title="A-Level Combinations" icon={<Award size={13} className="text-amber-400"/>} defaultOpen={derivedFilterOpts.aLevelCombos.length>0}>
        {derivedFilterOpts.aLevelCombos.length===0
          ?<p className="text-[12px] text-slate-400 px-2 py-2">No combinations yet</p>
          :<div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {derivedFilterOpts.aLevelCombos.map(c=>{const code=normalizeComboCode(c);return <CheckItem key={code} label={<span><span className="font-black text-amber-700">{code}</span>{c.full?<span className="text-slate-400 text-[10px]"> — {c.full}</span>:null}</span>} checked={selALevel.includes(code)} onChange={()=>toggle(selALevel,setSelALevel,code)} count={schools.filter(s=>(s.aLevelCombos||[]).some(x=>normalizeComboCode(x)===code)).length}/>;})}
          </div>
        }
      </FilterSection>
      <FilterSection title="TVET Trades" icon={<Wrench size={13} className="text-amber-400"/>} defaultOpen={derivedFilterOpts.tvetTrades.length>0}>
        {derivedFilterOpts.tvetTrades.length===0
          ?<p className="text-[12px] text-slate-400 px-2 py-2">No trades yet</p>
          :<div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {derivedFilterOpts.tvetTrades.map(t=><CheckItem key={t} label={t} checked={selTVET.includes(t)} onChange={()=>toggle(selTVET,setSelTVET,t)} count={schools.filter(s=>(s.tvetTrades||[]).includes(t)).length}/>)}
          </div>
        }
      </FilterSection>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#000435] border-b-[3px] border-amber-400 h-14 sm:h-16">
        <div className="h-full px-4 sm:px-6 xl:px-10 flex items-center gap-3">
          <button onClick={()=>navigate("/")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/8 border border-white/12 text-white/70 font-semibold text-[13px] hover:bg-white/14 transition-all shrink-0">
            <ArrowLeft size={15}/><span className="hidden sm:inline">Back</span>
          </button>
          {/* <div className="hidden sm:flex items-center gap-2 shrink-0 pr-3 border-r border-white/10">
            <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center"><GraduationCap size={14} className="text-[#000435]"/></div>
          </div> */}

          {/* Search */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400/60"/>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search schools, districts…"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl text-[13px] sm:text-[14px] bg-white/6 border border-amber-400/18 text-white placeholder:text-white/35 focus:outline-none focus:border-amber-400/50 focus:bg-white/10 transition-all"/>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"><X size={13}/></button>}
          </div>

          {/* Mobile filter btn */}
          <button onClick={()=>setMobileFilter(true)}
            className={`lg:hidden relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[12px] font-black transition-all border shrink-0 ${activeFilters>0?"bg-amber-400 text-[#000435] border-amber-400":"bg-white/8 text-white/70 border-amber-400/20"}`}>
            <SlidersHorizontal size={14}/>
            <span className="hidden xs:inline">Filters</span>
            {activeFilters>0&&<span className="w-5 h-5 rounded-full bg-[#000435] text-amber-400 text-[10px] font-black flex items-center justify-center">{activeFilters}</span>}
          </button>

          {/* View toggle */}
          <div className="hidden sm:flex items-center p-0.5 rounded-xl bg-white/6 border border-amber-400/15 shrink-0">
            <button onClick={()=>setView("grid")} className="p-1.5 rounded-lg transition-all" style={{background:view==="grid"?"#FBBF24":"transparent",color:view==="grid"?"#000435":"rgba(255,255,255,0.4)"}}>
              <LayoutGrid size={13}/>
            </button>
            <button onClick={()=>setView("list")} className="p-1.5 rounded-lg transition-all" style={{background:view==="list"?"#FBBF24":"transparent",color:view==="list"?"#000435":"rgba(255,255,255,0.4)"}}>
              <List size={13}/>
            </button>
          </div>
        </div>
      </header>

      {/* Page hero strip */}
      <div className="bg-[#000435] py-6 sm:py-8 border-b border-amber-400/15">
        <div className="px-4 sm:px-6 xl:px-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black text-white tracking-tight">
              Explore <span className="text-amber-400">Schools</span>
            </h1>
            <p className="mt-1 text-[13px] text-white/45">{loading?"Loading…":<>{filtered.length} of {schools.length} schools across Rwanda</>}</p>
          </div>
          {activeFilters>0&&(
            <button onClick={clearAll} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold text-amber-400 border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 transition-all">
              <X size={12}/> Clear {activeFilters} filter{activeFilters>1?"s":""}
            </button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeChips.length>0&&(
        <div className="bg-[#000435] border-b border-white/8 overflow-x-auto">
          <div className="px-4 sm:px-6 xl:px-10 py-2 flex items-center gap-2 flex-nowrap">
            {activeChips.map((chip,i)=>(
              <button key={i} onClick={chip.clear} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black bg-amber-400 text-[#000435] shrink-0 hover:bg-amber-300 transition-all">
                {chip.label} <X size={10}/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main body */}
      <div className="px-4 sm:px-6 xl:px-10 py-6 xl:py-8 flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm sticky overflow-y-auto" style={{top:activeChips.length>0?116:80,maxHeight:"calc(100vh-100px)"}}>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center"><SlidersHorizontal size={13} className="text-[#000435]"/></div>
                <span className="font-black text-[#000435] text-[13px]">Filters</span>
                {activeFilters>0&&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-[#000435]">{activeFilters}</span>}
              </div>
              {activeFilters>0&&<button onClick={clearAll} className="text-[12px] font-bold text-amber-600 hover:text-amber-700">Clear all</button>}
            </div>
            <SidebarContent/>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {loading&&(
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div className="w-14 h-14 rounded-2xl border-2 border-amber-400/30 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-amber-500"/></div>
              <p className="font-semibold text-slate-400">Loading schools…</p>
            </div>
          )}
          {!loading&&error&&(
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <AlertCircle size={36} className="text-red-400"/>
              <p className="font-black text-[#000435] text-lg">Failed to load schools</p>
              <p className="text-[13px] text-slate-400">{error}</p>
            </div>
          )}
          {!loading&&!error&&filtered.length===0&&(
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-300 flex items-center justify-center text-3xl">🏫</div>
              <p className="font-black text-[#000435] text-lg">No schools match your filters</p>
              <p className="text-[13px] text-slate-400 max-w-xs">Try removing some filters or changing your search</p>
              <button onClick={clearAll} className="px-6 py-3 rounded-xl font-bold text-[13px] bg-amber-400 text-[#000435] hover:bg-amber-300 transition-all">Clear all filters</button>
            </div>
          )}
          {!loading&&!error&&filtered.length>0&&(
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-bold text-slate-400">{filtered.length} result{filtered.length!==1?"s":""}{search&&<span className="text-amber-500"> for "{search}"</span>}</p>
                <div className="flex sm:hidden items-center p-0.5 rounded-lg bg-white border border-slate-200">
                  <button onClick={()=>setView("grid")} className="p-1.5 rounded-md transition-all" style={{background:view==="grid"?"#000435":"transparent",color:view==="grid"?"#FBBF24":"#94A3B8"}}><LayoutGrid size={13}/></button>
                  <button onClick={()=>setView("list")} className="p-1.5 rounded-md transition-all" style={{background:view==="list"?"#000435":"transparent",color:view==="list"?"#FBBF24":"#94A3B8"}}><List size={13}/></button>
                </div>
              </div>
              {view==="list"
                ?<div className="space-y-2.5">{filtered.map(s=><ListCard key={s.id} school={s} onClick={()=>navigate(`/school/${s.slug}`)}/>)}</div>
                :<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">{filtered.map((s,i)=><SchoolCard key={s.id} school={s} index={i} onClick={()=>navigate(`/school/${s.slug}`)}/>)}</div>
              }
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFilter&&(
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setMobileFilter(false)}/>
          <div className="relative w-80 max-w-[88vw] bg-white h-full overflow-y-auto shadow-2xl flex flex-col" style={{animation:"slideInLeft .22s cubic-bezier(.22,1,.36,1)"}}>
            <style>{`@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
            <div className="px-5 py-4 flex items-center justify-between shrink-0 bg-[#000435] border-b-[3px] border-amber-400">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center"><SlidersHorizontal size={13} className="text-[#000435]"/></div>
                <span className="font-black text-white text-[13px]">Filters</span>
                {activeFilters>0&&<span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-[#000435]">{activeFilters}</span>}
              </div>
              <button onClick={()=>setMobileFilter(false)} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <X size={14} className="text-white/70"/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto"><SidebarContent/></div>
            <div className="p-4 flex gap-3 shrink-0 border-t border-slate-100">
              <button onClick={clearAll} className="flex-1 py-3 rounded-xl font-bold text-[13px] border-2 border-slate-200 text-slate-600 hover:border-slate-300">Clear all</button>
              <button onClick={()=>setMobileFilter(false)} className="flex-1 py-3 rounded-xl font-black text-[13px] bg-amber-400 text-[#000435] hover:bg-amber-300 transition-all">Show {filtered.length} results</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}