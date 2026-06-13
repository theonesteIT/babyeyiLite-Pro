import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Download, Loader2, Package } from 'lucide-react';
import PageShell, { Panel } from '../../components/PageShell';
import { fetchReportBatches, downloadBatchZip } from '../../services/dosStudentReportsApi';

export default function DownloadCenterPage() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReportBatches();
      if (res?.success) setBatches(res.data?.batches || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (batch) => {
    setDownloadingId(batch.id);
    setError(null);
    try {
      const label = `${batch.class_name || 'class'}_${batch.term || 'term'}`.replace(/[^\w.-]+/g, '_');
      await downloadBatchZip(batch.id, `reports-${label}-batch-${batch.id}.zip`);
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'ZIP download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <PageShell
      title="Download center"
      subtitle="Instant downloads from stored snapshots — PDFs cached after first generation."
    >
      {error && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-100 text-red-800">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <Panel title="Available batches">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#000435]/25" /></div>
        ) : batches.length === 0 ? (
          <p className="text-sm text-[#000435]/40 py-8 text-center">No downloadable batches yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((b) => (
              <div key={b.id} className="rounded-2xl border border-black/6 bg-white p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[#000435]">{b.class_name}</p>
                    <p className="text-[10px] text-[#000435]/45 mt-0.5 capitalize">{b.report_type?.replace('_', ' ')} · {b.term}</p>
                  </div>
                  <Package size={18} className="text-amber-500 shrink-0" />
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs mb-4">
                  <div><dt className="text-[#000435]/40">Reports</dt><dd className="font-semibold">{b.snapshot_count ?? b.generated_count}</dd></div>
                  <div><dt className="text-[#000435]/40">Class avg</dt><dd className="font-semibold">{b.class_average != null ? `${b.class_average}%` : '—'}</dd></div>
                  <div><dt className="text-[#000435]/40">Year</dt><dd>{b.academic_year}</dd></div>
                  <div><dt className="text-[#000435]/40">Status</dt><dd className="capitalize">{b.status}</dd></div>
                </dl>
                <button
                  type="button"
                  disabled={downloadingId === b.id}
                  onClick={() => handleDownload(b)}
                  className="w-full h-9 rounded-xl bg-[#000435] text-white text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-[#0a116b] disabled:opacity-60"
                >
                  {downloadingId === b.id ? (
                    <><Loader2 size={14} className="animate-spin" /> Preparing ZIP…</>
                  ) : (
                    <><Download size={14} /> Download ZIP</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </PageShell>
  );
}
