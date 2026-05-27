import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Calendar,
  Loader2,
  Lock,
  Mail,
  Moon,
  Save,
  Smartphone,
  Sun,
  Upload,
  User,
} from 'lucide-react';
import { API, apiFetch, apiFetchMultipart } from '../utils/api';
import { profilePhotoUrl } from '../utils/helpers';
import { useDeoTheme } from '../utils/DeoThemeContext';
import { ALL_TERMS_LABEL, ALL_TERMS_VALUE } from '../../../../utils/babyeyiAcademicPeriod';
import {
  getDeoPushState,
  isWebPushEnvironmentSupported,
  subscribeDeoPush,
  unsubscribeDeoPush,
} from '../utils/webPushDeo';

const TABS = [
  { id: 'account', label: 'Account', shortLabel: 'Account', icon: User, title: 'Account', subtitle: 'Profile photo, login email and password' },
  { id: 'academic', label: 'Academic period', shortLabel: 'Academic', icon: Calendar, title: 'Academic period', subtitle: 'Default year and term for all district tabs' },
  { id: 'preferences', label: 'Appearance & notifications', shortLabel: 'Alerts', icon: Bell, title: 'Appearance & notifications', subtitle: 'Theme and alerts when schools submit Babyeyi' },
];

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
        on ? 'bg-[#000435]' : 'bg-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function TabPanel({ meta, darkMode, children, footer }) {
  const Icon = meta.icon;
  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-[0_2px_16px_rgba(0,4,53,0.06)] ${
        darkMode ? 'border-slate-700 bg-slate-900' : 'border-[#fde68a]/80 bg-white'
      }`}
    >
      <header className="relative overflow-hidden bg-gradient-to-r from-[#000435] to-[#000c6e] px-5 py-5 sm:px-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, #fbbf24 0%, transparent 55%)' }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 ring-1 ring-amber-400/30">
            <Icon className="h-5 w-5 text-amber-400" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="m-0 text-base font-bold tracking-tight text-white sm:text-lg">{meta.title}</h3>
            <p className="m-0 mt-0.5 text-xs leading-relaxed text-amber-200/85">{meta.subtitle}</p>
          </div>
        </div>
      </header>

      <div className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-[#fde68a]/70'} px-5 py-1 sm:px-6`}>
        {children}
      </div>

      {footer && (
        <div className={`border-t px-5 py-4 sm:px-6 ${darkMode ? 'border-slate-700 bg-slate-900/80' : 'border-[#fde68a]/70 bg-[#F8FAFC]'}`}>
          {footer}
        </div>
      )}
    </div>
  );
}

function FieldBlock({ label, hint, children, darkMode }) {
  return (
    <div className="py-5">
      {label && (
        <p className={`m-0 text-sm font-bold ${darkMode ? 'text-white' : 'text-[#000435]'}`}>{label}</p>
      )}
      {hint && (
        <p className={`m-0 mt-0.5 text-xs ${darkMode ? 'text-slate-400' : 'text-[#000435]/55'}`}>{hint}</p>
      )}
      <div className={label || hint ? 'mt-3' : ''}>{children}</div>
    </div>
  );
}

