import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, School, UserRound, ReceiptText, Copy, ExternalLink, Download } from 'lucide-react';

const SERVER = import.meta.env.VITE_API_URL || 'http://localhost:5100';
const API = `${SERVER}/api`;

export default function InvoiceVerify() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [copyMsg, setCopyMsg] = useState('');
  const invoiceNo = String(sp.get('invoice_no') || '').trim();
  const verifyApiUrl = `${API}/public/babyeyi-pay/invoices/verify/${encodeURIComponent(id || '')}?invoice_no=${encodeURIComponent(invoiceNo)}`;
  const verifyPageUrl = `${window.location.origin}/invoice-verify/${encodeURIComponent(id || '')}?invoice_no=${encodeURIComponent(invoiceNo)}`;

  const validPaid = useMemo(() => String(data?.invoice_status || '').toUpperCase() === 'PAID', [data]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      setData(null);
      try {
        if (!id || !invoiceNo) throw new Error('Missing invoice verification parameters.');
        const res = await fetch(
          `${API}/public/babyeyi-pay/invoices/verify/${encodeURIComponent(id)}?invoice_no=${encodeURIComponent(invoiceNo)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false || !json.valid) {
          throw new Error(json.message || 'Invoice could not be verified.');
        }
        if (!cancelled) setData(json.data || null);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Verification failed.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id, invoiceNo]);

  const copyVerificationLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyPageUrl);
      setCopyMsg('Verification link copied.');
      setTimeout(() => setCopyMsg(''), 2200);
    } catch {
      setCopyMsg('Copy failed. Please copy from address bar.');
      setTimeout(() => setCopyMsg(''), 2600);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1220] via-[#111827] to-[#0B1220] p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-3xl border border-[#FDEAA0]/30 bg-white/[0.06] backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#FDEAA0]/25 bg-gradient-to-r from-[#1F2937] to-[#123A86]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#1A1200] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#FEBF10]" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Babyeyi Invoice Verification</h1>
              <p className="text-xs text-[#EAF2FF]">Scan result from invoice QR code</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="py-14 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#FEBF10]" />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-300/40 bg-red-500/10 p-4">
              <div className="flex items-center gap-2 text-red-200 font-black">
                <XCircle className="w-5 h-5" /> Not Verified
              </div>
              <p className="text-sm text-red-100 mt-2">{error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`rounded-2xl border p-4 ${validPaid ? 'border-[#CFE2FF] bg-[#EAF2FF]/20' : 'border-[#FDEAA0]/40 bg-[#FFFBE8]/10'}`}>
                <div className={`flex items-center gap-2 font-black ${validPaid ? 'text-[#CFE2FF]' : 'text-[#FDEAA0]'}`}>
                  <CheckCircle2 className="w-5 h-5" /> Verified Authentic
                </div>
                <p className="text-xs text-white/75 mt-1">This invoice exists in Babyeyi records.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <InfoCard icon={ReceiptText} label="Invoice No" value={data?.invoice_no || '—'} />
                <InfoCard label="Status" value={String(data?.invoice_status || 'NOT_PAID').toUpperCase()} />
                <InfoCard icon={School} label="School" value={data?.school_name || '—'} />
                <InfoCard icon={UserRound} label="Student" value={data?.student_name || '—'} />
                <InfoCard label="Amount" value={`${Number(data?.amount_rwf || 0).toLocaleString()} RWF`} />
                <InfoCard label="Paid At" value={data?.invoice_paid_at ? new Date(data.invoice_paid_at).toLocaleString() : '—'} />
              </div>
              {validPaid && data?.invoice_id && invoiceNo ? (
                <a
                  href={`${API}/public/babyeyi-pay/receipt/${encodeURIComponent(data.invoice_id)}.pdf?invoice_no=${encodeURIComponent(invoiceNo)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#A7F3D0] bg-[#064E3B]/40 px-4 py-3 text-sm font-black text-[#D1FAE5] hover:bg-[#065F46]/50"
                >
                  <Download className="w-4 h-4" /> Download payment receipt (PDF)
                </a>
              ) : null}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyVerificationLink}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#FDEAA0]/60 bg-white/[0.08] px-3 py-2 text-xs font-black text-[#FDEAA0] hover:bg-white/[0.14]"
              >
                <Copy className="w-3.5 h-3.5" /> Copy verification link
              </button>
              <a
                href={verifyApiUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#CFE2FF]/70 bg-[#EAF2FF]/15 px-3 py-2 text-xs font-black text-[#CFE2FF] hover:bg-[#EAF2FF]/25"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open raw API result
              </a>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl bg-[#FEBF10] px-4 py-2.5 text-sm font-black text-[#1A1200] hover:bg-[#FED44A]"
              >
                Back to Babyeyi
              </Link>
            </div>
            {copyMsg ? <p className="text-xs text-[#FDEAA0] mt-2">{copyMsg}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/55 flex items-center gap-1">
        {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
        {label}
      </p>
      <p className="text-sm font-black text-white mt-1 break-words">{value}</p>
    </div>
  );
}
