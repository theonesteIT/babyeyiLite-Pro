import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Archive, BookOpen, Calendar, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardList, Clock, Edit3, GraduationCap, History, LayoutGrid, Loader2, MoreHorizontal,
  Plus, RefreshCw, Search, Trash2, User, Users, X,
} from 'lucide-react';
import api from '../services/api';
import TeacherOrangeHero from '../../shared/components/TeacherOrangeHero';
import { h } from '../utils/href';

function fmtTeacher(t) {
  if (!t) return '—';
  return `${t.first_name || ''} ${t.last_name || ''}`.trim() || t.email || 'Teacher';
}

function teacherInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function RowActionsMenu({ row, onHistory, onEdit, onSupersede, onArchive, onRemove }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    fn(row);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="dos-table-action w-9 h-9"
        aria-label="Row actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="dos-row-menu" role="menu">
          <button type="button" className="dos-row-menu-item" onClick={() => run(onHistory)}>
            <History size={14} className="text-re-text-muted" /> History
          </button>
          {row.status === 'active' && (
            <>
              <button type="button" className="dos-row-menu-item" onClick={() => run(onEdit)}>
                <Edit3 size={14} className="text-re-text-muted" /> Edit
              </button>
              <button type="button" className="dos-row-menu-item" onClick={() => run(onSupersede)}>
                <RefreshCw size={14} style={{ color: AMBER }} /> Supersede teacher
              </button>
              <button type="button" className="dos-row-menu-item" onClick={() => run(onArchive)}>
                <Archive size={14} className="text-re-text-muted" /> Archive
              </button>
            </>
          )}
          <button type="button" className="dos-row-menu-item dos-row-menu-item--danger" onClick={() => run(onRemove)}>
            <Trash2 size={14} /> Remove
          </button>
        </div>
      )}
    </div>
  );
}

