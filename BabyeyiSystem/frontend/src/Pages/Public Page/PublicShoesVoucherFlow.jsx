import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Package, Search, Truck, Footprints, MapPin, User, CreditCard, Building2, Home, ShoppingBag } from "lucide-react";
import { getApiBase } from "../../utils/apiBase";
import { STUDENT_SERVICE_CHECKOUT_KEY } from "./StudentServiceCheckout";

const API = getApiBase();

const STEPS = ["Select Voucher","Student Lookup","Shoe Details","Delivery","Summary","Payment","Receipt"];

const fallbackVouchers = [
  { id:"shoe-nursery",  name:"Nursery Shoes Voucher",   short_tagline:"Nursery",    description:"Comfortable school shoes for nursery students.",               price_from:9500,  status:"active", service_code:"SHOE-NURSERY"  },
  { id:"shoe-primary",  name:"Primary Shoes Voucher",   short_tagline:"P1–P6",      description:"Durable, daily-use shoes for primary school learners.",          price_from:13000, status:"active", service_code:"SHOE-PRIMARY"  },
  { id:"shoe-secondary",name:"Secondary Shoes Voucher", short_tagline:"S1–S6",      description:"Formal school shoes for lower and upper secondary.",             price_from:18000, status:"active", service_code:"SHOE-SECONDARY"},
  { id:"shoe-sports",   name:"Sports Shoes Voucher",    short_tagline:"Sports",     description:"Athletic shoes for school sports and activities.",               price_from:22000, status:"active", service_code:"SHOE-SPORTS"   },
];

function frw(n) {
  if (n==null||Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("en-RW")} Frw`;
}

function normalizeMethod(m) {
  const v = String(m||"").toLowerCase();
  if (v.includes("home")) return "home_delivery";
  if (v.includes("branch")||v.includes("office")) return "branch_collection";
  return "school_collection";
}

/* ── Shared field atoms ─────────────────────────────────────────── */
function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-[0.12em] text-[#000435]/50 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ className="", ...props }) {
  return <input className={`w-full rounded-xl border-2 border-slate-200 px-3.5 py-3 text-[14px] font-semibold text-[#000435] placeholder:text-slate-300 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 min-h-[48px] transition-all ${className}`} {...props}/>;
}

function Select({ className="", children, ...props }) {
  return (
    <select className={`w-full rounded-xl border-2 border-slate-200 px-3.5 py-3 text-[14px] font-semibold text-[#000435] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 min-h-[48px] transition-all bg-white appearance-none ${className}`} {...props}>
      {children}
    </select>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">{label}</p>
      <p className="text-[14px] font-bold text-[#000435]">{value||"—"}</p>
    </div>
  );
}

function SummaryRow({ k, v, strong }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[13px] text-slate-500">{k}</span>
      <span className={`text-[13px] ${strong?"font-black text-[#000435]":"font-semibold text-slate-700"}`}>{v}</span>
    </div>
  );
}

