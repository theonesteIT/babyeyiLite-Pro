import { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import PageShell, { Panel } from '../../components/PageShell';
import { fetchGradingSystem, saveGradingSystem } from '../../services/marksAcademicApi';

const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#000435] text-white hover:bg-[#0a116b] disabled:opacity-50';

export default function GradingSystemPage() {
  const [bands, setBands] = useState([]);
  const [defaults, setDefaults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchGradingSystem();
      if (res?.success) {
        setBands(res.data?.bands || []);
        setDefaults(res.data?.defaults || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateBand = (idx, field, value) => {
    setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
  };

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      await saveGradingSystem(bands);
      setToast({ type: 'success', message: 'Grading scale saved. Re-generate reports to apply new grades.' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => setBands(defaults.map((b) => ({ ...b })));

  return (
    <PageShell
      title="Grading System"
      subtitle="Set percentage ranges and remarks shown on mid-term and final report cards."
    >
      {toast && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
          {toast.message}
        </div>
      )}

      <Panel title="Letter grades & remarks">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="text-left py-2 pr-3 w-16">Grade</th>
                    <th className="text-left py-2 px-2 w-28">Min %</th>
                    <th className="text-left py-2 px-2 w-28">Max %</th>
                    <th className="text-left py-2 pl-2">Remark (on report)</th>
                  </tr>
                </thead>
                <tbody>
                  {bands.map((b, i) => (
                    <tr key={b.letter || i} className="border-b border-slate-100">
                      <td className="py-2.5 pr-3 font-bold text-[#000435]">{b.letter}</td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={b.min_percent}
                          onChange={(e) => updateBand(i, 'min_percent', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={b.max_percent}
                          onChange={(e) => updateBand(i, 'max_percent', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm"
                        />
                      </td>
                      <td className="py-2.5 pl-2">
                        <input
                          type="text"
                          value={b.remark}
                          onChange={(e) => updateBand(i, 'remark', e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm uppercase"
                          placeholder="e.g. EXCELLENT"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              Default scale: A (80–100) Excellent · B (75–79) Very Good · C (70–74) Good · D (60–69) Satisfactory · E (50–59) Adequate · F (0–49) Fair
            </p>

            <div className="flex flex-wrap gap-2 mt-5">
              <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save grading scale
              </button>
              <button type="button" onClick={resetDefaults} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                <RotateCcw size={14} /> Reset to defaults
              </button>
            </div>
          </>
        )}
      </Panel>
    </PageShell>
  );
}
