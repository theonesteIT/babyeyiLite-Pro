import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Building2, ChevronDown, Loader2, MapPin, RefreshCw } from 'lucide-react';
import { api } from './smartAccessApi';

/**
 * Cascading Rwanda location + school picker for Smart Access (Super Admin scope).
 */
export default function SmartAccessSchoolToolbar({
  selectedSchoolId,
  onSchoolChange,
  /** When set (e.g. from `?school_id=`), hydrate maps + dropdowns for this school */
  presetSchoolId = null,
  /** Optional full row from parent (for banner when list is still loading) */
  activeSchool = null,
}) {
  const hydratingRef = useRef(false);
  const lastHydratedPresetRef = useRef(null);

  const presetNumeric = Number(presetSchoolId);
  const presetWantsHydration = Number.isFinite(presetNumeric) && presetNumeric > 0;

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [schools, setSchools] = useState([]);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [search, setSearch] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [error, setError] = useState('');

  const sel = useMemo(() => ({
    province, district, sector,
  }), [province, district, sector]);

  const loadProvinces = useCallback(async () => {
    setGeoLoading(true);
    setError('');
    try {
      const { data } = await api.get('/locations/provinces');
      setProvinces(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load provinces.');
      setProvinces([]);
    } finally {
      setGeoLoading(false);
    }
  }, []);

  useEffect(() => { loadProvinces(); }, [loadProvinces]);

  /** Deep-link / dashboard: resolve `school_id` without fighting cascade effects */
  useEffect(() => {
    const id = Number(presetSchoolId);
    if (!Number.isFinite(id) || id <= 0) {
      lastHydratedPresetRef.current = null;
      return undefined;
    }
    if (lastHydratedPresetRef.current === id) return undefined;

    let cancelled = false;
    (async () => {
      hydratingRef.current = true;
      setGeoLoading(true);
      setError('');
      try {
        const { data: sj } = await api.get(`/schools/${id}`);
        if (!sj.success || !sj.data || cancelled) {
          return;
        }
        const s = sj.data;
        const prov = String(s.province || '').trim();
        const dist = String(s.district || '').trim();
        const sec = String(s.sector || '').trim();

        const [pRes, dRes, secRes, schRes] = await Promise.all([
          api.get('/locations/provinces'),
          prov ? api.get('/locations/districts', { params: { province: prov } }) : Promise.resolve({ data: { data: [] } }),
          prov && dist ? api.get('/locations/sectors', { params: { province: prov, district: dist } }) : Promise.resolve({ data: { data: [] } }),
          prov && dist ? api.get('/schools', {
            params: {
              province: prov,
              district: dist,
              ...(sec ? { sector: sec } : {}),
              limit: 500,
              page: 1,
            },
          }) : Promise.resolve({ data: { data: [] } }),
        ]);
        if (cancelled) return;

        setProvinces(Array.isArray(pRes.data.data) ? pRes.data.data : []);
        setDistricts(Array.isArray(dRes.data.data) ? dRes.data.data : []);
        setSectors(Array.isArray(secRes.data.data) ? secRes.data.data : []);
        let schoolRows = Array.isArray(schRes.data.data) ? schRes.data.data : [];
        if (!schoolRows.some((r) => r.id === id)) {
          schoolRows = [...schoolRows, {
            id: s.id,
            school_name: s.school_name,
            school_code: s.school_code,
            province: prov,
            district: dist,
            sector: sec,
          }];
        }
        setSchools(schoolRows);

        setProvince(prov);
        setDistrict(dist);
        setSector(sec);
        setSearch('');

        onSchoolChange({
          id: s.id,
          school_name: s.school_name,
          school_code: s.school_code,
          province: prov,
          district: dist,
          sector: sec,
        });
        lastHydratedPresetRef.current = id;
      } catch (e) {
        if (!cancelled) {
          lastHydratedPresetRef.current = null;
          setError(e.response?.data?.message || 'Could not resolve school.');
          onSchoolChange(null);
        }
      } finally {
        hydratingRef.current = false;
        if (!cancelled) setGeoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      hydratingRef.current = false;
      const cur = Number(presetSchoolId);
      if (cur === id) lastHydratedPresetRef.current = null;
    };
  }, [presetSchoolId, onSchoolChange]);

  useEffect(() => {
    if (!province) {
      if (hydratingRef.current) return;
      if (presetWantsHydration && lastHydratedPresetRef.current !== presetNumeric) return;
      setDistricts([]);
      setDistrict('');
      setSectors([]);
      setSector('');
      setSchools([]);
      onSchoolChange(null);
      return;
    }
    if (hydratingRef.current) return;
    let off = false;
    (async () => {
      setGeoLoading(true);
      setError('');
      try {
        const { data } = await api.get('/locations/districts', {
          params: { province },
        });
        if (!off) {
          setDistricts(Array.isArray(data.data) ? data.data : []);
          setDistrict('');
          setSectors([]);
          setSector('');
          setSchools([]);
          onSchoolChange(null);
        }
      } catch (e) {
        if (!off) setError(e.response?.data?.message || 'Could not load districts.');
      } finally {
        if (!off) setGeoLoading(false);
      }
    })();
    return () => { off = true; };
  }, [province, onSchoolChange, presetWantsHydration, presetNumeric]);

  useEffect(() => {
    if (!province || !district) {
      if (hydratingRef.current) return;
      if (presetWantsHydration && lastHydratedPresetRef.current !== presetNumeric) return;
      setSectors([]);
      setSector('');
      setSchools([]);
      onSchoolChange(null);
      return;
    }
    if (hydratingRef.current) return;
    let off = false;
    (async () => {
      setGeoLoading(true);
      setError('');
      try {
        const { data } = await api.get('/locations/sectors', {
          params: { province, district },
        });
        if (!off) {
          setSectors(Array.isArray(data.data) ? data.data : []);
          setSector('');
          setSchools([]);
          onSchoolChange(null);
        }
      } catch (e) {
        if (!off) setError(e.response?.data?.message || 'Could not load sectors.');
      } finally {
        if (!off) setGeoLoading(false);
      }
    })();
    return () => { off = true; };
  }, [province, district, onSchoolChange, presetWantsHydration, presetNumeric]);

  useEffect(() => {
    if (!province || !district) {
      if (!hydratingRef.current && !(presetWantsHydration && lastHydratedPresetRef.current !== presetNumeric)) {
        setSchools([]);
      }
      return;
    }
    if (hydratingRef.current) return;
    let off = false;
    (async () => {
      setSchoolsLoading(true);
      setError('');
      try {
        const params = {
          province,
          district,
          limit: 500,
          page: 1,
        };
        if (sector) params.sector = sector;
        if (search.trim()) params.search = search.trim();
        const { data } = await api.get('/schools', { params });
        if (!off) setSchools(Array.isArray(data.data) ? data.data : []);
      } catch (e) {
        if (!off) setError(e.response?.data?.message || 'Could not load schools.');
      } finally {
        if (!off) setSchoolsLoading(false);
      }
    })();
    return () => { off = true; };
  }, [province, district, sector, search]);

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-amber-300/80 focus:border-amber-400';

  const onPickSchool = (e) => {
    const id = Number(e.target.value);
    if (!Number.isFinite(id) || id <= 0) {
      onSchoolChange(null);
      return;
    }
    const row = schools.find((s) => s.id === id);
    onSchoolChange(row || { id, school_name: 'School', province, district, sector });
  };

  const bannerSchool = useMemo(() => {
    if (activeSchool?.id && activeSchool.id === selectedSchoolId && activeSchool.school_name) return activeSchool;
    return schools.find((sch) => sch.id === selectedSchoolId) || null;
  }, [activeSchool, schools, selectedSchoolId]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/90 p-4 sm:p-6 shadow-lg shadow-slate-200/80">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#000435]/90 text-amber-300">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Scope</p>
            <p className="text-sm font-bold">Province → District → Sector → School</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            loadProvinces();
            setSearch('');
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
          Refresh geo
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Province</span>
          <div className="relative">
            <select
              className={`${inputCls} appearance-none pr-9`}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              disabled={geoLoading && provinces.length === 0}
            >
              <option value="">Select province</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">District</span>
          <div className="relative">
            <select
              className={`${inputCls} appearance-none pr-9`}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!province}
            >
              <option value="">{province ? 'Select district' : '—'}</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Sector</span>
          <div className="relative">
            <select
              className={`${inputCls} appearance-none pr-9`}
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              disabled={!district}
            >
              <option value="">All sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>
        <label className="block sm:col-span-2 xl:col-span-1">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">Filter name / code</span>
          <input
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Optional search…"
            disabled={!district}
          />
        </label>
        <label className="block sm:col-span-2 xl:col-span-2">
          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">School</span>
          <div className="relative">
            <select
              className={`${inputCls} appearance-none pr-10 font-bold`}
              value={selectedSchoolId || ''}
              onChange={onPickSchool}
              disabled={!district || schoolsLoading}
            >
              <option value="">
                {schoolsLoading ? 'Loading schools…' : district ? 'Choose a school…' : 'Select location first'}
              </option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.school_name}{s.school_code ? ` (${s.school_code})` : ''}
                </option>
              ))}
            </select>
            {schoolsLoading ? (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            ) : (
              <Building2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            )}
          </div>
        </label>
      </div>

      {bannerSchool?.school_name && (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50/90 border border-amber-100 px-4 py-2.5 text-xs font-semibold text-amber-950">
          <span className="font-black uppercase tracking-wider text-amber-800">Active:</span>
          {bannerSchool.school_name}
          <span className="text-amber-700/80 font-mono">{bannerSchool.school_code || ''}</span>
          <span className="text-amber-700/70">{[bannerSchool.sector || sel.sector, bannerSchool.district || sel.district].filter(Boolean).join(' · ')}</span>
        </p>
      )}
    </section>
  );
}
