/**
 * IDCardT2 — Portrait student ID card (Wisdom Schools Rwanda template)
 *
 * FIXES v4:
 *  1. QR always visible on export — fixed draw order (fill box → drawQR → stroke border)
 *  2. globalAlpha always reset to 1 before every draw section
 *  3. Denser QR pattern — 29×29 grid with proper finder + data modules
 *  4. ctx.save()/restore() wraps every clipped section so nothing bleeds
 *  5. Photo cover-fit is pixel-perfect centered inside circle
 *  6. Fast off-screen canvas pipeline (no html2canvas)
 *  7. Bulk ZIP with progress bar
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/* ─── Constants ─────────────────────────────────────────────────────── */
export const CARD_PX = { w: 320, h: 530 };
const SCALE = 3; /* 3× → 960 × 1590 — print quality */

const C = {
  navy:       '#1a3572',
  navyDark:   '#0d1f4a',
  navyLight:  '#2a4a8f',
  green:      '#2e7d32',
  greenLight: '#43a047',
  orange:     '#e65100',
  red:        '#c62828',
  white:      '#ffffff',
  gold:       '#c8a84b',
  text:       '#1a1a2e',
  sub:        '#4a5568',
};

/* ─── Env ────────────────────────────────────────────────────────────── */
const API_ROOT     = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)     || 'http://localhost:5100';
const API          = `${API_ROOT.replace(/\/$/, '')}/api`;
const UPLOADS_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_UPLOADS_BASE) || API_ROOT.replace(/\/$/, '');

function getBase() {
  return (typeof import.meta !== 'undefined' ? String(import.meta.env?.BASE_URL || '/') : '/').replace(/\/?$/, '/');
}

