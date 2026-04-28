
/**
 * SchoolStudentsCard.jsx — Student ID cards (live API, no mock seed data)
 * Uses backend: /api/student-cards/*, /api/locations/*
 * Country emblem: place image at public/countrylogo.png (or countryLogo.png)
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const G = {
  navy:   '#1a3a6b',
  gold:   '#c8a84b',
  white:  '#ffffff',
  light:  '#f0f4f8',
  text:   '#1a1a2e',
  sub:    '#4a5568',
};

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const API = `${API_ROOT.replace(/\/$/, '')}/api`;
const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_BASE || API_ROOT.replace(/\/$/, '');

/** Public folder (Vite): add `public/countrylogo.png` */
function countryLogoCandidates() {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return [
    `${base}countrylogo.png`,
    `${base}countryLogo.png`,
    `${base}countrylogo.jpg`,
    `${base}countrylogo.jpeg`,
    `${base}countrylogo.webp`,
  ];
}

function CountryLogoImg({ size = 56 }) {
  const [i, setI] = useState(0);
  const srcs = useMemo(() => countryLogoCandidates(), []);
  const src = srcs[i] || srcs[0];
  return (
    <img
      src={src}
      alt="Rwanda"
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: '50%', border: `2px solid ${G.gold}` }}
      onError={() => setI((x) => x + 1)}
    />
  );
}

function generateQRPattern(str) {
  let hash = 0;
  for (const c of str) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  const size = 21;
  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder = (
        (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)
      );
      if (inFinder) {
        const rr = r < 8 ? r : r - (size - 8);
        const cc = c < 8 ? c : c - (size - 8);
        const onBorder = rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4);
        cells.push(onBorder ? 1 : 0);
      } else {
        const seed = (hash * (r * size + c + 1) * 1103515245 + 12345) & 0x7fffffff;
        cells.push(seed % 3 === 0 ? 1 : 0);
      }
    }
  }
  return { cells, size };
}

function QRCodeSVG({ value, size = 80 }) {
  const { cells, size: s } = useMemo(() => generateQRPattern(value), [value]);
  const cell = size / s;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill="white" />
      {cells.map((v, idx) => v ? (
        <rect
          key={idx}
          x={(idx % s) * cell}
          y={Math.floor(idx / s) * cell}
          width={cell}
          height={cell}
          fill="#000"
        />
      ) : null)}
    </svg>
  );
}

function SchoolLogoSVG({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 5 L90 20 L90 60 Q90 85 50 100 Q10 85 10 60 L10 20 Z" fill="#1a3a6b" stroke="#c8a84b" strokeWidth="3" />
      <path d="M50 15 L80 27 L80 58 Q80 78 50 90 Q20 78 20 58 L20 27 Z" fill="#f0f4f8" />
      <rect x="30" y="42" width="40" height="26" rx="2" fill="#1a3a6b" />
      <line x1="50" y1="42" x2="50" y2="68" stroke="#c8a84b" strokeWidth="1.5" />
      <rect x="47" y="28" width="6" height="14" rx="2" fill="#c8a84b" />
      <ellipse cx="50" cy="26" rx="5" ry="7" fill="#f5a623" />
      <rect x="20" y="82" width="60" height="14" rx="3" fill="#c8a84b" />
      <text x="50" y="92" textAnchor="middle" fontSize="5.5" fill="#1a3a6b" fontFamily="sans-serif" fontWeight="bold">SCHOOL</text>
    </svg>
  );
}

function formatDob(y) {
  if (y == null || y === '') return '-';
  return String(y);
}

