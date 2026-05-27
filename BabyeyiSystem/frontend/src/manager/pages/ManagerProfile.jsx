import { useRef, useState, useEffect } from 'react';
import { User, Upload, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProfileModal from '../../shared/components/ProfileModal';
import { API_BASE } from '../lib/schoolLiteApi';
import { resolveUserPhotoUrl } from '../../shared/utils/userPhotoUrl';

export default function ManagerProfile() {
  const { manager, setManager, refresh } = useAuth();
  const photoInputRef = useRef(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMsg, setPhotoMsg] = useState(null);

  const photoUrl = manager?.photo ? resolveUserPhotoUrl(manager.photo) : null;
  const displaySrc = photoPreview || photoUrl;

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">My profile</h2>
        <p className="text-xs text-slate-500 mt-1">Update your photo and account details.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
          <User size={14} className="text-re-navy" strokeWidth={2} />
          Profile photo
        </h3>
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative h-24 w-24 shrink-0 rounded-full border-4 border-re-gold/80 overflow-hidden bg-slate-100 shadow-inner">
            {displaySrc ? (
              <img src={displaySrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-re-navy to-re-navy-dark text-re-gold font-bold text-xl">
                {manager
                  ? `${(manager.first_name || '')[0] || ''}${(manager.last_name || '')[0] || ''}`.toUpperCase()
                  : '?'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target?.files?.[0];
                if (file) {
                  setPhotoFile(file);
                  setPhotoPreview(URL.createObjectURL(file));
                  setPhotoMsg(null);
                }
              }}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-white hover:border-re-gold/40 transition-colors"
            >
              <Upload size={14} strokeWidth={2} />
              Choose image
            </button>
            {photoFile && (
              <button
                type="button"
                disabled={photoSaving}
                onClick={async () => {
                  setPhotoSaving(true);
                  setPhotoMsg(null);
                  try {
                    const fd = new FormData();
                    fd.append('photo', photoFile);
                    const res = await fetch(`${API_BASE}/auth/profile/photo`, {
                      method: 'POST',
                      credentials: 'include',
                      body: fd,
                    });
                    const json = await res.json().catch(() => ({}));
                    if (res.ok && json.success && json.data?.photo) {
                      setPhotoFile(null);
                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                      setPhotoPreview(null);
                      if (photoInputRef.current) photoInputRef.current.value = '';
                      setManager((prev) => (prev ? { ...prev, photo: json.data.photo } : prev));
                      await refresh();
                      setPhotoMsg({ type: 'ok', text: 'Profile photo updated.' });
                    } else {
                      setPhotoMsg({ type: 'err', text: json.message || 'Upload failed.' });
                    }
                  } catch {
                    setPhotoMsg({ type: 'err', text: 'Network error. Try again.' });
                  } finally {
                    setPhotoSaving(false);
                  }
                }}
                className="ml-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#000435] to-[#1E3A5F] px-4 py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {photoSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                {photoSaving ? 'Uploading…' : 'Upload'}
              </button>
            )}
            <p className="text-[11px] text-slate-500 mt-2">JPEG, PNG or WebP. This photo appears in the header for all manager pages.</p>
            {photoMsg && (
              <p className={`text-xs font-semibold mt-2 ${photoMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                {photoMsg.text}
              </p>
            )}
          </div>
        </div>
      </div>

      <ProfileModal
        variant="inline"
        open
        onClose={() => {}}
        user={manager}
        onUserUpdate={(updates) => setManager((prev) => (prev ? { ...prev, ...updates } : prev))}
      />
    </div>
  );
}
