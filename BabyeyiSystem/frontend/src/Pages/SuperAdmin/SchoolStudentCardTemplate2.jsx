/**
 * IDCardT2 — Portrait student ID card (Wisdom Schools Rwanda template)
 *
 * FIXES v4:
 *  1. QR always visible on export — fixed draw order (fill box → drawQR → stroke border)
 *  2. globalAlpha always reset to 1 before every draw section
 *  3. Denser QR pattern — 29×29 grid with proper finder + data modules
 *  4. ctx.save()/restore() wraps every clipped section so nothing bleeds
 *  5. Photo cover-fit is pixel-perfect centered inside square frame
 *  6. Fast off-screen canvas pipeline (no html2canvas)
 *  7. Bulk ZIP with progress bar
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Download,
  IdCard,
  Loader2,
  Search,
  School,
  UserRound,
  Users,
  X,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────────────── */
/* Card height fits header + photo + info + QR + scan label + footer (QR size = QR_CARD_PX design px). */
export const CARD_PX = { w: 320, h: 695 };
/** On-card QR module size (design px). Encoded URL opens `QRStudentsProfile` → `/v/:studentId` in App.jsx */
const QR_CARD_PX = 120;
const SCALE = 3; /* 3× — print quality */

const C = {
  navy: '#1a3572',
  navyDark: '#0d1f4a',
  navyLight: '#2a4a8f',
  green: '#2e7d32',
  greenLight: '#43a047',
  orange: '#e65100',
  red: '#c62828',
  white: '#ffffff',
  gold: '#c8a84b',
  amber: '#FFBF00',
  amberLight: '#FFBF00',
  text: '#1a1a2e',
  sub: '#4a5568',
};
const FONT_STACK = "'Montserrat', 'Segoe UI', system-ui, sans-serif";

/* ─── Env ────────────────────────────────────────────────────────────── */
const API_ROOT = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5100';
const API = `${API_ROOT.replace(/\/$/, '')}/api`;
const UPLOADS_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_UPLOADS_BASE) || API_ROOT.replace(/\/$/, '');
const PUBLIC_SITE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL) || 'https://babyeyi.rw';

function getBase() {
  return (typeof import.meta !== 'undefined' ? String(import.meta.env?.BASE_URL || '/') : '/').replace(/\/?$/, '/');
}

function getShuleCardLogoCandidates() {
  const b = getBase();
  return [
    `${b}ShuleCardLogo`,
    `${b}ShuleCardLogo.png`,
    `${b}ShuleCardLogo.jpg`,
    `${b}ShuleCardLogo.jpeg`,
    `${b}ShuleCardLogo.webp`,
    `${b}cardlogo-removebg-preview.png`,
    `${b}cardlogo.png`,
  ];
}

