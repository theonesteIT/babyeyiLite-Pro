import React, { useEffect, useRef, useState } from 'react';
import {
  User, Upload, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle, Mail, Building2,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TeacherOrangeHero from '../components/TeacherOrangeHero';
import {
  resolveTeacherPhotoUrl,
  teacherDisplayName,
  teacherInitials,
} from '../utils/teacherDisplay';

export default function TeacherProfile() {
  const { teacher, refreshTeacher, updateTeacher } = useAuth();
  const photoInputRef = useRef(null);

  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoMsg, setPhotoMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  const forceChange = !!teacher?.force_password_change;
  const photoUrl = resolveTeacherPhotoUrl(teacher?.photo);
  const displaySrc = photoPreview || photoUrl;
  const initials = teacherInitials(teacher);
  const displayName = teacherDisplayName(teacher);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const handlePhotoUpload = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    setPhotoMsg(null);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      const res = await api.post('/auth/profile/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success && res.data?.data?.photo) {
        updateTeacher({ photo: res.data.data.photo });
        await refreshTeacher();
        setPhotoFile(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        if (photoInputRef.current) photoInputRef.current.value = '';
        setPhotoMsg({ type: 'ok', text: 'Profile photo updated.' });
      } else {
        setPhotoMsg({ type: 'err', text: res.data?.message || 'Upload failed.' });
      }
    } catch (err) {
      setPhotoMsg({ type: 'err', text: err.response?.data?.message || 'Network error. Try again.' });
    } finally {
      setPhotoSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);

    if (!forceChange && !currentPassword) {
      setPwMsg({ type: 'err', text: 'Enter your current password.' });
      return;
    }
    if (!newPassword) {
      setPwMsg({ type: 'err', text: 'Enter a new password.' });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: 'err', text: 'New password must be at least 8 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }

    setPwSaving(true);
    try {
      const body = { newPassword };
      if (!forceChange) body.currentPassword = currentPassword;
      const res = await api.put('/auth/change-password', body);
      if (res.data?.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        updateTeacher({ force_password_change: false });
        await refreshTeacher();
        setPwMsg({ type: 'ok', text: 'Password changed successfully.' });
      } else {
        setPwMsg({ type: 'err', text: res.data?.message || 'Failed to change password.' });
      }
    } catch (err) {
      setPwMsg({ type: 'err', text: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 bg-re-bg min-h-screen">
      <TeacherOrangeHero
        title="My profile"
        subtitle="Update your photo and account password"
        badgeLabel="Account settings"
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 pb-16 relative z-10 space-y-5">
        {forceChange && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
            <p className="font-medium">
              Your school requires a new password before you continue. Set a strong password below.
            </p>
          </div>
        )}

        {/* Account summary */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-black/5 bg-re-bg flex items-center justify-center shrink-0">
              {displaySrc ? (
                <img src={displaySrc} alt="" className="w-full h-full object-cover" />
              ) : (
                <span
                  className="text-lg font-bold text-white w-full h-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
                >
                  {initials}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-re-text truncate">
                {displayName}
              </p>
              <p className="text-xs text-re-text-muted flex items-center gap-1.5 mt-1 truncate">
                <Mail size={12} className="shrink-0 opacity-50" />
                {teacher?.email || '—'}
              </p>
              <p className="text-xs text-re-text-muted flex items-center gap-1.5 mt-0.5 truncate">
                <Building2 size={12} className="shrink-0 opacity-50" />
                {teacher?.school?.name || teacher?.school_name || 'Your school'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile photo */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-xs font-bold text-re-text uppercase tracking-widest mb-4 flex items-center gap-2">
            <User size={14} className="text-re-orange" />
            Profile photo
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="relative h-28 w-28 shrink-0 rounded-full border-4 border-re-orange/30 overflow-hidden bg-re-bg shadow-inner mx-auto sm:mx-0">
              {displaySrc ? (
                <img src={displaySrc} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target?.files?.[0];
                  if (!file) return;
                  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
                    setPhotoMsg({ type: 'err', text: 'Use JPEG, PNG, or WebP only.' });
                    return;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    setPhotoMsg({ type: 'err', text: 'Image must be under 5MB.' });
                    return;
                  }
                  setPhotoFile(file);
                  setPhotoPreview((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(file);
                  });
                  setPhotoMsg(null);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-re-bg px-4 py-2.5 text-xs font-bold text-re-text hover:border-re-orange/30 hover:bg-white transition-colors"
                >
                  <Upload size={14} />
                  Choose image
                </button>
                {photoFile && (
                  <button
                    type="button"
                    disabled={photoSaving}
                    onClick={handlePhotoUpload}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-re-glow disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
                  >
                    {photoSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                    {photoSaving ? 'Uploading…' : 'Save photo'}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-re-text-muted leading-relaxed">
                This photo appears in the top bar and sidebar across the teacher portal.
              </p>
              {photoMsg && (
                <p className={`text-xs font-semibold flex items-center gap-1.5 ${photoMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {photoMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                  {photoMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Change password */}
        <div className="rounded-2xl border border-black/5 bg-white p-5 sm:p-6 shadow-sm">
          <h2 className="text-xs font-bold text-re-text uppercase tracking-widest mb-4 flex items-center gap-2">
            <Lock size={14} className="text-re-orange" />
            Change password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {!forceChange && (
              <div>
                <label className="block text-[10px] font-bold text-re-text-muted uppercase tracking-widest mb-1.5">
                  Current password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/50 px-4 pr-11 text-sm text-re-text outline-none focus:border-re-orange/40 focus:ring-2 focus:ring-re-orange/10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted hover:text-re-orange"
                    aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-re-text-muted uppercase tracking-widest mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/50 px-4 pr-11 text-sm text-re-text outline-none focus:border-re-orange/40 focus:ring-2 focus:ring-re-orange/10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted hover:text-re-orange"
                  aria-label={showNewPw ? 'Hide password' : 'Show password'}
                >
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-re-text-muted uppercase tracking-widest mb-1.5">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-11 rounded-xl border border-black/10 bg-re-bg/50 px-4 pr-11 text-sm text-re-text outline-none focus:border-re-orange/40 focus:ring-2 focus:ring-re-orange/10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-re-text-muted hover:text-re-orange"
                  aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {pwMsg && (
              <p className={`text-xs font-semibold flex items-center gap-1.5 ${pwMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                {pwMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                {pwMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={pwSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl text-sm font-bold text-white disabled:opacity-60 shadow-re-glow"
              style={{ background: 'linear-gradient(135deg,#FF8C00,#FF5E00)' }}
            >
              {pwSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
              {pwSaving ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
