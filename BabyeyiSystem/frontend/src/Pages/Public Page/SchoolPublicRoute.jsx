/**
 * SchoolPublicRoute.jsx — v5.0
 * Modern editorial design: Amber + #1F2937
 * Montserrat typography
 * Fully mobile-responsive
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Loader2, X, Menu, ChevronLeft, ChevronRight, MapPin, Phone, Mail,
  Facebook, Twitter, Instagram, Globe, Check, FileText, ArrowRight,
  Award, GraduationCap, Calendar, Camera, ZoomIn, Target, Lightbulb,
  CheckCircle2, Download, Users, AlertCircle, BookOpen, Star, Clock,
  DollarSign, Building2, Shield, Wrench, ExternalLink, Send, Upload,
  ChevronDown, Eye, Heart, Share2, Bell, Home, Info, Layers,
  CreditCard, Image, UserCheck, MessageSquare, Navigation, Search,
  TrendingUp, Activity, BarChart3, Sparkles, Play, CheckCircle,
  RefreshCw, Newspaper, Banknote,
} from 'lucide-react';
import ApplicationStatusTracker from "./ApplicationStatusTracker";
import BabyeyiFinder from './BabyeyiFinder';
import { translateAdmissionForm } from '../../babyeyiPublic/schoolSiteContentTranslate';
import { normalizeBabyeyiLang } from '../../manager/schoolLiteSupport/babyeyiTranslateLangs';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SERVER  = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const API     = `${SERVER}/api/mini-websites`;
const ADM_API = `${SERVER}/api/admissions`;

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

// ─── THEMES ──────────────────────────────────────────────────────────────────
const THEMES = {
  blue:    { p: '#1D4ED8', s: '#EFF6FF', a: '#FBBF24', dark: '#1e3a5f' },
  green:   { p: '#059669', s: '#F0FDF4', a: '#FBBF24', dark: '#064e3b' },
  maroon:  { p: '#881337', s: '#FFF1F2', a: '#D97706', dark: '#4c0519' },
  teal:    { p: '#0F766E', s: '#F0FDFA', a: '#F59E0B', dark: '#134e4a' },
  purple:  { p: '#6D28D9', s: '#F5F3FF', a: '#F59E0B', dark: '#3b0764' },
  dark:    { p: '#111827', s: '#F9FAFB', a: '#FBBF24', dark: '#111827' },
  navy:    { p: '#1E3A5F', s: '#EFF6FF', a: '#F97316', dark: '#1e3a5f' },
  crimson: { p: '#DC2626', s: '#FEF2F2', a: '#FCD34D', dark: '#7f1d1d' },
  orange:  { p: '#EA580C', s: '#FFF7ED', a: '#FBBF24', dark: '#7c2d12' },
  slate:   { p: '#475569', s: '#F8FAFC', a: '#06B6D4', dark: '#1e293b' },
  pink:    { p: '#DB2777', s: '#FDF2F8', a: '#FBBF24', dark: '#831843' },
  indigo:  { p: '#3730A3', s: '#EEF2FF', a: '#F59E0B', dark: '#1e1b4b' },
  custom:  { p: '#1A1A1A', s: '#FFFFFF', a: '#FEBF10', dark: '#1A1A1A' },
};

const FEE_LEVELS = [
  { id: 'nursery', label: 'Nursery / Pre-Primary', icon: <Sparkles size={16} /> },
  { id: 'primary', label: 'Primary School',        icon: <BookOpen size={16} /> },
  { id: 'olevel',  label: 'O-Level (S1–S3)',        icon: <GraduationCap size={16} /> },
  { id: 'alevel',  label: 'A-Level (S4–S6)',        icon: <Award size={16} /> },
  { id: 'tvet',    label: 'TVET',                   icon: <Wrench size={16} /> },
];
const formatProgramLabel = (raw) => String(raw || '')
  .replace(/^custom:/i, '')
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean)
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  .join(' ');

const montserrat = { fontFamily: "'Montserrat', sans-serif" };
const syne = montserrat;
const serif = montserrat;

const DARK_TEMPLATES = new Set(['dark', 'tech', 'royal', 'classic', 'nature']);
function isMinimalTemplate(t) {
  return (t || 'modern') === 'minimal';
}
function isDarkTemplate(t) {
  return DARK_TEMPLATES.has(t || 'modern');
}

// ─── NAV ITEMS ───────────────────────────────────────────────────────────────
const BASE_NAV_ITEMS = [
  { id: 'programs',   labelKey: 'schoolPublic.navPrograms',   labelKeyNav: 'schoolPublic.navProgramsShort',   defaultLabel: 'Programs',        defaultLabelNav: 'Programs',   icon: <Layers size={14} /> },
  { id: 'fees',       labelKey: 'schoolPublic.navFees',       labelKeyNav: 'schoolPublic.navFeesShort',       defaultLabel: 'Fees',            defaultLabelNav: 'Fees',       icon: <CreditCard size={14} /> },
  { id: 'gallery',    labelKey: 'schoolPublic.navGallery',    labelKeyNav: 'schoolPublic.navGalleryShort',    defaultLabel: 'Gallery',         defaultLabelNav: 'Gallery',    icon: <Image size={14} /> },
  { id: 'leadership', labelKey: 'schoolPublic.navLeadership', labelKeyNav: 'schoolPublic.navLeadershipShort', defaultLabel: 'Leadership',      defaultLabelNav: 'Team',       icon: <Users size={14} /> },
  { id: 'news',       labelKey: 'schoolPublic.navNews',       labelKeyNav: 'schoolPublic.navNewsShort',       defaultLabel: 'News',            defaultLabelNav: 'News',       icon: <Newspaper size={14} /> },
  { id: 'admissions', labelKey: 'schoolPublic.navAdmissions', labelKeyNav: 'schoolPublic.navAdmissionsShort', defaultLabel: 'Admissions',      defaultLabelNav: 'Apply',      icon: <UserCheck size={14} /> },
  { id: 'babyeyi',    labelKey: 'schoolPublic.navFeesDoc',    labelKeyNav: 'schoolPublic.navFeesDocShort',    defaultLabel: 'School Fees Doc', defaultLabelNav: 'Fees Doc',   icon: <FileText size={14} /> },
];

function navItemsVisible(sections) {
  const show = (id) => !sections || !Array.isArray(sections) || sections.length === 0 || sections.includes(id);
  return BASE_NAV_ITEMS.filter((item) => show(item.id));
}

const STANDARD_LEVEL_I18N = {
  'Nursery / Pre-Primary': 'levelNursery',
  'Primary School': 'levelPrimary',
  'Secondary School (O-Level)': 'levelOlevel',
  'Secondary School (A-Level)': 'levelAlevel',
  TVET: 'levelTvet',
  nursery: 'levelNursery',
  primary: 'levelPrimary',
  olevel: 'levelOlevel',
  o_level: 'levelOlevel',
  'o level': 'levelOlevel',
  alevel: 'levelAlevel',
  a_level: 'levelAlevel',
  'a level': 'levelAlevel',
  tvet: 'levelTvet',
};

const CANONICAL_LEVEL_KEYS = {
  nursery: 'Nursery / Pre-Primary',
  primary: 'Primary School',
  olevel: 'Secondary School (O-Level)',
  o_level: 'Secondary School (O-Level)',
  'o level': 'Secondary School (O-Level)',
  alevel: 'Secondary School (A-Level)',
  a_level: 'Secondary School (A-Level)',
  'a level': 'Secondary School (A-Level)',
  tvet: 'TVET',
  'nursery / pre-primary': 'Nursery / Pre-Primary',
  'primary school': 'Primary School',
  'secondary school (o-level)': 'Secondary School (O-Level)',
  'secondary school (a-level)': 'Secondary School (A-Level)',
};

function normalizeEducationLevelKey(raw) {
  const s = String(raw || '').trim();
  if (!s) return s;
  const stripped = s.replace(/^custom:/i, '').trim();
  const lower = stripped.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (CANONICAL_LEVEL_KEYS[lower]) return CANONICAL_LEVEL_KEYS[lower];
  if (STANDARD_LEVEL_I18N[stripped]) return stripped;
  return stripped;
}

function resolveEducationLevelLabel(level, t) {
  const canonical = normalizeEducationLevelKey(level);
  const lookup = canonical.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const key = STANDARD_LEVEL_I18N[canonical] || STANDARD_LEVEL_I18N[lookup];
  if (key) return t(`schoolPublic.${key}`, { defaultValue: canonical });
  return formatProgramLabel(level);
}

// ─── SECTION HEAD ────────────────────────────────────────────────────────────
function SectionHead({ eyebrow, title, sub, accentColor, center = true }) {
  const a = accentColor || '#FBBF24';
  return (
    <div className={`mb-10 sm:mb-14 ${center ? 'text-center' : ''}`}>
      <div
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] mb-4"
        style={{ color: a, ...syne }}
      >
        <span className="w-6 h-px block" style={{ background: a }} />
        {eyebrow}
        <span className="w-6 h-px block" style={{ background: a }} />
      </div>
      <h2
        className="text-3xl sm:text-4xl font-black leading-tight text-[#1F2937] mb-3"
        style={serif}
      >
        {title}
      </h2>
      {sub && (
        <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed" style={syne}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NAVBAR
// ═══════════════════════════════════════════════════════════════════════════════
function NavBar({ school, theme, active, onNav, menuOpen, setMenuOpen, onApply, onBabyeyi, template = 'modern', navItems = BASE_NAV_ITEMS }) {
  const { t, i18n } = useTranslation();
  const { p, a } = theme;
  const minimal = isMinimalTemplate(template);
  const [scrolled, setScrolled] = useState(false);
  const logoSrc = imgUrl(school.logoPreview);
  const logoAlt = t('schoolPublic.logoAlt', { defaultValue: 'School logo' });
  const navLabel = (item) => t(item.labelKeyNav || item.labelKey, { defaultValue: item.defaultLabelNav || item.defaultLabel });
  const LANGS = ['rw', 'en', 'fr'];
  const currentLang = String(i18n.language || 'en').slice(0, 2).toLowerCase();
  const langValue = LANGS.includes(currentLang) ? currentLang : 'en';

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      {/* ── DESKTOP (fixed: parent overflow-x-hidden breaks sticky) ── */}
      <header
        className="hidden lg:flex items-center fixed top-0 left-0 right-0 z-50 w-full min-h-[60px] h-auto py-1.5 px-4 xl:px-8 transition-all duration-300 gap-2"
        style={{
          background: minimal
            ? (scrolled ? 'rgba(255,255,255,0.98)' : '#ffffff')
            : (scrolled ? `${p}f8` : p),
          boxShadow: minimal
            ? (scrolled ? '0 4px 24px rgba(0,0,0,0.08)' : '0 1px 0 rgba(0,0,0,0.06)')
            : (scrolled ? `0 4px 32px rgba(0,0,0,0.22)` : '0 2px 16px rgba(0,0,0,0.15)'),
          backdropFilter: minimal ? 'blur(12px)' : 'blur(16px)',
          borderBottom: minimal ? '1px solid rgba(0,0,0,0.06)' : undefined,
        }}
      >
        {/* Logo only — school name shown in hero, not header */}
        <div className="flex items-center shrink-0">
          <div
            className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ring-2 flex items-center justify-center bg-white/10"
            style={{ ringColor: minimal ? `${p}33` : `${a}44` }}
            title={school.name || undefined}
          >
            {logoSrc
              ? <img src={logoSrc} alt={logoAlt} className="w-full h-full object-contain p-0.5" />
              : (
                <div
                  className="w-full h-full flex items-center justify-center font-black"
                  style={{ background: `${a}33`, color: minimal ? p : a, ...syne, fontSize: 12 }}
                >
                  {(school.name || 'S')[0]}
                </div>
              )
            }
          </div>
        </div>

        {/* Nav links — wrap so every item stays visible */}
        <nav className="flex flex-1 min-w-0 flex-wrap items-center justify-center gap-1 px-1">
          {navItems.map((item) => {
            const isActive = active === item.id;
            const label = navLabel(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNav(item.id, item.path)}
                title={label}
                className="flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-lg text-[10px] xl:text-[11px] font-bold whitespace-nowrap transition-all duration-200 shrink-0"
                style={{
                  background: isActive ? a : 'transparent',
                  color: minimal
                    ? (isActive ? '#1F2937' : 'rgba(31,41,55,0.62)')
                    : (isActive ? '#1F2937' : 'rgba(255,255,255,0.88)'),
                  ...syne,
                }}
              >
                <span className="shrink-0" style={{ color: isActive ? '#1F2937' : (minimal ? `${p}99` : `${a}dd`) }}>{item.icon}</span>
                <span className="leading-none">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="relative inline-flex items-center rounded-lg px-1.5 py-1 text-[10px] font-semibold"
            style={{
              background: minimal ? 'rgba(0,4,53,0.06)' : 'rgba(255,255,255,0.1)',
              border: minimal ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.2)',
              color: minimal ? '#1F2937' : 'rgba(255,255,255,0.9)',
            }}
          >
            <Globe size={11} className="mr-1 shrink-0 text-amber-400" />
            <select
              aria-label={t('language.switcherLabel', { defaultValue: 'Language' })}
              value={langValue}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="bg-transparent border-0 outline-none cursor-pointer text-[10px] font-bold pr-4 appearance-none"
              style={syne}
            >
              <option value="rw">RW</option>
              <option value="en">EN</option>
              <option value="fr">FR</option>
            </select>
            <ChevronDown size={10} className="absolute right-1 pointer-events-none opacity-70" />
          </div>

          <Link
            to="/"
            className={`flex items-center gap-1 px-2 xl:px-3 py-1.5 rounded-lg font-black text-[10px] xl:text-[11px] transition shrink-0 border ${
              minimal
                ? 'border-slate-200 bg-white text-[#1F2937] hover:bg-slate-50'
                : 'border-white/25 bg-white/10 text-white hover:bg-white/18'
            }`}
            style={syne}
            title={t('schoolPublic.backToLandingTitle', { defaultValue: 'Babyeyi platform landing page' })}
          >
            <Home size={12} strokeWidth={2.5} />
            <span className="hidden xl:inline">{t('schoolPublic.landing', { defaultValue: 'Landing' })}</span>
          </Link>

          <button
            type="button"
            onClick={onApply}
            className="flex items-center gap-1 px-2.5 xl:px-3 py-1.5 rounded-lg font-black text-[10px] xl:text-[11px] hover:scale-[1.02] active:scale-95 transition-transform shrink-0"
            style={{ background: a, color: '#1F2937', boxShadow: `0 4px 14px ${a}55`, ...syne }}
          >
            <Send size={11} />
            <span>{t('schoolPublic.getAdmissionShort', { defaultValue: 'Apply' })}</span>
          </button>
        </div>
      </header>

      {/* ── MOBILE topbar ── */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300"
        style={{
          background: minimal ? '#ffffff' : p,
          boxShadow: scrolled ? (minimal ? '0 4px 16px rgba(0,0,0,0.06)' : `0 4px 20px rgba(0,0,0,0.24)`) : (minimal ? '0 1px 0 rgba(0,0,0,0.06)' : 'none'),
        }}
      >
        <div className="h-14 flex items-center justify-between px-3 gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${minimal ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20'}`}
              aria-label={t('schoolPublic.openMenu', { defaultValue: 'Open menu' })}
            >
              <Menu size={18} />
            </button>
            <Link
              to="/"
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                minimal ? 'bg-gray-100 text-amber-700 hover:bg-amber-50' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={t('schoolPublic.backToLandingAria', { defaultValue: 'Back to Babyeyi landing page' })}
              aria-label={t('schoolPublic.backToLandingAria', { defaultValue: 'Back to Babyeyi landing page' })}
            >
              <Home size={17} strokeWidth={2.25} />
            </Link>
          </div>

          <div className="flex items-center justify-center shrink-0">
            <div className={`w-9 h-9 rounded-xl overflow-hidden ring-2 flex items-center justify-center ${minimal ? 'ring-black/10 bg-white' : 'ring-white/20'}`}>
              {logoSrc
                ? <img src={logoSrc} alt={logoAlt} className="w-full h-full object-contain p-0.5" />
                : (
                  <div className="w-full h-full flex items-center justify-center font-black text-xs" style={{ background: `${a}33`, color: minimal ? p : '#fff' }}>
                    {(school.name || 'S')[0]}
                  </div>
                )
              }
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div
              className="relative inline-flex items-center rounded-lg px-1 py-0.5"
              style={{
                background: minimal ? 'rgba(0,4,53,0.06)' : 'rgba(255,255,255,0.1)',
                border: minimal ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Globe size={11} className="shrink-0 text-amber-400 mx-0.5" />
              <select
                aria-label={t('language.switcherLabel', { defaultValue: 'Language' })}
                value={langValue}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="bg-transparent border-0 outline-none cursor-pointer text-[10px] font-bold w-9 appearance-none"
                style={{ ...syne, color: minimal ? '#1F2937' : '#fff' }}
              >
                <option value="rw">RW</option>
                <option value="en">EN</option>
                <option value="fr">FR</option>
              </select>
            </div>
            <button
              type="button"
              onClick={onApply}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl font-black text-[10px] shadow-lg hover:scale-105 active:scale-95 transition-transform shrink-0"
              style={{ background: a, color: '#1F2937', ...syne }}
            >
              <Send size={11} />
              <span className="max-w-[72px] truncate">{t('schoolPublic.getAdmissionShort', { defaultValue: 'Apply' })}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Reserve space so content is not hidden under fixed headers (h-14 mobile / h-16 desktop) */}
      <div className="h-14 lg:h-[68px] shrink-0" aria-hidden="true" />

      {/* ── MOBILE backdrop ── */}
      <div
        onClick={() => setMenuOpen(false)}
        className="lg:hidden fixed inset-0 z-[60] transition-all duration-300"
        style={{
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: menuOpen ? 'blur(4px)' : 'blur(0px)',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
        }}
      />

      {/* ── MOBILE drawer ── */}
      <div
        className="lg:hidden fixed left-0 top-0 h-full z-[70] flex flex-col"
        style={{
          width: 280,
          background: '#1F2937',
          boxShadow: menuOpen ? '8px 0 40px rgba(0,0,0,0.4)' : 'none',
          transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 pt-6 pb-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(251,191,36,0.15)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-white/15 flex-shrink-0">
              {logoSrc
                ? <img src={logoSrc} alt={logoAlt} className="w-full h-full object-cover" />
                : (
                  <div
                    className="w-full h-full flex items-center justify-center font-black text-white text-lg"
                    style={{ background: `${a}33` }}
                  >
                    {(school.name || 'S')[0]}
                  </div>
                )
              }
            </div>
            {school.district && (
              <div className="text-white/70 text-xs font-semibold flex items-center gap-1 min-w-0" style={syne}>
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{school.district}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-white hover:bg-white/15 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item, idx) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNav(item.id, item.path); setMenuOpen(false); }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200"
                style={{
                  background: isActive ? a : 'transparent',
                  color: isActive ? '#1F2937' : 'rgba(255,255,255,0.75)',
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? 'translateX(0)' : 'translateX(-16px)',
                  transition: `background 0.2s, color 0.2s, opacity 0.3s ${0.05 * idx + 0.1}s, transform 0.3s ${0.05 * idx + 0.1}s`,
                  ...syne,
                }}
              >
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: isActive ? 'rgba(31,41,55,0.15)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#1F2937' : '#FBBF24',
                  }}
                >
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{navLabel(item)}</span>
                {isActive && (
                  <span className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ background: 'rgba(31,41,55,0.2)' }} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-2 flex-shrink-0">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm border border-white/15 bg-white/5 text-white/90 hover:bg-white/10 transition-colors"
            style={syne}
          >
            <Home size={16} /> {t('schoolPublic.backToLanding', { defaultValue: 'Back to landing page' })}
          </Link>
        </div>

        {/* Drawer CTA */}
        <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid rgba(251,191,36,0.12)' }}>
          <button
            onClick={() => { onApply(); setMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm hover:opacity-90 active:scale-95 transition-all shadow-2xl"
            style={{ background: '#FBBF24', color: '#1F2937', boxShadow: '0 6px 20px rgba(251,191,36,0.4)', ...syne }}
          >
            <Send size={14} /> {t('schoolPublic.getAdmission', { defaultValue: 'Get Admission' })}
          </button>
          <p className="text-center text-white/25 text-[10px] mt-2.5 font-medium" style={syne}>
            {t('schoolPublic.poweredBy', { defaultValue: 'Powered by' })} <span style={{ color: '#FBBF24' }}>babyeyi.rw</span>
          </p>
        </div>
      </div>
    </>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function HeroSection({ school, theme, onApply, onBabyeyi, template, onStudentLookup }) {
  const { t } = useTranslation();
  const { p, a, dark } = theme;
  const minimal = isMinimalTemplate(template);
  const coverSrc = imgUrl(school.coverPreview || school.cover_url);
  const logoSrc  = imgUrl(school.logoPreview);
  const [studentCode, setStudentCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const heroTagline = (school.tagline && String(school.tagline).trim())
    || (school.vision && String(school.vision).trim())
    || (school.mission && String(school.mission).trim())
    || t('schoolPublic.heroTaglineFallback', { defaultValue: 'Excellence in education, shaping the future leaders of Rwanda.' });

  const doStudentLookup = async () => {
    const code = studentCode.trim();
    if (!code) {
      setLookupError(t('schoolPublic.lookupEnterCode', { defaultValue: 'Enter a student code or SDM ID first.' }));
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    try {
      const res = await fetch(`${SERVER}/api/public/student-code-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false || !json.found || !json.data) {
        setLookupError(json.message || t('schoolPublic.lookupNotFound', { defaultValue: 'No student matches this code or SDM ID.' }));
        return;
      }
      const lookupData = json.data;
      const currentSchoolId = String(school.schoolId || school.id || school.school_id || '').trim();
      const lookupSchoolId = String(lookupData.school_id || lookupData.schoolId || '').trim();
      if (currentSchoolId && lookupSchoolId && currentSchoolId !== lookupSchoolId) {
        setLookupError(t('schoolPublic.lookupAnotherSchool', { defaultValue: 'This student belongs to another school.' }));
        return;
      }
      onStudentLookup?.({
        code,
        className: lookupData.class_name || lookupData.class || '',
        academicYear: lookupData.academic_year || '',
        term: lookupData.term || '',
        schoolId: lookupData.school_id || lookupData.schoolId || null,
        student: lookupData,
      });
    } catch {
      setLookupError(t('schoolPublic.lookupNetworkError', { defaultValue: 'Network error. Please try again.' }));
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-[min(100dvh,920px)] sm:min-h-[92vh] flex items-end overflow-hidden w-full max-w-[100vw]"
      style={minimal ? { borderBottom: `4px solid ${a}` } : undefined}
    >
      {coverSrc
        ? <img src={coverSrc} alt="cover" className="absolute inset-0 w-full h-full min-w-full object-cover" />
        : (
          <div
            className="absolute inset-0 w-full"
            style={{ background: `linear-gradient(135deg, ${dark} 0%, ${p} 100%)` }}
          />
        )
      }

      {/* Left → right: strong left, soft right (photo clearer on the right) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: minimal
            ? `linear-gradient(90deg, ${dark}cc 0%, ${dark}99 14%, ${dark}66 30%, rgba(15,20,30,0.28) 55%, rgba(15,20,30,0.08) 82%, transparent 96%)`
            : `linear-gradient(90deg, ${dark}ff 0%, ${dark}dd 12%, ${dark}aa 28%, rgba(15,20,30,0.38) 54%, rgba(15,20,30,0.1) 80%, transparent 95%)`,
        }}
      />
      {/* Bottom readability gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(15,20,30,0.9) 30%, rgba(15,20,30,0.35) 62%, rgba(0,0,0,0.04) 100%)' }}
      />

      {/* Amber accent line at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, transparent, ${a}, transparent)` }}
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-10 sm:pb-20 pt-20 sm:pt-24 min-w-0">
        <div className="grid lg:grid-cols-[1fr_280px] gap-6 lg:gap-12 items-end w-full min-w-0">
          {/* Left — main content */}
          <div className="min-w-0 w-full">
            {/* District badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5 text-xs font-bold uppercase tracking-widest"
              style={{ background: `rgba(251,191,36,0.12)`, color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)', ...syne }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#FBBF24' }} />
              {(school.ownership || t('schoolPublic.publicSchool', { defaultValue: 'Public School' }))} · {school.district}
            </div>

            {/* Logo + Name */}
            <div className="flex items-center gap-4 sm:gap-5 mb-5">
              {logoSrc && (
                <div
                  className="rounded-2xl overflow-hidden ring-4 flex-shrink-0 shadow-2xl flex items-center justify-center bg-white p-2 sm:p-2.5"
                  style={{ ringColor: 'rgba(255,255,255,0.35)', width: 'clamp(76px,9vw,104px)', height: 'clamp(76px,9vw,104px)' }}
                >
                  <img src={logoSrc} alt="logo" className="max-w-full max-h-full w-auto h-auto object-contain" />
                </div>
              )}
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-[1.08]"
                style={{ ...serif, letterSpacing: '-0.02em' }}
              >
                {school.name}
              </h1>
            </div>

          

            {/* Info pills */}
            <div className="flex flex-wrap gap-2.5 mb-9">
              {[
                { icon: <MapPin size={12} />, val: `${school.district || t('schoolPublic.rwanda', { defaultValue: 'Rwanda' })}${school.province ? `, ${school.province}` : ''}` },
                { icon: <Building2 size={12} />, val: school.category || t('schoolPublic.secondarySchool', { defaultValue: 'Secondary School' }) },
                { icon: <Calendar size={12} />, val: school.founded ? `${t('schoolPublic.estShort', { defaultValue: 'Est.' })} ${school.founded}` : null },
                { icon: <GraduationCap size={12} />, val: (school.educationLevels || []).length > 0 ? t('schoolPublic.levelCount', { count: school.educationLevels.length, defaultValue: `${school.educationLevels.length} Level${school.educationLevels.length > 1 ? 's' : ''}` }) : null },
              ].filter(s => s.val).map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(8px)', ...syne }}
                >
                  <span style={{ color: '#FBBF24' }}>{s.icon}</span>
                  {s.val}
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={onBabyeyi}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-transform shadow-2xl"
                style={{ background: '#FBBF24', color: '#1F2937', boxShadow: '0 8px 30px rgba(251,191,36,0.45)', ...syne }}
              >
                <Send size={15} /> {t('schoolPublic.getBabyeyi', { defaultValue: 'Get Babyeyi' })}
              </button>
              <button
                onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm border-2 hover:bg-white/8 transition-colors text-white"
                style={{ borderColor: 'rgba(255,255,255,0.25)', ...syne }}
              >
                <Phone size={15} /> {t('schoolPublic.contactSchool', { defaultValue: 'Contact School' })}
              </button>
            </div>

            {/* AI Student Search */}
            <div className="mt-5 w-full max-w-xl min-w-0">
              <div
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl p-2.5 border w-full min-w-0"
                style={{ background: 'rgba(15,20,30,0.62)', borderColor: 'rgba(251,191,36,0.32)' }}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mx-auto sm:mx-0" style={{ background: 'rgba(251,191,36,0.15)' }}>
                  <Sparkles size={14} style={{ color: '#FBBF24' }} />
                </div>
                <input
                  value={studentCode}
                  onChange={(e) => { setStudentCode(e.target.value); if (lookupError) setLookupError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') doStudentLookup(); }}
                  placeholder={t('schoolPublic.lookupPlaceholder', { defaultValue: 'Student code or SDM ID' })}
                  className="flex-1 min-w-0 w-full bg-transparent outline-none text-sm text-white placeholder:text-white/45"
                  style={syne}
                />
                <button
                  type="button"
                  onClick={doStudentLookup}
                  disabled={lookupLoading}
                  className="w-full sm:w-auto shrink-0 px-3 py-2.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black text-[#1F2937] disabled:opacity-60 whitespace-normal text-center leading-tight"
                  style={{ background: '#FBBF24', ...syne }}
                >
                  {lookupLoading
                    ? t('schoolPublic.searching', { defaultValue: 'Searching...' })
                    : t('schoolPublic.confirmBeforeContinue', { defaultValue: 'Confirm details before continuing' })}
                </button>
              </div>
              {lookupError && (
                <p className="mt-2 text-xs text-amber-200" style={syne}>{lookupError}</p>
              )}
            </div>
          </div>

          {/* Requested: remove hero right-side summary cards */}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce opacity-50">
        <ChevronDown size={18} className="text-white" />
      </div>
    </section>
  );
}

// ─── ABOUT ───────────────────────────────────────────────────────────────────
function AboutSection({ school, theme }) {
  const { t } = useTranslation();
  const { p, a, s } = theme;
  const aboutSrc = imgUrl(school.aboutPreview);

  return (
    <section id="about" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] mb-5"
              style={{ color: '#FBBF24', ...syne }}
            >
              <span className="w-6 h-px bg-amber-400 block" />
              {t('schoolPublic.whoWeAre', { defaultValue: 'Who We Are' })}
            </div>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1F2937] mb-6 leading-[1.1]"
              style={{ ...serif, letterSpacing: '-0.02em' }}
            >
              {t('schoolPublic.shapingRwanda', { defaultValue: "Shaping Rwanda's" })}{' '}
              <em style={{ color: '#FBBF24' }}>{t('schoolPublic.futureLeaders', { defaultValue: 'Future Leaders' })}</em>
            </h2>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-7" style={syne}>
              {school.mission || t('schoolPublic.aboutMissionFallback', { defaultValue: 'We are dedicated to nurturing the next generation of leaders through excellence in education, integrity, and innovation.' })}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-7">
              {[school.ownership, school.category, school.founded && `${t('schoolPublic.estShort', { defaultValue: 'Est.' })} ${school.founded}`]
                .filter(Boolean).map((tag, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold"
                    style={{ background: 'rgba(251,191,36,0.1)', color: '#1F2937', border: '1px solid rgba(251,191,36,0.25)', ...syne }}
                  >
                    <Check size={11} style={{ color: '#FBBF24' }} /> {tag}
                  </span>
                ))}
            </div>

            {/* Core values */}
            {(school.coreValues || []).length > 0 && (
              <div>
                <div
                  className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2"
                  style={{ color: '#1F2937', ...syne }}
                >
                  <Star size={12} style={{ color: '#FBBF24' }} /> {t('schoolPublic.coreValues', { defaultValue: 'Core Values' })}
                </div>
                <div className="flex flex-wrap gap-2">
                  {school.coreValues.map((v, i) => (
                    <div
                      key={v}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl"
                      style={{ background: '#1F2937' }}
                    >
                      <span
                        className="w-5 h-5 rounded-lg font-black text-[10px] flex items-center justify-center"
                        style={{ background: '#FBBF24', color: '#1F2937', ...syne }}
                      >
                        {i + 1}
                      </span>
                      <span className="font-bold text-xs text-white" style={syne}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            {aboutSrc ? (
              <div className="relative">
                <img src={aboutSrc} alt="about" className="w-full h-72 sm:h-[420px] object-cover rounded-3xl shadow-2xl" />
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-3xl -z-10" style={{ background: 'rgba(251,191,36,0.25)' }} />
                <div className="absolute -top-4 -left-4 w-16 h-16 rounded-2xl -z-10" style={{ background: '#1F2937', opacity: 0.15 }} />
                {school.founded && (
                  <div
                    className="absolute bottom-5 left-5 px-4 py-3 rounded-2xl shadow-xl"
                    style={{ background: '#1F2937', border: '1px solid rgba(251,191,36,0.3)' }}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: '#FBBF24', ...syne }}>Est.</div>
                    <div className="font-black text-lg text-white" style={syne}>{school.founded}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: <GraduationCap size={28} />, label: t('schoolPublic.academicExcellence', { defaultValue: 'Academic Excellence' }) },
                  { icon: <Users size={28} />, label: t('schoolPublic.studentCommunity', { defaultValue: 'Student Community' }) },
                  { icon: <BookOpen size={28} />, label: t('schoolPublic.qualityLearning', { defaultValue: 'Quality Learning' }) },
                  { icon: <Award size={28} />, label: t('schoolPublic.achievements', { defaultValue: 'Achievements' }) },
                ].map((e, i) => (
                  <div
                    key={i}
                    className="rounded-3xl p-8 flex flex-col items-center text-center hover:scale-105 transition-transform"
                    style={{
                      background: i % 2 === 0 ? '#1F2937' : 'rgba(251,191,36,0.08)',
                      marginTop: i % 2 === 1 ? '2rem' : 0,
                    }}
                  >
                    <span style={{ color: i % 2 === 0 ? '#FBBF24' : '#1F2937' }}>{e.icon}</span>
                    <span
                      className="text-xs font-black mt-3"
                      style={{ color: i % 2 === 0 ? 'white' : '#1F2937', ...syne }}
                    >
                      {e.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── MISSION ─────────────────────────────────────────────────────────────────
function MissionSection({ school, theme }) {
  const { t } = useTranslation();
  const { p, s } = theme;
  const missionSrc = imgUrl(school.missionPreview);
  return (
    <section id="mission" className="py-20 sm:py-28" style={{ background: '#F8F7F4' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHead eyebrow={t('schoolPublic.ourPurpose', { defaultValue: 'Our Purpose' })} title={t('schoolPublic.missionVision', { defaultValue: 'Mission & Vision' })} accentColor="#FBBF24" />
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6 mb-8">
          {/* Mission */}
          <div
            className="rounded-3xl p-7 sm:p-10 relative overflow-hidden"
            style={{ background: '#1F2937' }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.06] -translate-y-1/2 translate-x-1/2" style={{ background: '#FBBF24' }} />
            <Target size={28} className="mb-5 relative z-10" style={{ color: '#FBBF24' }} />
            <h3 className="font-black text-2xl mb-4 relative z-10 text-white" style={serif}>{t('schoolPublic.ourMission', { defaultValue: 'Our Mission' })}</h3>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed relative z-10" style={syne}>
              {school.mission || t('schoolPublic.ourMissionFallback', { defaultValue: 'To provide quality, holistic education that nurtures every learner.' })}
            </p>
          </div>
          {/* Vision */}
          <div
            className="rounded-3xl p-7 sm:p-10 bg-white border-2 relative overflow-hidden"
            style={{ borderColor: 'rgba(251,191,36,0.3)' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.07] -translate-y-1/2 translate-x-1/2" style={{ background: '#1F2937' }} />
            <Lightbulb size={28} className="mb-5 relative z-10" style={{ color: '#FBBF24' }} />
            <h3 className="font-black text-2xl mb-4 relative z-10 text-[#1F2937]" style={serif}>{t('schoolPublic.ourVision', { defaultValue: 'Our Vision' })}</h3>
            <p className="text-gray-500 text-sm sm:text-base leading-relaxed relative z-10" style={syne}>
              {school.vision || t('schoolPublic.ourVisionFallback', { defaultValue: "To be Rwanda's leading institution for holistic education." })}
            </p>
          </div>
        </div>
        {missionSrc && (
          <div className="rounded-3xl overflow-hidden shadow-xl">
            <img src={missionSrc} alt="mission" className="w-full h-40 sm:h-72 object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

// ─── BACKGROUND ──────────────────────────────────────────────────────────────
function BackgroundSection({ school }) {
  const { t } = useTranslation();
  if (!school.background) return null;
  return (
    <section id="background" className="py-16 sm:py-20 bg-white">
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <SectionHead eyebrow={t('schoolPublic.overview', { defaultValue: 'Overview' })} title={t('schoolPublic.schoolBackground', { defaultValue: 'School Background' })} accentColor="#FBBF24" />
        <div
          className="rounded-3xl p-6 sm:p-8 text-sm sm:text-base leading-relaxed text-gray-600"
          style={{ background: '#F8F7F4', border: '1px solid #EDE8DC', ...syne }}
        >
          {school.background}
        </div>
      </div>
    </section>
  );
}

// ─── PROGRAMS ────────────────────────────────────────────────────────────────
function ProgramsSection({ school, theme }) {
  const { t } = useTranslation();
  const { p, a } = theme;
  const levels       = school.educationLevels || [];
  const aLevelCombos = school.aLevelCombos || school.aLevelCombinations || [];
  const tvetTrades   = school.tvetTrades || [];
  const [activeLevel, setActiveLevel] = useState(null);

  const levelMeta = {
    'Nursery / Pre-Primary':      { icon: <Sparkles size={26} />, desc: t('schoolPublic.metaNurseryDesc', { defaultValue: 'Ages 2-6 · Play-based learning' }), bg: 'rgba(251,191,36,0.08)', accent: '#FBBF24' },
    'Primary School':              { icon: <BookOpen size={26} />, desc: t('schoolPublic.metaPrimaryDesc', { defaultValue: 'P1-P6 · Ages 6-12' }),              bg: '#F8F7F4',              accent: '#1F2937' },
    'Secondary School (O-Level)':  { icon: <GraduationCap size={26} />, desc: t('schoolPublic.metaOlevelDesc', { defaultValue: 'S1-S3 · Ages 13-16' }),        bg: 'rgba(251,191,36,0.12)', accent: '#92620a' },
    'Secondary School (A-Level)':  { icon: <Award size={26} />, desc: t('schoolPublic.metaAlevelDesc', { defaultValue: 'S4-S6 · Ages 17-19' }),               bg: '#1F2937',              accent: '#FBBF24' },
    'TVET':                        { icon: <Wrench size={26} />, desc: t('schoolPublic.metaTvetDesc', { defaultValue: 'Vocational Training' }),              bg: 'rgba(31,41,55,0.07)',  accent: '#1F2937' },
  };
  const levelDetails = {
    'Nursery / Pre-Primary': ['Baby class', 'Middle class', 'Top class'],
    'Primary School': ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
    'Secondary School (O-Level)': ['S1', 'S2', 'S3'],
    'Secondary School (A-Level)': aLevelCombos.map(c => c?.code || c).filter(Boolean),
    TVET: tvetTrades,
  };
  const activeItems = activeLevel ? (levelDetails[normalizeEducationLevelKey(activeLevel)] || []) : [];

  return (
    <section id="programs" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHead eyebrow={t('schoolPublic.academics', { defaultValue: 'Academics' })} title={t('schoolPublic.ourPrograms', { defaultValue: 'Our Programs' })} sub={t('schoolPublic.programsSub', { defaultValue: 'Comprehensive education pathways for every learner' })} accentColor="#FBBF24" />

        {levels.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 mb-10">
            {levels.map(l => {
              const canonical = normalizeEducationLevelKey(l);
              const m = levelMeta[canonical] || { icon: <BookOpen size={26} />, desc: '', bg: '#F8F7F4', accent: '#1F2937' };
              const short = resolveEducationLevelLabel(l, t)
                .replace('Secondary School (', '').replace(')', '').replace(' / Pre-Primary', '');
              return (
                <button
                  type="button"
                  key={l}
                  onClick={() => setActiveLevel(prev => (prev === l ? null : l))}
                  className="rounded-3xl p-5 sm:p-6 text-center border-2 hover:scale-105 hover:shadow-xl transition-all duration-300"
                  style={{
                    background: m.bg,
                    borderColor: activeLevel === l
                      ? '#FBBF24'
                      : (m.accent === '#FBBF24' ? 'rgba(251,191,36,0.3)' : 'rgba(31,41,55,0.12)'),
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: m.accent === '#FBBF24' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.1)', color: m.accent }}
                  >
                    {m.icon}
                  </div>
                  <h3
                    className="font-black text-xs sm:text-sm mb-1"
                    style={{ textTransform: 'Capitalize', color: m.accent === '#FBBF24' ? (m.bg === '#1F2937' ? 'white' : '#1F2937') : '#1F2937', ...syne }}
                  >
                    {short}
                  </h3>
                  <p
                    className="text-[10px] sm:text-xs"
                    style={{ color: m.bg === '#1F2937' ? 'rgba(255,255,255,0.5)' : '#9CA3AF', ...syne }}
                  >
                    {m.desc}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#92620a', ...syne }}>
                    {activeLevel === l ? t('schoolPublic.hideLevels', { defaultValue: 'Hide levels' }) : t('schoolPublic.getLevels', { defaultValue: 'Get levels' })}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {activeLevel && (
          <div
            className="mb-10 rounded-3xl p-6 sm:p-7 border-2"
            style={{ background: '#F8F7F4', borderColor: 'rgba(251,191,36,0.35)' }}
          >
            <h4 className="font-black text-[#1F2937] text-base sm:text-lg mb-3" style={serif}>
              {resolveEducationLevelLabel(activeLevel, t)} {t('schoolPublic.levels', { defaultValue: 'Levels' })}
            </h4>
            {activeItems.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {activeItems.map((item) => (
                  <span
                    key={item}
                    className="px-4 py-2 rounded-2xl font-bold text-xs sm:text-sm"
                    style={{ background: '#1F2937', color: '#FBBF24', ...syne }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500" style={syne}>{t('schoolPublic.noLevelsYet', { defaultValue: 'No levels configured for this program yet.' })}</p>
            )}
          </div>
        )}

        {aLevelCombos.length > 0 && (
          <div
            className="rounded-3xl p-6 sm:p-8 mb-5"
            style={{ background: '#1F2937', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Award size={20} style={{ color: '#FBBF24' }} />
              <h3 className="font-black text-white text-lg sm:text-xl" style={serif}>{t('schoolPublic.aLevelCombinations', { defaultValue: 'A-Level Combinations' })}</h3>
            </div>
            <p className="text-white/40 text-xs sm:text-sm mb-6" style={syne}>{t('schoolPublic.aLevelSub', { defaultValue: 'Available subject combinations for Senior 4-6' })}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {aLevelCombos.map(c => (
                <div
                  key={c.code}
                  className="rounded-2xl p-4 border border-white/8 hover:border-amber-400/40 hover:bg-white/5 transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div className="font-black text-2xl mb-1" style={{ color: '#FBBF24', ...syne }}>{c.code}</div>
                  <div className="text-[11px] text-white/50 leading-tight" style={syne}>{c.full}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tvetTrades.length > 0 && (
          <div
            className="rounded-3xl p-6 sm:p-8"
            style={{ background: 'rgba(251,191,36,0.06)', border: '1.5px solid rgba(251,191,36,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-5">
              <Wrench size={20} style={{ color: '#FBBF24' }} />
              <h3 className="font-black text-[#1F2937] text-lg sm:text-xl" style={serif}>{t('schoolPublic.tvetTradesOffered', { defaultValue: 'TVET Trades Offered' })}</h3>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {tvetTrades.map(t => (
                <span
                  key={t}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm"
                  style={{ background: '#1F2937', color: '#FBBF24', ...syne }}
                >
                  <CheckCircle2 size={13} /> {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {levels.length === 0 && aLevelCombos.length === 0 && tvetTrades.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-3xl">
            <GraduationCap size={36} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400 font-semibold" style={syne}>{t('schoolPublic.programsComingSoon', { defaultValue: 'Programs information coming soon' })}</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── FEES ────────────────────────────────────────────────────────────────────
function FeesSection({ school, theme }) {
  const { t } = useTranslation();
  const { p } = theme;
  const fees = school.fees || {};
  const hasFees = Object.values(fees).some(f => f?.items?.length > 0);
  if (!hasFees) return null;
  return (
    <section id="fees" className="py-20 sm:py-28" style={{ background: '#F8F7F4' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHead eyebrow={t('schoolPublic.feesTuition', { defaultValue: 'Fees & Tuition' })} title={t('schoolPublic.feeStructure', { defaultValue: 'Fee Structure' })} sub={t('schoolPublic.feeStructureSub', { defaultValue: 'Transparent fee information for all levels' })} accentColor="#FBBF24" />
        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
          {Object.entries(fees).filter(([, v]) => v?.items?.length > 0).map(([lvl, data]) => {
            const fl = FEE_LEVELS.find(f => f.id === lvl) || {
              id: lvl,
              label: formatProgramLabel(data?.label || lvl) || t('schoolPublic.program', { defaultValue: 'Program' }),
              icon: <Banknote size={16} />,
            };
            const total = data.items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
            return (
              <div
                key={lvl}
                className="bg-white rounded-3xl overflow-hidden border-2 hover:shadow-xl transition-all duration-300"
                style={{ borderColor: 'rgba(251,191,36,0.2)' }}
              >
                <div
                  className="px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between"
                  style={{ background: '#1F2937' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}
                    >
                      {fl.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-sm sm:text-base text-white" style={syne}>{fl.label}</h4>
                      <p className="text-xs text-white/40" style={syne}>{data.currency || 'RWF'} · {t('schoolPublic.feeTypeCount', { count: data.items.length, defaultValue: `${data.items.length} fee type${data.items.length !== 1 ? 's' : ''}` })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-base sm:text-lg" style={{ color: '#FBBF24', ...syne }}>
                      {data.currency || 'RWF'} {total.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/35" style={syne}>{t('schoolPublic.termEstimate', { defaultValue: '/term est.' })}</div>
                  </div>
                </div>
                <div className="p-5 sm:p-6 space-y-3">
                  {data.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700 font-medium" style={syne}>{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#1F2937]" style={syne}>{Number(item.amount || 0).toLocaleString()}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full" style={syne}>{item.period}</span>
                      </div>
                    </div>
                  ))}
                  {data.notes && <p className="text-xs text-gray-400 pt-2 border-t border-gray-50 italic" style={syne}>{data.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── GALLERY ─────────────────────────────────────────────────────────────────
function GallerySection({ school, theme }) {
  const { t } = useTranslation();
  const { p } = theme;
  const albums = school.albums || [];
  const [activeAlbum, setActiveAlbum] = useState(0);
  const [lightbox, setLightbox]       = useState(null);
  if (albums.length === 0) return null;
  const album = albums[Math.min(activeAlbum, albums.length - 1)];

  return (
    <section id="gallery" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHead eyebrow={t('schoolPublic.memories', { defaultValue: 'Memories' })} title={t('schoolPublic.photoGallery', { defaultValue: 'Photo Gallery' })} sub={t('schoolPublic.photoGallerySub', { defaultValue: 'A glimpse into our school life' })} accentColor="#FBBF24" />

        {/* Album tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-7">
          {albums.map((al, i) => (
            <button
              key={al.id || i}
              onClick={() => setActiveAlbum(i)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border-2 transition-all"
              style={{
                borderColor: activeAlbum === i ? '#1F2937' : '#E5E7EB',
                background:  activeAlbum === i ? '#1F2937' : 'white',
                color:       activeAlbum === i ? '#FBBF24' : '#6B7280',
                ...syne,
              }}
            >
              <Image size={12} /> {al.title || t('schoolPublic.albumN', { defaultValue: `Album ${i + 1}`, index: i + 1 })}
              <span
                className="rounded-full px-1.5 py-0.5 text-[9px] font-black"
                style={{
                  background: activeAlbum === i ? 'rgba(251,191,36,0.2)' : '#F3F4F6',
                  color: activeAlbum === i ? '#FBBF24' : '#9CA3AF',
                }}
              >
                {al.images?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {album && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <h4 className="font-black text-[#1F2937] text-lg sm:text-xl" style={serif}>{album.title}</h4>
              {album.date && (
                <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1.5" style={syne}>
                  <Calendar size={12} />{album.date?.split('T')[0] || album.date}
                </span>
              )}
              {album.category && (
                <span
                  className="text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(251,191,36,0.1)', color: '#1F2937', ...syne }}
                >
                  {album.category}
                </span>
              )}
            </div>
            {album.description && <p className="text-gray-500 text-xs sm:text-sm mb-6" style={syne}>{album.description}</p>}

            {album.images?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {album.images.map((img, i) => {
                  const src = imgUrl(img.url);
                  return (
                    <div
                      key={img.id || i}
                      className="group relative aspect-square rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                      onClick={() => setLightbox({ images: album.images, index: i })}
                    >
                      {src
                        ? <img src={src} alt={img.caption || ''} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-gray-100"><Camera size={22} className="text-gray-300" /></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        {img.caption && <p className="text-white text-xs font-semibold" style={syne}>{img.caption}</p>}
                        <div className="flex items-center gap-1 mt-1 text-white/60" style={syne}><ZoomIn size={11} /><span className="text-xs">{t('schoolPublic.view', { defaultValue: 'View' })}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-3xl">
                <Camera size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-500 font-bold" style={syne}>{t('schoolPublic.noPhotosYet', { defaultValue: 'No photos yet' })}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/96 z-[200] flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <span className="text-white/40 text-xs font-mono" style={syne}>{lightbox.index + 1} / {lightbox.images.length}</span>
            <button onClick={() => setLightbox(null)} className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center text-white hover:bg-white/15">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(l => ({ ...l, index: (l.index - 1 + l.images.length) % l.images.length }))}
              className="absolute left-3 sm:left-5 w-11 h-11 rounded-2xl bg-white/8 flex items-center justify-center text-white hover:bg-white/15 z-10"
            >
              <ChevronLeft size={20} />
            </button>
            {(() => {
              const img = lightbox.images[lightbox.index];
              const src = imgUrl(img.url);
              return src ? <img src={src} alt={img.caption || ''} className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl" /> : null;
            })()}
            <button
              onClick={() => setLightbox(l => ({ ...l, index: (l.index + 1) % l.images.length }))}
              className="absolute right-3 sm:right-5 w-11 h-11 rounded-2xl bg-white/8 flex items-center justify-center text-white hover:bg-white/15 z-10"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-4 flex-shrink-0 justify-center">
            {lightbox.images.map((img, i) => {
              const src = imgUrl(img.url);
              return (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightbox(l => ({ ...l, index: i })); }}
                  className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${lightbox.index === i ? 'border-amber-400 scale-110' : 'border-transparent opacity-40 hover:opacity-70'}`}
                >
                  {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-800" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── LEADERSHIP ──────────────────────────────────────────────────────────────
function LeadershipSection({ school, theme }) {
  const { t } = useTranslation();
  const { p, a, s } = theme;
  const leaders = Array.isArray(school.leaders) ? school.leaders : [];
  if (!leaders.length) return null;

  return (
    <section id="leadership" className="py-20 sm:py-28" style={{ background: '#F8F7F4' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHead eyebrow={t('schoolPublic.ourTeam', { defaultValue: 'Our Team' })} title={t('schoolPublic.leadershipTeam', { defaultValue: 'Leadership Team' })} sub={t('schoolPublic.leadershipSub', { defaultValue: 'Dedicated professionals committed to academic excellence' })} accentColor="#FBBF24" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {leaders.map((l, i) => {
            const photoSrc = imgUrl(l.photoPreview || l.photoUrl);
            const initials = (l.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            const isFeatured = (l.role || '').toLowerCase() === 'head teacher';
            return (
              <div
                key={l.id || i}
                className="flex flex-col items-center text-center rounded-3xl overflow-hidden"
                style={{
                  background: 'white',
                  border: `2px solid ${isFeatured ? 'rgba(251,191,36,0.4)' : '#F0ECE0'}`,
                  boxShadow: isFeatured ? '0 8px 32px rgba(251,191,36,0.15)' : '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                {/* Amber bar for featured */}
                {isFeatured && (
                  <div className="w-full h-1" style={{ background: 'linear-gradient(90deg, #FBBF24, #F59E0B)' }} />
                )}
                <div className="px-4 py-5 sm:px-5 sm:py-6 flex flex-col items-center w-full">
                  {/* Photo */}
                  <div
                    className="rounded-full overflow-hidden mb-3 flex-shrink-0"
                    style={{
                      width: isFeatured ? 88 : 72,
                      height: isFeatured ? 88 : 72,
                      border: `3px solid ${isFeatured ? '#FBBF24' : '#F0ECE0'}`,
                      boxShadow: isFeatured ? '0 4px 16px rgba(251,191,36,0.3)' : 'none',
                    }}
                  >
                    {photoSrc ? (
                      <img src={photoSrc} alt={l.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center font-black text-lg sm:text-xl"
                        style={{ background: isFeatured ? '#FBBF24' : '#1F2937', color: isFeatured ? '#1F2937' : '#FBBF24', ...syne }}
                      >
                        {initials}
                      </div>
                    )}
                  </div>

                  <div className="font-black text-xs sm:text-sm text-[#1F2937] mb-1 leading-snug" style={syne}>{l.name || '—'}</div>

                  {l.role && (
                    <div
                      className="text-[10px] sm:text-xs font-bold mb-2 px-2 py-0.5 rounded-full"
                      style={{
                        color: isFeatured ? '#1F2937' : '#92620a',
                        background: isFeatured ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.08)',
                        ...syne,
                      }}
                    >
                      {l.role}
                    </div>
                  )}

                  {(l.phone || l.email) && (
                    <div className="flex flex-col gap-1 mt-2 w-full">
                      {l.phone && (
                        <a
                          href={`tel:${l.phone}`}
                          className="text-[10px] text-gray-400 hover:text-[#1F2937] transition-colors"
                          style={syne}
                        >
                          📞 {l.phone}
                        </a>
                      )}
                      {l.email && (
                        <a
                          href={`mailto:${l.email}`}
                          className="text-[10px] text-gray-400 hover:text-[#1F2937] transition-colors break-all"
                          style={syne}
                        >
                          ✉ {l.email}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── NEWS (school stories + modal, links to social) ──────────────────────────
function NewsSection({ school, theme, enabled }) {
  const { t } = useTranslation();
  const { p, a } = theme;
  const items = Array.isArray(school.newsItems)
    ? school.newsItems.filter(n => n && String(n.title || '').trim())
    : [];
  const [open, setOpen] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!enabled || !items.length) return null;

  return (
    <section id="news" className="py-16 sm:py-24 bg-white scroll-mt-20 w-full max-w-[100vw] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 min-w-0">
        <SectionHead eyebrow={t('schoolPublic.updates', { defaultValue: 'Updates' })} title={t('schoolPublic.newsAnnouncements', { defaultValue: 'News & announcements' })} sub={t('schoolPublic.newsSub', { defaultValue: 'Stay informed about events and stories from our school community' })} accentColor={p} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {items.map((post, i) => (
            <button
              key={post.id || i}
              type="button"
              onClick={() => setOpen(post)}
              className="text-left rounded-2xl border border-[#E8E4DC] bg-[#FDFCFA] p-5 hover:shadow-lg hover:border-amber-300/60 transition-all duration-300 min-w-0"
            >
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: a }}>
                <Newspaper size={14} /> {post.date || '—'}
              </div>
              <h3 className="font-black text-[#1F2937] text-sm sm:text-base leading-snug mb-2 line-clamp-2" style={syne}>
                {post.title}
              </h3>
              {post.excerpt ? (
                <p className="text-gray-500 text-xs sm:text-sm line-clamp-3 leading-relaxed" style={syne}>{post.excerpt}</p>
              ) : null}
              <span className="inline-flex items-center gap-1 mt-3 text-xs font-black" style={{ color: p }}>
                {t('schoolPublic.readMore', { defaultValue: 'Read more' })} <ChevronRight size={12} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label={t('schoolPublic.close', { defaultValue: 'Close' })} onClick={() => setOpen(null)} />
          <div
            className="relative z-10 w-full sm:max-w-lg max-h-[min(90dvh,720px)] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden mx-0 sm:mx-auto"
            style={{ background: 'linear-gradient(165deg, #1F2937 0%, #111827 100%)' }}
          >
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: a }}>{open.date || t('schoolPublic.news', { defaultValue: 'News' })}</p>
                <h4 className="font-black text-white text-base leading-snug pr-2" style={syne}>{open.title}</h4>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="shrink-0 p-2 rounded-xl text-white/80 hover:bg-white/10" aria-label={t('schoolPublic.close', { defaultValue: 'Close' })}>
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex-1 min-h-0">
              <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap" style={syne}>
                {open.body || open.excerpt || '—'}
              </p>
              {(open.socialUrl || school.facebook || school.twitter || school.instagram) && (
                <div className="mt-6 pt-4 border-t border-white/10 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-white/45" style={syne}>{t('schoolPublic.connect', { defaultValue: 'Connect' })}</p>
                  {open.socialUrl ? (
                    <a
                      href={open.socialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs text-[#1F2937]"
                      style={{ background: a }}
                    >
                      <ExternalLink size={14} /> {open.socialLabel || t('schoolPublic.openLinkedPost', { defaultValue: 'Open linked post' })}
                    </a>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {school.facebook && (
                      <a href={school.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15">
                        <Facebook size={12} /> Facebook
                      </a>
                    )}
                    {school.twitter && (
                      <a href={school.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15">
                        <Twitter size={12} /> X / Twitter
                      </a>
                    )}
                    {school.instagram && (
                      <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15">
                        <Instagram size={12} /> Instagram
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="w-full py-3 rounded-2xl font-black text-sm text-[#1F2937]"
                style={{ background: a }}
              >
                {t('schoolPublic.close', { defaultValue: 'Close' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── QField (Admission form questions) ───────────────────────────────────────
function QField({ q, answers, setAnswers }) {
  const { t } = useTranslation();
  const val = answers[q.id];
  const set = useCallback(v => setAnswers(prev => ({ ...prev, [q.id]: v })), [q.id, setAnswers]);

  const base = 'w-full px-4 py-3 rounded-xl border-2 border-[#E5E0D0] bg-[#F9F8F5] text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all';

  if (q.questionType === 'text')
    return <input className={base} value={val || ''} onChange={e => set(e.target.value)} placeholder={q.placeholder || ''} style={syne} />;

  if (q.questionType === 'textarea')
    return <textarea className={`${base} resize-none`} rows={3} value={val || ''} onChange={e => set(e.target.value)} style={syne} />;

  if (q.questionType === 'yesno')
    return (
      <div className="flex gap-3">
        {[t('common.yes', { defaultValue: 'Yes' }), t('common.no', { defaultValue: 'No' })].map(o => (
          <button key={o} type="button" onClick={() => set(o)}
            className="flex-1 py-3 rounded-xl text-sm font-black border-2 transition-all flex items-center justify-center gap-2"
            style={val === o ? { background: '#1F2937', borderColor: '#1F2937', color: '#FBBF24', ...syne } : { background: 'white', borderColor: '#E5E0D0', color: '#374151', ...syne }}>
            {val === o && <Check size={13} />} {o}
          </button>
        ))}
      </div>
    );

  if (q.questionType === 'select')
    return (
      <select className={base} value={val || ''} onChange={e => set(e.target.value)} style={{ ...syne, appearance: 'none' }}>
        <option value="">{t('schoolPublic.selectOption', { defaultValue: '— Select an option —' })}</option>
        {(q.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}
      </select>
    );

  if (q.questionType === 'multiselect') {
    const sel = Array.isArray(val) ? val : [];
    return (
      <div className="flex flex-wrap gap-2">
        {(q.options || []).map((o, i) => {
          const act = sel.includes(o);
          return (
            <button key={i} type="button"
              onClick={() => set(act ? sel.filter(v => v !== o) : [...sel, o])}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all"
              style={act ? { background: '#1F2937', borderColor: '#1F2937', color: '#FBBF24', ...syne } : { background: 'white', borderColor: '#E5E0D0', color: '#374151', ...syne }}>
              {act && <Check size={11} />} {o}
            </button>
          );
        })}
      </div>
    );
  }

  const files = Array.isArray(val) ? val : [];
  return (
    <div>
      <label
        className="flex items-center gap-3 cursor-pointer px-5 py-4 rounded-xl border-2 border-dashed text-sm font-bold hover:border-amber-400 transition-colors"
        style={{ borderColor: 'rgba(251,191,36,0.4)', color: '#9CA3AF', ...syne }}
      >
        <Upload size={15} style={{ color: '#FBBF24' }} />
        {t('schoolPublic.upload', { defaultValue: 'Upload' })} {q.questionType === 'multifile' ? t('schoolPublic.uploadUpToFiles', { count: q.maxFiles || 5, defaultValue: `up to ${q.maxFiles || 5} files` }) : t('schoolPublic.uploadAFile', { defaultValue: 'a file' })}
        <input type="file" className="hidden" multiple={q.questionType === 'multifile'} accept="image/*,application/pdf"
          onChange={e => {
            const picked = Array.from(e.target.files || []);
            set(q.questionType === 'multifile' ? [...files, ...picked].slice(0, q.maxFiles || 5) : picked.slice(0, 1));
            e.target.value = '';
          }} />
      </label>
      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5" style={syne}>
              <FileText size={11} style={{ color: '#FBBF24' }} />
              <span className="flex-1 truncate font-medium">{f.name}</span>
              <button type="button" onClick={() => set(files.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 transition-colors"><X size={11} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ADMISSION APPLY MODAL ───────────────────────────────────────────────────
function AdmissionApplyModal({ formId, onClose }) {
  const { t, i18n } = useTranslation();
  const [form,       setForm]      = useState(null);
  const [rawForm,    setRawForm]   = useState(null);
  const [formBusy,   setFormBusy]  = useState(false);
  const [loading,    setLoading]   = useState(true);
  const [submitting, setSubmitting]= useState(false);
  const [submitted,  setSubmitted] = useState(null);
  const [error,      setError]     = useState(null);
  const [answers,    setAnswers]   = useState({});
  const [fieldErrs,  setFieldErrs] = useState({});
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetch(`${ADM_API}/forms/${formId}/public`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setRawForm(d.data);
          setForm(d.data);
        } else setError(d.message);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [formId]);

  useEffect(() => {
    if (!rawForm) return;
    const lang = normalizeBabyeyiLang(i18n.language);
    if (lang === 'en') {
      setForm(rawForm);
      setFormBusy(false);
      return;
    }
    let cancelled = false;
    setForm(rawForm);
    setFormBusy(true);
    translateAdmissionForm(rawForm, lang)
      .then((tr) => { if (!cancelled) { setForm(tr); setFormBusy(false); } })
      .catch(() => { if (!cancelled) { setForm(rawForm); setFormBusy(false); } });
    return () => { cancelled = true; };
  }, [rawForm, i18n.language]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs._name = t('schoolPublic.fullNameRequired', { defaultValue: 'Full name is required' });
    for (const q of form?.questions || []) {
      if (!q.isRequired) continue;
      const val = answers[q.id];
      const isFile = q.questionType === 'file' || q.questionType === 'multifile';
      if (isFile && (!Array.isArray(val) || !val.length)) errs[q.id] = t('schoolPublic.fileRequired', { defaultValue: 'File required' });
      else if (!isFile && q.questionType === 'multiselect' && (!Array.isArray(val) || !val.length)) errs[q.id] = t('schoolPublic.selectAtLeastOne', { defaultValue: 'Select at least one' });
      else if (!isFile && q.questionType !== 'multiselect' && !val?.toString().trim()) errs[q.id] = t('schoolPublic.fieldRequired', { defaultValue: 'This field is required' });
    }
    setFieldErrs(errs);
    return !Object.keys(errs).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('applicantName',  name.trim());
      fd.append('applicantEmail', email.trim());
      fd.append('applicantPhone', phone.trim());
      const ap = {};
      for (const q of form.questions || []) {
        if (q.questionType !== 'file' && q.questionType !== 'multifile') ap[`q_${q.id}`] = answers[q.id];
      }
      fd.append('answers', JSON.stringify(ap));
      for (const q of form.questions || []) {
        if ((q.questionType === 'file' || q.questionType === 'multifile') && Array.isArray(answers[q.id])) {
          for (const f of answers[q.id]) fd.append(`q_${q.id}`, f);
        }
      }
      const r = await fetch(`${ADM_API}/forms/${formId}/apply`, { method: 'POST', body: fd });
      const d = await r.json();
      if (d.success) setSubmitted(d.data);
      else setError(d.message || t('schoolPublic.submissionFailed', { defaultValue: 'Submission failed. Please try again.' }));
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[88vh]">
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-amber-200/30 flex-shrink-0"
          style={{ background: '#1F2937' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(251,191,36,0.2)' }}>
              <Send size={17} style={{ color: '#FBBF24' }} />
            </div>
            <div>
              <h3 className="font-black text-white text-sm sm:text-base" style={syne}>{t('schoolPublic.applyForAdmission', { defaultValue: 'Apply for Admission' })}</h3>
              {form && <p className="text-white/40 text-xs" style={syne}>{form.title || t('schoolPublic.applicationForm', { defaultValue: 'Application Form' })}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center text-white hover:bg-white/15 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {(loading || formBusy) && (
            <div className="flex flex-col items-center py-16 gap-4">
              <Loader2 size={26} className="animate-spin" style={{ color: '#FBBF24' }} />
              <p className="text-gray-500 text-sm font-semibold" style={syne}>
                {loading
                  ? t('schoolPublic.loadingForm', { defaultValue: 'Loading form...' })
                  : t('schoolPublic.translatingContent', { defaultValue: 'Translating content…' })}
              </p>
            </div>
          )}

          {submitted && (
            <div className="flex flex-col items-center py-10 gap-5 text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl" style={{ background: '#1F2937' }}>
                <CheckCircle2 size={34} style={{ color: '#FBBF24' }} />
              </div>
              <div>
                <h4 className="font-black text-[#1F2937] text-xl mb-2" style={serif}>{t('schoolPublic.applicationSubmitted', { defaultValue: 'Application Submitted! 🎉' })}</h4>
                <p className="text-gray-500 text-sm mb-1" style={syne}>{t('schoolPublic.thankYouApplicant', { defaultValue: 'Thank you' })}, <strong>{submitted.applicantName || name}</strong>!</p>
              </div>
              <div
                className="rounded-2xl px-7 py-5 border-2 w-full"
                style={{ background: '#F8F7F4', borderColor: 'rgba(251,191,36,0.3)' }}
              >
                <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2" style={syne}>{t('schoolPublic.referenceNumber', { defaultValue: 'Reference Number' })}</div>
                <div className="font-black text-2xl tracking-wider font-mono" style={{ color: '#1F2937' }}>{submitted.referenceNo}</div>
                <p className="text-gray-400 text-xs mt-2" style={syne}>{t('schoolPublic.saveReferenceHint', { defaultValue: 'Save this to track your application status.' })}</p>
              </div>
              <button onClick={onClose} className="px-8 py-3 rounded-2xl font-black text-sm hover:opacity-90 transition-opacity" style={{ background: '#FBBF24', color: '#1F2937', ...syne }}>{t('schoolPublic.done', { defaultValue: 'Done' })} ✓</button>
            </div>
          )}

          {!loading && !formBusy && form && form.status === 'open' && !submitted && (
            <div className="space-y-5">
              {/* Form meta */}
              {(form.academicYear || form.applicationDeadline || form.maxApplicants) && (
                <div className="flex flex-wrap gap-3 p-4 rounded-2xl" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  {form.academicYear && <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F2937]" style={syne}><GraduationCap size={12} style={{ color: '#FBBF24' }} /> {t('schoolPublic.year', { defaultValue: 'Year' })}: {form.academicYear}</div>}
                  {form.applicationDeadline && <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600" style={syne}><Clock size={12} /> {t('schoolPublic.deadline', { defaultValue: 'Deadline' })}: {new Date(form.applicationDeadline).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
                  {form.maxApplicants && <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700" style={syne}><Users size={12} /> {t('schoolPublic.spotsCount', { count: form.spotsRemaining ?? form.maxApplicants, defaultValue: `${form.spotsRemaining ?? form.maxApplicants} spots` })}</div>}
                </div>
              )}

              {/* Personal info */}
              <div>
                <h4 className="text-xs sm:text-sm font-black text-[#1F2937] mb-3 flex items-center gap-2" style={syne}>
                  <UserCheck size={13} style={{ color: '#FBBF24' }} /> {t('schoolPublic.personalInformation', { defaultValue: 'Personal Information' })}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#92620a] block mb-1.5" style={syne}>{t('schoolPublic.fullName', { defaultValue: 'Full Name' })} <span className="text-red-400">*</span></label>
                    <input
                      className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E0D0] bg-[#F9F8F5] text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                      value={name} onChange={e => setName(e.target.value)} placeholder={t('schoolPublic.enterFullName', { defaultValue: 'Enter your full name' })}
                      style={syne}
                    />
                    {fieldErrs._name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1" style={syne}><AlertCircle size={10} /> {fieldErrs._name}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#92620a] block mb-1.5" style={syne}>{t('schoolPublic.email', { defaultValue: 'Email' })}</label>
                      <input type="email" className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E0D0] bg-[#F9F8F5] text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('schoolPublic.emailPlaceholder', { defaultValue: 'your@email.com' })} style={syne} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#92620a] block mb-1.5" style={syne}>{t('schoolPublic.phone', { defaultValue: 'Phone' })}</label>
                      <input type="tel" className="w-full px-4 py-3 rounded-xl border-2 border-[#E5E0D0] bg-[#F9F8F5] text-sm font-medium focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('schoolPublic.phonePlaceholder', { defaultValue: '078...' })} style={syne} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions */}
              {(form.questions || []).length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-[#1F2937] mb-3 flex items-center gap-2" style={syne}>
                    <FileText size={13} style={{ color: '#FBBF24' }} /> {t('schoolPublic.applicationQuestions', { defaultValue: 'Application Questions' })}
                  </h4>
                  <div className="space-y-4">
                    {form.questions.map((q, idx) => (
                      <div key={q.id}>
                        <label className="text-sm font-bold text-[#1F2937] block mb-2" style={syne}>
                          <span
                            className="inline-flex w-5 h-5 rounded-lg items-center justify-center text-[10px] font-black text-white mr-2"
                            style={{ background: '#1F2937' }}
                          >
                            {idx + 1}
                          </span>
                          {q.label}{q.isRequired && <span className="text-red-400 ml-1">*</span>}
                        </label>
                        <QField q={q} answers={answers} setAnswers={setAnswers} />
                        {fieldErrs[q.id] && <p className="text-xs text-red-500 mt-1 flex items-center gap-1" style={syne}><AlertCircle size={10} /> {fieldErrs[q.id]}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium" style={syne}>{error}</p>
                </div>
              )}
            </div>
          )}

          {!loading && form && form.status !== 'open' && !submitted && (
            <div className="flex flex-col items-center py-12 gap-4 text-center">
              <div className="text-5xl">🔒</div>
              <h4 className="font-black text-[#1F2937] text-lg" style={serif}>{t('schoolPublic.applicationsStatus', { defaultValue: 'Applications' })} {form.status === 'closed' ? t('schoolPublic.closed', { defaultValue: 'Closed' }) : t('schoolPublic.paused', { defaultValue: 'Paused' })}</h4>
              <p className="text-gray-500 text-sm max-w-xs" style={syne}>
                {form.status === 'closed'
                  ? t('schoolPublic.admissionCycleEnded', { defaultValue: 'This admission cycle has ended.' })
                  : t('schoolPublic.applicationsPaused', { defaultValue: 'Applications are temporarily paused.' })}
              </p>
              <button onClick={onClose} className="px-6 py-3 rounded-2xl font-black text-sm" style={{ background: '#1F2937', color: '#FBBF24', ...syne }}>{t('schoolPublic.close', { defaultValue: 'Close' })}</button>
            </div>
          )}
        </div>

        {!loading && !formBusy && form && form.status === 'open' && !submitted && (
          <div className="px-5 sm:px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-[#F8F7F4] rounded-b-3xl">
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#FBBF24', color: '#1F2937', boxShadow: '0 4px 16px rgba(251,191,36,0.35)', ...syne }}
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> {t('schoolPublic.submitting', { defaultValue: 'Submitting...' })}</> : <><Send size={14} /> {t('schoolPublic.submitApplication', { defaultValue: 'Submit Application' })}</>}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2" style={syne}>{t('schoolPublic.confidentialInfo', { defaultValue: 'Your information is kept confidential' })}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ADMISSIONS SECTION ───────────────────────────────────────────────────────
function AdmissionsSection({ school, theme, schoolSlug, onApply }) {
  const { t } = useTranslation();
  const { p } = theme;
  const [adm, setAdm]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolSlug) { setLoading(false); return; }
    fetch(`${ADM_API}/slug/${schoolSlug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAdm(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [schoolSlug]);

  const now      = new Date();
  const dead     = adm?.applicationDeadline ? new Date(adm.applicationDeadline) : null;
  const daysLeft = dead && dead > now ? Math.ceil((dead - now) / 86400000) : null;
  const isOpen   = adm?.status === 'open';
  const admData  = school.admission || {};
  const steps    = admData.steps || [];
  const docs     = admData.documents || [];
  const reqs     = admData.requirements || [];

  return (
    <section id="admissions" className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHead eyebrow={t('schoolPublic.admissions', { defaultValue: 'Admissions' })} title={t('schoolPublic.joinOurSchool', { defaultValue: 'Join Our School' })} sub={t('schoolPublic.admissionsSub', { defaultValue: 'Everything you need to know about applying' })} accentColor="#FBBF24" />

        {adm && (
          <div
            className="rounded-3xl p-5 sm:p-7 mb-10 border-2"
            style={{ background: '#F8F7F4', borderColor: 'rgba(251,191,36,0.25)' }}
          >
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[
                {
                  top: <div className="flex items-center gap-2 justify-center">
                    {isOpen && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                    <span style={{ color: isOpen ? '#059669' : '#EF4444', ...syne }} className="text-xs font-black uppercase tracking-wider">
                      {adm.status === 'open' ? t('schoolPublic.open', { defaultValue: 'Open' }) : adm.status === 'closed' ? t('schoolPublic.closed', { defaultValue: 'Closed' }) : t('schoolPublic.paused', { defaultValue: 'Paused' })}
                    </span>
                  </div>,
                  bot: t('schoolPublic.status', { defaultValue: 'Status' }),
                },
                { top: <div className="font-black text-2xl text-[#1F2937]" style={syne}>{adm.applicantsCount ?? '—'}</div>, bot: t('schoolPublic.applied', { defaultValue: 'Applied' }) },
                { top: <div className="font-black text-2xl text-[#1F2937]" style={syne}>{adm.maxApplicants ? adm.maxApplicants.toLocaleString() : '—'}</div>, bot: t('schoolPublic.spots', { defaultValue: 'Spots' }) },
                {
                  top: <div className="font-black text-2xl" style={{ color: daysLeft === 0 ? '#EF4444' : '#1F2937', ...syne }}>
                    {daysLeft !== null ? `${daysLeft}d` : '—'}
                  </div>,
                  bot: t('schoolPublic.daysLeft', { defaultValue: 'Days Left' }),
                },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-gray-100">
                  {s.top}
                  <div className="text-[10px] text-gray-400 font-medium mt-1" style={syne}>{s.bot}</div>
                </div>
              ))}
            </div>

            {/* Dates row */}
            <div className="flex flex-wrap justify-center gap-5 pb-5 mb-5 border-b border-gray-200">
              {adm.applicationStart && (
                <div className="flex items-center gap-2 text-xs text-gray-500" style={syne}>
                  <Calendar size={13} style={{ color: '#FBBF24' }} />
                  <span className="font-medium">{t('schoolPublic.opens', { defaultValue: 'Opens' })}:</span>
                  <span className="font-black text-[#1F2937]">{new Date(adm.applicationStart).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {adm.applicationDeadline && (
                <div className="flex items-center gap-2 text-xs text-gray-500" style={syne}>
                  <Clock size={13} style={{ color: '#FBBF24' }} />
                  <span className="font-medium">{t('schoolPublic.deadline', { defaultValue: 'Deadline' })}:</span>
                  <span className="font-black text-[#1F2937]">{new Date(adm.applicationDeadline).toLocaleDateString('en-RW', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            {isOpen && (
              <div className="text-center">
                <button
                  onClick={onApply}
                  className="inline-flex items-center gap-2 px-7 sm:px-8 py-3.5 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-transform shadow-xl"
                  style={{ background: '#FBBF24', color: '#1F2937', boxShadow: '0 8px 24px rgba(251,191,36,0.4)', ...syne }}
                >
                  <Send size={14} /> {t('schoolPublic.applyOnlineNow', { defaultValue: 'Apply Online Now' })}
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !adm && (
          <div
            className="rounded-3xl p-8 mb-10 text-center border-2 border-dashed"
            style={{ borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.04)' }}
          >
            <UserCheck size={32} className="mx-auto mb-3" style={{ color: '#FBBF24' }} />
            <h3 className="font-black text-[#1F2937] text-lg mb-2" style={serif}>{t('schoolPublic.onlineAppsComingSoon', { defaultValue: 'Online Applications Coming Soon' })}</h3>
            <p className="text-gray-500 text-sm mb-5" style={syne}>{t('schoolPublic.contactSchoolForAdmissions', { defaultValue: 'Contact the school directly to enquire about admissions.' })}</p>
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl font-black text-sm"
              style={{ background: '#1F2937', color: '#FBBF24', ...syne }}
            >
              <Phone size={13} /> {t('schoolPublic.contactSchool', { defaultValue: 'Contact School' })}
            </button>
          </div>
        )}

        {(steps.length > 0 || reqs.length > 0 || docs.length > 0) && (
          <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
            {[
              { title: t('schoolPublic.applicationSteps', { defaultValue: 'Application Steps' }),     icon: <CheckCircle2 size={14} />, items: steps, renderItem: (s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 text-[#1F2937]" style={{ background: '#FBBF24' }}>{i + 1}</span>
                  <span className="text-xs sm:text-sm text-gray-600 font-medium leading-snug" style={syne}>{s}</span>
                </li>
              )},
              { title: t('schoolPublic.requirements', { defaultValue: 'Requirements' }),          icon: <Shield size={14} />,       items: reqs, renderItem: (r, i) => (
                <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-gray-600 font-medium" style={syne}>
                  <Check size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#FBBF24' }} /> {r}
                </li>
              )},
              { title: t('schoolPublic.requiredDocuments', { defaultValue: 'Required Documents' }),    icon: <FileText size={14} />,     items: docs, renderItem: (d, i) => (
                <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-gray-600 font-medium" style={syne}>
                  <FileText size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#FBBF24' }} /> {d}
                </li>
              )},
            ].filter(col => col.items.length > 0).map(col => (
              <div key={col.title} className="rounded-3xl p-6 sm:p-7 bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                <h4 className="font-black text-[#1F2937] mb-5 flex items-center gap-2" style={syne}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>
                    {col.icon}
                  </div>
                  {col.title}
                </h4>
                <ol className="space-y-3">
                  {col.items.map(col.renderItem)}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── CONTACT ─────────────────────────────────────────────────────────────────
function ContactSection({ school }) {
  const { t } = useTranslation();
  const contactItems = [
    { icon: MapPin,   label: t('schoolPublic.address', { defaultValue: 'Address' }),        val: school.address },
    { icon: Phone,    label: t('schoolPublic.phone', { defaultValue: 'Phone' }),          val: school.phone },
    { icon: Mail,     label: t('schoolPublic.email', { defaultValue: 'Email' }),          val: school.email },
    { icon: FileText, label: t('schoolPublic.postalAddress', { defaultValue: 'Postal Address' }), val: school.postalAddress },
    { icon: Globe,    label: t('schoolPublic.website', { defaultValue: 'Website' }),        val: school.website },
  ].filter(c => c.val);

  return (
    <section id="contact" className="py-20 sm:py-28" style={{ background: '#F8F7F4' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHead eyebrow={t('schoolPublic.getInTouch', { defaultValue: 'Get In Touch' })} title={t('schoolPublic.contactUs', { defaultValue: 'Contact Us' })} sub={t('schoolPublic.contactSub', { defaultValue: "We'd love to hear from you" })} accentColor="#FBBF24" />
        <div className="grid lg:grid-cols-2 gap-7 sm:gap-8">
          <div className="space-y-3">
            {contactItems.map(c => (
              <div
                key={c.label}
                className="flex gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 hover:shadow-md hover:border-amber-200 transition-all"
              >
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(251,191,36,0.1)' }}
                >
                  <c.icon size={17} style={{ color: '#FBBF24' }} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5" style={syne}>{c.label}</div>
                  <div className="text-sm font-semibold text-[#1F2937]" style={syne}>{c.val}</div>
                </div>
              </div>
            ))}
            {/* Social links */}
            {(school.facebook || school.twitter || school.instagram) && (
              <div className="flex gap-2.5 pt-2">
                {school.facebook  && <a href={school.facebook}  target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-md" style={{ background: '#1877F2' }}><Facebook size={16} className="text-white" /></a>}
                {school.twitter   && <a href={school.twitter}   target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-md" style={{ background: '#1DA1F2' }}><Twitter size={16} className="text-white" /></a>}
                {school.instagram && <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-md" style={{ background: '#E4405F' }}><Instagram size={16} className="text-white" /></a>}
              </div>
            )}
          </div>

          {/* Map placeholder */}
          <div
            className="rounded-3xl overflow-hidden border border-gray-200 flex items-center justify-center"
            style={{ minHeight: 280, background: '#F8F7F4' }}
          >
            <div className="text-center p-8 sm:p-10">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg" style={{ background: '#1F2937' }}>
                <MapPin size={28} style={{ color: '#FBBF24' }} />
              </div>
              <p className="text-[#1F2937] font-black text-lg" style={syne}>{school.district}, {school.province}</p>
              {school.address && <p className="text-gray-400 text-sm mt-1" style={syne}>{school.address}</p>}
              {school.mapUrl && (
                <a
                  href={school.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl text-sm font-black hover:opacity-90 transition-opacity shadow-xl"
                  style={{ background: '#FBBF24', color: '#1F2937', ...syne }}
                >
                  <Navigation size={13} /> {t('schoolPublic.openInMaps', { defaultValue: 'Open in Maps' })}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function SiteFooter({ school, theme }) {
  const { t } = useTranslation();
  const { p } = theme;
  const logoSrc = imgUrl(school.logoPreview);
  return (
    <footer className="py-10 sm:py-12 px-5 sm:px-8" style={{ background: '#1F2937' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 sm:gap-8 mb-7">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ border: '2px solid rgba(251,191,36,0.3)' }}
            >
              {logoSrc
                ? <img src={logoSrc} alt="logo" className="w-full h-full object-cover" />
                : (
                  <div
                    className="w-full h-full flex items-center justify-center font-black text-xl"
                    style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}
                  >
                    {(school.name || 'S')[0]}
                  </div>
                )
              }
            </div>
            <div>
              <div className="font-black text-white text-base sm:text-lg" style={syne}>{school.name}</div>
              <div className="text-white/40 text-xs mt-0.5 flex items-center gap-1.5" style={syne}>
                <MapPin size={9} /> {school.address || `${school.district}, ${school.province}`}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end gap-3">
            {(school.facebook || school.twitter || school.instagram) && (
              <div className="flex gap-2">
                {school.facebook  && <a href={school.facebook}  target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors"><Facebook size={14} className="text-white" /></a>}
                {school.twitter   && <a href={school.twitter}   target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors"><Twitter size={14} className="text-white" /></a>}
                {school.instagram && <a href={school.instagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center hover:bg-white/15 transition-colors"><Instagram size={14} className="text-white" /></a>}
              </div>
            )}
            <div className="text-white/25 text-xs flex items-center gap-1.5" style={syne}>
              <Globe size={9} />
              {t('schoolPublic.poweredBy', { defaultValue: 'Powered by' })} <span style={{ color: '#FBBF24' }} className="font-black">babyeyi.rw</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/8 pt-5 text-center">
          <p className="text-white/20 text-xs" style={syne}>© {new Date().getFullYear()} {school.name}. {t('schoolPublic.allRightsReserved', { defaultValue: 'All rights reserved.' })}</p>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN SCHOOL SITE
// ═══════════════════════════════════════════════════════════════════════════════
function SchoolSite({ data, slug, initialLookupSeed = null, contentTranslating = false, siteLang = 'en' }) {
  const { t } = useTranslation();
  const navigate   = useNavigate();
  const [active,   setActive]   = useState('about');
  const [menuOpen, setMenuOpen] = useState(false);
  const [applyOpen,setApplyOpen]= useState(false);
  const [babyeyiModalOpen, setBabyeyiModalOpen] = useState(false);
  const [babyeyiLookupSeed, setBabyeyiLookupSeed] = useState(null);
  const [jumpToast, setJumpToast] = useState('');
  const [adm,      setAdm]      = useState(null);

  const rawTheme = THEMES[data.colorTheme || 'blue'] || THEMES.blue;
  const theme = {
    p:    data.customColors?.primary   || rawTheme.p,
    s:    data.customColors?.secondary || rawTheme.s,
    a:    data.customColors?.accent    || rawTheme.a,
    dark: rawTheme.dark,
  };

  useEffect(() => {
    fetch(`${ADM_API}/slug/${slug}`)
      .then(r => r.json())
      .then(d => { if (d.success) setAdm(d.data); })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!initialLookupSeed) return;
    setActive('babyeyi');
    setBabyeyiLookupSeed({ ...initialLookupSeed, ts: Date.now() });
    setBabyeyiModalOpen(true);
    const learner = (initialLookupSeed.studentName || '').trim();
    setJumpToast(learner ? `Opened Babyeyi for ${learner}` : 'Opened Babyeyi for selected student');
  }, [initialLookupSeed]);

  useEffect(() => {
    if (!jumpToast) return;
    const timer = setTimeout(() => setJumpToast(''), 3600);
    return () => clearTimeout(timer);
  }, [jumpToast]);

  useEffect(() => {
    const sections = ['hero','about','background','mission','programs','fees','gallery','leadership','news','admissions','contact'];
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { threshold: 0.25 }
    );
    sections.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const handleNav = (id, path) => {
    if (path) { navigate(path); return; }
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMenuOpen(false);
  };

  const handleApply = () => {
    if (adm?.status === 'open') setApplyOpen(true);
    else document.getElementById('admissions')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBabyeyi = () => {
    setActive('babyeyi');
    setBabyeyiModalOpen(true);
    setMenuOpen(false);
  };

  const handleHeroStudentLookup = (payload) => {
    setActive('babyeyi');
    setBabyeyiLookupSeed({ ...payload, ts: Date.now() });
    setBabyeyiModalOpen(true);
    setMenuOpen(false);
  };

  const navItems = navItemsVisible(data.sections);
  const showNewsSection = (!data.sections || !Array.isArray(data.sections) || data.sections.length === 0 || data.sections.includes('news'));

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden" style={montserrat}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #E5E0D0; border-radius: 99px; }
      `}</style>

      <NavBar school={data} theme={theme} template={data.template} active={active} onNav={handleNav} menuOpen={menuOpen} setMenuOpen={setMenuOpen} onApply={handleApply} onBabyeyi={handleBabyeyi} navItems={navItems} />
      {jumpToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[320] w-[calc(100vw-24px)] max-w-[92vw] sm:w-auto sm:max-w-sm">
          <div className="rounded-2xl border border-emerald-300/40 bg-emerald-600 text-white px-4 py-3 shadow-2xl">
            <p className="font-black text-sm" style={syne}>Success</p>
            <p className="text-xs sm:text-sm text-emerald-50 mt-0.5" style={syne}>{jumpToast}</p>
          </div>
        </div>
      )}
      <HeroSection       school={data} theme={theme} onApply={handleApply} onBabyeyi={handleBabyeyi} onStudentLookup={handleHeroStudentLookup} />
      <AboutSection      school={data} theme={theme} />
      <MissionSection    school={data} theme={theme} />
      <ProgramsSection   school={data} theme={theme} />
      <FeesSection       school={data} theme={theme} />
      <GallerySection    school={data} theme={theme} />
      <LeadershipSection school={data} theme={theme} />
      <NewsSection school={data} theme={theme} enabled={showNewsSection} />
      <AdmissionsSection school={data} theme={theme} schoolSlug={slug} onApply={handleApply} />
      <BabyeyiFinder
        school={data}
        theme={theme}
        schoolSlug={slug}
        siteLang={siteLang}
        openModal={babyeyiModalOpen}
        onCloseModal={() => setBabyeyiModalOpen(false)}
        lookupPrefill={babyeyiLookupSeed}
        publicPayNoLogin
        publicPayFromSchoolSite
      />
      <ContactSection    school={data} />
      <SiteFooter        school={data} theme={theme} />

      {contentTranslating && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[120] flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-xs font-bold text-white"
          style={{ background: '#1F2937', border: '1px solid rgba(251,191,36,0.35)', ...syne }}
          role="status"
        >
          <Loader2 size={14} className="animate-spin" style={{ color: '#FBBF24' }} />
          {t('schoolPublic.translatingContent', { defaultValue: 'Translating content…' })}
        </div>
      )}

      {applyOpen && adm?.id && (
        <AdmissionApplyModal formId={adm.id} onClose={() => setApplyOpen(false)} />
      )}
    </div>
  );
}

// ─── EXPORT ──────────────────────────────────────────────────────────────────
export default function SchoolPublicRoute() {
  const { t, i18n } = useTranslation();
  const { slug }    = useParams();
  const location    = useLocation();
  const navigate    = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const siteLang = normalizeBabyeyiLang(i18n.language);

  const lookupFromUrl = (() => {
    const q = new URLSearchParams(location.search || '');
    if (q.get('openBabyeyi') !== '1') return null;
    return {
      code: q.get('studentCode') || q.get('sdmId') || q.get('sdm_id') || '',
      className: q.get('class') || '',
      academicYear: q.get('year') || '',
      term: q.get('term') || '',
      studentName: q.get('studentName') || '',
    };
  })();

  useEffect(() => {
    if (!slug) { setError(t('schoolPublic.noSchoolSpecified', { defaultValue: 'No school specified' })); setLoading(false); return; }
    let cancelled = false;
    if (data) setContentLoading(true);
    else setLoading(true);
    setError(null);
    fetch(`${API}/slug/${slug}?lang=${encodeURIComponent(siteLang)}`)
      .then(r => { if (!r.ok) throw new Error(t('schoolPublic.notPublishedOrFound', { defaultValue: 'School website not found or not yet published' })); return r.json(); })
      .then(r => { if (!cancelled) setData(r.data); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setContentLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [slug, siteLang, t]);

  if (loading && !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: '#1F2937', ...montserrat }}>
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse"
        style={{ background: '#FBBF24', boxShadow: '0 8px 32px rgba(251,191,36,0.35)' }}
      >
        <GraduationCap size={36} color="#1F2937" />
      </div>
      <div className="text-center">
        <p className="text-white font-black text-base mb-1" style={syne}>{t('schoolPublic.loadingSite', { defaultValue: 'Loading School Website' })}</p>
        <p className="font-mono text-xs" style={{ color: 'rgba(251,191,36,0.5)' }}>{slug}</p>
      </div>
      <Loader2 size={20} className="animate-spin" style={{ color: '#FBBF24' }} />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-6" style={{ background: '#1F2937', ...montserrat }}>
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(251,191,36,0.3)' }}
      >
        🏫
      </div>
      <div className="text-center max-w-sm">
        <h1 className="text-white font-black text-2xl sm:text-3xl mb-3" style={serif}>{t('schoolPublic.notFoundTitle', { defaultValue: 'School Not Found' })}</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8" style={syne}>
          {error || t('schoolPublic.notFoundSub', { defaultValue: "This school's website is not available. It may not be published yet." })}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/schools')}
            className="px-7 py-3.5 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
            style={{ background: '#FBBF24', color: '#1F2937', ...syne }}
          >
            {t('schoolPublic.browseAllSchools', { defaultValue: 'Browse All Schools' })}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-7 py-3.5 rounded-2xl font-black text-sm hover:bg-white/10 transition-colors border text-white"
            style={{ borderColor: 'rgba(255,255,255,0.15)', ...syne }}
          >
            ← {t('schoolPublic.goBack', { defaultValue: 'Go Back' })}
          </button>
        </div>
      </div>
      <p className="text-[10px] font-mono" style={{ color: 'rgba(251,191,36,0.3)' }}>/{slug}</p>
    </div>
  );

  return (
    <SchoolSite
      data={data}
      slug={slug}
      initialLookupSeed={lookupFromUrl}
      contentTranslating={contentLoading}
      siteLang={siteLang}
    />
  );
}