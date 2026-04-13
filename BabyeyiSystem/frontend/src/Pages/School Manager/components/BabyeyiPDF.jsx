/**
 * BabyeyiPdf.jsx — Public Document Viewer
 * #000435 navy + amber-400 · MTN font · Tailwind only
 */

import { useState, useEffect } from "react";
import { buildWordDocHTML } from "./BabyeyiList";
import { getLegacyBabyeyiUI, getParentMessageForDisplay, getStatusLabelSafe } from "../../../i18n";

const FONT = `"MTN Brighter Sans","Nunito","Varela Round",sans-serif`;
const API_BASE   = "http://localhost:5100/api";
const ASSET_BASE = "http://localhost:5100";
const FRONTEND_ORIGIN = typeof window !== "undefined" ? window.location.origin : "http://localhost:5174";
const verifyUrl = (docId) => docId ? `${FRONTEND_ORIGIN}/babyeyi/verify/${docId}` : "";

const toAssetUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${ASSET_BASE}${path.replace(/\\/g, "/").replace(/^\/?/, "/")}`;
};

async function toBase64(url) {
  if (!url) return null;
  try {
    const abs = url.startsWith("http") ? url : `${ASSET_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
    const res = await fetch(abs, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result); fr.readAsDataURL(blob); });
  } catch { return null; }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script"); s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parseBanks(rec) {
  if (rec.banksJson) { try { const raw = typeof rec.banksJson === "string" ? JSON.parse(rec.banksJson) : rec.banksJson; if (Array.isArray(raw) && raw.length) return raw; } catch {} }
  if (rec.bankName) return [{ bankName: rec.bankName, accountNumber: rec.bankAccountNo || "", accountName: rec.bankAccountName || "", isPrimary: true }];
  return [];
}

const STATUS_CFG = {
  approved:    { bg:"bg-emerald-500/15", text:"text-emerald-400",  dot:"bg-emerald-400",  border:"border-emerald-500/25" },
  pending:     { bg:"bg-amber-400/15",   text:"text-amber-400",    dot:"bg-amber-400",    border:"border-amber-400/25" },
  recommended: { bg:"bg-blue-500/15",    text:"text-blue-400",     dot:"bg-blue-400",     border:"border-blue-500/25" },
  rejected:    { bg:"bg-red-500/15",     text:"text-red-400",      dot:"bg-red-500",      border:"border-red-500/25" },
  draft:       { bg:"bg-white/8",        text:"text-white/50",     dot:"bg-white/40",     border:"border-white/15" },
  submitted:   { bg:"bg-blue-500/15",    text:"text-blue-400",     dot:"bg-blue-400",     border:"border-blue-500/25" },
};

const DOC_STYLE = {
  heading: { fontSize:"14px", fontWeight:700, color:"#1e3a5f", textTransform:"uppercase", letterSpacing:"0.05em" },
  body:    { fontSize:"12px", color:"#1e293b", lineHeight:"1.7" },
  label:   { fontSize:"12px", color:"#64748b", fontWeight:600 },
  th:      { padding:"8px 12px", fontSize:"12px", fontWeight:700, color:"#1e3a5f", borderBottom:"2px solid #1e3a5f", textAlign:"left", background:"transparent" },
  td:      { padding:"7px 12px", fontSize:"12px", color:"#1e293b", borderBottom:"1px solid #e2e8f0", background:"transparent" },
  section: { marginBottom:"22px" },
};

const RwandaCoatSVG = () => (
  <svg viewBox="0 0 80 80" style={{ width:"100%", height:"100%" }}>
    <circle cx="40" cy="40" r="38" fill="#006400" stroke="#ffd700" strokeWidth="2"/>
    <circle cx="40" cy="40" r="28" fill="#006400" stroke="#ffd700" strokeWidth="1"/>
    <text x="40" y="36" textAnchor="middle" fontSize="10" fill="#ffd700" fontWeight="bold">RWANDA</text>
    <text x="40" y="48" textAnchor="middle" fontSize="7" fill="#ffd700">UBUMWE</text>
    <text x="40" y="57" textAnchor="middle" fontSize="6" fill="#ffd700">UMURIMO</text>
    <text x="40" y="65" textAnchor="middle" fontSize="6" fill="#ffd700">GUKUNDA IGIHUGU</text>
    <circle cx="40" cy="22" r="6" fill="#ffd700"/>
  </svg>
);

