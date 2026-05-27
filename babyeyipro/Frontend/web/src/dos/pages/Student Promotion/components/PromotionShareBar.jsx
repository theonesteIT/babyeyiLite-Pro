import { useState } from 'react';
import { Download, Share2, MessageCircle, Copy, Loader2 } from 'lucide-react';
import {
  copyPromotionShareText,
  downloadPromotionClassPdf,
  openWhatsAppShare,
  sharePromotionClassPdf,
} from '../utils/promotionReportPdf';

export default function PromotionShareBar({ report, disabled = false, className = '' }) {
  const [action, setAction] = useState('');
  const [notice, setNotice] = useState('');

  const run = async (type) => {
    if (!report || disabled) return;
    setAction(type);
    setNotice('');
    try {
      if (type === 'download') {
        downloadPromotionClassPdf(report);
        setNotice('PDF downloaded.');
      } else if (type === 'whatsapp') {
        openWhatsAppShare(report);
        setNotice('WhatsApp opened with summary.');
      } else if (type === 'share') {
        const r = await sharePromotionClassPdf(report);
        if (r.method === 'cancelled') return;
        setNotice(
          r.method === 'file'
            ? 'Shared with PDF attached.'
            : r.method === 'text-only'
              ? 'Summary shared (use Download for PDF on this device).'
              : 'WhatsApp opened with summary.'
        );
      } else if (type === 'copy') {
        await copyPromotionShareText(report);
        setNotice('Summary copied to clipboard.');
      }
    } catch (e) {
      setNotice(e?.message || 'Action failed.');
    } finally {
      setAction('');
    }
  };

  const busy = Boolean(action);

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={busy || disabled || !report}
          onClick={() => run('download')}
          className="flex items-center justify-center gap-2 bg-amber-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-amber-600 transition disabled:opacity-60"
        >
          {action === 'download' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download PDF
        </button>
        <button
          type="button"
          disabled={busy || disabled || !report}
          onClick={() => run('whatsapp')}
          className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-95 transition disabled:opacity-60"
        >
          {action === 'whatsapp' ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
          WhatsApp
        </button>
        <button
          type="button"
          disabled={busy || disabled || !report}
          onClick={() => run('share')}
          className="flex items-center justify-center gap-2 bg-[#000435] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-95 transition disabled:opacity-60"
        >
          {action === 'share' ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
          Share
        </button>
        <button
          type="button"
          disabled={busy || disabled || !report}
          onClick={() => run('copy')}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-60"
        >
          <Copy size={14} />
          Copy summary
        </button>
      </div>
      {notice ? (
        <p className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 mt-3 text-center">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
