import { useEffect, useMemo, useState } from 'react';
import {
  FileImage, FileCheck, ExternalLink, Download, X, FileText, Loader2, AlertCircle,
} from 'lucide-react';
import { font } from '../utils/theme';
import { resolveUrl } from '../utils/helpers';

function fileKind(url, title = '', mime = '') {
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('pdf')) return 'pdf';
  const probe = `${url || ''} ${title || ''}`.toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|bmp)(\?|$)/i.test(probe)) return 'image';
  if (/\.pdf(\?|$)/i.test(probe)) return 'pdf';
  return 'other';
}

export default function DocViewerModal({ url, title, onClose }) {
  const absoluteUrl = resolveUrl(url);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mime, setMime] = useState('');

  const kind = useMemo(() => fileKind(absoluteUrl, title, mime), [absoluteUrl, title, mime]);

  useEffect(() => {
    if (!absoluteUrl) return undefined;
    let objectUrl = null;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setBlobUrl(null);
      setMime('');
      try {
        const res = await fetch(absoluteUrl, {
          credentials: 'include',
          mode: 'cors',
          headers: { Accept: 'application/pdf,image/*,*/*' },
        });
        if (!res.ok) throw new Error(`Document could not be loaded (${res.status})`);
        const blob = await res.blob();
        if (cancelled) return;
        setMime(blob.type || '');
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load document preview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [absoluteUrl]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!absoluteUrl) return null;

  const previewSrc = blobUrl || absoluteUrl;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-[#000435]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ fontFamily: font }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Document preview'}
    >
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#fde68a] bg-white shadow-2xl sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#fde68a] bg-[#fffbeb] px-4 py-3 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {kind === 'image' ? (
              <FileImage className="h-4 w-4 shrink-0 text-amber-700" />
            ) : (
              <FileCheck className="h-4 w-4 shrink-0 text-amber-700" />
            )}
            <h3 className="m-0 truncate text-sm font-bold text-[#000435]">{title || 'Document'}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={absoluteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#fde68a] bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-800 no-underline hover:bg-amber-50"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
            <a
              href={previewSrc}
              download={title || 'document'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#fde68a] bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-800 no-underline hover:bg-amber-50"
            >
              <Download className="h-3.5 w-3.5" /> Save
            </a>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-none bg-[#000435]/5 text-[#000435] hover:bg-[#000435]/10"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center overflow-auto bg-[#f8fafc] p-3 sm:min-h-[420px] sm:p-4">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
              <p className="m-0 text-sm font-medium text-[#000435]/70">Loading document…</p>
            </div>
          )}
          {!loading && error && (
            <div className="max-w-sm rounded-2xl border border-[#fde68a] bg-white p-6 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-amber-600" />
              <p className="m-0 mb-1 text-sm font-bold text-[#000435]">Preview unavailable</p>
              <p className="m-0 mb-4 text-xs text-amber-800/80">{error}</p>
              <a
                href={absoluteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#000435] px-4 py-2.5 text-xs font-semibold text-amber-400 no-underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
              </a>
            </div>
          )}
          {!loading && !error && kind === 'image' && (
            <img
              src={previewSrc}
              alt={title || 'Document'}
              className="max-h-[min(72vh,720px)] w-full max-w-full rounded-xl object-contain shadow-lg"
            />
          )}
          {!loading && !error && kind === 'pdf' && (
            <embed
              src={`${previewSrc}#toolbar=1&navpanes=0`}
              type="application/pdf"
              title={title || 'PDF preview'}
              className="h-[min(72vh,720px)] w-full rounded-xl border border-[#fde68a] bg-white shadow-inner"
            />
          )}
          {!loading && !error && kind === 'other' && (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-[#fde68a]" />
              <p className="m-0 mb-3 text-sm font-semibold text-[#000435]">Inline preview not supported</p>
              <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-amber-700 underline">
                Open file directly
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