export default function SettingsTab({
  deo,
  toast,
  onEmailUpdated,
  onPhotoUpdated,
  onPrefsUpdated,
  academicPeriod,
  yearOptions = [],
  termOptions = [],
  onAcademicPeriodChange,
}) {
  const { darkMode, setDarkMode } = useDeoTheme();
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
  });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pushState, setPushState] = useState({ supported: false, subscribed: false, configured: false });
  const [pushBusy, setPushBusy] = useState(false);

  const activeMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/district/babyeyi/settings');
      const d = r.data || {};
      setEmail(d.email || '');
      setPhotoUrl(d.photo || deo?.photo || null);
      setPrefs({
        emailNotifications: d.emailNotifications !== false,
        pushNotifications: d.pushNotifications !== false,
        inAppNotifications: d.inAppNotifications !== false,
      });
      if (d.darkMode != null) setDarkMode(!!d.darkMode);
      onPrefsUpdated?.(d);
    } catch (e) {
      toast?.(e.message || 'Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [deo?.photo, setDarkMode, toast, onPrefsUpdated]);

  useEffect(() => {
    load();
    getDeoPushState().then(setPushState).catch(() => {});
  }, [load]);

  const displayPhoto = photoPreview || profilePhotoUrl(photoUrl);

  const uploadProfilePhoto = async () => {
    if (!photoFile) return null;
    const fd = new FormData();
    fd.append('photo', photoFile);
    let r;
    try {
      r = await apiFetchMultipart('/district/babyeyi/profile/photo', fd, 'POST');
    } catch (districtErr) {
      r = await apiFetchMultipart('/auth/profile/photo', fd, 'POST');
      if (!r?.data?.photo && !r?.photo) {
        throw districtErr;
      }
    }
    const path = r.data?.photo || r.photo;
    if (path) {
      setPhotoUrl(path);
      setPhotoFile(null);
      setPhotoPreview(null);
      if (photoInputRef.current) photoInputRef.current.value = '';
      onPhotoUpdated?.(path);
    }
    return path;
  };

  const saveAccountTab = async () => {
    setSavingAccount(true);
    try {
      if (photoFile) await uploadProfilePhoto();

      const r = await apiFetch('/district/babyeyi/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      onEmailUpdated?.(r.data?.email);

      const wantsPassword = pw.current || pw.next || pw.confirm;
      if (wantsPassword) {
        if (pw.next !== pw.confirm) {
          toast?.('Passwords do not match', 'error');
          return;
        }
        if (pw.next.length < 8) {
          toast?.('Password must be at least 8 characters', 'error');
          return;
        }
        if (!pw.current) {
          toast?.('Enter your current password', 'error');
          return;
        }
        const res = await fetch(`${API}/auth/change-password`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          toast?.(json.message || 'Password change failed', 'error');
          return;
        }
        setPw({ current: '', next: '', confirm: '' });
      }

      toast?.('Account settings saved', 'success');
    } catch (e) {
      toast?.(e.message || 'Save failed', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const savePreferencesTab = async () => {
    setSavingPrefs(true);
    try {
      const r = await apiFetch('/district/babyeyi/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications: prefs.emailNotifications,
          pushNotifications: prefs.pushNotifications,
          inAppNotifications: prefs.inAppNotifications,
          darkMode,
        }),
      });
      onPrefsUpdated?.(r.data);
      toast?.('Appearance & notification settings saved', 'success');
    } catch (e) {
      toast?.(e.message || 'Save failed', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const togglePushDevice = async () => {
    setPushBusy(true);
    try {
      if (pushState.subscribed) {
        await unsubscribeDeoPush();
        setPushState((s) => ({ ...s, subscribed: false }));
        toast?.('Browser push disabled', 'info');
      } else {
        await subscribeDeoPush();
        setPushState((s) => ({ ...s, subscribed: true }));
        setPrefs((p) => ({ ...p, pushNotifications: true }));
        toast?.('Browser push enabled — save to keep preference', 'info');
      }
    } catch (e) {
      toast?.(e.message || 'Push setup failed', 'error');
    } finally {
      setPushBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  const inputCls = darkMode
    ? 'w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-900/30'
    : 'w-full rounded-xl border border-[#fde68a] bg-white px-3 py-2.5 text-sm text-[#000435] outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100';

  const saveBtn = (saving, label, onSave) => (
    <button
      type="button"
      disabled={saving}
      onClick={onSave}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#000435] py-3 text-sm font-bold text-amber-400 shadow-md transition hover:bg-[#000c6e] disabled:opacity-60"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {label}
    </button>
  );

  return (
    <div className="anim mx-auto max-w-3xl pb-8" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <div className="mb-4">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">Portal</p>
        <h2 className={`m-0 mt-0.5 text-xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-[#000435]'}`}>
          Settings
        </h2>
        <p className={`m-0 mt-1 text-xs ${darkMode ? 'text-slate-400' : 'text-[#000435]/55'}`}>
          {deo?.fullName} · {deo?.district}
        </p>
      </div>

      <div
        className={`mb-4 flex gap-1 rounded-xl border p-1 ${
          darkMode ? 'border-slate-700 bg-slate-900/80' : 'border-[#fde68a]/80 bg-white shadow-sm'
        }`}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-bold transition sm:text-xs ${
                isActive
                  ? 'bg-[#000435] text-amber-400 shadow-sm'
                  : darkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-[#000435]/55 hover:bg-amber-50/80 hover:text-[#000435]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'account' && (
        <TabPanel
          meta={activeMeta}
          darkMode={darkMode}
          footer={saveBtn(savingAccount, 'Save account changes', saveAccountTab)}
        >
          <FieldBlock label="Profile photo" hint="Shown in the sidebar and header" darkMode={darkMode}>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-[#fde68a] bg-amber-50 shadow-sm">
                {displayPhoto ? (
                  <img src={displayPhoto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#000435]">
                    <span className="text-xl font-bold text-amber-400">{(deo?.fullName || 'D')[0]}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-1">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 2 * 1024 * 1024) {
                      toast?.('Image must be under 2MB', 'error');
                      return;
                    }
                    setPhotoFile(f);
                    setPhotoPreview(URL.createObjectURL(f));
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-bold transition ${
                    darkMode
                      ? 'border-slate-600 bg-slate-800 text-white hover:bg-slate-700'
                      : 'border-[#fde68a] bg-white text-[#000435] hover:bg-amber-50'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  Choose image
                </button>
                {photoFile && (
                  <p className="m-0 text-[11px] font-medium text-amber-700">New photo ready — save to upload</p>
                )}
                <p className={`m-0 text-[11px] ${darkMode ? 'text-slate-500' : 'text-[#000435]/45'}`}>
                  JPEG, PNG or WebP · max 2MB
                </p>
              </div>
            </div>
          </FieldBlock>

          <FieldBlock label="Login email" hint="Used to sign in to this portal" darkMode={darkMode}>
            <input
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@district.gov.rw"
              autoComplete="email"
            />
          </FieldBlock>

          <FieldBlock label="Password" hint="Leave blank to keep your current password" darkMode={darkMode}>
            <div className="space-y-2.5">
              <input
                type="password"
                className={inputCls}
                placeholder="Current password"
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                autoComplete="current-password"
              />
              <input
                type="password"
                className={inputCls}
                placeholder="New password (min. 8 characters)"
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                autoComplete="new-password"
              />
              <input
                type="password"
                className={inputCls}
                placeholder="Confirm new password"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
          </FieldBlock>
        </TabPanel>
      )}

      {activeTab === 'academic' && (
        <TabPanel meta={activeMeta} darkMode={darkMode}>
          <FieldBlock
            label="Default academic year"
            hint="Used on All Babyeyi, Requests, Analytics — matches school Babyeyi lite labels"
            darkMode={darkMode}
          >
            <select
              className={inputCls}
              value={academicPeriod?.academicYear || ''}
              onChange={(e) => onAcademicPeriodChange?.({ academicYear: e.target.value, term: academicPeriod?.term || '' })}
            >
              {(yearOptions || []).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </FieldBlock>
          <FieldBlock label="Default term" hint="Choose All Terms to include every term for the selected year" darkMode={darkMode}>
            <select
              className={inputCls}
              value={academicPeriod?.term ?? ''}
              onChange={(e) => onAcademicPeriodChange?.({ academicYear: academicPeriod?.academicYear || '', term: e.target.value })}
            >
              <option value={ALL_TERMS_VALUE}>{ALL_TERMS_LABEL}</option>
              {(termOptions.length ? termOptions : ['Term 1', 'Term 2', 'Term 3']).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FieldBlock>
        </TabPanel>
      )}

      {activeTab === 'preferences' && (
        <TabPanel
          meta={activeMeta}
          darkMode={darkMode}
          footer={saveBtn(savingPrefs, 'Save appearance & notifications', savePreferencesTab)}
        >
          <FieldBlock label="Dark mode" hint="Easier on the eyes in low light" darkMode={darkMode}>
            <div
              className={`flex items-center justify-between gap-4 rounded-xl px-1 py-0.5 ${
                darkMode ? '' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {darkMode ? (
                  <Moon className="h-4 w-4 text-amber-400" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-600" />
                )}
                <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-[#000435]/70'}`}>
                  {darkMode ? 'On' : 'Off'}
                </span>
              </div>
              <Toggle on={darkMode} onChange={setDarkMode} />
            </div>
          </FieldBlock>

          <FieldBlock label="Notification channels" hint="When schools submit new Babyeyi" darkMode={darkMode}>
            <div className="space-y-2">
              {[
                { key: 'inAppNotifications', label: 'In-app', desc: 'Bell in this portal', icon: Bell },
                { key: 'emailNotifications', label: 'Email', desc: 'To your login address', icon: Mail },
                { key: 'pushNotifications', label: 'Web push', desc: 'This browser/device', icon: Smartphone },
              ].map((row) => (
                <div
                  key={row.key}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${
                    darkMode ? 'border-slate-700 bg-slate-800/40' : 'border-[#fde68a]/80 bg-[#FFFBEB]/40'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <row.icon className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <p className={`m-0 text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#000435]'}`}>
                        {row.label}
                      </p>
                      <p className={`m-0 text-[11px] ${darkMode ? 'text-slate-400' : 'text-[#000435]/50'}`}>
                        {row.desc}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    on={prefs[row.key]}
                    onChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))}
                  />
                </div>
              ))}
            </div>

            {isWebPushEnvironmentSupported() && pushState.configured && (
              <button
                type="button"
                disabled={pushBusy}
                onClick={togglePushDevice}
                className={`mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-xs font-bold disabled:opacity-60 ${
                  darkMode
                    ? 'border-amber-500/40 text-amber-300 hover:bg-slate-800'
                    : 'border-amber-400 text-amber-800 hover:bg-amber-50'
                }`}
              >
                {pushBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {pushState.subscribed ? 'Disable push on this browser' : 'Enable push on this browser'}
              </button>
            )}
            {!pushState.configured && (
              <p className={`m-0 mt-2 text-[11px] ${darkMode ? 'text-slate-500' : 'text-[#000435]/45'}`}>
                Web push needs VAPID keys on the server. In-app and email still work.
              </p>
            )}
          </FieldBlock>
        </TabPanel>
      )}
    </div>
  );
}
