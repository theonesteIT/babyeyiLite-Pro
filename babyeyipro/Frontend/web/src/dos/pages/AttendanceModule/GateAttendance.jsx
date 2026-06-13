import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import {
  DoorOpen,
  Settings,
  ClipboardList,
  CreditCard,
  UserCheck,
  UserMinus,
  Clock3,
  Sunrise,
  Sunset,
  ShieldAlert,
  Ban,
  Hourglass,
  CheckCircle2,
  CircleDot,
  Search,
  Save,
  BellRing,
  X,
  Trash2,
} from 'lucide-react';

const ROLE_CONFIG = {
  Student: { color: 'from-blue-600 to-blue-500', badge: 'bg-blue-100 text-blue-700' },
  Teacher: { color: 'from-violet-600 to-violet-500', badge: 'bg-violet-100 text-violet-700' },
  Staff: { color: 'from-amber-500 to-amber-400', badge: 'bg-amber-100 text-amber-700' },
};

function useNow() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return now;
}

function todayKey() { return new Date().toISOString().slice(0, 10); }

function normalizeSettingsFromApi(data = {}) {
  return {
    morningDeadline: data.morningDeadline || data.morning_deadline || '08:00',
    morningCutoff: data.morningCutoff || data.morning_cutoff || '10:00',
    eveningStart: data.eveningStart || data.evening_start || '16:00',
    eveningCutoff: data.eveningCutoff || data.evening_cutoff || '19:00',
  };
}

function normalizeRole(personType) {
  if (String(personType || '').toUpperCase() === 'STUDENT') return 'Student';
  return 'Staff';
}

function mapRowsToTodayRecords(rows = [], dateStr) {
  const day = {};
  for (const row of rows) {
    const uid = String(row.card_uid || '').toUpperCase();
    if (!uid) continue;
    day[uid] = {
      person: {
        name: row.person_name || 'Unknown',
        role: normalizeRole(row.person_type),
        id: row.person_ref || `${row.person_type || ''}-${row.person_id || ''}`,
        class: null,
      },
      ...(row.morning_check_in
        ? {
            morning: {
              timestamp: new Date(row.morning_check_in).toISOString(),
              displayTime: fmtTime(new Date(row.morning_check_in)),
              status: row.morning_status === 'Late' ? 'Late' : 'OnTime',
            },
          }
        : {}),
      ...(row.evening_check_out
        ? {
            evening: {
              timestamp: new Date(row.evening_check_out).toISOString(),
              displayTime: fmtTime(new Date(row.evening_check_out)),
              status: 'Exit',
            },
          }
        : {}),
    };
  }
  return { [dateStr]: day };
}

