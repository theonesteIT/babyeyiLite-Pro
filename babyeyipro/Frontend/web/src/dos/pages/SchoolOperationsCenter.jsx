import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { h } from '../utils/href';
import {
  Activity, AlertTriangle, Bell, CheckCircle2, ChevronRight, Clock, Loader2,
  QrCode, Radio, RefreshCw, ShieldAlert, Sparkles, Users, X,
} from 'lucide-react';
import dosApi from '../services/api';
import { NAVY, AMBER, STATUS_META } from './opsTheme';

const POLL_MS = 12000;

function useAnimatedNumber(target, duration = 600) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = Number(target) || 0;
    if (from === to) return undefined;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function formatCountdown(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${String(r).padStart(2, '0')}s`;
}

function StatCard({ label, value, sub, href }) {
  const animated = useAnimatedNumber(typeof value === 'number' ? value : 0);
  const inner = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#000435]/45 mb-2">{label}</p>
      <p className="text-2xl sm:text-3xl font-black tabular-nums text-[#000435]">
        {typeof value === 'string' ? value : animated}
        {sub && <span className="text-sm font-semibold text-[#000435]/40 ml-1">{sub}</span>}
      </p>
    </>
  );
  if (href) {
    return (
      <Link to={href} className="block rounded-2xl bg-white border border-[#000435]/12 p-4 shadow-sm hover:shadow-md hover:border-amber-300 transition-all">
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-2xl bg-white border border-[#000435]/12 p-4 shadow-sm hover:shadow-md transition-shadow">
      {inner}
    </div>
  );
}

function ClassCard({ card, onClick }) {
  const meta = STATUS_META[card.status] || STATUS_META.scheduled;
  return (
    <button
      type="button"
      onClick={() => onClick(card)}
      className={`text-left rounded-2xl border p-4 ring-1 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${meta.card}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-lg font-black text-[#000435] tracking-tight">{card.class_name}</p>
          <p className="text-xs text-[#000435]/55 font-medium">{card.subject_name}</p>
        </div>
        <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg bg-[#000435] text-white">
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot} ${card.status === 'live' ? 'animate-pulse' : ''}`} />
          {meta.label}
        </span>
      </div>
      <p className="text-sm font-semibold text-[#000435]/80 mb-3 truncate">{card.teacher_name}</p>
      <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wide mb-3">
        <span className={`px-2 py-0.5 rounded-md ${card.rfid_verified ? 'bg-amber-100 text-amber-800' : 'bg-[#000435]/5 text-[#000435]/40'}`}>
          RFID {card.rfid_verified ? '✓' : '—'}
        </span>
        <span className={`px-2 py-0.5 rounded-md ${card.qr_verified ? 'bg-amber-100 text-amber-800' : 'bg-[#000435]/5 text-[#000435]/40'}`}>
          QR {card.qr_verified ? '✓' : '—'}
        </span>
      </div>
      {card.lesson_progress_pct > 0 && (
        <div className="h-1.5 rounded-full bg-[#000435]/10 overflow-hidden mb-2">
          <div className="h-full transition-all duration-500" style={{ width: `${card.lesson_progress_pct}%`, background: AMBER }} />
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-[#000435]/45 font-semibold">
        <span>{card.start_time} – {card.end_time}</span>
        {card.status === 'late' && card.late_minutes > 0 && (
          <span style={{ color: AMBER }}>{card.entry_time ? `${card.late_minutes} min late` : 'Overdue'}</span>
        )}
        {card.status !== 'late' && card.entry_time && <span style={{ color: AMBER }}>Started {card.entry_time}</span>}
      </div>
    </button>
  );
}

function PeriodTimeline({ periods }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current?.querySelector('[data-current="true"]');
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [periods]);
  if (!periods?.length) return null;
  return (
    <div className="mb-6">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#000435]/45 mb-3">Today&apos;s timetable periods</p>
      <div ref={scrollRef} className="overflow-x-auto pb-2">
      <div className="flex gap-2 min-w-max">
        {periods.map((p) => (
          <div
            key={p.id || p.name}
            data-current={p.status === 'current' ? 'true' : undefined}
            className={`rounded-xl border px-4 py-3 min-w-[120px] transition-all ${
              p.status === 'current'
                ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-200'
                : p.status === 'past'
                  ? 'border-[#000435]/10 bg-[#000435]/[0.03] opacity-60'
                  : 'border-[#000435]/12 bg-white'
            }`}
          >
            <p className="text-xs font-black text-[#000435]">{p.name}</p>
            <p className="text-[10px] text-[#000435]/50 font-semibold mt-0.5">{p.start_time} – {p.end_time}</p>
            {p.is_break ? (
              <p className="text-[9px] font-bold uppercase mt-2 text-[#000435]/40">Break</p>
            ) : (
              <p className="text-[9px] font-black uppercase mt-2" style={{ color: p.status === 'current' ? NAVY : '#00043599' }}>
                {p.live_count || 0}/{p.class_count || 0} marked
              </p>
            )}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function OpsFilters({ filters, term, year, className, onTerm, onYear, onClass }) {
  if (!filters) return null;
  const selectCls = 'h-9 px-3 rounded-xl border border-[#000435]/15 text-xs font-bold text-[#000435] bg-white focus:outline-none focus:border-amber-400 min-w-[120px]';
  return (
    <div className="flex flex-wrap gap-2 items-center mb-4 p-3 rounded-2xl bg-[#000435]/[0.03] border border-[#000435]/10">
      <span className="text-[10px] font-black uppercase tracking-widest text-[#000435]/45 w-full sm:w-auto">Filters</span>
      <select className={selectCls} value={year} onChange={(e) => onYear(e.target.value)}>
        {[...(filters.academic_years || []), year].filter((v, i, a) => v && a.indexOf(v) === i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select className={selectCls} value={term} onChange={(e) => onTerm(e.target.value)}>
        {[...(filters.terms || []), term].filter((v, i, a) => v && a.indexOf(v) === i).map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <select className={selectCls} value={className} onChange={(e) => onClass(e.target.value)}>
        <option value="">All classes</option>
        {(filters.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

function EmptyCampusState({ live }) {
  const reason = live?.empty_reason;
  return (
    <div className="col-span-full rounded-2xl border border-[#000435]/10 bg-white p-10 text-center shadow-sm">
      <Activity size={40} className="mx-auto mb-4 opacity-20" style={{ color: NAVY }} />
      <p className="text-sm font-black text-[#000435] mb-2">
        {reason || 'No live classes in the current period'}
      </p>
      <p className="text-xs text-[#000435]/50 max-w-md mx-auto mb-6">
        {!live?.has_timetable
          ? 'Generate and apply the master timetable for the selected term and year, then teachers can scan class QR codes to go live.'
          : 'Classes appear here when they are scheduled in the current bell period. Teachers check in via classroom QR scan or RFID.'}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link to={h('/timetable?tab=generator')} className="px-4 py-2 rounded-xl text-xs font-black uppercase text-white" style={{ background: NAVY }}>
          Timetable generator
        </Link>
        <Link to={h('/operations-center/class-qr-codes')} className="px-4 py-2 rounded-xl border border-[#000435]/20 text-xs font-black uppercase text-[#000435]">
          Class QR codes
        </Link>
        <Link to={h('/teacher-period-attendance')} className="px-4 py-2 rounded-xl text-xs font-black uppercase text-white" style={{ background: AMBER }}>
          Period attendance
        </Link>
      </div>
    </div>
  );
}

function ClassDrawer({ card, onClose }) {
  if (!card) return null;
  const meta = STATUS_META[card.status] || STATUS_META.scheduled;
  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-[#000435]/40 backdrop-blur-sm" onClick={onClose} role="presentation" />
      <aside className="relative w-full max-w-md h-full bg-white border-l border-[#000435]/10 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-[#000435]/10 bg-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: AMBER }}>Live classroom</p>
            <h2 className="text-2xl font-black text-[#000435]">{card.class_name}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[#000435]/5 text-[#000435]/50">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-[#000435] text-white">
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
            {meta.label}
          </div>
          {[
            ['Subject', card.subject_name],
            ['Teacher', card.teacher_name],
            ['Started', card.entry_time || '—'],
            ['Expected end', card.end_time],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2 border-b border-[#000435]/8">
              <span className="text-xs font-bold uppercase tracking-wider text-[#000435]/40">{k}</span>
              <span className="text-sm font-semibold text-[#000435] text-right">{v}</span>
            </div>
          ))}
          <div>
            <div className="flex justify-between text-xs font-bold text-[#000435]/50 mb-2">
              <span>Lesson progress</span>
              <span>{card.lesson_progress_pct}%</span>
            </div>
            <div className="h-3 rounded-full bg-[#000435]/10 overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${card.lesson_progress_pct}%`, background: AMBER }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Teacher RFID', card.rfid_verified],
              ['Teacher QR', card.qr_verified],
            ].map(([label, ok]) => (
              <div key={label} className={`rounded-xl p-3 border ${ok ? 'border-amber-300 bg-amber-50' : 'border-[#000435]/10 bg-white'}`}>
                <p className="text-[10px] font-bold uppercase text-[#000435]/40">{label}</p>
                <p className="text-sm font-black text-[#000435] mt-1">{ok ? 'Verified' : 'Pending'}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function SchoolOperationsCenter() {
  const [live, setLive] = useState(null);
  const [filterMeta, setFilterMeta] = useState(null);
  const [term, setTerm] = useState('');
  const [year, setYear] = useState('');
  const [className, setClassName] = useState('');
  const [filtersReady, setFiltersReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [tick, setTick] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    dosApi.get('/dos/operations-center/filters')
      .then((r) => {
        if (!r.data?.success) return;
        const d = r.data.data;
        setFilterMeta(d);
        setTerm(d.current?.term || d.selected?.term || '');
        setYear(d.current?.academic_year || d.selected?.academic_year || '');
        setFiltersReady(true);
      })
      .catch(() => setFiltersReady(true));
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    dosApi.get('/dos/operations-center/filters', {
      params: { term: term || undefined, academic_year: year || undefined },
    })
      .then((r) => { if (r.data?.success) setFilterMeta(r.data.data); })
      .catch(() => {});
  }, [term, year, filtersReady]);

  const fetchLive = useCallback((silent = false) => {
    if (!filtersReady) return;
    if (!silent) setLoading(true);
    dosApi.get('/dos/operations-center/live', {
      params: {
        term: term || undefined,
        academic_year: year || undefined,
        class_name: className || undefined,
      },
    })
      .then((r) => {
        if (r.data?.success) {
          setLive(r.data.data);
          setLastRefresh(new Date());
          setError('');
        }
      })
      .catch((e) => setError(e.response?.data?.message || 'Failed to load live data'))
      .finally(() => setLoading(false));
  }, [filtersReady, term, year, className]);

  useEffect(() => {
    if (!filtersReady) return undefined;
    fetchLive();
    const id = setInterval(() => fetchLive(true), POLL_MS);
    return () => clearInterval(id);
  }, [fetchLive, filtersReady]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingSec = useMemo(() => {
    if (!live?.current_period) return 0;
    const base = live.current_period.remaining_seconds ?? 0;
    if (!lastRefresh) return base;
    const elapsed = Math.floor((Date.now() - lastRefresh.getTime()) / 1000);
    return Math.max(0, base - elapsed);
  }, [live, lastRefresh, tick]);

  const stats = live?.stats || {};
  const lateThreshold = live?.late_threshold_minutes ?? live?.stats?.late_threshold_minutes ?? filterMeta?.late_threshold_minutes;
  const heatMap = useMemo(() => {
    const counts = {};
    (live?.teacher_radar || []).forEach((t) => {
      if (t.status === 'teaching' || t.status === 'late') {
        counts[t.teacher_name] = (counts[t.teacher_name] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [live]);

  const maxHeat = heatMap[0]?.[1] || 1;

  return (
    <div className="min-h-full bg-white text-[#000435]">
      <div className="border-b border-[#000435]/10 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 ring-1 ring-amber-200">
                <Radio size={22} style={{ color: AMBER }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#000435]">School Operations Command Center</h1>
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#000435] text-white text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: AMBER }} /> Live
                  </span>
                </div>
                <p className="text-xs text-[#000435]/45 mt-0.5">
                  {live?.day || '—'} · {live?.term} {live?.academic_year} · {live?.today_slots_count ?? 0} lessons today
                  {lateThreshold != null ? ` · Late after ${lateThreshold} min` : ''} · Auto-refresh 12s
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={h('/operations-center/class-qr-codes')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#000435]/15 text-xs font-bold text-[#000435] hover:bg-[#000435]/5">
                <QrCode size={14} /> Class QR codes
              </Link>
              <button type="button" onClick={() => fetchLive()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-black uppercase tracking-wider"
                style={{ background: AMBER }}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-[#000435] text-sm">{error}</div>
          )}

          <OpsFilters
            filters={filterMeta}
            term={term}
            year={year}
            className={className}
            onTerm={setTerm}
            onYear={setYear}
            onClass={setClassName}
          />

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
            <StatCard label="Active classes" value={stats.active_classes} sub={stats.total_classes ? `/ ${stats.total_classes}` : ''} />
            <StatCard label="Teachers in class" value={stats.teachers_in_class} />
            <StatCard label="Missing teachers" value={stats.missing_teachers} />
            <StatCard
              label="Late teachers"
              value={stats.late_teachers}
              sub={lateThreshold != null ? `>${lateThreshold} min` : undefined}
              href={h('/teacher-period-attendance?tab=settings')}
            />
            <div className="rounded-2xl bg-white border border-[#000435]/12 p-4 shadow-sm col-span-2 md:col-span-1 xl:col-span-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#000435]/45 mb-2">Current period</p>
              {live?.current_period ? (
                <>
                  <p className="text-lg font-black text-[#000435]">{live.current_period.name}</p>
                  <p className="text-xs text-[#000435]/50">{live.current_period.start_time} – {live.current_period.end_time}</p>
                  <p className="text-sm font-bold mt-2 tabular-nums" style={{ color: AMBER }}>{formatCountdown(remainingSec)} remaining</p>
                  <div className="h-1 rounded-full bg-[#000435]/10 mt-2 overflow-hidden">
                    <div className="h-full transition-all duration-1000" style={{
                      background: AMBER,
                      width: `${live.current_period.remaining_seconds ? Math.max(0, 100 - (remainingSec / live.current_period.remaining_seconds) * 100) : 0}%`,
                    }} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#000435]/40">No active period</p>
              )}
            </div>
            <StatCard
              label="Live attendance"
              value={`${stats.live_attendance_pct || 0}%`}
              sub={stats.live_attendance_total ? `${stats.live_attendance_marked ?? 0}/${stats.live_attendance_total} marked` : 'period scan'}
            />
          </div>

          <PeriodTimeline periods={live?.period_timeline} />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 bg-[#fafafa]">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} style={{ color: AMBER }} />
            <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#000435]/70">Live campus monitor</h2>
          </div>
          {loading && !live ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin" size={36} style={{ color: AMBER }} /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(live?.class_cards || []).map((c) => (
                <ClassCard key={c.class_name} card={c} onClick={setSelectedClass} />
              ))}
              {(live?.class_cards || []).length === 0 && (
                <EmptyCampusState live={live} />
              )}
            </div>
          )}
        </section>

        <div className="grid lg:grid-cols-12 gap-6">
          <section className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={18} style={{ color: NAVY }} />
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#000435]/70">Live lesson stream</h2>
            </div>
            <div className="rounded-2xl border border-[#000435]/10 bg-white max-h-[420px] overflow-y-auto divide-y divide-[#000435]/8 shadow-sm">
              {(live?.activity_stream || []).map((ev, i) => (
                <div key={i} className="px-4 py-3 flex gap-3 hover:bg-amber-50/30">
                  <span className="text-[11px] font-bold tabular-nums shrink-0 w-12" style={{ color: AMBER }}>{ev.time}</span>
                  <p className="text-sm text-[#000435]/75">{ev.message}</p>
                </div>
              ))}
              {(live?.activity_stream || []).length === 0 && (
                <p className="text-center text-[#000435]/35 py-12 text-sm">Waiting for classroom events…</p>
              )}
            </div>
          </section>

          <section className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={18} style={{ color: NAVY }} />
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#000435]/70">Live alerts center</h2>
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {(live?.alerts || []).map((a) => (
                <div key={a.id} className={`rounded-xl border p-4 flex items-start justify-between gap-3 bg-white ${
                  a.priority === 'high' ? 'border-[#000435]/30' : a.priority === 'medium' ? 'border-amber-300 bg-amber-50/50' : 'border-[#000435]/10'
                }`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#000435]/40 mb-1">{a.priority} priority</p>
                    <p className="text-sm font-semibold text-[#000435]">{a.title || a.message}</p>
                    {a.class_name && <p className="text-xs text-[#000435]/50 mt-1">{a.class_name} · {a.teacher_name}</p>}
                  </div>
                  <button type="button" className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase" style={{ color: AMBER }}>
                    Investigate <ChevronRight size={12} />
                  </button>
                </div>
              ))}
              {(live?.alerts || []).length === 0 && (
                <p className="text-center text-[#000435]/35 py-12 text-sm rounded-xl border border-[#000435]/10 bg-white">No active alerts</p>
              )}
            </div>
          </section>

          <section className="lg:col-span-4">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} style={{ color: NAVY }} />
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#000435]/70">Teacher presence radar</h2>
            </div>
            <div className="grid gap-2 max-h-[420px] overflow-y-auto pr-1">
              {(live?.teacher_radar || []).filter((t) => t.status !== 'expected' || t.current_class).slice(0, 20).map((t) => {
                const meta = STATUS_META[t.status] || STATUS_META.expected;
                const isMissing = t.status === 'missing';
                return (
                  <div key={t.teacher_id} className={`rounded-xl border p-3 bg-white ${isMissing ? 'border-[#000435]/40' : 'border-[#000435]/10'}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-black text-sm text-[#000435] uppercase tracking-tight">{t.teacher_name}</p>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-[#000435] text-white flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {t.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      <span className="text-[#000435]/40">Class</span>
                      <span className="text-[#000435] font-semibold text-right">{t.current_class || '—'}</span>
                      <span className="text-[#000435]/40">Subject</span>
                      <span className="text-[#000435] font-semibold text-right truncate">{t.subject || '—'}</span>
                      <span className="text-[#000435]/40">Check-in</span>
                      <span className="font-semibold text-right tabular-nums" style={{ color: AMBER }}>{t.check_in || '—'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-[#000435]/10 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} style={{ color: AMBER }} />
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#000435]/70">Today&apos;s insights</h2>
            </div>
            <ul className="space-y-2 text-sm text-[#000435]/75">
              {live?.insights?.teacher_punctuality_pct != null && (
                <li className="flex items-center gap-2"><CheckCircle2 size={14} style={{ color: AMBER }} /> {live.insights.teacher_punctuality_pct}% teacher punctuality</li>
              )}
              <li className="flex items-center gap-2">
                <AlertTriangle size={14} style={{ color: AMBER }} />
                {stats.late_teachers || 0} teachers late
                {lateThreshold != null ? ` (after ${lateThreshold} min threshold)` : ''}
              </li>
              <li className="flex items-center gap-2"><AlertTriangle size={14} style={{ color: NAVY }} /> {live?.insights?.unattended || 0} unattended lesson(s)</li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} style={{ color: NAVY }} />
                {stats.live_attendance_marked ?? 0}/{stats.live_attendance_total ?? 0} live periods with teacher attendance marked ({stats.live_attendance_pct || 0}%)
              </li>
            </ul>
          </section>
          <section className="rounded-2xl border border-[#000435]/10 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} style={{ color: AMBER }} />
              <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#000435]/70">Teacher workload</h2>
            </div>
            <div className="space-y-3">
              {heatMap.map(([name, count]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs font-bold mb-1 text-[#000435]">
                    <span>{name}</span>
                    <span className="opacity-45">{count} active</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#000435]/10 overflow-hidden">
                    <div className="h-full" style={{ width: `${(count / maxHeat) * 100}%`, background: AMBER }} />
                  </div>
                </div>
              ))}
              {heatMap.length === 0 && <p className="text-[#000435]/35 text-sm">No active teaching data yet today.</p>}
            </div>
          </section>
        </div>
      </div>

      <ClassDrawer card={selectedClass} onClose={() => setSelectedClass(null)} />
    </div>
  );
}
