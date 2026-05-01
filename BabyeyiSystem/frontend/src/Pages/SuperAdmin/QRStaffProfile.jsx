/**
 * QRStaffProfile.jsx
 * Public staff profile page — opened via QR code scan (no login required)
 *
 * Route: /staff/:staffId
 *     or /staff?staff=:id
 *
 * Shows: Profile picture, Full name, Staff ID, Role, Department,
 *        Phone, Status (Active/Inactive), and School info with logo.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  ExternalLink,
  Globe,
  IdCard,
  Lock,
  Mail,
  MapPin,
  Phone,
  School,
  ShieldCheck,
  User,
  UserRound,
  VenusAndMars,
  Wifi,
  WifiOff,
} from 'lucide-react';

/* ─── Config ──────────────────────────────────────────────────────── */
const API_ROOT     = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)      || 'http://localhost:5100';
const API          = `${API_ROOT.replace(/\/$/, '')}/api`;
const UPLOADS_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_UPLOADS_BASE) || API_ROOT.replace(/\/$/, '');
const PUBLIC_SITE  = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL) || 'https://babyeyi.rw';

function getFrontendOrigin() {
  const envOrigin = String(PUBLIC_SITE || '').trim();
  if (envOrigin) return envOrigin.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://babyeyi.rw';
}

const PUBLIC_SITE_URL = getFrontendOrigin();
const ICON_SIZE = 16;
const ICON_STROKE = 1.75;

/* ─── Helpers ─────────────────────────────────────────────────────── */
function getStaffIdFromSearchAndHash() {
  const search = new URLSearchParams(window.location.search);
  const fromSearch = search.get('staff') || search.get('id');
  if (fromSearch) return fromSearch.trim();
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.includes('=')) {
    const h = new URLSearchParams(hash.startsWith('?') ? hash.slice(1) : hash);
    const fromHash = h.get('staff') || h.get('id');
    if (fromHash) return fromHash.trim();
  }
  return null;
}