/* ─── Data helpers ───────────────────────────────────────────────────── */
function formatWebsite(w) { return w ? String(w).replace(/^https?:\/\//i, '').trim() : ''; }
function formatDob(y)     { return y == null || y === '' ? '-' : String(y); }

export function deriveSectionFromClass(cn) {
  if (!cn || cn === '-') return '-';
  const raw = String(cn).trim();
  const up  = raw.split(/[\s/–—-]/)[0].replace(/\s+/g, '').toUpperCase();
  if (/^N[1-3]$/.test(up)) return 'Nursery';
  if (/^P[1-6]$/.test(up)) return 'Primary Level';
  if (/^S[1-3]$/.test(up)) return 'O-Level';
  if (/^S[4-6]$/.test(up)) return 'A-Level';
  return raw;
}

export function mapRowToStudent(row) {
  const fullName = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
  const code     = row.code || row.student_code || row.student_uid || `ST-${row.id}`;
  const photoRel = row.photo_url || (row.student_photo ? `/uploads/student-profile-photos/${row.student_photo}` : null);
  const origin   = typeof window !== 'undefined' ? window.location.origin : '';
  const loc      = [row.sector, row.district, row.province].filter(Boolean).join(', ');
  return {
    id:           row.id,
    studentCode:  code,
    fullName,
    dob:          formatDob(row.birth_year),
    gender:       row.gender || '-',
    className:    row.class_name || '-',
    academicYear: row.academic_year || '-',
    school:       row.school_name || '-',
    photo:        photoRel ? `${UPLOADS_BASE}${photoRel}` : null,
    province:     row.province,
    district:     row.district,
    sector:       row.sector,
    school_id:    row.school_id,
    school_logo_full: row.logo_url ? `${UPLOADS_BASE}${row.logo_url}` : null,
    qrFallbackUrl:    `${origin}/online-service/dashboard?student=${encodeURIComponent(row.id)}`,
    phone:        row.school_phone ? String(row.school_phone).trim() : '',
    email:        row.school_email ? String(row.school_email).trim() : '',
    website:      formatWebsite(row.school_website || ''),
    postal_address: row.postal_address ? String(row.postal_address).trim() : '',
    addressSummary: [row.postal_address, loc].filter(Boolean).join(' · ') || '—',
  };
}

/* ══════════════════════════════════════════════════════════════════════
   IMAGE LOADER — fetch→blob→objectURL to avoid CORS canvas taint
══════════════════════════════════════════════════════════════════════ */
async function loadImageCORS(src) {
  if (!src) return null;
  try {
    const res  = await fetch(src, { mode: 'cors', cache: 'force-cache' });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
}

/* ══════════════════════════════════════════════════════════════════════
   CANVAS HELPERS
══════════════════════════════════════════════════════════════════════ */
function rRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ══════════════════════════════════════════════════════════════════════
   renderCardToCanvas  — pure canvas, no DOM capture
   All sections use explicit save/restore + globalAlpha reset.
══════════════════════════════════════════════════════════════════════ */
export async function renderCardToCanvas(student, template, photoImg, logoImg, footerImg, qrImage) {
  const W = CARD_PX.w * SCALE;
  const H = CARD_PX.h * SCALE;
  const s = SCALE;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  /* ── 1. Card shape clip ── */
  rRect(ctx, 0, 0, W, H, 18 * s);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save(); /* save-A: card clip */
  ctx.clip();

  /* ── 2. Side borders ── */
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, C.orange); og.addColorStop(1, '#ff8f00');
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, 7 * s, H);

  const rg = ctx.createLinearGradient(0, 0, 0, H);
  rg.addColorStop(0, C.red); rg.addColorStop(1, '#e53935');
  ctx.fillStyle = rg;
  ctx.fillRect(W - 7 * s, 0, 7 * s, H);

  /* ── 3. Gold hairlines ── */
  ctx.fillStyle = C.gold;
  ctx.fillRect(7 * s, 0, W - 14 * s, 3 * s);
  ctx.fillRect(7 * s, H - 3 * s, W - 14 * s, 3 * s);

  /* ── 4. School logo (top centre) ── */
  const logoSz = 64 * s;
  const logoCX = W / 2;
  const logoY  = 14 * s;

  if (logoImg) {
    ctx.save(); /* save-B: logo clip */
    rRect(ctx, logoCX - logoSz / 2, logoY, logoSz, logoSz, 8 * s);
    ctx.clip();
    ctx.drawImage(logoImg, logoCX - logoSz / 2, logoY, logoSz, logoSz);
    ctx.restore(); /* restore-B */
  } else {
    ctx.beginPath();
    ctx.arc(logoCX, logoY + logoSz / 2, logoSz / 2, 0, Math.PI * 2);
    ctx.fillStyle = C.navy; ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${9 * s}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SCHOOL', logoCX, logoY + logoSz / 2 + 3 * s);
  }

  /* ── 5. School name ── */
  ctx.globalAlpha = 1; /* RESET — always explicit before text */
  const schoolTitle = (template?.school_name || student.school || 'SCHOOL').toUpperCase();
  const nameY = logoY + logoSz + 14 * s;
  ctx.fillStyle = C.navy;
  ctx.font = `900 ${15 * s}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(schoolTitle, W / 2, nameY);

  /* ── 6. Contact lines ── */
  const cLines = [];
  const postal = template?.postal_address || student.postal_address;
  const ph     = template?.school_phone   || student.phone;
  const em     = template?.school_email   || student.email;
  if (postal) cLines.push(postal);
  if (ph)     cLines.push(ph);
  if (em)     cLines.push(em);
  const web = formatWebsite(template?.website || student.website) || 'www.wisdomschoolrwanda.rw';
  cLines.push(web);

  ctx.globalAlpha = 1;
  ctx.fillStyle = C.sub;
  ctx.font = `500 ${8 * s}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  const lineH = 13 * s;
  let cY = nameY + 14 * s;
  cLines.forEach(line => { ctx.fillText(line, W / 2, cY); cY += lineH; });

  /* ── 7. Arc wings ── */
  const photoZoneTop = cY + 8 * s;
  const circleR      = 53 * s;
  const circleCX     = W / 2;
  const circleCY     = photoZoneTop + 6 * s + circleR;
  const wingEndY     = circleCY + 36 * s;

  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.navy;
  ctx.lineCap     = 'round';

  /* Primary LEFT — shallow curve to side edge */
  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.moveTo(circleCX - circleR, circleCY);
  ctx.quadraticCurveTo(7 * s + 48 * s, circleCY + 10 * s, 7 * s, wingEndY);
  ctx.stroke();

  /* Primary RIGHT — shallow curve to side edge */
  ctx.beginPath();
  ctx.moveTo(circleCX + circleR, circleCY);
  ctx.quadraticCurveTo(W - 7 * s - 48 * s, circleCY + 10 * s, W - 7 * s, wingEndY);
  ctx.stroke();

  /* ── RESET alpha before EVERY subsequent draw ── */
  ctx.globalAlpha = 1;

  /* ── 8. Photo circle ── */
  const innerR = circleR - 4 * s;

  /* Navy ring */
  ctx.beginPath();
  ctx.arc(circleCX, circleCY, circleR, 0, Math.PI * 2);
  ctx.fillStyle = C.navy;
  ctx.fill();

  /* Photo or placeholder — clipped to inner circle */
  ctx.save(); /* save-C: photo clip */
  ctx.beginPath();
  ctx.arc(circleCX, circleCY, innerR, 0, Math.PI * 2);
  ctx.clip();

  ctx.globalAlpha = 1;
  if (photoImg) {
    const iw    = photoImg.naturalWidth  || photoImg.width  || 1;
    const ih    = photoImg.naturalHeight || photoImg.height || 1;
    const d     = innerR * 2;
    const ratio = Math.max(d / iw, d / ih);
    const dw    = iw * ratio;
    const dh    = ih * ratio;
    ctx.drawImage(photoImg, circleCX - dw / 2, circleCY - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = '#dde4f0';
    ctx.fillRect(circleCX - innerR, circleCY - innerR, innerR * 2, innerR * 2);
    ctx.fillStyle = '#7b92b8';
    ctx.beginPath();
    ctx.arc(circleCX, circleCY - innerR * 0.18, innerR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(circleCX, circleCY + innerR * 0.65, innerR * 0.55, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore(); /* restore-C */

  /* ── 9. Info fields ── */
  ctx.globalAlpha = 1; /* RESET */

  const infoTopY = photoZoneTop + 6 * s + circleR * 2 + 16 * s;

  const infoRows = [
    { label: 'Name',          value: student.fullName,                                bold: true  },
    { label: 'ID Number',     value: student.studentCode,                             bold: false },
    { label: 'Section',       value: deriveSectionFromClass(student.className),       bold: false },
    { label: 'Academic year', value: template?.academic_year || student.academicYear, bold: false },
  ];

  const rowH     = 17 * s;
  const fontSize = 10 * s;
  let   infoY    = infoTopY;

  ctx.globalAlpha = 1;
  infoRows.forEach(({ label, value, bold }) => {
    const lText = `${label}: `;
    ctx.font      = `800 ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    const lw      = ctx.measureText(lText).width;
    ctx.font      = `${bold ? 900 : 700} ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    const vw      = ctx.measureText(value).width;
    const startX  = W / 2 - (lw + vw) / 2;

    ctx.fillStyle = C.navy;
    ctx.font      = `800 ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(lText, startX, infoY);

    ctx.fillStyle = bold ? C.navy : C.text;
    ctx.font      = `${bold ? 900 : 700} ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
    ctx.fillText(value, startX + lw, infoY);

    infoY += rowH;
  });

  /* ── 10. QR CODE — fixed draw order ── */
  ctx.globalAlpha = 1; /* CRITICAL RESET */

  const qrPx  = 74 * s;
  const qrX   = W / 2 - qrPx / 2;
  const qrY   = infoY + 6 * s;
  const pad   = 5 * s;
  const boxR  = 9 * s;

  /* STEP A: Fill white box background FIRST */
  ctx.fillStyle = '#ffffff';
  rRect(ctx, qrX - pad, qrY - pad, qrPx + pad * 2, qrPx + pad * 2, boxR);
  ctx.fill();

  /* STEP B: Draw real QR image ON TOP of white box (scannable) */
  if (qrImage) {
    ctx.drawImage(qrImage, qrX, qrY, qrPx, qrPx);
  } else {
    // Do not draw pseudo QR in exports; better show explicit unavailable state.
    ctx.fillStyle = '#b91c1c';
    ctx.font = `700 ${8 * s}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('QR unavailable', W / 2, qrY + qrPx / 2);
  }

  /* STEP C: Draw navy border LAST (on top of cells at the very edge only) */
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.navy;
  ctx.lineWidth   = 2 * s;
  rRect(ctx, qrX - pad, qrY - pad, qrPx + pad * 2, qrPx + pad * 2, boxR);
  ctx.stroke();

  /* "Scan for student profile" — darker/larger so it stays readable after export compression */
  const scanLabelY = qrY + qrPx + pad + 9 * s;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(W / 2 - 62 * s, scanLabelY - 7 * s, 124 * s, 10 * s);
  ctx.fillStyle   = '#4b5563';
  ctx.font        = `700 ${7.6 * s}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign   = 'center';
  ctx.fillText('Scan for student profile', W / 2, scanLabelY);

  /* ── 11. Green footer ── */
  ctx.globalAlpha = 1;
  const footerH = 56 * s;
  const footerY = H - footerH - 3 * s;
  const gg = ctx.createLinearGradient(0, 0, W, 0);
  gg.addColorStop(0, C.green); gg.addColorStop(1, C.greenLight);
  ctx.fillStyle = gg;
  ctx.fillRect(7 * s, footerY, W - 14 * s, footerH);

  if (footerImg) {
    const fh   = 44 * s;
    const fAsp = (footerImg.naturalWidth || 1) / (footerImg.naturalHeight || 1);
    const fw   = Math.min(fh * fAsp, (W - 28 * s) * 0.9);
    ctx.drawImage(footerImg, W / 2 - fw / 2, footerY + (footerH - fh) / 2, fw, fh);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.font      = `900 ${13 * s}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Babyeyi · Student ID', W / 2, footerY + footerH / 2 + 5 * s);
  }

  ctx.restore(); /* restore-A: card clip */
  return canvas;
}

/* ══════════════════════════════════════════════════════════════════════
   React helper components
══════════════════════════════════════════════════════════════════════ */
function SchoolLogoSVG({ px = 64 }) {
  return (
    <svg width={px} height={px} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="47" fill={C.navy} stroke={C.gold} strokeWidth="2.5"/>
      <circle cx="50" cy="50" r="39" fill="#fff"/>
      <rect x="24" y="44" width="24" height="18" rx="2" fill={C.navy}/>
      <rect x="52" y="44" width="24" height="18" rx="2" fill={C.navyLight}/>
      <rect x="47" y="30" width="6" height="14" rx="2" fill={C.gold}/>
      <ellipse cx="50" cy="28" rx="5" ry="7" fill="#f5a623"/>
    </svg>
  );
}

function CardLogoImg({ maxWidth = 220, height = 44 }) {
  const [i, setI] = useState(0);
  const srcs = useMemo(() => {
    const b = getBase();
    return [`${b}cardlogo-removebg-preview.png`, `${b}cardlogo.png`];
  }, []);
  return (
    <img src={srcs[Math.min(i, srcs.length - 1)]} alt=""
      style={{ maxWidth, width:'100%', height, objectFit:'contain', objectPosition:'center', display:'block' }}
      onError={() => setI(x => x + 1)}/>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   IDCardT2 — React preview (DOM version for on-screen display)
   Visual matches exactly — export uses renderCardToCanvas above
══════════════════════════════════════════════════════════════════════ */
export function IDCardT2({ student, template, scale = 1 }) {
  const schoolTitle   = (template?.school_name || student.school || 'SCHOOL').toUpperCase();
  const schoolLogoSrc = template?.school_logo_url ? `${UPLOADS_BASE}${template.school_logo_url}` : student.school_logo_full;
  const qrImg         = template?.qr_data_url;
  const qrFallback    = student.qrFallbackUrl || '';
  const web           = formatWebsite(template?.website || student.website) || 'www.wisdomschoolrwanda.rw';

  const cLines = [];
  const postal = template?.postal_address || student.postal_address;
  const ph     = template?.school_phone   || student.phone;
  const em     = template?.school_email   || student.email;
  if (postal) cLines.push(postal);
  if (ph)     cLines.push(ph);
  if (em)     cLines.push(em);
  if (!cLines.length && student.addressSummary !== '—') cLines.push(student.addressSummary);

  const infoRows = [
    { label:'Name',          value:student.fullName,                                bold:true  },
    { label:'ID Number',     value:student.studentCode,                             bold:false },
    { label:'Section',       value:deriveSectionFromClass(student.className),       bold:false },
    { label:'Academic year', value:template?.academic_year || student.academicYear, bold:false },
  ];

  return (
    <div data-card-t2 style={{
      width:CARD_PX.w*scale, height:CARD_PX.h*scale,
      transform:`scale(${scale})`, transformOrigin:'top left',
      position:'relative', borderRadius:18, overflow:'hidden',
      background:'#fff', fontFamily:"'Segoe UI',system-ui,sans-serif",
      boxShadow:scale>=1?'0 24px 72px rgba(26,53,114,0.28),0 4px 16px rgba(0,0,0,0.15)':'none',
      flexShrink:0,
    }}>
      {/* Side borders */}
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:7,background:`linear-gradient(180deg,${C.orange},#ff8f00)`,zIndex:5,borderRadius:'18px 0 0 18px'}}/>
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:7,background:`linear-gradient(180deg,${C.red},#e53935)`,zIndex:5,borderRadius:'0 18px 18px 0'}}/>
      <div style={{position:'absolute',top:0,left:7,right:7,height:3,background:C.gold,zIndex:5}}/>
      <div style={{position:'absolute',bottom:0,left:7,right:7,height:3,background:C.gold,zIndex:5}}/>

      {/* Watermark */}
      <div style={{position:'absolute',top:'35%',left:'50%',transform:'translate(-50%,-50%)',opacity:0.035,zIndex:1,pointerEvents:'none'}}>
        {schoolLogoSrc ? <img src={schoolLogoSrc} alt="" style={{width:200,height:200,objectFit:'contain'}}/> : <SchoolLogoSVG px={200}/>}
      </div>

      <div style={{position:'relative',display:'flex',flexDirection:'column',alignItems:'center',height:'100%',zIndex:2,padding:'0 14px'}}>
        {/* School logo */}
        <div style={{width:'100%',display:'flex',justifyContent:'center',paddingTop:14,marginBottom:6}}>
          {schoolLogoSrc ? <img src={schoolLogoSrc} alt="" style={{width:64,height:64,objectFit:'contain',borderRadius:8}}/> : <SchoolLogoSVG px={64}/>}
        </div>

        {/* School name */}
        <div style={{fontSize:15,fontWeight:900,color:C.navy,textAlign:'center',lineHeight:1.25,letterSpacing:0.2,marginBottom:5}}>{schoolTitle}</div>

        {/* Contact lines */}
        <div style={{fontSize:8,color:C.sub,textAlign:'center',lineHeight:1.65,marginBottom:4}}>
          {cLines.map((l,i)=><div key={i}>{l}</div>)}
          {web && <div>{web}</div>}
        </div>

        {/* Photo + wings */}
        <div style={{position:'relative',marginLeft:-7,marginRight:-7,width:'calc(100% + 14px)',height:118,marginTop:4,flexShrink:0}}>
          <svg viewBox="0 0 306 240" width="100%" height="240"
            preserveAspectRatio="none"
            style={{position:'absolute',left:0,top:0,pointerEvents:'none',zIndex:1,overflow:'visible'}}>
            <path d="M 102 57 Q 50 67 0 93" stroke={C.navy} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            <path d="M 204 57 Q 256 67 306 93" stroke={C.navy} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          </svg>

          {/* Photo circle */}
          <div style={{position:'absolute',left:'50%',top:6,transform:'translateX(-50%)',width:106,height:106,borderRadius:'50%',border:`4px solid ${C.navy}`,overflow:'hidden',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',zIndex:3,boxSizing:'border-box'}}>
            {student.photo ? (
              <img src={student.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}}/>
            ) : (
              <div style={{textAlign:'center'}}>
                <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                <div style={{fontSize:7,color:C.navy,fontWeight:700,marginTop:2}}>NO PHOTO</div>
              </div>
            )}
          </div>
        </div>

        {/* Info rows */}
        <div style={{width:'100%',paddingLeft:12,paddingRight:12,paddingTop:10,paddingBottom:4,zIndex:4,position:'relative',flexShrink:0}}>
          
          {infoRows.map(({label,value,bold})=>(
            <div key={label} style={{fontSize:9.5,color:C.text,marginBottom:5,lineHeight:1.35,textAlign:'center'}}>
              <span style={{fontWeight:800,color:C.navy}}>{label}: </span>
              <span style={{fontWeight:bold?900:700,color:bold?C.navy:C.text}}>{value}</span>
            </div>
          ))}
        </div>

        {/* QR */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:1,marginTop:'auto',marginBottom:6,flexShrink:0}}>
          <div style={{borderRadius:8,border:`2px solid ${C.navy}`,padding:4,background:'#fff',boxShadow:'0 2px 10px rgba(26,53,114,0.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {qrImg ? (
              <img src={qrImg} alt="QR" style={{ width: 78, height: 78, display: 'block', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 78, height: 78, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontSize: 8, fontWeight: 700 }}>
                QR unavailable
              </div>
            )}
          </div>
          <span style={{fontSize:7,color:C.sub,letterSpacing:0.4}}>Scan for student profile</span>
        </div>

        {/* Green footer */}
        <div style={{alignSelf:'stretch',marginLeft:-14,marginRight:-14,width:'calc(100% + 28px)',boxSizing:'border-box',borderTopLeftRadius:14,borderTopRightRadius:14,background:`linear-gradient(90deg,${C.green},${C.greenLight})`,padding:'12px 10px 14px',marginBottom:3,display:'flex',alignItems:'center',justifyContent:'center',minHeight:58,marginTop:'auto',flexShrink:0,zIndex:4}}>
          <div style={{width:'100%',maxWidth:280,display:'flex',justifyContent:'center',alignItems:'center'}}>
            <CardLogoImg maxWidth={260} height={44}/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   useCardExport — pre-loads images, exposes instant download fns
══════════════════════════════════════════════════════════════════════ */
export function useCardExport(student, template) {
  const [ready, setReady] = useState(false);
  const refs = useRef({ photo: null, logo: null, footer: null, qr: null });

  useEffect(() => {
    if (!student) return;
    setReady(false);
    const logoSrc   = template?.school_logo_url ? `${UPLOADS_BASE}${template.school_logo_url}` : student.school_logo_full;
    const footerSrc = `${getBase()}cardlogo-removebg-preview.png`;

    Promise.all([
      student.photo ? loadImageCORS(student.photo) : Promise.resolve(null),
      logoSrc       ? loadImageCORS(logoSrc)       : Promise.resolve(null),
      loadImageCORS(footerSrc),
      template?.qr_data_url ? loadImageCORS(template.qr_data_url) : Promise.resolve(null),
    ]).then(([photo, logo, footer, qr]) => {
      refs.current = { photo, logo, footer, qr };
      setReady(true);
    });
  }, [student?.id, student?.photo, template?.school_logo_url, template?.qr_data_url]);

  const getCanvas = useCallback(() =>
    renderCardToCanvas(student, template, refs.current.photo, refs.current.logo, refs.current.footer, refs.current.qr),
  [student, template]);

  const downloadPNG = useCallback(async () => {
    const canvas = await getCanvas();
    const blob   = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ID-${student.studentCode}.png`;
    a.click(); URL.revokeObjectURL(a.href);
  }, [getCanvas, student?.studentCode]);

  const downloadJPEG = useCallback(async () => {
    const canvas = await getCanvas();
    const blob   = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ID-${student.studentCode}.jpg`;
    a.click(); URL.revokeObjectURL(a.href);
  }, [getCanvas, student?.studentCode]);

  const downloadPDF = useCallback(async () => {
    const canvas = await getCanvas();
    const { jsPDF } = await import('jspdf');
    const pdfH   = (85.6 * CARD_PX.h) / CARD_PX.w;
    const pdf    = new jsPDF({ orientation:'portrait', unit:'mm', format:[85.6, pdfH] });
    const blob   = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.97));
    const url    = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    pdf.addImage(url, 'JPEG', 0, 0, 85.6, pdfH);
    pdf.save(`ID-${student.studentCode}.pdf`);
  }, [getCanvas, student?.studentCode]);

  return { ready, downloadPNG, downloadJPEG, downloadPDF, getCanvas };
}

/* ══════════════════════════════════════════════════════════════════════
   bulkDownloadZip  (npm i jszip)
══════════════════════════════════════════════════════════════════════ */
export async function bulkDownloadZip(students, template, onProgress) {
  const JSZip = (await import('jszip')).default;
  const zip   = new JSZip();
  const folder = zip.folder('student-cards');
  const BATCH = 4;

  const logoSrc   = template?.school_logo_url ? `${UPLOADS_BASE}${template.school_logo_url}` : students[0]?.school_logo_full;
  const footerSrc = `${getBase()}cardlogo-removebg-preview.png`;
  const [logoImg, footerImg] = await Promise.all([
    logoSrc ? loadImageCORS(logoSrc) : Promise.resolve(null),
    loadImageCORS(footerSrc),
  ]);

  let done = 0;
  for (let i = 0; i < students.length; i += BATCH) {
    await Promise.all(students.slice(i, i + BATCH).map(async student => {
      // Load each student's real template QR so ZIP exports remain scannable.
      let perStudentTemplate = template;
      try {
        const res = await fetch(`${API}/student-cards/${student.id}/template`, { credentials: 'include' });
        const j = await res.json();
        if (j?.success && j.data) perStudentTemplate = j.data;
      } catch (_) {
        // keep shared template fallback
      }
      const photoImg = student.photo ? await loadImageCORS(student.photo) : null;
      const qrImg    = perStudentTemplate?.qr_data_url ? await loadImageCORS(perStudentTemplate.qr_data_url) : null;
      const canvas   = await renderCardToCanvas(student, perStudentTemplate, photoImg, logoImg, footerImg, qrImg);
      const blob     = await new Promise(r => canvas.toBlob(r, 'image/png'));
      folder.file(`${student.studentCode}_${student.fullName.replace(/\s+/g,'_')}.png`, await blob.arrayBuffer());
      onProgress?.(++done, students.length);
    }));
  }

  const zipBlob = await zip.generateAsync({ type:'blob', compression:'DEFLATE', compressionOptions:{ level:1 } });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlob);
  a.download = `student-cards-${new Date().toISOString().slice(0,10)}.zip`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ══════════════════════════════════════════════════════════════════════
   CardModal
══════════════════════════════════════════════════════════════════════ */
export function CardModal({ student, onClose }) {
  const [template,   setTemplate]   = useState(null);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError,   setTplError]   = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [busyFmt,    setBusyFmt]    = useState(null);

  useEffect(() => {
    if (!student?.id) return;
    let cancelled = false;
    setTplLoading(true); setTplError(null); setTemplate(null);
    fetch(`${API}/student-cards/${student.id}/template`, { credentials:'include' })
      .then(r => r.json())
      .then(j => { if (cancelled) return; if (!j.success) throw new Error(j.message); setTemplate(j.data); })
      .catch(e => { if (!cancelled) setTplError(e.message || 'Failed'); })
      .finally(() => { if (!cancelled) setTplLoading(false); });
    return () => { cancelled = true; };
  }, [student?.id]);

  const { ready, downloadPNG, downloadJPEG, downloadPDF } = useCardExport(student, template);

  const run = async (fmt, fn) => { setBusy(true); setBusyFmt(fmt); try { await fn(); } finally { setBusy(false); setBusyFmt(null); } };

  const dlServer = async () => {
    setBusy(true); setBusyFmt('SRV');
    try {
      const res = await fetch(`${API}/student-cards/${student.id}/pdf`, { credentials:'include' });
      if (!res.ok) throw new Error('Server PDF failed');
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `ID-${student.studentCode}.pdf`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); setBusyFmt(null); }
  };

  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.82)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{background:'#0d1b38',borderRadius:24,padding:24,width:'100%',maxWidth:440,maxHeight:'96dvh',overflowY:'auto',border:'1px solid rgba(200,168,75,0.3)',boxShadow:'0 40px 120px rgba(0,0,0,0.6)'}} onClick={e=>e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
          <div>
            <p style={{color:C.gold,fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:2,margin:0}}>Portrait template</p>
            <h3 style={{color:'#fff',fontSize:17,fontWeight:900,margin:'4px 0 0'}}>{student.fullName}</h3>
          </div>
          <button type="button" onClick={onClose} style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,0.2)',background:'transparent',color:'#fff',fontSize:18,cursor:'pointer'}}>×</button>
        </div>

        {tplLoading && <p style={{color:'rgba(255,255,255,0.6)',fontSize:13}}>Loading card data…</p>}
        {tplError   && <p style={{color:'#f87171',fontSize:13}}>{tplError}</p>}
        {!ready && !tplLoading && <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,marginBottom:8}}>⏳ Pre-loading images…</p>}
        {ready  && <p style={{color:'#4ade80',fontSize:11,marginBottom:8}}>✓ Ready — exports are instant</p>}

        <div style={{display:'flex',justifyContent:'center',overflowX:'auto',paddingBottom:8}}>
          <div style={{width:CARD_PX.w,minHeight:CARD_PX.h}}>
            <IDCardT2 student={student} template={template} scale={1}/>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:16}}>
          {[
            {label:'PNG',         fn:()=>run('PNG',  downloadPNG),  fmt:'PNG',  bg:'#1a3572'},
            {label:'JPEG',        fn:()=>run('JPEG', downloadJPEG), fmt:'JPEG', bg:'#1e5128'},
            {label:'PDF (image)', fn:()=>run('PDF',  downloadPDF),  fmt:'PDF',  bg:'#7f1d1d'},
            {label:'PDF (server)',fn:dlServer,                       fmt:'SRV',  bg:'transparent',outline:true},
          ].map(({label,fn,fmt,bg,outline})=>(
            <button key={fmt} type="button" onClick={fn}
              disabled={busy||tplLoading||(!ready&&fmt!=='SRV')}
              style={{height:40,borderRadius:10,border:outline?`1px solid ${C.gold}`:'none',background:outline?'transparent':bg,color:outline?C.gold:'#fff',fontWeight:800,fontSize:10,letterSpacing:1,cursor:'pointer',opacity:(busy&&busyFmt!==fmt)||(!ready&&fmt!=='SRV')?0.45:1}}>
              {busy&&busyFmt===fmt?'…':`⬇ ${label}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SchoolStudentCardTemplate2 — full admin page
══════════════════════════════════════════════════════════════════════ */
export default function SchoolStudentCardTemplate2() {
  const [students,    setStudents]    = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [filters,     setFilters]     = useState({province:'',district:'',sector:'',school_id:'',class_name:''});
  const [provinces,   setProvinces]   = useState([]);
  const [districts,   setDistricts]   = useState([]);
  const [sectors,     setSectors]     = useState([]);
  const [schoolOpts,  setSchoolOpts]  = useState([]);
  const [classOpts,   setClassOpts]   = useState([]);
  const [selected,    setSelected]    = useState([]);
  const [viewStudent, setViewStudent] = useState(null);
  const [bulkBusy,    setBulkBusy]    = useState(false);
  const [bulkProg,    setBulkProg]    = useState({done:0,total:0});
  const [notif,       setNotif]       = useState(null);

  const showNotif = (msg, type='success') => { setNotif({msg,type}); setTimeout(()=>setNotif(null),5000); };

  useEffect(()=>{ fetch(`${API}/locations/provinces`,{credentials:'include'}).then(r=>r.json()).then(j=>{if(j.success)setProvinces(j.data||[]);}).catch(()=>{}); },[]);
  useEffect(()=>{ if(!filters.province){setDistricts([]);return;} fetch(`${API}/locations/districts?province=${encodeURIComponent(filters.province)}`,{credentials:'include'}).then(r=>r.json()).then(j=>{if(j.success)setDistricts(j.data||[]);}).catch(()=>{}); },[filters.province]);
  useEffect(()=>{ if(!filters.province||!filters.district){setSectors([]);return;} const p=new URLSearchParams({province:filters.province,district:filters.district}); fetch(`${API}/locations/sectors?${p}`,{credentials:'include'}).then(r=>r.json()).then(j=>{if(j.success)setSectors(j.data||[]);}).catch(()=>{}); },[filters.province,filters.district]);
  useEffect(()=>{ const p=new URLSearchParams(); if(filters.province)p.set('province',filters.province); if(filters.district)p.set('district',filters.district); if(filters.sector)p.set('sector',filters.sector); fetch(`${API}/student-cards/filters/schools?${p}`,{credentials:'include'}).then(r=>r.json()).then(j=>{if(j.success)setSchoolOpts(j.data||[]);}).catch(()=>{}); },[filters.province,filters.district,filters.sector]);
  useEffect(()=>{ if(!filters.school_id){setClassOpts([]);return;} fetch(`${API}/student-cards/filters/classes?school_id=${encodeURIComponent(filters.school_id)}`,{credentials:'include'}).then(r=>r.json()).then(j=>{if(j.success)setClassOpts(j.data||[]);}).catch(()=>{}); },[filters.school_id]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if(filters.province)   p.set('province',   filters.province);
      if(filters.district)   p.set('district',   filters.district);
      if(filters.sector)     p.set('sector',     filters.sector);
      if(filters.school_id)  p.set('school_id',  filters.school_id);
      if(filters.class_name) p.set('class_name', filters.class_name);
      if(search.trim())      p.set('q',          search.trim());
      p.set('limit','500');
      const res  = await fetch(`${API}/student-cards/students?${p}`,{credentials:'include'});
      const json = await res.json();
      if(!json.success) throw new Error(json.message||'Failed');
      setStudents((json.data||[]).map(mapRowToStudent));
      setSelected([]);
    } catch(e) { showNotif(e.message||'Load failed','error'); setStudents([]); }
    finally { setLoading(false); }
  }, [filters, search]);

  useEffect(()=>{ loadStudents(); },[]);// eslint-disable-line

  const setF = key => e => {
    const val = e.target.value;
    setFilters(prev=>{
      const next={...prev,[key]:val};
      if(key==='province'){next.district='';next.sector='';next.school_id='';next.class_name='';}
      if(key==='district'){next.sector='';next.school_id='';next.class_name='';}
      if(key==='sector')  {next.school_id='';next.class_name='';}
      if(key==='school_id'){next.class_name='';}
      return next;
    });
  };

  const allSel    = students.length>0 && selected.length===students.length;
  const toggleAll = ()=>setSelected(allSel?[]:students.map(s=>s.id));
  const toggleOne = id=>setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);

  const handleBulkZip = async () => {
    const targets = students.filter(s=>selected.length===0||selected.includes(s.id));
    if(!targets.length) return;
    setBulkBusy(true); setBulkProg({done:0,total:targets.length});
    try {
      await bulkDownloadZip(targets, null, (done,total)=>setBulkProg({done,total}));
      showNotif(`✓ Downloaded ${targets.length} cards as ZIP`);
    } catch(e) { showNotif(e.message||'ZIP failed','error'); }
    finally { setBulkBusy(false); setBulkProg({done:0,total:0}); }
  };

  const S = {
    page:  {minHeight:'100vh',background:'linear-gradient(165deg,#040d1e 0%,#071635 55%,#040d1e 100%)',color:'#fff',fontFamily:"'Segoe UI',system-ui,sans-serif"},
    topbar:{background:'rgba(10,22,56,0.92)',borderBottom:'1px solid rgba(200,168,75,0.22)',padding:'0 22px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:200,backdropFilter:'blur(12px)'},
    wrap:  {maxWidth:1280,margin:'0 auto',padding:'22px 16px'},
    panel: {background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,padding:18},
    sel:   {height:38,borderRadius:10,border:'1px solid rgba(255,255,255,0.14)',background:'rgba(255,255,255,0.06)',color:'#fff',padding:'0 12px',fontSize:12,outline:'none',cursor:'pointer',minWidth:150},
    btn:   (bg,col='#fff')=>({height:38,borderRadius:10,border:'none',background:bg,color:col,fontWeight:700,fontSize:11,letterSpacing:0.6,textTransform:'uppercase',cursor:'pointer',padding:'0 16px',display:'inline-flex',alignItems:'center',gap:6}),
    th:    {padding:'10px 14px',fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:1.5,color:'rgba(255,255,255,0.38)',borderBottom:'1px solid rgba(255,255,255,0.07)',whiteSpace:'nowrap'},
    td:    {padding:'12px 14px',fontSize:12,borderBottom:'1px solid rgba(255,255,255,0.05)',verticalAlign:'middle'},
  };

  return (
    <div style={S.page}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:rgba(255,255,255,0.03)}::-webkit-scrollbar-thumb{background:rgba(200,168,75,0.3);border-radius:4px}select option{background:#0d1b38;color:#fff}`}</style>

      {notif&&<div style={{position:'fixed',top:14,right:14,zIndex:2000,background:notif.type==='error'?'#7f1d1d':'#14532d',border:`1px solid ${notif.type==='error'?'#ef4444':'#22c55e'}`,borderRadius:12,padding:'12px 20px',color:'#fff',fontSize:13,fontWeight:600,maxWidth:380,boxShadow:'0 8px 32px rgba(0,0,0,0.45)'}}>{notif.msg}</div>}

      {viewStudent&&<CardModal student={viewStudent} onClose={()=>setViewStudent(null)}/>}

      <div style={S.topbar}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${C.navy},${C.navyLight})`,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{fontSize:18}}>🪪</span></div>
          <div>
            <div style={{fontSize:8,color:C.gold,fontWeight:800,textTransform:'uppercase',letterSpacing:2}}>Super Admin</div>
            <div style={{fontSize:14,fontWeight:900,letterSpacing:-0.3}}>Student Card · Portrait Template 2</div>
          </div>
        </div>
        <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>Canvas export · QR fixed · ZIP bulk</div>
      </div>

      <div style={S.wrap}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:22}}>
          {[
            {label:'Students loaded',val:students.length,                      icon:'👥',a:'#1a3572'},
            {label:'With photos',    val:students.filter(x=>x.photo).length,   icon:'📷',a:'#1e5128'},
            {label:'Schools',        val:schoolOpts.length,                     icon:'🏫',a:'#7c3aed'},
            {label:'For ZIP',        val:selected.length||students.length,      icon:'⬇', a:'#c2410c'},
          ].map(({label,val,icon,a})=>(
            <div key={label} style={{background:`linear-gradient(135deg,${a}45,${a}18)`,border:`1px solid ${a}55`,borderRadius:14,padding:'16px 18px'}}>
              <div style={{fontSize:22,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:26,fontWeight:900}}>{val}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{...S.panel,marginBottom:18}}>
          <div style={{fontSize:10,color:C.gold,fontWeight:800,textTransform:'uppercase',letterSpacing:2,marginBottom:12}}>Location &amp; school filters</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            <select value={filters.province}   onChange={setF('province')}   style={{...S.sel,minWidth:170}}><option value="">All provinces</option>{provinces.map(x=><option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.district}   onChange={setF('district')}   disabled={!filters.province}   style={{...S.sel,minWidth:150,opacity:filters.province?1:0.55}}><option value="">All districts</option>{districts.map(x=><option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.sector}     onChange={setF('sector')}     disabled={!filters.district}   style={{...S.sel,minWidth:150,opacity:filters.district?1:0.55}}><option value="">All sectors</option>{sectors.map(x=><option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.school_id}  onChange={setF('school_id')}  style={{...S.sel,minWidth:220}}><option value="">All schools</option>{schoolOpts.map(sc=><option key={sc.id} value={String(sc.id)}>{sc.school_name}</option>)}</select>
            <select value={filters.class_name} onChange={setF('class_name')} disabled={!filters.school_id} style={{...S.sel,minWidth:140,opacity:filters.school_id?1:0.55}}><option value="">All classes</option>{classOpts.map(c=><option key={c} value={c}>{c}</option>)}</select>
            <button type="button" onClick={()=>setFilters({province:'',district:'',sector:'',school_id:'',class_name:''})} style={S.btn('rgba(255,255,255,0.08)')}>Clear</button>
          </div>
        </div>

        {/* Search + actions */}
        <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',marginBottom:16}}>
          <div style={{position:'relative',flex:1,minWidth:220}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',opacity:0.35}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadStudents()} placeholder="Search name or student code…" style={{...S.sel,width:'100%',paddingLeft:36,height:40,boxSizing:'border-box'}}/>
          </div>
          <button type="button" onClick={loadStudents} disabled={loading} style={S.btn(`linear-gradient(135deg,${C.navy},${C.navyDark})`)}>{loading?'Loading…':'Apply filters'}</button>

          {students.length>0&&(
            <button type="button" onClick={handleBulkZip} disabled={bulkBusy}
              style={{...S.btn(`linear-gradient(135deg,${C.green},${C.greenLight})`),minWidth:190}}>
              {bulkBusy?`${bulkProg.done}/${bulkProg.total} rendering…`:`⬇ ZIP ${selected.length>0?selected.length:students.length} cards`}
            </button>
          )}

          {selected.length>0&&<>
            <span style={{fontSize:11,color:C.gold,fontWeight:700}}>{selected.length} selected</span>
            <button type="button" onClick={()=>setSelected([])} style={S.btn('rgba(255,255,255,0.08)')}>Clear sel.</button>
          </>}
        </div>

        {/* Progress bar */}
        {bulkBusy&&bulkProg.total>0&&(
          <div style={{marginBottom:16}}>
            <div style={{height:6,borderRadius:4,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:4,background:`linear-gradient(90deg,${C.green},${C.greenLight})`,width:`${Math.round(bulkProg.done/bulkProg.total*100)}%`,transition:'width 0.2s'}}/>
            </div>
            <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:4}}>Rendering {bulkProg.done}/{bulkProg.total} cards (4 in parallel)</p>
          </div>
        )}

        {/* Table */}
        <div style={{...S.panel,overflowX:'auto'}}>
          <h2 style={{fontSize:18,fontWeight:900,margin:'0 0 14px'}}>Portrait ID cards <span style={{fontSize:12,color:'rgba(255,255,255,0.35)',fontWeight:500,marginLeft:10}}>({students.length} loaded)</span></h2>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={S.th}><input type="checkbox" checked={allSel} onChange={toggleAll} style={{cursor:'pointer',accentColor:C.gold}}/></th>
                <th style={S.th}>Photo</th><th style={S.th}>Student</th><th style={S.th}>Class</th><th style={S.th}>School</th>
                <th style={{...S.th,textAlign:'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length===0?(
                <tr><td colSpan={6} style={{...S.td,textAlign:'center',padding:48,color:'rgba(255,255,255,0.3)'}}>{loading?'Loading…':'No students. Adjust filters and click Apply.'}</td></tr>
              ):students.map(st=>(
                <tr key={st.id} style={{background:selected.includes(st.id)?'rgba(200,168,75,0.07)':'transparent'}}>
                  <td style={S.td}><input type="checkbox" checked={selected.includes(st.id)} onChange={()=>toggleOne(st.id)} style={{cursor:'pointer',accentColor:C.gold}}/></td>
                  <td style={S.td}>
                    <div style={{width:40,height:50,borderRadius:8,border:`2px solid ${C.navy}`,overflow:'hidden',background:'#1a2a45',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      {st.photo?<img src={st.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<span style={{opacity:0.4}}>👤</span>}
                    </div>
                  </td>
                  <td style={S.td}>
                    <p style={{fontWeight:800,color:'#fff',margin:0}}>{st.fullName}</p>
                    <p style={{fontSize:10,color:C.gold,margin:'4px 0 0',fontFamily:'ui-monospace,monospace'}}>{st.studentCode}</p>
                  </td>
                  <td style={S.td}><span style={{display:'inline-block',padding:'4px 10px',borderRadius:8,background:'rgba(26,53,114,0.45)',border:`1px solid ${C.navy}`,fontSize:11,fontWeight:800,color:'#93c5fd'}}>{st.className}</span></td>
                  <td style={S.td}>
                    <div style={{fontSize:12,color:'rgba(255,255,255,0.55)'}}>{st.school}</div>
                    <div style={{fontSize:9,color:'rgba(255,255,255,0.28)',marginTop:4,maxWidth:280}}>{st.addressSummary}</div>
                  </td>
                  <td style={{...S.td,textAlign:'right'}}>
                    <button type="button" onClick={()=>setViewStudent(st)} style={S.btn(C.navy)}>View card</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Preview grid */}
        {students.length>0&&(
          <div style={{marginTop:28}}>
            <h3 style={{fontSize:16,fontWeight:900,marginBottom:14}}>Preview (first 6)</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:18}}>
              {students.slice(0,6).map(st=>(
                <button key={st.id} type="button" onClick={()=>setViewStudent(st)}
                  style={{cursor:'pointer',borderRadius:16,overflow:'hidden',border:'none',padding:0,textAlign:'left',background:'transparent',boxShadow:'0 8px 32px rgba(0,0,0,0.35)'}}>
                  <div style={{display:'flex',justifyContent:'center',height:272,overflow:'hidden',background:'rgba(0,0,0,0.12)',borderRadius:'16px 16px 0 0',pointerEvents:'none'}}>
                    <div style={{transform:'scale(0.52)',transformOrigin:'top center'}}>
                      <IDCardT2 student={st} template={null} scale={1}/>
                    </div>
                  </div>
                  <div style={{background:'rgba(26,53,114,0.35)',border:'1px solid rgba(200,168,75,0.12)',borderTop:'none',borderRadius:'0 0 16px 16px',padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <p style={{margin:0,fontSize:11,fontWeight:800,color:'#fff'}}>{st.fullName}</p>
                      <p style={{margin:0,fontSize:9,color:C.gold,fontFamily:'monospace'}}>{st.studentCode}</p>
                    </div>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>Open →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{textAlign:'center',marginTop:36,paddingBottom:18}}>
          <p style={{fontSize:10,color:'rgba(255,255,255,0.18)',letterSpacing:0.5}}>
            Portrait template 2 · Canvas renderer · QR fixed · ZIP bulk export · npm i jszip
          </p>
        </div>
      </div>
    </div>
  );
}