function mapRowToStudent(row) {
  const fullName = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
  const code = row.code || row.student_code || row.student_uid || `ST-${row.id}`;
  const photoRel = row.photo_url || (row.student_photo ? `/uploads/student-profile-photos/${row.student_photo}` : null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    id: row.id,
    studentCode: code,
    fullName,
    dob: formatDob(row.birth_year),
    gender: row.gender || '-',
    className: row.class_name || '-',
    school: row.school_name || '-',
    academicYear: row.academic_year || '-',
    dateIssued: new Date().toLocaleDateString('en-GB').replace(/\//g, ' / '),
    photo: photoRel ? `${UPLOADS_BASE}${photoRel}` : null,
    province: row.province,
    district: row.district,
    sector: row.sector,
    school_id: row.school_id,
    school_logo_full: row.logo_url ? `${UPLOADS_BASE}${row.logo_url}` : null,
    qrFallbackUrl: `${origin}/online-service/dashboard?student=${encodeURIComponent(row.id)}`,
  };
}

function IDCard({ student, template, scale = 1 }) {
  const cardW = 640;
  const cardH = 400;
  const schoolTitle = (template?.school_name || student.school || 'SCHOOL').toUpperCase();
  const qrImg = template?.qr_data_url;
  const qrFallback = student.qrFallbackUrl || '';
  const schoolLogoSrc = template?.school_logo_url
    ? `${UPLOADS_BASE}${template.school_logo_url}`
    : student.school_logo_full;
  const footerSite = (template?.website && String(template.website).trim())
    ? String(template.website).replace(/^https?:\/\//i, '')
    : 'www.babyeyi.rw';
  const dateIssued = template?.date_issued || student.dateIssued;
  const sigSrc = template?.head_signature_url ? `${UPLOADS_BASE}${template.head_signature_url}` : null;
  const principalName = template?.head_teacher_name || '';

  return (
    <div
      style={{
        width:  cardW * scale,
        height: cardH * scale,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'relative',
        borderRadius: 18 * scale,
        overflow: 'hidden',
        boxShadow: scale < 1 ? 'none' : '0 20px 60px rgba(26,58,107,0.35)',
        background: '#fff',
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
      data-card-root
    >
      <div style={{ position:'absolute', inset:0, borderRadius:18*scale, border:`${3*scale}px solid ${G.gold}`, zIndex:10, pointerEvents:'none' }} />

      <div style={{ position:'absolute', right:'28%', top:'50%', transform:'translate(50%,-50%)', opacity:0.06, zIndex:1 }}>
        {schoolLogoSrc ? (
          <img src={schoolLogoSrc} alt="" style={{ width: 260 * scale, height: 260 * scale, objectFit: 'contain', opacity: 0.35 }} />
        ) : (
          <SchoolLogoSVG size={260 * scale} />
        )}
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${G.navy} 0%, #0d2554 100%)`,
        padding: `${14*scale}px ${22*scale}px ${10*scale}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10*scale }}>
          {schoolLogoSrc ? (
            <img src={schoolLogoSrc} alt="" style={{ width: 52 * scale, height: 52 * scale, objectFit: 'contain', borderRadius: 8 * scale }} />
          ) : (
            <SchoolLogoSVG size={52 * scale} />
          )}
        </div>

        <div style={{ textAlign:'center', flex:1 }}>
          <div style={{
            fontSize: 18 * scale, fontWeight: 900, color: G.white,
            letterSpacing: 2 * scale, textTransform: 'uppercase',
            fontFamily: "'Georgia', serif",
            textShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}>
            {schoolTitle}
          </div>
          <div style={{
            fontSize: 8.5 * scale, color: G.gold, letterSpacing: 3 * scale,
            textTransform: 'uppercase', marginTop: 2 * scale,
          }}>
            ── Quality Education, Brighter Tomorrow ──
          </div>
          <div style={{
            fontSize: 13 * scale, fontWeight: 700, color: G.white,
            letterSpacing: 4 * scale, textTransform: 'uppercase',
            marginTop: 5 * scale, borderTop: '1px solid rgba(200,168,75,0.4)',
            paddingTop: 5 * scale,
          }}>
            STUDENT ID CARD
          </div>
        </div>

        <CountryLogoImg size={56 * scale} />
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 20 * scale,
        padding: `${18*scale}px ${22*scale}px ${0}px`,
        position: 'relative', zIndex: 2, flex: 1,
        background: '#fff',
      }}>
        <div style={{
          width: 130 * scale, minWidth: 130 * scale,
          height: 158 * scale,
          border: `${3*scale}px solid ${G.navy}`,
          borderRadius: 8 * scale,
          overflow: 'hidden',
          background: '#e8edf5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '2px 2px 8px rgba(26,58,107,0.2)',
        }}>
          {student.photo ? (
            <img src={student.photo} alt="Student" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          ) : (
            <div style={{ textAlign:'center', color: G.sub }}>
              <svg width={40*scale} height={40*scale} viewBox="0 0 24 24" fill="none" stroke={G.navy} strokeWidth="1.5">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <div style={{ fontSize: 8*scale, marginTop: 4*scale, color: G.navy, fontWeight: 600 }}>NO PHOTO</div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, paddingTop: 4 * scale }}>
          {[
            ['STUDENT CODE',  student.studentCode],
            ['FULL NAME',     student.fullName],
            ['DATE OF BIRTH', template?.date_of_birth != null ? String(template.date_of_birth) : student.dob],
            ['GENDER',        student.gender],
            ['CLASS',         student.className],
            ['ACADEMIC YEAR', template?.academic_year || student.academicYear],
            ['DATE ISSUED',   dateIssued],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: 'grid',
              gridTemplateColumns: `${115*scale}px ${10*scale}px 1fr`,
              alignItems: 'center',
              marginBottom: 7 * scale,
              gap: 4 * scale,
            }}>
              <span style={{
                fontSize: 10 * scale, fontWeight: 800,
                color: G.text, letterSpacing: 0.5 * scale, textTransform: 'uppercase',
                fontFamily: 'Georgia, serif',
              }}>{label}</span>
              <span style={{ fontSize: 10 * scale, fontWeight: 700, color: G.navy }}>:</span>
              <span style={{
                fontSize: 11 * scale, fontWeight: 600,
                color: label === 'FULL NAME' ? G.navy : G.text,
                fontFamily: 'Georgia, serif',
              }}>{value}</span>
            </div>
          ))}
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 4 * scale, paddingTop: 60 * scale,
        }}>
          <div style={{
            border: `${2*scale}px solid ${G.navy}`,
            borderRadius: 6 * scale, padding: 4 * scale,
            background: '#fff',
          }}>
            {qrImg ? (
              <img src={qrImg} alt="QR" style={{ width: 68 * scale, height: 68 * scale, display: 'block' }} />
            ) : (
              <QRCodeSVG value={qrFallback} size={68 * scale} />
            )}
          </div>
          <span style={{ fontSize: 7 * scale, color: G.sub, textAlign: 'center', maxWidth: 76 * scale }}>Scan profile</span>
        </div>
      </div>

      <div style={{
        background: `linear-gradient(135deg, ${G.navy} 0%, #0d2554 100%)`,
        padding: `${8*scale}px ${22*scale}px`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'relative', zIndex: 2, marginTop: 'auto',
      }}>
        <div>
          <div style={{
            minHeight: 22 * scale,
            marginBottom: 2 * scale,
            display: 'flex',
            alignItems: 'flex-end',
          }}>
            {sigSrc ? (
              <img src={sigSrc} alt="Signature" style={{ maxHeight: 26 * scale, maxWidth: 110 * scale, objectFit: 'contain' }} />
            ) : (
              <div style={{
                fontSize: 14 * scale, fontFamily: "'Brush Script MT', 'Segoe Script', cursive, serif",
                color: G.gold, lineHeight: 1,
              }}>
                {principalName || 'Principal'}
              </div>
            )}
          </div>
          <div style={{ width: 65 * scale, height: 1 * scale, background: G.gold, marginBottom: 2 * scale }} />
          <div style={{ fontSize: 7 * scale, color: G.white, letterSpacing: 1.5 * scale, textTransform: 'uppercase' }}>Principal</div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: `${1.5*scale}px solid ${G.gold}`,
            borderRadius: 20 * scale,
            padding: `${4*scale}px ${14*scale}px`,
            fontSize: 9 * scale, color: G.gold,
            letterSpacing: 2 * scale, fontWeight: 700, textTransform: 'uppercase',
            marginBottom: 4 * scale,
          }}>
            Discipline · Knowledge · Excellence
          </div>
          <div style={{ fontSize: 8 * scale, color: 'rgba(255,255,255,0.65)', letterSpacing: 1 * scale }}>
            {footerSite}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 7 * scale, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 * scale }}>Academic Year</div>
          <div style={{ fontSize: 11 * scale, color: G.gold, fontWeight: 700 }}>{template?.academic_year || student.academicYear}</div>
        </div>
      </div>
    </div>
  );
}

