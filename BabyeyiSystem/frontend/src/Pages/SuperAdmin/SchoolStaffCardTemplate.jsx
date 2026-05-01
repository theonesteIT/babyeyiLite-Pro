/**
 * SchoolStaffCardTemplate.jsx
 * Portrait staff ID card — mirrors IDCardT2 design from SchoolStudentCardTemplate2
 * Fields: Name, Staff ID, Role/Designation, Department, QR → Staff profile page
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
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
export const CARD_PX = { w: 320, h: 695 };
const QR_CARD_PX = 120;
const SCALE = 3;

const C = {
  navy: '#1a3572',
  navyDark: '#0d1f4a',
  navyLight: '#2a4a8f',
  green: '#2e7d32',
  greenLight: '#43a047',
  teal: '#00695c',
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

function normalizeSiteOrigin() {
  let o = String(PUBLIC_SITE || '').trim().replace(/\/$/, '');
  if (!o && typeof window !== 'undefined' && window.location?.origin) {
    o = String(window.location.origin).replace(/\/$/, '');
  }
  if (!o) o = 'https://babyeyi.rw';
  if (!/^https?:\/\//i.test(o)) o = `https://${o}`;
  return o.replace(/\/$/, '');
}

function buildStaffProfileUrl(staffId) {
  const origin = normalizeSiteOrigin();
  const basePath = getBase().replace(/\/$/, '');
  const id = encodeURIComponent(String(staffId));
  const profilePath = `${basePath}/staff/${id}`.replace(/\/{2,}/g, '/');
  return `${origin}${profilePath.startsWith('/') ? profilePath : `/${profilePath}`}`;
}

/* ─── Data helpers ───────────────────────────────────────────────────── */
function formatWebsite(w) { return w ? String(w).replace(/^https?:\/\//i, '').trim() : ''; }
function resolveMediaUrl(raw) {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || v.startsWith('blob:') || v.startsWith('data:')) return v;
  if (v.startsWith('/')) return `${UPLOADS_BASE}${v}`;
  return `${UPLOADS_BASE}/${v}`;
}

function buildStaffQrPayload(staff) {
  const identifier = staff.staffCode || staff.id;
  return buildStaffProfileUrl(identifier);
}

function getQrImageUrl(payload) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=768x768&format=png&data=${encodeURIComponent(payload)}`;
}

export function mapRowToStaff(row) {
  const fullName = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
  const code = row.staff_code || row.code || row.staff_uid || `STF-${row.id}`;
  const photoRel = row.photo_url || (row.staff_photo ? `/uploads/staff-photos/${row.staff_photo}` : null);
  const loc = [row.sector, row.district, row.province].filter(Boolean).join(', ');
  return {
    id: row.id,
    staffCode: code,
    fullName,
    role: row.role || row.designation || row.position || '-',
    department: row.department || '-',
    gender: row.gender || '-',
    phone: row.phone || row.staff_phone || '',
    school: row.school_name || '-',
    school_id: row.school_id,
    status: row.status || 'Active',
    joinYear: row.join_year || row.created_at?.slice(0, 4) || '-',
    photo: resolveMediaUrl(photoRel),
    province: row.province || '',
    district: row.district || '',
    sector: row.sector || '',
    school_logo_full: resolveMediaUrl(row.logo_url),
    qrFallbackUrl: buildStaffProfileUrl(code),
    school_phone: row.school_phone ? String(row.school_phone).trim() : '',
    school_email: row.school_email ? String(row.school_email).trim() : '',
    website: formatWebsite(row.school_website || ''),
    postal_address: row.postal_address ? String(row.postal_address).trim() : '',
    addressSummary: [row.postal_address, loc].filter(Boolean).join(' · ') || '—',
  };
}

/* ══════════════════════════════════════════════════════════════════════
   IMAGE LOADER
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
   renderStaffCardToCanvas
══════════════════════════════════════════════════════════════════════ */
export async function renderStaffCardToCanvas(staff, template, photoImg, logoImg, footerImg, qrImage) {
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
  ctx.save();
  ctx.clip();

  /* ── 2. Teal accent stripe at top ── */
  const stripeH = 8 * s;
  const stripeGrad = ctx.createLinearGradient(0, 0, W, 0);
  stripeGrad.addColorStop(0, C.teal);
  stripeGrad.addColorStop(1, '#00897b');
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(0, 0, W, stripeH);

  /* ── 3. School logo ── */
  const schoolTitle = (template?.school_name || staff.school || 'SCHOOL').toUpperCase();
  const schoolPhone = (template?.school_phone || staff.school_phone || '').trim();
  const logoSz = 86 * s;
  const logoX = W / 2 - logoSz / 2;
  const logoY = stripeH + 6 * s;

  ctx.globalAlpha = 1;
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

  /* ── "STAFF ID" badge ── */
  const badgeY = schoolPhone ? schoolNameY + 16 * s + 14 * s : schoolNameY + 8 * s;
  const badgeW = 116 * s;
  const badgeH = 19 * s;
  const badgeX = W / 2 - badgeW / 2;
  rRect(ctx, badgeX, badgeY, badgeW, badgeH, 5 * s);
  ctx.fillStyle = C.teal;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${8.2 * s}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('STAFF IDENTITY CARD', W / 2, badgeY + 13.2 * s);

  const photoZoneTop = badgeY + badgeH + 16 * s;

  /* ── 4. Photo (circular) ── */
  const photoSize = 172 * s;
  const photoHalf = photoSize / 2;
  const photoCX = W / 2;
  const photoCY = photoZoneTop + photoHalf;
  const photoOffsetX = (Number(template?.photo_offset_x) || 0) * s;
  const photoOffsetY = (Number(template?.photo_offset_y) || 0) * s;
  const photoZoom = Math.max(0.85, Math.min(2.2, Number(template?.photo_zoom) || 1));

  const innerSize = photoSize;
  const innerX = photoCX - photoHalf;
  const innerY = photoCY - photoHalf;

  /* Teal ring around photo */
  ctx.globalAlpha = 1;
  ctx.strokeStyle = C.teal;
  ctx.lineWidth = 3.5 * s;
  ctx.beginPath();
  ctx.arc(photoCX, photoCY, photoHalf + 4 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
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
  ctx.restore();

  /* ── 5. Info fields ── */
  ctx.globalAlpha = 1;
  const infoTopY = photoZoneTop + photoSize + 24 * s;
  let infoY = infoTopY;

  /* Full name */
  ctx.textAlign = 'center';
  ctx.fillStyle = C.navy;
  ctx.font = `900 ${19.5 * s}px ${FONT_STACK}`;
  ctx.fillText(staff.fullName, W / 2, infoY);
  infoY += 38 * s;

  ctx.textAlign = 'left';
  const infoStartX = 46 * s;

  const infoRows = [
    { label: 'ID No', value: staff.staffCode },
    { label: 'Role', value: staff.role },
    { label: 'Dept', value: staff.department !== '-' ? staff.department : null },
  ].filter(r => r.value && r.value !== '-');

  infoRows.forEach(({ label, value }) => {
    const labelFontSize = label === 'ID No' ? 20 * s : 17 * s;
    const valueFontSize = label === 'ID No' ? 21.5 * s : 17 * s;
    const lText = `${label}: `;
    ctx.fillStyle = C.navy;
    ctx.font = `800 ${labelFontSize}px ${FONT_STACK}`;
    ctx.fillText(lText, infoStartX, infoY);
    const lw = ctx.measureText(lText).width;
    ctx.fillStyle = C.navy;
    ctx.font = `800 ${valueFontSize}px ${FONT_STACK}`;
    ctx.fillText(value, infoStartX + lw, infoY);
    infoY += label === 'ID No' ? 34 * s : 30 * s;
  });

  infoY += 6 * s;

  /* ── 6. QR CODE ── */
  ctx.globalAlpha = 1;
  const footerH = 44 * s;
  const footerY = H - footerH;
  const pad = 6 * s;
  const boxR = 10 * s;
  const gapAfterInfo = 8 * s;
  const gapAboveFooter = 8 * s;
  const scanTextH = 11 * s;
  const labelGapBelowBox = 24 * s;
  const maxQR = QR_CARD_PX * s;
  const minQR = 72 * s;

  const qrY = infoY + gapAfterInfo;
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
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 2 * s;
    rRect(ctx, qrX - pad, qrY - pad, qrPx + pad * 2, qrPx + pad * 2, boxR);
    ctx.stroke();

    const scanLabelY = qrY + qrPx + pad + labelGapBelowBox;
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.sub;
    ctx.font = `600 ${6.5 * s}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('SCAN FOR STAFF PROFILE', W / 2, scanLabelY);
  }

  /* ── 7. Amber footer ── */
  ctx.globalAlpha = 1;
  const gg = ctx.createLinearGradient(0, 0, W, 0);
  gg.addColorStop(0, C.amber);
  gg.addColorStop(1, C.amberLight);
  ctx.fillStyle = gg;
  ctx.fillRect(0, footerY, W, footerH);

  if (footerImg) {
    const fh = 34 * s;
    const fAsp = (footerImg.naturalWidth || 1) / (footerImg.naturalHeight || 1);
    const fw = Math.min(fh * fAsp, W * 0.72);
    ctx.drawImage(footerImg, W / 2 - fw / 2, footerY + 2 * s, fw, fh);
  }

  ctx.restore();
  return canvas;
}

