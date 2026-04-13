/**
 * AllSchools.jsx — v3.0
 * Route: /schools
 * Design: Editorial amber + #1F2937, Montserrat typography
 * Mobile-first, professional, highly attractive
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, GraduationCap, Building2, Award, Wrench,
  ChevronRight, Filter, X, SlidersHorizontal, BookOpen,
  Users, Loader2, AlertCircle, ChevronDown, ChevronUp,
  CheckCircle2, ArrowLeft, Sparkles, LayoutGrid, List,
} from 'lucide-react';

// ─── FONTS ───────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <link
    href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap"
    rel="stylesheet"
  />
);

    const SERVER = import.meta.env.VITE_API_URL || "https://babyeyi.rw";
    const API    = `${SERVER}/api/mini-websites`;

// ─── helpers ─────────────────────────────────────────────────────────────────
function imgUrl(p) {
  if (!p) return null;
  if (p.startsWith('http') || p.startsWith('blob:')) return p;
  let norm = p.replace(/\\/g, '/');
  const stripped = norm.replace(/^\//, '');
  const idx = stripped.indexOf('uploads/');
  if (idx !== -1) norm = '/' + stripped.slice(idx);
  return `${SERVER}${norm.startsWith('/') ? norm : '/' + norm}`;
}

const SCHOOL_TYPES = ['Public', 'Private', 'Government Aided', 'Faith Based'];
const EDUCATION_LEVELS = [
  'Nursery / Pre-Primary',
  'Primary School',
  'Secondary School (O-Level)',
  'Secondary School (A-Level)',
  'TVET',
];

function normalizeOwnership(val) {
  const raw = String(val || '').trim();
  if (!raw) return '';
  const k = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (k === 'public' || k === 'government') return 'Public';
  if (k === 'private') return 'Private';
  if (k === 'government_aided' || k === 'gov_aided' || k === 'governmentaided') return 'Government Aided';
  if (k === 'faith_based' || k === 'faithbased' || k === 'religious') return 'Faith Based';
  return raw.split(/[\s_]+/g).filter(Boolean).map(w => w.length ? (w[0].toUpperCase() + w.slice(1).toLowerCase()) : w).join(' ');
}

function normalizeEducationLevels(levels) {
  const arr = Array.isArray(levels) ? levels : [];
  const out = [];
  for (const v of arr) {
    const raw = String(v || '').trim();
    if (!raw) continue;
    const k = raw.toLowerCase().replace(/[\s-]+/g, '_');
    if (k === 'nursery' || k === 'pre_primary' || k === 'preprimary' || k === 'nursery_pre_primary') out.push('Nursery / Pre-Primary');
    else if (k === 'primary' || k === 'primary_school') out.push('Primary School');
    else if (k === 'o_level' || k === 'olevel' || k === 'o') out.push('Secondary School (O-Level)');
    else if (k === 'a_level' || k === 'alevel' || k === 'a') out.push('Secondary School (A-Level)');
    else if (k === 'tvet') out.push('TVET');
    else if (EDUCATION_LEVELS.includes(raw)) out.push(raw);
  }
  return [...new Set(out)];
}

// ─── LEVEL META ──────────────────────────────────────────────────────────────
const LEVEL_META = {
  'Nursery / Pre-Primary':     { label: 'Nursery',  bg: 'rgba(251,191,36,0.15)', text: '#92620a' },
  'Primary School':             { label: 'Primary',  bg: 'rgba(251,191,36,0.1)',  text: '#92620a' },
  'Secondary School (O-Level)': { label: 'O-Level',  bg: 'rgba(251,191,36,0.22)', text: '#7c5309' },
  'Secondary School (A-Level)': { label: 'A-Level',  bg: '#FBBF24',               text: '#1F2937' },
  'TVET':                       { label: 'TVET',     bg: '#1F2937',               text: '#FBBF24' },
};

// ─── FilterSection ────────────────────────────────────────────────────────────
function FilterSection({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-0.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-[#1F2937] hover:bg-amber-50 rounded-xl transition-colors"
        style={{ fontFamily: "'Montserrat', sans-serif" }}
      >
        <span className="flex items-center gap-2.5">{icon}{title}</span>
        {open
          ? <ChevronUp size={13} style={{ color: '#FBBF24' }} />
          : <ChevronDown size={13} className="text-gray-300" />}
      </button>
      {open && <div className="px-3 pb-3 pt-0.5">{children}</div>}
    </div>
  );
}

function CheckItem({ label, checked, onChange, count }) {
  return (
    <label
      className="flex items-center gap-2.5 py-1.5 px-1.5 rounded-lg hover:bg-amber-50 cursor-pointer group transition-colors"
      onClick={onChange}
    >
      <div
        className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
        style={
          checked
            ? { background: '#FBBF24', border: '2px solid #FBBF24' }
            : { border: '2px solid #D1D5DB', background: 'white' }
        }
      >
        {checked && (
          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
            <path d="M1 3L3 5L7 1" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span
        className="text-sm flex-1 transition-colors"
        style={{ fontFamily: "'Montserrat', sans-serif", color: checked ? '#1F2937' : '#4B5563', fontWeight: checked ? 700 : 500 }}
      >
        {label}
      </span>
      {count !== undefined && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all"
          style={{
            background: checked ? 'rgba(251,191,36,0.2)' : '#F3F4F6',
            color: checked ? '#92620a' : '#9CA3AF',
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          {count}
        </span>
      )}
      <input type="checkbox" checked={checked} onChange={() => {}} className="sr-only" />
    </label>
  );
}

// ─── SchoolCard ───────────────────────────────────────────────────────────────
function SchoolCard({ school, onClick, index }) {
  const logoSrc  = imgUrl(school.logoPreview || school.logo_url);
  const coverSrc = imgUrl(school.coverPreview || school.cover_url);
  const levels   = school.educationLevels || [];

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-amber-300 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
      style={{
        animationDelay: `${(index % 12) * 40}ms`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Cover */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ height: 130 }}
      >
        {coverSrc
          ? <img src={coverSrc} alt="cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          : (
            <div
              className="w-full h-full"
              style={{ background: 'linear-gradient(135deg, #1F2937 0%, #374151 60%, rgba(251,191,36,0.3) 100%)' }}
            />
          )
        }
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Ownership badge */}
        {school.ownership && (
          <div
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(31,41,55,0.85)', color: '#FBBF24', fontFamily: "'Montserrat', sans-serif", backdropFilter: 'blur(8px)', border: '1px solid rgba(251,191,36,0.2)' }}
          >
            {school.ownership}
          </div>
        )}

        {/* Logo */}
        <div className="absolute bottom-0 left-5 translate-y-1/2 z-10">
          <div
            className="w-13 h-13 rounded-xl shadow-xl overflow-hidden ring-3 ring-white flex-shrink-0"
            style={{ width: 52, height: 52, ringWidth: 3 }}
          >
            {logoSrc
              ? <img src={logoSrc} alt="logo" className="w-full h-full object-cover" />
              : (
                <div
                  className="w-full h-full flex items-center justify-center font-black text-lg"
                  style={{ background: '#1F2937', color: '#FBBF24', fontFamily: "'Montserrat', sans-serif" }}
                >
                  {(school.name || 'S')[0].toUpperCase()}
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="pt-9 px-5 pb-4 flex flex-col flex-1">
        <h3
          className="font-black text-base leading-tight mb-1 line-clamp-2 transition-colors"
          style={{ fontFamily: "'Montserrat', sans-serif", color: '#1F2937', fontWeight: 800 }}
        >
          {school.name}
        </h3>
        <div
          className="flex items-center gap-1.5 text-xs mb-3"
          style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}
        >
          <MapPin size={10} className="flex-shrink-0" style={{ color: '#FBBF24' }} />
          <span className="truncate">{school.district}{school.province ? `, ${school.province}` : ''}</span>
        </div>

        {/* Level tags */}
        {levels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {levels.slice(0, 3).map(l => {
              const meta = LEVEL_META[l] || { label: l, bg: '#F3F4F6', text: '#1F2937' };
              return (
                <span
                  key={l}
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: meta.bg, color: meta.text, fontFamily: "'Montserrat', sans-serif" }}
                >
                  {meta.label}
                </span>
              );
            })}
            {levels.length > 3 && (
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: '#F3F4F6', color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}
              >
                +{levels.length - 3}
              </span>
            )}
          </div>
        )}

        <div
          className="mt-auto pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid #F9FAFB' }}
        >
          <span
            className="text-xs font-medium"
            style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}
          >
            {school.category || 'School'}
          </span>
          <div
            className="flex items-center gap-1 text-xs font-bold group-hover:gap-2 transition-all"
            style={{ color: '#FBBF24', fontFamily: "'Montserrat', sans-serif" }}
          >
            View <ChevronRight size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LIST CARD ────────────────────────────────────────────────────────────────
