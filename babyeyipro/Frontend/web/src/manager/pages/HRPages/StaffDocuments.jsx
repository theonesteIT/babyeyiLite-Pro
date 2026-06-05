import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FolderOpen, FileText, FileType, Image, Paperclip, Loader2, Eye, UserCheck, UserX, CheckCircle2,
} from 'lucide-react';
import {
  HrPageLayout, HrPanel, HrSearch, HrBadge, statusToBadge, HrPagination, HrToast,
} from './hrUi';
import { h } from '../../utils/href';
import { useNavigate } from 'react-router-dom';
import hrService from '../../services/hrService';
import { normalizeHrDocument, resolveHrDocumentUrl } from './hrConstants';

const DOC_LABELS = {
  cv: 'CV',
  application_letter: 'Application Letter',
  national_id_copy: 'National ID',
  degree: 'Degree',
  contract: 'Contract',
  passport_copy: 'Passport',
  certificates: 'Certificates',
  other: 'Other',
};

const REQUIRED_KEYS = ['cv', 'national_id_copy', 'contract'];

function fileIcon(filename) {
  if (filename.endsWith('.pdf')) return FileText;
  if (filename.endsWith('.docx') || filename.endsWith('.doc')) return FileType;
  if (filename.endsWith('.jpg') || filename.endsWith('.png')) return Image;
  return Paperclip;
}

