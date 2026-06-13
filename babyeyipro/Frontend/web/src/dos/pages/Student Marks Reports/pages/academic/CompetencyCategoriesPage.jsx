import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import PageShell, { Panel } from '../../components/PageShell';
import {
  createCompetencyCategory, deleteCompetencyCategory, fetchCompetencyCategories, updateCompetencyCategory,
} from '../../services/marksAcademicApi';

const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#f59e0b] text-[#000435] hover:opacity-90';

export default function CompetencyCategoriesPage() {
  const [rows, setRows] = useState([]);
  const [ratingLevels, setRatingLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCompetencyCategories();
      if (res?.success) {
        setRows(res.data?.rows || []);
        setRatingLevels(res.data?.rating_levels || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createCompetencyCategory({ name: name.trim(), sort_order: rows.length + 1 });
      setName('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row) => {
    await updateCompetencyCategory(row.id, { is_active: !row.is_active });
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this competency category?')) return;
    await deleteCompetencyCategory(id);
    await load();
  };

  return (
    <PageShell
      title="Competency Categories"
      subtitle="Define CBC competency areas teachers rate per class each term (Communication, Problem Solving, etc.)."
    >
      <Panel title="Add category">
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-center">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Communication"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <button type="submit" disabled={saving} className={btnPrimary}>
            <Plus size={14} /> Add
          </button>
        </form>
        {ratingLevels.length > 0 && (
          <p className="text-xs text-slate-500 mt-3">
            Rating scale: {ratingLevels.join(' · ')}
          </p>
        )}
      </Panel>

      <Panel title="School competency framework">
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80">
                <div>
                  <p className="text-sm font-bold text-[#000435]">{r.name}</p>
                  <p className="text-[10px] text-slate-400">Order {r.sort_order}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleActive(r)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${r.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {r.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button type="button" onClick={() => handleDelete(r.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!rows.length && <p className="text-sm text-slate-400 py-6 text-center">No categories yet.</p>}
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
