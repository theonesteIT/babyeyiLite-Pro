/**
 * BabyeyiFinder.jsx — v1.0
 *
 * Public-facing "Find Your Babyeyi" section for SchoolPublicRoute.
 *
 * Features:
 *  • Search by Academic Year + Class (school-scoped, never shows other schools)
 *  • Renders the official word-doc-style document (mirrors BabyeyiList OfficialDoc)
 *  • PDF download via html2canvas + jsPDF
 *  • QR code display for verification
 *  • Signature, stamp, school logo rendering
 *  • Fully themed to the school's color theme
 *
 * Usage in SchoolPublicRoute.jsx:
 *   import BabyeyiFinder from './BabyeyiFinder';
 *   // Add to NAV_ITEMS:  { id: 'babyeyi', label: 'School Fees Doc', icon: <FileText size={14} />, }
 *   // Add to SchoolSite render: <BabyeyiFinder school={data} theme={theme} schoolSlug={slug} />
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, FileText, Download, Loader2, AlertCircle,
  ChevronDown, X, Eye, Shield, ZoomIn, Calendar,
  GraduationCap, Building2, DollarSign, CreditCard,
} from 'lucide-react';
import Heroimage from '../../assets/hero-image.png';
import babyeyiLogo from '../../assets/1BABYEYI LOGO FINAL.png';
import { BABYEYI_AUTO_LANG_OPTIONS, isCoreBabyeyiLang, normalizeBabyeyiLang } from '../../babyeyiPublic/babyeyiTranslateLangs.js';
import { useBabyeyiUiT } from '../../babyeyiPublic/useBabyeyiUiT.js';
import { useFinderDocBody } from '../../babyeyiPublic/useFinderDocBody.js';
import { getStatusLabelSafe } from '../../i18n/index.js';

function pickStudentLookupMessage(raw, finderT) {
  const m = String(raw || '').trim();
  if (/student not found/i.test(m)) return finderT.finderStudentNotFound;
  if (/another school/i.test(m)) return finderT.finderWrongSchoolError;
  return m || finderT.finderStudentLookupFailed;
}

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SERVER  = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const API     = `${SERVER}/api`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function imgUrl(p) {
  if (!p) return null;
  if (p.startsWith('http') || p.startsWith('blob:')) return p;
  let norm = p.replace(/\\/g, '/');
  const stripped = norm.replace(/^\//, '');
  const idx = stripped.indexOf('uploads/');
  if (idx !== -1) norm = '/' + stripped.slice(idx);
  return `${SERVER}${norm.startsWith('/') ? norm : '/' + norm}`;
}

function parseClasses(raw) {
  try {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string" && raw.trim().startsWith("[")) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    }
  } catch {}
  return [];
}

function getClassLabel(rec) {
  const classes = parseClasses(rec?.classes_json || rec?.classesJson || rec?.classes);
  const primary = rec?.class_name || rec?.class || classes[0] || "";
  return (classes.length ? classes : [primary]).filter(Boolean).join(", ");
}

async function toBase64(url) {
  if (!url) return null;
  try {
    const abs = url.startsWith('http') ? url : `${SERVER}${url.startsWith('/') ? '' : '/'}${url}`;
    const res = await fetch(abs);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise(r => {
      const fr = new FileReader();
      fr.onloadend = () => r(fr.result);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function parseBanks(rec) {
  if (rec.banks_json) {
    try {
      const raw = typeof rec.banks_json === 'string' ? JSON.parse(rec.banks_json) : rec.banks_json;
      if (Array.isArray(raw) && raw.length > 0) return raw;
    } catch {}
  }
  if (rec.bank_name) {
    return [{ bankName: rec.bank_name, accountNumber: rec.bank_account_no || '', accountName: rec.bank_account_name || '', isPrimary: true }];
  }
  return [];
}

/**
 * Public GET only — core langs use merged server content (rw = manager-curated).
 * Non-core: fetch English base; Lingva applies in useFinderDocBody.
 */
