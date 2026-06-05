import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, Search, CheckCircle, Paperclip, Loader2 } from 'lucide-react';
import {
  HrPageLayout, HrPanel, HrBtnPrimary, HrSearch, HrBadge, HrTable, HrBtnGhost, HrBtnOutline, HrPagination, HrToast,
} from './hrUi';
import hrService from '../../services/hrService';
import { useNavigate } from 'react-router-dom';
import { h } from '../../utils/href';

const qualLevels = ['A2', 'Diploma', "Bachelor's Degree", "Master's Degree", 'PhD', 'Professional Cert'];
const levelChip = {
  A2: 'bg-slate-100 text-slate-600',
  Diploma: 'bg-sky-50 text-sky-700',
  "Bachelor's Degree": 'bg-amber-50 text-amber-800',
  "Master's Degree": 'bg-violet-50 text-violet-700',
  PhD: 'bg-red-50 text-red-700',
  'Professional Cert': 'bg-emerald-50 text-emerald-700',
};

export default function Qualifications() {
  const navigate = useNavigate();
  const [qualData, setQualData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success', duration: 2400 });
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const loadQualifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await hrService.getDirectory();
      if (!res?.success) throw new Error(res?.message || 'Failed to load qualifications');
      const rows = [];
      (res.data || []).forEach((e) => {
        const qualifications = e.hr_profile?.qualifications || [];
        qualifications.forEach((q, idx) => {
          if (!q.level && !q.institution) return;
          rows.push({
            emp: e.name,
            id: e.employee_id || `EMP${e.id}`,
            userId: e.id,
            qual: q.level || 'Qualification',
            field: q.field || '—',
            inst: q.institution || '—',
            year: q.year || '—',
            grade: q.grade || '—',
            verified: Boolean(q.verified || q.document_verified),
            key: `${e.id}-${idx}`,
          });
        });
      });
      setQualData(rows);
    } catch (err) {
      setError(err?.message || 'Failed to load qualifications');
      setQualData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQualifications(); }, [loadQualifications]);

  const filtered = qualData.filter(
    (q) =>
      (filter === 'All' || q.qual === filter) &&
      (q.emp.toLowerCase().includes(search.toLowerCase()) || q.field.toLowerCase().includes(search.toLowerCase()))
  );
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );
  useEffect(() => { setPage(1); }, [filter, search]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const distrib = useMemo(
    () => qualLevels.map((l) => ({ level: l, count: qualData.filter((q) => q.qual === l).length })),
    [qualData]
  );

  const kpiTiles = [
    { icon: GraduationCap, label: 'Records', value: String(qualData.length), subValue: 'Qualification entries' },
    { icon: GraduationCap, label: 'Verified', value: String(qualData.filter((q) => q.verified).length), subValue: 'Confirmed credentials' },
  ];

  return (
    <HrPageLayout
      title="Staff Qualifications"
      subtitle="Academic credentials, verification, and certificates"
      HeroIcon={GraduationCap}
      kpiTiles={kpiTiles}
    >
      <HrToast toast={toast} onClose={() => setToast({ message: '', type: 'success', duration: 0 })} />
      {error ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p> : null}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <HrSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee or field…" className="pl-9" />
        </div>
        <HrBtnPrimary icon={Plus} onClick={() => setToast({ message: 'Add/edit qualifications from employee profile edit wizard.', type: 'success', duration: 2600 })}>Add qualification</HrBtnPrimary>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {distrib.map((d) => (
          <HrPanel key={d.level} className="p-3 text-center">
            <p className="text-xl text-[#000435] tabular-nums" style={{ fontWeight: 500 }}>{d.count}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{d.level}</p>
          </HrPanel>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {['All', ...qualLevels].map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setFilter(l)}
            className={`px-3 py-2 rounded-xl text-xs transition-all ${
              filter === l ? 'bg-[#c87800] text-white' : 'bg-white border border-slate-200 text-slate-500'
            }`}
            style={{ fontWeight: 500 }}
          >
            {l}
          </button>
        ))}
      </div>

      <HrTable columns={['Employee', 'Qualification', 'Field', 'Institution', 'Year', 'Grade', 'Verified', 'Actions']}>
        {loading ? (
          <tr>
            <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">
              <Loader2 size={18} className="inline-block animate-spin mr-2" /> Loading qualifications...
            </td>
          </tr>
        ) : paginated.map((q) => (
          <tr key={q.id + q.qual} className="hover:bg-slate-50/80">
            <td className="px-4 py-3">
              <p className="text-xs text-[#000435]" style={{ fontWeight: 500 }}>{q.emp}</p>
              <p className="text-slate-400 text-[10px]">{q.id}</p>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${levelChip[q.qual] || 'bg-slate-100 text-slate-600'}`} style={{ fontWeight: 500 }}>
                {q.qual}
              </span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-600">{q.field}</td>
            <td className="px-4 py-3 text-xs text-slate-600">{q.inst}</td>
            <td className="px-4 py-3 text-xs text-slate-600">{q.year}</td>
            <td className="px-4 py-3 text-xs text-slate-600">{q.grade}</td>
            <td className="px-4 py-3">
              {q.verified ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                  <CheckCircle size={14} strokeWidth={1.75} /> Verified
                </span>
              ) : (
                <HrBtnOutline className="!py-1 !px-2 !text-[10px]">Verify</HrBtnOutline>
              )}
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-1">
                <HrBtnGhost onClick={() => navigate(h(`/hr/directory/${q.userId}`))}>View</HrBtnGhost>
                <HrBtnGhost onClick={() => navigate(h(`/hr/directory/${q.userId}/edit`))}><Paperclip size={14} strokeWidth={1.75} /></HrBtnGhost>
              </div>
            </td>
          </tr>
        ))}
      </HrTable>
      <HrPagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </HrPageLayout>
  );
}
