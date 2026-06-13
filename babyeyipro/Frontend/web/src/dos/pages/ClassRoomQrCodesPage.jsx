import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Printer, QrCode, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import dosApi from '../services/api';
import { h } from '../utils/href';
import { NAVY, AMBER } from './opsTheme';

function QrThumb({ className, size = 180 }) {
  const [src, setSrc] = useState('');
  const blobUrl = useRef('');
  useEffect(() => {
    dosApi.get(`/dos/class-qr-codes/${encodeURIComponent(className)}/image`, {
      params: { size },
      responseType: 'blob',
    })
      .then((r) => {
        if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
        blobUrl.current = URL.createObjectURL(r.data);
        setSrc(blobUrl.current);
      })
      .catch(() => setSrc(''));
    return () => {
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = '';
    };
  }, [className, size]);
  if (!src) return <div className="mx-auto w-[180px] h-[180px] rounded-lg bg-[#000435]/5 animate-pulse" />;
  return <img src={src} alt={`QR ${className}`} className="mx-auto rounded-lg bg-white p-2 border border-[#000435]/10" width={size} height={size} />;
}

export default function ClassRoomQrCodesPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [printSize, setPrintSize] = useState(400);
  const [meta, setMeta] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    dosApi.get('/dos/class-qr-codes')
      .then((r) => {
        if (r.data?.success) {
          setCodes(r.data.data || []);
          setMeta(r.data.meta || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateAll = () => {
    setGenerating(true);
    dosApi.post('/dos/class-qr-codes/generate', {})
      .then((r) => { if (r.data?.success) setCodes(r.data.data || []); })
      .finally(() => setGenerating(false));
  };

  const handlePrint = async (className) => {
    try {
      const r = await dosApi.get(`/dos/class-qr-codes/${encodeURIComponent(className)}/image`, {
        params: { size: printSize },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(r.data);
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write(`
        <html><head><title>${className} QR</title>
        <style>body{display:flex;flex-direction:column;align-items:center;font-family:sans-serif;padding:24px;color:${NAVY}}
        h1{margin-bottom:16px;color:${NAVY}}img{width:${printSize}px;height:${printSize}px}</style></head>
        <body><h1>${className}</h1><img src="${url}" onload="window.print()" /></body></html>
      `);
      w.document.close();
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-full bg-white text-[#000435]">
      <div className="border-b border-[#000435]/10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: AMBER }}>Operations Command Center</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
                <QrCode size={22} style={{ color: AMBER }} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#000435]">Class room QR codes</h1>
                <p className="text-xs text-[#000435]/45 mt-1">
                  All registered school classes · {meta?.registered_class_count ?? codes.length} classes · {meta?.term} {meta?.academic_year}
                </p>
              </div>
            </div>
            <Link to={h('/operations-center')} className="text-xs font-bold hover:opacity-80" style={{ color: AMBER }}>
              ← Back to live command center
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 bg-[#fafafa] min-h-[60vh]">
        <div className="flex flex-wrap gap-3 items-center mb-6 p-4 rounded-2xl border border-[#000435]/10 bg-white shadow-sm">
          <button type="button" onClick={generateAll} disabled={generating}
            className="px-4 py-2 rounded-xl text-white text-xs font-black uppercase tracking-wider disabled:opacity-50"
            style={{ background: AMBER }}>
            {generating ? <Loader2 className="animate-spin inline mr-2" size={14} /> : <ScanLine className="inline mr-2" size={14} />}
            Generate all registered classes
          </button>
          <button type="button" onClick={load}
            className="px-4 py-2 rounded-xl border border-[#000435]/15 text-xs font-bold text-[#000435] hover:bg-[#000435]/5">
            Refresh
          </button>
          <label className="text-xs text-[#000435]/50 font-semibold flex items-center gap-2 ml-auto">
            Print size
            <input type="range" min={200} max={800} step={50} value={printSize} onChange={(e) => setPrintSize(Number(e.target.value))}
              className="w-28 accent-amber-500" />
            <span className="tabular-nums w-14 text-[#000435]">{printSize}px</span>
          </label>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={36} style={{ color: AMBER }} /></div>
        ) : codes.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-[#000435]/10 bg-white">
            <QrCode size={40} className="mx-auto text-[#000435]/15 mb-4" />
            <p className="text-[#000435]/50">No QR codes yet. Click Generate all registered classes.</p>
            {meta?.registered_class_count > 0 && (
              <p className="text-xs text-[#000435]/40 mt-2">{meta.registered_class_count} classes registered at this school</p>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {codes.map((c) => (
              <div key={c.id || c.class_name} className="rounded-2xl border border-[#000435]/10 bg-white p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                <p className="font-black text-lg text-[#000435] mb-4">{c.class_name}</p>
                <QrThumb className={c.class_name} size={180} />
                <button type="button" onClick={() => handlePrint(c.class_name)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#000435]/15 text-xs font-black uppercase tracking-wider text-[#000435] hover:bg-amber-50 hover:border-amber-300">
                  <Printer size={14} /> Print
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
