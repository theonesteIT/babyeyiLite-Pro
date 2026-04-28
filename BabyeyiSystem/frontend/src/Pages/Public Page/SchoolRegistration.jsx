/**
 * SchoolRegistration.jsx — Modern redesign
 * #000435 navy + amber-400 · Tailwind only · Fully responsive
 */

import React, { useState, useRef, useEffect } from "react";
import { useNavigate,Link } from "react-router-dom";
import axios from "axios";
import {
  School, MapPin, Phone, Shield, Upload, Check, ChevronRight, ChevronLeft, AlertCircle,
  CheckCircle, Loader2, X, ArrowLeft, GraduationCap, Lock, User, Mail, Globe, Camera,
} from "lucide-react";
import { getDistrictCode } from "../../utils/rwandaDistrictCodes";
import { PROVINCES } from "../../data/rwandaSchoolProvinces";


const API_PUBLIC = `${import.meta.env.VITE_API_URL || "http://localhost:5100"}/api/public/schools`;
const axCfg = { withCredentials: false };
const POST_SUBMIT_REDIRECT_SEC = 20;
const A_LEVEL_PRESETS = ["PCM","PCB","MCB","MPC","MPG","LFK","HEG","MCE","MEG","PEG"];

/** Must match backend `VALID_CATEGORIES` in publicSchoolRegistration.js */
const SCHOOL_CATEGORY_OPTIONS = [
  { value: "Day", label: "Day" },
  { value: "Boarding", label: "Boarding" },
  { value: "Day & Boarding", label: "Mixed (Day & Boarding)" },
];
const OWNERSHIP_OPTIONS = [
  { value: "Government", label: "Government (Public)" },
  { value: "Private", label: "Private" },
  { value: "Government-Aided", label: "Government-Aided" },
];
const EDUCATION_LEVEL_OPTIONS = [
  { value: "nursery", label: "Nursery" },
  { value: "primary", label: "Primary" },
  { value: "o_level", label: "O-Level" },
  { value: "a_level", label: "A-Level" },
  { value: "tvet", label: "TVET" },
];

/* ── Shared atoms ─────────────────────────────────────────────── */
function FieldWrap({ label, error, hint, required, optional, children }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#000435]/50">
          {label}{required&&<span className="text-red-500 ml-0.5">*</span>}
          {optional&&<span className="ml-1.5 normal-case font-medium text-[#000435]/35 text-[10px]">(optional)</span>}
        </label>
      )}
      {children}
      {hint&&!error&&<p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {error&&<p className="mt-1 text-[11px] text-red-500 flex items-center gap-1"><AlertCircle size={10}/>{error}</p>}
    </div>
  );
}

const inputBase = "w-full rounded-xl border-2 border-slate-200 bg-white px-3.5 py-3 text-[14px] font-semibold text-[#000435] placeholder:text-slate-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all min-h-[48px]";

function FInput({ error, className="", ...props }) {
  return <input {...props} className={`${inputBase} ${error?"border-red-300 bg-red-50":""} ${className}`}/>;
}

function FSelect({ error, disabled, children, className="", ...props }) {
  return (
    <div className="relative">
      <select {...props} disabled={disabled} className={`${inputBase} pr-9 appearance-none cursor-pointer ${disabled?"opacity-40 cursor-not-allowed":""} ${error?"border-red-300 bg-red-50":""} ${className}`}>
        {children}
      </select>
      <ChevronRight size={12} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-amber-400 pointer-events-none"/>
    </div>
  );
}