function formatWebsite(w) {
  return w ? String(w).replace(/^https?:\/\//i, '').trim() : '';
}

function mapRowToStaff(row) {
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
    email: row.email || row.staff_email || '',
    status: row.status || 'Active',
    joinYear: row.join_year || row.created_at?.slice(0, 4) || '-',
    photo: photoRel ? `${UPLOADS_BASE}${photoRel}` : null,
    school: row.school_name || '-',
    province: row.province || '',
    district: row.district || '',
    sector: row.sector || '',
    schoolLogo: row.logo_url ? `${UPLOADS_BASE}${row.logo_url}` : null,
    schoolPhone: row.school_phone ? String(row.school_phone).trim() : '',
    schoolEmail: row.school_email ? String(row.school_email).trim() : '',
    website: formatWebsite(row.school_website || ''),
    postalAddress: row.postal_address ? String(row.postal_address).trim() : '',
    addressSummary: [row.postal_address, loc].filter(Boolean).join(' · ') || '—',
  };
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function QRStaffProfile() {
  const { staffId: idFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const [staff,    setStaff]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [imgError, setImgError] = useState(false);
  const [entered,  setEntered]  = useState(false);

  const resolveStaffId = useCallback(() => {
    const a = idFromPath && String(idFromPath).trim();
    if (a) return a;
    const q = searchParams.get('staff') || searchParams.get('id');
    if (q) return q.trim();
    return getStaffIdFromSearchAndHash();
  }, [idFromPath, searchParams]);

  const fetchStaff = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/staff/public/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Staff member not found. This QR code may be invalid or expired.');
        if (res.status === 400) throw new Error('Invalid staff link. Ask your school to reprint the ID card QR.');
        throw new Error(`Server error (${res.status}). Please try again.`);
      }
      const json = await res.json();
      if (!json.success && !json.data && !json.staff) throw new Error(json.message || 'Could not load staff data.');
      const raw = json.data || json.staff || json;
      setStaff(mapRowToStaff(raw));
      setTimeout(() => setEntered(true), 60);
    } catch (e) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = resolveStaffId();
    if (!id) {
      setError('No staff ID in this link. Re-scan the QR on the ID card.');
      setLoading(false);
      return;
    }
    fetchStaff(id);
  }, [fetchStaff, resolveStaffId]);

  return (
    <>
      <style>{CSS}</style>
      <div className="qrs-root">
        {/* Ambient orbs */}
        <div className="qrs-orb qrs-orb1" />
        <div className="qrs-orb qrs-orb2" />
        <div className="qrs-orb qrs-orb3" />

        {/* Header */}
        <header className="qrs-header">
          <div className="qrs-header-inner">
            <div className="qrs-brand-badge">
              <span className="qrs-brand-icon"><BabyeyiLogoMark /></span>
              <span className="qrs-brand-name">Babyeyi System</span>
            </div>
            <div className="qrs-header-tag">Staff Verification Portal</div>
          </div>
        </header>

        <main className="qrs-main">
          {loading  && <LoadingState />}
          {error    && !loading && <ErrorState message={error} />}
          {staff    && !loading && <ProfileCard staff={staff} entered={entered} imgError={imgError} setImgError={setImgError} />}
        </main>

        <footer className="qrs-footer">
          <p className="qrs-footer-text">
            <Lock size={ICON_SIZE} strokeWidth={ICON_STROKE} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Official record · Babyeyi Rwanda School Management System ·{' '}
            <a href={PUBLIC_SITE_URL} className="qrs-footer-link">{PUBLIC_SITE_URL.replace(/^https?:\/\//, '')}</a>
          </p>
        </footer>
      </div>
    </>
  );
}

/* ─── Brand mark ──────────────────────────────────────────────────── */
function BabyeyiLogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="6" fill="url(#qrs-grad)" stroke="#4db6ac" strokeWidth="1.2" />
      <path d="M7.2 6.8h6.9c2.25 0 3.45 1.08 3.45 2.84 0 1.22-.73 2.08-1.86 2.44 1.35.31 2.2 1.34 2.2 2.82 0 2.12-1.63 3.5-4.25 3.5H7.2V6.8Zm5.92 4.62c1.02 0 1.53-.43 1.53-1.16 0-.75-.51-1.15-1.53-1.15H10.2v2.31h2.92Zm.35 4.65c1.1 0 1.67-.45 1.67-1.26 0-.79-.57-1.23-1.67-1.23H10.2v2.49h3.27Z" fill="#0A1628" />
      <defs>
        <linearGradient id="qrs-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00897b" />
          <stop offset="1" stopColor="#4db6ac" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ─── Loading ──────────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="qrs-state-wrap">
      <div className="qrs-loader">
        <div className="qrs-spinner" />
        <div className="qrs-spinner qrs-spinner2" />
      </div>
      <p className="qrs-state-title">Verifying staff member…</p>
      <p className="qrs-state-sub">Fetching official records securely</p>
    </div>
  );
}

/* ─── Error ───────────────────────────────────────────────────────── */
function ErrorState({ message }) {
  return (
    <div className="qrs-state-wrap">
      <div className="qrs-error-icon"><AlertTriangle size={48} strokeWidth={1.5} color="#f87171" /></div>
      <p className="qrs-state-title">Profile Unavailable</p>
      <p className="qrs-state-sub">{message}</p>
      <a href={PUBLIC_SITE_URL} className="qrs-back-btn">Visit Babyeyi Portal →</a>
    </div>
  );
}

