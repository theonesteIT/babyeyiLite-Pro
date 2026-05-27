import { useState, useEffect, useRef } from 'react';
import { User, Lock, Bell, Loader2, Upload, Mail, Shield, Calendar } from 'lucide-react';
import { ALL_TERMS_LABEL, ALL_TERMS_VALUE, TERM_OPTIONS } from '../../../../utils/babyeyiAcademicPeriod';
import { useAuth } from '../../../../context/AuthContext';
import { font } from '../utils/theme';
import { apiFetch, API_BASE, NESA_API, AUTH_API, apiFetchForm } from '../utils/api';
import { profilePhotoUrl } from '../utils/helpers';
import {
  getNesaPushState, subscribeNesaPush, unsubscribeNesaPush, isWebPushEnvironmentSupported,
} from '../utils/webPushNesa';

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'academic', label: 'Academic period', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsPage({
  toast,
  academicPeriod,
  yearOptions = [],
  termOptions = [],
  onAcademicPeriodChange,
}) {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState('account');
  const [draftYear, setDraftYear] = useState(academicPeriod?.academicYear || '');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    setDraftYear(academicPeriod?.academicYear || '');
  }, [academicPeriod?.academicYear]);
  const [pwSaving, setPwSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const photoRef = useRef(null);
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
  });
  const [pushState, setPushState] = useState(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  useEffect(() => {
    apiFetch(`${NESA_API}/settings`)
      .then((r) => setPrefs(r.data || prefs))
      .catch(() => {});
    getNesaPushState().then(setPushState).catch(() => {});
  }, []);

  const savePrefs = async () => {
    setPrefsSaving(true);
    try {
      await apiFetch(`${NESA_API}/settings`, { method: 'PUT', body: JSON.stringify(prefs) });
      toast?.('Notification preferences saved.', 'success');
    } catch (e) {
      toast?.(e.message || 'Failed to save', 'error');
    } finally {
      setPrefsSaving(false);
    }
  };

  const changePassword = async () => {
    if (pw.next !== pw.confirm) {
      toast?.('Passwords do not match', 'error');
      return;
    }
    if (pw.next.length < 8) {
      toast?.('Password must be at least 8 characters', 'error');
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch(`${AUTH_API}/change-password`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || 'Failed');
      setPw({ current: '', next: '', confirm: '' });
      toast?.('Password updated.', 'success');
    } catch (e) {
      toast?.(e.message || 'Failed to change password', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return;
    setPhotoSaving(true);
    try {
      const fd = new FormData();
      fd.append('photo', photoFile);
      await apiFetchForm(`${AUTH_API}/profile/photo`, 'POST', fd);
      setPhotoFile(null);
      setPhotoPreview(null);
      if (photoRef.current) photoRef.current.value = '';
      refresh?.();
      toast?.('Profile photo updated.', 'success');
    } catch (e) {
      toast?.(e.message || 'Upload failed', 'error');
    } finally {
      setPhotoSaving(false);
    }
  };

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushState?.subscribed) {
        await unsubscribeNesaPush();
        toast?.('Browser notifications disabled.', 'info');
      } else {
        await subscribeNesaPush();
        toast?.('Browser notifications enabled.', 'success');
      }
      setPushState(await getNesaPushState());
    } catch (e) {
      toast?.(e.message || 'Push setup failed', 'error');
    } finally {
      setPushBusy(false);
    }
  };

  const photoSrc = photoPreview || (user?.photo ? profilePhotoUrl(user.photo) : null);

  return (
    <div className="mx-auto max-w-3xl space-y-5 anim" style={{ fontFamily: font }}>
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[#fde68a] bg-white p-1.5 shadow-sm">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-colors ${
              tab === id ? 'bg-[#000435] text-amber-400' : 'text-amber-900 hover:bg-amber-50'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-[#fde68a] bg-white p-5 shadow-sm">
            <h3 className="m-0 mb-4 flex items-center gap-2 text-sm font-black text-[#000435]">
              <User size={18} className="text-amber-600" /> Profile
            </h3>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#fde68a] bg-[#fffbeb]">
                {photoSrc ? (
                  <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={40} className="text-amber-400" />
                )}
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <p className="m-0 font-bold text-[#000435]">{user?.fullName || user?.first_name}</p>
                <p className="m-0 flex items-center justify-center gap-1 text-sm text-amber-800 sm:justify-start">
                  <Mail size={14} /> {user?.email}
                </p>
                <input
                  ref={photoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPhotoFile(f);
                      setPhotoPreview(URL.createObjectURL(f));
                    }
                  }}
                />
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#fde68a] px-3 py-2 text-xs font-bold text-amber-900"
                  >
                    <Upload size={14} /> Choose image
                  </button>
                  {photoFile && (
                    <button
                      type="button"
                      disabled={photoSaving}
                      onClick={uploadPhoto}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#000435] px-3 py-2 text-xs font-bold text-amber-400"
                    >
                      {photoSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                      Save photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#fde68a] bg-white p-5 shadow-sm">
            <h3 className="m-0 mb-4 flex items-center gap-2 text-sm font-black text-[#000435]">
              <Lock size={18} className="text-amber-600" /> Change password
            </h3>
            <div className="space-y-3">
              {['current', 'next', 'confirm'].map((k) => (
                <input
                  key={k}
                  type="password"
                  placeholder={k === 'current' ? 'Current password' : k === 'next' ? 'New password' : 'Confirm new password'}
                  value={pw[k]}
                  onChange={(e) => setPw((p) => ({ ...p, [k]: e.target.value }))}
                  className="w-full rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-2.5 text-[13px]"
                />
              ))}
              <button
                type="button"
                disabled={pwSaving}
                onClick={changePassword}
                className="w-full cursor-pointer rounded-xl bg-[#000435] py-3 text-sm font-bold text-amber-400 sm:w-auto sm:px-8"
              >
                {pwSaving ? <Loader2 className="mx-auto animate-spin" size={18} /> : 'Update password'}
              </button>
            </div>
          </section>
        </div>
      )}

      {tab === 'academic' && (
        <section className="rounded-2xl border border-[#fde68a] bg-white p-5 shadow-sm">
          <h3 className="m-0 mb-4 flex items-center gap-2 text-sm font-black text-[#000435]">
            <Calendar size={18} className="text-amber-600" /> Default academic period
          </h3>
          <p className="m-0 mb-4 text-xs text-amber-800/80">
            These values load on Tuition Manager and apply across Monitoring, Approvals, Analytics, and Schools.
            Term labels match school Babyeyi lite (Term 1, Term 2, Term 3).
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-amber-800/80">Academic year</span>
              <input
                type="text"
                value={draftYear}
                onChange={(e) => setDraftYear(e.target.value)}
                onBlur={() => onAcademicPeriodChange?.({ academicYear: draftYear, term: academicPeriod?.term || '' })}
                placeholder="e.g. 2027-2028 or leave empty"
                list="nesa-settings-academic-years"
                className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[13px] font-semibold"
              />
              <datalist id="nesa-settings-academic-years">
                {(yearOptions || []).map((y) => (
                  <option key={y} value={y} />
                ))}
              </datalist>
              <span className="text-[10px] text-amber-800/70">YYYY-YYYY — from NESA fee limits you create</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase text-amber-800/80">Term</span>
              <select
                value={academicPeriod?.term ?? ''}
                onChange={(e) => onAcademicPeriodChange?.({ academicYear: academicPeriod?.academicYear || '', term: e.target.value })}
                className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-[13px] font-semibold"
              >
                <option value={ALL_TERMS_VALUE}>{ALL_TERMS_LABEL}</option>
                {(termOptions.length ? termOptions : TERM_OPTIONS).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
      )}

      {tab === 'notifications' && (
        <section className="rounded-2xl border border-[#fde68a] bg-white p-5 shadow-sm">
          <h3 className="m-0 mb-4 flex items-center gap-2 text-sm font-black text-[#000435]">
            <Shield size={18} className="text-amber-600" /> Alert preferences
          </h3>
          <div className="space-y-4">
            {[
              { key: 'inAppNotifications', label: 'In-app notifications', desc: 'Show alerts in the NESA notification center' },
              { key: 'pushNotifications', label: 'Web push (browser)', desc: 'Desktop/mobile browser notifications when DEO sends requests' },
              { key: 'emailNotifications', label: 'Email alerts', desc: 'Receive email when configured on server' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
                <input
                  type="checkbox"
                  checked={!!prefs[key]}
                  onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                  className="mt-1 h-4 w-4 accent-[#000435]"
                />
                <span>
                  <span className="block text-sm font-bold text-[#000435]">{label}</span>
                  <span className="block text-xs text-amber-800/80">{desc}</span>
                </span>
              </label>
            ))}

            {isWebPushEnvironmentSupported() && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="m-0 text-sm font-bold text-blue-900">Browser subscription</p>
                <p className="m-0 mt-1 text-xs text-blue-800/80">
                  {pushState?.configured
                    ? pushState.subscribed
                      ? 'You are subscribed to web push on this device.'
                      : 'Enable push to get instant alerts when a DEO recommends a request.'
                    : 'Server VAPID keys are not configured — contact your administrator.'}
                </p>
                {pushState?.configured && (
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={togglePush}
                    className="mt-3 cursor-pointer rounded-xl bg-[#000435] px-4 py-2 text-xs font-bold text-amber-400"
                  >
                    {pushBusy ? '…' : pushState.subscribed ? 'Unsubscribe' : 'Enable web push'}
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={prefsSaving}
              onClick={savePrefs}
              className="w-full cursor-pointer rounded-xl bg-[#000435] py-3 text-sm font-bold text-amber-400"
            >
              {prefsSaving ? 'Saving…' : 'Save preferences'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
