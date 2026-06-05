import { useCallback, useEffect, useRef, useState } from 'react';
import { PenLine, Upload, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { getPayslipBranding, uploadAccountantSignature } from '../services/payslipBrandingService';

export default function AccountantSettings() {
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPayslipBranding();
      setBranding(data);
      setPreview(data.accountantSignatureUrl);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const url = await uploadAccountantSignature(file);
      setPreview(url);
      setNotice('Signature saved. It will appear on payslips.');
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans px-4 lg:px-8 py-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-[#000435] font-black text-xl">Accountant Settings</h1>
        <p className="text-slate-400 text-xs mt-1">
          Upload your signature for payslips. School logo, stamp, and head teacher signature come from school registration (Super Admin / public register).
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-100 flex gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="rounded-xl px-4 py-3 text-sm bg-emerald-50 text-emerald-800 border border-emerald-100 flex gap-2">
          <CheckCircle size={16} className="shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-bold text-[#000435] text-sm flex items-center gap-2">
          <PenLine size={16} className="text-amber-500" />
          Your signature (payslips)
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-8">
            <Loader2 size={18} className="animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-6">
              <div className="h-20 min-w-[200px] border border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 px-4">
                {preview ? (
                  <img src={preview} alt="Your signature" className="max-h-16 max-w-[220px] object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">No signature uploaded yet</span>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#000435] text-sm font-bold disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {preview ? 'Replace signature' : 'Upload signature'}
                </button>
                <p className="text-[10px] text-slate-400 mt-2">PNG or JPG on white background, max 2MB</p>
              </div>
            </div>
            {branding?.accountantName && (
              <p className="text-xs text-slate-500">
                Signed as: <strong>{branding.accountantName}</strong> (Accountant)
              </p>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-bold text-[#000435] text-sm flex items-center gap-2">
          <ImageIcon size={16} className="text-blue-600" />
          School assets (read-only)
        </h2>
        <p className="text-xs text-slate-500">
          Managed when the school is registered or updated in Super Admin / School registry — not editable here.
        </p>
        {loading ? null : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'School logo', url: branding?.logoUrl },
              { label: 'Official stamp', url: branding?.stampUrl },
              { label: 'Head teacher signature', url: branding?.headTeacherSignatureUrl },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-100 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">{item.label}</p>
                <div className="h-16 flex items-center justify-center">
                  {item.url ? (
                    <img src={item.url} alt={item.label} className="max-h-14 max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">Not set</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {branding?.headTeacherName && (
          <p className="text-xs text-slate-500">Head teacher: <strong>{branding.headTeacherName}</strong></p>
        )}
      </div>
    </div>
  );
}