function CardModal({ student, onClose }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [dlFormat, setDlFormat] = useState(null);
  const [template, setTemplate] = useState(null);
  const [tplLoading, setTplLoading] = useState(true);
  const [tplError, setTplError] = useState(null);

  useEffect(() => {
    if (!student?.id) return undefined;
    let cancelled = false;
    setTplLoading(true);
    setTplError(null);
    setTemplate(null);
    fetch(`${API}/student-cards/${student.id}/template`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || 'Failed to load card data');
        setTemplate(j.data);
      })
      .catch((e) => { if (!cancelled) setTplError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setTplLoading(false); });
    return () => { cancelled = true; };
  }, [student?.id]);

  const captureCard = async () => {
    const el = cardRef.current?.querySelector('[data-card-root]');
    if (!el) return null;
    return html2canvas(el, { scale: 3, useCORS: true, allowTaint: true });
  };

  const downloadPNG = async () => {
    setDownloading(true); setDlFormat('PNG');
    try {
      const canvas = await captureCard();
      if (canvas) {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `ID-${student.studentCode}.png`;
        a.click();
      }
    } finally { setDownloading(false); setDlFormat(null); }
  };

  const downloadJPEG = async () => {
    setDownloading(true); setDlFormat('JPEG');
    try {
      const canvas = await captureCard();
      if (canvas) {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/jpeg', 0.95);
        a.download = `ID-${student.studentCode}.jpg`;
        a.click();
      }
    } finally { setDownloading(false); setDlFormat(null); }
  };

  const downloadPDF = async () => {
    setDownloading(true); setDlFormat('PDF');
    try {
      const canvas = await captureCard();
      if (canvas) {
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [170, 107] });
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 170, 107);
        pdf.save(`ID-${student.studentCode}.pdf`);
      }
    } finally { setDownloading(false); setDlFormat(null); }
  };

  const downloadServerPdf = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`${API}/student-cards/${student.id}/pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ID-${student.studentCode}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }} onClick={onClose}>
      <div style={{
        background: '#0f172a', borderRadius: 24, padding: 28,
        maxWidth: 740, width: '100%',
        boxShadow: '0 40px 120px rgba(0,0,0,0.6)',
        border: '1px solid rgba(200,168,75,0.3)',
      }} onClick={(e) => e.stopPropagation()}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <p style={{ color: G.gold, fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:2, margin:0 }}>ID Card Preview</p>
            <h3 style={{ color:'#fff', fontSize:18, fontWeight:900, margin:'4px 0 0', fontFamily:'Georgia,serif' }}>{student.fullName}</h3>
          </div>
          <button type="button" onClick={onClose} style={{ width:36, height:36, borderRadius:10, border:'1px solid rgba(255,255,255,0.2)', background:'transparent', color:'#fff', cursor:'pointer', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>

        {tplLoading && (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Loading card data…</p>
        )}
        {tplError && (
          <p style={{ color: '#f87171', fontSize: 13 }}>{tplError}</p>
        )}

        <div ref={cardRef} style={{ overflowX:'auto', paddingBottom:8 }}>
          <div style={{ minWidth:640, transformOrigin:'top left' }}>
            <IDCard student={student} template={template} scale={1} />
          </div>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:20 }}>
          {[
            { label:'Download PNG',  fn: downloadPNG,  color:'#1a3a6b', fmt:'PNG'  },
            { label:'Download JPEG', fn: downloadJPEG, color:'#1e7e34', fmt:'JPEG' },
            { label:'Download PDF (image)', fn: downloadPDF, color:'#8b1a1a', fmt:'PDF'  },
          ].map(({ label, fn, color, fmt }) => (
            <button key={fmt} type="button" onClick={fn} disabled={downloading || tplLoading} style={{
              flex:1, minWidth:120, height:42, borderRadius:10, border:'none',
              background: color, color:'#fff', fontWeight:800, fontSize:11,
              letterSpacing:1, textTransform:'uppercase', cursor:'pointer',
              opacity: downloading && dlFormat !== fmt ? 0.5 : 1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            }}>
              {downloading && dlFormat === fmt ? '⏳ Generating…' : `⬇ ${label}`}
            </button>
          ))}
          <button
            type="button"
            onClick={downloadServerPdf}
            disabled={downloading || tplLoading}
            style={{
              flex:1, minWidth:140, height:42, borderRadius:10, border:`1px solid ${G.gold}`,
              background: 'transparent', color: G.gold, fontWeight:800, fontSize:11,
              letterSpacing:1, textTransform:'uppercase', cursor:'pointer',
            }}
          >
            ⬇ PDF (server)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SchoolStudentsCard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    province: '', district: '', sector: '', school_id: '', class_name: '',
  });
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [schoolOpts, setSchoolOpts] = useState([]);
  const [classOpts, setClassOpts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [viewStudent, setViewStudent] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  const showNotif = (msg, type = 'success') => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 4000);
  };

  useEffect(() => {
    fetch(`${API}/locations/provinces`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => { if (j.success) setProvinces(j.data || []); })
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    if (!filters.province) { setDistricts([]); return; }
    fetch(`${API}/locations/districts?province=${encodeURIComponent(filters.province)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => { if (j.success) setDistricts(j.data || []); })
      .catch(() => setDistricts([]));
  }, [filters.province]);

  useEffect(() => {
    if (!filters.province || !filters.district) { setSectors([]); return; }
    const p = new URLSearchParams({ province: filters.province, district: filters.district });
    fetch(`${API}/locations/sectors?${p}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => { if (j.success) setSectors(j.data || []); })
      .catch(() => setSectors([]));
  }, [filters.province, filters.district]);

  useEffect(() => {
    const p = new URLSearchParams();
    if (filters.province) p.set('province', filters.province);
    if (filters.district) p.set('district', filters.district);
    if (filters.sector) p.set('sector', filters.sector);
    fetch(`${API}/student-cards/filters/schools?${p}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => { if (j.success) setSchoolOpts(j.data || []); })
      .catch(() => setSchoolOpts([]));
  }, [filters.province, filters.district, filters.sector]);

  useEffect(() => {
    if (!filters.school_id) { setClassOpts([]); return; }
    fetch(`${API}/student-cards/filters/classes?school_id=${encodeURIComponent(filters.school_id)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => { if (j.success) setClassOpts(j.data || []); })
      .catch(() => setClassOpts([]));
  }, [filters.school_id]);

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
      if (!json.success) throw new Error(json.message || 'Failed to load students');
      setStudents((json.data || []).map(mapRowToStudent));
      setSelected([]);
    } catch (e) {
      showNotif(e.message || 'Load failed', 'error');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    loadStudents();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — initial load only; user clicks Apply for refresh

  const setF = (key) => (e) => {
    const val = e.target.value;
    setFilters((prev) => {
      const next = { ...prev, [key]: val };
      if (key === 'province') {
        next.district = ''; next.sector = ''; next.school_id = ''; next.class_name = '';
      }
      if (key === 'district') { next.sector = ''; next.school_id = ''; next.class_name = ''; }
      if (key === 'sector') { next.school_id = ''; next.class_name = ''; }
      if (key === 'school_id') { next.class_name = ''; }
      return next;
    });
  };

  const filtered = students;

  const allSel = filtered.length > 0 && selected.length === filtered.length;
  const toggleAll = () => setSelected(allSel ? [] : filtered.map((s) => s.id));
  const toggleOne = (id) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const bulkDownload = async () => {
    if (!selected.length) return;
    setBulkLoading(true);
    try {
      const res = await fetch(`${API}/student-cards/bulk/pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_ids: selected }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Bulk export failed');
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'student-cards-bulk.pdf';
      a.click();
      URL.revokeObjectURL(a.href);
      showNotif(`Downloaded ${selected.length} cards as PDF`);
    } catch (e) {
      showNotif(e.message || 'Bulk download failed', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const s = {
    page: {
      minHeight: '100vh',
      background: '#060e1f',
      fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
      color: '#fff',
    },
    topbar: {
      background: 'linear-gradient(135deg, #0a1628 0%, #0d2554 100%)',
      borderBottom: `1px solid rgba(200,168,75,0.25)`,
      padding: '0 24px',
      height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 200,
    },
    container: { maxWidth: 1280, margin: '0 auto', padding: '24px 16px' },
    card: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: 20,
    },
    select: {
      height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(255,255,255,0.07)', color: '#fff', padding: '0 10px',
      fontSize: 12, outline: 'none', cursor: 'pointer',
    },
    btn: (bg, color = '#fff') => ({
      height: 36, borderRadius: 8, border: 'none',
      background: bg, color, fontWeight: 700, fontSize: 11,
      letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
      padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 5,
    }),
    th: {
      padding: '10px 14px', fontSize: 9, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: 1.5,
      color: 'rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.08)',
      whiteSpace: 'nowrap',
    },
    td: {
      padding: '12px 14px', fontSize: 12,
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      verticalAlign: 'middle',
    },
  };

  return (
    <div style={s.page}>
      {notif && (
        <div style={{
          position:'fixed', top:16, right:16, zIndex:2000,
          background: notif.type === 'error' ? '#7f1d1d' : '#14532d',
          border: `1px solid ${notif.type === 'error' ? '#ef4444' : '#22c55e'}`,
          borderRadius:12, padding:'12px 20px', color:'#fff',
          fontSize:13, fontWeight:600, maxWidth:380,
          boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {notif.msg}
        </div>
      )}

      {viewStudent && <CardModal student={viewStudent} onClose={() => setViewStudent(null)} />}

      <div style={s.topbar}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg, ${G.navy}, #1a56b0)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:18 }}>🪪</span>
          </div>
          <div>
            <div style={{ fontSize:9, color:G.gold, fontWeight:800, textTransform:'uppercase', letterSpacing:2 }}>Smart Education</div>
            <div style={{ fontSize:14, fontWeight:900, color:'#fff', lineHeight:1, fontFamily:'Georgia,serif' }}>Student ID Card System</div>
          </div>
        </div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>
          API: {API_ROOT} · Add <code style={{ fontSize: 10 }}>public/countrylogo.png</code>
        </div>
      </div>

      <div style={s.container}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:14, marginBottom:24 }}>
          {[
            { label:'Students (loaded)', value: students.length, icon:'👥', color:'#1a3a6b' },
            { label:'With photos', value: students.filter((x) => x.photo).length, icon:'📷', color:'#14532d' },
            { label:'Schools (filter)', value: schoolOpts.length, icon:'🏫', color:'#92400e' },
            { label:'Selected', value: selected.length, icon:'✓', color:'#7c3aed' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{ background:`linear-gradient(135deg, ${color}40, ${color}15)`, border:`1px solid ${color}50`, borderRadius:14, padding:'16px 18px' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
              <div style={{ fontSize:24, fontWeight:900, color:'#fff' }}>{value}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ ...s.card, marginBottom:20 }}>
          <div style={{ marginBottom:14 }}>
            <span style={{ fontSize:11, color:G.gold, fontWeight:800, textTransform:'uppercase', letterSpacing:1.5 }}>📍 Location cascade (live)</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            <select value={filters.province} onChange={setF('province')} style={{ ...s.select, minWidth:160 }}>
              <option value="">All provinces</option>
              {provinces.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={filters.district} onChange={setF('district')} disabled={!filters.province} style={{ ...s.select, minWidth:140, opacity: filters.province ? 1 : 0.5 }}>
              <option value="">All districts</option>
              {districts.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={filters.sector} onChange={setF('sector')} disabled={!filters.district} style={{ ...s.select, minWidth:140, opacity: filters.district ? 1 : 0.5 }}>
              <option value="">All sectors</option>
              {sectors.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={filters.school_id} onChange={setF('school_id')} style={{ ...s.select, minWidth:200 }}>
              <option value="">All schools</option>
              {schoolOpts.map((sc) => <option key={sc.id} value={String(sc.id)}>{sc.school_name}</option>)}
            </select>
            <select value={filters.class_name} onChange={setF('class_name')} disabled={!filters.school_id} style={{ ...s.select, minWidth:140, opacity: filters.school_id ? 1 : 0.5 }}>
              <option value="">All classes</option>
              {classOpts.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="button" onClick={() => setFilters({ province:'', district:'', sector:'', school_id:'', class_name:'' })} style={{ ...s.btn('rgba(255,255,255,0.1)') }}>
              Clear
            </button>
          </div>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:12, alignItems:'center', marginBottom:16 }}>
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, opacity:0.4 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadStudents()}
              placeholder="Search name or student code…"
              style={{ ...s.select, width:'100%', paddingLeft:32, height:40, fontSize:13, boxSizing:'border-box' }}
            />
          </div>
          <button type="button" onClick={() => loadStudents()} disabled={loading} style={{ ...s.btn(G.navy) }}>
            {loading ? '…' : 'Apply filters'}
          </button>
          {selected.length > 0 && (
            <>
              <span style={{ fontSize:11, color:G.gold, fontWeight:700 }}>{selected.length} selected</span>
              <button type="button" onClick={bulkDownload} disabled={bulkLoading} style={{ ...s.btn('#14532d') }}>
                {bulkLoading ? '…' : `Download all PDF (${selected.length})`}
              </button>
              <button type="button" onClick={() => setSelected([])} style={{ ...s.btn('rgba(255,255,255,0.08)') }}>Clear selection</button>
            </>
          )}
        </div>

        <div style={{ ...s.card, overflowX:'auto' }}>
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontWeight:800, textTransform:'uppercase', letterSpacing:2, margin:0 }}>Students</p>
            <h2 style={{ fontSize:18, fontWeight:900, margin:'4px 0 0', fontFamily:'Georgia,serif' }}>
              ID Card Management
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontWeight:400, marginLeft:10 }}>
                ({filtered.length} loaded)
              </span>
            </h2>
          </div>

          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={s.th}>
                  <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor:'pointer', accentColor:G.gold }} aria-label="Select all" />
                </th>
                <th style={s.th}>Photo</th>
                <th style={s.th}>Student</th>
                <th style={s.th}>Class</th>
                <th style={s.th}>School</th>
                <th style={{ ...s.th, textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ ...s.td, textAlign:'center', padding:'48px', color:'rgba(255,255,255,0.3)' }}>
                    {loading ? 'Loading…' : 'No students. Adjust filters and click Apply.'}
                  </td>
                </tr>
              ) : filtered.map((student) => (
                <tr key={student.id} style={{ background: selected.includes(student.id) ? 'rgba(200,168,75,0.07)' : 'transparent' }}>
                  <td style={s.td}>
                    <input type="checkbox" checked={selected.includes(student.id)} onChange={() => toggleOne(student.id)} style={{ cursor:'pointer', accentColor:G.gold }} />
                  </td>
                  <td style={s.td}>
                    <div style={{
                      width:40, height:50, borderRadius:6,
                      border:`2px solid ${G.navy}`,
                      overflow:'hidden', background:'#1a2a45',
                      display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      {student.photo ? (
                        <img src={student.photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      ) : (
                        <span style={{ fontSize:18, opacity:0.4 }}>👤</span>
                      )}
                    </div>
                  </td>
                  <td style={s.td}>
                    <p style={{ fontWeight:800, color:'#fff', fontSize:13, margin:0 }}>{student.fullName}</p>
                    <p style={{ fontSize:10, color:G.gold, margin:'2px 0 0', fontFamily:'monospace' }}>{student.studentCode}</p>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      display:'inline-block', padding:'3px 10px', borderRadius:6,
                      background:'rgba(26,58,107,0.5)', border:`1px solid ${G.navy}`,
                      fontSize:11, fontWeight:800, color:'#93c5fd',
                    }}>
                      {student.className}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontSize:11, color:'rgba(255,255,255,0.5)' }}>{student.school}</td>
                  <td style={{ ...s.td, textAlign:'right' }}>
                    <button type="button" onClick={() => setViewStudent(student)} style={{ ...s.btn(G.navy) }} title="View card">
                      👁 View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{ marginTop:32 }}>
            <h3 style={{ fontFamily:'Georgia,serif', fontSize:16, fontWeight:900, marginBottom:16 }}>Card previews (first 6)</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:20 }}>
              {filtered.slice(0, 6).map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setViewStudent(student)}
                  style={{
                    cursor:'pointer', borderRadius:14, overflow:'hidden',
                    border:'none', padding:0, textAlign:'left',
                    boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
                    background:'transparent',
                  }}
                >
                  <div style={{ transform:'scale(0.47)', transformOrigin:'top left', height:188, pointerEvents:'none' }}>
                    <IDCard student={student} template={null} scale={1} />
                  </div>
                  <div style={{ background:'rgba(26,58,107,0.3)', border:'1px solid rgba(200,168,75,0.15)', borderTop:'none', padding:'8px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <p style={{ margin:0, fontSize:11, fontWeight:700, color:'#fff' }}>{student.fullName}</p>
                      <p style={{ margin:0, fontSize:9, color:G.gold, fontFamily:'monospace' }}>{student.studentCode}</p>
                    </div>
                    <span style={{ fontSize:10, color:'rgba(255,255,255,0.35)', fontWeight:600 }}>Open →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign:'center', marginTop:40, paddingBottom:20 }}>
          <p style={{ fontSize:10, color:'rgba(255,255,255,0.2)', letterSpacing:1 }}>
            Student ID cards · Live data · QR opens student profile
          </p>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar-thumb { background: rgba(200,168,75,0.3); border-radius:3px; }
        select option { background: #0f172a; color: #fff; }
      `}</style>
    </div>
  );
}