async function loadBabyeyiFullRecord(sumRec, uiLang) {
  const lc = normalizeBabyeyiLang(uiLang);
  const apiLang = isCoreBabyeyiLang(lc) ? lc : 'en';
  const res = await fetch(`${API}/babyeyi/${sumRec.id}?lang=${encodeURIComponent(apiLang)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed');

  const d = json.data;
  const sigs = d.signatures || {};

  let payments = d.payments || [];
  if (!payments.length && d.payments_json) {
    try { payments = JSON.parse(d.payments_json); } catch {}
  }

  const allClassReqs = (d.class_requirements || []).map((r) => ({
    item: r.item || r.information || '',
    details: r.details || '',
  }));
  const classNotes = allClassReqs.filter((r) => r.details && r.details.trim());
  const otherInfos = allClassReqs.filter((r) => !r.details || !r.details.trim());

  const normalise = (p) => (p ? p.replace(/\\/g, '/') : null);

  return {
    ...sumRec,
    ...d,
    class_name: d.class_name || d.class || sumRec.class_name || '',
    classes_json: d.classes_json || d.classesJson || d.classes || sumRec.classes_json || null,
    school_name: d.school_name || sumRec.school_name || '',
    school_district: d.school_district || d.district || sumRec.school_district || '',
    school_sector: d.school_sector || d.sector || sumRec.school_sector || '',
    payments,
    requirements: (d.student_requirements || []).map((r) => ({
      item: r.item,
      description: r.description || '',
      quantity: r.quantity || '',
    })),
    classNotes,
    otherInfos,
    leaders: Array.isArray(d.leaders) ? d.leaders : [],
    signatures: {
      ...sigs,
      director_sig_path: normalise(sigs.director_sig_path),
      stamp_path: normalise(sigs.stamp_path),
      school_logo_path: normalise(sigs.school_logo_path),
      other_logo_path: normalise(sigs.other_logo_path),
      qr_code_path: normalise(sigs.qr_code_path),
      qr_view_url: sigs.qr_view_url || null,
    },
    qr_code_path: normalise(d.qr_code_path),
    qr_view_url: d.qr_view_url || null,
  };
}

// ─── ACADEMIC YEAR OPTIONS ────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  `${currentYear - 1}-${currentYear}`,
  `${currentYear}-${currentYear + 1}`,
  `${currentYear - 2}-${currentYear - 1}`,
].concat(
  Array.from({ length: 5 }, (_, i) => `${currentYear - 3 - i}-${currentYear - 2 - i}`)
);

// ─── CLASS OPTIONS ────────────────────────────────────────────────────────────
const CLASS_OPTIONS = [
  { group: 'Nursery', classes: ['N1', 'N2', 'N3'] },
  { group: 'Primary', classes: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] },
  { group: 'Secondary', classes: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
];

const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];

const CORE_FINDER_LANG_OPTIONS = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'rw', flag: '🇷🇼', name: 'Kinyarwanda' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
];
const ALL_FINDER_LANG_OPTIONS = [...CORE_FINDER_LANG_OPTIONS, ...BABYEYI_AUTO_LANG_OPTIONS];
function finderLangMeta(code) {
  const n = normalizeBabyeyiLang(code);
  return ALL_FINDER_LANG_OPTIONS.find((x) => x.code === n) || { code: n, flag: '🌐', name: String(n || 'en').toUpperCase() };
}

// ─── STATUS COLORS ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved:    { label: 'Approved',    bg: '#d1fae5', text: '#047857', dot: '#10b981', border: '#6ee7b7' },
  pending:     { label: 'Pending',     bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', border: '#fcd34d' },
  recommended: { label: 'Recommended', bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', border: '#bfdbfe' },
  rejected:    { label: 'Rejected',    bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', border: '#fca5a5' },
  draft:       { label: 'Draft',       bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', border: '#fcd34d' },
  submitted:   { label: 'Submitted',   bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6', border: '#bfdbfe' },
};

// ─── WORD-DOC HTML BUILDER (mirrors BabyeyiList) ─────────────────────────────
function buildDocHTML({
  rec, payments, banks, requirements, classNotes, otherInfos, leaders,
  totalFee, today, schoolLogoB64, otherLogoB64, sigB64, stampB64, qrB64, vUrl,
  T = {},
  parentMsg: parentMsgOverride,
}) {
  const L = (key, fb) => (T && T[key]) || fb;
  const letterBody = parentMsgOverride != null ? String(parentMsgOverride) : String(rec.parent_message || '');
  const tableStyle  = `width:100%;border-collapse:collapse;margin-top:8px`;
  const thStyle     = `padding:8px 12px;font-size:12px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;text-align:left;background:transparent`;
  const tdStyle     = `padding:7px 12px;font-size:12px;color:#1e293b;border-bottom:1px solid #e2e8f0;background:transparent`;
  const headingStyle= `font-size:14px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.05em`;
  const ruleDiv     = (title) => title
    ? `<div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:5px;margin-bottom:12px;margin-top:20px"><span style="${headingStyle}">${title}</span></div>`
    : '';

  const payRows = payments.map((p, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:42px">${i + 1}</td>
      <td style="${tdStyle}">${p.name || ''}</td>
      <td style="${tdStyle};text-align:right;font-family:monospace;font-weight:600">${Number(p.amount || 0).toLocaleString()}</td>
    </tr>`).join('');

  const paySection = payments.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(L('secFee', 'Fee Payment Breakdown'))}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:42px;text-align:center">${L('thNo', 'N°')}</th>
          <th style="${thStyle}">${L('thPaymentItem', 'Payment Item')}</th>
          <th style="${thStyle};text-align:right">${L('thAmount', 'Amount (RWF)')}</th>
        </tr></thead>
        <tbody>${payRows}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f">${L('thTotalLabel', 'TOTAL')}</td>
          <td style="padding:9px 12px;font-size:14px;font-weight:700;color:#1e3a5f;border-top:2px solid #1e3a5f;text-align:right;font-family:monospace">RWF ${totalFee.toLocaleString()}</td>
        </tr></tfoot>
      </table>
    </div>` : '';

  const bankRows = banks.map((bk, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:40px">${i + 1}</td>
      <td style="${tdStyle};font-weight:600">${bk.bankName || bk.bank_name || '—'}</td>
      <td style="${tdStyle};font-family:monospace">${bk.accountNumber || bk.bank_account_no || '—'}</td>
      <td style="${tdStyle}">${bk.accountName || bk.bank_account_name || '—'}</td>
      <td style="${tdStyle};text-align:center;color:#059669;font-weight:700">${bk.isPrimary || i === 0 ? '✓' : ''}</td>
    </tr>`).join('');

  const banksSection = banks.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(L('secBanking', 'Banking Information'))}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:40px;text-align:center">${L('thHash', '#')}</th>
          <th style="${thStyle}">${L('thBank', 'Bank Name')}</th>
          <th style="${thStyle}">${L('thAccount', 'Account Number')}</th>
          <th style="${thStyle}">${L('thAccountName', 'Account Name')}</th>
          <th style="${thStyle};text-align:center;width:70px">${L('thPrimary', 'Primary')}</th>
        </tr></thead>
        <tbody>${bankRows}</tbody>
      </table>
    </div>` : '';

  const reqRows = requirements.map((r, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:42px">${i + 1}</td>
      <td style="${tdStyle}">${(r && r.item) || r || ''}</td>
      <td style="${tdStyle}">${(r && r.description) || ''}</td>
      <td style="${tdStyle};text-align:center">${(r && r.quantity) || ''}</td>
    </tr>`).join('');
  const reqSection = requirements.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(L('secRequirements', 'Student Requirements'))}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:42px;text-align:center">${L('thHash', '#')}</th>
          <th style="${thStyle}">${L('thItem', 'Item')}</th>
          <th style="${thStyle}">${L('thDescription', 'Description')}</th>
          <th style="${thStyle};text-align:center;width:80px">${L('thQuantity', 'Quantity')}</th>
        </tr></thead>
        <tbody>${reqRows}</tbody>
      </table>
    </div>` : '';

  const noteRows = classNotes.map((n, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:42px">${i + 1}</td>
      <td style="${tdStyle};font-weight:600">${n.item || ''}</td>
      <td style="${tdStyle}">${n.details || '—'}</td>
    </tr>`).join('');
  const notesSection = classNotes.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(L('secClassNotes', 'Class Requirements & Notes'))}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:42px;text-align:center">${L('thHash', '#')}</th>
          <th style="${thStyle}">${L('thItem', 'Item')}</th>
          <th style="${thStyle}">${L('thDetails', 'Details')}</th>
        </tr></thead>
        <tbody>${noteRows}</tbody>
      </table>
    </div>` : '';

  const otherRows = otherInfos.map((n, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:42px">${i + 1}</td>
      <td style="${tdStyle};font-weight:600">${n.item || ''}</td>
      <td style="${tdStyle}">${n.details || ''}</td>
    </tr>`).join('');
  const otherSection = otherInfos.length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(L('secOtherInfo', 'Other Information'))}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:42px;text-align:center">${L('thHash', '#')}</th>
          <th style="${thStyle}">${L('thItem', 'Item')}</th>
          <th style="${thStyle}">${L('thDetails', 'Details')}</th>
        </tr></thead>
        <tbody>${otherRows}</tbody>
      </table>
    </div>` : '';

  const leaderRows = (leaders || []).map((l, i) => `
    <tr>
      <td style="${tdStyle};text-align:center;color:#64748b;width:36px;font-size:11px">${i + 1}</td>
      <td style="${tdStyle};font-weight:700;color:#1e3a5f">${l.name || l.leader_name || '—'}</td>
      <td style="${tdStyle};color:#475569">${l.role || l.leader_role || '—'}</td>
      <td style="${tdStyle};font-family:monospace;font-size:11px">${l.phone ? `${l.phone}` : '—'}</td>
      <td style="${tdStyle};font-size:11px;color:#2563eb">${l.email || '—'}</td>
    </tr>`).join('');
  const leadersSection = (leaders || []).length > 0 ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(L('secLeadership', 'School Leadership Contacts'))}
      <table style="${tableStyle}">
        <thead><tr>
          <th style="${thStyle};width:36px;text-align:center">${L('thHash', '#')}</th>
          <th style="${thStyle}">${L('thFullName', 'Full Name')}</th>
          <th style="${thStyle}">${L('thRole', 'Role / Title')}</th>
          <th style="${thStyle}">${L('thPhone', 'Phone')}</th>
          <th style="${thStyle}">${L('thEmail', 'Email')}</th>
        </tr></thead>
        <tbody>${leaderRows}</tbody>
      </table>
    </div>` : '';

  const parentSection = letterBody.trim() ? `
    <div style="margin-bottom:22px">
      ${ruleDiv(L('parentMessageHeading', 'Message to Parents / Guardians'))}
      <div style="padding-left:16px;margin-top:4px">
        <p style="font-size:12px;color:#1e293b;line-height:1.7;white-space:pre-line;margin:0">${letterBody}</p>
      </div>
    </div>` : '';

  const qrBlock = qrB64 ? `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="background:white;border:1px solid #e2e8f0;padding:6px;border-radius:6px">
        <img src="${qrB64}" style="width:80px;height:80px;object-fit:contain;display:block"/>
      </div>
      <p style="font-size:10px;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0;text-align:center">${L('sigScanVerify', 'Scan to Verify')}</p>
      ${rec.doc_id ? `<p style="font-size:10px;color:#64748b;font-family:monospace;margin:0">ID: ${rec.doc_id}</p>` : ''}
      ${vUrl ? `<p style="font-size:9px;color:#4f46e5;margin:0;text-align:center;max-width:110px;word-break:break-all">${vUrl}</p>` : ''}
    </div>` : `
    <div style="display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="width:80px;height:80px;border:1px dashed #e2e8f0;display:flex;align-items:center;justify-content:center">
        <span style="font-size:20px;opacity:.1">▣</span>
      </div>
      <p style="font-size:10px;color:#94a3b8;margin:0">${L('qrPending', 'QR Pending')}</p>
    </div>`;

  const schoolLogoHtml = schoolLogoB64
    ? `<img src="${schoolLogoB64}" style="width:92px;height:92px;object-fit:contain;display:block"/>`
    : `<div style="width:92px;height:92px;display:flex;align-items:center;justify-content:center;border:1px dashed #e2e8f0"><span style="font-size:8px;color:#64748b;text-align:center;font-weight:700">${L('schoolLogoPlaceholder', 'SCHOOL LOGO')}</span></div>`;

  const otherLogoHtml = otherLogoB64
    ? `<img src="${otherLogoB64}" style="width:70px;height:70px;object-fit:contain;display:block"/>`
    : `<img src="${babyeyiLogo}" style="width:70px;height:70px;object-fit:contain;display:block" alt="Babyeyi"/>`;

  return `
<div style="width:794px;background:#fff;font-family:Georgia,'Times New Roman',serif;color:#1e293b">
  <div style="height:3px;background:#1e3a5f"></div>
  <div style="padding:20px 40px 16px;border-bottom:2px solid #1e3a5f">
    <div style="display:flex;align-items:center;gap:20px">
      <div style="flex-shrink:0;width:110px;height:110px;display:flex;align-items:center;justify-content:center">${schoolLogoHtml}</div>
      <div style="flex:1;text-align:center">
        <p style="font-size:9px;color:#64748b;margin:0 0 2px">${L('district', 'District')}: ${rec.school_district || rec.district || '—'}</p>
        <p style="font-size:9px;color:#64748b;margin:0 0 6px">${L('sector', 'Sector')}: ${rec.school_sector || rec.sector || '—'}</p>
        <h1 style="font-size:17px;font-weight:700;color:#1e3a5f;margin:0 0 6px;text-transform:uppercase;letter-spacing:.03em">${rec.school_name || ''}</h1>
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:center">
          ${[[L('academicYear', 'Academic Year'), rec.academic_year], [L('termLabel', 'Term'), rec.term], [L('levelLabel', 'Level'), rec.education_level || rec.level], [L('classLabel', 'Class'), getClassLabel(rec)]].map(([l, v]) => `
          <span style="font-size:12px;color:#1e293b"><strong style="color:#1e3a5f">${l}:</strong> ${v || '—'}</span>`).join('')}
          ${rec.doc_id ? `<span style="font-size:11px;font-family:monospace;font-weight:700;color:#3730a3;padding:1px 8px;border:1px solid #c7d2fe">${rec.doc_id}</span>` : ''}
        </div>
      </div>
      <div style="flex-shrink:0;width:80px;height:80px;display:flex;align-items:center;justify-content:center;overflow:hidden">${otherLogoHtml}</div>
    </div>
  </div>
  <div style="padding:20px 40px 28px">
    ${parentSection}
    ${paySection}
    ${banksSection}
    ${reqSection}
    ${otherSection}
    ${leadersSection}
    ${notesSection}
    <div style="margin-bottom:22px">
      <div style="border-bottom:1.5px solid #1e3a5f;padding-bottom:5px;margin-bottom:12px;margin-top:20px">
        <span style="${headingStyle}">${L('secAuth', 'Authorization & Signatures')}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:12px">
        <div style="border:1px solid #e2e8f0;padding:14px;text-align:center">
          <p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">${L('sigHeadTeacher', 'Head Teacher')}</p>
          <div style="height:52px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">
            ${sigB64 ? `<img src="${sigB64}" style="max-height:48px;max-width:140px;object-fit:contain"/>` : `<div style="width:100%;height:1px;border-bottom:1px solid #cbd5e1"></div>`}
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0 0">${sigB64 ? L('sigSigned', '✓ Signed') : L('sigRequired', 'Signature Required')}</p>
        </div>
        <div style="border:1px solid #e2e8f0;padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center">
          ${qrBlock}
        </div>
        <div style="border:1px solid #e2e8f0;padding:14px;text-align:center">
          <p style="font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;margin:0 0 8px">${L('sigStamp', 'Official Stamp')}</p>
          <div style="width:80px;height:80px;border:1px dashed #e2e8f0;border-radius:50%;display:flex;align-items:center;justify-content:center;overflow:hidden;margin:0 auto 6px">
            ${stampB64 ? `<img src="${stampB64}" style="width:76px;height:76px;object-fit:contain;border-radius:50%"/>` : `<span style="font-size:22px;opacity:.08">🔏</span>`}
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:0">${L('sigCachet', 'Official seal')}</p>
        </div>
      </div>
    </div>
  </div>
  <div style="border-top:1px solid #1e3a5f;padding:8px 40px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:11px;color:#64748b">${rec.school_name || ''} · ${rec.school_district || rec.district || ''}</span>
    <span style="font-size:11px;color:#1e3a5f;font-weight:700;text-transform:uppercase">${L('docOfficial', 'Official Document  DO NOT FALSIFY')}</span>
    <span style="font-size:11px;color:#64748b">${L('docFooterLeft', 'Doc:')} ${rec.doc_id || '—'} · ${today}</span>
  </div>
  <div style="height:3px;background:#1e3a5f"></div>
</div>`;
}

// ─── PDF DOWNLOAD ─────────────────────────────────────────────────────────────
async function downloadAsPDF(htmlContent, filename) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');

  const style = document.createElement('style');
  style.textContent = `#__bf_pdf__ * { box-sizing:border-box; color-scheme:light only; } #__bf_pdf__ { all:initial;display:block;background:#fff; }`;
  document.head.appendChild(style);

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-9999;';
  const root = document.createElement('div');
  root.id = '__bf_pdf__';
  root.innerHTML = htmlContent;
  host.appendChild(root);
  document.body.appendChild(host);

  try {
    await new Promise(r => setTimeout(r, 500));
    const canvas = await window.html2canvas(root, {
      scale: 2, useCORS: true, allowTaint: false, backgroundColor: '#fff', logging: false, windowWidth: 794,
      onclone: (d) => { const s = d.createElement('style'); s.textContent = '*{color-scheme:light only!important}'; d.head.appendChild(s); }
    });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pW = 210, pH = 297;
    const imgH = (canvas.height / canvas.width) * pW;
    if (imgH <= pH) {
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pW, imgH);
    } else {
      let yPos = 0, page = 0;
      while (yPos < imgH) {
        if (page > 0) pdf.addPage();
        const srcYPx = Math.floor((yPos / imgH) * canvas.height);
        const sliceHPx = Math.min(Math.ceil((pH / imgH) * canvas.height), canvas.height - srcYPx);
        if (sliceHPx <= 0) break;
        const sl = document.createElement('canvas');
        sl.width = canvas.width; sl.height = sliceHPx;
        sl.getContext('2d').drawImage(canvas, 0, srcYPx, canvas.width, sliceHPx, 0, 0, canvas.width, sliceHPx);
        const sliceH = (sliceHPx / canvas.height) * imgH;
        pdf.addImage(sl.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pW, sliceH);
        yPos += pH; page++;
      }
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(host);
    document.head.removeChild(style);
  }
}

function FinderLangSwitcher({
  value,
  onChange,
  disabled,
  label,
  light = false,
  searchPlaceholder = 'Search language…',
  noMatchText = 'No match',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const meta = finderLangMeta(value);
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return ALL_FINDER_LANG_OPTIONS;
    return ALL_FINDER_LANG_OPTIONS.filter(
      (o) => o.name.toLowerCase().includes(qq) || o.code.toLowerCase().includes(qq)
    );
  }, [q]);

  const btnCls = light
    ? 'flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 shadow-sm rounded-xl text-[10px] font-bold max-w-[160px]'
    : 'flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl text-[10px] font-bold max-w-[140px]';

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={btnCls}
        title={label || 'Language'}
      >
        <span className="text-base leading-none">{meta.flag}</span>
        <span className="truncate">{meta.name}</span>
        <ChevronDown size={12} className={`opacity-80 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-[298] cursor-default bg-transparent" aria-label="Close menu" onClick={() => { setOpen(false); setQ(''); }} />
          <div className="absolute right-0 top-full z-[302] mt-1 w-56 max-h-72 overflow-hidden rounded-xl border border-white/15 bg-slate-900 shadow-xl">
            <div className="p-2 border-b border-white/10">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-2 py-1.5 rounded-lg bg-white/10 border border-white/15 text-[11px] text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <ul className="max-h-52 overflow-y-auto py-1">
              {filtered.map((o) => (
                <li key={o.code}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] text-white hover:bg-white/10"
                    onClick={() => {
                      onChange(o.code);
                      setOpen(false);
                      setQ('');
                    }}
                  >
                    <span className="text-base">{o.flag}</span>
                    <span>{o.name}</span>
                    <span className="ml-auto text-[9px] text-white/40 font-mono">{o.code}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-[10px] text-white/50">{noMatchText}</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DOCUMENT VIEWER
// ═══════════════════════════════════════════════════════════════════════════════
function DocumentViewer({ rec, theme, onClose, viewerLang, onViewerLangChange, docLoading }) {
  const { p, a } = theme;
  const { T, mtLoading, machineActive } = useBabyeyiUiT(viewerLang);
  const docBody = useFinderDocBody(viewerLang, rec, T);
  const merged = docBody.merged || rec;

  const payments   = Array.isArray(merged.payments)     ? merged.payments     : [];
  const leaders    = Array.isArray(merged.leaders)       ? merged.leaders      : [];
  const classNotes = Array.isArray(merged.classNotes)   ? merged.classNotes   : [];
  const otherInfos = Array.isArray(merged.otherInfos)   ? merged.otherInfos   : [];
  const requirements = Array.isArray(merged.requirements) ? merged.requirements : [];
  const banks      = docBody.banks && docBody.banks.length ? docBody.banks : parseBanks(merged);
  const totalFee   = payments.reduce((s, py) => s + Number(py.amount || 0), 0);
  const parentMsg  = docBody.parentMsg || '';
  const translatingUi = machineActive && (mtLoading || docBody.busy);

  const [schoolLogoB64, setSchoolLogoB64] = useState(null);
  const [otherLogoB64, setOtherLogoB64]   = useState(null);
  const [sigB64, setSigB64]               = useState(null);
  const [stampB64, setStampB64]           = useState(null);
  const [qrB64, setQrB64]                 = useState(null);
  const [vUrl, setVUrl]                   = useState(null);
  const [qrLoading, setQrLoading]         = useState(true);
  const [downloading, setDownloading]     = useState(false);

  const today      = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const st         = STATUS_CFG[rec.status] || STATUS_CFG.approved;
  const statusLabel = getStatusLabelSafe(viewerLang, rec.status) || st.label;

  // Load all binary assets
  useEffect(() => {
    const sigs = rec.signatures || {};
    Promise.all([
      toBase64(imgUrl(sigs.school_logo_path || rec.schoolLogoPath)),
      toBase64(imgUrl(sigs.other_logo_path  || rec.otherLogoPath)),
      toBase64(imgUrl(sigs.director_sig_path || rec.signaturePath)),
      toBase64(imgUrl(sigs.stamp_path       || rec.stampPath)),
    ]).then(([logo, other, sig, stamp]) => {
      setSchoolLogoB64(logo);
      setOtherLogoB64(other);
      setSigB64(sig);
      setStampB64(stamp);
    });

    // Load QR
    setQrLoading(true);
    const qrPath = (sigs.qr_code_path) || rec.qr_code_path || rec.qrCodeUrl;
    if (qrPath) {
      toBase64(imgUrl(qrPath)).then(b64 => {
        setQrB64(b64);
        setVUrl(sigs.qr_view_url || rec.qr_view_url || rec.qrViewUrl || null);
        setQrLoading(false);
      });
    } else if (rec.id) {
      // Try to fetch QR from API
      fetch(`${API}/babyeyi/${rec.id}/qrcode`)
        .then(r => r.json())
        .then(async d => {
          if (d.success && d.data?.qr_code_url) {
            const b64 = await toBase64(imgUrl(d.data.qr_code_url));
            setQrB64(b64);
            setVUrl(d.data.qr_view_url || null);
          }
        })
        .catch(() => {})
        .finally(() => setQrLoading(false));
    } else {
      setQrLoading(false);
    }
  }, [rec.id]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html = buildDocHTML({
        rec: merged,
        payments,
        banks,
        requirements,
        classNotes,
        otherInfos,
        leaders,
        totalFee,
        today,
        schoolLogoB64,
        otherLogoB64,
        sigB64,
        stampB64,
        qrB64,
        vUrl,
        T,
        parentMsg: docBody.parentMsg,
      });
      const clsLabel = merged.classes_json ? (() => {
        try {
          const arr = typeof merged.classes_json === "string" ? JSON.parse(merged.classes_json) : merged.classes_json;
          if (Array.isArray(arr) && arr.length) return arr.join("-");
        } catch {}
        return null;
      })() : null;
      const langTag = normalizeBabyeyiLang(viewerLang);
      await downloadAsPDF(
        html,
        `Babyeyi-${rec.doc_id || clsLabel || merged.class_name || merged.class}-${merged.term}-${langTag}.pdf`
      );
    } catch (e) {
      alert('PDF error: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const DOC = {
    heading: { fontSize: '14px', fontWeight: 700, color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.05em' },
    body:    { fontSize: '12px', color: '#1e293b', lineHeight: '1.7' },
    label:   { fontSize: '12px', color: '#64748b', fontWeight: 600 },
    th:      { padding: '8px 12px', fontSize: '12px', fontWeight: 700, color: '#1e3a5f', borderBottom: '2px solid #1e3a5f', textAlign: 'left', background: 'transparent' },
    td:      { padding: '7px 12px', fontSize: '12px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', background: 'transparent' },
  };

  const tblStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '8px' };

  const Th = ({ children, center, w, right }) => (
    <th style={{ ...DOC.th, textAlign: right ? 'right' : center ? 'center' : 'left', width: w || 'auto' }}>{children}</th>
  );
  const Td = ({ children, center, mono, bold, color, italic }) => (
    <td style={{ ...DOC.td, textAlign: center ? 'center' : 'left', fontFamily: mono ? 'monospace' : 'inherit', fontWeight: bold ? 700 : 400, color: color || DOC.td.color, fontStyle: italic ? 'italic' : 'normal' }}>{children}</td>
  );
  const DocHeading = ({ title }) => title ? (
    <div style={{ borderBottom: '1.5px solid #1e3a5f', paddingBottom: '5px', marginBottom: '12px', marginTop: '20px' }}>
      <span style={DOC.heading}>{title}</span>
    </div>
  ) : null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/75 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-4">
        {/* Toolbar */}
        <div className="rounded-t-2xl px-4 py-3 flex items-center gap-2 flex-wrap relative" style={{ background: '#0f172a' }}>
          <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold">
            ← {T.backBtn || 'Back'}
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm truncate">
              {rec.school_name}  {getClassLabel(merged)} · {rec.term} · {rec.academic_year}
              {rec.doc_id && (
                <span className="ml-2 px-2 py-0.5 bg-indigo-600/40 text-indigo-200 rounded text-[9px] font-mono">{rec.doc_id}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <FinderLangSwitcher
              value={viewerLang}
              onChange={onViewerLangChange}
              disabled={!!docLoading}
              label={T.language}
              searchPlaceholder={T.finderSearchLangPlaceholder}
              noMatchText={T.finderNoLangMatch}
            />
            <span style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black">
              <span style={{ background: st.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
              {statusLabel}
            </span>
            {rec.doc_id && (
              <a href={`${SERVER.replace(':5100', ':5173')}/babyeyi/verify/${rec.doc_id}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600/20 border border-emerald-600/30 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-[10px] font-bold">
                <Shield size={11} /> {T.verify}
              </a>
            )}
            <button onClick={handleDownloadPDF} disabled={downloading || translatingUi}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white rounded-xl text-[10px] font-bold">
              {downloading
                ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full inline-block" style={{ animation: 'spin .8s linear infinite' }} />
                : <Download size={11} />}
              {downloading ? (T.generatingQr || 'Generating…') : T.pdfBtn}
            </button>
          </div>
          {(docLoading || translatingUi) && (
            <div className="absolute inset-0 z-[10] flex items-center justify-center rounded-t-2xl bg-slate-950/55 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-white text-[11px] font-bold">
                <Loader2 size={16} className="animate-spin text-amber-400 shrink-0" />
                {docLoading ? (T.loading || 'Loading…') : (T.translating || T.translateDoc || 'Translating…')}
              </div>
            </div>
          )}
        </div>

        {qrLoading && (
          <div className="bg-indigo-900/30 border-b border-indigo-500/30 px-4 py-1.5 flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-indigo-300/30 border-t-indigo-300 rounded-full inline-block" style={{ animation: 'spin .8s linear infinite' }} />
            <p className="text-indigo-300 text-[10px] font-bold">{T.loadingQr || 'Loading QR code…'}</p>
          </div>
        )}

        {/* ── WORD-DOCUMENT BODY ── */}
        <div className="bg-white shadow-2xl rounded-b-2xl overflow-hidden" style={{ fontFamily: "Georgia,'Times New Roman',serif" }}>
          <div style={{ height: '3px', background: '#1e3a5f' }} />

          {/* HEADER */}
          <div style={{ padding: '20px 40px 16px', borderBottom: '2px solid #1e3a5f' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* School logo (left) */}
              <div style={{ flexShrink: 0, width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {schoolLogoB64
                  ? <img src={schoolLogoB64} style={{ width: '110px', height: '110px', objectFit: 'contain' }} alt="School Logo" />
                  : <span style={{ fontSize: '8px', color: '#64748b', textAlign: 'center', fontWeight: 700, padding: '4px', lineHeight: '1.4' }}>{T.schoolLogoPlaceholder}</span>}
              </div>
              {/* Center */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '0', lineHeight: '1.8' }}>
                  {T.district}: <strong style={{ color: '#1e3a5f' }}>{rec.school_district || rec.district || '—'}</strong>
                </p>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '0 0 6px', lineHeight: '1.8' }}>
                  {T.sector}: <strong style={{ color: '#1e3a5f' }}>{rec.school_sector || rec.sector || '—'}</strong>
                </p>
                <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#1e3a5f', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.03em' }}>
                  {rec.school_name}
                </h1>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                  {[[T.academicYear, rec.academic_year], [T.termLabel, rec.term], [T.levelLabel, rec.education_level || rec.level], [T.classLabel, getClassLabel(merged)]].map(([l, v], i) => (
                    <span key={i} style={DOC.body}><strong style={{ color: '#1e3a5f' }}>{l}:</strong> {v || '—'}</span>
                  ))}
                  {rec.doc_id && (
                    <span style={{ ...DOC.body, fontFamily: 'monospace', fontWeight: 700, color: '#3730a3', border: '1px solid #c7d2fe', padding: '1px 8px' }}>
                      {rec.doc_id}
                    </span>
                  )}
                </div>
              </div>
              {/* Other logo (right) */}
              <div style={{ flexShrink: 0, width: '84px', height: '84px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {otherLogoB64
                  ? <img src={otherLogoB64} style={{ width: '80px', height: '80px', objectFit: 'contain' }} alt="Other Logo" />
                  : <img src={babyeyiLogo} style={{ width: '72px', height: '72px', objectFit: 'contain' }} alt="Babyeyi" />}
              </div>
            </div>
          </div>

          {/* BODY */}
          <div style={{ padding: '20px 40px 28px' }}>
            {parentMsg.trim() ? (
              <div style={{ marginBottom: '22px' }}>
                <DocHeading title={T.parentMessageHeading} />
                <div style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  <p style={{ ...DOC.body, whiteSpace: 'pre-line', margin: 0 }}>{parentMsg}</p>
                </div>
              </div>
            ) : null}

            {/* Payments */}
            {payments.length > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <DocHeading title={T.secFee} />
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>{T.thNo}</Th><Th>{T.thPaymentItem}</Th><Th right>{T.thAmount}</Th></tr></thead>
                  <tbody>
                    {payments.map((pay, i) => (
                      <tr key={i}>
                        <Td center color="#64748b">{i + 1}</Td>
                        <Td>{pay.name}</Td>
                        <td style={{ ...DOC.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{Number(pay.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} style={{ padding: '9px 12px', fontSize: '14px', fontWeight: 700, color: '#1e3a5f', borderTop: '2px solid #1e3a5f' }}>{T.thTotalLabel}</td>
                      <td style={{ padding: '9px 12px', fontSize: '14px', fontWeight: 700, color: '#1e3a5f', borderTop: '2px solid #1e3a5f', textAlign: 'right', fontFamily: 'monospace' }}>RWF {totalFee.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Banks */}
            {banks.length > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <DocHeading title={T.secBanking} />
                <table style={tblStyle}>
                  <thead><tr><Th w="40px" center>{T.thHash}</Th><Th>{T.thBank}</Th><Th>{T.thAccount}</Th><Th>{T.thAccountName}</Th><Th w="80px" center>{T.thPrimary}</Th></tr></thead>
                  <tbody>
                    {banks.map((bk, i) => (
                      <tr key={i}>
                        <Td center color="#64748b">{i + 1}</Td>
                        <Td bold>{bk.bankName || bk.bank_name || '—'}</Td>
                        <Td mono>{bk.accountNumber || bk.bank_account_no || '—'}</Td>
                        <Td>{bk.accountName || bk.bank_account_name || '—'}</Td>
                        <Td center color="#059669" bold>{bk.isPrimary || i === 0 ? '✓' : ''}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Requirements */}
            {requirements.length > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <DocHeading title={T.secRequirements} />
                <table style={tblStyle}>
                  <thead>
                    <tr>
                      <Th w="42px" center>{T.thHash}</Th>
                      <Th>{T.thItem}</Th>
                      <Th>{T.thDescription}</Th>
                      <Th w="80px" center>{T.thQuantity}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {requirements.map((r, i) => (
                      <tr key={i}>
                        <Td center color="#64748b">{i + 1}</Td>
                        <Td>{(r && r.item) || r}</Td>
                        <Td>{(r && r.description) || ""}</Td>
                        <Td center>{(r && r.quantity) || ""}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Other infos */}
            {otherInfos.length > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <DocHeading title={T.secOtherInfo} />
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>{T.thHash}</Th><Th>{T.thItem}</Th><Th>{T.thDetails}</Th></tr></thead>
                  <tbody>
                    {otherInfos.map((n, i) => (
                      <tr key={i}><Td center color="#64748b">{i + 1}</Td><Td bold>{n.item || ''}</Td><Td>{n.details || ''}</Td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Leaders */}
            {leaders.length > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <DocHeading title={T.secLeadership} />
                <table style={tblStyle}>
                  <thead><tr><Th w="36px" center>{T.thHash}</Th><Th>{T.thFullName}</Th><Th>{T.thRole}</Th><Th>{T.thPhone}</Th><Th>{T.thEmail}</Th></tr></thead>
                  <tbody>
                    {leaders.map((l, i) => (
                      <tr key={i}>
                        <Td center color="#64748b">{i + 1}</Td>
                        <td style={{ ...DOC.td }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid #1e3a5f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#1e3a5f' }}>{(l.name || l.leader_name || '?')[0].toUpperCase()}</span>
                            </div>
                            <span style={{ fontWeight: 700, color: '#1e3a5f', fontSize: '12px' }}>{l.name || l.leader_name || '—'}</span>
                          </div>
                        </td>
                        <Td italic color="#475569">{l.role || l.leader_role || '—'}</Td>
                        <Td mono>{l.phone ? `+250 ${l.phone}` : '—'}</Td>
                        <td style={{ ...DOC.td, fontSize: '11px', color: '#2563eb' }}>{l.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Class notes */}
            {classNotes.length > 0 && (
              <div style={{ marginBottom: '22px' }}>
                <DocHeading title={T.secClassNotes} />
                <table style={tblStyle}>
                  <thead><tr><Th w="42px" center>{T.thHash}</Th><Th>{T.thItem}</Th><Th>{T.thDetails}</Th></tr></thead>
                  <tbody>
                    {classNotes.map((n, i) => (
                      <tr key={i}><Td center color="#64748b">{i + 1}</Td><Td bold>{n.item || ''}</Td><Td>{n.details || '—'}</Td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Authorization & Signatures */}
            <div style={{ marginBottom: '22px' }}>
              <DocHeading title={T.secAuth} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '12px' }}>
                {/* Signature */}
                <div style={{ border: '1px solid #e2e8f0', padding: '14px', textAlign: 'center' }}>
                  <p style={{ ...DOC.label, textTransform: 'uppercase', fontSize: '11px', margin: '0 0 8px' }}>{T.sigHeadTeacher}</p>
                  <div style={{ height: '52px', borderBottom: '1px solid #cbd5e1', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px', marginBottom: '6px' }}>
                    {sigB64 && <img src={sigB64} style={{ maxHeight: '48px', maxWidth: '140px', objectFit: 'contain' }} alt="Signature" />}
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{sigB64 ? T.sigSigned : T.sigRequired}</p>
                </div>
                {/* QR */}
                <div style={{ border: '1px solid #e2e8f0', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {qrB64 ? (
                    <>
                      <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '4px' }}>
                        <img src={qrB64} style={{ width: '80px', height: '80px', objectFit: 'contain', display: 'block' }} alt="QR Code" />
                      </div>
                      <p style={{ fontSize: '10px', color: '#1e3a5f', fontWeight: 700, margin: '6px 0 0', textTransform: 'uppercase', letterSpacing: '.05em' }}>{T.sigScanVerify}</p>
                      {rec.doc_id && <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0 0', fontFamily: 'monospace' }}>ID: {rec.doc_id}</p>}
                      {vUrl && <p style={{ fontSize: '9px', color: '#4f46e5', margin: '2px 0 0', textAlign: 'center', maxWidth: '110px', wordBreak: 'break-all' }}>{vUrl}</p>}
                    </>
                  ) : qrLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #e0e7ff', borderTopColor: '#4f46e5', animation: 'spin .8s linear infinite' }} />
                      <span style={{ fontSize: '10px', color: '#4f46e5', fontWeight: 700 }}>{T.generatingQr}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: 80, height: 80, border: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '22px', opacity: .1 }}>▣</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>{T.qrPending}</span>
                    </div>
                  )}
                </div>
                {/* Stamp */}
                <div style={{ border: '1px solid #e2e8f0', padding: '14px', textAlign: 'center' }}>
                  <p style={{ ...DOC.label, textTransform: 'uppercase', fontSize: '11px', margin: '0 0 8px' }}>{T.sigStamp}</p>
                  <div style={{ width: '80px', height: '80px', border: '1px dashed #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', margin: '0 auto 6px' }}>
                    {stampB64 ? <img src={stampB64} style={{ width: '76px', height: '76px', objectFit: 'contain', borderRadius: '50%' }} alt="Stamp" /> : <span style={{ fontSize: '22px', opacity: .08 }}>🔏</span>}
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>{T.sigCachet}</p>
                </div>
              </div>
            </div>
          </div>
          <div style={{ height: '3px', background: '#1e3a5f' }} />
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function payImgUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${SERVER}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

function ViewAndPayModal({ open, onClose, rec, schoolId, schoolName, theme, onContinue }) {
  const { p } = theme;
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [data, setData] = useState(null);
  const [feeSel, setFeeSel] = useState(() => new Set());
  const [reqSel, setReqSel] = useState(() => new Set());
  const [imgPreview, setImgPreview] = useState(null);

  useEffect(() => {
    if (!open || !rec?.id || !schoolId) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setData(null);
    fetch(`${API}/public/babyeyi-pay/pricing/${rec.id}?school_id=${encodeURIComponent(schoolId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j.success) throw new Error(j.message || 'Could not load pricing');
        setData(j.data);
        const fees = j.data.school_fees || [];
        const reqs = j.data.requirements || [];
        setFeeSel(new Set(fees.map((f) => f.id)));
        setReqSel(new Set(reqs.map((x) => x.babyeyi_requirement_id)));
      })
      .catch((e) => { if (!cancelled) setErr(e.message || 'Failed'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, rec?.id, schoolId]);

  const feeTotal = useMemo(() => {
    if (!data?.school_fees) return 0;
    return data.school_fees.filter((f) => feeSel.has(f.id)).reduce((s, f) => s + Number(f.amount || 0), 0);
  }, [data, feeSel]);

  const reqTotal = useMemo(() => {
    if (!data?.requirements) return 0;
    return data.requirements
      .filter((r) => reqSel.has(r.babyeyi_requirement_id))
      .reduce((s, r) => s + Number(r.line_total_rwf ?? r.price ?? 0), 0);
  }, [data, reqSel]);

  const grand = Math.round((feeTotal + reqTotal) * 100) / 100;

  const toggleFee = (id) => {
    setFeeSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleReq = (id) => {
    setReqSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleContinue = () => {
    if (grand <= 0) return;
    onContinue({
      grandTotal: grand,
      selectedFeeIds: Array.from(feeSel),
      selectedReqIds: Array.from(reqSel),
      pricing: data,
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[min(92dvh,900px)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-amber-100 shrink-0">
          <div>
            <h3 className="font-black text-gray-900 text-sm sm:text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" style={{ color: p }} /> View &amp; pay
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {schoolName || 'School'} · {rec.class_name || '—'} · {rec.term} · {rec.academic_year}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: p }} />
            </div>
          )}
          {err && (
            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">{err}</div>
          )}
          {!loading && !err && data && (
            <>
              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-2">School fee items</h4>
                <p className="text-[11px] text-gray-500 mb-2">Uncheck any fee you are not paying now. Total updates automatically.</p>
                {(data.school_fees || []).length === 0 ? (
                  <p className="text-sm text-gray-400">No separate fee lines see total fee on the document.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.school_fees.map((f) => (
                      <li key={f.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/80">
                        <input
                          type="checkbox"
                          checked={feeSel.has(f.id)}
                          onChange={() => toggleFee(f.id)}
                          className="mt-1 w-4 h-4 rounded border-gray-300"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm flex flex-wrap items-center gap-1.5">
                            {f.name || 'Fee item'}
                            {(f.pay_source === 'requirement_paid_at_school' || f.pay_source === 'payment_paid_at_school') && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                Paid at school
                              </span>
                            )}
                          </p>
                          <p className="font-mono font-black text-amber-700">{Number(f.amount || 0).toLocaleString()} RWF</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-2">Student requirements</h4>
                <p className="text-[11px] text-gray-500 mb-2">Unit price × quantity. Catalog images when the name matches the Super Admin list.</p>
                {(data.requirements || []).length === 0 ? (
                  <p className="text-sm text-gray-400">No requirement lines for this Babyeyi.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-amber-100">
                    <table className="w-full text-xs sm:text-sm min-w-[520px]">
                      <thead>
                        <tr className="bg-amber-50/80 text-left text-[10px] font-black uppercase text-amber-900">
                          <th className="p-2 w-8" />
                          <th className="p-2">Cat.</th>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Unit</th>
                          <th className="p-2 text-right">Line</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.requirements.map((r) => (
                          <tr key={r.babyeyi_requirement_id} className="border-t border-amber-50">
                            <td className="p-2 align-top">
                              <input
                                type="checkbox"
                                checked={reqSel.has(r.babyeyi_requirement_id)}
                                onChange={() => toggleReq(r.babyeyi_requirement_id)}
                                className="w-4 h-4 rounded"
                              />
                            </td>
                            <td className="p-2 align-top w-16">
                              {r.catalog_image_url ? (
                                <div className="flex items-center gap-1">
                                  <img src={payImgUrl(r.catalog_image_url)} alt="" className="w-10 h-10 object-contain rounded border border-amber-100" />
                                  <button
                                    type="button"
                                    className="p-1 rounded border border-amber-200 bg-amber-50"
                                    onClick={() => setImgPreview(payImgUrl(r.catalog_image_url))}
                                  >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="p-2 align-top">
                              <span className="font-semibold text-gray-900">{r.requirement_name}</span>
                              {r.description ? <span className="block text-[10px] text-gray-500">{r.description}</span> : null}
                            </td>
                            <td className="p-2 text-right tabular-nums">{r.quantity != null && String(r.quantity).trim() !== '' ? String(r.quantity) : '1'}</td>
                            <td className="p-2 text-right font-mono tabular-nums">{Number(r.unit_price_rwf ?? 0).toLocaleString()}</td>
                            <td className="p-2 text-right font-bold text-amber-700 tabular-nums">{Number(r.line_total_rwf ?? r.price ?? 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 flex justify-between items-center">
                <span className="font-black text-gray-900">Selected total</span>
                <span className="text-xl font-black" style={{ color: p }}>{grand.toLocaleString()} RWF</span>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-amber-100 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-700"
          >
            Close
          </button>
          <button
            type="button"
            disabled={loading || !!err || grand <= 0}
            onClick={handleContinue}
            className="flex-1 py-3 rounded-xl font-black text-white disabled:opacity-50"
            style={{ background: p }}
          >
            Continue to payment 
          </button>
        </div>
      </div>

      {imgPreview && (
        <div className="fixed inset-0 z-[400] bg-black/85 flex items-center justify-center p-4" onClick={() => setImgPreview(null)}>
          <button type="button" className="absolute top-4 right-4 text-white p-2" onClick={() => setImgPreview(null)} aria-label="Close">
            <X className="w-6 h-6" />
          </button>
          <img src={imgPreview} alt="" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN BABYEYI FINDER SECTION
// ═══════════════════════════════════════════════════════════════════════════════
export default function BabyeyiFinder({ school, theme, schoolSlug, siteLang, openModal = false, onCloseModal, lookupPrefill = null, autoOpenSingleResult = false, modernBackground = true, publicPayNoLogin = false, publicPayFromSchoolSite = false, finderLightSurface = false }) {
  const { i18n } = useTranslation();
  const { p, a, s } = theme;
  const navigate = useNavigate();

  const [year,     setYear]     = useState('');
  const [cls,      setCls]      = useState('');
  const [term,     setTerm]     = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [error,    setError]    = useState(null);
  const [viewing,  setViewing]  = useState(null);
  const [loadingView, setLoadingView] = useState(false);
  const [openingAuto, setOpeningAuto] = useState(false);
  const [finderModalOpen, setFinderModalOpen] = useState(false);

  const FINDER_LANG_STORAGE = 'babyeyi_finder_lang';
  const syncedSiteLang = normalizeBabyeyiLang(siteLang || i18n.language);
  const [viewerLang, setViewerLang] = useState(() => {
    if (siteLang) return syncedSiteLang;
    try {
      const raw = localStorage.getItem(FINDER_LANG_STORAGE);
      if (raw) return normalizeBabyeyiLang(raw);
    } catch {}
    return syncedSiteLang;
  });
  const lastViewSumRef = useRef(null);

  useEffect(() => {
    if (siteLang) {
      setViewerLang(normalizeBabyeyiLang(siteLang));
      return;
    }
    setViewerLang(normalizeBabyeyiLang(i18n.language));
  }, [siteLang, i18n.language]);

  const { T: finderT } = useBabyeyiUiT(viewerLang);
  const finderInfoResolved = useMemo(() => {
    const raw = finderT.finderInfoBody || '';
    return raw.replace(/\{school\}/g, school?.name || 'this school');
  }, [finderT.finderInfoBody, school?.name]);

  // We must resolve schoolId from the mini-website data
  const schoolId = school?.schoolId || school?.id || school?.school_id || null;

  const startPublicPayFlow = (rec) => {
    const code = (studentCode || lookupPrefill?.code || "").trim();
    const q = new URLSearchParams();
    if (code) q.set("code", code);
    navigate(q.toString() ? `/paid-at-school?${q.toString()}` : "/paid-at-school");
  };

  const handleSearch = async (override = null) => {
    const useYear = override?.year ?? year;
    const useClass = override?.cls ?? cls;
    const useTerm = override?.term ?? term;
    const bypassValidation = !!override?.bypassValidation;
    if (!bypassValidation && !useYear && !useClass && !useTerm) {
      setError(finderT.finderFilterError);
      return;
    }
    // Guard: school_id is required so the backend allows the unauthenticated request
    if (!schoolId) {
      setError(finderT.finderSchoolMissingError);
      return;
    }
    setError(null);
    setLoading(true);
    setSearched(false);
    setResults([]);

    try {
      // school_id MUST be first — the backend middleware uses its presence
      // to decide whether to require authentication on this public route
      const params = new URLSearchParams({ school_id: schoolId, limit: '20' });
      if (useYear) params.set('year', useYear);
      if (useClass)  params.set('search', useClass);
      if (useTerm) params.set('term', useTerm);

      const res  = await fetch(`${API}/babyeyi?${params.toString()}`);
      // NOTE: no `credentials: 'include'` — this is a public unauthenticated call
      const json = await res.json();

      if (!json.success) throw new Error(json.message || 'Failed to fetch records');

      // Double-check school ownership on client side for safety
      const filtered = (json.data || []).filter(r => {
        // Only show if school_id matches (the API should already filter, this is a safety net)
        if (schoolId && r.school_id && Number(r.school_id) !== Number(schoolId)) return false;
        // Only show approved documents to the public
        return r.status === 'approved';
      });

      setResults(filtered);
      // Optional: when true, opens the document viewer immediately if exactly one result (off by default).
      if (autoOpenSingleResult && filtered.length === 1) {
        setOpeningAuto(true);
        if (finderModalOpen) closeFinderModal();
        await handleView(filtered[0]);
        setOpeningAuto(false);
      }
    } catch (e) {
      setError(e.message || finderT.finderFetchError);
      setOpeningAuto(false);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const runStudentCodeLookup = async (codeOverride = null) => {
    const code = (codeOverride ?? studentCode).trim();
    if (!code) {
      setError(finderT.finderStudentCodeRequired);
      return;
    }
    if (!schoolId) {
      setError(finderT.finderSchoolMissingError);
      return;
    }
    setLoading(true);
    setError(null);
    setSearched(false);
    setResults([]);
    try {
      const res = await fetch(`${API}/public/student-code-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false || !json.found || !json.data) {
        throw new Error(json.message || finderT.finderStudentNotFound);
      }
      const data = json.data;
      const currentSchoolId = String(schoolId || '').trim();
      const lookupSchoolId = String(data.school_id || data.schoolId || '').trim();
      if (currentSchoolId && lookupSchoolId && currentSchoolId !== lookupSchoolId) {
        throw new Error(finderT.finderWrongSchoolError);
      }
      const nextYear = data.academic_year || '';
      const nextTerm = data.term || '';
      const nextCls = data.class_name || data.class || '';
      if (nextYear) setYear(nextYear);
      if (nextTerm) setTerm(nextTerm);
      if (nextCls) setCls(nextCls);
      await handleSearch({ year: nextYear, term: nextTerm, cls: nextCls, bypassValidation: true });
    } catch (e) {
      setError(pickStudentLookupMessage(e.message, finderT));
      setOpeningAuto(false);
      setLoading(false);
      setSearched(true);
    }
  };

  const handleViewerLangChange = async (lang) => {
    const n = normalizeBabyeyiLang(lang);
    setViewerLang(n);
    try {
      localStorage.setItem(FINDER_LANG_STORAGE, n);
    } catch {}
    const sum = lastViewSumRef.current;
    if (!sum?.id) return;
    setLoadingView(true);
    setError(null);
    try {
      const full = await loadBabyeyiFullRecord(sum, n);
      setViewing(full);
    } catch (e) {
      setError(e.message || finderT.finderLoadLangError);
    } finally {
      setLoadingView(false);
    }
  };

  const handleView = async (sumRec) => {
    lastViewSumRef.current = sumRec;
    setLoadingView(true);
    setError(null);
    try {
      const full = await loadBabyeyiFullRecord(sumRec, viewerLang);
      setViewing(full);
    } catch (e) {
      setError(`${finderT.finderOpenDocFailed} ${e.message}`.trim());
    } finally {
      setLoadingView(false);
    }
  };

  const hasFilters = year || cls || term;
  const fs = finderLightSurface;
  const closeFinderModal = () => {
    setFinderModalOpen(false);
    if (typeof onCloseModal === 'function') onCloseModal();
  };

  useEffect(() => {
    if (openModal) setFinderModalOpen(true);
  }, [openModal]);

  useEffect(() => {
    if (!lookupPrefill?.ts) return;
    setFinderModalOpen(true);
    const nextCode = lookupPrefill.code || '';
    const nextYear = lookupPrefill.academicYear || '';
    const nextTerm = lookupPrefill.term || '';
    const nextCls = lookupPrefill.className || '';
    setStudentCode(nextCode);
    if (nextYear) setYear(nextYear);
    if (nextTerm) setTerm(nextTerm);
    if (nextCls) setCls(nextCls);
    if (nextCode) {
      runStudentCodeLookup(nextCode);
    } else if (nextYear || nextTerm || nextCls) {
      handleSearch({ year: nextYear, term: nextTerm, cls: nextCls });
    }
  }, [lookupPrefill?.ts]);

  return (
    <>
      {finderModalOpen && (
        <div className="fixed inset-0 z-[280] bg-black/55 p-3 sm:p-6 flex items-end sm:items-center justify-center" onClick={closeFinderModal}>
          <div className="w-full max-w-3xl bg-[#000435] rounded-3xl shadow-2xl border border-amber-400/30 max-h-[92dvh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">{finderT.finderModalEyebrow}</p>
                <h3 className="text-base sm:text-lg font-black text-white">{finderT.finderModalTitle}</h3>
                <p className="text-xs text-white/60 mt-0.5">{finderT.finderModalSubtitle}</p>
              </div>
              <button type="button" onClick={closeFinderModal} className="p-2 rounded-xl hover:bg-white/10 text-white/80" aria-label={finderT.finderAriaClose}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              <div className="grid sm:grid-cols-[1fr_auto] gap-3">
                <input
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder={finderT.finderStudentCodePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-white focus:outline-none transition-all bg-white/5 border-white/20 placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={() => runStudentCodeLookup()}
                  disabled={loading}
                  className="px-3 sm:px-4 py-2.5 rounded-xl font-black text-[11px] sm:text-sm text-[#000435] disabled:opacity-60 leading-snug text-center max-w-full bg-amber-400 hover:bg-amber-300"
                >
                  {finderT.finderConfirmLookupBtn}
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full appearance-none px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-white focus:outline-none transition-all bg-white/5 border-white/20">
                  <option value="">{finderT.finderAllYears}</option>
                  {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
                  <option value={String(currentYear)}>{currentYear}</option>
                  <option value={String(currentYear - 1)}>{currentYear - 1}</option>
                </select>
                <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full appearance-none px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-white focus:outline-none transition-all bg-white/5 border-white/20">
                  <option value="">{finderT.finderAllTerms}</option>
                  {TERM_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={cls} onChange={(e) => setCls(e.target.value)} className="w-full appearance-none px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-white focus:outline-none transition-all bg-white/5 border-white/20">
                  <option value="">{finderT.finderAllClasses}</option>
                  {CLASS_OPTIONS.map((group) => (
                    <optgroup key={group.group} label={group.group}>
                      {group.classes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>

              {error && <div className="text-sm rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-300">{error}</div>}

                  <button onClick={() => handleSearch()} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-[#000435] bg-amber-400 hover:bg-amber-300 disabled:opacity-60">
                {loading ? <><Loader2 size={16} className="animate-spin" /> {finderT.finderSearching}</> : <><Search size={16} /> {finderT.finderSearchBtn}</>}
              </button>
              {openingAuto && (
                <p className="text-xs text-center font-semibold" style={{ color: p }}>
                  {finderT.finderOpening}
                </p>
              )}

              {searched && !loading && (
                <div className="space-y-2">
                  {results.length === 0 ? (
                    <p className="text-sm text-white/65">{finderT.finderNoResultsModal}</p>
                  ) : (
                    results.map((rec) => (
                      <div key={rec.id} className="rounded-xl border border-white/15 bg-white/5 p-3">
                        <p className="font-bold text-sm text-white">{getClassLabel(rec)} · {rec.term} · {rec.academic_year}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" onClick={() => { closeFinderModal(); handleView(rec); }} className="px-3 py-2 rounded-lg text-xs font-black text-[#000435] bg-amber-400 hover:bg-amber-300">{finderT.finderOpenDownloadBtn}</button>
                          <button
                            type="button"
                            onClick={() => { closeFinderModal(); startPublicPayFlow(rec); }}
                            className="px-3 py-2 rounded-lg text-xs font-black border border-amber-400/40 text-amber-300 hover:bg-white/10"
                          >
                            {finderT.finderViewPayBtn}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section id="babyeyi" className={fs ? "relative overflow-hidden py-12 sm:py-16 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100" : "relative overflow-hidden py-12 sm:py-16"} style={{ background: fs ? undefined : (s || 'transparent') }}>
        {modernBackground && (
          fs ? (
            <>
              <img src={Heroimage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.14] pointer-events-none" />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/90 via-slate-50/95 to-slate-100" />
            </>
          ) : (
            <>
              <img src={Heroimage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none" />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(15,23,42,0.96) 0%, rgba(17,24,39,0.88) 38%, rgba(17,24,39,0.78) 65%, rgba(15,23,42,0.9) 100%)' }} />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.92) 8%, rgba(15,23,42,0.45) 48%, rgba(15,23,42,0.15) 100%)' }} />
            </>
          )
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8">

          {/* Section Header */}
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: a }}>
                <span className="w-8 h-px block" style={{ background: a }} />
                {finderT.finderEyebrow}
                <span className="w-8 h-px block" style={{ background: a }} />
              </div>
              <h2 className={fs ? "text-3xl sm:text-4xl font-black leading-tight text-slate-900 mb-3" : "text-3xl sm:text-4xl font-black leading-tight text-white mb-3"}>
                {finderT.finderHeroTitle}
              </h2>
              <p className={fs ? "text-slate-600 text-base max-w-xl sm:mx-0 mx-auto" : "text-white/70 text-base max-w-xl sm:mx-0 mx-auto"}>
                {finderT.finderHeroSubtitle}
              </p>
            </div>
            <div className="flex justify-center sm:justify-end shrink-0 sm:pt-1">
              <FinderLangSwitcher
                value={viewerLang}
                onChange={(code) => {
                  const n = normalizeBabyeyiLang(code);
                  setViewerLang(n);
                  try {
                    localStorage.setItem(FINDER_LANG_STORAGE, n);
                  } catch {}
                }}
                label={finderT.language}
                light={!!fs}
                searchPlaceholder={finderT.finderSearchLangPlaceholder}
                noMatchText={finderT.finderNoLangMatch}
              />
            </div>
          </div>

          {/* Search Card */}
          <div className="max-w-3xl mx-auto">
            <div className={fs ? "rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden bg-white" : "rounded-3xl shadow-2xl border overflow-hidden backdrop-blur-xl bg-white/[0.06]"} style={fs ? undefined : { borderColor: 'rgba(255,255,255,0.14)' }}>
              {/* Card header */}
              <div className={fs ? "px-6 py-5 flex items-center gap-3 border-b border-slate-100 bg-slate-50/90" : "px-6 py-5 flex items-center gap-3 border-b border-white/10"} style={fs ? undefined : { background: 'rgba(255,255,255,0.04)' }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.16)', color: a }}>
                  <Search size={20} />
                </div>
                <div>
                  <h3 className={fs ? "font-black text-slate-900 text-base" : "font-black text-white text-base"}>{finderT.finderCardTitle}</h3>
                  <p className={fs ? "text-xs text-slate-500 mt-0.5" : "text-xs text-white/60 mt-0.5"}>{finderT.finderCardSubtitle}</p>
                </div>
              </div>

              {/* Filters */}
              <div className="p-6 space-y-5">
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Academic Year */}
                  <div>
                    <label className={fs ? "block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5" : "block text-xs font-black text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"}>
                      <Calendar size={11} /> {finderT.academicYear}
                    </label>
                    <div className="relative">
                      <select
                        value={year}
                        onChange={e => setYear(e.target.value)}
                        className={fs ? "w-full appearance-none px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all pr-9" : "w-full appearance-none px-4 py-3 rounded-xl border text-sm font-semibold text-white focus:outline-none transition-all pr-9"}
                        style={fs ? undefined : { borderColor: year ? `${a}aa` : 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', colorScheme: 'dark' }}
                      >
                        <option value="">{finderT.finderAllYears}</option>
                        {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                        <option value={String(currentYear)}>{currentYear}</option>
                        <option value={String(currentYear - 1)}>{currentYear - 1}</option>
                      </select>
                      <ChevronDown size={14} className={fs ? "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" : "absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"} />
                    </div>
                  </div>

                  {/* Term */}
                  <div>
                    <label className={fs ? "block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5" : "block text-xs font-black text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"}>
                      <Calendar size={11} /> {finderT.termLabel}
                    </label>
                    <div className="relative">
                      <select
                        value={term}
                        onChange={e => setTerm(e.target.value)}
                        className={fs ? "w-full appearance-none px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all pr-9" : "w-full appearance-none px-4 py-3 rounded-xl border text-sm font-semibold text-white focus:outline-none transition-all pr-9"}
                        style={fs ? undefined : { borderColor: term ? `${a}aa` : 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', colorScheme: 'dark' }}
                      >
                        <option value="">{finderT.finderAllTerms}</option>
                        {TERM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown size={14} className={fs ? "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" : "absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"} />
                    </div>
                  </div>

                  {/* Class */}
                  <div>
                    <label className={fs ? "block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5" : "block text-xs font-black text-white/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"}>
                      <GraduationCap size={11} /> {finderT.classLabel}
                    </label>
                    <div className="relative">
                      <select
                        value={cls}
                        onChange={e => setCls(e.target.value)}
                        className={fs ? "w-full appearance-none px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all pr-9" : "w-full appearance-none px-4 py-3 rounded-xl border text-sm font-semibold text-white focus:outline-none transition-all pr-9"}
                        style={fs ? undefined : { borderColor: cls ? `${a}aa` : 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', colorScheme: 'dark' }}
                      >
                        <option value="">{finderT.finderAllClasses}</option>
                        {CLASS_OPTIONS.map(group => (
                          <optgroup key={group.group} label={group.group}>
                            {group.classes.map(c => <option key={c} value={c}>{c}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      <ChevronDown size={14} className={fs ? "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" : "absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none"} />
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-red-50 border border-red-100">
                    <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                  </div>
                )}

                {/* Active filter pills */}
                {hasFilters && (
                  <div className="flex flex-wrap gap-2">
                    {year && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border" style={{ background: 'rgba(251,191,36,0.16)', color: a, borderColor: 'rgba(251,191,36,0.35)' }}>
                        <Calendar size={10} /> {year}
                        <button onClick={() => setYear('')} className="hover:opacity-70"><X size={10} /></button>
                      </span>
                    )}
                    {term && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border" style={{ background: 'rgba(251,191,36,0.16)', color: a, borderColor: 'rgba(251,191,36,0.35)' }}>
                        {term}
                        <button onClick={() => setTerm('')} className="hover:opacity-70"><X size={10} /></button>
                      </span>
                    )}
                    {cls && (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border" style={{ background: 'rgba(251,191,36,0.16)', color: a, borderColor: 'rgba(251,191,36,0.35)' }}>
                        <GraduationCap size={10} /> {finderT.finderClassPrefix} {cls}
                        <button onClick={() => setCls('')} className="hover:opacity-70"><X size={10} /></button>
                      </span>
                    )}
                    {hasFilters && (
                      <button onClick={() => { setYear(''); setCls(''); setTerm(''); setStudentCode(''); setResults([]); setSearched(false); }}
                        className={fs ? "flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-300 transition-colors" : "flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold text-white/70 hover:text-red-300 border border-white/20 hover:border-red-300/40 transition-colors"}>
                        <X size={10} /> {finderT.clearAll}
                      </button>
                    )}
                  </div>
                )}

                {/* Search button */}
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #FCD34D, #F59E0B)', color: '#111827', boxShadow: '0 8px 24px rgba(251,191,36,0.35)' }}
                      >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> {finderT.finderSearching}</>
                    : <><Search size={16} /> {finderT.finderSearchBtn}</>}
                </button>
                {openingAuto && (
                  <p className="text-xs text-center font-semibold" style={{ color: p }}>
                    {finderT.finderOpening}
                  </p>
                )}
              </div>
            </div>

            {/* Results */}
            {searched && !loading && (
              <div className="mt-8">
                {results.length === 0 ? (
                  <div className={fs ? "text-center py-16 rounded-3xl border border-dashed border-slate-200 bg-slate-50/80" : "text-center py-16 rounded-3xl border border-dashed bg-white/[0.05]"} style={fs ? undefined : { borderColor: 'rgba(255,255,255,0.2)' }}>
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(251,191,36,0.15)' }}>
                      <FileText size={28} style={{ color: a }} />
                    </div>
                    <h4 className={fs ? "font-black text-slate-900 text-lg mb-2" : "font-black text-white text-lg mb-2"}>{finderT.finderNoDocsTitle}</h4>
                    <p className={fs ? "text-slate-600 text-sm max-w-xs mx-auto" : "text-white/70 text-sm max-w-xs mx-auto"}>
                      {finderT.finderNoDocsBody}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className={fs ? "text-sm font-bold text-slate-700 mb-4" : "text-sm font-bold text-white/75 mb-4"}>
                      {finderT.finderFound} <span style={{ color: a }}>{results.length}</span>{' '}
                      {results.length === 1 ? finderT.finderDocOne : finderT.finderDocMany}
                    </p>
                    {results.map((rec) => {
                      const payments = Array.isArray(rec.payments) ? rec.payments : [];
                      const fee = rec.total_fee ?? rec.totalFee ?? payments.reduce((s, py) => s + Number(py.amount || 0), 0);
                      const st = STATUS_CFG[rec.status] || STATUS_CFG.approved;
                      const statusLabel = getStatusLabelSafe(viewerLang, rec.status) || st.label;
                      let classes = [];
                      try {
                        const raw = rec.classes_json || rec.classesJson || rec.classes || null;
                        if (Array.isArray(raw)) classes = raw;
                        else if (typeof raw === "string" && raw.trim().startsWith("[")) classes = JSON.parse(raw);
                      } catch {}
                      const primaryClass = rec.class_name || rec.class || classes[0] || "";
                      const classLabel = (classes.length ? classes : [primaryClass]).filter(Boolean).join(", ");
                      return (
                        <div key={rec.id}
                          className={fs ? "rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 bg-white shadow-sm" : "rounded-3xl border overflow-hidden hover:shadow-2xl transition-all duration-300 bg-white/[0.06] backdrop-blur-xl"}
                          style={fs ? undefined : { borderColor: 'rgba(255,255,255,0.15)' }}>
                          {/* Top stripe */}
                          <div className="h-1" style={{ background: `linear-gradient(90deg, ${a}, ${p})` }} />
                          <div className="p-5">
                            <div className="flex items-start gap-4 mb-4">
                              {/* Class badge */}
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-[#111827] text-base shadow-lg"
                                style={{ background: a }}>
                                {primaryClass}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <div>
                                    <h4 className={fs ? "font-black text-slate-900 text-base" : "font-black text-white text-base"}>
                                      {classLabel} · {rec.term} · {rec.academic_year}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap mt-1">
                                      <span className={fs ? "text-xs font-bold text-slate-600 flex items-center gap-1" : "text-xs font-bold text-white/70 flex items-center gap-1"}>
                                        <GraduationCap size={11} /> {rec.education_level || rec.level}
                                      </span>
                                      {rec.doc_id && (
                                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded border" style={{ background: 'rgba(251,191,36,0.16)', color: a, borderColor: 'rgba(251,191,36,0.4)' }}>
                                          {rec.doc_id}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black flex-shrink-0">
                                    <span style={{ background: st.dot }} className="w-1.5 h-1.5 rounded-full inline-block" />
                                    {statusLabel}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Fee + bank info */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                              <div className="rounded-2xl px-4 py-3 border" style={{ background: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.35)' }}>
                                <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: a }}>{finderT.finderTotalFeeShort}</p>
                                <p className={fs ? "font-black text-lg font-mono text-slate-900" : "font-black text-lg font-mono text-white"}>{Number(fee).toLocaleString()} <span className="text-sm">RWF</span></p>
                              </div>
                              <div className={fs ? "rounded-2xl px-4 py-3 border border-slate-200 bg-slate-50" : "rounded-2xl px-4 py-3 border bg-white/[0.04]"} style={fs ? undefined : { borderColor: 'rgba(255,255,255,0.16)' }}>
                                <p className={fs ? "text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1" : "text-[10px] font-black uppercase tracking-wider text-white/60 mb-1"}>{finderT.finderBankLabel}</p>
                                <p className={fs ? "font-bold text-sm text-slate-900 truncate" : "font-bold text-sm text-white truncate"}>{rec.bank_name || '—'}</p>
                                {rec.bank_account_no && <p className={fs ? "text-[10px] text-slate-500 font-mono truncate" : "text-[10px] text-white/55 font-mono truncate"}>{rec.bank_account_no}</p>}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row items-stretch gap-2">
                              <button
                                onClick={() => handleView(rec)}
                                disabled={loadingView}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm text-[#111827] hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, #FCD34D, #F59E0B)' }}>
                                {loadingView
                                  ? <Loader2 size={14} className="animate-spin" />
                                  : <Eye size={14} />}
                                <Download size={14} /> {finderT.finderViewDownloadBtn}
                              </button>
                              <button
                                type="button"
                                onClick={() => startPublicPayFlow(rec)}
                                className={fs ? "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm border border-slate-300 bg-white hover:bg-slate-50 transition-colors text-slate-800" : "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm border hover:bg-white/10 transition-colors text-white"}
                                style={fs ? undefined : { borderColor: 'rgba(255,255,255,0.28)' }}
                              >
                                <DollarSign size={14} /> {finderT.finderViewPayBtn}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Info note */}
            {!searched && (
              <div className={fs ? "mt-6 p-5 rounded-2xl border border-amber-200/80 flex items-start gap-3 bg-amber-50/90" : "mt-6 p-5 rounded-2xl border flex items-start gap-3 bg-white/[0.05]"} style={fs ? undefined : { borderColor: 'rgba(255,255,255,0.2)' }}>
                <div className="flex-shrink-0 mt-0.5" style={{ color: p }}>
                  <Shield size={16} />
                </div>
                <div>
                  <p className="font-black text-sm mb-1" style={{ color: a }}>{finderT.finderInfoTitle}</p>
                  <p className={fs ? "text-xs text-slate-700 leading-relaxed" : "text-xs text-white/70 leading-relaxed"}>
                    {finderInfoResolved}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Document Viewer Modal */}
      {viewing && (
        <DocumentViewer
          rec={viewing}
          theme={theme}
          onClose={() => setViewing(null)}
          viewerLang={viewerLang}
          onViewerLangChange={handleViewerLangChange}
          docLoading={loadingView}
        />
      )}

    </>
  );
}