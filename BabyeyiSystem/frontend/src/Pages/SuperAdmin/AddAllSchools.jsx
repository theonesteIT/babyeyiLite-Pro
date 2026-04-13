// ================================================================
// AddAllSchools.jsx — Super Admin: minimal school shell (step 1 only)
// Creates a school row without a manager; appears on public registration.
// ================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, School, MapPin, Loader2, Check, Layers, Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PROVINCES } from '../../data/rwandaSchoolProvinces';
import { getDistrictCode } from '../../utils/rwandaDistrictCodes';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5100'}/api`;
const axCfg = { headers: { 'Content-Type': 'application/json' }, withCredentials: true };

const inp = `w-full bg-amber-50/80 border-2 border-amber-200 text-gray-900 rounded-xl px-4 py-3 text-sm
  focus:outline-none focus:border-[#F5B800] focus:ring-2 focus:ring-amber-100 placeholder-amber-400`;

const LEVEL_OPTIONS = [
  { key: 'nursery', label: 'Pre-primary' },
  { key: 'primary', label: 'Primary' },
  { key: 'o_level', label: 'O-Level' },
  { key: 'a_level', label: 'A-Level' },
  { key: 'tvet', label: 'TVET' },
];

/** Common TVET trades — users can add more via custom field */
const PRESET_TVET_TRADES = [
  'Software Development',
  'Electrical Installation',
  'Automotive Technology',
  'Construction Technology',
  'Agriculture & Animal Husbandry',
  'Hospitality & Catering',
  'Fashion Design & Tailoring',
  'Plumbing',
  'Welding & Metal Fabrication',
];

const OWNERSHIP_OPTIONS = [
  { value: 'Government', label: 'Public (Government)' },
  { value: 'Private', label: 'Private' },
  { value: 'Government-Aided', label: 'Government Aided' },
];

const PRESET_COMBINATIONS = ['PCM', 'PCB', 'MCB', 'MPC', 'MPG', 'LFK', 'HEG', 'MCE', 'MEG', 'PEG'];