function parseTime(str) {
  // "08:00" → minutes since midnight
  if (!str) return null;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function fmtTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtShort(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function to24HourParts(value) {
  const [hRaw, mRaw] = String(value || '08:00').split(':');
  let hour24 = Number(hRaw);
  const minute = String(Number(mRaw || 0)).padStart(2, '0');
  if (!Number.isFinite(hour24) || hour24 < 0 || hour24 > 23) hour24 = 8;
  return { hour: String(hour24).padStart(2, '0'), minute };
}

function from24HourParts(hour, minute) {
  let h = Number(hour || '08');
  const m = String(Number(minute || '0')).padStart(2, '0');
  if (!Number.isFinite(h) || h < 0 || h > 23) h = 8;
  return `${String(h).padStart(2, '0')}:${m}`;
}

// ─────────────────────────────────────────────
//  GATE ATTENDANCE PAGE
// ─────────────────────────────────────────────
export default function GateAttendance({
  hideSettings = false,
  readOnly = false,
  studentStatsOnly = false,
  defaultRoleFilter = 'ALL',
} = {}) {
  const [page, setPage] = useState('gate'); // 'gate' | 'settings' | 'log'
  const now = useNow();

  // ── Gate timing settings (DOS configures these)
  const [settings, setSettings] = useState({
    morningDeadline: '08:00',   // after this time → Late
    morningCutoff:   '10:00',   // after this → no more morning entry
    eveningStart:    '16:00',   // from this time → evening exit allowed
    eveningCutoff:   '19:00',   // after this → no more exit
  });

  // ── Attendance records: { [date]: { [cardUID]: { morning?: {...}, evening?: {...} } } }
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingTap, setProcessingTap] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // ── Live tap state
  const [tapResult, setTapResult] = useState(null); // null | { status, person, session, time, message }
  const [inputUID,  setInputUID]  = useState('');
  const tapTimerRef = useRef(null);
  const lastEventKeyRef = useRef('');
  const latestNoticeKeyRef = useRef('');
  const [sideNotice, setSideNotice] = useState(null);

  const loadGateData = useCallback(async (opts = {}) => {
    const { silent = false } = opts;
    const date = todayKey();
    try {
      if (!silent) setLoading(true);
      const [settingsRes, rowsRes] = await Promise.all([
        api.get('/gate/attendance/settings'),
        api.get('/gate/attendance/today', { params: { date } }),
      ]);
      const rows = rowsRes?.data?.data || [];
      setSettings(normalizeSettingsFromApi(settingsRes?.data?.data || {}));
      setRecords(mapRowsToTodayRecords(rows, date));

      // Auto-detect latest Arduino/web device event and show on dashboard.
      let latest = null;
      for (const row of rows) {
        const morningMs = row?.morning_check_in ? new Date(row.morning_check_in).getTime() : 0;
        const eveningMs = row?.evening_check_out ? new Date(row.evening_check_out).getTime() : 0;
        const eventType = eveningMs > morningMs ? 'evening' : morningMs > 0 ? 'morning' : null;
        const eventMs = Math.max(morningMs, eveningMs);
        if (!eventType || !eventMs) continue;
        if (!latest || eventMs > latest.eventMs) {
          latest = { row, eventType, eventMs };
        }
      }

      if (latest) {
        const eventKey = `${latest.row.card_uid}-${latest.eventType}-${latest.eventMs}`;
        if (lastEventKeyRef.current && lastEventKeyRef.current !== eventKey) {
          const isMorning = latest.eventType === 'morning';
          const isLate = String(latest.row.morning_status || '').toLowerCase() === 'late';
          setTapResult({
            status: 'success',
            session: isMorning ? 'morning' : 'evening',
            sessionStatus: isMorning ? (isLate ? 'Late' : 'OnTime') : 'Exit',
            person: {
              name: latest.row.person_name || 'Unknown',
              role: normalizeRole(latest.row.person_type),
              id: latest.row.person_ref || `${latest.row.person_type || ''}-${latest.row.person_id || ''}`,
              class: null,
            },
            uid: String(latest.row.card_uid || '').toUpperCase(),
            message: isMorning
              ? `Attendance done: Coming ${isLate ? '(Late)' : '(On Time)'}`
              : 'Attendance done: Leaving school',
            time: fmtTime(new Date(latest.eventMs)),
          });
          clearTapAfter(7000);
        }
        lastEventKeyRef.current = eventKey;
      }

      try {
        const latestEventRes = await api.get('/gate/attendance/latest-event');
        const ev = latestEventRes?.data?.data || null;
        if (ev && ev.id) {
          const key = String(ev.id);
          const isNew = latestNoticeKeyRef.current && latestNoticeKeyRef.current !== key;
          if (isNew && Number(ev.http_status) >= 400) {
            const msg = ev.message || 'Gate attendance request rejected.';
            const waitHint = ev.result_code === 'EVENING_NOT_OPEN'
              ? 'Wait until evening exit open time.'
              : ev.result_code === 'MORNING_WINDOW_CLOSED'
                ? 'Morning window is closed; try during evening exit window.'
                : ev.result_code === 'EVENING_WINDOW_CLOSED'
                  ? 'Exit window is closed for today.'
                  : '';
            setSideNotice({
              type: 'warning',
              title: 'Gate tap rejected',
              message: waitHint ? `${msg} ${waitHint}` : msg,
              time: fmtTime(new Date(ev.created_at || Date.now())),
            });
            setTimeout(() => setSideNotice(null), 9000);
          }
          latestNoticeKeyRef.current = key;
        }
      } catch (_) {
        // ignore notice fetch errors so main attendance UI keeps working
      }
    } catch (error) {
      console.error('Failed to load gate attendance data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGateData();
  }, [loadGateData]);

  useEffect(() => {
    // Live refresh so Arduino scans appear automatically on Gate dashboard + Today Log.
    // While on Settings, do not poll — the burst of GETs every few seconds hits API rate limits
    // and blocks PUT /gate/attendance/settings ("Too many requests — please slow down").
    if (page === 'settings') return undefined;
    const intervalMs = page === 'gate' ? 8000 : 12000;
    const timer = setInterval(() => {
      loadGateData({ silent: true });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [loadGateData, page]);

  const processTap = useCallback(async (rawUID) => {
    const uid = rawUID.trim().toUpperCase();
    if (!uid) return;
    setProcessingTap(true);
    try {
      const response = await api.post('/gate_attendance', { cardUID: uid, deviceID: 'ATT_WEB_PANEL' });
      const payload = response?.data || {};
      const person = payload?.data?.person
        ? {
            name: payload.data.person.name,
            role: payload.data.person.type === 'STUDENT' ? 'Student' : 'Staff',
            id: payload.data.person.ref || `${payload.data.person.type}-${payload.data.person.id}`,
            class: null,
          }
        : null;
      const session = payload?.data?.session === 'evening' ? 'evening' : 'morning';
      const sessionStatus = payload?.data?.status === 'Late' ? 'Late' : session === 'evening' ? 'Exit' : 'OnTime';

      setTapResult({
        status: 'success',
        session,
        sessionStatus,
        person,
        uid,
        message: payload?.message || 'Attendance recorded.',
        time: fmtTime(new Date()),
      });
      await loadGateData();
      clearTapAfter(7000);
    } catch (error) {
      const code = error?.response?.data?.code;
      const message = error?.response?.data?.message || 'Failed to process card tap.';
      const nowDate = new Date();
      if (code === 'CARD_NOT_REGISTERED') {
        setTapResult({ status: 'unknown', uid, message, time: fmtTime(nowDate) });
      } else if (code === 'EVENING_NOT_OPEN') {
        setTapResult({ status: 'early', uid, message, time: fmtTime(nowDate) });
      } else if (
        code === 'MORNING_WINDOW_CLOSED' ||
        code === 'EVENING_WINDOW_CLOSED' ||
        code === 'PRO_REQUIRED' ||
        code === 'DUPLICATE_CARD_UID'
      ) {
        setTapResult({ status: 'rejected', uid, message, time: fmtTime(nowDate) });
      } else if (code === 'ALREADY_COMPLETED') {
        const rec = records[todayKey()]?.[uid] || {};
        setTapResult({ status: 'done', uid, message, morning: rec.morning, evening: rec.evening, time: fmtTime(nowDate), person: rec.person });
      } else {
        setTapResult({ status: 'rejected', uid, message, time: fmtTime(nowDate) });
      }
      clearTapAfter(7000);
    } finally {
      setProcessingTap(false);
    }
  }, [loadGateData, records]);

  function clearTapAfter(ms) {
    clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => setTapResult(null), ms);
  }

  // Simulate a tap from input
  const handleManualTap = (e) => {
    e.preventDefault();
    processTap(inputUID);
    setInputUID('');
  };

  // ── Listen for real POST from ESP8266 (polling simulation)
  // In production: useEffect with setInterval(() => api.get('/gate_attendance/latest'), 1000)

  // ── Today's log
  const todayLog = Object.entries(records[todayKey()] || {}).map(([uid, rec]) => ({
    uid, ...rec,
  }));

  const statsLog = studentStatsOnly
    ? todayLog.filter((r) => r.person?.role === 'Student')
    : todayLog;

  // ── Stats
  const totalIn    = statsLog.filter(r => r.morning).length;
  const totalOut   = statsLog.filter(r => r.evening).length;
  const lateCount  = statsLog.filter(r => r.morning?.status === 'Late').length;

  const pageTabs = [
    { id: 'gate', label: 'Gate', icon: DoorOpen },
    { id: 'log', label: 'Today Log', icon: ClipboardList },
    ...(hideSettings ? [] : [{ id: 'settings', label: 'Settings', icon: Settings }]),
  ];

  useEffect(() => {
    if (hideSettings && page === 'settings') setPage('gate');
  }, [hideSettings, page]);

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      {sideNotice && (
        <div className="fixed right-4 top-20 z-[80] w-[92vw] max-w-sm rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:w-[360px]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
              <BellRing size={16} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-amber-700">{sideNotice.title}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">{sideNotice.message}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">{sideNotice.time}</p>
            </div>
            <button
              type="button"
              onClick={() => setSideNotice(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-900/40">
              <DoorOpen size={18} className="text-[#0b1220]" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900">Gate Attendance</h1>
              <p className="font-mono text-[10px] font-medium text-amber-600">{fmtDate(now)}</p>
              {studentStatsOnly && (
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
                  Live counts show students only — for meal and stock planning.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {pageTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setPage(tab.id)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  page === tab.id
                    ? 'bg-amber-400 text-[#0b1220] shadow-lg shadow-amber-900/40'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <tab.icon size={14} />
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* ════════════════════════════════════
            GATE PAGE
        ════════════════════════════════════ */}
        {page === 'gate' && (
          <div className="space-y-6">

            {/* ── Clock + Stats Row ── */}
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="col-span-1 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                <div className="font-mono text-3xl font-bold text-slate-900">{fmtTime(now)}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">Live Clock</div>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600">RFID Active</span>
                </div>
              </div>
              {[
                { label: studentStatsOnly ? 'Students Entered' : 'Entered Today', value: totalIn, color: 'text-emerald-300', bg: 'from-emerald-900/30 to-emerald-900/5', border: 'border-emerald-800/40', icon: UserCheck },
                { label: studentStatsOnly ? 'Students Exited' : 'Exited Today', value: totalOut, color: 'text-sky-300', bg: 'from-sky-900/30 to-sky-900/5', border: 'border-sky-800/40', icon: UserMinus },
                { label: 'Late Arrivals', value: lateCount, color: 'text-amber-300', bg: 'from-amber-900/30 to-amber-900/5', border: 'border-amber-800/40', icon: Clock3 },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <s.icon size={14} className="mb-2 text-slate-500" />
                  <div className="text-4xl font-black text-slate-900">{s.value}</div>
                  <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-slate-600">{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Session Window Status ── */}
            <SessionWindows now={now} settings={settings} />

            {/* ── TAP RESULT DISPLAY ── */}
            {tapResult ? (
              <TapResult result={tapResult} />
            ) : (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                <div className="relative mb-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-500/30 bg-amber-500/10">
                    <CreditCard size={38} className="text-amber-300" />
                  </div>
                  <div className="absolute inset-0 animate-ping rounded-full border border-amber-500/20" />
                </div>
                <h2 className="text-xl font-black text-slate-900">Waiting for RFID Tap</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {loading ? 'Loading gate attendance data...' : processingTap ? 'Processing card tap...' : 'Ask student / staff to tap card on the reader'}
                </p>
              </div>
            )}

            {!readOnly && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-700">Manual / Test — Enter Card UID</p>
                <form onSubmit={handleManualTap} className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={inputUID}
                    onChange={e => setInputUID(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3D4"
                    className="font-mono flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none transition focus:border-amber-500/50"
                  />
                  <button type="submit" className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-3 text-sm font-black text-[#0b1220] shadow-lg shadow-amber-900/30 transition hover:opacity-90 active:scale-95">
                    Simulate Tap
                  </button>
                </form>
              </div>
            )}

            {/* ── Recent taps log snippet ── */}
            {todayLog.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-700">Recent Activity</p>
                  <button onClick={() => setPage('log')} className="text-[10px] font-bold text-amber-600 hover:underline">View all →</button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...todayLog].reverse().slice(0, 6).map(rec => (
                    <MiniLogRow key={rec.uid} rec={rec} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════
            TODAY LOG PAGE
        ════════════════════════════════════ */}
        {page === 'log' && (
          <TodayLogPage
            records={records}
            todayLog={todayLog}
            onReload={loadGateData}
            readOnly={readOnly}
            defaultRoleFilter={defaultRoleFilter}
          />
        )}

        {/* ════════════════════════════════════
            SETTINGS PAGE
        ════════════════════════════════════ */}
        {page === 'settings' && (
          <SettingsPage settings={settings} setSettings={setSettings} savingSettings={savingSettings} setSavingSettings={setSavingSettings} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SESSION WINDOW STATUS BARS
// ─────────────────────────────────────────────
function SessionWindows({ now, settings }) {
  const mins = minutesSinceMidnight(now);
  const mDead  = parseTime(settings.morningDeadline);
  const mCut   = parseTime(settings.morningCutoff);
  const eSt    = parseTime(settings.eveningStart);
  const eCut   = parseTime(settings.eveningCutoff);

  const morningOpen   = mins <= mCut;
  const morningOnTime = mins <= mDead;
  const eveningOpen   = mins >= eSt && mins <= eCut;

  const windows = [
    {
      label: 'Morning Entry',
      icon: Sunrise,
      time: `${settings.morningDeadline} on-time · cutoff ${settings.morningCutoff}`,
      status: morningOpen ? (morningOnTime ? 'ON TIME' : 'LATE') : 'CLOSED',
      color: morningOpen ? (morningOnTime ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700') : 'border-slate-200 bg-white text-slate-400',
      dot: morningOpen ? (morningOnTime ? 'bg-emerald-500' : 'bg-amber-500') : 'bg-slate-300',
    },
    {
      label: 'Evening Exit',
      icon: Sunset,
      time: `Opens ${settings.eveningStart} · cutoff ${settings.eveningCutoff}`,
      status: eveningOpen ? 'OPEN' : (mins < eSt ? 'NOT YET' : 'CLOSED'),
      color: eveningOpen ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-400',
      dot: eveningOpen ? 'bg-sky-500' : 'bg-slate-300',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {windows.map(w => (
        <div key={w.label} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${w.color}`}>
          <w.icon size={18} />
          <div className="flex-1">
            <div className="text-xs font-black">{w.label}</div>
            <div className="mt-0.5 font-mono text-[10px] opacity-70">{w.time}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${w.dot}`} />
            <span className="text-[10px] font-black tracking-widest">{w.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  TAP RESULT COMPONENT
// ─────────────────────────────────────────────
function TapResult({ result }) {
  const configs = {
    success: {
      border: result?.sessionStatus === 'Late' ? 'border-amber-500/50' : result?.session === 'evening' ? 'border-blue-500/50' : 'border-emerald-500/50',
      bg:     result?.sessionStatus === 'Late' ? 'from-amber-900/30 to-amber-900/5' : result?.session === 'evening' ? 'from-blue-900/30 to-blue-900/5' : 'from-emerald-900/30 to-emerald-900/5',
      icon: result?.session === 'evening' ? DoorOpen : result?.sessionStatus === 'Late' ? Clock3 : CheckCircle2,
      title:  result?.session === 'morning' ? (result?.sessionStatus === 'Late' ? 'LATE ARRIVAL' : 'MORNING ENTRY') : 'EVENING EXIT',
      titleColor: result?.sessionStatus === 'Late' ? 'text-amber-300' : result?.session === 'evening' ? 'text-sky-300' : 'text-emerald-300',
    },
    unknown: { border: 'border-red-500/50', bg: 'from-red-900/30 to-red-900/5', icon: ShieldAlert, title: 'UNKNOWN CARD', titleColor: 'text-red-300' },
    rejected:{ border: 'border-red-500/30', bg: 'from-red-900/20 to-red-900/5', icon: Ban, title: 'ACCESS DENIED', titleColor: 'text-red-300' },
    early:   { border: 'border-amber-500/30', bg: 'from-amber-900/20 to-amber-900/5', icon: Hourglass, title: 'TOO EARLY', titleColor: 'text-amber-300' },
    done:    { border: 'border-white/10', bg: 'from-white/5 to-white/2', icon: CheckCircle2, title: 'ALREADY COMPLETE', titleColor: 'text-white/60' },
  };
  const cfg = configs[result.status] || configs.unknown;
  const roleCfg = result.person ? ROLE_CONFIG[result.person.role] : null;

  return (
    <div className={`rounded-3xl border ${cfg.border} bg-gradient-to-br ${cfg.bg} p-6 transition-all`}>
      <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:gap-6">
        {/* Big Icon */}
        <div className="mb-4 flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-4xl sm:mb-0">
          <cfg.icon size={34} />
        </div>

        {/* Info */}
        <div className="flex-1">
          <div className={`font-['JetBrains_Mono'] text-xs font-black tracking-widest ${cfg.titleColor}`}>
            {cfg.title}
          </div>

          {result.person ? (
            <>
              <h2 className="mt-1 text-2xl font-black text-white">{result.person.name}</h2>
              <div className="mt-1 flex flex-wrap justify-center gap-2 sm:justify-start">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${roleCfg?.badge}`}>
                  <CircleDot size={12} className="inline mr-1" />{result.person.role}
                </span>
                <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-bold text-white/50">
                  {result.person.id}
                </span>
                {result.person.class && (
                  <span className="rounded-full bg-blue-900/40 px-2.5 py-0.5 text-[11px] font-bold text-blue-400">
                    {result.person.class}
                  </span>
                )}
              </div>
            </>
          ) : (
            <h2 className="mt-1 text-xl font-black text-white/60">UID: {result.uid}</h2>
          )}

          <p className="mt-3 text-sm font-semibold text-white/60">{result.message}</p>

          {result.status === 'done' && (
            <div className="mt-3 flex flex-wrap gap-3 justify-center sm:justify-start">
              {result.morning && <span className="rounded-lg bg-emerald-900/30 px-3 py-1.5 text-xs font-bold text-emerald-300"><Sunrise size={12} className="inline mr-1" />Entry: {result.morning.displayTime}</span>}
              {result.evening && <span className="rounded-lg bg-sky-900/30 px-3 py-1.5 text-xs font-bold text-sky-300"><Sunset size={12} className="inline mr-1" />Exit: {result.evening.displayTime}</span>}
            </div>
          )}
        </div>

        {/* Time */}
        <div className="mt-4 text-center sm:mt-0">
          <div className="font-['JetBrains_Mono'] text-2xl font-bold text-white">{result.time}</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/25">Recorded</div>
          {result.status === 'success' && (
            <div className={`mt-2 rounded-xl px-3 py-1.5 text-xs font-black ${
              result.session === 'morning'
                ? result.sessionStatus === 'Late' ? 'bg-amber-900/40 text-amber-400' : 'bg-emerald-900/40 text-emerald-400'
                : 'bg-sky-900/40 text-sky-300'
            }`}>
              {result.session === 'morning' ? 'Morning' : 'Evening'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  MINI LOG ROW
// ─────────────────────────────────────────────
function MiniLogRow({ rec }) {
  const roleCfg = ROLE_CONFIG[rec.person?.role] || ROLE_CONFIG.Student;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <CircleDot size={16} className="text-amber-300" />
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs font-bold text-slate-900">{rec.person?.name}</p>
        <p className="text-[10px] font-semibold text-slate-500">{rec.person?.id}</p>
      </div>
      <div className="flex gap-2">
        {rec.morning && (
          <span className={`rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold ${
            rec.morning.status === 'Late' ? 'bg-amber-900/40 text-amber-300' : 'bg-emerald-900/40 text-emerald-300'
          }`}>
            <Sunrise size={11} className="inline mr-1" />{fmtShort(new Date(rec.morning.timestamp))}
          </span>
        )}
        {rec.evening && (
          <span className="rounded-lg bg-sky-900/40 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-300">
            <Sunset size={11} className="inline mr-1" />{fmtShort(new Date(rec.evening.timestamp))}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  TODAY LOG PAGE
// ─────────────────────────────────────────────
function TodayLogPage({ records, todayLog, onReload, readOnly = false, defaultRoleFilter = 'ALL' }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(defaultRoleFilter);
  const [sessionFilter, setSessionFilter] = useState('ALL');
  const [selected, setSelected] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const date = todayKey();

  const filtered = todayLog.filter(rec => {
    const q = search.toLowerCase();
    const matchSearch = !q || rec.person?.name.toLowerCase().includes(q) || rec.person?.id.toLowerCase().includes(q) || rec.uid.toLowerCase().includes(q);
    const matchRole = roleFilter === 'ALL' || rec.person?.role === roleFilter;
    const matchSession =
      sessionFilter === 'ALL'
      || (sessionFilter === 'morning_only' && rec.morning && !rec.evening)
      || (sessionFilter === 'evening_only' && rec.evening && !rec.morning)
      || (sessionFilter === 'complete' && rec.morning && rec.evening)
      || (sessionFilter === 'late' && rec.morning?.status === 'Late');
    return matchSearch && matchRole && matchSession;
  });

  useEffect(() => {
    setSelected((prev) => prev.filter((uid) => filtered.some((r) => r.uid === uid)));
  }, [filtered]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.includes(r.uid));
  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelected((prev) => prev.filter((uid) => !filtered.some((r) => r.uid === uid)));
    } else {
      setSelected((prev) => [...new Set([...prev, ...filtered.map((r) => r.uid)])]);
    }
  };

  const toggleOne = (uid) => {
    setSelected((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));
  };

  const deleteOne = async (uid) => {
    if (!window.confirm(`Delete gate log for card ${uid}?`)) return;
    try {
      setDeleting(true);
      await api.delete(`/gate/attendance/today/${encodeURIComponent(uid)}`, { params: { date } });
      setSelected((prev) => prev.filter((x) => x !== uid));
      if (typeof onReload === 'function') await onReload({ silent: true });
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to delete gate log.');
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} selected gate logs?`)) return;
    try {
      setDeleting(true);
      await api.post('/gate/attendance/today/delete-selected', { date, card_uids: selected });
      setSelected([]);
      if (typeof onReload === 'function') await onReload({ silent: true });
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to delete selected logs.');
    } finally {
      setDeleting(false);
    }
  };

  const deleteAll = async () => {
    if (!todayLog.length) return;
    if (!window.confirm('Delete all gate logs for today?')) return;
    try {
      setDeleting(true);
      await api.delete('/gate/attendance/today', { params: { date } });
      setSelected([]);
      if (typeof onReload === 'function') await onReload({ silent: true });
    } catch (error) {
      alert(error?.response?.data?.message || 'Failed to delete all logs.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-600">Search</label>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Name, ID or UID…"
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 font-mono text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-amber-500/40"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-600">Role</label>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-amber-500/40">
            <option value="ALL">All Roles</option>
            <option value="Student">Students</option>
            <option value="Teacher">Teachers</option>
            <option value="Staff">Staff</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-600">Session</label>
          <select value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 outline-none focus:border-amber-500/40">
            <option value="ALL">All</option>
            <option value="complete">Both Sessions</option>
            <option value="morning_only">Morning Only</option>
            <option value="evening_only">Evening Only</option>
            <option value="late">Late Arrivals</option>
          </select>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] font-semibold text-slate-500">{new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'2-digit', year:'numeric' })}</p>
          <p className="text-xs font-black text-slate-900">{filtered.length} records</p>
        </div>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={deleting || !selected.length}
            onClick={deleteSelected}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-black text-red-700 disabled:opacity-50"
          >
            <Trash2 size={12} />
            Delete Selected ({selected.length})
          </button>
          <button
            type="button"
            disabled={deleting || !todayLog.length}
            onClick={deleteAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-[11px] font-black text-red-700 disabled:opacity-50"
          >
            <Trash2 size={12} />
            Delete All
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {!readOnly && (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAllFiltered}
                      className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                  </th>
                )}
                {(readOnly
                  ? ['#', 'Name', 'ID', 'Role', 'Card UID', 'Morning Entry', 'Evening Exit', 'Status']
                  : ['#', 'Name', 'ID', 'Role', 'Card UID', 'Morning Entry', 'Evening Exit', 'Status', 'Actions']
                ).map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 8 : 10} className="px-4 py-16 text-center text-sm font-semibold text-slate-500">
                    No records yet for today. Tap a card to begin.
                  </td>
                </tr>
              )}
              {filtered.map((rec, i) => {
                const roleCfg = ROLE_CONFIG[rec.person?.role] || ROLE_CONFIG.Student;
                const late = rec.morning?.status === 'Late';
                const statusLabel = rec.evening ? 'Out of School' : rec.morning ? 'In School' : 'No Entry';
                const statusClass = rec.evening
                  ? 'bg-slate-800 text-white'
                  : rec.morning
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-slate-100 text-slate-500';
                return (
                  <tr key={rec.uid} className="border-b border-slate-100 transition hover:bg-slate-50">
                    {!readOnly && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(rec.uid)}
                          onChange={() => toggleOne(rec.uid)}
                          className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs font-bold text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-xs ${roleCfg.color}`}>
                          <CircleDot size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{rec.person?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{rec.person?.id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${roleCfg.badge}`}>
                        {rec.person?.role || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold text-amber-300">{rec.uid}</td>
                    <td className="px-4 py-3">
                      {rec.morning ? (
                        <div>
                          <span className={`font-mono text-xs font-bold ${late ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {fmtShort(new Date(rec.morning.timestamp))}
                          </span>
                          {late && <span className="ml-1 text-[10px] font-black text-amber-500">LATE</span>}
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {rec.evening ? (
                        <span className="font-mono text-xs font-bold text-sky-300">
                          {fmtShort(new Date(rec.evening.timestamp))}
                        </span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass}`}>
                        {statusLabel}
                      </span>
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => deleteOne(rec.uid)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-700 disabled:opacity-50"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SETTINGS PAGE (DOS / School Manager)
// ─────────────────────────────────────────────
function SettingsPage({ settings, setSettings, savingSettings, setSavingSettings }) {
  const handleTimePartChange = (key, part, value) => {
    const parts = to24HourParts(local[key]);
    const next = {
      ...parts,
      [part]: value,
    };
    setLocal((prev) => ({
      ...prev,
      [key]: from24HourParts(next.hour, next.minute),
    }));
  };

  const [local, setLocal] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    try {
      setSavingSettings(true);
      const payload = {
        morningDeadline: local.morningDeadline,
        morningCutoff: local.morningCutoff,
        eveningStart: local.eveningStart,
        eveningCutoff: local.eveningCutoff,
      };
      const res = await api.put('/gate/attendance/settings', payload);
      const normalized = normalizeSettingsFromApi(res?.data?.data || payload);
      setSettings(normalized);
      setLocal(normalized);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Do not call loadGateData here — it fires several GETs and often triggers 429 after PUT.
      // Server response already updates timing state above.
    } catch (error) {
      console.error('Failed to save gate attendance settings:', error);
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;
      const detail =
        status === 429
          ? 'The server is limiting requests. Stay on this page and try Save again in a few seconds.'
          : msg || 'Failed to save gate attendance settings.';
      alert(detail);
    } finally {
      setSavingSettings(false);
    }
  };

  const fields = [
    {
      group: '🌅 Morning Entry Window',
      desc: 'Controls when students/staff can enter school in the morning.',
      fields: [
        { key: 'morningDeadline', label: 'On-Time Deadline', desc: 'Arrivals after this time are marked LATE', icon: '⏰' },
        { key: 'morningCutoff',  label: 'Entry Cutoff',      desc: 'No morning attendance after this time',   icon: '🚫' },
      ],
    },
    {
      group: '🌆 Evening Exit Window',
      desc: 'Controls when students/staff can leave school in the evening.',
      fields: [
        { key: 'eveningStart',  label: 'Exit Opens At',  desc: 'Evening exit allowed from this time',    icon: '🟢' },
        { key: 'eveningCutoff', label: 'Exit Closes At', desc: 'No exit attendance after this time',     icon: '🔒' },
      ],
    },
  ];

  // Timeline preview
  const times = [
    { time: local.morningDeadline, label: 'On-Time Deadline', color: 'bg-emerald-400' },
    { time: local.morningCutoff,   label: 'Morning Cutoff',   color: 'bg-amber-400' },
    { time: local.eveningStart,    label: 'Evening Opens',    color: 'bg-blue-400' },
    { time: local.eveningCutoff,   label: 'Evening Closes',   color: 'bg-red-400' },
  ].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-xs font-black text-amber-700 inline-flex items-center gap-2"><Settings size={14} />Gate Timing Configuration</p>
        <p className="mt-1 text-sm text-slate-700">Only DOS or School Manager should access this page. Changes apply immediately to the gate system.</p>
      </div>

      {/* Timeline Preview */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-700 inline-flex items-center gap-2"><Clock3 size={13} />Daily Timeline Preview</p>
        <div className="relative">
          <div className="absolute top-3 left-0 right-0 h-0.5 bg-slate-200 rounded-full" />
          <div className="flex justify-between">
            {times.map(t => (
              <div key={t.key} className="flex flex-col items-center gap-1">
                <div className={`h-3 w-3 rounded-full ${t.color} border-2 border-white relative z-10`} />
                <div className={`font-mono text-xs font-bold ${t.color.replace('bg-','text-')}`}>{t.time}</div>
                <div className="max-w-[80px] text-center text-[9px] font-semibold text-slate-500 leading-tight">{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings Fields */}
      {fields.map(group => (
        <div key={group.group} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-black text-slate-900">{group.group}</h3>
            <p className="text-[11px] text-slate-500">{group.desc}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map(f => (
              <div key={f.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-base">{f.icon}</span>
                  <div>
                    <p className="text-xs font-black text-slate-900">{f.label}</p>
                    <p className="text-[10px] text-slate-500">{f.desc}</p>
                  </div>
                </div>
                <input
                  type="hidden"
                  value={local[f.key]}
                  readOnly
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={to24HourParts(local[f.key]).hour}
                    onChange={(e) => handleTimePartChange(f.key, 'hour', e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-2 py-3 text-lg font-black text-slate-900 outline-none focus:border-amber-500/60"
                  >
                    {Array.from({ length: 24 }).map((_, i) => {
                      const h = String(i).padStart(2, '0');
                      return (
                      <option key={h} value={h}>{h}</option>
                      );
                    })}
                  </select>
                  <select
                    value={to24HourParts(local[f.key]).minute}
                    onChange={(e) => handleTimePartChange(f.key, 'minute', e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-2 py-3 text-lg font-black text-slate-900 outline-none focus:border-amber-500/60"
                  >
                    {Array.from({ length: 60 }).map((_, i) => {
                      const m = String(i).padStart(2, '0');
                      return <option key={m} value={m}>{m}</option>;
                    })}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-8 py-3.5 text-sm font-black uppercase tracking-widest text-[#0b1220] shadow-sm shadow-amber-900/40 transition hover:opacity-90 active:scale-95 inline-flex items-center gap-2"
        >
          <Save size={15} />
          {savingSettings ? 'Saving...' : 'Save Gate Settings'}
        </button>
        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <span>✓</span> Settings saved and applied!
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 shadow-sm">
        <p className="text-xs font-black uppercase tracking-widest text-slate-600">How the system works</p>
        {[
          ['Morning Entry', 'Before on-time deadline', 'Recorded as ON TIME'],
          ['Morning Entry', 'After deadline, before cutoff', 'Recorded as LATE'],
          ['Morning Entry', 'After cutoff', 'Rejected — window closed'],
          ['Evening Exit', 'Before evening opens', 'Rejected — too early'],
          ['Evening Exit', 'Between open and cutoff', 'Recorded as EXIT'],
          ['Any session', 'Already recorded', 'Shows existing record — no duplicate'],
          ['Unknown card', 'Any time', 'Flagged — not registered in system'],
        ].map(([session, condition, result], i) => (
          <div key={i} className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-2 text-xs last:border-0 last:pb-0">
            <span className="font-bold text-slate-700">{session}</span>
            <span className="text-slate-500">{condition}</span>
            <span className="font-bold text-amber-600">{result}</span>
          </div>
        ))}
      </div>
    </div>
  );
}