export default function StaffDocuments() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success', duration: 2400 });
  const [catFilter, setCatFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [staffPage, setStaffPage] = useState(1);
  const [docPage, setDocPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await hrService.getDirectory();
      if (!res?.success) throw new Error(res?.message || 'Failed to load documents');
      const list = [];
      (res.data || []).forEach((e) => {
        const docs = e.hr_profile?.documents || {};
        Object.entries(docs).forEach(([key, value], idx) => {
          const doc = normalizeHrDocument(value);
          if (!doc.name) return;
          list.push({
            id: `${e.id}-${key}-${idx}`,
            employeeId: e.id,
            emp: e.name,
            category: DOC_LABELS[key] || key.replace(/_/g, ' '),
            filename: doc.name,
            status: doc.path ? 'Verified' : 'Pending',
            key,
            url: resolveHrDocumentUrl(doc),
          });
        });
      });
      setEmployees(res.data || []);
      setDocuments(list);
    } catch (err) {
      setError(err?.message || 'Failed to load documents');
      setEmployees([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const docCategories = useMemo(
    () => ['All', ...Array.from(new Set(documents.map((d) => d.category))).sort()],
    [documents]
  );

  const staffDocs = useMemo(
    () => employees
      .map((e) => {
        const docs = e.hr_profile?.documents || {};
        const uploaded = Object.entries(docs)
          .map(([key, value]) => ({ key, doc: normalizeHrDocument(value) }))
          .filter((entry) => entry.doc?.name);
        const missing = REQUIRED_KEYS.filter((k) => !uploaded.some((u) => u.key === k));
        return {
          employeeId: e.id,
          emp: e.name,
          empId: e.employee_id || `EMP${e.id}`,
          uploadedCount: uploaded.length,
          uploaded,
          missing,
        };
      })
      .filter((row) => row.emp.toLowerCase().includes(search.toLowerCase()) || row.empId.toLowerCase().includes(search.toLowerCase())),
    [employees, search]
  );

  const filtered = documents.filter(
    (d) =>
      (catFilter === 'All' || d.category === catFilter) &&
      (d.emp.toLowerCase().includes(search.toLowerCase())
        || d.category.toLowerCase().includes(search.toLowerCase())
        || d.filename.toLowerCase().includes(search.toLowerCase()))
  );
  const staffPageSize = 6;
  const docPageSize = 9;
  const totalStaffPages = Math.max(1, Math.ceil(staffDocs.length / staffPageSize));
  const totalDocPages = Math.max(1, Math.ceil(filtered.length / docPageSize));
  const paginatedStaff = useMemo(
    () => staffDocs.slice((staffPage - 1) * staffPageSize, staffPage * staffPageSize),
    [staffDocs, staffPage]
  );
  const paginatedDocs = useMemo(
    () => filtered.slice((docPage - 1) * docPageSize, docPage * docPageSize),
    [filtered, docPage]
  );

  useEffect(() => { setStaffPage(1); setDocPage(1); }, [search, catFilter]);
  useEffect(() => { if (staffPage > totalStaffPages) setStaffPage(totalStaffPages); }, [staffPage, totalStaffPages]);
  useEffect(() => { if (docPage > totalDocPages) setDocPage(totalDocPages); }, [docPage, totalDocPages]);

  const stats = {
      total: documents.length || 0,
    verified: documents.filter((d) => d.status === 'Verified').length,
    pending: documents.filter((d) => d.status === 'Pending').length,
    missingStaff: staffDocs.filter((s) => s.missing.length > 0).length,
  };

  const kpiTiles = [
    { icon: FolderOpen, label: 'Total docs', value: String(stats.total), subValue: 'In repository' },
    { icon: FolderOpen, label: 'Verified', value: String(stats.verified), subValue: 'Complete files' },
    { icon: FolderOpen, label: 'Pending', value: String(stats.pending), subValue: 'Awaiting review' },
    { icon: FolderOpen, label: 'Missing staff', value: String(stats.missingStaff), subValue: 'Require upload' },
  ];

  return (
    <HrPageLayout
      title="Staff Documents"
      subtitle="Secure document repository and compliance tracking"
      HeroIcon={FolderOpen}
      kpiTiles={kpiTiles}
    >
      <HrToast toast={toast} onClose={() => setToast({ message: '', type: 'success', duration: 0 })} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <HrSearch value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents…" className="flex-1" />
      </div>

      {error ? <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p> : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {paginatedStaff.map((staff) => (
          <HrPanel key={staff.employeeId} className="p-4 sm:p-5 border-slate-200/80">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[#000435]" style={{ fontWeight: 600 }}>{staff.emp}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{staff.empId}</p>
              </div>
              <HrBadge variant={staff.missing.length ? 'warning' : 'success'}>
                {staff.missing.length ? `${staff.missing.length} missing` : 'Complete'}
              </HrBadge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                <p className="text-[11px] text-slate-500">Uploaded</p>
                <p className="text-sm text-emerald-700 flex items-center gap-1" style={{ fontWeight: 600 }}><UserCheck size={13} />{staff.uploadedCount}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2">
                <p className="text-[11px] text-slate-500">Missing</p>
                <p className="text-sm text-amber-700 flex items-center gap-1" style={{ fontWeight: 600 }}><UserX size={13} />{staff.missing.length}</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[11px] text-slate-400 mb-1.5">Uploaded documents</p>
              <div className="flex flex-wrap gap-1.5">
                {staff.uploaded.length ? staff.uploaded.map((u) => (
                  <HrBadge key={`${staff.employeeId}-${u.key}`} variant="success">{DOC_LABELS[u.key] || u.key}</HrBadge>
                )) : <span className="text-xs text-slate-400">No documents uploaded</span>}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[11px] text-slate-400 mb-1.5">Missing required</p>
              <div className="flex flex-wrap gap-1.5">
                {staff.missing.length ? staff.missing.map((k) => (
                  <HrBadge key={`${staff.employeeId}-miss-${k}`} variant="danger">{DOC_LABELS[k] || k}</HrBadge>
                )) : <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} />All required docs present</span>}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
              <button type="button" onClick={() => navigate(h(`/hr/directory/${staff.employeeId}`))} className="flex-1 py-2 text-xs rounded-lg bg-slate-50 text-slate-600 hover:text-[#c87800] hover:bg-amber-50 transition-colors">View profile</button>
              <button type="button" onClick={() => { navigate(h(`/hr/directory/${staff.employeeId}/edit`)); setToast({ message: 'Open employee edit to upload/replace documents.', type: 'success', duration: 2200 }); }} className="flex-1 py-2 text-xs rounded-lg bg-slate-50 text-slate-600 hover:text-[#c87800] hover:bg-amber-50 transition-colors">Upload/replace</button>
            </div>
          </HrPanel>
        ))}
      </div>
      <HrPagination page={staffPage} totalPages={totalStaffPages} onPageChange={setStaffPage} />

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-1.5">
          {docCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              className={`px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-all ${
                catFilter === c ? 'bg-[#c87800] text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-[#c87800]/40'
              }`}
              style={{ fontWeight: 500 }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1">
        <p className="text-xs text-slate-400 mb-2">Document repository</p>
      </div>
      {loading ? (
        <div className="text-center py-16 text-slate-400"><Loader2 size={20} className="inline-block animate-spin mr-2" />Loading documents...</div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {paginatedDocs.map((doc) => {
          const Icon = fileIcon(doc.filename);
          return (
            <HrPanel key={doc.id} className="p-4 group hover:border-[#FEBF10]/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#c87800] flex items-center justify-center shrink-0">
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#000435] truncate" style={{ fontWeight: 500 }}>{doc.filename}</p>
                  <p className="text-slate-500 text-xs">{doc.emp}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <HrBadge variant="muted">{doc.category}</HrBadge>
                    <HrBadge variant={statusToBadge(doc.status)}>{doc.status}</HrBadge>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" onClick={() => navigate(h(`/hr/directory/${doc.employeeId}`))} className="flex-1 py-1.5 text-[10px] rounded-lg bg-slate-50 text-slate-500 hover:text-[#c87800] hover:bg-amber-50 transition-colors flex items-center justify-center gap-1" style={{ fontWeight: 500 }}><Eye size={12} /> Preview</button>
                {doc.url ? <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 py-1.5 text-[10px] rounded-lg bg-slate-50 text-slate-500 hover:text-[#c87800] hover:bg-amber-50 transition-colors text-center" style={{ fontWeight: 500 }}>Download</a> : null}
                <button type="button" onClick={() => navigate(h(`/hr/directory/${doc.employeeId}/edit`))} className="flex-1 py-1.5 text-[10px] rounded-lg bg-slate-50 text-slate-500 hover:text-[#c87800] hover:bg-amber-50 transition-colors" style={{ fontWeight: 500 }}>Replace</button>
              </div>
            </HrPanel>
          );
        })}
      </div>
      )}
      <HrPagination page={docPage} totalPages={totalDocPages} onPageChange={setDocPage} />
    </HrPageLayout>
  );
}