/* ─── Main profile card ───────────────────────────────────────────── */
function ProfileCard({ staff, entered, imgError, setImgError }) {
  const isActive = String(staff.status || '').toLowerCase() !== 'inactive';

  const identityItems = [
    { icon: IdCard,        label: 'Staff Code',   value: staff.staffCode,  mono: true, accent: true },
    { icon: Briefcase,     label: 'Role',          value: staff.role },
    { icon: Building2,     label: 'Department',    value: staff.department !== '-' ? staff.department : null },
    { icon: VenusAndMars,  label: 'Gender',        value: staff.gender !== '-' ? staff.gender : null },
    { icon: CalendarClock, label: 'Joined',        value: staff.joinYear !== '-' ? staff.joinYear : null },
    { icon: Phone,         label: 'Phone',         value: staff.phone, href: staff.phone ? `tel:${staff.phone}` : null },
    { icon: Mail,          label: 'Email',         value: staff.email, href: staff.email ? `mailto:${staff.email}` : null },
  ].filter(i => i.value && i.value !== '-');

  const schoolItems = [
    { icon: School,  label: 'School',    value: staff.school },
    { icon: MapPin,  label: 'Location',  value: staff.addressSummary },
    { icon: Phone,   label: 'School Phone', value: staff.schoolPhone, href: staff.schoolPhone ? `tel:${staff.schoolPhone}` : null },
    { icon: Mail,    label: 'School Email', value: staff.schoolEmail,  href: staff.schoolEmail ? `mailto:${staff.schoolEmail}` : null },
    { icon: Globe,   label: 'Website',   value: staff.website, href: staff.website ? `https://${staff.website}` : null },
  ].filter(i => i.value);

  return (
    <div className={`qrs-card-outer ${entered ? 'qrs-entered' : ''}`}>

      {/* ── Hero ── */}
      <div className="qrs-hero">
        {/* Teal accent bar */}
        <div className="qrs-hero-bar" />

        {/* School logo */}
        {staff.schoolLogo && (
          <div className="qrs-school-logo-wrap">
            <img src={staff.schoolLogo} alt="School" className="qrs-school-logo" />
          </div>
        )}

        {/* Status badge */}
        <div className={`qrs-status-badge ${isActive ? 'qrs-status-active' : 'qrs-status-inactive'}`}>
          {isActive ? <Wifi size={12} strokeWidth={2} /> : <WifiOff size={12} strokeWidth={2} />}
          {isActive ? 'Active Staff' : 'Inactive'}
        </div>

        {/* Photo */}
        <div className="qrs-photo-ring">
          <div className="qrs-photo-ring-inner">
            {staff.photo && !imgError ? (
              <img src={staff.photo} alt={staff.fullName} className="qrs-photo" onError={() => setImgError(true)} />
            ) : (
              <div className="qrs-photo-placeholder">
                <UserRound size={52} strokeWidth={1.25} />
              </div>
            )}
          </div>
        </div>

        {/* Name + role */}
        <h1 className="qrs-name">{staff.fullName}</h1>
        <div className="qrs-role-tag">{staff.role}</div>
        {staff.department && staff.department !== '-' && (
          <div className="qrs-dept-tag">{staff.department}</div>
        )}
        <p className="qrs-school-name">{staff.school}</p>

        {/* Pills */}
        <div className="qrs-pills">
          <span className={`qrs-pill ${isActive ? 'qrs-pill-green' : 'qrs-pill-red'}`}>
            <span className="qrs-pill-dot" style={{ background: isActive ? '#22c55e' : '#ef4444' }} />
            {staff.status || (isActive ? 'Active' : 'Inactive')}
          </span>
          {staff.gender && staff.gender !== '-' && <span className="qrs-pill qrs-pill-slate">{staff.gender}</span>}
          {staff.joinYear && staff.joinYear !== '-' && <span className="qrs-pill qrs-pill-teal">Since {staff.joinYear}</span>}
        </div>
      </div>

      {/* ── Identity section ── */}
      <div className="qrs-section">
        <div className="qrs-section-header">
          <span className="qrs-section-icon"><User size={ICON_SIZE} strokeWidth={ICON_STROKE} /></span>
          <span className="qrs-section-label">Staff Identity</span>
        </div>
        <div className="qrs-info-grid">
          {identityItems.map(({ icon: Icon, label, value, mono, accent, href }) => (
            <div key={label} className={`qrs-info-row ${accent ? 'qrs-info-row-accent' : ''}`}>
              <div className="qrs-info-icon"><Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
              <div className="qrs-info-content">
                <div className="qrs-info-label">{label}</div>
                {href ? (
                  <a href={href} className="qrs-info-link">{value}</a>
                ) : (
                  <div className={`qrs-info-value ${mono ? 'qrs-mono' : ''}`}>{value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── School section ── */}
      <div className="qrs-section">
        <div className="qrs-section-header">
          <span className="qrs-section-icon"><School size={ICON_SIZE} strokeWidth={ICON_STROKE} /></span>
          <span className="qrs-section-label">School Details</span>
        </div>
        <div className="qrs-info-grid">
          {schoolItems.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="qrs-info-row">
              <div className="qrs-info-icon"><Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} /></div>
              <div className="qrs-info-content">
                <div className="qrs-info-label">{label}</div>
                {href ? (
                  <a href={href} className="qrs-info-link">{value}</a>
                ) : (
                  <div className="qrs-info-value">{value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Verification stamp ── */}
      <div className="qrs-stamp">
        <div className="qrs-stamp-inner">
          <div className="qrs-stamp-left">
            <div className="qrs-stamp-seal"><BadgeCheck size={28} strokeWidth={1.5} color="#4db6ac" /></div>
            <div>
              <div className="qrs-stamp-title">Verified Staff Member</div>
              <div className="qrs-stamp-sub">Babyeyi Rwanda School System</div>
            </div>
          </div>
          <div className="qrs-stamp-id">
            <div className="qrs-stamp-id-label">Staff ID</div>
            <div className="qrs-stamp-id-val">{staff.staffCode}</div>
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="qrs-actions">
        <a href={PUBLIC_SITE_URL} className="qrs-action-btn qrs-action-primary">
          <Globe size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          Visit School Portal
          <ExternalLink size={ICON_SIZE} strokeWidth={ICON_STROKE} />
        </a>
        {staff.schoolPhone && (
          <a href={`tel:${staff.schoolPhone}`} className="qrs-action-btn qrs-action-secondary">
            <Phone size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            Contact School
          </a>
        )}
        {staff.phone && (
          <a href={`tel:${staff.phone}`} className="qrs-action-btn qrs-action-secondary">
            <Phone size={ICON_SIZE} strokeWidth={ICON_STROKE} />
            Contact Staff
          </a>
        )}
      </div>

      {/* ── Note ── */}
      <div className="qrs-note">
        <span className="qrs-note-icon"><ShieldCheck size={ICON_SIZE} strokeWidth={ICON_STROKE} /></span>
        This profile is publicly accessible via an official QR code issued on the staff member's ID card.
        Information is verified and managed by the registered school through the Babyeyi system.
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CSS — mobile-first, teal theme, luxury card
═══════════════════════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:        #0a1628;
    --navy-mid:    #0f2044;
    --teal:        #00695c;
    --teal-mid:    #00897b;
    --teal-light:  #4db6ac;
    --teal-pale:   rgba(0,137,123,0.12);
    --amber:       #FFBF00;
    --white:       #ffffff;
    --text:        #f0f4ff;
    --text-muted:  rgba(240,244,255,0.55);
    --text-faint:  rgba(240,244,255,0.28);
    --border:      rgba(0,137,123,0.2);
    --card-bg:     rgba(8,20,50,0.76);
    --glass:       rgba(255,255,255,0.04);
    --radius:      24px;
    --radius-sm:   14px;
    --font:        'DM Sans', system-ui, sans-serif;
    --font-display:'Playfair Display', Georgia, serif;
    --font-mono:   'DM Mono', monospace;
  }

  html, body { height: 100%; }

  .qrs-root {
    min-height: 100vh;
    background: var(--navy);
    font-family: var(--font);
    color: var(--text);
    position: relative;
    overflow-x: hidden;
  }

  /* ── Ambient orbs ── */
  .qrs-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
  }
  .qrs-orb1 {
    width: 500px; height: 500px;
    background: radial-gradient(circle, rgba(0,137,123,0.16) 0%, transparent 70%);
    top: -150px; right: -150px;
    animation: qrsFloat1 14s ease-in-out infinite;
  }
  .qrs-orb2 {
    width: 380px; height: 380px;
    background: radial-gradient(circle, rgba(26,53,114,0.45) 0%, transparent 70%);
    bottom: 5%; left: -100px;
    animation: qrsFloat2 18s ease-in-out infinite;
  }
  .qrs-orb3 {
    width: 280px; height: 280px;
    background: radial-gradient(circle, rgba(0,105,92,0.14) 0%, transparent 70%);
    top: 45%; right: -80px;
    animation: qrsFloat1 22s ease-in-out infinite reverse;
  }
  @keyframes qrsFloat1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(-30px,20px) scale(1.05); }
    66%      { transform: translate(20px,-15px) scale(0.97); }
  }
  @keyframes qrsFloat2 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(40px,-30px) scale(1.08); }
  }

  /* ── Header ── */
  .qrs-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10,22,40,0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }
  .qrs-header-inner {
    max-width: 560px;
    margin: 0 auto;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .qrs-brand-badge {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .qrs-brand-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 8px rgba(0,137,123,0.5));
  }
  .qrs-brand-name {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.3px;
    background: linear-gradient(135deg, var(--teal-light), #80cbc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .qrs-header-tag {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* ── Main ── */
  .qrs-main {
    position: relative;
    z-index: 1;
    min-height: calc(100vh - 120px);
    padding: 28px 16px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ── State screens ── */
  .qrs-state-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 55vh;
    gap: 16px;
    text-align: center;
    padding: 32px 24px;
    max-width: 380px;
  }
  .qrs-loader {
    position: relative;
    width: 64px; height: 64px;
    margin-bottom: 8px;
  }
  .qrs-spinner {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: var(--teal-light);
    animation: qrsSpin 1s linear infinite;
  }
  .qrs-spinner2 {
    inset: 10px;
    border-top-color: var(--amber);
    animation-duration: 0.7s;
    animation-direction: reverse;
  }
  @keyframes qrsSpin { to { transform: rotate(360deg); } }

  .qrs-error-icon { margin-bottom: 8px; }
  .qrs-state-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
  }
  .qrs-state-sub {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .qrs-back-btn {
    display: inline-block;
    margin-top: 8px;
    padding: 12px 24px;
    border-radius: 50px;
    background: linear-gradient(135deg, var(--teal-mid), var(--teal-light));
    color: var(--white);
    font-weight: 800;
    font-size: 13px;
    text-decoration: none;
    letter-spacing: 0.3px;
    box-shadow: 0 8px 24px rgba(0,137,123,0.35);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .qrs-back-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,137,123,0.5); }

  /* ── Profile card ── */
  .qrs-card-outer {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    opacity: 0;
    transform: translateY(32px) scale(0.98);
    transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1);
  }
  .qrs-card-outer.qrs-entered {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  /* ── Hero ── */
  .qrs-hero {
    position: relative;
    background: linear-gradient(165deg, #0a2240 0%, #0d3050 50%, #082030 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius) var(--radius) 0 0;
    padding: 0 24px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    overflow: hidden;
  }

  /* Teal top accent bar */
  .qrs-hero-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
    background: linear-gradient(90deg, var(--teal), var(--teal-light), var(--teal));
  }

  .qrs-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% -10%, rgba(0,137,123,0.22) 0%, transparent 65%);
    pointer-events: none;
  }
  .qrs-hero::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0,137,123,0.45), transparent);
  }

  /* School logo */
  .qrs-school-logo-wrap {
    position: absolute;
    top: 18px; right: 18px;
    width: 52px; height: 52px;
    border-radius: 13px;
    overflow: hidden;
    border: 1.5px solid rgba(0,137,123,0.4);
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }
  .qrs-school-logo { width: 100%; height: 100%; object-fit: contain; }

  /* Status badge */
  .qrs-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 50px;
    padding: 5px 14px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-top: 22px;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }
  .qrs-status-active {
    background: rgba(34,197,94,0.12);
    border: 1px solid rgba(34,197,94,0.35);
    color: #4ade80;
  }
  .qrs-status-inactive {
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.35);
    color: #f87171;
  }

  /* Photo ring */
  .qrs-photo-ring {
    position: relative;
    width: 136px; height: 136px;
    border-radius: 50%;
    padding: 4px;
    background: conic-gradient(from 0deg, var(--teal) 0%, var(--teal-light) 35%, #80cbc4 70%, var(--teal) 100%);
    margin-bottom: 18px;
    box-shadow: 0 0 0 6px rgba(0,137,123,0.14), 0 20px 60px rgba(0,0,0,0.5);
    animation: qrsRingRotate 10s linear infinite;
    z-index: 1;
  }
  @keyframes qrsRingRotate {
    to { filter: hue-rotate(30deg); }
  }
  .qrs-photo-ring-inner {
    width: 100%; height: 100%;
    border-radius: 50%;
    overflow: hidden;
    background: var(--navy-mid);
    border: 3px solid var(--navy);
  }
  .qrs-photo {
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: center top;
  }
  .qrs-photo-placeholder {
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(0,137,123,0.45);
    background: linear-gradient(135deg, #0a2240, #0d3050);
  }

  .qrs-name {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 900;
    color: var(--white);
    letter-spacing: -0.5px;
    line-height: 1.2;
    margin-bottom: 8px;
    position: relative;
    z-index: 1;
  }
  .qrs-role-tag {
    display: inline-block;
    background: linear-gradient(135deg, var(--teal), var(--teal-mid));
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    padding: 4px 14px;
    border-radius: 6px;
    margin-bottom: 6px;
    position: relative;
    z-index: 1;
  }
  .qrs-dept-tag {
    font-size: 12.5px;
    color: var(--teal-light);
    font-weight: 600;
    margin-bottom: 6px;
    position: relative;
    z-index: 1;
  }
  .qrs-school-name {
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
    letter-spacing: 0.2px;
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }

  .qrs-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    position: relative;
    z-index: 1;
  }
  .qrs-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 13px;
    border-radius: 50px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.4px;
  }
  .qrs-pill-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .qrs-pill-green { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
  .qrs-pill-red   { background: rgba(239,68,68,0.12);  border: 1px solid rgba(239,68,68,0.3);  color: #f87171; }
  .qrs-pill-teal  { background: rgba(0,137,123,0.18);  border: 1px solid rgba(0,137,123,0.4);  color: var(--teal-light); }
  .qrs-pill-slate { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.7); }

  /* ── Sections ── */
  .qrs-section {
    background: var(--card-bg);
    backdrop-filter: blur(24px);
    border: 1px solid var(--border);
    border-top: none;
    padding: 22px 20px 20px;
  }

  .qrs-section-header {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .qrs-section-icon { font-size: 16px; color: var(--teal-light); }
  .qrs-section-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: var(--teal-light);
  }

  .qrs-info-grid { display: flex; flex-direction: column; gap: 4px; }
  .qrs-info-row {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 11px 14px;
    border-radius: var(--radius-sm);
    background: var(--glass);
    transition: background 0.2s;
  }
  .qrs-info-row:hover { background: rgba(255,255,255,0.07); }
  .qrs-info-row-accent {
    background: var(--teal-pale);
    border: 1px solid rgba(0,137,123,0.25);
  }
  .qrs-info-row-accent:hover { background: rgba(0,137,123,0.18); }

  .qrs-info-icon {
    color: var(--teal-light);
    margin-top: 1px;
    flex-shrink: 0;
    width: 24px;
    text-align: center;
  }
  .qrs-info-content { flex: 1; min-width: 0; }
  .qrs-info-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 3px;
  }
  .qrs-info-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    word-break: break-word;
  }
  .qrs-mono {
    font-family: var(--font-mono);
    font-size: 13.5px;
    letter-spacing: 0.5px;
    color: var(--teal-light);
  }
  .qrs-info-link {
    font-size: 14px;
    font-weight: 600;
    color: #60a5fa;
    text-decoration: none;
    word-break: break-all;
  }
  .qrs-info-link:hover { text-decoration: underline; }

  /* ── Stamp ── */
  .qrs-stamp {
    margin: 16px 0 0;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid rgba(0,137,123,0.3);
  }
  .qrs-stamp-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(0,105,92,0.1), rgba(0,137,123,0.06));
  }
  .qrs-stamp-left { display: flex; align-items: center; gap: 12px; }
  .qrs-stamp-seal { font-size: 24px; }
  .qrs-stamp-title { font-size: 14px; font-weight: 800; color: var(--text); margin-bottom: 3px; }
  .qrs-stamp-sub { font-size: 10px; color: var(--text-muted); letter-spacing: 0.3px; }
  .qrs-stamp-id { text-align: right; flex-shrink: 0; }
  .qrs-stamp-id-label { font-size: 8px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: var(--teal-light); margin-bottom: 3px; }
  .qrs-stamp-id-val { font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: var(--teal-light); letter-spacing: 0.5px; }

  /* ── Actions ── */
  .qrs-actions { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 16px; }
  .qrs-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 15px 20px;
    border-radius: var(--radius-sm);
    font-size: 13.5px;
    font-weight: 800;
    letter-spacing: 0.3px;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: pointer;
  }
  .qrs-action-btn:hover { transform: translateY(-2px); }
  .qrs-action-primary {
    background: linear-gradient(135deg, var(--teal), var(--teal-mid));
    color: var(--white);
    box-shadow: 0 8px 24px rgba(0,137,123,0.3);
  }
  .qrs-action-primary:hover { box-shadow: 0 12px 32px rgba(0,137,123,0.45); }
  .qrs-action-secondary {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    color: var(--text);
  }
  .qrs-action-secondary:hover { background: rgba(255,255,255,0.09); }

  /* ── Note ── */
  .qrs-note {
    margin-top: 14px;
    padding: 14px 18px;
    border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.6;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .qrs-note-icon { color: var(--teal-light); flex-shrink: 0; margin-top: 1px; }

  /* ── Footer ── */
  .qrs-footer {
    position: relative;
    z-index: 1;
    padding: 20px 20px 32px;
    text-align: center;
  }
  .qrs-footer-text { font-size: 11px; color: var(--text-faint); line-height: 1.7; }
  .qrs-footer-link { color: var(--teal-light); text-decoration: none; }
  .qrs-footer-link:hover { text-decoration: underline; }

  /* ── Responsive ── */
  @media (min-width: 480px) {
    .qrs-actions { grid-template-columns: 1fr 1fr; }
    .qrs-name { font-size: 30px; }
    .qrs-photo-ring { width: 152px; height: 152px; }
    .qrs-section { padding: 26px 28px 24px; }
    .qrs-hero { padding: 0 32px 40px; }
  }
  @media (min-width: 640px) {
    .qrs-main { padding: 36px 24px 52px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .qrs-photo-ring, .qrs-orb1, .qrs-orb2, .qrs-orb3 { animation: none; }
    .qrs-card-outer { transition: opacity 0.3s; }
  }
`;