export default function AddAllSchools() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [schoolName, setSchoolName] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [ownership, setOwnership] = useState('Government');
  const [levels, setLevels] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [customCombo, setCustomCombo] = useState('');
  const [tvetTrades, setTvetTrades] = useState([]);
  const [customTrade, setCustomTrade] = useState('');

  const provinceData = PROVINCES[province] || {};
  const districtData = provinceData.districts?.[district] || {};
  const sectorList = districtData.sectors || [];
  const districtCode = district ? getDistrictCode(district) : null;
  const hasALevel = levels.includes('a_level');
  const hasTvet = levels.includes('tvet');

  useEffect(() => {
    if (
      !auth.loading
      && (!auth.isLoggedIn
        || !['SUPER_ADMIN', 'FULL_SYSTEM_CONTROLLER'].includes(auth.role))
    ) {
      navigate('/login', { replace: true });
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, navigate]);

  const toggleLevel = (key) => {
    setLevels((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      if (!next.includes('a_level')) setCombinations([]);
      if (!next.includes('tvet')) setTvetTrades([]);
      return next;
    });
  };

  const toggleCombo = (c) => {
    const u = c.toUpperCase().trim();
    if (!u) return;
    setCombinations((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));
  };

  const addCustomCombo = () => {
    const u = customCombo.trim().toUpperCase();
    if (!u || combinations.includes(u)) return;
    setCombinations((prev) => [...prev, u]);
    setCustomCombo('');
  };

  const toggleTrade = (t) => {
    const label = String(t).trim();
    if (!label) return;
    setTvetTrades((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const addCustomTrade = () => {
    const t = customTrade.trim();
    if (!t || tvetTrades.includes(t)) return;
    setTvetTrades((prev) => [...prev, t]);
    setCustomTrade('');
  };

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      showToast('School name is required', 'error');
      return;
    }
    if (!province || !district || !sector) {
      showToast('Province, district, and sector are required', 'error');
      return;
    }
    if (!levels.length) {
      showToast('Select at least one school level', 'error');
      return;
    }
    if (hasALevel && !combinations.length) {
      showToast('Select at least one A-Level combination', 'error');
      return;
    }
    if (hasTvet && !tvetTrades.length) {
      showToast('Select or add at least one TVET trade', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/schools/skeleton`,
        {
          schoolName: schoolName.trim(),
          province,
          district,
          sector,
          ownership,
          levels,
          aLevelCombinations: hasALevel ? combinations : [],
          tvetTrades: hasTvet ? tvetTrades : [],
        },
        axCfg
      );
      if (res.data.success) {
        showToast(
          `Shell created — code ${res.data.data?.school_code}. It will show on public registration for this location.`,
          'success'
        );
        setSchoolName('');
        setLevels([]);
        setCombinations([]);
        setTvetTrades([]);
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (auth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-100/80">
      <header className="sticky top-0 z-10 border-b border-amber-200/80 bg-white/90 backdrop-blur px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-amber-200 text-amber-800 hover:bg-amber-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#1F2937] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-sm font-black text-[#1F2937]">Add school (quick)</h1>
            <p className="text-[10px] text-amber-700">Name, location, ownership, levels — no manager yet</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 pb-16">
        {toast && (
          <div
            className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium border ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {toast.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border-2 border-amber-100 shadow-lg shadow-amber-100/40 p-5 space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
              School name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
              <input
                className={`${inp} pl-10`}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. GS Example"
              />
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Location
            </h3>
            <div className="space-y-3">
              <select
                className={inp}
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setDistrict('');
                  setSector('');
                }}
              >
                <option value="">Province…</option>
                {Object.keys(PROVINCES).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                className={inp}
                value={district}
                disabled={!province}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setSector('');
                }}
              >
                <option value="">District…</option>
                {Object.keys(provinceData.districts || {}).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {district && districtCode && (
                <p className="text-[11px] text-amber-800 font-semibold">
                  District code: <span className="font-mono">{districtCode}</span>
                </p>
              )}
              <select className={inp} value={sector} disabled={!district} onChange={(e) => setSector(e.target.value)}>
                <option value="">Sector…</option>
                {sectorList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
              Ownership <span className="text-red-500">*</span>
            </label>
            <select className={inp} value={ownership} onChange={(e) => setOwnership(e.target.value)}>
              {OWNERSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> School levels <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {LEVEL_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleLevel(key)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    levels.includes(key)
                      ? 'bg-amber-400 border-amber-500 text-[#1F2937]'
                      : 'bg-amber-50/80 border-amber-200 text-amber-900 hover:border-amber-300'
                  }`}
                >
                  {levels.includes(key) && <Check className="w-3 h-3 inline mr-1" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {hasALevel && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-900">A-Level combinations / sections</p>
              <p className="text-[10px] text-amber-800">Select all that apply (multiple)</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_COMBINATIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCombo(c)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold border ${
                      combinations.includes(c)
                        ? 'bg-[#1F2937] text-amber-300 border-[#1F2937]'
                        : 'bg-white border-amber-200 text-amber-900'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={`${inp} flex-1 py-2 text-sm font-mono`}
                  value={customCombo}
                  onChange={(e) => setCustomCombo(e.target.value.toUpperCase())}
                  placeholder="Custom (e.g. ABC)"
                  maxLength={12}
                />
                <button type="button" onClick={addCustomCombo} className="px-4 py-2 rounded-xl bg-amber-200 text-amber-900 text-xs font-bold">
                  Add
                </button>
              </div>
              {combinations.length > 0 && (
                <p className="text-[11px] text-amber-800">
                  Selected:{' '}
                  <span className="font-mono font-bold">{combinations.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          {hasTvet && (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-900">TVET trades / programs</p>
              <p className="text-[10px] text-amber-800">Select all that apply, or add custom trades</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_TVET_TRADES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTrade(t)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border text-left max-w-full ${
                      tvetTrades.includes(t)
                        ? 'bg-[#1F2937] text-amber-300 border-[#1F2937]'
                        : 'bg-white border-amber-200 text-amber-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={`${inp} flex-1 py-2 text-sm`}
                  value={customTrade}
                  onChange={(e) => setCustomTrade(e.target.value)}
                  placeholder="Custom trade (e.g. Multimedia Production)"
                />
                <button
                  type="button"
                  onClick={addCustomTrade}
                  className="px-4 py-2 rounded-xl bg-amber-200 text-amber-900 text-xs font-bold shrink-0"
                >
                  Add
                </button>
              </div>
              {tvetTrades.length > 0 && (
                <p className="text-[11px] text-amber-800">
                  Selected:{' '}
                  <span className="font-bold">{tvetTrades.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#F5B800] to-amber-500 text-white font-black text-sm shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <School className="w-5 h-5" />}
            Save school shell
          </button>

          <p className="text-[10px] text-center text-amber-700 leading-relaxed">
            This creates a pending school without login credentials. Schools can complete registration publicly by
            location, then fill contact and manager details.
          </p>
        </form>
      </div>
    </div>
  );
}