/* ══════════════════════════════════════════════════════════════════════
   CardLogoImg
══════════════════════════════════════════════════════════════════════ */
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
   IDCardStaff — React DOM preview
══════════════════════════════════════════════════════════════════════ */
export function IDCardStaff({ staff, template, scale = 1 }) {
  const schoolTitle = (template?.school_name || staff.school || 'SCHOOL').toUpperCase();
  const schoolLogoSrc = resolveMediaUrl(template?.school_logo_url) || resolveMediaUrl(staff.school_logo_full);
  const schoolPhone = (template?.school_phone || staff.school_phone || '').trim();
  const photoOffsetX = Number(template?.photo_offset_x) || 0;
  const photoOffsetY = Number(template?.photo_offset_y) || 0;
  const photoZoom = Math.max(0.85, Math.min(2.2, Number(template?.photo_zoom) || 1));
  const qrImg = useMemo(() => getQrImageUrl(buildStaffQrPayload(staff)), [staff?.id]);

  const infoRows = [
    { label: 'ID No', value: staff.staffCode },
    { label: 'Role', value: staff.role },
    { label: 'Dept', value: staff.department !== '-' ? staff.department : null },
  ].filter(r => r.value && r.value !== '-');

  return (
    <div data-card-staff style={{
      width: CARD_PX.w * scale, height: CARD_PX.h * scale,
      transform: `scale(${scale})`, transformOrigin: 'top left',
      position: 'relative', borderRadius: 18, overflow: 'hidden',
      background: '#fff', fontFamily: FONT_STACK,
      boxShadow: scale >= 1 ? '0 24px 72px rgba(26,53,114,0.28),0 4px 16px rgba(0,0,0,0.15)' : 'none',
      flexShrink: 0,
    }}>
      {/* Teal top stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: `linear-gradient(90deg,${C.teal},#00897b)`, zIndex: 3 }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', zIndex: 2, padding: '16px 14px 0', paddingTop: 16 }}>
        {/* School logo */}
        <div style={{ width: 86, height: 86, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {schoolLogoSrc ? (
            <img src={schoolLogoSrc} alt="" style={{ width: 86, height: 86, objectFit: 'contain', borderRadius: 14 }} />
          ) : (
            <SchoolLogoSVG size={86} />
          )}
        </div>
        <div style={{ fontSize: 18.5, fontWeight: 900, color: C.navy, textAlign: 'center', lineHeight: 1.15, letterSpacing: 0.25, marginBottom: 2 }}>{schoolTitle}</div>
        {schoolPhone ? (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: C.sub, textAlign: 'center', lineHeight: 1.15, marginBottom: 6 }}>{schoolPhone}</div>
        ) : (
          <div style={{ marginBottom: 4 }} />
        )}

        {/* STAFF ID badge */}
        <div style={{ background: C.teal, color: '#fff', fontSize: 8.2, fontWeight: 800, letterSpacing: 1, padding: '4px 14px', borderRadius: 5, marginBottom: 14, textTransform: 'uppercase' }}>
          Staff Identity Card
        </div>

        {/* Photo */}
        <div style={{ position: 'relative', width: 172, height: 172, marginBottom: 12, flexShrink: 0 }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 172, height: 172, borderRadius: '50%', border: `3.5px solid ${C.teal}`, overflow: 'hidden', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3, boxSizing: 'border-box' }}>
            {staff.photo ? (
              <img src={staff.photo} alt="" style={{ width: `${photoZoom * 100}%`, height: `${photoZoom * 100}%`, objectFit: 'cover', objectPosition: 'center', transform: `translate(${photoOffsetX}px, ${photoOffsetY}px)` }} />
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

        {/* Info */}
        <div style={{ width: '100%', paddingLeft: 12, paddingRight: 12, zIndex: 4, position: 'relative', flexShrink: 0 }}>
          <div style={{ width: '100%', maxWidth: 288, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: C.navy, lineHeight: 1.2, marginTop: 4, marginBottom: 10 }}>{staff.fullName}</div>
            <div style={{ width: 'fit-content', margin: '0 auto', textAlign: 'left' }}>
              {infoRows.map(({ label, value }) => (
                <div key={label} style={{ fontSize: label === 'ID No' ? 21 : 17, color: C.navy, marginBottom: label === 'ID No' ? 10 : 9, lineHeight: 1.25 }}>
                  <span style={{ fontWeight: 800 }}>{label}: </span>
                  <span style={{ fontWeight: 800 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* QR */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginTop: 4, marginBottom: 4, flexShrink: 0, zIndex: 4 }}>
          <div style={{ borderRadius: 12, border: `2px solid ${C.teal}`, padding: 6, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {qrImg ? (
              <img src={qrImg} alt="QR" style={{ width: QR_CARD_PX, height: QR_CARD_PX, display: 'block', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: QR_CARD_PX, height: QR_CARD_PX, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontSize: 8, fontWeight: 700 }}>QR unavailable</div>
            )}
          </div>
          <span style={{ fontSize: 6.5, color: C.sub, letterSpacing: 0.4, fontWeight: 600, textTransform: 'uppercase' }}>Scan for staff profile</span>
        </div>

        {/* Footer */}
        <div style={{ alignSelf: 'stretch', marginLeft: -14, marginRight: -14, width: 'calc(100% + 28px)', boxSizing: 'border-box', borderTopLeftRadius: 14, borderTopRightRadius: 14, background: `linear-gradient(90deg,${C.amber},${C.amberLight})`, minHeight: 48, marginTop: 'auto', flexShrink: 0, zIndex: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 2 }}>
          <CardLogoImg maxWidth={205} height={34} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   useStaffCardExport
══════════════════════════════════════════════════════════════════════ */
export function useStaffCardExport(staff, template) {
  const [ready, setReady] = useState(false);
  const refs = useRef({ photo: null, logo: null, footer: null, qr: null });

  useEffect(() => {
    if (!staff) return;
    setReady(false);
    const dynamicSchoolLogo = resolveMediaUrl(template?.school_logo_url) || resolveMediaUrl(staff.school_logo_full);
    Promise.all([
      staff.photo ? loadImageCORS(staff.photo) : Promise.resolve(null),
      dynamicSchoolLogo ? loadImageCORS(dynamicSchoolLogo) : loadFirstAvailableImage(getShuleCardLogoCandidates()),
      loadFirstAvailableImage(getShuleCardLogoCandidates()),
      loadImageCORS(getQrImageUrl(buildStaffQrPayload(staff))),
    ]).then(([photo, logo, footer, qr]) => {
      refs.current = { photo, logo, footer, qr };
      setReady(true);
    });
  }, [staff?.id, staff?.photo, staff?.staffCode, staff?.fullName, staff?.role, staff?.school, staff?.school_logo_full, template?.school_logo_url]);

  const getCanvas = useCallback(() =>
    renderStaffCardToCanvas(staff, template, refs.current.photo, refs.current.logo, refs.current.footer, refs.current.qr),
    [staff, template]);

  const downloadPNG = useCallback(async () => {
    const canvas = await getCanvas();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `STAFF-${staff.staffCode}.png`;
    a.click(); URL.revokeObjectURL(a.href);
  }, [getCanvas, staff?.staffCode]);

  const downloadJPEG = useCallback(async () => {
    const canvas = await getCanvas();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `STAFF-${staff.staffCode}.jpg`;
    a.click(); URL.revokeObjectURL(a.href);
  }, [getCanvas, staff?.staffCode]);

  const downloadPDF = useCallback(async () => {
    const canvas = await getCanvas();
    const { jsPDF } = await import('jspdf');
    const pdfH = (85.6 * CARD_PX.h) / CARD_PX.w;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [85.6, pdfH] });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.97));
    const url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    pdf.addImage(url, 'JPEG', 0, 0, 85.6, pdfH);
    pdf.save(`STAFF-${staff.staffCode}.pdf`);
  }, [getCanvas, staff?.staffCode]);

  return { ready, downloadPNG, downloadJPEG, downloadPDF, getCanvas };
}

/* ══════════════════════════════════════════════════════════════════════
   bulkStaffDownloadZip
══════════════════════════════════════════════════════════════════════ */
export async function bulkStaffDownloadZip(staffList, template, onProgress) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder('staff-cards');
  const BATCH = 4;

  const footerImg = await loadFirstAvailableImage(getShuleCardLogoCandidates());

  let done = 0;
  for (let i = 0; i < staffList.length; i += BATCH) {
    await Promise.all(staffList.slice(i, i + BATCH).map(async staff => {
      const photoImg = staff.photo ? await loadImageCORS(staff.photo) : null;
      const dynamicSchoolLogo = resolveMediaUrl(template?.school_logo_url) || resolveMediaUrl(staff.school_logo_full);
      const logoImg = dynamicSchoolLogo ? await loadImageCORS(dynamicSchoolLogo) : await loadFirstAvailableImage(getShuleCardLogoCandidates());
      const qrSrc = getQrImageUrl(buildStaffQrPayload(staff));
      const qrImg = await loadImageCORS(qrSrc);
      const canvas = await renderStaffCardToCanvas(staff, template, photoImg, logoImg, footerImg, qrImg);
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      folder.file(`${staff.staffCode}_${staff.fullName.replace(/\s+/g, '_')}.png`, await blob.arrayBuffer());
      onProgress?.(++done, staffList.length);
    }));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlob);
  a.download = `staff-cards-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click(); URL.revokeObjectURL(a.href);
}

/* ══════════════════════════════════════════════════════════════════════
   StaffCardModal
══════════════════════════════════════════════════════════════════════ */
export function StaffCardModal({ staff, onClose }) {
  const [busy, setBusy] = useState(false);
  const [busyFmt, setBusyFmt] = useState(null);
  const [editor, setEditor] = useState({ photo_offset_x: 0, photo_offset_y: 0, photo_zoom: 1 });

  const editedTemplate = useMemo(() => ({ ...editor }), [editor]);
  const { ready, downloadPNG, downloadJPEG, downloadPDF } = useStaffCardExport(staff, editedTemplate);

  const run = async (fmt, fn) => { setBusy(true); setBusyFmt(fmt); try { await fn(); } finally { setBusy(false); setBusyFmt(null); } };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#0d1b38', borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, maxHeight: '96dvh', overflowY: 'auto', border: '1px solid rgba(0,137,123,0.35)', boxShadow: '0 40px 120px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ color: '#4db6ac', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>Staff ID Card</p>
            <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 900, margin: '4px 0 0' }}>{staff.fullName}</h3>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '3px 0 0' }}>{staff.role} {staff.department !== '-' ? `· ${staff.department}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {!ready && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader2 size={14} strokeWidth={2} style={{ flexShrink: 0, animation: 'sct2-spin 1s linear infinite' }} />
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
            <IDCardStaff staff={staff} template={editedTemplate} scale={1} />
          </div>
        </div>

        {/* Photo editor */}
        <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: '#4db6ac', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>Photo Editor</div>
          {[
            { label: 'Photo X', key: 'photo_offset_x', min: -40, max: 40, step: 1 },
            { label: 'Photo Y', key: 'photo_offset_y', min: -40, max: 40, step: 1 },
            { label: 'Photo Zoom', key: 'photo_zoom', min: 0.85, max: 2.2, step: 0.01 },
          ].map(({ label, key, min, max, step }) => (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{label}</label>
              <input type="range" min={min} max={max} step={step} value={editor[key]} onChange={e => setEditor(p => ({ ...p, [key]: Number(e.target.value) }))} />
            </div>
          ))}
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditor({ photo_offset_x: 0, photo_offset_y: 0, photo_zoom: 1 })}
              style={{ height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', padding: '0 10px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              Reset
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
          {[
            { label: 'PNG', fn: () => run('PNG', downloadPNG), fmt: 'PNG', bg: '#1a3572' },
            { label: 'JPEG', fn: () => run('JPEG', downloadJPEG), fmt: 'JPEG', bg: '#1e5128' },
            { label: 'PDF', fn: () => run('PDF', downloadPDF), fmt: 'PDF', bg: '#7f1d1d' },
          ].map(({ label, fn, fmt, bg }) => (
            <button key={fmt} type="button" onClick={fn} disabled={busy || !ready}
              style={{ height: 40, borderRadius: 10, border: 'none', background: bg, color: '#fff', fontWeight: 800, fontSize: 10, letterSpacing: 1, cursor: 'pointer', opacity: (busy && busyFmt !== fmt) || !ready ? 0.45 : 1 }}>
              {busy && busyFmt === fmt ? '…' : (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Download size={14} strokeWidth={2} />{label}
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
   SchoolStaffCardTemplate — main admin page
══════════════════════════════════════════════════════════════════════ */
export default function SchoolStaffCardTemplate() {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ province: '', district: '', sector: '', school_id: '', role: '' });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [schoolOpts, setSchoolOpts] = useState([]);
  const [roleOpts, setRoleOpts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [viewStaff, setViewStaff] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProg, setBulkProg] = useState({ done: 0, total: 0 });
  const [notif, setNotif] = useState(null);

  const showNotif = (msg, type = 'success') => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 5000); };

  useEffect(() => { fetch(`${API}/locations/provinces`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setProvinces(j.data || []); }).catch(() => {}); }, []);
  useEffect(() => { if (!filters.province) { setDistricts([]); return; } fetch(`${API}/locations/districts?province=${encodeURIComponent(filters.province)}`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setDistricts(j.data || []); }).catch(() => {}); }, [filters.province]);
  useEffect(() => { if (!filters.province || !filters.district) { setSectors([]); return; } const p = new URLSearchParams({ province: filters.province, district: filters.district }); fetch(`${API}/locations/sectors?${p}`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setSectors(j.data || []); }).catch(() => {}); }, [filters.province, filters.district]);
  useEffect(() => { const p = new URLSearchParams(); if (filters.province) p.set('province', filters.province); if (filters.district) p.set('district', filters.district); if (filters.sector) p.set('sector', filters.sector); fetch(`${API}/student-cards/filters/schools?${p}`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setSchoolOpts(j.data || []); }).catch(() => {}); }, [filters.province, filters.district, filters.sector]);
  useEffect(() => { fetch(`${API}/staff/filters/roles`, { credentials: 'include' }).then(r => r.json()).then(j => { if (j.success) setRoleOpts(j.data || []); }).catch(() => {}); }, []);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.province) p.set('province', filters.province);
      if (filters.district) p.set('district', filters.district);
      if (filters.sector) p.set('sector', filters.sector);
      if (filters.school_id) p.set('school_id', filters.school_id);
      if (filters.role) p.set('role', filters.role);
      if (search.trim()) p.set('q', search.trim());
      p.set('limit', '500');
      const res = await fetch(`${API}/staff?${p}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed');
      setStaffList((json.data || []).map(mapRowToStaff));
      setSelected([]);
    } catch (e) { showNotif(e.message || 'Load failed', 'error'); setStaffList([]); }
    finally { setLoading(false); }
  }, [filters, search]);

  useEffect(() => { loadStaff(); }, []); // eslint-disable-line

  const setF = key => e => {
    const val = e.target.value;
    setFilters(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'province') { next.district = ''; next.sector = ''; next.school_id = ''; next.role = ''; }
      if (key === 'district') { next.sector = ''; next.school_id = ''; next.role = ''; }
      if (key === 'sector') { next.school_id = ''; next.role = ''; }
      if (key === 'school_id') { next.role = ''; }
      return next;
    });
  };

  const allSel = staffList.length > 0 && selected.length === staffList.length;
  const toggleAll = () => setSelected(allSel ? [] : staffList.map(s => s.id));
  const toggleOne = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleBulkZip = async () => {
    const targets = staffList.filter(s => selected.length === 0 || selected.includes(s.id));
    if (!targets.length) return;
    setBulkBusy(true); setBulkProg({ done: 0, total: targets.length });
    try {
      await bulkStaffDownloadZip(targets, null, (done, total) => setBulkProg({ done, total }));
      showNotif(`Downloaded ${targets.length} staff cards as ZIP`);
    } catch (e) { showNotif(e.message || 'ZIP failed', 'error'); }
    finally { setBulkBusy(false); setBulkProg({ done: 0, total: 0 }); }
  };

  const S = {
    page: { minHeight: '100vh', background: 'linear-gradient(165deg,#040d1e 0%,#071635 55%,#040d1e 100%)', color: '#fff', fontFamily: "'Segoe UI',system-ui,sans-serif" },
    topbar: { background: 'rgba(10,22,56,0.92)', borderBottom: '1px solid rgba(0,137,123,0.25)', padding: '0 22px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 200, backdropFilter: 'blur(12px)' },
    wrap: { maxWidth: 1280, margin: '0 auto', padding: '22px 16px' },
    panel: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 18 },
    sel: { height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#fff', padding: '0 12px', fontSize: 12, outline: 'none', cursor: 'pointer', minWidth: 150 },
    btn: (bg, col = '#fff') => ({ height: 38, borderRadius: 10, border: 'none', background: bg, color: col, fontWeight: 700, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', cursor: 'pointer', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }),
    th: { padding: '10px 14px', fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.38)', borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap' },
    td: { padding: '12px 14px', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.05)', verticalAlign: 'middle' },
  };

  return (
    <div style={S.page}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:rgba(255,255,255,0.03)}::-webkit-scrollbar-thumb{background:rgba(0,137,123,0.3);border-radius:4px}select option{background:#0d1b38;color:#fff}@keyframes sct2-spin{to{transform:rotate(360deg)}}.sct2-spin{display:inline-block;animation:sct2-spin 1s linear infinite}`}</style>

      {notif && (
        <div style={{ position: 'fixed', top: 14, right: 14, zIndex: 2000, background: notif.type === 'error' ? '#7f1d1d' : '#14532d', border: `1px solid ${notif.type === 'error' ? '#ef4444' : '#22c55e'}`, borderRadius: 12, padding: '12px 20px', color: '#fff', fontSize: 13, fontWeight: 600, maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {notif.type === 'success' ? <Check size={18} strokeWidth={2} style={{ flexShrink: 0 }} /> : null}
          <span>{notif.msg}</span>
        </div>
      )}

      {viewStaff && <StaffCardModal staff={viewStaff} onClose={() => setViewStaff(null)} />}

      <div style={S.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#00695c,#00897b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <IdCard size={20} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: 8, color: '#4db6ac', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }}>Super Admin</div>
            <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: -0.3 }}>Staff Card · Portrait Template</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={() => navigate('/superadmin/dashboard')}
            style={{ height: 34, borderRadius: 10, border: '1px solid rgba(0,137,123,0.4)', background: 'linear-gradient(135deg,rgba(0,137,123,0.22),rgba(0,137,123,0.1))', color: '#4db6ac', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', cursor: 'pointer' }}>
            <ArrowLeft size={14} strokeWidth={2} />
            Back to dashboard
          </button>
        </div>
      </div>

      <div style={S.wrap}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 22 }}>
          {[
            { label: 'Staff loaded', val: staffList.length, Icon: Users, a: '#00695c' },
            { label: 'With photos', val: staffList.filter(x => x.photo).length, Icon: UserRound, a: '#1e5128' },
            { label: 'Schools', val: schoolOpts.length, Icon: School, a: '#7c3aed' },
            { label: 'For ZIP', val: selected.length || staffList.length, Icon: Download, a: '#c2410c' },
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
          <div style={{ fontSize: 10, color: '#4db6ac', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Filters</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <select value={filters.province} onChange={setF('province')} style={{ ...S.sel, minWidth: 170 }}><option value="">All provinces</option>{provinces.map(x => <option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.district} onChange={setF('district')} disabled={!filters.province} style={{ ...S.sel, minWidth: 150, opacity: filters.province ? 1 : 0.55 }}><option value="">All districts</option>{districts.map(x => <option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.sector} onChange={setF('sector')} disabled={!filters.district} style={{ ...S.sel, minWidth: 150, opacity: filters.district ? 1 : 0.55 }}><option value="">All sectors</option>{sectors.map(x => <option key={x} value={x}>{x}</option>)}</select>
            <select value={filters.school_id} onChange={setF('school_id')} style={{ ...S.sel, minWidth: 220 }}><option value="">All schools</option>{schoolOpts.map(sc => <option key={sc.id} value={String(sc.id)}>{sc.school_name}</option>)}</select>
            <select value={filters.role} onChange={setF('role')} disabled={!filters.school_id} style={{ ...S.sel, minWidth: 150, opacity: filters.school_id ? 1 : 0.55 }}><option value="">All roles</option>{roleOpts.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <button type="button" onClick={() => setFilters({ province: '', district: '', sector: '', school_id: '', role: '' })} style={S.btn('rgba(255,255,255,0.08)')}>Clear</button>
          </div>
        </div>

        {/* Search + actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.35, pointerEvents: 'none', display: 'flex' }}>
              <Search size={16} strokeWidth={2} color="rgba(255,255,255,0.9)" />
            </span>
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadStaff()} placeholder="Search name or staff code…" style={{ ...S.sel, width: '100%', paddingLeft: 36, height: 40, boxSizing: 'border-box' }} />
          </div>
          <button type="button" onClick={loadStaff} disabled={loading} style={S.btn('linear-gradient(135deg,#00695c,#004d40)')}>
            {loading ? 'Loading…' : 'Apply filters'}
          </button>
          {staffList.length > 0 && (
            <button type="button" onClick={handleBulkZip} disabled={bulkBusy}
              style={{ ...S.btn('linear-gradient(135deg,#2e7d32,#43a047)'), minWidth: 190 }}>
              {bulkBusy ? `${bulkProg.done}/${bulkProg.total} rendering…` : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} strokeWidth={2} />
                  ZIP {selected.length > 0 ? selected.length : staffList.length} cards
                </span>
              )}
            </button>
          )}
          {selected.length > 0 && <>
            <span style={{ fontSize: 11, color: '#4db6ac', fontWeight: 700 }}>{selected.length} selected</span>
            <button type="button" onClick={() => setSelected([])} style={S.btn('rgba(255,255,255,0.08)')}>Clear sel.</button>
          </>}
        </div>

        {/* Progress */}
        {bulkBusy && bulkProg.total > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#00695c,#4db6ac)', width: `${Math.round(bulkProg.done / bulkProg.total * 100)}%`, transition: 'width 0.2s' }} />
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Rendering {bulkProg.done}/{bulkProg.total} cards</p>
          </div>
        )}

        {/* Table */}
        <div style={{ ...S.panel, overflowX: 'auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 14px' }}>Staff ID Cards <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginLeft: 10 }}>({staffList.length} loaded)</span></h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={S.th}><input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: '#4db6ac' }} /></th>
                <th style={S.th}>Photo</th>
                <th style={S.th}>Staff</th>
                <th style={S.th}>Role / Dept</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>School</th>
                <th style={{ ...S.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.length === 0 ? (
                <tr><td colSpan={7} style={{ ...S.td, textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.3)' }}>{loading ? 'Loading…' : 'No staff found. Adjust filters and click Apply.'}</td></tr>
              ) : staffList.map(st => {
                const isActive = String(st.status || '').toLowerCase() !== 'inactive';
                return (
                  <tr key={st.id} style={{ background: selected.includes(st.id) ? 'rgba(0,137,123,0.07)' : 'transparent' }}>
                    <td style={S.td}><input type="checkbox" checked={selected.includes(st.id)} onChange={() => toggleOne(st.id)} style={{ cursor: 'pointer', accentColor: '#4db6ac' }} /></td>
                    <td style={S.td}>
                      <div style={{ width: 40, height: 50, borderRadius: 8, border: '2px solid #00695c', overflow: 'hidden', background: '#1a2a45', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {st.photo ? <img src={st.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ opacity: 0.45, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserRound size={22} strokeWidth={1.75} color="#4db6ac" /></span>}
                      </div>
                    </td>
                    <td style={S.td}>
                      <p style={{ fontWeight: 800, color: '#fff', margin: 0 }}>{st.fullName}</p>
                      <p style={{ fontSize: 10, color: '#4db6ac', margin: '4px 0 0', fontFamily: 'ui-monospace,monospace' }}>{st.staffCode}</p>
                    </td>
                    <td style={S.td}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{st.role}</div>
                      {st.department && st.department !== '-' && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{st.department}</div>}
                    </td>
                    <td style={S.td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: isActive ? 'rgba(46,125,50,0.18)' : 'rgba(198,40,40,0.18)', border: `1px solid ${isActive ? '#2e7d32' : '#c62828'}`, fontSize: 10, fontWeight: 800, color: isActive ? '#4ade80' : '#f87171' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#22c55e' : '#ef4444' }} />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{st.school}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 4, maxWidth: 280 }}>{st.addressSummary}</div>
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      <button type="button" onClick={() => setViewStaff(st)} style={S.btn('#00695c')}>View card</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Preview grid */}
        {staffList.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>Preview (first 6)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 18 }}>
              {staffList.slice(0, 6).map(st => (
                <button key={st.id} type="button" onClick={() => setViewStaff(st)}
                  style={{ cursor: 'pointer', borderRadius: 16, overflow: 'hidden', border: 'none', padding: 0, textAlign: 'left', background: 'transparent', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', height: 362, overflow: 'hidden', background: 'rgba(0,0,0,0.12)', borderRadius: '16px 16px 0 0', pointerEvents: 'none' }}>
                    <div style={{ transform: 'scale(0.52)', transformOrigin: 'top center' }}>
                      <IDCardStaff staff={st} template={null} scale={1} />
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,105,92,0.28)', border: '1px solid rgba(0,137,123,0.2)', borderTop: 'none', borderRadius: '0 0 16px 16px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#fff' }}>{st.fullName}</p>
                      <p style={{ margin: 0, fontSize: 9, color: '#4db6ac', fontFamily: 'monospace' }}>{st.role}</p>
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
            Staff Card Template · Canvas renderer · QR fixed · ZIP bulk export
          </p>
        </div>
      </div>
    </div>
  );
}