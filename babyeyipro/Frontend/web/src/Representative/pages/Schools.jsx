import { useMemo, useState } from 'react';
import RepresentativeHeroShell from '../components/RepresentativeHeroShell';
import { RepSection, RepCardGrid, RepStatCard } from '../components/RepContentCard';
import { useRepresentativeData } from '../context/RepresentativeContext';
import { Building2, MapPin, PauseCircle, CheckCircle2, Loader2, Search, Star } from 'lucide-react';

export default function RepresentativeSchools() {
  const { schools, loading, activeSchoolId, setActiveSchoolId } = useRepresentativeData();
  const [filter, setFilter] = useState('');

  const filtered = useMemo(() => {
    if (!filter.trim()) return schools;
    const q = filter.trim().toLowerCase();
    return schools.filter((s) =>
      [s.school_name, s.school_code, s.district, s.province, s.sector]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [filter, schools]);

  const active = schools.filter((s) => String(s.status || '').toLowerCase() === 'active').length;
  const provinces = new Set(schools.map((s) => s.province).filter(Boolean)).size;

  return (
    <RepresentativeHeroShell
      eyebrow="Multi-school registry"
      title="Schools"
      subtitle="Switch between assigned schools, monitor status, and drill into operational areas."
      HeroIcon={Building2}
      kpiTiles={[
        { key: 't', label: 'Assigned to you', value: schools.length, icon: Building2 },
        { key: 'a', label: 'Active', value: active, icon: CheckCircle2 },
        { key: 's', label: 'Suspended', value: Math.max(0, schools.length - active), icon: PauseCircle },
        { key: 'p', label: 'Provinces', value: provinces, icon: MapPin },
      ]}
      pageBody={
        <>
          <RepSection
            title="Directory"
            action={
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  className="rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs font-medium outline-none focus:border-amber-400/50"
                  placeholder="Filter schools…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
            }
          >
            {loading ? (
              <div className="rounded-2xl border border-black/[0.06] bg-white p-8 text-center text-sm text-re-text-muted">
                <Loader2 className="mx-auto mb-2 animate-spin" size={20} /> Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-sm font-semibold text-amber-800">
                {schools.length === 0
                  ? "You don't have any schools assigned yet. Ask the Super Admin."
                  : 'No schools match your filter.'}
              </div>
            ) : (
              <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden shadow-sm ring-1 ring-black/[0.04] overflow-x-auto">
                <table className="min-w-[720px] w-full text-sm">
                  <thead>
                    <tr className="bg-[#000435] text-left text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400/95">
                      <th className="px-5 py-3.5">School</th>
                      <th className="px-5 py-3.5">Code</th>
                      <th className="px-5 py-3.5">District</th>
                      <th className="px-5 py-3.5">Province</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06]">
                    {filtered.map((s) => {
                      const isActive = Number(activeSchoolId) === Number(s.id);
                      return (
                        <tr key={s.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-[#000435]">
                            <div className="flex items-center gap-2">
                              {s.school_name}
                              {s.is_primary ? <Star size={12} className="text-amber-500" /> : null}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-re-text-muted text-xs">{s.school_code || '—'}</td>
                          <td className="px-5 py-3.5 text-re-text-muted text-xs">{s.district || '—'}</td>
                          <td className="px-5 py-3.5 text-re-text-muted text-xs">{s.province || '—'}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                String(s.status || '').toLowerCase() === 'active'
                                  ? 'bg-emerald-50 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {s.status || 'unknown'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setActiveSchoolId(isActive ? null : s.id)}
                              className={`text-[11px] font-bold uppercase tracking-wide rounded-lg px-3 py-1.5 ${
                                isActive
                                  ? 'bg-amber-400 text-[#000435]'
                                  : 'bg-[#000435] text-amber-300 hover:bg-[#001a5c]'
                              }`}
                            >
                              {isActive ? 'Focused' : 'Focus'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </RepSection>

          <RepSection title="At a glance">
            <RepCardGrid>
              <RepStatCard label="Coverage" value={`${schools.length} school${schools.length === 1 ? '' : 's'}`} hint="Total under your control" />
              <RepStatCard label="Active" value={active} hint="School access status = active" />
              <RepStatCard label="Suspended" value={Math.max(0, schools.length - active)} hint="Need attention" tone="warn" />
            </RepCardGrid>
          </RepSection>
        </>
      }
    />
  );
}
