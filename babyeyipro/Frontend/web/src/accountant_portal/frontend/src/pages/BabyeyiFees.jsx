import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Loader2,
  Save,
  Trash2,
  Banknote,
  Search,
  PenTool,
  LayoutTemplate,
  Activity,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import AccountantOchreHero from '../components/AccountantOchreHero';
import BabyeyiFeeCardModal from '../components/BabyeyiFeeCardModal';
import { parseManagerAcademicSettings, termsForRegistryYear } from '../utils/academicCalendarFilters';

function asMoney(v) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function parseClasses(v) {
  if (Array.isArray(v)) return v.map((x) => String(x || '').trim()).filter(Boolean);
  if (typeof v === 'string' && v.trim()) {
    try {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr.map((x) => String(x || '').trim()).filter(Boolean);
    } catch (_) {
      return v
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
}

const FALLBACK_TERMS = ['Term 1', 'Term 2', 'Term 3'];
const FALLBACK_YEARS = ['2025-2026'];
const CARDS_PAGE_SIZE = 8;

export default function BabyeyiFees() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    class_name: '',
    classes_text: '',
    term: '',
    academic_year: '',
    tuition_total: 0,
    paid_at_school_total: 0,
  });
  const [termFilter, setTermFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [yearOptions, setYearOptions] = useState(FALLBACK_YEARS);
  const [termOptions, setTermOptions] = useState(FALLBACK_TERMS);
  const [classOptions, setClassOptions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [page, setPage] = useState(1);

  const loadMeta = useCallback(async () => {
    try {
      const [settingsRes, classesRes] = await Promise.all([
        api.get('/dos/academic-calendar-settings').catch(() => null),
        api.get('/accountant/babyeyi-fees/class-options').catch(() => null),
      ]);
      const parsed = parseManagerAcademicSettings(settingsRes?.data?.data || {});
      const years = parsed.years?.length ? parsed.years : FALLBACK_YEARS;
      setYearOptions(years);
      const defaultYear = parsed.currentYear || years[0] || FALLBACK_YEARS[0];
      const terms = termsForRegistryYear(parsed.registry, defaultYear);
      setTermOptions(terms.length ? terms : FALLBACK_TERMS);

      const classes = Array.isArray(classesRes?.data?.data?.classes)
        ? classesRes.data.data.classes
        : [];
      setClassOptions(classes);
    } catch {
      setClassOptions([]);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/accountant/babyeyi-fees', {
        params: {
          term: termFilter || undefined,
          academic_year: yearFilter || undefined,
        },
      });
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load');
      setList(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load fee cards');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [termFilter, yearFilter]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    setPage(1);
  }, [termFilter, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(list.length / CARDS_PAGE_SIZE));

  const paginatedList = useMemo(() => {
    const start = (page - 1) * CARDS_PAGE_SIZE;
    return list.slice(start, start + CARDS_PAGE_SIZE);
  }, [list, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const loadDetail = async (id) => {
    setSelectedId(id);
    setDetail(null);
    setErr('');
    try {
      const res = await api.get(`/accountant/babyeyi-fees/${id}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load details');
      const row = res.data.data;
      const classes = parseClasses(row.classes_json);
      setDetail(row);
      setForm({
        class_name: row.class_name || '',
        classes_text: classes.join(', '),
        term: row.term || '',
        academic_year: row.academic_year || '',
        tuition_total: asMoney(row.tuition_total),
        paid_at_school_total: asMoney(row.paid_at_school_total),
      });
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to load fee card');
    }
  };

  const totalDue = useMemo(
    () => Math.max(0, asMoney(form.tuition_total) + asMoney(form.paid_at_school_total)),
    [form.tuition_total, form.paid_at_school_total]
  );

  const modalInitialForm = useMemo(() => {
    if (!detail || modalMode !== 'edit') return null;
    const classes = parseClasses(detail.classes_json);
    return {
      babyeyi_id: detail.babyeyi_id,
      class_name: detail.class_name || '',
      selectedClasses: classes.length ? classes : detail.class_name ? [detail.class_name] : [],
      term: detail.term || '',
      academic_year: detail.academic_year || '',
      tuition_total: asMoney(detail.tuition_total),
      paid_at_school_total: asMoney(detail.paid_at_school_total),
    };
  }, [detail, modalMode]);

  const openCreateModal = () => {
    setModalMode('create');
    setModalOpen(true);
  };

  const openEditModal = () => {
    if (!selectedId) return;
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleModalSaved = async (result) => {
    await loadList();
    const id = result?.id || selectedId;
    if (id) await loadDetail(id);
    else {
      setSelectedId(null);
      setDetail(null);
    }
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    setErr('');
    try {
      const classesJson = form.classes_text
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      const payload = {
        class_name: form.class_name,
        classes_json: classesJson,
        term: form.term,
        academic_year: form.academic_year,
        tuition_total: asMoney(form.tuition_total),
        paid_at_school_total: asMoney(form.paid_at_school_total),
      };
      const res = await api.put(`/accountant/babyeyi-fees/${selectedId}`, payload);
      if (!res.data?.success) throw new Error(res.data?.message || 'Save failed');
      await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to save fee card');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this fee card? Student fees will no longer use this card for matching classes.')) return;
    setDeleting(true);
    setErr('');
    try {
      const res = await api.delete(`/accountant/babyeyi-fees/${selectedId}`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Delete failed');
      setSelectedId(null);
      setDetail(null);
      await loadList();
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Failed to delete fee card');
    } finally {
      setDeleting(false);
    }
  };

  const inp =
    'w-full h-11 rounded-xl border border-black/5 bg-white px-4 text-[11px] font-medium uppercase tracking-tight text-[#000435] outline-none focus:border-[#000435]/20 focus:ring-1 focus:ring-[#000435]/10 mt-1 transition-all placeholder:text-[#000435]/30 ';

  const filterYearSelectOptions = yearOptions.length ? yearOptions : FALLBACK_YEARS;

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-[85vh] w-full" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <AccountantOchreHero
        eyebrow="System configuration"
        titleLine="Babyeyi Fee"
        titleAccent="Cards"
        subtitle="Accountant fee structures by class, term, and academic year"
        icon={LayoutTemplate}
      />

      <div className="acct-shell-standard pb-20">
        <div className="bg-white rounded-[24px] border border-black/5 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex w-full sm:w-auto items-center gap-3">
            <div className="relative flex-1 sm:w-40 group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 group-focus-within:text-[#000435] transition-colors pointer-events-none" />
              <input
                className="w-full h-10 bg-white rounded-xl outline-none border border-black/5 focus:border-[#000435]/20 focus:bg-white transition-all text-[#000435] text-[10px] font-medium uppercase tracking-tight placeholder:text-[#000435]/30 pl-9 pr-3"
                placeholder="Filter Term"
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
              />
            </div>
            <div className="relative flex-1 sm:w-40 group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 group-focus-within:text-[#000435] transition-colors pointer-events-none" />
              <select
                className="w-full h-10 bg-white rounded-xl outline-none border border-black/5 focus:border-[#000435]/20 transition-all text-[#000435] text-[10px] font-medium uppercase tracking-tight pl-9 pr-3 appearance-none"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                <option value="">All years</option>
                {filterYearSelectOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#FEBF10] text-[#000435] font-semibold text-[10px] uppercase tracking-widest hover:bg-[#e5ac0e] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={14} /> New fee card
            </button>
            <button
              type="button"
              onClick={() => loadList()}
              className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#000435] text-white font-medium text-[10px] uppercase tracking-widest hover:bg-[#0D2644] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Activity size={14} /> Refresh
            </button>
          </div>
        </div>

        {err && (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-800 text-[10px] font-medium uppercase tracking-widest px-5 py-4 mb-6 flex items-center gap-2 max-w-xl">
            <AlertTriangle size={14} /> {err}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          <div className="lg:col-span-4 bg-white rounded-[24px] border border-black/5 overflow-hidden flex flex-col h-[500px] sm:h-[600px]">
            <div className="px-5 py-4 border-b border-black/5 bg-[#000435] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-[#FEBF10]" />
                <h3 className="text-[10px] font-medium uppercase tracking-widest text-white">Cards Directory</h3>
              </div>
              <span className="text-[9px] font-medium bg-white/20 px-2 py-0.5 rounded-md">{list.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto bg-white/20 min-h-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[#000435]/40 p-8 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <span className="text-[9px] font-medium uppercase tracking-widest">Loading fee cards...</span>
                </div>
              ) : list.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[#000435]/40 p-8 text-center">
                  <FileSpreadsheet className="w-8 h-8 opacity-40 text-amber-500" />
                  <span className="text-[9px] font-medium uppercase tracking-widest">No fee cards yet</span>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="mt-2 text-[9px] font-semibold uppercase tracking-widest text-[#000435] underline"
                  >
                    Create your first card
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-black/5">
                  {paginatedList.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => loadDetail(r.id)}
                        className={`w-full flex flex-col text-left px-5 py-4 transition-all hover:bg-re-bg group ${
                          selectedId === r.id ? 'bg-re-bg border-l-[3px] border-[#FEBF10]' : 'border-l-[3px] border-transparent'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <p
                            className={`text-[12px] font-medium uppercase tracking-tight truncate ${
                              selectedId === r.id ? 'text-[#000435]' : 'text-[#000435]/80'
                            }`}
                          >
                            {r.class_name || 'Class'}
                          </p>
                          <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 whitespace-nowrap ml-2">
                            ID: {r.babyeyi_id}
                          </span>
                        </div>
                        <p className="text-[9px] font-medium text-[#000435]/50 uppercase tracking-widest mt-1.5">
                          {r.term || '—'} · {r.academic_year || '—'}
                        </p>
                        <p className="text-[12px] mt-2.5 font-medium text-[#FEBF10]">
                          {asMoney(r.total_due).toLocaleString()}{' '}
                          <span className="text-[9px] text-[#000435]/60 uppercase tracking-widest">RWF</span>
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!loading && list.length > CARDS_PAGE_SIZE ? (
              <div className="shrink-0 px-4 py-3 border-t border-black/5 bg-white flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 w-8 rounded-lg border border-black/10 flex items-center justify-center text-[#000435] disabled:opacity-30 hover:bg-re-bg transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <p className="text-[9px] font-medium uppercase tracking-widest text-[#000435]/60 tabular-nums">
                  Page {page} of {totalPages}
                  <span className="text-[#000435]/40 mx-1">·</span>
                  {list.length} cards
                </p>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-8 w-8 rounded-lg border border-black/10 flex items-center justify-center text-[#000435] disabled:opacity-30 hover:bg-re-bg transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-8 bg-white rounded-[24px] border border-black/5 overflow-hidden">
            {!selectedId ? (
              <div className="h-[500px] sm:h-[600px] flex flex-col items-center justify-center p-8 text-center bg-white/20">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 border border-black/5">
                  <LayoutTemplate size={24} className="text-amber-500" />
                </div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-[#000435]">Select a fee card</p>
                <p className="text-[9px] font-medium uppercase tracking-widest text-[#000435]/50 mt-2 max-w-xs leading-relaxed">
                  Choose a card from the directory or create a new one for your classes and term.
                </p>
              </div>
            ) : detail ? (
              <div className="flex flex-col h-full">
                <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                  <div>
                    <p className="text-[9px] font-medium uppercase text-amber-500 tracking-[0.2em]">Editing configurations</p>
                    <p className="text-xl sm:text-2xl font-medium text-[#000435] mt-0.5 uppercase tracking-tighter">
                      Babyeyi Card #{detail.babyeyi_id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="h-10 px-4 rounded-xl flex items-center justify-center gap-2 bg-white border border-[#000435]/15 text-[#000435] font-medium text-[9px] uppercase tracking-widest hover:bg-re-bg transition-all"
                    >
                      <PenTool className="w-4 h-4" /> Edit in modal
                    </button>
                    <button
                      type="button"
                      onClick={save}
                      disabled={saving || deleting}
                      className="h-10 px-5 rounded-xl flex items-center justify-center gap-2 text-white font-medium text-[9px] uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #000435 0%, #0D2644 100%)' }}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                    </button>
                    <button
                      type="button"
                      onClick={removeRow}
                      disabled={saving || deleting}
                      className="h-10 px-4 sm:px-5 rounded-xl flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 font-medium text-[9px] uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
                      title="Delete Card"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      <span className="hidden sm:inline">Remove</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 sm:p-8 bg-white/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/60 pl-1">Primary class</label>
                      <input
                        className={inp}
                        placeholder="e.g. P1"
                        value={form.class_name}
                        onChange={(e) => setForm((s) => ({ ...s, class_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/60 pl-1">Applicable classes</label>
                      <input
                        className={inp}
                        placeholder="e.g. P1, P2, P3"
                        value={form.classes_text}
                        onChange={(e) => setForm((s) => ({ ...s, classes_text: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/60 pl-1">Term</label>
                      <input
                        className={inp}
                        placeholder="e.g. Term 1"
                        value={form.term}
                        onChange={(e) => setForm((s) => ({ ...s, term: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/60 pl-1">Academic year</label>
                      <input
                        className={inp}
                        placeholder="e.g. 2025-2026"
                        value={form.academic_year}
                        onChange={(e) => setForm((s) => ({ ...s, academic_year: e.target.value }))}
                      />
                    </div>

                    <div className="md:col-span-2 mt-4 pt-6 border-t border-black/5">
                      <h4 className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-[#000435] mb-4 sm:mb-5">
                        <Banknote size={14} className="text-amber-500" /> Cost breakdown
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/60 pl-1">Tuition total (RWF)</label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            className={inp}
                            placeholder="0"
                            value={form.tuition_total}
                            onChange={(e) => setForm((s) => ({ ...s, tuition_total: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#000435]/60 pl-1">Paid at school (RWF)</label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            className={inp}
                            placeholder="0"
                            value={form.paid_at_school_total}
                            onChange={(e) => setForm((s) => ({ ...s, paid_at_school_total: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 sm:mt-8 rounded-[20px] bg-white border border-black/5 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#000435] mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Computed total due
                      </p>
                      <p className="text-[10px] font-medium text-[#000435]/50 leading-relaxed max-w-sm mt-2 uppercase tracking-widest">
                        Shown on Student Fees for learners in applicable classes. Additional cards for the same term and year stack on top of each other.
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-right shrink-0 min-w-[200px]">
                      <p className="text-2xl sm:text-3xl font-medium text-emerald-600 tracking-tighter">{totalDue.toLocaleString()}</p>
                      <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-600/70 mt-0.5">RWF total</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[500px] sm:h-[600px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      <BabyeyiFeeCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        mode={modalMode}
        cardId={selectedId}
        initialForm={modalInitialForm}
        yearOptions={yearOptions}
        termOptions={termOptions}
        classOptions={classOptions}
        onSaved={handleModalSaved}
      />
    </div>
  );
}
