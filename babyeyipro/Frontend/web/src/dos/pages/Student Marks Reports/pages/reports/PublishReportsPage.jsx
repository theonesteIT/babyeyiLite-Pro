import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Send } from 'lucide-react';
import PageShell, { Panel } from '../../components/PageShell';
import { fetchReportBatches, publishBatch } from '../../services/dosStudentReportsApi';

export default function PublishReportsPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [publishing, setPublishing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReportBatches();
      if (res?.success) setBatches(res.data?.batches || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async (batchId) => {
    setPublishing(batchId);
    try {
      const res = await publishBatch(batchId);
      setToast({ type: 'success', message: res?.message || 'Published' });
      await load();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Publish failed' });
    } finally {
      setPublishing(null);
    }
  };

  return (
    <PageShell
      title="Publish reports"
      subtitle="Release generated report snapshots to the parent portal."
    >
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-100 text-red-800">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {toast && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {toast.message}
        </div>
      )}

      <Panel title="Report batches">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#000435]/25" /></div>
        ) : batches.length === 0 ? (
          <p className="text-sm text-[#000435]/40 py-8 text-center">No batches yet. Generate reports first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-[#000435]/40 border-b border-black/5">
                  <th className="text-left py-3 px-3">Batch</th>
                  <th className="text-left py-3 px-2">Class</th>
                  <th className="text-left py-3 px-2">Type</th>
                  <th className="text-left py-3 px-2">Term</th>
                  <th className="text-center py-3 px-2">Reports</th>
                  <th className="text-center py-3 px-2">Published</th>
                  <th className="text-center py-3 px-2">Status</th>
                  <th className="text-right py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-t border-black/4">
                    <td className="py-3 px-3 text-xs text-[#000435]/50">#{b.id}</td>
                    <td className="py-3 px-2 font-medium text-[#000435]">{b.class_name}</td>
                    <td className="py-3 px-2 text-xs capitalize">{b.report_type?.replace('_', ' ')}</td>
                    <td className="py-3 px-2 text-xs">{b.term} · {b.academic_year}</td>
                    <td className="py-3 px-2 text-center">{b.snapshot_count ?? b.generated_count}</td>
                    <td className="py-3 px-2 text-center text-green-700">{b.published_count ?? 0}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                        b.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                      }`}>{b.status}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {b.status !== 'published' && (
                        <button type="button" disabled={publishing === b.id} onClick={() => handlePublish(b.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white disabled:opacity-40">
                          {publishing === b.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Publish to parents
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
