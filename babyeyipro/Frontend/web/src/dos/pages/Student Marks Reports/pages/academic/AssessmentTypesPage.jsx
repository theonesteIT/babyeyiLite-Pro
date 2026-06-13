import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, GripVertical, Loader2, Plus, RefreshCw, ToggleLeft, ToggleRight, Trash2, X,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import PageShell, { KpiCard, Panel } from '../../components/PageShell';
import {
  createAssessmentType, deleteAssessmentType, fetchAcademicHealthWeights, fetchAssessmentTypes,
  reorderAssessmentTypes, saveAcademicHealthWeights, updateAssessmentType,
} from '../../services/marksAcademicApi';

const NAVY = '#000435';
const AMBER = '#f59e0b';
const PIE_COLORS = [`${NAVY}cc`, AMBER, `${NAVY}99`, `${AMBER}cc`, `${NAVY}66`, `${AMBER}99`, `${NAVY}44`];

const SCHOOL_LEVELS = ['ALL', 'Primary', 'O Level', 'A Level', 'S1', 'S2', 'S3', 'S6'];

const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#f59e0b] text-[#000435] hover:opacity-90 transition-opacity';
const btnSecondary = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#000435] text-white hover:bg-[#0a116b] transition-colors';

export default function AssessmentTypesPage() {
  const [schoolLevel, setSchoolLevel] = useState('ALL');
  const [rows, setRows] = useState([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', weight_percent: '' });
  const [toast, setToast] = useState(null);
  const [healthWeights, setHealthWeights] = useState({
    marks_weight: 40, attendance_weight: 20, behaviour_weight: 15,
    homework_weight: 15, participation_weight: 10, formula: '',
  });
  const [healthSaving, setHealthSaving] = useState(false);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetchAcademicHealthWeights();
      if (res?.success && res.data) setHealthWeights(res.data);
    } catch {
      /* defaults */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAssessmentTypes(schoolLevel);
      if (res?.success) {
        setRows(res.data?.rows || []);
        setTotalWeight(Number(res.data?.total_weight || 0));
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to load' });
    } finally {
      setLoading(false);
    }
  }, [schoolLevel]);

  useEffect(() => { load(); loadHealth(); }, [load, loadHealth]);

  const activeRows = useMemo(() => rows.filter((r) => r.is_active), [rows]);
  const healthTotal = useMemo(() => (
    Number(healthWeights.marks_weight || 0)
    + Number(healthWeights.attendance_weight || 0)
    + Number(healthWeights.behaviour_weight || 0)
    + Number(healthWeights.homework_weight || 0)
    + Number(healthWeights.participation_weight || 0)
  ), [healthWeights]);
  const healthOk = Math.abs(healthTotal - 100) < 0.05;
  const pieData = useMemo(() => activeRows.map((r) => ({ name: r.name, value: Number(r.weight_percent) })), [activeRows]);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  const handleAdd = async (e) => {
    e.preventDefault();
    const weight = Number(form.weight_percent);
    if (!form.name.trim() || !Number.isFinite(weight)) return;
    setSaving(true);
    try {
      await createAssessmentType({ name: form.name.trim(), weight_percent: weight, school_level: schoolLevel, sort_order: rows.length + 1 });
      setToast({ type: 'success', message: 'Assessment type added' });
      setModalOpen(false);
      setForm({ name: '', weight_percent: '' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to add' });
    } finally {
      setSaving(false);
    }
  };

  const onDrop = async (targetId) => {
    if (!dragId || dragId === targetId) return;
    const list = [...rows];
    const fromIdx = list.findIndex((r) => r.id === dragId);
    const toIdx = list.findIndex((r) => r.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setRows(list);
    try {
      await reorderAssessmentTypes(list.map((r, i) => ({ id: r.id, sort_order: i + 1 })));
      await load();
    } catch {
      await load();
    }
    setDragId(null);
  };

  const saveHealth = async () => {
    setHealthSaving(true);
    try {
      const res = await saveAcademicHealthWeights(healthWeights);
      if (res?.success) {
        setHealthWeights(res.data);
        setToast({ type: 'success', message: 'Academic health formula saved' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to save health formula' });
    } finally {
      setHealthSaving(false);
    }
  };

  const healthFields = [
    { key: 'marks_weight', label: 'Marks' },
    { key: 'attendance_weight', label: 'Attendance' },
    { key: 'behaviour_weight', label: 'Behaviour' },
    { key: 'homework_weight', label: 'Homework' },
    { key: 'participation_weight', label: 'Participation' },
  ];

  return (
    <PageShell
      title="Assessment Framework"
      subtitle="Set assessment types and term weights. Teachers create unlimited assessments under each type."
      actions={(
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={schoolLevel}
            onChange={(e) => setSchoolLevel(e.target.value)}
            className="h-9 rounded-xl border border-[#000435]/12 px-3 text-xs font-medium text-[#000435] bg-white focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/25"
          >
            {SCHOOL_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button type="button" onClick={() => setModalOpen(true)} className={btnPrimary}>
            <Plus size={14} /> Add type
          </button>
          <button type="button" onClick={load} disabled={loading} className={btnSecondary}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      )}
    >
      {toast && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${toast.type === 'success' ? 'bg-[#f59e0b]/8 border-[#f59e0b]/25 text-[#000435]' : 'bg-[#000435]/5 border-[#000435]/12 text-[#000435]'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-[#f59e0b]" /> : <AlertTriangle size={16} className="text-[#f59e0b]" />}
          {toast.message}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Types" value={rows.length} />
        <KpiCard label="Active" value={activeRows.length} />
        <KpiCard label="Total weight" value={`${totalWeight}%`} sub={weightOk ? 'Balanced at 100%' : 'Adjust to 100%'} accent={weightOk ? undefined : 'text-[#f59e0b]'} />
        <KpiCard label="Level" value={schoolLevel} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Panel title="Weight split" className="lg:col-span-2">
          {pieData.length === 0 ? (
            <p className="text-sm text-[#000435]/35 text-center py-12">No types yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={44} outerRadius={72} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 10, border: `1px solid ${NAVY}12`, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className={`mt-3 py-2.5 px-4 rounded-xl text-center text-xs font-medium ${weightOk ? 'bg-[#000435]/6 text-[#000435]/70' : 'bg-[#f59e0b]/10 text-[#000435]'}`}>
            Total = {totalWeight}% {weightOk ? '✓' : '— must equal 100%'}
          </div>
        </Panel>

        <Panel title="Assessment types" className="lg:col-span-3">
          {loading ? (
            <div className="flex justify-center py-14"><Loader2 className="animate-spin text-[#000435]/25" size={26} /></div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[#000435]/35 text-center py-12">Add your first assessment type</p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((row) => (
                <div
                  key={row.id}
                  draggable
                  onDragStart={() => setDragId(row.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => onDrop(row.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    row.is_active ? 'border-[#000435]/8 bg-white' : 'border-[#000435]/5 bg-[#000435]/[0.015] opacity-50'
                  } ${dragId === row.id ? 'ring-1 ring-[#f59e0b]' : 'hover:border-[#f59e0b]/30'}`}
                >
                  <GripVertical size={15} className="text-[#000435]/20 cursor-grab shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#000435] truncate">{row.name}</p>
                    <p className="text-[10px] text-[#000435]/35">{row.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      defaultValue={row.weight_percent}
                      onBlur={(e) => updateAssessmentType(row.id, { weight_percent: Number(e.target.value) }).then(load)}
                      className="w-12 h-8 rounded-lg border border-[#000435]/12 text-center text-xs font-medium text-[#000435] focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
                    />
                    <span className="text-xs text-[#000435]/40">%</span>
                    <button type="button" onClick={() => updateAssessmentType(row.id, { is_active: !row.is_active }).then(load)} className="p-1">
                      {row.is_active ? <ToggleRight size={20} className="text-[#f59e0b]" /> : <ToggleLeft size={20} className="text-[#000435]/25" />}
                    </button>
                    <button type="button" onClick={() => window.confirm(`Remove "${row.name}"?`) && deleteAssessmentType(row.id).then(load)} className="p-1.5 rounded-lg hover:bg-[#000435]/5 text-[#000435]/40 hover:text-[#000435]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[#000435]/30 mt-4 leading-relaxed">
            Drag to reorder. Teachers tag HW1, Quiz 2, CAT 3… to a type; the system applies these weights for weighted averages.
          </p>
        </Panel>
      </div>

      <Panel title="Academic health formula (internal)" className="mt-1">
        <p className="text-[11px] text-[#000435]/50 mb-3 leading-relaxed">
          Configure how the Health score on report cards is calculated. This is for DOS only — not shown on parent reports.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {healthFields.map(({ key, label }) => (
            <label key={key} className="block">
              <span className="text-[10px] font-medium text-[#000435]/60 uppercase tracking-wide">{label}</span>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={healthWeights[key] ?? ''}
                  onChange={(e) => setHealthWeights((h) => ({ ...h, [key]: e.target.value }))}
                  className="w-full h-9 rounded-lg border border-[#000435]/12 px-2 text-xs font-medium text-[#000435] focus:outline-none focus:ring-1 focus:ring-[#f59e0b]/30"
                />
                <span className="text-xs text-[#000435]/40">%</span>
              </div>
            </label>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-[#000435]/45 font-mono leading-relaxed bg-[#000435]/[0.03] rounded-lg px-3 py-2">
          {healthWeights.formula || 'Health = weighted sum of marks, attendance, behaviour, homework, participation'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveHealth} disabled={healthSaving || !healthOk} className={btnPrimary}>
            {healthSaving ? 'Saving…' : 'Save health formula'}
          </button>
          <span className={`text-xs font-medium ${healthOk ? 'text-[#000435]/50' : 'text-[#f59e0b]'}`}>
            Total = {healthTotal}% {healthOk ? '✓' : '— must equal 100%'}
          </span>
        </div>
      </Panel>

      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#000435]/50 backdrop-blur-[2px]">
          <form onSubmit={handleAdd} className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-[#000435]/8">
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#000435]/8">
              <h3 className="text-sm font-semibold text-[#000435]">New assessment type</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-[#000435]/5 text-[#000435]/40"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-3">
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Homework, CAT, End-Term Exam" className="w-full h-10 rounded-xl border border-[#000435]/12 px-3 text-sm text-[#000435] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/25" />
              <input required type="number" min={0} max={100} step={0.5} value={form.weight_percent} onChange={(e) => setForm((f) => ({ ...f, weight_percent: e.target.value }))} placeholder="Weight %" className="w-full h-10 rounded-xl border border-[#000435]/12 px-3 text-sm text-[#000435] focus:outline-none focus:ring-2 focus:ring-[#f59e0b]/25" />
              <p className="text-[10px] text-[#000435]/40">Level: {schoolLevel}</p>
              <button type="submit" disabled={saving} className="w-full h-10 rounded-xl bg-[#000435] text-white text-sm font-medium">{saving ? 'Saving…' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </PageShell>
  );
}