/** Primary school logo URL from template API or student row — same logic as on-screen preview. */
function resolveSchoolLogoPrimary(template, student) {
  const raw = template?.school_logo_url;
  if (raw != null && String(raw).trim() !== '') {
    const u = String(raw).trim();
    if (/^https?:\/\//i.test(u)) return u;
    const base = String(UPLOADS_BASE || '').replace(/\/$/, '');
    return `${base}${u.startsWith('/') ? u : `/${u}`}`;
  }
  return student?.school_logo_full || null;
}

/**
 * School logo at top of card, then Shule fallbacks (matches IDCardT2 <img> chain).
 * Footer strip still uses getShuleCardLogoCandidates() only.
 */
function buildSchoolLogoCandidates(template, student) {
  const primary = resolveSchoolLogoPrimary(template, student);
  return primary ? [primary, ...getShuleCardLogoCandidates()] : getShuleCardLogoCandidates();
}

/** Absolute https origin — required or phone scanners open only the bare domain (broken QR payload). */
function normalizeSiteOrigin() {
  let o = String(PUBLIC_SITE || '').trim().replace(/\/$/, '');
  if (!o && typeof window !== 'undefined' && window.location?.origin) {
    o = String(window.location.origin).replace(/\/$/, '');
  }
  if (!o) o = 'https://babyeyi.rw';
  if (!/^https?:\/\//i.test(o)) o = `https://${o}`;
  return o.replace(/\/$/, '');
}

/** Full URL placed inside the QR — scanning opens SPA route `/v/:id` → `QRStudentsProfile.jsx` (public). */
function buildStudentProfileUrl(studentId) {
  const origin = normalizeSiteOrigin();
  const basePath = getBase().replace(/\/$/, '');
  const id = encodeURIComponent(String(studentId));
  /*
   * Short path `/v/:id` — fewer characters in QR, fewer scanner bugs than long paths.
   * Also: `/qr-student-profile/:id` and `?student=` — see App.jsx for same component.
   */
  const profilePath = `${basePath}/v/${id}`.replace(/\/{2,}/g, '/');
  return `${origin}${profilePath.startsWith('/') ? profilePath : `/${profilePath}`}`;
}

/* ─── Data helpers ───────────────────────────────────────────────────── */
function formatWebsite(w) { return w ? String(w).replace(/^https?:\/\//i, '').trim() : ''; }
function formatDob(y) { return y == null || y === '' ? '-' : String(y); }
function yearOnly(v) {
  if (v == null || v === '') return '-';
  const m = String(v).match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : String(v);
}
function buildStudentQrPayload(student) {
  // IMPORTANT: use studentCode (e.g. 150010001) NOT student.id (raw DB row id like 893).
  // The public endpoint /students/public/:id now accepts both numeric DB id AND student_code.
  const identifier = student.studentCode || student.id;
  return buildStudentProfileUrl(identifier);
}
function getQrImageUrl(payload) {
  /* Larger source bitmap so scaled-up QR on card stays sharp */
  return `https://api.qrserver.com/v1/create-qr-code/?size=768x768&format=png&data=${encodeURIComponent(payload)}`;
}

export function deriveSectionFromClass(cn) {
  if (!cn || cn === '-') return '-';
  const raw = String(cn).trim();
  const up = raw.split(/[\s/–—-]/)[0].replace(/\s+/g, '').toUpperCase();
  if (/^N[1-3]$/.test(up)) return 'Nursery';
  if (/^P[1-6]$/.test(up)) return 'Primary Level';
  if (/^S[1-3]$/.test(up)) return 'O-Level';
  if (/^S[4-6]$/.test(up)) return 'A-Level';
  return raw;
}

export function mapRowToStudent(row) {
  const fullName = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
  const code = row.code || row.student_code || row.student_uid || `ST-${row.id}`;
  const photoRel = row.photo_url || (row.student_photo ? `/uploads/student-profile-photos/${row.student_photo}` : null);
  const loc = [row.sector, row.district, row.province].filter(Boolean).join(', ');
  return {
    id: row.id,
    studentCode: code,
    fullName,
    dob: formatDob(row.birth_year),
    gender: row.gender || '-',
    className: row.class_name || '-',
    academicYear: row.academic_year || '-',
    registrationYear: yearOnly(row.registration_year || row.enrollment_year || row.created_at || row.createdAt || row.academic_year),
    school: row.school_name || '-',
    photo: photoRel ? `${UPLOADS_BASE}${photoRel}` : null,
    province: row.province,
    district: row.district,
    sector: row.sector,
    school_id: row.school_id,
    school_logo_full: row.logo_url ? `${UPLOADS_BASE}${row.logo_url}` : null,
    // Use studentCode (not raw DB id) so QR scans open the correct profile.
    qrFallbackUrl: buildStudentProfileUrl(code),
    phone: row.school_phone ? String(row.school_phone).trim() : '',
    email: row.school_email ? String(row.school_email).trim() : '',
    website: formatWebsite(row.school_website || ''),
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
    const res = await fetch(src, { mode: 'cors', cache: 'force-cache' });
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }
}

async function loadFirstAvailableImage(srcs = []) {
  for (const src of srcs) {
    const img = await loadImageCORS(src);
    if (img) return img;
  }
  return null;
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
  canvas.width = W;
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

  /* ── 2. School logo + school name + phone (top, centered) ── */
  const schoolTitle = (template?.school_name || student.school || 'SCHOOL').toUpperCase();
  const schoolPhone = (template?.school_phone || student.phone || '').trim();
  const logoSz = 86 * s;
  const logoX = W / 2 - logoSz / 2;
  const logoY = 6 * s;
  if (logoImg) {
    ctx.save();
    rRect(ctx, logoX, logoY, logoSz, logoSz, 12 * s);
    ctx.clip();
    ctx.drawImage(logoImg, logoX, logoY, logoSz, logoSz);
    ctx.restore();
  } else {
    ctx.fillStyle = C.navy;
    ctx.beginPath();
    ctx.arc(W / 2, logoY + logoSz / 2, logoSz / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const schoolNameY = logoY + logoSz + 18 * s;
  ctx.fillStyle = C.navy;
  ctx.font = `900 ${18.5 * s}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(schoolTitle, W / 2, schoolNameY);

  if (schoolPhone) {
    ctx.fillStyle = C.sub;
    ctx.font = `700 ${12.5 * s}px ${FONT_STACK}`;
    ctx.fillText(schoolPhone, W / 2, schoolNameY + 16 * s);
  }

  /* Space between phone (or school title) and photo */
  const afterHeaderBaseline = schoolPhone ? schoolNameY + 16 * s + 14 * s : schoolNameY + 10 * s;
  const gapBeforePhoto = 18 * s;
  const photoZoneTop = afterHeaderBaseline + gapBeforePhoto;

  /* ── 3. Student photo (large, no side borders/frame) ── */
  const photoSize = 172 * s;
  const photoHalf = photoSize / 2;
  const photoCX = W / 2;
  const photoCY = photoZoneTop + photoHalf;
  const photoOffsetX = (Number(template?.photo_offset_x) || 0) * s;
  const photoOffsetY = (Number(template?.photo_offset_y) || 0) * s;
  const photoZoom = Math.max(0.85, Math.min(2.2, Number(template?.photo_zoom) || 1));

  /* ── 4. Photo square ── */
  const outerX = photoCX - photoHalf;
  const outerY = photoCY - photoHalf;
  const innerSize = photoSize;
  const innerX = outerX;
  const innerY = outerY;

  /* Photo or placeholder — clipped to square */
  ctx.save(); /* save-C: photo clip */
  ctx.beginPath();
  ctx.arc(photoCX, photoCY, innerSize / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.globalAlpha = 1;
  if (photoImg) {
    const iw = photoImg.naturalWidth || photoImg.width || 1;
    const ih = photoImg.naturalHeight || photoImg.height || 1;
    const ratio = Math.max(innerSize / iw, innerSize / ih) * photoZoom;
    const dw = iw * ratio;
    const dh = ih * ratio;
    ctx.drawImage(photoImg, innerX + (innerSize - dw) / 2 + photoOffsetX, innerY + (innerSize - dh) / 2 + photoOffsetY, dw, dh);
  } else {
    ctx.fillStyle = '#dde4f0';
    ctx.fillRect(innerX, innerY, innerSize, innerSize);
    ctx.fillStyle = '#7b92b8';
    ctx.beginPath();
    ctx.arc(photoCX, photoCY - innerSize * 0.18, innerSize * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(photoCX, photoCY + innerSize * 0.52, innerSize * 0.45, Math.PI, 0);
    ctx.fill();
  }
  ctx.restore(); /* restore-C */

  /* ── 5. Info fields ── */
  ctx.globalAlpha = 1; /* RESET */
  const infoTopY = photoZoneTop + photoSize + 18 * s;

  const rowH = 30 * s;
  let infoY = infoTopY;
  const infoStartX = 46 * s;

  ctx.globalAlpha = 1;
  /* Student name only — no “Name:” label, slightly larger */
  ctx.textAlign = 'center';
  ctx.fillStyle = C.navy;
  ctx.font = `900 ${19.5 * s}px ${FONT_STACK}`;
  ctx.fillText(student.fullName, W / 2, infoY);
  infoY += 38 * s;
  ctx.textAlign = 'left';

  const restRows = [
    { label: 'ID No', value: student.studentCode, bold: false },
    { label: 'Section', value: deriveSectionFromClass(student.className), bold: false },
  ];

  restRows.forEach(({ label, value, bold }) => {
    const labelFontSize = label === 'ID No' ? 20 * s : 17 * s;
    const valueFontSize = label === 'ID No' ? 21.5 * s : 17 * s;
    const lText = `${label}: `;
    ctx.fillStyle = C.navy;
    ctx.font = `800 ${labelFontSize}px ${FONT_STACK}`;
    ctx.fillText(lText, infoStartX, infoY);
    const lw = ctx.measureText(lText).width;

    ctx.fillStyle = C.navy;
    ctx.font = `${bold ? 900 : 800} ${valueFontSize}px ${FONT_STACK}`;
    ctx.fillText(value, infoStartX + lw, infoY);

    infoY += label === 'ID No' ? 34 * s : rowH;
  });

  /* ── 6. QR CODE (below info, above footer) — as large as vertical space allows */
  ctx.globalAlpha = 1;
  const footerH = 44 * s;
  const footerY = H - footerH;
  const pad = 6 * s;
  const boxR = 10 * s;
  const gapAfterInfo = 10 * s;
  const gapAboveFooter = 8 * s;
  const scanTextH = 11 * s;
  const labelGapBelowBox = 24 * s;
  const maxQR = QR_CARD_PX * s;
  const minQR = 72 * s;

  const qrY = infoY + gapAfterInfo;
  /* Bottom of scan text must sit above footer: qrY + qrPx + pad + labelGap + scanTextH <= footerY - gapAboveFooter */
  const maxQrPx = footerY - gapAboveFooter - qrY - pad - labelGapBelowBox - scanTextH;
  const qrPx = Math.max(0, Math.min(maxQR, maxQrPx));
  const qrX = W / 2 - qrPx / 2;

  if (qrPx >= minQR) {
    ctx.fillStyle = '#ffffff';
    rRect(ctx, qrX - pad, qrY - pad, qrPx + pad * 2, qrPx + pad * 2, boxR);
    ctx.fill();

    if (qrImage) {
      ctx.drawImage(qrImage, qrX, qrY, qrPx, qrPx);
    } else {
      ctx.fillStyle = '#b91c1c';
      ctx.font = `700 ${8.4 * s}px ${FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText('QR unavailable', W / 2, qrY + qrPx / 2);
    }

    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.navy;
    ctx.lineWidth = 2 * s;
    rRect(ctx, qrX - pad, qrY - pad, qrPx + pad * 2, qrPx + pad * 2, boxR);
    ctx.stroke();

    const scanLabelY = qrY + qrPx + pad + labelGapBelowBox;
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.sub;
    ctx.font = `600 ${6.5 * s}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('SCAN FOR STUDENT PROFILE', W / 2, scanLabelY);
  }

  /* ── 7. Amber footer ── */
  ctx.globalAlpha = 1;
  const gg = ctx.createLinearGradient(0, 0, W, 0);
  gg.addColorStop(0, C.amber); gg.addColorStop(1, C.amberLight);
  ctx.fillStyle = gg;
  ctx.fillRect(0, footerY, W, footerH);

  if (footerImg) {
    const fh = 34 * s;
    const fAsp = (footerImg.naturalWidth || 1) / (footerImg.naturalHeight || 1);
    const fw = Math.min(fh * fAsp, W * 0.72);
    ctx.drawImage(footerImg, W / 2 - fw / 2, footerY + 2 * s, fw, fh);
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
      <circle cx="50" cy="50" r="47" fill={C.navy} stroke={C.gold} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="39" fill="#fff" />
      <rect x="24" y="44" width="24" height="18" rx="2" fill={C.navy} />
      <rect x="52" y="44" width="24" height="18" rx="2" fill={C.navyLight} />
      <rect x="47" y="30" width="6" height="14" rx="2" fill={C.gold} />
      <ellipse cx="50" cy="28" rx="5" ry="7" fill="#f5a623" />
    </svg>
  );
}

function CardLogoImg({ maxWidth = 210, height = 34 }) {
  const [i, setI] = useState(0);
  const srcs = useMemo(() => getShuleCardLogoCandidates(), []);
  return (
    <img src={srcs[Math.min(i, srcs.length - 1)]} alt=""
      style={{ maxWidth, width: '100%', height, objectFit: 'contain', objectPosition: 'center', display: 'block' }}
      onError={() => setI(x => x + 1)} />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   IDCardT2 — React preview (DOM version for on-screen display)
   Visual matches exactly — export uses renderCardToCanvas above
══════════════════════════════════════════════════════════════════════ */
export function IDCardT2({ student, template, scale = 1 }) {
  const schoolTitle = (template?.school_name || student.school || 'SCHOOL').toUpperCase();
  const logoCandidates = useMemo(
    () => buildSchoolLogoCandidates(template, student),
    [template?.school_logo_url, student?.school_logo_full]
  );
  const [logoTry, setLogoTry] = useState(0);
  const logoSrc = logoCandidates[Math.min(logoTry, logoCandidates.length - 1)];
  useEffect(() => { setLogoTry(0); }, [logoCandidates]);
  const schoolPhone = (template?.school_phone || student.phone || '').trim();
  const photoOffsetX = Number(template?.photo_offset_x) || 0;
  const photoOffsetY = Number(template?.photo_offset_y) || 0;
  const photoZoom = Math.max(0.85, Math.min(2.2, Number(template?.photo_zoom) || 1));
  const qrImg = useMemo(() => getQrImageUrl(buildStudentQrPayload(student)), [student?.id]);

  const infoRows = [
    { label: 'ID No', value: student.studentCode, bold: false },
    { label: 'Section', value: deriveSectionFromClass(student.className), bold: false },
  ];

  return (
    <div data-card-t2 style={{
      width: CARD_PX.w * scale, height: CARD_PX.h * scale,
      transform: `scale(${scale})`, transformOrigin: 'top left',
      position: 'relative', borderRadius: 18, overflow: 'hidden',
      background: '#fff', fontFamily: FONT_STACK,
      boxShadow: scale >= 1 ? '0 24px 72px rgba(26,53,114,0.28),0 4px 16px rgba(0,0,0,0.15)' : 'none',
      flexShrink: 0,
    }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', zIndex: 2, padding: '10px 14px 0' }}>
        {/* School logo + school details */}
        <div style={{ width: 86, height: 86, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={logoSrc}
            alt=""
            style={{ width: 86, height: 86, objectFit: 'contain', borderRadius: 14 }}
            onError={() => setLogoTry((n) => n + 1)}
          />
        </div>
        <div style={{ fontSize: 18.5, fontWeight: 900, color: C.navy, textAlign: 'center', lineHeight: 1.15, letterSpacing: 0.25, marginBottom: 2 }}>{schoolTitle}</div>
        {schoolPhone ? (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, textAlign: 'center', lineHeight: 1.15, marginBottom: 18 }}>{schoolPhone}</div>
        ) : (
          <div style={{ marginBottom: 12 }} />
        )}

        {/* Photo */}
        <div style={{ position: 'relative', width: 172, height: 172, marginBottom: 8, flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 172, height: 172, borderRadius: '50%', overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, boxSizing: 'border-box' }}>
            {student.photo ? (
              <img
                src={student.photo}
                alt=""
                style={{
                  width: `${photoZoom * 100}%`,
                  height: `${photoZoom * 100}%`,
                  objectFit: 'cover',
                  objectPosition: 'center',
                  transform: `translate(${photoOffsetX}px, ${photoOffsetY}px)`,
                }}
              />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={C.navy} strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <div style={{ fontSize: 7, color: C.navy, fontWeight: 700, marginTop: 2 }}>NO PHOTO</div>
              </div>
            )}
          </div>
        </div>

        {/* Student name (no label) + ID / Section */}
        <div style={{ width: '100%', paddingLeft: 12, paddingRight: 12, paddingTop: 0, paddingBottom: 2, zIndex: 4, position: 'relative', flexShrink: 0 }}>
          <div style={{ width: '100%', maxWidth: 288, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.navy, lineHeight: 1.2, marginBottom: 10, letterSpacing: 0.02 }}>{student.fullName}</div>
            <div style={{ width: 'fit-content', margin: '0 auto', textAlign: 'left' }}>
              {infoRows.map(({ label, value, bold }) => (
                <div
                  key={label}
                  style={{
                    fontSize: label === 'ID No' ? 21 : 17,
                    color: C.navy,
                    marginBottom: label === 'ID No' ? 10 : 9,
                    lineHeight: 1.25,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 800, color: C.navy }}>{label}: </span>
                  <span style={{ fontWeight: bold ? 900 : 800, color: C.navy }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* QR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginTop: 4, marginBottom: 4, flexShrink: 0, zIndex: 4 }}>
          <div style={{ borderRadius: 12, border: `2px solid ${C.navy}`, padding: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {qrImg ? (
              <img src={qrImg} alt="QR" style={{ width: QR_CARD_PX, height: QR_CARD_PX, display: 'block', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: QR_CARD_PX, height: QR_CARD_PX, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontSize: 8, fontWeight: 700 }}>
                QR unavailable
              </div>
            )}
          </div>
          <span style={{ fontSize: 6.5, color: C.sub, letterSpacing: 0.4, fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.35 }}>Scan for student profile</span>
        </div>

        {/* Amber footer */}
        <div
          style={{
            alignSelf: 'stretch',
            marginLeft: -14,
            marginRight: -14,
            width: 'calc(100% + 28px)',
            boxSizing: 'border-box',
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            background: `linear-gradient(90deg,${C.amber},${C.amberLight})`,
            minHeight: 48,
            marginTop: 'auto',
            flexShrink: 0,
            zIndex: 4,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: 2,
          }}
        >
          <CardLogoImg maxWidth={205} height={34} />
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
    Promise.all([
      student.photo ? loadImageCORS(student.photo) : Promise.resolve(null),
      loadFirstAvailableImage(buildSchoolLogoCandidates(template, student)),
      loadFirstAvailableImage(getShuleCardLogoCandidates()),
      loadImageCORS(getQrImageUrl(buildStudentQrPayload(student))),
    ]).then(([photo, logo, footer, qr]) => {
      refs.current = { photo, logo, footer, qr };
      setReady(true);
    });
  }, [
    student?.id,
    student?.photo,
    student?.studentCode,
    student?.fullName,
    student?.className,
    student?.school,
    student?.school_logo_full,
    student?.registrationYear,
    template?.school_logo_url,
  ]);

  const getCanvas = useCallback(() =>
    renderCardToCanvas(student, template, refs.current.photo, refs.current.logo, refs.current.footer, refs.current.qr),
    [student, template]);

  const downloadPNG = useCallback(async () => {
    const canvas = await getCanvas();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ID-${student.studentCode}.png`;
    a.click(); URL.revokeObjectURL(a.href);
  }, [getCanvas, student?.studentCode]);

  const downloadJPEG = useCallback(async () => {
    const canvas = await getCanvas();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ID-${student.studentCode}.jpg`;
    a.click(); URL.revokeObjectURL(a.href);
  }, [getCanvas, student?.studentCode]);

  const downloadPDF = useCallback(async () => {
    const canvas = await getCanvas();
    const { jsPDF } = await import('jspdf');
    const pdfH = (85.6 * CARD_PX.h) / CARD_PX.w;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [85.6, pdfH] });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.97));
    const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
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
  const zip = new JSZip();
  const folder = zip.folder('student-cards');
  const BATCH = 4;

  const [logoImg, footerImg] = await Promise.all([
    loadFirstAvailableImage(buildSchoolLogoCandidates(template, students[0])),
    loadFirstAvailableImage(getShuleCardLogoCandidates()),
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
      const qrSrc = getQrImageUrl(buildStudentQrPayload(student));
      const qrImg = await loadImageCORS(qrSrc);
      const canvas = await renderCardToCanvas(student, perStudentTemplate, photoImg, logoImg, footerImg, qrImg);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      folder.file(`${student.studentCode}_${student.fullName.replace(/\s+/g, '_')}.png`, await blob.arrayBuffer());
      onProgress?.(++done, students.length);
    }));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlob);
  a.download = `student-cards-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ══════════════════════════════════════════════════════════════════════
   CardModal
══════════════════════════════════════════════════════════════════════ */
export function CardModal({ student, onClose }) {
  const [template, setTemplate] = useState(null);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyFmt, setBusyFmt] = useState(null);
  const [editor, setEditor] = useState({ photo_offset_x: 0, photo_offset_y: 0, photo_zoom: 1 });

  useEffect(() => {
    if (!student?.id) return;
    let cancelled = false;
    setTplLoading(true); setTplError(null); setTemplate(null);
    fetch(`${API}/student-cards/${student.id}/template`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (cancelled) return; if (!j.success) throw new Error(j.message); setTemplate(j.data); })
      .catch(e => { if (!cancelled) setTplError(e.message || 'Failed'); })
      .finally(() => { if (!cancelled) setTplLoading(false); });
    return () => { cancelled = true; };
  }, [student?.id]);

  useEffect(() => {
    // Keep default placement centered for every student card.
    setEditor({
      photo_offset_x: 0,
      photo_offset_y: 0,
      photo_zoom: 1,
    });
  }, [student?.id]);

  const editedTemplate = useMemo(
    () => ({ ...(template || {}), ...editor }),
    [template, editor]
  );

  const { ready, downloadPNG, downloadJPEG, downloadPDF } = useCardExport(student, editedTemplate);

  const run = async (fmt, fn) => { setBusy(true); setBusyFmt(fmt); try { await fn(); } finally { setBusy(false); setBusyFmt(null); } };

  const dlServer = async () => {
    setBusy(true); setBusyFmt('SRV');
    try {
      const res = await fetch(`${API}/student-cards/${student.id}/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('Server PDF failed');
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `ID-${student.studentCode}.pdf`; a.click(); URL.revokeObjectURL(a.href);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); setBusyFmt(null); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#0d1b38', borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, maxHeight: '96dvh', overflowY: 'auto', border: '1px solid rgba(200,168,75,0.3)', boxShadow: '0 40px 120px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ color: C.gold, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Portrait template</p>
            <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 900, margin: '4px 0 0' }}>{student.fullName}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {tplLoading && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Loading card data…</p>}
        {tplError && <p style={{ color: '#f87171', fontSize: 13 }}>{tplError}</p>}
        {!ready && !tplLoading && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={14} strokeWidth={2} className="sct2-spin" style={{ flexShrink: 0 }} />
            Pre-loading images…
          </p>
        )}
        {ready && (
          <p style={{ color: '#4ade80', fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Check size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
            Ready — exports are instant
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ width: CARD_PX.w, minHeight: CARD_PX.h }}>
            <IDCardT2 student={student} template={editedTemplate} scale={1} />
          </div>
        </div>

        <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Editor</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>Photo X</label>
            <input type="range" min={-40} max={40} step={1} value={editor.photo_offset_x} onChange={e => setEditor(prev => ({ ...prev, photo_offset_x: Number(e.target.value) }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>Photo Y</label>
            <input type="range" min={-40} max={40} step={1} value={editor.photo_offset_y} onChange={e => setEditor(prev => ({ ...prev, photo_offset_y: Number(e.target.value) }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>Photo Zoom</label>
            <input type="range" min={0.85} max={2.2} step={0.01} value={editor.photo_zoom} onChange={e => setEditor(prev => ({ ...prev, photo_zoom: Number(e.target.value) }))} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditor({ photo_offset_x: 0, photo_offset_y: 0, photo_zoom: 1 })}
              style={{ height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', padding: '0 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              Reset photo
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
          {[
            { label: 'PNG', fn: () => run('PNG', downloadPNG), fmt: 'PNG', bg: '#1a3572' },
            { label: 'JPEG', fn: () => run('JPEG', downloadJPEG), fmt: 'JPEG', bg: '#1e5128' },
            { label: 'PDF (image)', fn: () => run('PDF', downloadPDF), fmt: 'PDF', bg: '#7f1d1d' },
            { label: 'PDF (server)', fn: dlServer, fmt: 'SRV', bg: 'transparent', outline: true },
          ].map(({ label, fn, fmt, bg, outline }) => (
            <button key={fmt} type="button" onClick={fn}
              disabled={busy || tplLoading || (!ready && fmt !== 'SRV')}
              style={{ height: 40, borderRadius: 10, border: outline ? `1px solid ${C.gold}` : 'none', background: outline ? 'transparent' : bg, color: outline ? C.gold : '#fff', fontWeight: 800, fontSize: 10, letterSpacing: 1, cursor: 'pointer', opacity: (busy && busyFmt !== fmt) || (!ready && fmt !== 'SRV') ? 0.45 : 1 }}>
              {busy && busyFmt === fmt ? (
                '…'
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Download size={14} strokeWidth={2} />
                  {label}
                </span>
              )}
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
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ province: '', district: '', sector: '', school_id: '', class_name: '' });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [schoolOpts, setSchoolOpts] = useState([]);
  const [classOpts, setClassOpts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [viewStudent, setViewStudent] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProg, setBulkProg] = useState({ done: 0, total: 0 });
  const [notif, setNotif] = useState(null);

  const showNotif = (msg, type = 'success') => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 5000); };

  useEffect(() => { fetch(`${API}/locations/provinces`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setProvinces(j.data || []); }).catch(() => { }); }, []);
  useEffect(() => { if (!filters.province) { setDistricts([]); return; } fetch(`${API}/locations/districts?province=${encodeURIComponent(filters.province)}`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setDistricts(j.data || []); }).catch(() => { }); }, [filters.province]);
  useEffect(() => { if (!filters.province || !filters.district) { setSectors([]); return; } const p = new URLSearchParams({ province: filters.province, district: filters.district }); fetch(`${API}/locations/sectors?${p}`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setSectors(j.data || []); }).catch(() => { }); }, [filters.province, filters.district]);
  useEffect(() => { const p = new URLSearchParams(); if (filters.province) p.set('province', filters.province); if (filters.district) p.set('district', filters.district); if (filters.sector) p.set('sector', filters.sector); fetch(`${API}/student-cards/filters/schools?${p}`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setSchoolOpts(j.data || []); }).catch(() => { }); }, [filters.province, filters.district, filters.sector]);
  useEffect(() => { if (!filters.school_id) { setClassOpts([]); return; } fetch(`${API}/student-cards/filters/classes?school_id=${encodeURIComponent(filters.school_id)}`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setClassOpts(j.data || []); }).catch(() => { }); }, [filters.school_id]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.province) p.set('province', filters.province);
      if (filters.district) p.set('district', filters.district);
      if (filters.sector) p.set('sector', filters.sector);
      if (filters.school_id) p.set('school_id', filters.school_id);
      if (filters.class_name) p.set('class_name', filters.class_name);
      if (search.trim()) p.set('q', search.trim());
      p.set('limit', '500');
      const res = await fetch(`${API}/student-cards/students?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed');
      setStudents((json.data || []).map(mapRowToStudent));
      setSelected([]);
    } catch (e) { showNotif(e.message || 'Load failed', 'error'); setStudents([]); }
    finally { setLoading(false); }
  }, [filters, search]);

  useEffect(() => { loadStudents(); }, []);// eslint-disable-line

  const setF = key => e => {
    const val = e.target.value;
    setFilters(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'province') { next.district = ''; next.sector = ''; next.school_id = ''; next.class_name = ''; }
      if (key === 'district') { next.sector = ''; next.school_id = ''; next.class_name = ''; }
      if (key === 'sector') { next.school_id = ''; next.class_name = ''; }
      if (key === 'school_id') { next.class_name = ''; }
      return next;
    });
  };

  const allSel = students.length > 0 && selected.length === students.length;
  const toggleAll = () => setSelected(allSel ? [] : students.map(s => s.id));
  const toggleOne = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleBulkZip = async () => {
    const targets = students.filter(s => selected.length === 0 || selected.includes(s.id));
    if (!targets.length) return;
    setBulkBusy(true); setBulkProg({ done: 0, total: targets.length });
    try {
      await bulkDownloadZip(targets, null, (done, total) => setBulkProg({ done, total }));
      showNotif(`Downloaded ${targets.length} cards as ZIP`);
    } catch (e) { showNotif(e.message || 'ZIP failed', 'error'); }
    finally { setBulkBusy(false); setBulkProg({ done: 0, total: 0 }); }
  };

  const S = {
    page: { minHeight: '100vh', background: 'linear-gradient(165deg,#040d1e 0%,#071635 55%,#040d1e 100%)', color: '#fff', fontFamily: "'Segoe UI',system-ui,sans-serif" },
    topbar: { background: 'rgba(10,22,56,0.92)', borderBottom: '1px solid rgba(200,168,75,0.22)', padding: '0 22px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200, backdropFilter: 'blur(12px)' },
    wrap: { maxWidth: 1280, margin: '0 auto', padding: '22px 16px' },
    panel: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 18 },
    sel: { height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '0 12px', fontSize: 12, outline: 'none', cursor: 'pointer', minWidth: 150 },
    btn: (bg, col = '#fff') => ({ height: 38, borderRadius: 10, border: 'none', background: bg, color: col, fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', cursor: 'pointer', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }),
    th: { padding: '10px 14px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.38)', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' },
    td: { padding: '12px 14px', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle' },
  };

  return (
    <div style={S.page}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:rgba(255,255,255,0.03)}::-webkit-scrollbar-thumb{background:rgba(200,168,75,0.3);border-radius:4px}select option{background:#0d1b38;color:#fff}@keyframes sct2-spin{to{transform:rotate(360deg)}}.sct2-spin{display:inline-block;animation:sct2-spin 1s linear infinite}`}</style>

      {notif && (
        <div style={{ position: 'fixed', top: 14, right: 14, zIndex: 2000, background: notif.type === 'error' ? '#7f1d1d' : '#14532d', border: `1px solid ${notif.type === 'error' ? '#ef4444' : '#22c55e'}`, borderRadius: 12, padding: '12px 20px', color: '#fff', fontSize: 13, fontWeight: 600, maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {notif.type === 'success' ? <Check size={18} strokeWidth={2} style={{ flexShrink: 0 }} /> : null}
          <span>{notif.msg}</span>
        </div>
      )}

      {viewStudent && <CardModal student={viewStudent} onClose={() => setViewStudent(null)} />}

      <div style={S.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.navy},${C.navyLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <IdCard size={20} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 8, color: C.gold, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }}>Super Admin</div>
            <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: -0.3 }}>Student Card · Portrait Template 2</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate('/superadmin/dashboard')}
            style={{
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(200,168,75,0.35)',
              background: 'linear-gradient(135deg, rgba(200,168,75,0.22), rgba(200,168,75,0.1))',
              color: C.gold,
              padding: '0 12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} strokeWidth={2} />
            Back to dashboard
          </button>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Canvas export · QR fixed · ZIP bulk</div>
        </div>
      </div>

      <div style={S.wrap}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Students loaded', val: students.length, Icon: Users, a: '#1a3572' },
            { label: 'With photos', val: students.filter(x => x.photo).length, Icon: Camera, a: '#1e5128' },
            { label: 'Schools', val: schoolOpts.length, Icon: School, a: '#7c3aed' },
            { label: 'For ZIP', val: selected.length || students.length, Icon: Download, a: '#c2410c' },
          ].map(({ label, val, Icon, a }) => (
            <div key={label} style={{ background: `linear-gradient(135deg,${a}45,${a}18)`, border: `1px solid ${a}55`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ marginBottom: 6, color: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center' }}><Icon size={22} strokeWidth={1.75} /></div>
              <div style={{ fontSize: 26, fontWeight: 900 }}>{val}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ ...S.panel, marginBottom: 18 }}>
          <div style={{ fontSize: 10, color: C.gold, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Location &amp; school filters</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <select value={filters.province} onChange={setF('province')} style={{ ...S.sel, minWidth: 170 }}><option value="">All provinces</option>{provinces.map(x => <option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.district} onChange={setF('district')} disabled={!filters.province} style={{ ...S.sel, minWidth: 150, opacity: filters.province ? 1 : 0.55 }}><option value="">All districts</option>{districts.map(x => <option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.sector} onChange={setF('sector')} disabled={!filters.district} style={{ ...S.sel, minWidth: 150, opacity: filters.district ? 1 : 0.55 }}><option value="">All sectors</option>{sectors.map(x => <option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.school_id} onChange={setF('school_id')} style={{ ...S.sel, minWidth: 220 }}><option value="">All schools</option>{schoolOpts.map(sc => <option key={sc.id} value={String(sc.id)}>{sc.school_name}</option>)}</select>
            <select value={filters.class_name} onChange={setF('class_name')} disabled={!filters.school_id} style={{ ...S.sel, minWidth: 140, opacity: filters.school_id ? 1 : 0.55 }}><option value="">All classes</option>{classOpts.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <button type="button" onClick={() => setFilters({ province: '', district: '', sector: '', school_id: '', class_name: '' })} style={S.btn('rgba(255,255,255,0.08)')}>Clear</button>
          </div>
        </div>

        {/* Search + actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none', display: 'flex' }}>
              <Search size={16} strokeWidth={2} color="rgba(255,255,255,0.9)" />
            </span>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadStudents()} placeholder="Search name or student code…" style={{ ...S.sel, width: '100%', paddingLeft: 36, height: 40, boxSizing: 'border-box' }} />
          </div>
          <button type="button" onClick={loadStudents} disabled={loading} style={S.btn(`linear-gradient(135deg,${C.navy},${C.navyDark})`)}>{loading ? 'Loading…' : 'Apply filters'}</button>

          {students.length > 0 && (
            <button type="button" onClick={handleBulkZip} disabled={bulkBusy}
              style={{ ...S.btn(`linear-gradient(135deg,${C.green},${C.greenLight})`), minWidth: 190 }}>
              {bulkBusy ? (
                `${bulkProg.done}/${bulkProg.total} rendering…`
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} strokeWidth={2} />
                  ZIP {selected.length > 0 ? selected.length : students.length} cards
                </span>
              )}
            </button>
          )}

          {selected.length > 0 && <>
            <span style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>{selected.length} selected</span>
            <button type="button" onClick={() => setSelected([])} style={S.btn('rgba(255,255,255,0.08)')}>Clear sel.</button>
          </>}
        </div>

        {/* Progress bar */}
        {bulkBusy && bulkProg.total > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg,${C.green},${C.greenLight})`, width: `${Math.round(bulkProg.done / bulkProg.total * 100)}%`, transition: 'width 0.2s' }} />
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Rendering {bulkProg.done}/{bulkProg.total} cards (4 in parallel)</p>
          </div>
        )}

        {/* Table */}
        <div style={{ ...S.panel, overflowX: 'auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 14px' }}>Portrait ID cards <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginLeft: 10 }}>({students.length} loaded)</span></h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}><input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: C.gold }} /></th>
                <th style={S.th}>Photo</th><th style={S.th}>Student</th><th style={S.th}>Class</th><th style={S.th}>School</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.3)' }}>{loading ? 'Loading…' : 'No students. Adjust filters and click Apply.'}</td></tr>
              ) : students.map(st => (
                <tr key={st.id} style={{ background: selected.includes(st.id) ? 'rgba(200,168,75,0.07)' : 'transparent' }}>
                  <td style={S.td}><input type="checkbox" checked={selected.includes(st.id)} onChange={() => toggleOne(st.id)} style={{ cursor: 'pointer', accentColor: C.gold }} /></td>
                  <td style={S.td}>
                    <div style={{ width: 40, height: 50, borderRadius: 8, border: `2px solid ${C.navy}`, overflow: 'hidden', background: '#1a2a45', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {st.photo ? <img src={st.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ opacity: 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserRound size={22} strokeWidth={1.75} color="#93c5fd" /></span>}
                    </div>
                  </td>
                  <td style={S.td}>
                    <p style={{ fontWeight: 800, color: '#fff', margin: 0 }}>{st.fullName}</p>
                    <p style={{ fontSize: 10, color: C.gold, margin: '4px 0 0', fontFamily: 'ui-monospace,monospace' }}>{st.studentCode}</p>
                  </td>
                  <td style={S.td}><span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 8, background: 'rgba(26,53,114,0.45)', border: `1px solid ${C.navy}`, fontSize: 11, fontWeight: 800, color: '#93c5fd' }}>{st.className}</span></td>
                  <td style={S.td}>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{st.school}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 4, maxWidth: 280 }}>{st.addressSummary}</div>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    <button type="button" onClick={() => setViewStudent(st)} style={S.btn(C.navy)}>View card</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Preview grid */}
        {students.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>Preview (first 6)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 18 }}>
              {students.slice(0, 6).map(st => (
                <button key={st.id} type="button" onClick={() => setViewStudent(st)}
                  style={{ cursor: 'pointer', borderRadius: 16, overflow: 'hidden', border: 'none', padding: 0, textAlign: 'left', background: 'transparent', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', height: 362, overflow: 'hidden', background: 'rgba(0,0,0,0.12)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }}>
                    <div style={{ transform: 'scale(0.52)', transformOrigin: 'top center' }}>
                      <IDCardT2 student={st} template={null} scale={1} />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(26,53,114,0.35)', border: '1px solid rgba(200,168,75,0.12)', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#fff' }}>{st.fullName}</p>
                      <p style={{ margin: 0, fontSize: 9, color: C.gold, fontFamily: 'monospace' }}>{st.studentCode}</p>
                    </div>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Open <ChevronRight size={14} strokeWidth={2} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 36, paddingBottom: 18 }}>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: 0.5 }}>
            Portrait template 2 · Canvas renderer · QR fixed · ZIP bulk export · npm i jszip
          </p>
        </div>
      </div>
    </div>
  );
}