const classLabel = (row) => [row?.group_name, row?.stream_name, row?.combination].map((s) => String(s || '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

const STATUS_BADGE = {
  active: 'dos-badge--status-active',
  archived: 'dos-badge--status-archived',
};

const EMPTY_FORM = {
  class_names: [],
  subject_name: '',
  teacher_user_id: '',
  academic_year: '',
  term: '',
  periods_per_week: 3,
  room: '',
};

const NAVY = '#000435';
const AMBER = '#c87800';
const GOLD = '#FEBF10';
const PAGE_SIZE_OPTIONS = [10, 20, 50];

function SearchField({ value, onChange, placeholder }) {
  return (
    <div className="dos-search-wrap">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="dos-search-input"
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="dos-search-clear"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}

function PaginationBar({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  const pageNums = useMemo(() => {
    const pages = [];
    const windowSize = 5;
    let lo = Math.max(1, safePage - Math.floor(windowSize / 2));
    let hi = Math.min(totalPages, lo + windowSize - 1);
    lo = Math.max(1, hi - windowSize + 1);
    for (let i = lo; i <= hi; i += 1) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  return (
    <div className="dos-pagination">
      <p className="text-[11px] text-re-text-muted">
        {totalItems === 0 ? (
          'No results'
        ) : (
          <>
            Showing <span className="font-semibold text-[#000435]">{start}–{end}</span> of{' '}
            <span className="font-semibold text-[#000435]">{totalItems}</span>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[10px] text-re-text-muted">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="dos-filter-input h-8 py-0 min-w-[4.5rem]"
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="dos-pagination-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        {pageNums.map((n) => (
          <button
            key={n}
            type="button"
            className={`dos-pagination-btn ${n === safePage ? 'dos-pagination-btn--active' : ''}`}
            onClick={() => onPageChange(n)}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          className="dos-pagination-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label className="text-[10px] font-medium uppercase tracking-widest text-re-text-muted block mb-1.5">
      {children}{required && <span className="text-[#c87800] ml-0.5">*</span>}
    </label>
  );
}

function FilterToolbar({
  activeTab,
  search,
  onSearchChange,
  overviewSearch,
  onOverviewSearchChange,
  academicYear,
  onAcademicYearChange,
  yearOptions,
  term,
  onTermChange,
  terms,
  classFilter,
  onClassFilterChange,
  classFilterOptions,
  statusFilter,
  onStatusFilterChange,
  showSync = false,
  showClassFilter = false,
  saving = false,
  onSync,
}) {
  const query = activeTab === 'overview' ? overviewSearch : search;
  const setQuery = activeTab === 'overview' ? onOverviewSearchChange : onSearchChange;

  return (
    <div className="dos-assign-toolbar flex flex-col gap-3 p-4 border-b border-black/[0.05] bg-white">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={activeTab === 'overview' ? 'Search teachers…' : 'Search teacher, class, or course…'}
        />
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <select
            value={academicYear}
            onChange={(e) => onAcademicYearChange(e.target.value)}
            className="dos-filter-input min-w-[148px]"
            aria-label="Academic year"
          >
            {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={term}
            onChange={(e) => onTermChange(e.target.value)}
            className="dos-filter-input min-w-[108px]"
            aria-label="Term"
          >
            {terms.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {showClassFilter && (
            <select
              value={classFilter}
              onChange={(e) => onClassFilterChange(e.target.value)}
              className="dos-filter-input min-w-[120px]"
              aria-label="Filter by class"
            >
              <option value="">All classes</option>
              {classFilterOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="dos-filter-input min-w-[100px]"
            aria-label="Status"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="">All</option>
          </select>
          {showSync && (
            <button type="button" onClick={onSync} disabled={saving} className="dos-btn-ghost shrink-0 h-10">
              <RefreshCw size={13} className={saving ? 'animate-spin' : ''} /> Sync
            </button>
          )}
        </div>
      </div>
      {showClassFilter && (search.trim() || classFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-re-text-muted">Active filters:</span>
          {search.trim() && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#000435]/5 text-[10px] font-semibold text-[#000435] border border-[#000435]/10 hover:bg-[#000435]/10"
            >
              Search: {search.trim()} <X size={11} />
            </button>
          )}
          {classFilter && (
            <button
              type="button"
              onClick={() => onClassFilterChange('')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#c87800]/10 text-[10px] font-semibold text-[#9a5c00] border border-[#c87800]/20 hover:bg-[#c87800]/15"
            >
              Class: {classFilter} <X size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SelectField({ value, onChange, options, placeholder, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-11 rounded-xl border border-black/10 bg-white px-3 text-sm font-normal text-re-text focus:ring-2 focus:ring-[#FEBF10]/40 focus:outline-none disabled:opacity-50"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export default function TeacherAssignment() {
  const [activeTab, setActiveTab] = useState('list');
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [overviewSearch, setOverviewSearch] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYear, setAcademicYear] = useState('');
  const [currentAcademicYear, setCurrentAcademicYear] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [termsByYear, setTermsByYear] = useState({});
  const [term, setTerm] = useState('');
  const [terms, setTerms] = useState(['Term 1', 'Term 2', 'Term 3']);
  const [statusFilter, setStatusFilter] = useState('active');
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [classSearch, setClassSearch] = useState('');

  const flash = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4500);
  };

  const applyCalendarMeta = useCallback((d) => {
    if (d.academic_year) setAcademicYear(d.academic_year);
    if (d.current_academic_year) setCurrentAcademicYear(d.current_academic_year);
    if (d.academic_years?.length) setAcademicYears(d.academic_years);
    if (d.terms_by_year) setTermsByYear(d.terms_by_year);
    if (d.term) setTerm(d.term);
    if (d.terms?.length) setTerms(d.terms);
  }, []);

  const loadMeta = useCallback(async () => {
    const [tR, sR, cR, scR] = await Promise.all([
      api.get('/dos/teaching-staff').catch(() => ({ data: { success: false } })),
      api.get('/dos/subjects', { params: { include_inactive: 0 } }).catch(() => ({ data: { success: false } })),
      api.get('/dos/registry/classes').catch(() => ({ data: { success: false } })),
      api.get('/dos/class-enrollment').catch(() => ({ data: { success: false } })),
    ]);
    if (tR.data?.success) {
      setTeachers((tR.data.data || []).filter((t) => String(t.role_code || '').toUpperCase() === 'TEACHER'));
    }
    if (sR.data?.success) setSubjects((sR.data.data || []).filter((x) => x.is_active !== 0));
    const classNames = new Set();
    if (cR.data?.success) {
      (cR.data.data || []).map(classLabel).filter(Boolean).forEach((c) => classNames.add(c));
    }
    if (scR.data?.success) {
      (scR.data.data?.rows || []).map((r) => r.class_name).filter(Boolean).forEach((c) => classNames.add(c));
    }
    setClasses([...classNames].sort());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (academicYear) params.academic_year = academicYear;
      if (term) params.term = term;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/dos/teacher-assignments', { params });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load');
      const d = res.data.data || {};
      setRows(d.rows || []);
      setStats(d.stats || null);
      applyCalendarMeta(d);
    } catch (err) {
      flash('error', err.response?.data?.message || err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [academicYear, term, statusFilter, applyCalendarMeta]);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const params = { status: statusFilter || 'active' };
      if (academicYear) params.academic_year = academicYear;
      if (term) params.term = term;
      const res = await api.get('/dos/teacher-assignments/overview', { params });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load overview');
      const d = res.data.data || {};
      setOverview(d);
      applyCalendarMeta(d);
      if (!selectedTeacherId && d.teachers?.length) {
        setSelectedTeacherId(d.teachers[0].teacher_user_id);
      }
    } catch (err) {
      flash('error', err.response?.data?.message || err.message || 'Failed to load overview');
    } finally {
      setOverviewLoading(false);
    }
  }, [academicYear, term, statusFilter, applyCalendarMeta, selectedTeacherId]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (activeTab === 'overview') loadOverview();
  }, [activeTab, loadOverview]);

  const yearOptions = useMemo(
    () => (academicYears.length ? academicYears : [currentAcademicYear || academicYear].filter(Boolean))
      .map((y) => ({
        value: y,
        label: y === currentAcademicYear ? `${y} (current)` : y,
      })),
    [academicYears, currentAcademicYear, academicYear],
  );

  const formTermOptions = useMemo(() => {
    const y = form.academic_year || currentAcademicYear || academicYear;
    return (termsByYear[y] || terms).map((t) => ({ value: t, label: t }));
  }, [form.academic_year, termsByYear, terms, currentAcademicYear, academicYear]);

  const classFilterOptions = useMemo(() => {
    const fromRows = [...new Set(rows.map((r) => r.class_name).filter(Boolean))].sort();
    return fromRows.length ? fromRows : classes;
  }, [rows, classes]);

  const filtered = useMemo(() => {
    let list = rows;
    if (classFilter) {
      list = list.filter((r) => r.class_name === classFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.teacher_name, r.class_name, r.subject_name, r.term].some((v) =>
          String(v || '').toLowerCase().includes(q),
        ),
      );
    }
    return list;
  }, [rows, search, classFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, classFilter, academicYear, term, statusFilter]);

  const filteredClasses = useMemo(() => {
    const q = classSearch.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c) => c.toLowerCase().includes(q));
  }, [classes, classSearch]);

  const overviewTeachers = useMemo(() => {
    const q = overviewSearch.trim().toLowerCase();
    const list = overview?.teachers || [];
    if (!q) return list;
    return list.filter((t) =>
      [t.teacher_name, t.teacher_email].some((v) => String(v || '').toLowerCase().includes(q)),
    );
  }, [overview, overviewSearch]);

  const selectedTeacher = useMemo(
    () => (overview?.teachers || []).find((t) => t.teacher_user_id === selectedTeacherId) || null,
    [overview, selectedTeacherId],
  );

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      academic_year: academicYear || currentAcademicYear || '',
      term: term || terms[0] || 'Term 1',
    });
    setClassSearch('');
    setModal('create');
  };

  const openEdit = (row) => {
    setForm({
      class_names: [row.class_name],
      subject_name: row.subject_name,
      teacher_user_id: String(row.teacher_user_id),
      academic_year: row.academic_year,
      term: row.term,
      periods_per_week: row.periods_per_week || 3,
      room: row.room || '',
      _id: row.id,
      _marks: row.marks_count || 0,
    });
    setModal('edit');
  };

  const toggleClass = (className) => {
    setForm((f) => {
      const set = new Set(f.class_names);
      if (set.has(className)) set.delete(className);
      else set.add(className);
      return { ...f, class_names: [...set] };
    });
  };

  const selectAllClasses = () => {
    setForm((f) => ({ ...f, class_names: [...filteredClasses] }));
  };

  const clearClasses = () => {
    setForm((f) => ({ ...f, class_names: [] }));
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!form.class_names.length) {
      flash('error', 'Select at least one class');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/dos/teacher-assignments', {
        class_names: form.class_names,
        subject_name: form.subject_name,
        teacher_user_id: Number(form.teacher_user_id),
        academic_year: form.academic_year || academicYear,
        term: form.term || term,
        periods_per_week: Number(form.periods_per_week) || 3,
        room: form.room || null,
      });
      flash('success', res.data?.message || 'Assignments saved');
      setModal(null);
      await load();
      if (activeTab === 'overview') await loadOverview();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dangerous = form._marks > 0;
      await api.put(`/dos/teacher-assignments/${form._id}`, {
        periods_per_week: form.periods_per_week,
        room: form.room,
        ...(dangerous ? {} : {
          teacher_user_id: Number(form.teacher_user_id),
          class_name: form.class_names[0],
          subject_name: form.subject_name,
          supersede: false,
        }),
      });
      flash('success', dangerous
        ? 'Timetable settings updated — marks remain on this assignment'
        : 'Assignment updated');
      setModal(null);
      await load();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const supersede = async (row) => {
    const newTeacher = window.prompt('New teacher user ID (or cancel):', row.teacher_user_id);
    if (!newTeacher) return;
    setSaving(true);
    try {
      const res = await api.put(`/dos/teacher-assignments/${row.id}`, {
        supersede: true,
        teacher_user_id: Number(newTeacher),
        class_name: row.class_name,
        subject_name: row.subject_name,
        periods_per_week: row.periods_per_week,
        room: row.room,
      });
      flash('success', res.data?.message || 'New assignment created; old marks preserved');
      await load();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to supersede');
    } finally {
      setSaving(false);
    }
  };

  const archiveRow = async (row) => {
    const msg = row.marks_count > 0
      ? `Archive this assignment? ${row.marks_count} mark(s) will stay linked and safe.`
      : 'Archive this assignment?';
    if (!window.confirm(msg)) return;
    setSaving(true);
    try {
      const res = await api.post(`/dos/teacher-assignments/${row.id}/archive`);
      flash('success', res.data?.message || 'Archived');
      await load();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to archive');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (row) => {
    if (!window.confirm(row.marks_count > 0
      ? 'This assignment has marks — it will be archived, not deleted.'
      : 'Remove this assignment?')) return;
    setSaving(true);
    try {
      const res = await api.delete(`/dos/teacher-assignments/${row.id}`);
      flash('success', res.data?.message || 'Done');
      await load();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async (row) => {
    setSaving(true);
    try {
      const res = await api.get(`/dos/teacher-assignments/${row.id}/history`);
      setHistory(res.data?.data?.history || []);
      setModal('history');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Failed to load history');
    } finally {
      setSaving(false);
    }
  };

  const syncToTimetable = async () => {
    setSaving(true);
    try {
      const res = await api.post('/dos/teacher-assignments/sync-to-timetable');
      flash('success', res.data?.message || 'Synced to timetable');
    } catch (err) {
      flash('error', err.response?.data?.message || 'Sync failed');
    } finally {
      setSaving(false);
    }
  };

  const Card = ({ children, className = '' }) => (
    <div className={`bg-white rounded-2xl border border-black/5 shadow-sm ${className}`}>{children}</div>
  );

  return (
    <>
      <TeacherOrangeHero
        eyebrow="Academic oversight"
        title="Teacher Assignments"
        subtitle="Assign teachers to classes and courses for marks recording and timetable generation."
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <Link to={h('/timetable?tab=generator')} className="dos-btn-hero-outline">
              Timetable Generator
            </Link>
            <button type="button" onClick={openCreate} className="dos-btn-hero-solid">
              <Plus size={14} /> New assignment
            </button>
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 -mt-8 pt-2 relative z-20 pb-10">
        {notice && (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-normal flex items-start gap-2 mb-4 ${notice.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-red-50 border-red-100 text-red-900'}`}>
            {notice.type === 'success' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="dos-hero-stats-panel rounded-t-[32px] bg-white mb-5 overflow-hidden border border-black/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-black/5">
            {[
              { label: 'Total assignments', value: stats?.total ?? '—', icon: ClipboardList },
              { label: 'Active', value: stats?.active ?? '—', icon: CheckCircle2 },
              { label: 'Courses', value: stats?.courses ?? '—', icon: BookOpen },
              { label: 'Teachers', value: stats?.teachers ?? '—', icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center justify-center text-center p-5 min-h-[5.5rem] hover:bg-slate-50/80 transition-colors">
                <Icon size={12} className="mb-1.5 opacity-40" style={{ color: GOLD }} />
                <span className="text-lg sm:text-xl font-medium tabular-nums" style={{ color: NAVY }}>{value}</span>
                <p className="mt-1 text-[8px] font-normal uppercase tracking-wider text-re-text-muted opacity-70">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="dos-assign-panel rounded-[24px] border border-black/[0.08] bg-white shadow-sm overflow-hidden">
          <div className="dos-assign-tabs flex border-b border-black/[0.06] bg-[#f8fafc]/80 p-1.5 gap-1">
            {[
              { id: 'list', label: 'Assignments list', icon: ClipboardList },
              { id: 'overview', label: 'Teacher overview', icon: LayoutGrid },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`dos-assign-tab flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${
                  activeTab === id
                    ? 'dos-assign-tab--active bg-white shadow-sm text-[#000435]'
                    : 'dos-assign-tab--idle text-re-text-muted hover:text-re-text hover:bg-white/70'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {activeTab === 'list' && (
            <>
              <FilterToolbar
                activeTab={activeTab}
                search={search}
                onSearchChange={setSearch}
                overviewSearch={overviewSearch}
                onOverviewSearchChange={setOverviewSearch}
                academicYear={academicYear}
                onAcademicYearChange={setAcademicYear}
                yearOptions={yearOptions}
                term={term}
                onTermChange={setTerm}
                terms={terms}
                classFilter={classFilter}
                onClassFilterChange={setClassFilter}
                classFilterOptions={classFilterOptions}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                showSync
                showClassFilter
                saving={saving}
                onSync={syncToTimetable}
              />
              {loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin" style={{ color: AMBER }} size={28} />
                  <p className="text-xs text-re-text-muted">Loading assignments…</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="dos-data-table w-full min-w-[960px] border-collapse text-left text-xs text-re-text">
                      <thead>
                        <tr className="border-b border-black/[0.06] text-[10px] uppercase tracking-wider text-re-text-muted bg-gradient-to-b from-[#fafbfc] to-[#f4f6f8]">
                          <th className="py-3.5 px-4 font-medium whitespace-nowrap min-w-[200px]">Teacher</th>
                          <th className="py-3.5 px-4 font-medium whitespace-nowrap min-w-[100px]">Course</th>
                          <th className="py-3.5 px-4 font-medium whitespace-nowrap min-w-[80px]">Class</th>
                          <th className="py-3.5 px-4 font-medium whitespace-nowrap min-w-[120px]">Calendar</th>
                          <th className="py-3.5 px-4 font-medium whitespace-nowrap min-w-[100px]">Workload</th>
                          <th className="py-3.5 px-4 font-medium whitespace-nowrap min-w-[100px]">Marks</th>
                          <th className="py-3.5 px-4 font-medium whitespace-nowrap min-w-[80px]">Status</th>
                          <th className="py-3.5 px-4 w-14 text-right" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-16 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <ClipboardList size={28} className="text-[#000435]/15" />
                                <p className="text-sm font-medium text-re-text-muted">No assignments found</p>
                                <p className="text-xs text-re-text-muted/80">Create an assignment to enable marks recording.</p>
                                <button type="button" onClick={openCreate} className="dos-btn-accent mt-2 h-9 px-4">
                                  <Plus size={13} /> New assignment
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                        {paginatedRows.map((r) => (
                          <tr key={r.id} className="border-b border-black/[0.04] hover:bg-[#fff8eb]/50 transition-colors even:bg-[#fafbfc]/60">
                            <td className="py-4 px-4 align-middle">
                              <div className="dos-teacher-cell flex items-center gap-3 min-w-[160px]">
                                <div className="dos-teacher-avatar w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold shrink-0 bg-gradient-to-br from-[#c87800]/15 to-[#000435]/10 text-[#000435]">
                                  {teacherInitials(r.teacher_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#000435] truncate">{r.teacher_name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 align-middle whitespace-nowrap">
                              <span className="dos-badge dos-badge--course inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#c87800]/10 text-[#9a5c00] border border-[#c87800]/20">
                                {r.subject_name}
                              </span>
                            </td>
                            <td className="py-4 px-4 align-middle whitespace-nowrap">
                              <span className="dos-badge dos-badge--class inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-[#000435]/[0.06] text-[#000435] border border-[#000435]/10">
                                {r.class_name}
                              </span>
                            </td>
                            <td className="py-4 px-4 align-middle whitespace-nowrap">
                              <p className="text-xs font-medium text-[#000435]">{r.academic_year}</p>
                              <p className="text-[10px] text-re-text-muted mt-0.5">{r.term}</p>
                            </td>
                            <td className="py-4 px-4 align-middle whitespace-nowrap">
                              <span className="dos-badge dos-badge--period inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold tabular-nums bg-slate-100 text-slate-600 border border-black/[0.06]">
                                <Clock size={11} />
                                {r.periods_per_week || 0}/wk
                              </span>
                            </td>
                            <td className="py-4 px-4 align-middle whitespace-nowrap">
                              <p className="text-sm font-semibold tabular-nums text-[#000435]">{r.marks_count || 0}</p>
                              <p className="text-[10px] text-re-text-muted mt-0.5">
                                of {r.assessment_count || 0} assessments
                              </p>
                            </td>
                            <td className="py-4 px-4 align-middle whitespace-nowrap">
                              <span className={`dos-badge inline-flex items-center px-2.5 py-1 rounded-lg uppercase text-[9px] tracking-wider font-semibold ${STATUS_BADGE[r.status] || STATUS_BADGE.active}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 align-middle text-right">
                              <RowActionsMenu
                                row={r}
                                onHistory={loadHistory}
                                onEdit={openEdit}
                                onSupersede={supersede}
                                onArchive={archiveRow}
                                onRemove={removeRow}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!loading && (
                    <PaginationBar
                      page={safePage}
                      pageSize={pageSize}
                      totalItems={filtered.length}
                      onPageChange={setPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>

        {activeTab === 'overview' ? (
          <div className="fixed inset-0 z-[250] bg-[#f8fafc] flex flex-col pt-[72px]">
            <div className="shrink-0 px-4 sm:px-8 py-5 flex items-center justify-between gap-4 text-white" style={{ backgroundColor: AMBER }}>
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/10 pointer-events-none" aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-1 rounded-full" style={{ backgroundColor: GOLD }} aria-hidden />
                  <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/85">Teacher overview</p>
                </div>
                <h2 className="text-lg font-medium text-white">Assignment workload</h2>
                <p className="text-xs text-white/75 mt-0.5 font-normal">
                  {academicYear || currentAcademicYear} · {term} — select a teacher to view classes, courses and periods
                </p>
              </div>
              <button type="button" onClick={() => setActiveTab('list')} className="dos-btn-hero-close relative z-10">
                <X size={16} strokeWidth={2.5} /> Close
              </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
              <div className="lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-black/5 bg-white flex flex-col min-h-0">
                <div className="p-4 border-b border-black/5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                    <input
                      value={overviewSearch}
                      onChange={(e) => setOverviewSearch(e.target.value)}
                      placeholder="Search teachers…"
                      className="dos-filter-input w-full h-9 pl-9"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {overviewLoading ? (
                    <div className="py-12 flex justify-center"><Loader2 className="animate-spin" style={{ color: AMBER }} size={24} /></div>
                  ) : overviewTeachers.length === 0 ? (
                    <p className="text-xs text-re-text-muted text-center py-8">No teachers with assignments</p>
                  ) : overviewTeachers.map((t) => (
                    <button
                      key={t.teacher_user_id}
                      type="button"
                      onClick={() => setSelectedTeacherId(t.teacher_user_id)}
                      className={`w-full text-left rounded-xl border p-3 transition-all ${
                        selectedTeacherId === t.teacher_user_id
                          ? 'shadow-sm'
                          : 'border-black/5 hover:bg-[#f8fafc]'
                      }`}
                      style={selectedTeacherId === t.teacher_user_id
                        ? { borderColor: GOLD, backgroundColor: 'rgba(254,191,16,0.08)' }
                        : undefined}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-re-text truncate">{t.teacher_name}</p>
                          <p className="text-[10px] text-re-text-muted truncate">{t.teacher_email || '—'}</p>
                        </div>
                        <ChevronRight size={14} className="text-re-text-muted shrink-0 mt-1" />
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-[9px] font-normal uppercase px-2 py-0.5 rounded-md bg-white border border-black/5 text-re-text-muted">
                          {t.class_count} class{t.class_count !== 1 ? 'es' : ''}
                        </span>
                        <span className="text-[9px] font-normal uppercase px-2 py-0.5 rounded-md bg-white border border-black/5 text-re-text-muted">
                          {t.course_count} courses
                        </span>
                        <span className="text-[9px] font-normal uppercase px-2 py-0.5 rounded-md border" style={{ color: AMBER, borderColor: 'rgba(200,120,0,0.25)', backgroundColor: 'rgba(200,120,0,0.08)' }}>
                          {t.total_periods} periods/wk
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {!selectedTeacher ? (
                  <div className="h-full flex items-center justify-center text-re-text-muted text-sm">
                    Select a teacher from the list
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-5">
                    <div className="rounded-2xl text-white p-6 shadow-lg" style={{ backgroundColor: NAVY }}>
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                          <User size={28} style={{ color: GOLD }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-medium">{selectedTeacher.teacher_name}</h3>
                          <p className="text-sm text-white/65 mt-0.5 font-normal">{selectedTeacher.teacher_email || '—'}</p>
                          <p className="text-xs text-white/45 mt-2">{academicYear} · {term}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                        {[
                          { label: 'Classes', value: selectedTeacher.class_count, icon: GraduationCap },
                          { label: 'Courses', value: selectedTeacher.course_count, icon: BookOpen },
                          { label: 'Total periods/wk', value: selectedTeacher.total_periods, icon: Clock },
                          { label: 'Marks recorded', value: selectedTeacher.total_marks, icon: ClipboardList },
                        ].map(({ label, value, icon: Icon }) => (
                          <div key={label} className="rounded-xl bg-white/10 px-3 py-2.5">
                            <div className="flex items-center gap-1.5 text-white/50 mb-1">
                              <Icon size={12} />
                              <span className="text-[9px] font-medium uppercase tracking-wider">{label}</span>
                            </div>
                            <p className="text-xl font-medium tabular-nums">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedTeacher.class_summaries.map((cls) => (
                      <Card key={cls.class_name} className="overflow-hidden">
                        <div className="px-5 py-4 border-b border-black/5 bg-[#f8fafc] flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-re-text">{cls.class_name}</p>
                            <p className="text-[10px] text-re-text-muted mt-0.5">{cls.courses.length} course{cls.courses.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-medium uppercase tracking-widest text-re-text-muted">Class total</p>
                            <p className="text-lg font-medium tabular-nums" style={{ color: AMBER }}>
                              {cls.periods} <span className="text-xs text-re-text-muted">periods/wk</span>
                            </p>
                          </div>
                        </div>
                        <div className="divide-y divide-black/5">
                          {cls.courses.map((c) => (
                            <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#f8fafc]">
                              <div>
                                <p className="text-sm font-medium" style={{ color: AMBER }}>{c.subject_name}</p>
                                <p className="text-[10px] text-re-text-muted mt-0.5">
                                  {c.room ? `Room ${c.room} · ` : ''}{c.marks_count || 0} marks
                                </p>
                              </div>
                              <span className="text-sm font-medium text-re-text tabular-nums">{c.periods_per_week}/wk</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}

                    <Card className="p-5 border" style={{ borderColor: 'rgba(200,120,0,0.2)', backgroundColor: 'rgba(254,191,16,0.06)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-widest text-re-text-muted">Grand total — all classes</p>
                          <p className="text-xs text-re-text-muted mt-1 font-normal">Combined teaching periods per week for {selectedTeacher.teacher_name}</p>
                        </div>
                        <p className="text-3xl font-medium tabular-nums" style={{ color: NAVY }}>{selectedTeacher.total_periods}</p>
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {modal === 'create' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0f172a]/50 backdrop-blur-sm">
          <form onSubmit={submitCreate} className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="shrink-0 px-6 py-5 text-white" style={{ backgroundColor: AMBER }}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-5 h-1 rounded-full" style={{ backgroundColor: GOLD }} aria-hidden />
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/90">New assignment</p>
                  </div>
                  <h3 className="text-lg font-medium mt-1">Assign teacher to course</h3>
                  <p className="text-xs text-white/75 mt-1 font-normal">Select multiple classes to create one assignment per class</p>
                </div>
                <button type="button" onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/70">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>Academic year</FieldLabel>
                  <SelectField
                    value={form.academic_year}
                    onChange={(v) => setForm((f) => ({
                      ...f,
                      academic_year: v,
                      term: (termsByYear[v] || terms)[0] || f.term,
                    }))}
                    options={yearOptions}
                  />
                </div>
                <div>
                  <FieldLabel required>Term</FieldLabel>
                  <SelectField
                    value={form.term}
                    onChange={(v) => setForm((f) => ({ ...f, term: v }))}
                    options={formTermOptions}
                  />
                </div>
              </div>

              <div>
                <FieldLabel required>Teacher</FieldLabel>
                <SelectField
                  value={form.teacher_user_id}
                  onChange={(v) => setForm((f) => ({ ...f, teacher_user_id: v }))}
                  placeholder="Select teacher…"
                  options={teachers.map((t) => ({
                    value: String(t.id || t.teacher_user_id),
                    label: fmtTeacher(t),
                  }))}
                />
              </div>

              <div>
                <FieldLabel required>Course / subject</FieldLabel>
                <SelectField
                  value={form.subject_name}
                  onChange={(v) => setForm((f) => ({ ...f, subject_name: v }))}
                  placeholder="Select course…"
                  options={(Array.isArray(subjects) ? subjects : []).map((s) => {
                    const name = typeof s === 'string' ? s : s.name;
                    return { value: name, label: name };
                  })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel required>Classes ({form.class_names.length} selected)</FieldLabel>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAllClasses} className="text-[10px] font-medium hover:underline" style={{ color: AMBER }}>Select all</button>
                    <button type="button" onClick={clearClasses} className="text-[10px] font-medium text-re-text-muted hover:underline">Clear</button>
                  </div>
                </div>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
                  <input
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    placeholder="Filter classes…"
                    className="w-full h-9 pl-9 pr-3 rounded-xl border border-black/10 text-xs"
                  />
                </div>
                <div className="rounded-xl border border-black/10 max-h-48 overflow-y-auto p-2 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#f8fafc]">
                  {filteredClasses.length === 0 && (
                    <p className="col-span-full text-xs text-[#94a3b8] text-center py-4">No classes found</p>
                  )}
                  {filteredClasses.map((c) => {
                    const checked = form.class_names.includes(c);
                    return (
                      <label
                        key={c}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-xs font-normal transition-colors ${
                          checked
                            ? 'text-re-text'
                            : 'border-black/5 bg-white text-re-text-muted hover:border-black/15'
                        }`}
                        style={checked ? { borderColor: GOLD, backgroundColor: 'rgba(254,191,16,0.1)' } : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleClass(c)}
                          className="rounded border-black/20 text-[#FF8C00] focus:ring-[#FF8C00]"
                        />
                        <span className="truncate">{c}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>Periods per week</FieldLabel>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.periods_per_week}
                    onChange={(e) => setForm((f) => ({ ...f, periods_per_week: e.target.value }))}
                    className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm font-medium"
                  />
                </div>
                <div>
                  <FieldLabel>Room (optional)</FieldLabel>
                  <input
                    value={form.room}
                    onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                    placeholder="e.g. Lab 2"
                    className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm"
                  />
                </div>
              </div>

              {form.class_names.length > 0 && form.subject_name && form.teacher_user_id && (
                <div className="rounded-xl bg-[#f0fdf4] border border-emerald-200 px-4 py-3 flex items-start gap-3">
                  <Calendar size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900">
                    <p className="font-medium">Ready to create {form.class_names.length} assignment{form.class_names.length !== 1 ? 's' : ''}</p>
                    <p className="mt-0.5 text-emerald-800/80">
                      {fmtTeacher(teachers.find((t) => String(t.id || t.teacher_user_id) === form.teacher_user_id))} · {form.subject_name} · {form.academic_year} · {form.term}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-black/5 bg-[#f8fafc] flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="flex-1 dos-btn-ghost h-11">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.class_names.length || !form.subject_name || !form.teacher_user_id}
                className="flex-[2] dos-btn-primary h-11 disabled:opacity-40"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Saving…' : `Save ${form.class_names.length || 0} assignment${form.class_names.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal === 'edit' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0f172a]/50 backdrop-blur-sm">
          <form onSubmit={submitEdit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="shrink-0 px-6 py-5 text-white" style={{ backgroundColor: NAVY }}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">Edit assignment</p>
                  <h3 className="text-lg font-medium mt-1">{form.class_names[0]} · {form.subject_name}</h3>
                </div>
                <button type="button" onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/70">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {form._marks > 0 && (
                <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
                  This assignment has {form._marks} marks — only periods and room can be changed safely. Use Supersede to change teacher, course, or class.
                </p>
              )}
              <div>
                <FieldLabel required>Periods per week</FieldLabel>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={form.periods_per_week}
                  onChange={(e) => setForm((f) => ({ ...f, periods_per_week: e.target.value }))}
                  className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm"
                />
              </div>
              <div>
                <FieldLabel>Room (optional)</FieldLabel>
                <input
                  value={form.room}
                  onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                  placeholder="e.g. Lab 2"
                  className="w-full h-11 rounded-xl border border-black/10 px-3 text-sm"
                />
              </div>
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-black/5 bg-[#f8fafc] flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="flex-1 dos-btn-ghost h-11">Cancel</button>
              <button type="submit" disabled={saving} className="flex-[2] dos-btn-primary h-11">
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {modal === 'history' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#0f172a]/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="shrink-0 px-6 py-5 text-white flex justify-between items-center" style={{ backgroundColor: NAVY }}>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">Version history</p>
                <h3 className="text-lg font-medium mt-0.5">Assignment history</h3>
              </div>
              <button type="button" onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/10 text-white/70">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <p className="text-sm text-re-text-muted text-center py-8">No prior versions found.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((hist) => (
                    <li key={hist.id} className="rounded-xl border border-black/[0.06] p-4 bg-[#fafbfc]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#000435]">{hist.subject_name}</p>
                          <p className="text-xs text-re-text-muted mt-0.5">{hist.class_name}</p>
                        </div>
                        <span className={`dos-badge uppercase text-[9px] ${STATUS_BADGE[hist.status] || STATUS_BADGE.archived}`}>
                          {hist.status}
                        </span>
                      </div>
                      <p className="text-xs text-re-text-muted mt-2">{hist.teacher_name}</p>
                      <p className="text-[10px] text-re-text-muted/80 mt-1">
                        {hist.marks_count || 0} marks · {hist.created_at ? new Date(hist.created_at).toLocaleDateString() : '—'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