function DocSection({ title }) {
  return <div style={{ borderBottom:"1.5px solid #1e3a5f", paddingBottom:"5px", marginBottom:"12px", marginTop:"20px" }}><span style={DOC_STYLE.heading}>{title}</span></div>;
}

function WordDocView({ rec, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, qrLoading, lang = "en" }) {
  const T = getLegacyBabyeyiUI(lang);
  const parentMsg = getParentMessageForDisplay(rec, lang, T);
  const payments = Array.isArray(rec.payments) ? rec.payments : [];
  const totalFee = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const classNotes = Array.isArray(rec.classNotes) ? rec.classNotes : [];
  const reqs = Array.isArray(rec.requirements) ? rec.requirements : [];
  const otherInfos = Array.isArray(rec.otherInfos) ? rec.otherInfos : [];
  const leaders = Array.isArray(rec.leaders) ? rec.leaders : [];
  const banks = parseBanks(rec);
  const tblStyle = { width:"100%", borderCollapse:"collapse", marginTop:"8px" };
  const Th = ({ children, center, w }) => <th style={{ ...DOC_STYLE.th, textAlign:center?"center":"left", width:w||"auto" }}>{children}</th>;
  const Td = ({ children, center, mono, bold, color, italic }) => <td style={{ ...DOC_STYLE.td, textAlign:center?"center":"left", fontFamily:mono?"monospace":"inherit", fontWeight:bold?700:400, color:color||DOC_STYLE.td.color, fontStyle:italic?"italic":"normal" }}>{children}</td>;

  return (
    <div style={{ fontFamily:"Georgia,'Times New Roman',serif", color:"#1e293b" }}>
      <div style={{ height:"3px", background:"#1e3a5f" }} />
      <div style={{ padding:"20px 40px 16px", borderBottom:"2px solid #1e3a5f" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
          <div style={{ flexShrink:0, width:"84px", height:"84px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {otherLogoB64 ? <img src={otherLogoB64} style={{ width:"80px", height:"80px", objectFit:"contain" }} alt="Govt" /> : <div style={{ width:"80px", height:"80px", border:"1.5px solid #e2e8f0", borderRadius:"6px", overflow:"hidden" }}><RwandaCoatSVG /></div>}
          </div>
          <div style={{ flex:1, textAlign:"center" }}>
            <p style={{ fontSize:"10px", color:"#64748b", margin:"0", letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600, lineHeight:"1.8" }}>{T.republic}</p>
            <p style={{ fontSize:"10px", color:"#64748b", margin:"0", lineHeight:"1.8" }}>{T.district}: <strong style={{ color:"#1e3a5f" }}>{rec.district||"—"}</strong></p>
            <p style={{ fontSize:"10px", color:"#64748b", margin:"0 0 6px", lineHeight:"1.8" }}>{T.sector}: <strong style={{ color:"#1e3a5f" }}>{rec.sector||"—"}</strong></p>
            <h1 style={{ fontSize:"17px", fontWeight:700, color:"#1e3a5f", margin:"0 0 6px", textTransform:"uppercase", letterSpacing:".03em" }}>{rec.schoolName}</h1>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"14px", alignItems:"center", justifyContent:"center", marginBottom:"8px" }}>
              {[[T.academicYear,rec.academicYear],[T.termLabel,rec.term],[T.classLabel,rec.class]].map(([l,v],i)=>(
                <span key={i} style={DOC_STYLE.body}><strong style={{ color:"#1e3a5f" }}>{l}:</strong> {v||"—"}</span>
              ))}
              {rec.docId && <span style={{ ...DOC_STYLE.body, fontFamily:"monospace", fontWeight:700, color:"#3730a3", border:"1px solid #c7d2fe", padding:"1px 8px" }}>{rec.docId}</span>}
            </div>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"12px", background:"#f0f9ff", border:"1px solid #bfdbfe", padding:"4px 16px", borderRadius:"4px" }}>
              <span style={{ fontSize:"11px", color:"#1e3a5f", fontWeight:600 }}>Total Fee</span>
              <span style={{ fontSize:"16px", fontWeight:700, color:"#1e3a5f", fontFamily:"monospace" }}>RWF {totalFee.toLocaleString()}</span>
            </div>
          </div>
          <div style={{ flexShrink:0, width:"84px", height:"84px", border:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
            {schoolLogoB64 ? <img src={schoolLogoB64} style={{ width:"80px", height:"80px", objectFit:"contain" }} alt="School Logo" /> : <span style={{ fontSize:"8px", color:"#64748b", textAlign:"center", fontWeight:700, padding:"4px" }}>SCHOOL LOGO</span>}
          </div>
        </div>
      </div>
      <div style={{ padding:"20px 40px 28px" }}>
        {parentMsg && (<div style={DOC_STYLE.section}><DocSection title={T.parentMessageHeading}/><p style={{ ...DOC_STYLE.body, whiteSpace:"pre-line", margin:0, paddingLeft:"16px" }}>{parentMsg}</p></div>)}
        {payments.length>0 && (<div style={DOC_STYLE.section}><DocSection title={T.secFee}/><table style={tblStyle}><thead><tr><Th w="42px" center>#</Th><Th>Payment Item</Th><Th>Amount</Th></tr></thead><tbody>{payments.map((p,i)=><tr key={i}><Td center color="#64748b">{i+1}</Td><Td>{p.name}</Td><td style={{...DOC_STYLE.td,textAlign:"right",fontFamily:"monospace",fontWeight:600}}>{Number(p.amount||0).toLocaleString()}</td></tr>)}</tbody><tfoot><tr><td colSpan={2} style={{padding:"9px 12px",fontSize:"14px",fontWeight:700,color:"#1e3a5f",borderTop:"2px solid #1e3a5f"}}>Total</td><td style={{padding:"9px 12px",fontSize:"14px",fontWeight:700,color:"#1e3a5f",borderTop:"2px solid #1e3a5f",textAlign:"right",fontFamily:"monospace"}}>RWF {totalFee.toLocaleString()}</td></tr></tfoot></table></div>)}
        {banks.length>0 && (<div style={DOC_STYLE.section}><DocSection title={T.secBanking}/><table style={tblStyle}><thead><tr><Th w="40px" center>#</Th><Th>Bank</Th><Th>Account No.</Th><Th>Name</Th><Th w="70px" center>Primary</Th></tr></thead><tbody>{banks.map((bk,i)=><tr key={i}><Td center color="#64748b">{i+1}</Td><Td bold>{bk.bankName||"—"}</Td><Td mono>{bk.accountNumber||"—"}</Td><Td>{bk.accountName||"—"}</Td><Td center color="#059669" bold>{bk.isPrimary||i===0?"✓":""}</Td></tr>)}</tbody></table></div>)}
        {reqs.length>0 && (<div style={DOC_STYLE.section}><DocSection title={T.secRequirements}/><table style={tblStyle}><thead><tr><Th w="42px" center>#</Th><Th>Item</Th><Th>Description</Th><Th w="80px" center>Qty</Th></tr></thead><tbody>{reqs.map((r,i)=><tr key={i}><Td center color="#64748b">{i+1}</Td><Td>{(r&&r.item)||r}</Td><Td>{r&&r.description}</Td><Td center>{r&&r.quantity}</Td></tr>)}</tbody></table></div>)}
        {otherInfos.length>0 && (<div style={DOC_STYLE.section}><DocSection title={T.secOtherInfo}/><table style={tblStyle}><thead><tr><Th w="42px" center>#</Th><Th>Item</Th><Th>Details</Th></tr></thead><tbody>{otherInfos.map((n,i)=><tr key={i}><Td center color="#64748b">{i+1}</Td><Td bold>{n.item}</Td><Td>{n.details}</Td></tr>)}</tbody></table></div>)}
        {leaders.length>0 && (<div style={DOC_STYLE.section}><DocSection title={T.secLeadership}/><table style={tblStyle}><thead><tr><Th w="36px" center>#</Th><Th>Full Name</Th><Th>Role</Th><Th>Phone</Th><Th>Email</Th></tr></thead><tbody>{leaders.map((l,i)=><tr key={l.id||i}><Td center color="#64748b">{i+1}</Td><Td bold color="#1e3a5f">{l.name||"—"}</Td><Td italic color="#475569">{l.role||"—"}</Td><td style={{...DOC_STYLE.td,fontFamily:"monospace",fontSize:"11px"}}>{l.phone?`+250 ${l.phone}`:"—"}</td><td style={{...DOC_STYLE.td,fontSize:"11px",color:"#2563eb"}}>{l.email||"—"}</td></tr>)}</tbody></table></div>)}
        {classNotes.length>0 && (<div style={DOC_STYLE.section}><DocSection title={T.secClassNotes}/><table style={tblStyle}><thead><tr><Th w="42px" center>#</Th><Th>Item</Th><Th>Details</Th></tr></thead><tbody>{classNotes.map((n,i)=><tr key={i}><Td center color="#64748b">{i+1}</Td><Td bold>{n.item}</Td><Td>{n.details||"—"}</Td></tr>)}</tbody></table></div>)}
        {/* Auth */}
        <div style={DOC_STYLE.section}>
          <DocSection title={T.secAuth}/>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"20px", marginTop:"12px" }}>
            <div style={{ border:"1px solid #e2e8f0", padding:"14px", textAlign:"center" }}>
              <p style={{ ...DOC_STYLE.label, textTransform:"uppercase", fontSize:"11px", margin:"0 0 8px" }}>{T.sigHeadTeacher}</p>
              <div style={{ height:"52px", borderBottom:"1px solid #cbd5e1", display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:"4px", marginBottom:"6px" }}>
                {sigB64 && <img src={sigB64} style={{ maxHeight:"48px", maxWidth:"140px", objectFit:"contain" }} alt="Sig"/>}
              </div>
              <p style={{ fontSize:"11px", color:"#94a3b8", margin:0 }}>{sigB64?T.sigSigned:T.sigRequired}</p>
            </div>
            <div style={{ border:"1px solid #e2e8f0", padding:"14px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              {qrB64 ? (
                <>
                  <div style={{ background:"white", border:"1px solid #e2e8f0", padding:"4px", borderRadius:"4px" }}>
                    <img src={qrB64} style={{ width:"80px", height:"80px", objectFit:"contain", display:"block" }} alt="QR"/>
                  </div>
                  <p style={{ fontSize:"10px", color:"#1e3a5f", fontWeight:700, margin:"6px 0 0", textTransform:"uppercase", letterSpacing:".05em" }}>{T.sigScanVerify}</p>
                  {rec.docId && <p style={{ fontSize:"10px", color:"#64748b", margin:"2px 0 0", fontFamily:"monospace" }}>ID: {rec.docId}</p>}
                </>
              ) : qrLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"/>
                  <span style={{ fontSize:"10px", color:"#4f46e5", fontWeight:700 }}>Generating…</span>
                </div>
              ) : (
                <div style={{ width:80, height:80, border:"1px dashed #e2e8f0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:"22px", opacity:.1 }}>▣</span>
                </div>
              )}
            </div>
            <div style={{ border:"1px solid #e2e8f0", padding:"14px", textAlign:"center" }}>
              <p style={{ ...DOC_STYLE.label, textTransform:"uppercase", fontSize:"11px", margin:"0 0 8px" }}>{T.sigStamp}</p>
              <div style={{ width:"80px", height:"80px", border:"1px dashed #e2e8f0", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", margin:"0 auto 6px" }}>
                {stampB64 ? <img src={stampB64} style={{ width:"76px", height:"76px", objectFit:"contain", borderRadius:"50%" }} alt="Stamp"/> : <span style={{ fontSize:"22px", opacity:.08 }}>🔏</span>}
              </div>
              <p style={{ fontSize:"11px", color:"#94a3b8", margin:0 }}>{T.sigCachet}</p>
            </div>
          </div>
        </div>
      </div>
      <div style={{ borderTop:"1px solid #1e3a5f", padding:"8px 40px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"11px", color:"#64748b" }}>{rec.schoolName||""} · {rec.district||""}</span>
        <span style={{ fontSize:"11px", color:"#1e3a5f", fontWeight:700, textTransform:"uppercase" }}>{T.docOfficial}</span>
        <span style={{ fontSize:"11px", color:"#64748b" }}>{T.docFooterLeft} {rec.docId||"—"}</span>
      </div>
      <div style={{ height:"3px", background:"#1e3a5f" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function BabyeyiPdf() {
  const getId = () => { const parts = window.location.pathname.split("/"); return parts[parts.length-1] || parts[parts.length-2] || null; };

  const [rec, setRec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [schoolLogoB64, setSchoolLogoB64] = useState(null);
  const [otherLogoB64, setOtherLogoB64] = useState(null);
  const [sigB64, setSigB64] = useState(null);
  const [stampB64, setStampB64] = useState(null);
  const [qrB64, setQrB64] = useState(null);
  const [vUrl, setVUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(true);
  const [lang] = useState(() => {
    try { const l = (new URLSearchParams(window.location.search).get("lang") || "en").toLowerCase(); return ["en","rw","fr"].includes(l) ? l : "en"; } catch { return "en"; }
  });

  const norm = (p) => p ? p.replace(/\\/g, "/") : null;

  useEffect(() => {
    const id = getId();
    if (!id || id === "pdf") { setError("No document ID provided."); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/babyeyi/${id}?lang=${encodeURIComponent(lang)}`, { credentials: "include" });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || "Not found");
        const d = json.data; const sig = d.signatures || {};
        let payments = (d.payments || []).map(p => ({ name: p.name, amount: Number(p.amount || 0) }));
        if (!payments.length && d.payments_json) { try { payments = JSON.parse(d.payments_json); } catch {} }
        const allReqs = (d.class_requirements || []).map(r => ({ item: r.item || r.information || "", details: r.details || "" }));
        const classNotes = allReqs.filter(r => r.details && r.details.trim());
        const otherInfos = allReqs.filter(r => !r.details || !r.details.trim());
        let leaders = Array.isArray(d.leaders) ? d.leaders : [];
        if (!leaders.length) { try { const lr = await fetch(`${API_BASE}/babyeyi/${d.id||id}/leaders`, { credentials:"include" }); const lj = await lr.json(); if (lj.success && Array.isArray(lj.data)) leaders = lj.data; } catch {} }
        let classes = [];
        try { const raw = d.classes_json || d.classesJson || d.classes || null; if (Array.isArray(raw)) classes = raw; else if (typeof raw === "string" && raw.trim().startsWith("[")) classes = JSON.parse(raw); } catch {}
        const primaryClass = (d.class_name || d.class || classes[0] || "").toString();
        const classLabel = (classes.length ? classes : [primaryClass]).filter(Boolean).join(", ");
        const built = {
          id: d.id, class: classLabel, classes, level: d.education_level || d.level || "Primary",
          term: d.term || "", academicYear: d.academic_year || "", status: d.status || "approved",
          schoolName: d.school_name || "", district: d.school_district || d.district || "", sector: d.school_sector || d.sector || "",
          bankName: d.bank_name || "", bankAccountNo: d.bank_account_no || "", bankAccountName: d.bank_account_name || "",
          banksJson: d.banks_json || null, parentMessage: d.parent_message || "", docId: d.doc_id || null,
          totalFee: Number(d.total_fee || d.total_amount || payments.reduce((s, p) => s + Number(p.amount || 0), 0) || 0),
          schoolLogoPath: norm(sig.school_logo_path) || null, otherLogoPath: norm(sig.other_logo_path) || null,
          signaturePath: norm(sig.director_sig_path) || null, stampPath: norm(sig.stamp_path) || null,
          qrCodeUrl: norm(sig.qr_code_path) || norm(d.qr_code_path) || norm(d.qr_code_url) || null,
          qrViewUrl: sig.qr_view_url || d.qr_view_url || null,
          payments, requirements: (d.student_requirements || []).map(r => ({ item: r.item, description: r.description || "", quantity: r.quantity || "" })),
          classNotes, otherInfos, leaders,
        };
        setRec(built);
        const [logo, otherLogo, sigImg, stamp] = await Promise.all([toBase64(toAssetUrl(built.schoolLogoPath)), toBase64(toAssetUrl(built.otherLogoPath)), toBase64(toAssetUrl(built.signaturePath)), toBase64(toAssetUrl(built.stampPath))]);
        setSchoolLogoB64(logo); setOtherLogoB64(otherLogo); setSigB64(sigImg); setStampB64(stamp);
        setQrLoading(true);
        if (built.qrCodeUrl) {
          const qb64 = await toBase64(toAssetUrl(built.qrCodeUrl));
          setQrB64(qb64); setVUrl(built.qrViewUrl || verifyUrl(built.docId));
        } else {
          try {
            const qr = await fetch(`${API_BASE}/babyeyi/${built.id}/qrcode`, { credentials: "include" });
            const qrj = await qr.json();
            if (qrj.success && qrj.data?.qr_code_url) { const qb64 = await toBase64(toAssetUrl(qrj.data.qr_code_url)); setQrB64(qb64); setVUrl(qrj.data.qr_view_url || verifyUrl(built.docId)); }
          } catch {}
        }
        setQrLoading(false);
      } catch (e) { setError(e.message || "Failed to load document"); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleDownloadPDF = async () => {
    if (!rec) return;
    setDownloading(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const payments = Array.isArray(rec.payments) ? rec.payments : [];
      const totalFee = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const today = new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" });
      const html = buildWordDocHTML({ rec, totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl, lang });
      const style = document.createElement("style");
      style.textContent = `#__bp__ * { box-sizing:border-box; color-scheme:light only; } #__bp__ { all:initial;display:block;background:#fff; }`;
      document.head.appendChild(style);
      const host = document.createElement("div"); host.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-9999;";
      const root = document.createElement("div"); root.id = "__bp__"; root.innerHTML = html;
      host.appendChild(root); document.body.appendChild(host);
      try {
        await new Promise(r => setTimeout(r, 500));
        const canvas = await window.html2canvas(root, { scale:2, useCORS:true, backgroundColor:"#fff", logging:false, windowWidth:794 });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
        const pW=210, pH=297; const imgH=(canvas.height/canvas.width)*pW;
        if (imgH<=pH) { pdf.addImage(canvas.toDataURL("image/jpeg",0.95),"JPEG",0,0,pW,imgH); }
        else {
          let yPos=0, page=0;
          while (yPos<imgH) {
            if (page>0) pdf.addPage();
            const srcYPx=Math.floor((yPos/imgH)*canvas.height); const sliceHPx=Math.min(Math.ceil((pH/imgH)*canvas.height),canvas.height-srcYPx);
            if (sliceHPx<=0) break;
            const sl=document.createElement("canvas"); sl.width=canvas.width; sl.height=sliceHPx;
            sl.getContext("2d").drawImage(canvas,0,srcYPx,canvas.width,sliceHPx,0,0,canvas.width,sliceHPx);
            pdf.addImage(sl.toDataURL("image/jpeg",0.95),"JPEG",0,0,pW,(sliceHPx/canvas.height)*imgH);
            yPos+=pH; page++;
          }
        }
        pdf.save(`Babyeyi-${rec.docId||rec.class}-${rec.term}${lang!=="en"?`-${lang.toUpperCase()}`:"" }.pdf`);
      } finally { document.body.removeChild(host); document.head.removeChild(style); }
    } catch (e) { alert("PDF error: " + e.message); }
    finally { setDownloading(false); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000435] gap-4" style={{ fontFamily: FONT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');`}</style>
      <div className="w-14 h-14 rounded-2xl border border-amber-400/20 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"/>
      </div>
      <p className="text-white/50 font-bold text-[14px]">Loading document…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#000435] gap-4 p-6" style={{ fontFamily: FONT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');`}</style>
      <div className="text-5xl">⚠️</div>
      <p className="text-red-400 font-black text-lg">Failed to load document</p>
      <p className="text-white/40 text-[13px] text-center max-w-sm">{error}</p>
    </div>
  );

  if (!rec) return null;

  const Tb = getLegacyBabyeyiUI(lang);
  const st = STATUS_CFG[rec.status] || STATUS_CFG.draft;
  const statusLabel = getStatusLabelSafe(lang, rec.status);

  return (
    <div className="min-h-screen bg-[#000435] py-6 px-3 sm:px-6" style={{ fontFamily: FONT }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Top bar */}
      <div className="max-w-4xl mx-auto mb-5">
        <div className="rounded-2xl bg-[#000435] border-2 border-amber-400/25 px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-amber-400/12 border border-amber-400/20 rounded-xl flex items-center justify-center text-lg shrink-0">📄</div>
            <div className="min-w-0">
              <p className="text-white font-black text-[13px] truncate">
                {rec.schoolName} — {rec.class} · {rec.term} · {rec.academicYear}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {rec.docId && <span className="text-[9px] font-mono font-black bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20">{rec.docId}</span>}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${st.bg} ${st.text} ${st.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${st.dot}`}/> {statusLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {rec.docId && (
              <a href={verifyUrl(rec.docId)} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 rounded-xl text-[11px] font-bold hover:bg-emerald-500/20 transition-all">
                ✓ {Tb.verify || "Verify"}
              </a>
            )}
            <button onClick={handleDownloadPDF} disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white rounded-xl text-[11px] font-bold transition-all">
              {downloading ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "📄"}
              {downloading ? "Generating…" : (Tb.pdfBtn || "Download PDF")}
            </button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-amber-400/20">
          <WordDocView
            rec={rec} schoolLogoB64={schoolLogoB64} otherLogoB64={otherLogoB64}
            sigB64={sigB64} stampB64={stampB64} qrB64={qrB64} vUrl={vUrl}
            qrLoading={qrLoading} lang={lang}
          />
        </div>
      </div>
    </div>
  );
}