function ListCard({ school, onClick }) {
  const logoSrc = imgUrl(school.logoPreview || school.logo_url);
  const levels  = school.educationLevels || [];

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-100 hover:border-amber-300 hover:shadow-lg transition-all cursor-pointer p-4 flex items-center gap-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div
        className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
        style={{ border: '2px solid #F3F4F6' }}
      >
        {logoSrc
          ? <img src={logoSrc} alt="logo" className="w-full h-full object-cover" />
          : (
            <div
              className="w-full h-full flex items-center justify-center font-black text-lg"
              style={{ background: '#1F2937', color: '#FBBF24', fontFamily: "'Montserrat', sans-serif" }}
            >
              {(school.name || 'S')[0]}
            </div>
          )
        }
      </div>
      <div className="flex-1 min-w-0">
        <h3
          className="font-black truncate text-sm transition-colors"
          style={{ fontFamily: "'Montserrat', sans-serif", color: '#1F2937', fontWeight: 800 }}
        >
          {school.name}
        </h3>
        <div
          className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs mt-0.5"
          style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}
        >
          <span className="flex items-center gap-1"><MapPin size={9} style={{ color: '#FBBF24' }} />{school.district}</span>
          {school.ownership && <span className="flex items-center gap-1"><Building2 size={9} />{school.ownership}</span>}
        </div>
        {levels.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {levels.slice(0, 4).map(l => {
              const meta = LEVEL_META[l] || { label: l, bg: '#F3F4F6', text: '#1F2937' };
              return (
                <span
                  key={l}
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: meta.bg, color: meta.text, fontFamily: "'Montserrat', sans-serif" }}
                >
                  {meta.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <ChevronRight
        size={15}
        className="flex-shrink-0 transition-colors"
        style={{ color: '#E5E7EB' }}
      />
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function AllSchools() {
  const navigate = useNavigate();

  const [schools,    setSchools]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [filterOpts, setFilterOpts] = useState({ aLevelCombos: [], tvetTrades: [] });

  const [search,      setSearch]      = useState('');
  const [selTypes,    setSelTypes]    = useState([]);
  const [selLevels,   setSelLevels]   = useState([]);
  const [selALevel,   setSelALevel]   = useState([]);
  const [selTVET,     setSelTVET]     = useState([]);
  const [selDistrict, setSelDistrict] = useState('');

  const [mobileFilter, setMobileFilter] = useState(false);
  const [view,         setView]         = useState('grid');

  useEffect(() => {
    fetch(`${API}?status=published&limit=500`)
      .then(r => r.json())
      .then(d => {
        const rows = Array.isArray(d.data) ? d.data : [];
        const normalized = rows.filter(s => s.slug).map(s => ({
          ...s,
          name: s.school_name || s.name || '',
          code: s.school_code || s.code || '',
          ownership: normalizeOwnership(s.ownership_type || s.ownership),
          category: s.school_category || s.category || '',
          district: s.district || '',
          province: s.province || '',
          logoPreview: s.logoUrl || s.logo_url || null,
          coverPreview: s.coverUrl || s.cover_url || null,
          educationLevels: normalizeEducationLevels(
            Array.isArray(s.educationLevels) ? s.educationLevels : (Array.isArray(s.education_levels) ? s.education_levels : [])
          ),
          aLevelCombos: Array.isArray(s.aLevelCombos) ? s.aLevelCombos : (Array.isArray(s.a_level_combinations) ? s.a_level_combinations : []),
          tvetTrades: Array.isArray(s.tvetTrades) ? s.tvetTrades : (Array.isArray(s.tvet_trades) ? s.tvet_trades : []),
        }));
        setSchools(normalized);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API}/filter-options`)
      .then(r => r.json())
      .then(d => { if (d.success && d.data) setFilterOpts(d.data); })
      .catch(() => {});
  }, []);

  const derivedFilterOpts = useMemo(() => {
    const aSet = new Set(); const tSet = new Set();
    schools.forEach(s => {
      (s.aLevelCombos || []).forEach(c => aSet.add(c.code || c));
      (s.tvetTrades || []).forEach(t => tSet.add(t));
    });
    return {
      aLevelCombos: filterOpts.aLevelCombos.length > 0 ? filterOpts.aLevelCombos : [...aSet].map(c => ({ code: c, full: c })),
      tvetTrades:   filterOpts.tvetTrades.length > 0   ? filterOpts.tvetTrades   : [...tSet],
    };
  }, [schools, filterOpts]);

  const districts = useMemo(() => {
    const set = new Set(schools.map(s => s.district).filter(Boolean));
    return [...set].sort();
  }, [schools]);

  const activeFilters = selTypes.length + selLevels.length + selALevel.length + selTVET.length + (selDistrict ? 1 : 0);

  const filtered = useMemo(() => {
    let out = schools;
    const q = search.trim().toLowerCase();
    if (q) out = out.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.district || '').toLowerCase().includes(q) ||
      (s.province || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q)
    );
    if (selDistrict) out = out.filter(s => s.district === selDistrict);
    if (selTypes.length) out = out.filter(s => selTypes.includes(s.ownership));
    if (selLevels.length) out = out.filter(s => selLevels.some(l => (s.educationLevels || []).includes(l)));
    if (selALevel.length) out = out.filter(s => selALevel.some(a => (s.aLevelCombos || []).map(c => c.code || c).includes(a)));
    if (selTVET.length) out = out.filter(s => selTVET.some(t => (s.tvetTrades || []).includes(t)));
    return out;
  }, [schools, search, selDistrict, selTypes, selLevels, selALevel, selTVET]);

  const toggle = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const clearAll = () => {
    setSearch(''); setSelTypes([]); setSelLevels([]);
    setSelALevel([]); setSelTVET([]); setSelDistrict('');
  };

  // Active filter chips
  const activeChips = [
    ...selTypes.map(v => ({ label: v, clear: () => toggle(selTypes, setSelTypes, v) })),
    ...selLevels.map(v => ({ label: LEVEL_META[v]?.label || v, clear: () => toggle(selLevels, setSelLevels, v) })),
    ...selALevel.map(v => ({ label: v, clear: () => toggle(selALevel, setSelALevel, v) })),
    ...selTVET.map(v => ({ label: v, clear: () => toggle(selTVET, setSelTVET, v) })),
    ...(selDistrict ? [{ label: selDistrict, clear: () => setSelDistrict('') }] : []),
  ];

  // ─── Sidebar ─────────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="py-2">
      {/* District */}
      <FilterSection
        title="District"
        icon={<MapPin size={13} style={{ color: '#FBBF24' }} />}
      >
        <div className="relative">
          <select
            value={selDistrict}
            onChange={e => setSelDistrict(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl border-2 appearance-none focus:outline-none transition-colors bg-white pr-8"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              borderColor: selDistrict ? '#FBBF24' : '#E5E7EB',
              color: '#1F2937',
              fontWeight: selDistrict ? 700 : 500,
            }}
          >
            <option value="">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#FBBF24' }} />
        </div>
      </FilterSection>

      <div className="mx-4 my-1" style={{ height: 1, background: '#F3F4F6' }} />

      {/* School Type */}
      <FilterSection title="School Type" icon={<Building2 size={13} style={{ color: '#FBBF24' }} />}>
        {SCHOOL_TYPES.map(t => (
          <CheckItem
            key={t}
            label={t}
            checked={selTypes.includes(t)}
            onChange={() => toggle(selTypes, setSelTypes, t)}
            count={schools.filter(s => s.ownership === t).length}
          />
        ))}
      </FilterSection>

      <div className="mx-4 my-1" style={{ height: 1, background: '#F3F4F6' }} />

      {/* Education Level */}
      <FilterSection title="Education Level" icon={<GraduationCap size={13} style={{ color: '#FBBF24' }} />}>
        {EDUCATION_LEVELS.map(l => (
          <CheckItem
            key={l}
            label={LEVEL_META[l]?.label || l}
            checked={selLevels.includes(l)}
            onChange={() => toggle(selLevels, setSelLevels, l)}
            count={schools.filter(s => (s.educationLevels || []).includes(l)).length}
          />
        ))}
      </FilterSection>

      <div className="mx-4 my-1" style={{ height: 1, background: '#F3F4F6' }} />

      {/* A-Level */}
      <FilterSection
        title="A-Level Combinations"
        icon={<Award size={13} style={{ color: '#FBBF24' }} />}
        defaultOpen={derivedFilterOpts.aLevelCombos.length > 0}
      >
        {derivedFilterOpts.aLevelCombos.length === 0
          ? <p className="text-xs px-1 py-2" style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}>No combinations yet</p>
          : (
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
              {derivedFilterOpts.aLevelCombos.map(c => {
                const code = c.code || c;
                const full = c.full || c.name || '';
                return (
                  <CheckItem
                    key={code}
                    label={
                      <span>
                        <span style={{ fontWeight: 800, color: '#92620a' }}>{code}</span>
                        {full ? <span style={{ color: '#9CA3AF', fontSize: '0.7rem' }}> — {full}</span> : null}
                      </span>
                    }
                    checked={selALevel.includes(code)}
                    onChange={() => toggle(selALevel, setSelALevel, code)}
                    count={schools.filter(s => (s.aLevelCombos || []).some(x => (x.code || x) === code)).length}
                  />
                );
              })}
            </div>
          )
        }
      </FilterSection>

      <div className="mx-4 my-1" style={{ height: 1, background: '#F3F4F6' }} />

      {/* TVET */}
      <FilterSection
        title="TVET Trades"
        icon={<Wrench size={13} style={{ color: '#FBBF24' }} />}
        defaultOpen={derivedFilterOpts.tvetTrades.length > 0}
      >
        {derivedFilterOpts.tvetTrades.length === 0
          ? <p className="text-xs px-1 py-2" style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}>No trades yet</p>
          : (
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
              {derivedFilterOpts.tvetTrades.map(t => (
                <CheckItem
                  key={t} label={t}
                  checked={selTVET.includes(t)}
                  onChange={() => toggle(selTVET, setSelTVET, t)}
                  count={schools.filter(s => (s.tvetTrades || []).includes(t)).length}
                />
              ))}
            </div>
          )
        }
      </FilterSection>
    </div>
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: '#F8F7F4', fontFamily: "'Montserrat', sans-serif" }}
    >
      <FontLoader />

      {/* ─── TOPBAR ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
        style={{ background: '#1F2937', borderBottom: '1px solid rgba(251,191,36,0.15)' }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center gap-3 h-16">

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all hover:bg-white/8 flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.8rem' }}
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </button>

          {/* Logo mark */}
          <div
            className="hidden sm:flex items-center gap-2 flex-shrink-0 mr-1"
            style={{ borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px' }}
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: '#FBBF24' }}
            >
              <GraduationCap size={14} style={{ color: '#1F2937' }} />
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(251,191,36,0.6)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search schools, districts…"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1.5px solid rgba(251,191,36,0.18)',
                color: 'white',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 500,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Mobile filter btn */}
          <button
            onClick={() => setMobileFilter(true)}
            className="lg:hidden relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all flex-shrink-0"
            style={{
              background: activeFilters > 0 ? '#FBBF24' : 'rgba(255,255,255,0.08)',
              color: activeFilters > 0 ? '#1F2937' : 'rgba(255,255,255,0.7)',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: '0.8rem',
              border: '1.5px solid rgba(251,191,36,0.2)',
            }}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden xs:inline">Filters</span>
            {activeFilters > 0 && (
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={{ background: '#1F2937', color: '#FBBF24' }}
              >
                {activeFilters}
              </span>
            )}
          </button>

          {/* View toggle */}
          <div
            className="hidden sm:flex items-center p-1 rounded-xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(251,191,36,0.15)' }}
          >
            <button
              onClick={() => setView('grid')}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: view === 'grid' ? '#FBBF24' : 'transparent', color: view === 'grid' ? '#1F2937' : 'rgba(255,255,255,0.4)' }}
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setView('list')}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: view === 'list' ? '#FBBF24' : 'transparent', color: view === 'list' ? '#1F2937' : 'rgba(255,255,255,0.4)' }}
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── PAGE HERO STRIP ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: '#1F2937', paddingTop: '28px', paddingBottom: '28px' }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #FBBF24 0%, transparent 50%), radial-gradient(circle at 80% 50%, #FBBF24 0%, transparent 50%)`,
          }}
        />
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3 relative z-10">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-black text-white leading-tight"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: '-0.02em' }}
            >
              Explore{' '}
              <span style={{ color: '#FBBF24' }}>Schools</span>
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: 'rgba(255,255,255,0.45)', fontFamily: "'Montserrat', sans-serif" }}
            >
              {loading
                ? 'Loading…'
                : <>{filtered.length} of {schools.length} schools across Rwanda</>
              }
            </p>
          </div>

          {/* Active filter count pill */}
          {activeFilters > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)', fontFamily: "'Montserrat', sans-serif" }}
            >
              <X size={12} /> Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* ─── ACTIVE FILTER CHIPS ─────────────────────────────────────────── */}
      {activeChips.length > 0 && (
        <div
          className="sticky z-20 overflow-x-auto"
          style={{ top: 64, background: '#1F2937', borderBottom: '1px solid rgba(251,191,36,0.12)' }}
        >
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2 flex-nowrap">
            {activeChips.map((chip, i) => (
              <button
                key={i}
                onClick={chip.clear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 transition-all hover:opacity-80"
                style={{ background: '#FBBF24', color: '#1F2937', fontFamily: "'Montserrat', sans-serif" }}
              >
                {chip.label} <X size={10} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── MAIN BODY ───────────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 flex gap-6">

        {/* ─── Desktop Sidebar ──────────────────────────────────────── */}
        <aside className="hidden lg:block w-68 flex-shrink-0" style={{ width: 268 }}>
          <div
            className="rounded-2xl sticky overflow-y-auto"
            style={{
              top: activeChips.length > 0 ? 136 : 100,
              maxHeight: 'calc(100vh - 120px)',
              background: 'white',
              border: '1px solid #F0EDE4',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
            }}
          >
            {/* Sidebar header */}
            <div
              className="px-4 py-3 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid #F3F4F6' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: '#FBBF24' }}
                >
                  <SlidersHorizontal size={13} style={{ color: '#1F2937' }} />
                </div>
                <span
                  className="font-black text-sm"
                  style={{ fontFamily: "'Montserrat', sans-serif", color: '#1F2937' }}
                >
                  Filters
                </span>
                {activeFilters > 0 && (
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: '#FBBF24', color: '#1F2937', fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {activeFilters}
                  </span>
                )}
              </div>
              {activeFilters > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs font-bold hover:opacity-70 transition-opacity"
                  style={{ color: '#FBBF24', fontFamily: "'Montserrat', sans-serif" }}
                >
                  Clear all
                </button>
              )}
            </div>
            <SidebarContent />
          </div>
        </aside>

        {/* ─── Results ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.1)' }}
              >
                <Loader2 size={22} className="animate-spin" style={{ color: '#FBBF24' }} />
              </div>
              <p
                className="font-semibold"
                style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}
              >
                Loading schools…
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <AlertCircle size={36} style={{ color: '#F87171' }} />
              <p className="font-black" style={{ fontFamily: "'Montserrat', sans-serif", color: '#1F2937' }}>
                Failed to load schools
              </p>
              <p className="text-sm" style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}>{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1.5px dashed rgba(251,191,36,0.4)' }}
              >
                🏫
              </div>
              <p className="font-black text-lg" style={{ fontFamily: "'Montserrat', sans-serif", color: '#1F2937' }}>
                No schools match your filters
              </p>
              <p className="text-sm max-w-xs" style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}>
                Try removing some filters or changing your search
              </p>
              <button
                onClick={clearAll}
                className="px-6 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
                style={{ background: '#FBBF24', color: '#1F2937', fontFamily: "'Montserrat', sans-serif" }}
              >
                Clear all filters
              </button>
            </div>
          )}

          {/* Results */}
          {!loading && !error && filtered.length > 0 && (
            <>
              {/* Results count */}
              <div
                className="flex items-center justify-between mb-4"
              >
                <p
                  className="text-xs font-bold"
                  style={{ color: '#9CA3AF', fontFamily: "'Montserrat', sans-serif" }}
                >
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                  {search && <span style={{ color: '#FBBF24' }}> for "{search}"</span>}
                </p>
                {/* Mobile view toggle */}
                <div
                  className="flex sm:hidden items-center p-0.5 rounded-lg"
                  style={{ background: 'white', border: '1.5px solid #E5E7EB' }}
                >
                  <button
                    onClick={() => setView('grid')}
                    className="p-1.5 rounded-md transition-all"
                    style={{ background: view === 'grid' ? '#1F2937' : 'transparent', color: view === 'grid' ? '#FBBF24' : '#9CA3AF' }}
                  >
                    <LayoutGrid size={13} />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className="p-1.5 rounded-md transition-all"
                    style={{ background: view === 'list' ? '#1F2937' : 'transparent', color: view === 'list' ? '#FBBF24' : '#9CA3AF' }}
                  >
                    <List size={13} />
                  </button>
                </div>
              </div>

              {view === 'list'
                ? (
                  <div className="space-y-2.5">
                    {filtered.map(school => (
                      <ListCard
                        key={school.id}
                        school={school}
                        onClick={() => navigate(`/school/${school.slug}`)}
                      />
                    ))}
                  </div>
                )
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((school, i) => (
                      <SchoolCard
                        key={school.id}
                        school={school}
                        index={i}
                        onClick={() => navigate(`/school/${school.slug}`)}
                      />
                    ))}
                  </div>
                )
              }
            </>
          )}
        </div>
      </div>

      {/* ─── Mobile Filter Drawer ─────────────────────────────────────────── */}
      {mobileFilter && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileFilter(false)} />
          <div
            className="relative w-80 max-w-[88vw] bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
            style={{ animation: 'slideInLeft 0.22s cubic-bezier(0.22,1,0.36,1)' }}
          >
            <style>{`
              @keyframes slideInLeft {
                from { transform: translateX(-100%) }
                to   { transform: translateX(0) }
              }
            `}</style>

            {/* Drawer header */}
            <div
              className="px-5 py-4 flex items-center justify-between flex-shrink-0"
              style={{ background: '#1F2937', borderBottom: '1px solid rgba(251,191,36,0.15)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: '#FBBF24' }}
                >
                  <SlidersHorizontal size={13} style={{ color: '#1F2937' }} />
                </div>
                <span
                  className="font-black text-white text-sm"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  Filters
                </span>
                {activeFilters > 0 && (
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: '#FBBF24', color: '#1F2937' }}
                  >
                    {activeFilters}
                  </span>
                )}
              </div>
              <button
                onClick={() => setMobileFilter(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <SidebarContent />
            </div>

            <div
              className="p-4 flex gap-3 flex-shrink-0"
              style={{ borderTop: '1px solid #F3F4F6' }}
            >
              <button
                onClick={clearAll}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all border-2"
                style={{ fontFamily: "'Montserrat', sans-serif", color: '#1F2937', borderColor: '#E5E7EB' }}
              >
                Clear all
              </button>
              <button
                onClick={() => setMobileFilter(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
                style={{ background: '#FBBF24', color: '#1F2937', fontFamily: "'Montserrat', sans-serif" }}
              >
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}