function FileUpload({ label, accept, preview, onFileSelect, error, required, optional, hint, icon }) {
  const ref = useRef();
  return (
    <FieldWrap label={label} error={error} hint={hint} required={required} optional={optional}>
      <div onClick={()=>ref.current?.click()}
        className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${error?"border-red-300 bg-red-50":preview?"border-amber-400 bg-amber-50":"border-slate-200 bg-slate-50 hover:border-amber-400 hover:bg-amber-50"}`}>
        {preview?(
          <div className="flex items-center justify-center gap-3">
            <img src={preview} alt="" className="w-12 h-12 object-contain rounded-lg border border-slate-200"/>
            <div className="text-left"><p className="text-[13px] font-bold text-[#000435]">Uploaded ✓</p><p className="text-[11px] text-slate-400">Click to change</p></div>
          </div>
        ):(
          <>
            <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-2">{icon||<Upload size={16} className="text-amber-500"/>}</div>
            <p className="text-[13px] font-semibold text-slate-600">Click to upload</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{accept?.replace(/,/g,", ")}</p>
          </>
        )}
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={e=>onFileSelect(e.target.files[0])}/>
      </div>
    </FieldWrap>
  );
}

const STEPS = [
  { label:"Location",  short:"Loc",  Icon:MapPin,  desc:"Where is your school?" },
  { label:"School",    short:"Sch",  Icon:School,  desc:"Enter your school details" },
  { label:"Contact",   short:"Con",  Icon:Phone,   desc:"How to reach you" },
  { label:"Leadership",short:"Lead", Icon:User,    desc:"Head teacher details" },
  { label:"Access",    short:"Acc",  Icon:Lock,    desc:"Manager email & password" },
];

export default function SchoolRegistration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [postSubmitRedirect, setPostSubmitRedirect] = useState(null);

  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [sector, setSector] = useState("");
  const [cell, setCell] = useState("");
  const [village, setVillage] = useState("");

  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [postalAddr, setPostalAddr] = useState("");
  const [website, setWebsite] = useState("");

  const [headTeacher, setHeadTeacher] = useState("");
  const [headPhone, setHeadPhone] = useState("");
  const [headEmail, setHeadEmail] = useState("");
  const [deputyTeacher, setDeputyTeacher] = useState("");
  const [signatureFile, setSignatureFile] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState("");
  const [stampFile, setStampFile] = useState(null);
  const [stampPreview, setStampPreview] = useState("");

  const [managerEmail, setManagerEmail] = useState("");

  const [schoolCategory, setSchoolCategory] = useState("");
  const [ownershipType, setOwnershipType] = useState("");
  const [educationLevels, setEducationLevels] = useState(["primary"]);
  const [aLevelComboPick, setALevelComboPick] = useState([]);
  const [customCombo, setCustomCombo] = useState("");
  const [tvetTradePick, setTvetTradePick] = useState([]);
  const [customTVETTrade, setCustomTVETTrade] = useState("");

  const provinceData = PROVINCES[province] || {};
  const districtData = provinceData.districts?.[district] || {};
  const sectorList = districtData.sectors || [];
  const districtCodeDisplay = district ? getDistrictCode(district) : null;

  const showToast = (msg, type="info") => { setToast({msg,type}); setTimeout(()=>setToast(null),4500); };

  useEffect(() => {
    setSchoolName(""); setSchoolCode("");
    setSchoolCategory("");
    setOwnershipType("");
    setEducationLevels(["primary"]);
    setALevelComboPick([]); setCustomCombo(""); setTvetTradePick([]); setCustomTVETTrade("");
    setLogoFile(null); setLogoPreview("");
  }, [province, district, sector]);

  useEffect(() => {
    if(!postSubmitRedirect) return;
    if(postSubmitRedirect.secondsLeft<=0){navigate("/login");return;}
    const id=setTimeout(()=>setPostSubmitRedirect(prev=>prev?{...prev,secondsLeft:prev.secondsLeft-1}:null),1000);
    return()=>clearTimeout(id);
  },[postSubmitRedirect,navigate]);

  const toggleALevelCombo = (c) => { const u=String(c).trim().toUpperCase(); if(!u)return; setALevelComboPick(prev=>prev.includes(u)?prev.filter(x=>x!==u):[...prev,u]); };
  const addCustomALevelCombo = () => { const u=customCombo.trim().toUpperCase(); if(!u)return; setALevelComboPick(prev=>prev.includes(u)?prev:[...prev,u]); setCustomCombo(""); };
  const addCustomTVETTrade = () => { const t=customTVETTrade.trim(); if(!t)return; setTvetTradePick(prev=>prev.includes(t)?prev:[...prev,t]); setCustomTVETTrade(""); };
  const removeTVETTrade = (t) => setTvetTradePick(prev=>prev.filter(x=>x!==t));
  const toggleEducationLevel = (level) => {
    setEducationLevels((prev) =>
      prev.includes(level) ? prev.filter((x) => x !== level) : [...prev, level]
    );
  };

  const handleFileSelect = (file,setFile,setPreview) => {
    if(!file)return; setFile(file);
    const r=new FileReader(); r.onload=e=>setPreview(e.target.result); r.readAsDataURL(file);
  };

  const validateStep = () => {
    const e={};
    if(step===0){if(!province)e.province="Required";if(!district)e.district="Required";if(!sector)e.sector="Required";}
    if(step===1){
      if(!schoolName.trim())e.schoolName="Enter your school name.";
      if(!schoolCategory)e.schoolCategory="Choose day, boarding, or mixed.";
      if(!ownershipType)e.ownershipType="Choose school category.";
      if(!educationLevels.length)e.educationLevels="Select at least one education level.";
    }
    if(step===2){if(!phone.trim())e.phone="Required";if(!email.trim())e.email="Required";else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))e.email="Invalid email";}
    if(step===3){if(!headTeacher.trim())e.headTeacher="Required";if(!headPhone.trim())e.headPhone="Required";if(!signatureFile)e.signature="Required";if(!stampFile)e.stamp="Required";}
    if(step===4){if(!managerEmail.trim())e.managerEmail="Required";else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail.trim()))e.managerEmail="Invalid email";}
    setErrors(e); return !Object.keys(e).length;
  };

  const next = () => { if(validateStep()) setStep(s=>s+1); };
  const prev = () => setStep(s=>s-1);

  const handleSubmit = async () => {
    if(!validateStep()) return;
    setLoading(true);
    try {
      const fd=new FormData();
      fd.append("schoolName",schoolName.trim()); fd.append("schoolCode","AUTO");
      fd.append("province",province); fd.append("district",district); fd.append("sector",sector);
      fd.append("cell",cell||sector); fd.append("village",village||sector);
      fd.append("fullAddress",`${sector}, ${district}, ${province}`);
      if(logoFile)fd.append("logo",logoFile);
      fd.append("phone",phone.trim()); fd.append("email",email.trim());
      if(postalAddr.trim())fd.append("postal",postalAddr.trim());
      if(website.trim())fd.append("website",website.trim());
      fd.append("headName",headTeacher.trim()); fd.append("headPhone",headPhone.trim());
      if(headEmail.trim())fd.append("headEmail",headEmail.trim());
      if(deputyTeacher.trim())fd.append("deputyName",deputyTeacher.trim());
      fd.append("headSignature",signatureFile); fd.append("stamp",stampFile);
      fd.append("managerEmail",managerEmail.trim());
      fd.append("category",schoolCategory.trim());
      fd.append("ownership",ownershipType);
      fd.append("levels",JSON.stringify(educationLevels));
      if(educationLevels.includes("a_level")){
        fd.append("aLevelCombinations",JSON.stringify(Array.isArray(aLevelComboPick)?aLevelComboPick:[]));
      }
      if(educationLevels.includes("tvet")){
        fd.append("tvetTrades",JSON.stringify(Array.isArray(tvetTradePick)?tvetTradePick:[]));
      }
      const res=await axios.post(`${API_PUBLIC}/register`,fd,axCfg);
      if(res.data.success){
        const pw=res.data?.data?.manager_password; const em=managerEmail.trim();
        setPostSubmitRedirect({message:pw?`Registration submitted. Your password: ${pw}. Sent to ${em}. After Super Admin approval, sign in at the login page.`:`Registration submitted. Check ${em} for your login password after approval.`,secondsLeft:POST_SUBMIT_REDIRECT_SEC});
      }else throw new Error(res.data.message||"Registration failed");
    }catch(err){showToast(err.response?.data?.message||err.message||"Something went wrong","error");}
    finally{setLoading(false);}
  };

  const stepData = STEPS[step];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[#000435] border-b-[3px] border-amber-400 h-14 sm:h-16 flex items-center px-4 sm:px-6">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <button onClick={()=>navigate(-1)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/8 border border-white/12 text-white/70 font-semibold text-[13px] hover:bg-white/12 transition-all">
            <ArrowLeft size={15}/><span className="hidden sm:inline">Back</span>
          </button>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center"><GraduationCap size={16} className="text-[#000435]"/></div>
            <span className="font-black text-[16px] text-white hidden sm:block">baby<span className="text-amber-400">eyi</span></span>
          </Link>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 hidden sm:block">Step {step+1} / {STEPS.length}</span>
            <div className="w-20 sm:w-28 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-500" style={{width:`${((step+1)/STEPS.length)*100}%`}}/>
            </div>
            <span className="text-[10px] font-bold text-amber-400 sm:hidden">{step+1}/{STEPS.length}</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-24">
        {/* Step indicator */}
        <div className="relative flex items-start justify-between mb-8">
          <div className="absolute top-4 left-[9%] right-[9%] h-0.5 bg-slate-200 z-0"/>
          <div className="absolute top-4 left-[9%] h-0.5 bg-amber-400 z-[1] transition-all duration-500" style={{width:`${(step/(STEPS.length-1))*82}%`}}/>
          {STEPS.map((s,i)=>{
            const done=i<step; const active=i===step;
            return (
              <div key={i} className="relative z-[2] flex flex-col items-center gap-1 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${done?"bg-amber-400 border-amber-400":active?"bg-[#000435] border-amber-400":"bg-white border-slate-200"}`}
                  style={active?{boxShadow:"0 0 0 4px rgba(251,191,36,0.2)"}:{}}>
                  {done?<Check size={13} className="text-[#000435]" strokeWidth={2.5}/>:<s.Icon size={12} className={active?"text-amber-400":"text-slate-300"}/>}
                </div>
                <span className={`text-center text-[9px] sm:text-[10px] font-black uppercase tracking-[0.06em] ${active?"text-[#000435]":done?"text-amber-600":"text-slate-300"}`}>
                  <span className="sm:hidden">{s.short}</span>
                  <span className="hidden sm:inline">{s.label}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Step header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-[#000435] border-2 border-amber-400 flex items-center justify-center shrink-0">
            <stepData.Icon size={20} className="text-amber-400"/>
          </div>
          <div>
            <h2 className="font-black text-[#000435] tracking-tight" style={{fontSize:"clamp(1.2rem,3vw,1.65rem)"}}>
              {step===0&&<>School <span className="text-amber-500">Location</span></>}
              {step===1&&<>School <span className="text-amber-500">Details</span></>}
              {step===2&&<>Contact <span className="text-amber-500">Information</span></>}
              {step===3&&<>School <span className="text-amber-500">Leadership</span></>}
              {step===4&&<>System <span className="text-amber-500">Access</span></>}
            </h2>
            <p className="text-[13px] text-slate-400">{stepData.desc}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-7 shadow-sm space-y-5">

          {/* STEP 0: Location */}
          {step===0&&<>
            <FieldWrap label="Province" required error={errors.province}>
              <FSelect value={province} error={errors.province} onChange={e=>{setProvince(e.target.value);setDistrict("");setSector("");setErrors(v=>({...v,province:null}));}}>
                <option value="">Select Province…</option>
                {Object.keys(PROVINCES).map(p=><option key={p}>{p}</option>)}
              </FSelect>
            </FieldWrap>
            <FieldWrap label="District" required error={errors.district}>
              <FSelect value={district} disabled={!province} error={errors.district} onChange={e=>{setDistrict(e.target.value);setSector("");setErrors(v=>({...v,district:null}));}}>
                <option value="">Select District…</option>
                {Object.keys(provinceData.districts||{}).map(d=><option key={d}>{d}</option>)}
              </FSelect>
            </FieldWrap>
            {district&&districtCodeDisplay&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5"><p className="text-[12px] font-bold text-amber-800">District code: <span className="font-mono">{districtCodeDisplay}</span></p></div>}
            <FieldWrap label="Sector" required error={errors.sector}>
              <FSelect value={sector} disabled={!district} error={errors.sector} onChange={e=>{setSector(e.target.value);setErrors(v=>({...v,sector:null}));}}>
                <option value="">Select Sector…</option>
                {sectorList.map(s=><option key={s}>{s}</option>)}
              </FSelect>
            </FieldWrap>
            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Cell" optional><FInput value={cell} disabled={!sector} onChange={e=>setCell(e.target.value)} placeholder="Cell" className={!sector?"opacity-40":""}/></FieldWrap>
              <FieldWrap label="Village" optional><FInput value={village} disabled={!sector} onChange={e=>setVillage(e.target.value)} placeholder="Village" className={!sector?"opacity-40":""}/></FieldWrap>
            </div>
            {province&&district&&sector&&(
              <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <MapPin size={14} className="text-amber-500 shrink-0"/><span className="text-[13px] font-semibold text-[#000435] truncate">{sector}, {district}, {province}</span>
              </div>
            )}
          </>}

          {/* STEP 1: Select School */}
          {step===1&&<>
            {!province||!district||!sector?(
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">Complete Step 1 location first.</div>
            ):(<>
              <FieldWrap label="School Name" required error={errors.schoolName}>
                <div className="relative">
                  <School size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500"/>
                  <FInput value={schoolName} onChange={e=>{setSchoolName(e.target.value);setErrors(v=>({...v,schoolName:null}));}} placeholder="Type your school name…" className="pl-10" error={errors.schoolName}/>
                </div>
              </FieldWrap>
              <FieldWrap label="School category" required error={errors.ownershipType} hint="Government (Public), Private, or Government-Aided.">
                <FSelect value={ownershipType} error={!!errors.ownershipType} onChange={e=>{setOwnershipType(e.target.value);setErrors(v=>({...v,ownershipType:null}));}}>
                  <option value="">Select category…</option>
                  {OWNERSHIP_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </FSelect>
              </FieldWrap>
              <FieldWrap label="School program type" required error={errors.schoolCategory} hint="Day school, boarding, or mixed.">
                <FSelect value={schoolCategory} error={!!errors.schoolCategory} onChange={e=>{setSchoolCategory(e.target.value);setErrors(v=>({...v,schoolCategory:null}));}}>
                  <option value="">Select program type…</option>
                  {SCHOOL_CATEGORY_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </FSelect>
              </FieldWrap>
              <FieldWrap label="Education Levels" required error={errors.educationLevels}>
                <div className={`rounded-xl border-2 p-3 flex flex-wrap gap-2 ${errors.educationLevels?"border-red-300 bg-red-50":"border-slate-200 bg-slate-50"}`}>
                  {EDUCATION_LEVEL_OPTIONS.map((lvl)=>(
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={()=>{toggleEducationLevel(lvl.value);setErrors(v=>({...v,educationLevels:null}));}}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-black border-2 transition-all ${educationLevels.includes(lvl.value)?"bg-[#000435] text-amber-400 border-[#000435]":"bg-white border-slate-200 text-slate-600 hover:border-amber-300"}`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </FieldWrap>
              <FileUpload label="School Logo" optional accept="image/png,image/jpeg,image/webp" preview={logoPreview}
                onFileSelect={f=>{handleFileSelect(f,setLogoFile,setLogoPreview);setErrors(v=>({...v,logo:null}));}}
                hint="Optional. PNG or JPG. Used on your school profile after approval."
                icon={<School size={14} className="text-amber-500"/>}/>
              {educationLevels.includes("a_level")&&(
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#000435]/60">A-Level Combinations</p>
                  <div className="flex flex-wrap gap-1.5">
                    {A_LEVEL_PRESETS.map(c=>(
                      <button key={c} type="button" onClick={()=>toggleALevelCombo(c)} className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-black border-2 transition-all ${aLevelComboPick.includes(c)?"bg-[#000435] text-amber-400 border-[#000435]":"bg-white border-slate-200 text-slate-600 hover:border-amber-300"}`}>{c}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <FInput value={customCombo} onChange={e=>setCustomCombo(e.target.value.toUpperCase())} placeholder="Other combo" className="text-xs font-mono py-2"/>
                    <button type="button" onClick={addCustomALevelCombo} className="px-3 py-2 rounded-xl bg-amber-400 text-[#000435] text-[12px] font-black shrink-0 hover:bg-amber-300 transition-all">Add</button>
                  </div>
                </div>
              )}
              {educationLevels.includes("tvet")&&(
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.1em] text-[#000435]/60">TVET Trades</p>
                  <div className="flex gap-2">
                    <FInput value={customTVETTrade} onChange={e=>setCustomTVETTrade(e.target.value)} placeholder="Enter TVET trade" className="py-2"/>
                    <button type="button" onClick={addCustomTVETTrade} className="px-3 py-2 rounded-xl bg-amber-400 text-[#000435] text-[12px] font-black shrink-0 hover:bg-amber-300 transition-all">Add</button>
                  </div>
                  {tvetTradePick.length>0&&(
                    <div className="flex flex-wrap gap-1.5">
                      {tvetTradePick.map(t=><button key={t} type="button" onClick={()=>removeTVETTrade(t)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#000435] text-amber-400 hover:opacity-80 transition-all">{t} ×</button>)}
                    </div>
                  )}
                </div>
              )}
            </>)}
          </>}

          {/* STEP 2: Contact */}
          {step===2&&<>
            <FieldWrap label="Phone Number" required error={errors.phone}>
              <div className="relative"><Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500"/>
                <FInput value={phone} onChange={e=>{setPhone(e.target.value);setErrors(v=>({...v,phone:null}));}} placeholder="+250 788 000 000" className="pl-10" error={errors.phone}/></div>
            </FieldWrap>
            <FieldWrap label="School Email" required error={errors.email}>
              <div className="relative"><Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500"/>
                <FInput type="email" value={email} onChange={e=>{setEmail(e.target.value);setErrors(v=>({...v,email:null}));}} placeholder="school@example.rw" className="pl-10" error={errors.email}/></div>
            </FieldWrap>
            <FieldWrap label="Postal Address" optional hint="P.O. Box or postal address">
              <FInput value={postalAddr} onChange={e=>setPostalAddr(e.target.value)} placeholder="e.g. P.O. Box 1234, Kigali"/>
            </FieldWrap>
            <FieldWrap label="Website" optional hint="Include https://">
              <div className="relative"><Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500"/>
                <FInput type="url" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://school.rw" className="pl-10"/></div>
            </FieldWrap>
          </>}

          {/* STEP 3: Leadership */}
          {step===3&&<>
            <FieldWrap label="Head Teacher Full Name" required error={errors.headTeacher}>
              <div className="relative"><User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500"/>
                <FInput value={headTeacher} onChange={e=>{setHeadTeacher(e.target.value);setErrors(v=>({...v,headTeacher:null}));}} placeholder="e.g. Jean-Pierre Habimana" className="pl-10" error={errors.headTeacher}/></div>
            </FieldWrap>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldWrap label="Head Teacher Phone" required error={errors.headPhone}>
                <FInput value={headPhone} onChange={e=>{setHeadPhone(e.target.value);setErrors(v=>({...v,headPhone:null}));}} placeholder="+250 788 000 000" error={errors.headPhone}/>
              </FieldWrap>
              <FieldWrap label="Head Teacher Email" optional>
                <FInput type="email" value={headEmail} onChange={e=>setHeadEmail(e.target.value)} placeholder="head@school.rw"/>
              </FieldWrap>
            </div>
            <FieldWrap label="Deputy Head Teacher" optional>
              <FInput value={deputyTeacher} onChange={e=>setDeputyTeacher(e.target.value)} placeholder="e.g. Marie Uwimana"/>
            </FieldWrap>
            <div className="grid sm:grid-cols-2 gap-4">
              <FileUpload label="Head Teacher Signature" required error={errors.signature} accept="image/png,image/jpeg,image/webp" preview={signaturePreview}
                onFileSelect={f=>{handleFileSelect(f,setSignatureFile,setSignaturePreview);setErrors(v=>({...v,signature:null}));}}
                hint="Sign on paper, photograph clearly, then upload PNG/JPG."
                icon={<Camera size={14} className="text-amber-500"/>}/>
              <FileUpload label="School Stamp / Seal" required error={errors.stamp} accept="image/png,image/jpeg,image/webp" preview={stampPreview}
                onFileSelect={f=>{handleFileSelect(f,setStampFile,setStampPreview);setErrors(v=>({...v,stamp:null}));}}
                hint="Stamp a blank sheet, photograph clearly, and upload."
                icon={<Upload size={14} className="text-amber-500"/>}/>
            </div>
          </>}

          {/* STEP 4: Access */}
          {step===4&&<>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <Shield size={16} className="text-amber-600 shrink-0 mt-0.5"/>
              <div className="text-[13px] text-slate-700 space-y-2 leading-relaxed">
                <p>Your school stays <strong className="text-amber-700">pending</strong> until a Super Admin activates it.</p>
                <p>Enter the school manager's email carefully. The system creates a <strong>short password automatically</strong> and sends it to that email address.</p>
                <p className="text-[11px] text-slate-400">School code: <span className="font-mono font-black text-[#000435]">{schoolCode.trim()||"—"}</span></p>
              </div>
            </div>
            <FieldWrap label="School Manager Email" required error={errors.managerEmail} hint="Must be correct — we send the login password to this inbox.">
              <div className="relative"><Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500"/>
                <FInput type="email" value={managerEmail} onChange={e=>{setManagerEmail(e.target.value);setErrors(v=>({...v,managerEmail:null}));}} placeholder="manager@school.rw" className="pl-10" error={errors.managerEmail}/></div>
            </FieldWrap>
          </>}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-100">
            <button onClick={step===0?()=>navigate(-1):prev}
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border-2 border-slate-200 text-[13px] font-bold text-slate-600 hover:border-slate-300 transition-all min-h-[48px]">
              <ChevronLeft size={15}/>{step===0?"Cancel":"Back"}
            </button>
            {step<STEPS.length-1?(
              <button onClick={next}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-[#000435] text-amber-400 text-[13px] font-black hover:bg-[#000c6b] transition-all min-h-[48px]">
                Continue <ChevronRight size={15}/>
              </button>
            ):(
              <button onClick={handleSubmit} disabled={loading}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-amber-400 text-[#000435] text-[13px] font-black hover:bg-amber-300 transition-all min-h-[48px] disabled:opacity-60">
                {loading?<><Loader2 size={14} className="animate-spin"/>Submitting…</>:<><CheckCircle size={14}/>Submit Registration</>}
              </button>
            )}
          </div>
        </div>

        {/* Step dots (mobile) */}
        <div className="flex justify-center gap-1.5 mt-5 sm:hidden">
          {STEPS.map((_,i)=>(
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{width:i===step?18:5,background:i===step?"#000435":i<step?"#FBBF24":"#E2E8F0"}}/>
          ))}
        </div>
      </div>

      {/* Post-submit redirect */}
      {postSubmitRedirect&&postSubmitRedirect.secondsLeft>0&&(
        <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4" style={{paddingBottom:"max(1rem,env(safe-area-inset-bottom))"}}>
          <div className="max-w-lg mx-auto rounded-2xl border-2 border-green-300 bg-green-50 overflow-hidden shadow-2xl">
            <div className="h-1.5 bg-green-100">
              <div className="h-full bg-green-500 rounded-r-full transition-all duration-1000" style={{width:`${(postSubmitRedirect.secondsLeft/POST_SUBMIT_REDIRECT_SEC)*100}%`}}/>
            </div>
            <div className="p-4 flex items-start gap-3">
              <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5"/>
              <div>
                <p className="text-[13px] font-medium text-slate-700 leading-relaxed">{postSubmitRedirect.message}</p>
                <p className="text-[12px] font-bold text-green-700 mt-2">Redirecting to login in <span className="text-amber-600">{postSubmitRedirect.secondsLeft}</span>s</p>
                <button type="button" onClick={()=>{setPostSubmitRedirect(null);navigate("/login");}} className="text-[12px] font-semibold underline text-green-700 mt-1">Go to login now</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast&&(
        <div className={`fixed bottom-4 right-4 z-50 flex items-start gap-2.5 p-4 rounded-2xl shadow-2xl max-w-xs ${toast.type==="success"?"bg-green-50 border border-green-200":"bg-red-50 border border-red-200"}`}>
          {toast.type==="success"?<CheckCircle size={14} className="text-green-600 mt-0.5 shrink-0"/>:<AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0"/>}
          <p className="text-[13px] font-medium flex-1">{toast.msg}</p>
          <button onClick={()=>setToast(null)} className="text-slate-300 hover:text-slate-500 shrink-0"><X size={12}/></button>
        </div>
      )}
    </div>
  );
}