export default function PublicShoesVoucherFlow() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [voucherErr, setVoucherErr] = useState("");
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [studentCode, setStudentCode] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteErr, setQuoteErr] = useState("");
  const [quote, setQuote] = useState(null);
  const [shoe, setShoe] = useState({ size:"", genderType:"", category:"", quantity:1, model:"" });
  const [delivery, setDelivery] = useState({ method:"school_collection", district:"", sector:"", cell:"", village:"", phone:"", exactAddress:"" });
  const [payment, setPayment] = useState({ method:"momo", payerName:"", payerPhone:"" });
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingVouchers(true); setVoucherErr("");
      try {
        const r = await fetch(`${API}/student-services/public/services`);
        const j = await r.json().catch(()=>({}));
        if (!r.ok||!j.success) throw new Error(j.message||"Failed to load vouchers");
        const list = Array.isArray(j.data)?j.data:[];
        const shoes = list.filter(s=>{const hay=`${s.name||""} ${s.service_code||""} ${s.category||""}`.toLowerCase();return hay.includes("shoe")||hay.includes("voucher");});
        if (!mounted) return;
        setVouchers(shoes.length?shoes:fallbackVouchers);
      } catch(e) { if(!mounted)return; setVoucherErr(e.message||"Could not load vouchers"); setVouchers(fallbackVouchers); }
      finally { if(mounted)setLoadingVouchers(false); }
    })();
    return ()=>{mounted=false;};
  }, []);

  const baseAmount = Number(quote?.amount ?? selectedVoucher?.price_from ?? 0);
  const deliveryFee = useMemo(()=>{ if(delivery.method==="home_delivery")return 2000; if(delivery.method==="branch_collection")return 1000; return 0; },[delivery.method]);
  const total = Math.max(0, baseAmount * Math.max(1,Number(shoe.quantity||1)) + deliveryFee);

  const onLookup = async (e) => {
    e.preventDefault(); if(!selectedVoucher)return; setQuoteErr("");
    if(studentCode.trim().length<3){setQuoteErr("Enter student code or registration number.");return;}
    if(!selectedVoucher?.id||Number.isNaN(Number(selectedVoucher.id))){
      setQuote({student:{first_name:"Student",last_name:"Preview",class_name:"N/A",school_name:"Demo School",district:"N/A",sector:"N/A"},amount:Number(selectedVoucher.price_from||0)});
      setActiveStep(2); return;
    }
    setQuoteLoading(true);
    try {
      const res = await fetch(`${API}/student-services/public/quote`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:selectedVoucher.id,student_code:studentCode.trim()})});
      const j = await res.json().catch(()=>({}));
      if(!j.success)throw new Error(j.message||"Could not find student");
      setQuote(j.data); setActiveStep(2);
    } catch(e2){setQuoteErr(e2.message||"Lookup failed");}
    finally{setQuoteLoading(false);}
  };

  const toSummary = () => {
    if(!shoe.size||!shoe.category)return;
    if(delivery.method==="home_delivery"){const needed=[delivery.district,delivery.sector,delivery.cell,delivery.village,delivery.phone,delivery.exactAddress];if(needed.some(v=>!String(v||"").trim()))return;}
    setActiveStep(4);
  };

  const confirmPayment = () => {
    if(!payment.payerName.trim()||!payment.payerPhone.trim())return;
    if(payment.method==="momo"){
      try{sessionStorage.setItem(STUDENT_SERVICE_CHECKOUT_KEY,JSON.stringify({service:selectedVoucher,quote:{...quote,amount:total},studentCodeInput:studentCode.trim(),meta:{shoe,delivery,deliveryFee},savedAt:Date.now()}));}catch{return;}
      navigate("/payments",{state:{studentServicePay:{payerName:payment.payerName.trim(),payerPhone:payment.payerPhone.trim()}}});return;
    }
    setReceipt({requestNo:`SV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`,payRef:`PAY-${Date.now().toString().slice(-8)}`,paidAt:new Date().toLocaleString(),status:payment.method==="cash"?"Pending":"Paid",tracking:payment.method==="cash"?"Pending":"Processing"});
    setActiveStep(6);
  };

  const student = quote?.student||{};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <div className="sticky top-0 z-20 bg-[#000435] border-b-[3px] border-amber-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/services" className="inline-flex items-center gap-2 text-amber-400 font-bold text-sm hover:text-amber-300 transition-colors">
            <ArrowLeft size={17}/> Services
          </Link>
          <div className="flex items-center gap-2">
            <Footprints size={16} className="text-amber-400"/>
            <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Shoes Voucher</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page heading */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black text-[#000435] tracking-tight">Shoes Voucher Service</h1>
          <p className="text-slate-500 mt-1.5 text-sm sm:text-base">Select a package, confirm student details, choose shoe options, and pay securely.</p>
        </div>

        {/* Step pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 sm:mb-8">
          {STEPS.map((s,i)=>(
            <div key={s} className={`shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold border transition-all ${i<activeStep?"border-amber-400 bg-amber-400 text-[#000435]":i===activeStep?"border-[#000435] bg-[#000435] text-amber-400":"border-slate-200 bg-white text-slate-400"}`}>
              <span className="hidden sm:inline">{s}</span>
              <span className="sm:hidden">{i+1}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">

          {/* Step 0: Select Voucher */}
          {activeStep===0&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#000435] border-2 border-amber-400 flex items-center justify-center"><ShoppingBag size={19} className="text-amber-400"/></div>
                <div><h2 className="font-black text-[#000435] text-[18px]">Select Voucher</h2><p className="text-[13px] text-slate-400">Choose the shoe package that fits your student.</p></div>
              </div>
              {voucherErr&&<p className="text-sm text-red-600 mb-3 font-medium">{voucherErr}</p>}
              {loadingVouchers?(
                <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={32}/></div>
              ):(
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                  {vouchers.map(v=>(
                    <button key={v.id} type="button" onClick={()=>setSelectedVoucher(v)}
                      className={`text-left rounded-2xl border-2 p-4 sm:p-5 transition-all ${selectedVoucher?.id===v.id?"border-amber-400 bg-amber-50 shadow-md":"border-slate-200 bg-white hover:border-amber-300"}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-black text-[#000435] text-[15px]">{v.name}</h3>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${String(v.status||"active").toLowerCase()==="active"?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>
                          {String(v.status||"active").toLowerCase()==="active"?"Available":"Unavailable"}
                        </span>
                      </div>
                      <p className="text-[12px] font-semibold text-amber-600 mb-1">{v.short_tagline||v.category||"Shoes Voucher"}</p>
                      <p className="text-[13px] text-slate-500 leading-relaxed mb-3">{v.description||"Professional shoes support package."}</p>
                      <p className="font-black text-[#000435] text-[16px]">{frw(v.price_from)}</p>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button type="button" onClick={()=>selectedVoucher&&setActiveStep(1)} disabled={!selectedVoucher}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#000435] text-amber-400 px-5 py-3 font-black text-[14px] disabled:opacity-40 hover:bg-[#000c6b] transition-all min-h-[48px]">
                  Next <ArrowRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Student Lookup */}
          {activeStep===1&&(
            <form onSubmit={onLookup}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#000435] border-2 border-amber-400 flex items-center justify-center"><User size={18} className="text-amber-400"/></div>
                <div><h2 className="font-black text-[#000435] text-[18px]">Student Lookup</h2><p className="text-[13px] text-slate-400">Enter student code or registration number.</p></div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5">
                <p className="text-[13px] font-bold text-[#000435]">Selected: <span className="text-amber-700">{selectedVoucher?.name}</span> — {frw(selectedVoucher?.price_from)}</p>
              </div>
              <Field label="Student Code / Registration Number">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input value={studentCode} onChange={e=>setStudentCode(e.target.value)} placeholder="e.g. 040080001" className="flex-1"/>
                  <button type="submit" disabled={quoteLoading}
                    className="rounded-xl bg-[#000435] text-amber-400 px-5 py-3 font-black text-[14px] inline-flex items-center justify-center gap-2 min-h-[48px] hover:bg-[#000c6b] transition-all disabled:opacity-60">
                    {quoteLoading?<Loader2 size={16} className="animate-spin"/>:<Search size={16}/>} Lookup
                  </button>
                </div>
              </Field>
              {quoteErr&&<p className="text-[13px] text-red-600 mt-2 font-medium">{quoteErr}</p>}
              <div className="mt-6 flex items-center justify-between">
                <button type="button" onClick={()=>setActiveStep(0)} className="rounded-xl border-2 border-slate-200 px-4 py-2.5 font-bold text-[13px] text-slate-600 hover:border-slate-300 transition-all min-h-[44px]">Back</button>
              </div>
            </form>
          )}

          {/* Step 2: Shoe Details */}
          {activeStep===2&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#000435] border-2 border-amber-400 flex items-center justify-center"><Footprints size={18} className="text-amber-400"/></div>
                <div><h2 className="font-black text-[#000435] text-[18px]">Shoe Details</h2><p className="text-[13px] text-slate-400">Confirm student info and specify shoe requirements.</p></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                <InfoCard label="Student" value={`${student.first_name||""} ${student.last_name||""}`.trim()||"—"}/>
                <InfoCard label="School" value={student.school_name||"—"}/>
                <InfoCard label="Class" value={student.class_name||"—"}/>
                <InfoCard label="District / Sector" value={`${student.district||"—"} / ${student.sector||"—"}`}/>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Shoe Size *"><Input value={shoe.size} onChange={e=>setShoe(p=>({...p,size:e.target.value}))} placeholder="e.g. 36"/></Field>
                <Field label="Gender Type *">
                  <Select value={shoe.genderType} onChange={e=>setShoe(p=>({...p,genderType:e.target.value}))}>
                    <option value="">Select</option><option>Boy</option><option>Girl</option><option>Unisex</option>
                  </Select>
                </Field>
                <Field label="Shoe Category *">
                  <Select value={shoe.category} onChange={e=>setShoe(p=>({...p,category:e.target.value}))}>
                    <option value="">Select</option><option>Formal</option><option>Sports</option><option>Canvas</option>
                  </Select>
                </Field>
                <Field label="Quantity"><Input type="number" min={1} value={shoe.quantity} onChange={e=>setShoe(p=>({...p,quantity:Math.max(1,Number(e.target.value||1))}))} /></Field>
                <Field label="Preferred Model" className="sm:col-span-2"><Input value={shoe.model} onChange={e=>setShoe(p=>({...p,model:e.target.value}))} placeholder="Optional model/type"/></Field>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button type="button" onClick={()=>setActiveStep(1)} className="rounded-xl border-2 border-slate-200 px-4 py-2.5 font-bold text-[13px] text-slate-600 min-h-[44px]">Back</button>
                <button type="button" onClick={()=>setActiveStep(3)} disabled={!shoe.size||!shoe.category}
                  className="rounded-xl bg-[#000435] text-amber-400 px-5 py-2.5 font-black text-[14px] disabled:opacity-40 hover:bg-[#000c6b] transition-all min-h-[48px]">Continue</button>
              </div>
            </div>
          )}

          {/* Step 3: Delivery */}
          {activeStep===3&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#000435] border-2 border-amber-400 flex items-center justify-center"><Truck size={18} className="text-amber-400"/></div>
                <div><h2 className="font-black text-[#000435] text-[18px]">Collection or Delivery</h2><p className="text-[13px] text-slate-400">How should we get the shoes to your student?</p></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 mb-5">
                {[
                  {id:"school_collection",label:"Collect at School",Icon:Building2,desc:"Delivery to school"},
                  {id:"home_delivery",label:"Home Delivery",Icon:Home,desc:"+2,000 Frw"},
                  {id:"branch_collection",label:"Collect from Branch",Icon:MapPin,desc:"+1,000 Frw"},
                ].map(o=>(
                  <button key={o.id} type="button" onClick={()=>setDelivery(p=>({...p,method:normalizeMethod(o.id)}))}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${delivery.method===o.id?"border-amber-400 bg-amber-50":"border-slate-200 hover:border-amber-200"}`}>
                    <o.Icon size={20} className={delivery.method===o.id?"text-amber-600":"text-slate-400"} />
                    <p className={`font-black text-[13px] mt-2 ${delivery.method===o.id?"text-[#000435]":"text-slate-600"}`}>{o.label}</p>
                    <p className={`text-[11px] ${delivery.method===o.id?"text-amber-600":"text-slate-400"}`}>{o.desc}</p>
                  </button>
                ))}
              </div>
              {delivery.method==="home_delivery"?(
                <div className="grid sm:grid-cols-2 gap-4">
                  {["district","sector","cell","village","phone"].map(k=>(
                    <Field key={k} label={k.charAt(0).toUpperCase()+k.slice(1)+" *"}>
                      <Input value={delivery[k]} onChange={e=>setDelivery(p=>({...p,[k]:e.target.value}))} placeholder={k}/>
                    </Field>
                  ))}
                  <Field label="Exact Address *" className="sm:col-span-2"><Input value={delivery.exactAddress} onChange={e=>setDelivery(p=>({...p,exactAddress:e.target.value}))} placeholder="Full delivery address"/></Field>
                </div>
              ):(
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-600">
                  {delivery.method==="school_collection"?"Your student's school address will be used for delivery.":"Branch collection details will be sent to you after payment."}
                </div>
              )}
              <div className="mt-6 flex items-center justify-between">
                <button type="button" onClick={()=>setActiveStep(2)} className="rounded-xl border-2 border-slate-200 px-4 py-2.5 font-bold text-[13px] text-slate-600 min-h-[44px]">Back</button>
                <button type="button" onClick={toSummary}
                  className="rounded-xl bg-[#000435] text-amber-400 px-5 py-2.5 font-black text-[14px] hover:bg-[#000c6b] transition-all min-h-[48px]">Continue</button>
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {activeStep===4&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#000435] border-2 border-amber-400 flex items-center justify-center"><Package size={18} className="text-amber-400"/></div>
                <div><h2 className="font-black text-[#000435] text-[18px]">Order Summary</h2><p className="text-[13px] text-slate-400">Review your order before payment.</p></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                <InfoCard label="Voucher" value={selectedVoucher?.name||"—"}/>
                <InfoCard label="Student" value={`${student.first_name||""} ${student.last_name||""}`.trim()||"—"}/>
                <InfoCard label="School" value={student.school_name||"—"}/>
                <InfoCard label="Shoe Size" value={shoe.size||"—"}/>
                <InfoCard label="Category" value={shoe.category||"—"}/>
                <InfoCard label="Delivery" value={delivery.method.replace(/_/g," ")}/>
              </div>
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-700 mb-3">Price Breakdown</p>
                <SummaryRow k="Voucher Amount" v={frw(baseAmount)}/>
                <SummaryRow k={`Qty × ${shoe.quantity||1}`} v={frw(baseAmount*Math.max(1,Number(shoe.quantity||1)))}/>
                <SummaryRow k="Delivery Fee" v={frw(deliveryFee)}/>
                <div className="flex items-center justify-between pt-3 mt-1 border-t-2 border-amber-300">
                  <span className="font-black text-[#000435] text-[15px]">Total</span>
                  <span className="font-black text-[#000435] text-[20px]">{frw(total)}</span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button type="button" onClick={()=>setActiveStep(3)} className="rounded-xl border-2 border-slate-200 px-4 py-2.5 font-bold text-[13px] text-slate-600 min-h-[44px]">Edit</button>
                <button type="button" onClick={()=>setActiveStep(5)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#000435] text-amber-400 px-5 py-2.5 font-black text-[14px] hover:bg-[#000c6b] transition-all min-h-[48px]">
                  Confirm & Pay <ArrowRight size={16}/>
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Payment */}
          {activeStep===5&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#000435] border-2 border-amber-400 flex items-center justify-center"><CreditCard size={18} className="text-amber-400"/></div>
                <div><h2 className="font-black text-[#000435] text-[18px]">Payment</h2><p className="text-[13px] text-slate-400">Choose your payment method and complete your request.</p></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                {[["momo","Mobile Money"],["card","Card"],["bank","Bank Transfer"],["cash","Cash at Office"]].map(([id,label])=>(
                  <button key={id} type="button" onClick={()=>setPayment(p=>({...p,method:id}))}
                    className={`rounded-xl border-2 px-3 py-3 text-[12px] font-bold transition-all ${payment.method===id?"border-amber-400 bg-amber-50 text-[#000435]":"border-slate-200 text-slate-500 hover:border-amber-200"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <Field label="Payer Name *"><Input value={payment.payerName} onChange={e=>setPayment(p=>({...p,payerName:e.target.value}))} placeholder="Full name"/></Field>
                <Field label="Payer Phone *"><Input value={payment.payerPhone} onChange={e=>setPayment(p=>({...p,payerPhone:e.target.value}))} placeholder="e.g. 0781234567"/></Field>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-600">
                Amount: <strong className="text-[#000435]">{frw(total)}</strong> · Method: <strong className="text-[#000435]">{payment.method==="momo"?"MTN Mobile Money":payment.method}</strong>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button type="button" onClick={()=>setActiveStep(4)} className="rounded-xl border-2 border-slate-200 px-4 py-2.5 font-bold text-[13px] text-slate-600 min-h-[44px]">Back</button>
                <button type="button" onClick={confirmPayment}
                  className="rounded-xl bg-amber-400 text-[#000435] px-5 py-2.5 font-black text-[14px] hover:bg-amber-300 transition-all min-h-[48px]">Pay &amp; Continue</button>
              </div>
            </div>
          )}

          {/* Step 6: Receipt */}
          {activeStep===6&&(
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center"><CheckCircle2 size={20} className="text-white"/></div>
                <div><h2 className="font-black text-[#000435] text-[18px]">Receipt &amp; Confirmation</h2><p className="text-[13px] text-slate-400">Your voucher request has been submitted.</p></div>
              </div>
              <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-5 sm:p-6 mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={18} className="text-green-600"/>
                  <p className="font-black text-green-800 text-[15px]">Voucher request submitted successfully!</p>
                </div>
                <div className="space-y-0">
                  <SummaryRow k="Voucher Request No." v={receipt?.requestNo||"—"}/>
                  <SummaryRow k="Payment Reference" v={receipt?.payRef||"—"}/>
                  <SummaryRow k="Payment Time" v={receipt?.paidAt||"—"}/>
                  <SummaryRow k="Status" v={receipt?.status||"Pending"} strong/>
                  <SummaryRow k="Tracking" v={receipt?.tracking||"Processing"}/>
                </div>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <button type="button" onClick={()=>window.print()} className="rounded-xl border-2 border-green-300 bg-white px-4 py-2.5 text-[13px] font-bold text-green-700 hover:bg-green-50 min-h-[44px]">Print Receipt</button>
                  <Link to="/track" className="rounded-xl bg-[#000435] text-amber-400 px-4 py-2.5 text-[13px] font-black inline-flex items-center gap-2 hover:bg-[#000c6b] transition-all min-h-[44px]"><Truck size={15}/> Track Status</Link>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-[13px] text-slate-500 leading-relaxed">
                Status journey: Pending → Paid → Approved → Processing → Ready for delivery → Delivered → Completed.
              </div>
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Package size={16} className="text-amber-600 shrink-0 mt-0.5"/>
          <p className="text-[13px] text-amber-800">Shoes vouchers displayed here come from the Super Admin managed services catalog. Pricing, availability, and stock are controlled by Super Admin.</p>
        </div>
      </div>
    </div>
  );
}