// ================================================================
// requirement_prices_list.jsx — Super Admin: browse schools by location,
// then Babyeyi submissions per school, view requirements + prices + total.
// Design: Montserrat, #FEBF10, Tailwind, mobile responsive.
// ================================================================
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Loader2,
  Filter,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  ZoomIn,
  Search,
  Save,
  DollarSign,
  FileText,
  Home,
  Menu,
  Building2,
  ChevronRight,
  MapPin,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const API = `${API_BASE}/api`;
const axCfg = { headers: { 'Content-Type': 'application/json' }, withCredentials: true };
const ACCENT = '#FEBF10';

function absAssetUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return '';
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

const Toast = ({ toasts, remove }) => (
  <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[300] space-y-2 pointer-events-none">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-xl border
          ${t.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : t.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}
      >
        {t.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : t.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : null}
        <p className="flex-1 text-sm font-medium">{t.message}</p>
        <button type="button" onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 p-1">
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
  </div>
);

export default function RequirementPricesList() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [options, setOptions] = useState({ districts: [], sectors: [], academicYears: [], terms: [], classes: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [babyeyiRows, setBabyeyiRows] = useState([]);
  const [loadingBabyeyi, setLoadingBabyeyi] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPayload, setDetailPayload] = useState(null);

  const [babyeyiQuery, setBabyeyiQuery] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const [detailUnitEdits, setDetailUnitEdits] = useState({});
  const [savingDetailPrices, setSavingDetailPrices] = useState(false);

  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true);
      try {
        const res = await axios.get(`${API}/requirement-prices/options`, axCfg);
        if (res.data.success && res.data.data) {
          setOptions({
            districts: res.data.data.districts || [],
            sectors: res.data.data.sectors || [],
            academicYears: res.data.data.academicYears || [],
            terms: res.data.data.terms || [],
            classes: res.data.data.classes || [],
          });
        }
      } catch (err) {
        addToast(err.response?.data?.message || 'Failed to load options', 'error');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const findSchools = async () => {
    setLoadingSchools(true);
    setSchools([]);
    setSelectedSchool(null);
    setBabyeyiRows([]);
    try {
      const params = {};
      if (district) params.district = district;
      if (sector) params.sector = sector;
      const res = await axios.get(`${API}/requirement-prices/browse/schools`, { ...axCfg, params });
      if (res.data.success) setSchools(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load schools', 'error');
      setSchools([]);
    } finally {
      setLoadingSchools(false);
    }
  };

  const openSchool = async (school) => {
    setSelectedSchool(school);
    setBabyeyiQuery('');
    setBabyeyiRows([]);
    setLoadingBabyeyi(true);
    try {
      const res = await axios.get(`${API}/requirement-prices/browse/school-babyeyi`, {
        ...axCfg,
        params: { school_id: school.id },
      });
      if (res.data.success) setBabyeyiRows(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load Babyeyi list', 'error');
    } finally {
      setLoadingBabyeyi(false);
    }
  };

  const filteredBabyeyi = useMemo(() => {
    const q = babyeyiQuery.trim().toLowerCase();
    if (!q) return babyeyiRows;
    return babyeyiRows.filter((row) => {
      const hay = [row.academic_year, row.term, row.class_name, row.status, String(row.id)]
        .map((x) => String(x || '').toLowerCase())
        .join(' ');
      return hay.includes(q);
    });
  }, [babyeyiRows, babyeyiQuery]);

  const openDetail = async (babyeyiId) => {
    setDetailOpen(true);
    setDetailPayload(null);
    setDetailUnitEdits({});
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API}/requirement-prices/browse/babyeyi-detail/${babyeyiId}`, axCfg);
      if (res.data.success) setDetailPayload(res.data.data);
      else addToast(res.data.message || 'Failed to load detail', 'error');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const reqs = detailPayload?.requirements;
    if (!reqs || !Array.isArray(reqs)) return;
    const init = {};
    reqs.forEach((r) => {
      const id = r.babyeyi_requirement_id;
      if (id == null) return;
      const u = r.unit_price_rwf ?? r.unit_price ?? 0;
      init[id] = u === '' || u == null ? '' : String(u);
    });
    setDetailUnitEdits(init);
  }, [detailPayload]);

  const saveDetailPrices = useCallback(async () => {
    const babyeyi = detailPayload?.babyeyi;
    const reqs = detailPayload?.requirements;
    if (!babyeyi?.id || !reqs?.length) return;
    setSavingDetailPrices(true);
    try {
      const prices = reqs.map((r) => {
        const id = r.babyeyi_requirement_id;
        const raw = detailUnitEdits[id];
        const n = raw === '' || raw == null ? 0 : parseFloat(raw);
        return {
          requirement_id: id,
          price: Number.isFinite(n) ? n : 0,
        };
      });
      await axios.post(
        `${API}/requirement-prices`,
        {
          academic_year: babyeyi.academic_year,
          school_id: babyeyi.school_id,
          term: babyeyi.term,
          class_id: babyeyi.class_name,
          prices,
        },
        axCfg
      );
      addToast('Unit prices saved to the database.', 'success');
      const res = await axios.get(`${API}/requirement-prices/browse/babyeyi-detail/${babyeyi.id}`, axCfg);
      if (res.data.success) setDetailPayload(res.data.data);
      if (selectedSchool?.id) {
        try {
          const br = await axios.get(`${API}/requirement-prices/browse/school-babyeyi`, {
            ...axCfg,
            params: { school_id: selectedSchool.id },
          });
          if (br.data.success) setBabyeyiRows(Array.isArray(br.data.data) ? br.data.data : []);
        } catch (_) {}
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save prices', 'error');
    } finally {
      setSavingDetailPrices(false);
    }
  }, [detailPayload, detailUnitEdits, selectedSchool?.id]);

  const selectClass = `w-full bg-white border-2 rounded-xl px-3 py-2.5 text-sm font-medium
    focus:outline-none focus:ring-2 focus:ring-amber-200 border-amber-200 focus:border-[#FEBF10]`;

  const PricingSidebar = () => (
    <nav className="flex flex-col gap-1 p-3">
      <button
        type="button"
        onClick={() => { navigate('/superadmin/dashboard'); setSidebarOpen(false); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-100"
      >
        <Home className="w-4 h-4" /> Back to Dashboard
      </button>
      <div className="my-2 border-t border-amber-200" />
      <p className="px-3 text-[10px] font-bold text-amber-600 uppercase tracking-widest">Pricing</p>
      <button
        type="button"
        onClick={() => { navigate('/manage-requirements-prices'); setSidebarOpen(false); }}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-700 hover:bg-amber-100"
      >
        <DollarSign className="w-4 h-4" /> Catalog prices
      </button>
      <button
        type="button"
        onClick={() => setSidebarOpen(false)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: ACCENT }}
      >
        <FileText className="w-4 h-4" /> Browse &amp; view
      </button>
    </nav>
  );

  const lines = detailPayload?.requirements || [];
  const meta = detailPayload?.babyeyi;

  const { displayLines, reqTotal } = useMemo(() => {
    if (!lines.length) {
      return { displayLines: [], reqTotal: 0 };
    }
    let total = 0;
    const displayLines = lines.map((r) => {
      const id = r.babyeyi_requirement_id;
      const raw = id != null ? detailUnitEdits[id] : undefined;
      let unit = raw !== undefined && raw !== '' ? parseFloat(raw) : Number(r.unit_price_rwf ?? r.unit_price ?? 0);
      if (!Number.isFinite(unit)) unit = 0;
      const qty = r.quantity_value != null ? Number(r.quantity_value) : 1;
      const q = Number.isFinite(qty) && qty > 0 ? qty : 1;
      const lineTotal = Math.round(unit * q * 100) / 100;
      total += lineTotal;
      return { ...r, _displayUnit: unit, _displayLine: lineTotal };
    });
    return { displayLines, reqTotal: Math.round(total * 100) / 100 };
  }, [lines, detailUnitEdits]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50/50 flex" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <aside className="hidden lg:flex flex-col w-56 border-r-2 border-amber-100 fixed left-0 top-0 h-full z-20 bg-white/98 shadow-lg">
        <div className="px-4 py-5 border-b-2 border-amber-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl" style={{ backgroundColor: ACCENT }}><FileText className="w-5 h-5 text-white" /></div>
            <h1 className="text-sm font-black text-gray-900">Pricing</h1>
          </div>
        </div>
        <PricingSidebar />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-gray-900/40 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="w-72 h-full bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b-2 border-amber-100">
              <h2 className="font-bold text-gray-900">Navigation</h2>
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-amber-50"><X className="w-5 h-5" /></button>
            </div>
            <PricingSidebar />
          </div>
        </div>
      )}

      <div className="flex-1 lg:ml-56">
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b-2 border-amber-100 shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-amber-700 hover:bg-amber-100" aria-label="Menu">
              <Menu className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => navigate('/superadmin/dashboard')} className="hidden lg:flex p-2 rounded-xl text-amber-700 hover:bg-amber-100" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-gray-900">Schools &amp; Babyeyi requirements</h1>
              <p className="text-xs text-amber-700/80">Find schools, open one, then search Babyeyi by class, year, or term. View shows each requirement line, price, and total.</p>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6 pb-24 space-y-6">
          <section className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm p-4 sm:p-6">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Find schools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> District
                </label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className={selectClass} disabled={loadingOptions}>
                  <option value="">All districts</option>
                  {options.districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-800 uppercase mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> Sector
                </label>
                <select value={sector} onChange={(e) => setSector(e.target.value)} className={selectClass} disabled={loadingOptions}>
                  <option value="">All sectors</option>
                  {options.sectors.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={findSchools}
              disabled={loadingSchools || loadingOptions}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg disabled:opacity-60"
              style={{ backgroundColor: ACCENT }}
            >
              {loadingSchools ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search schools
            </button>
            <p className="mt-2 text-[11px] text-gray-500">Leave both empty to list all active schools (may be long).</p>
          </section>

          <section className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm p-4 sm:p-6">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Schools
            </h2>
            {loadingSchools && (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
            )}
            {!loadingSchools && schools.length === 0 && (
              <p className="text-sm text-gray-500 py-6 text-center">Run a search to load schools.</p>
            )}
            {!loadingSchools && schools.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {schools.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openSchool(s)}
                    className={`text-left rounded-2xl border-2 p-4 transition-all hover:shadow-md ${
                      selectedSchool?.id === s.id ? 'border-amber-400 bg-amber-50' : 'border-amber-100 bg-white'
                    }`}
                  >
                    <p className="font-bold text-gray-900">{s.school_name || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.district || '—'} · {s.sector || '—'}</p>
                    <p className="text-[11px] text-amber-700 font-semibold mt-2 flex items-center gap-1">
                      {s.babyeyi_count || 0} Babyeyi <ChevronRight className="w-3 h-3" />
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedSchool && (
            <section className="bg-white rounded-2xl border-2 border-amber-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100 bg-amber-50/50 space-y-3">
                <div>
                  <h2 className="text-sm font-bold text-amber-900">
                    Babyeyi for: {selectedSchool.school_name}
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Totals are estimated as <span className="font-semibold text-amber-800">quantity × unit price</span> per line (unit price from Super Admin catalog default or overrides). Search filters this list.
                  </p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={babyeyiQuery}
                    onChange={(e) => setBabyeyiQuery(e.target.value)}
                    placeholder="Search Babyeyi (e.g. S2, 2025, Term 1)…"
                    className="w-full rounded-xl border-2 border-amber-200 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-[#FEBF10]"
                  />
                </div>
              </div>
              {loadingBabyeyi && (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
              )}
              {!loadingBabyeyi && babyeyiRows.length === 0 && (
                <p className="text-sm text-gray-500 py-8 text-center px-4">No Babyeyi documents for this school yet.</p>
              )}
              {!loadingBabyeyi && babyeyiRows.length > 0 && filteredBabyeyi.length === 0 && (
                <p className="text-sm text-amber-700 py-8 text-center px-4">No Babyeyi match your search. Clear the search box or try other keywords.</p>
              )}
              {!loadingBabyeyi && filteredBabyeyi.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-amber-100 bg-amber-50/80 text-left text-xs font-bold text-amber-800 uppercase">
                        <th className="py-3 px-3">Year</th>
                        <th className="py-3 px-3">Term</th>
                        <th className="py-3 px-3">Class</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-right">Est. total (qty×price)</th>
                        <th className="py-3 px-3 w-28"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBabyeyi.map((row) => (
                        <tr key={row.id} className="border-b border-amber-50 hover:bg-amber-50/40">
                          <td className="py-2.5 px-3 font-medium">{row.academic_year}</td>
                          <td className="py-2.5 px-3">{row.term}</td>
                          <td className="py-2.5 px-3 font-semibold">{row.class_name}</td>
                          <td className="py-2.5 px-3 text-xs">{row.status}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                            {Number(row.requirements_price_total || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => openDetail(row.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 hover:bg-amber-200"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4" onClick={() => { setDetailOpen(false); setDetailPayload(null); setDetailUnitEdits({}); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start p-4 border-b border-amber-100 shrink-0 gap-2">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Requirements &amp; prices</h3>
                {meta && (
                  <p className="text-xs text-gray-600 mt-1">
                    {meta.school_name} · {meta.class_name} · {meta.term} · {meta.academic_year}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => { setDetailOpen(false); setDetailPayload(null); setDetailUnitEdits({}); }} className="p-2 rounded-lg hover:bg-gray-100 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
              ) : displayLines.length === 0 ? (
                <p className="text-sm text-gray-500">No requirement lines for this Babyeyi.</p>
              ) : (
                <>
                  <p className="text-[11px] text-gray-500 mb-3">
                    Edit unit price (RWF) per line and save — values are stored in <span className="font-semibold">requirement_prices</span> for this Babyeyi. Line total updates as you type. Catalog images still match by item name.
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-amber-100 text-left">
                        <th className="py-2 font-bold text-amber-800 text-xs uppercase w-24">Catalog</th>
                        <th className="py-2 font-bold text-amber-800 text-xs uppercase min-w-[7rem]">Item</th>
                        <th className="py-2 font-bold text-amber-800 text-xs uppercase text-right w-16">Qty</th>
                        <th className="py-2 font-bold text-amber-800 text-xs uppercase text-right w-24">Unit (RWF)</th>
                        <th className="py-2 font-bold text-amber-800 text-xs uppercase text-right w-28">Line (RWF)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayLines.map((r, i) => (
                        <tr key={r.babyeyi_requirement_id || i} className="border-b border-amber-50">
                          <td className="py-2 pr-2 align-middle w-24">
                            {r.catalog_image_url ? (
                              <div className="flex items-center gap-1">
                                <img
                                  src={absAssetUrl(r.catalog_image_url)}
                                  alt=""
                                  className="w-12 h-12 object-contain rounded-lg border border-amber-100 bg-amber-50/50"
                                />
                                <button
                                  type="button"
                                  title="View full image"
                                  onClick={() => setPreviewImage(absAssetUrl(r.catalog_image_url))}
                                  className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 shrink-0"
                                >
                                  <ZoomIn className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-2 align-top">
                            <span className="font-medium text-gray-900">{r.requirement_name}</span>
                            {r.description ? <span className="block text-[10px] text-gray-500">{r.description}</span> : null}
                          </td>
                          <td className="py-2 text-right text-gray-800 tabular-nums">
                            {r.quantity != null && String(r.quantity).trim() !== ''
                              ? (
                                <span title={`Parsed for total: ${r.quantity_value ?? '—'}`}>
                                  {String(r.quantity)}
                                  {r.quantity_value != null && Number(r.quantity_value) !== 1 ? (
                                    <span className="block text-[10px] text-gray-400">×{r.quantity_value}</span>
                                  ) : null}
                                </span>
                              )
                              : <span className="text-gray-400">1</span>}
                          </td>
                          <td className="py-2 text-right align-middle">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="w-full max-w-[7.5rem] ml-auto block rounded-lg border-2 border-amber-200 px-2 py-1.5 text-sm font-semibold text-gray-900 tabular-nums text-right focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-[#FEBF10]"
                              value={detailUnitEdits[r.babyeyi_requirement_id] ?? ''}
                              onChange={(e) =>
                                setDetailUnitEdits((prev) => ({
                                  ...prev,
                                  [r.babyeyi_requirement_id]: e.target.value,
                                }))
                              }
                              aria-label={`Unit price RWF for ${r.requirement_name || 'item'}`}
                            />
                          </td>
                          <td className="py-2 text-right font-semibold text-amber-700 tabular-nums">
                            {Number(r._displayLine ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 pt-4 border-t-2 border-amber-200 flex justify-between items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">Total (all lines)</span>
                    <span className="text-lg font-black" style={{ color: ACCENT }}>{Number(reqTotal).toLocaleString()} RWF</span>
                  </div>
                </>
              )}
            </div>
            <div className="p-4 border-t border-amber-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => { setDetailOpen(false); setDetailPayload(null); setDetailUnitEdits({}); }}
                className="flex-1 py-2.5 rounded-xl border-2 border-amber-200 font-bold text-amber-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={saveDetailPrices}
                disabled={savingDetailPrices || detailLoading || !meta || displayLines.length === 0}
                className="flex-1 py-2.5 rounded-xl font-black text-sm text-white shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: ACCENT }}
              >
                {savingDetailPrices ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save unit prices
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[400] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
          role="presentation"
        >
          <button
            type="button"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Requirement"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <Toast toasts={toasts} remove={removeToast} />
    </div>
  );
}
