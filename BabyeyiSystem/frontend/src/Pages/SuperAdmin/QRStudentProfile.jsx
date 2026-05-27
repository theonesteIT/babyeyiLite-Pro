/**
 * QRStudentsProfile.jsx
 * Public student profile page — opened via QR code scan (no login required)
 *
 * Route: /qr-student-profile/:studentId  (preferred for QR — survives scanner quirks)
 *     or /qr-student-profile?student=:id
 *
 * Features:
 *  - No authentication required — fully public
 *  - Reads student id from path param, then query string, then hash
 *  - Fetches student data from public API endpoint
 *  - Modern, mobile-first, luxury card design
 *  - Animated entrance, glassmorphism, premium typography
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  ExternalLink,
  Globe,
  GraduationCap,
  IdCard,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  School,
  ShieldCheck,
  User,
  UserRound,
  VenusAndMars,
  Wallet,
} from 'lucide-react';

/* ─── Config ──────────────────────────────────────────────────────── */
const API_ROOT     = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)      || 'http://localhost:5100';
const API          = `${API_ROOT.replace(/\/$/, '')}/api`;
const UPLOADS_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_UPLOADS_BASE) || API_ROOT.replace(/\/$/, '');
const PUBLIC_SITE  = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL) || 'https://babyeyi.rw';

function getFrontendOrigin() {
  const envOrigin = String(PUBLIC_SITE || '').trim();
  if (envOrigin) return envOrigin.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://babyeyi.rw';
}

const PUBLIC_SITE_URL = getFrontendOrigin();
const UNIFORM_ICON_SIZE = 16;
const UNIFORM_ICON_STROKE = 1.75;

/* ─── Helpers ─────────────────────────────────────────────────────── */
function getStudentIdFromSearchAndHash() {
  const search = new URLSearchParams(window.location.search);
  const fromSearch = search.get('student') || search.get('id');
  if (fromSearch) return fromSearch.trim();
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.includes('=')) {
    const h = new URLSearchParams(hash.startsWith('?') ? hash.slice(1) : hash);
    const fromHash = h.get('student') || h.get('id');
    if (fromHash) return fromHash.trim();
  }
  return null;
}

function deriveSectionFromClass(cn) {
  if (!cn || cn === '-') return '-';
  const raw = String(cn).trim();
  const up  = raw.split(/[\s/–—-]/)[0].replace(/\s+/g, '').toUpperCase();
  if (/^N[1-3]$/.test(up)) return 'Nursery';
  if (/^P[1-6]$/.test(up)) return 'Primary Level';
  if (/^S[1-3]$/.test(up)) return 'O-Level';
  if (/^S[4-6]$/.test(up)) return 'A-Level';
  return raw;
}

function formatWebsite(w) {
  return w ? String(w).replace(/^https?:\/\//i, '').trim() : '';
}

function buildStudentFeesUrl(student) {
  const base = PUBLIC_SITE_URL.replace(/\/$/, '');
  const p = new URLSearchParams();
  if (student?.id) p.set('student', String(student.id));
  if (student?.studentCode) p.set('student_code', String(student.studentCode));
  if (student?.fullName) p.set('name', String(student.fullName));
  return `${base}/paid-at-school?${p.toString()}`;
}

function mapRowToStudent(row) {
  const fullName = row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim();
  const code     = row.code || row.student_code || row.student_uid || `ST-${row.id}`;
  const photoRel = row.photo_url || (row.student_photo ? `/uploads/student-profile-photos/${row.student_photo}` : null);
  const loc      = [row.sector, row.district, row.province].filter(Boolean).join(', ');
  return {
    id:             row.id,
    studentCode:    code,
    fullName,
    dob:            row.birth_year || '-',
    gender:         row.gender || '-',
    className:      row.class_name || '-',
    academicYear:   row.academic_year || '-',
    registrationYear: row.registration_year || row.enrollment_year || '-',
    school:         row.school_name || '-',
    photo:          photoRel ? `${UPLOADS_BASE}${photoRel}` : null,
    province:       row.province || '',
    district:       row.district || '',
    sector:         row.sector   || '',
    schoolLogo:     row.logo_url ? `${UPLOADS_BASE}${row.logo_url}` : null,
    phone:          row.school_phone  ? String(row.school_phone).trim()  : '',
    email:          row.school_email  ? String(row.school_email).trim()  : '',
    website:        formatWebsite(row.school_website || ''),
    postalAddress:  row.postal_address ? String(row.postal_address).trim() : '',
    addressSummary: [row.postal_address, loc].filter(Boolean).join(' · ') || '—',
  };
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
═══════════════════════════════════════════════════════════════════ */
export default function QRStudentsProfile() {
  const { studentId: idFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const [student,   setStudent]   = useState(null);
  const [insights,  setInsights]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error,     setError]     = useState(null);
  const [imgError,  setImgError]  = useState(false);
  const [entered,   setEntered]   = useState(false);

  const resolveStudentId = useCallback(() => {
    const a = idFromPath && String(idFromPath).trim();
    if (a) return a;
    const q = searchParams.get('student') || searchParams.get('id');
    if (q) return q.trim();
    return getStudentIdFromSearchAndHash();
  }, [idFromPath, searchParams]);

  const fetchInsights = useCallback(async (id) => {
    setInsightsLoading(true);
    try {
      const res = await fetch(`${API}/students/public/${encodeURIComponent(id)}/school-insights`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.success && json.data) {
        setInsights(json.data);
      } else {
        setInsights(null);
      }
    } catch {
      setInsights(null);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const fetchStudent = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    setInsights(null);
    try {
      /* Public endpoint — no credentials required */
      const res = await fetch(`${API}/students/public/${encodeURIComponent(id)}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Student not found. This QR code may be invalid or expired.');
        if (res.status === 400) throw new Error('Invalid student link. Ask your school to print a new ID card QR.');
        throw new Error(`Server error (${res.status}). Please try again.`);
      }
      const json = await res.json();
      if (!json.success && !json.data && !json.student) throw new Error(json.message || 'Could not load student data.');
      const raw = json.data || json.student || json;
      const mapped = mapRowToStudent(raw);
      setStudent(mapped);
      setTimeout(() => setEntered(true), 60);
      fetchInsights(mapped.id || id);
    } catch (e) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [fetchInsights]);

  useEffect(() => {
    const id = resolveStudentId();
    if (!id) {
      setError('No student ID in this link. Re-scan the QR on the ID card, or use a card printed after the latest update.');
      setLoading(false);
      return;
    }
    fetchStudent(id);
  }, [fetchStudent, resolveStudentId]);

  return (
    <>
      <style>{CSS}</style>
      <div className="qrp-root">
        {/* Ambient background orbs */}
        <div className="qrp-orb qrp-orb1" />
        <div className="qrp-orb qrp-orb2" />
        <div className="qrp-orb qrp-orb3" />

        {/* Top branding bar */}
        <header className="qrp-header">
          <div className="qrp-header-inner">
            <div className="qrp-brand-badge">
              <span className="qrp-brand-icon"><BabyeyiLogoMark /></span>
              <span className="qrp-brand-name">Babyeyi System</span>
            </div>
            <div className="qrp-header-tag">Student Verification Portal</div>
          </div>
        </header>

        <main className="qrp-main">
          {loading  && <LoadingState />}
          {error    && !loading && <ErrorState message={error} />}
          {student  && !loading && (
            <ProfileCard
              student={student}
              insights={insights}
              insightsLoading={insightsLoading}
              entered={entered}
              imgError={imgError}
              setImgError={setImgError}
            />
          )}
        </main>

        <footer className="qrp-footer">
          <p className="qrp-footer-text">
            <Lock size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Official record · Babyeyi Rwanda School Management System · <a href={PUBLIC_SITE_URL} className="qrp-footer-link">{PUBLIC_SITE_URL.replace(/^https?:\/\//, '')}</a>
          </p>
        </footer>
      </div>
    </>
  );
}

/* ─── Loading state ───────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="qrp-state-wrap">
      <div className="qrp-loader">
        <div className="qrp-spinner" />
        <div className="qrp-spinner qrp-spinner2" />
      </div>
      <p className="qrp-state-title">Verifying student…</p>
      <p className="qrp-state-sub">Fetching official records securely</p>
    </div>
  );
}

/* ─── Error state ─────────────────────────────────────────────────── */
function ErrorState({ message }) {
  return (
    <div className="qrp-state-wrap">
      <div className="qrp-error-icon"><AlertTriangle size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} /></div>
      <p className="qrp-state-title">Unable to Load Profile</p>
      <p className="qrp-state-sub">{message}</p>
      <a href={PUBLIC_SITE_URL} className="qrp-back-btn">Visit Babyeyi Portal →</a>
    </div>
  );
}

function BabyeyiLogoMark() {
  return (
    <span className="qrp-brand-logo" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="6" fill="url(#qrp-grad)" stroke="#E8C76A" strokeWidth="1.2" />
        <path d="M7.2 6.8h6.9c2.25 0 3.45 1.08 3.45 2.84 0 1.22-.73 2.08-1.86 2.44 1.35.31 2.2 1.34 2.2 2.82 0 2.12-1.63 3.5-4.25 3.5H7.2V6.8Zm5.92 4.62c1.02 0 1.53-.43 1.53-1.16 0-.75-.51-1.15-1.53-1.15H10.2v2.31h2.92Zm.35 4.65c1.1 0 1.67-.45 1.67-1.26 0-.79-.57-1.23-1.67-1.23H10.2v2.49h3.27Z" fill="#0A1628" />
        <defs>
          <linearGradient id="qrp-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F6D46D" />
            <stop offset="1" stopColor="#FFBF00" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'discipline', label: 'Discipline', icon: ShieldCheck },
  { id: 'academic', label: 'Academic', icon: GraduationCap },
  { id: 'gate', label: 'Gate Today', icon: DoorOpen },
  { id: 'attendance', label: 'Class', icon: ClipboardList },
  { id: 'babyeyi', label: 'Babyeyi', icon: Wallet },
];

function formatDateLabel(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).slice(0, 10);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeLabel(v) {
  if (!v) return '—';
  const s = String(v);
  if (/^\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function statusPillClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'present' || s === 'on_time' || s === 'checked_in') return 'qrp-status-present';
  if (s === 'late') return 'qrp-status-late';
  if (s === 'absent') return 'qrp-status-absent';
  return 'qrp-status-neutral';
}

function EmptyInsight({ text }) {
  return <p className="qrp-empty-insight">{text}</p>;
}

function DisciplineTab({ data }) {
  if (!data) return <EmptyInsight text="Discipline records are not available yet." />;
  const { score, behavior_grade, current_marks, incidents = [], mark_logs = [] } = data;
  return (
    <div className="qrp-tab-panel">
      <div className="qrp-stat-row">
        <div className="qrp-stat-card">
          <div className="qrp-stat-val">{score ?? '—'}</div>
          <div className="qrp-stat-lbl">Conduct score</div>
        </div>
        <div className="qrp-stat-card">
          <div className="qrp-stat-val">{behavior_grade || '—'}</div>
          <div className="qrp-stat-lbl">Grade</div>
        </div>
        <div className="qrp-stat-card">
          <div className="qrp-stat-val">{current_marks ?? '—'}</div>
          <div className="qrp-stat-lbl">Current marks</div>
        </div>
      </div>
      {incidents.length > 0 ? (
        <>
          <h3 className="qrp-subhead">Recent incidents</h3>
          <ul className="qrp-list">
            {incidents.slice(0, 15).map((c, i) => (
              <li key={`${c.created_at}-${i}`} className="qrp-list-item">
                <div className="qrp-list-title">{c.lesson_subject || 'General'}</div>
                <div className="qrp-list-meta">
                  −{c.marks_deducted} marks · {formatDateLabel(c.created_at)}
                </div>
                {c.description ? <div className="qrp-list-desc">{c.description}</div> : null}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyInsight text="No discipline incidents on record." />
      )}
      {mark_logs.length > 0 ? (
        <>
          <h3 className="qrp-subhead">Mark adjustments</h3>
          <ul className="qrp-list">
            {mark_logs.slice(0, 10).map((l, i) => (
              <li key={`${l.created_at}-${i}`} className="qrp-list-item">
                <div className="qrp-list-title">{l.action || 'Update'} · {l.marks} marks</div>
                <div className="qrp-list-meta">{l.reason || l.notes || '—'} · {formatDateLabel(l.action_date || l.created_at)}</div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function AcademicTab({ data }) {
  if (!data) return <EmptyInsight text="Academic marks are not available yet." />;
  const { average_grade, latest_by_subject = [], assessments = [] } = data;
  return (
    <div className="qrp-tab-panel">
      <div className="qrp-stat-row">
        <div className="qrp-stat-card qrp-stat-card-wide">
          <div className="qrp-stat-val">{average_grade != null ? `${average_grade}%` : '—'}</div>
          <div className="qrp-stat-lbl">Average across assessments</div>
        </div>
      </div>
      {latest_by_subject.length > 0 ? (
        <>
          <h3 className="qrp-subhead">Latest by subject</h3>
          <ul className="qrp-list">
            {latest_by_subject.map((m) => (
              <li key={m.subject_name} className="qrp-list-item qrp-list-item-row">
                <span className="qrp-list-title">{m.subject_name}</span>
                <span className="qrp-score-pill">{m.percent}%</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {assessments.length > 0 ? (
        <>
          <h3 className="qrp-subhead">All assessments</h3>
          <ul className="qrp-list">
            {assessments.slice(0, 20).map((m, i) => (
              <li key={`${m.subject_name}-${m.assessment_name}-${i}`} className="qrp-list-item qrp-list-item-row">
                <div>
                  <div className="qrp-list-title">{m.assessment_name}</div>
                  <div className="qrp-list-meta">{m.subject_name} · {formatDateLabel(m.assessment_date)}</div>
                </div>
                <span className="qrp-score-pill">{m.score_obtained}/{m.max_score}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyInsight text="No academic marks recorded yet." />
      )}
    </div>
  );
}

function GateTab({ data, today }) {
  if (!data) return <EmptyInsight text="Gate attendance is not available yet." />;
  const gateToday = data.today;
  return (
    <div className="qrp-tab-panel">
      <h3 className="qrp-subhead">Today ({formatDateLabel(today)})</h3>
      {gateToday ? (
        <div className="qrp-gate-grid">
          <div className="qrp-gate-card">
            <div className="qrp-gate-label">Morning entry</div>
            <div className="qrp-gate-time">{formatTimeLabel(gateToday.morning_check_in)}</div>
            <span className={`qrp-status-pill ${statusPillClass(gateToday.morning_status)}`}>
              {gateToday.morning_status || 'No status'}
            </span>
          </div>
          <div className="qrp-gate-card">
            <div className="qrp-gate-label">Evening exit</div>
            <div className="qrp-gate-time">{formatTimeLabel(gateToday.evening_check_out)}</div>
            <span className={`qrp-status-pill ${statusPillClass(gateToday.evening_status)}`}>
              {gateToday.evening_status || 'No status'}
            </span>
          </div>
        </div>
      ) : (
        <EmptyInsight text="No gate entry or exit recorded for today yet." />
      )}
      {(data.recent || []).length > 0 ? (
        <>
          <h3 className="qrp-subhead">Recent days</h3>
          <ul className="qrp-list">
            {data.recent.map((r) => (
              <li key={r.attendance_date} className="qrp-list-item qrp-list-item-row">
                <span className="qrp-list-title">{formatDateLabel(r.attendance_date)}</span>
                <span className="qrp-list-meta">
                  In {formatTimeLabel(r.morning_check_in)} · Out {formatTimeLabel(r.evening_check_out)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function AttendanceTab({ data, today }) {
  if (!data) return <EmptyInsight text="Class attendance is not available yet." />;
  const { today: periodToday = [], recent = [], timetable = [] } = data;
  const dayName = new Date().toLocaleDateString('en-GB', { weekday: 'long' });
  const todayTimetable = timetable.filter(
    (t) => String(t.day_of_week || '').toLowerCase() === dayName.toLowerCase()
  );
  return (
    <div className="qrp-tab-panel">
      <h3 className="qrp-subhead">Period attendance today</h3>
      {periodToday.length > 0 ? (
        <ul className="qrp-list">
          {periodToday.map((r, i) => (
            <li key={`${r.subject_name}-${i}`} className="qrp-list-item qrp-list-item-row">
              <div>
                <div className="qrp-list-title">{r.subject_name}</div>
                <div className="qrp-list-meta">{r.time_range || '—'}</div>
              </div>
              <span className={`qrp-status-pill ${statusPillClass(r.status)}`}>{r.status || '—'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyInsight text="No period attendance marked for today yet." />
      )}
      {todayTimetable.length > 0 ? (
        <>
          <h3 className="qrp-subhead">Today&apos;s timetable ({dayName})</h3>
          <ul className="qrp-list">
            {todayTimetable.map((t) => (
              <li key={t.id} className="qrp-list-item">
                <div className="qrp-list-title">{t.subject_name}</div>
                <div className="qrp-list-meta">
                  {t.start_time && t.end_time ? `${t.start_time} – ${t.end_time}` : '—'}
                  {t.room ? ` · ${t.room}` : ''} · {t.teacher_name}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : timetable.length > 0 ? (
        <>
          <h3 className="qrp-subhead">Class timetable</h3>
          <ul className="qrp-list">
            {timetable.slice(0, 12).map((t) => (
              <li key={t.id} className="qrp-list-item">
                <div className="qrp-list-title">{t.day_of_week} · {t.subject_name}</div>
                <div className="qrp-list-meta">
                  {t.start_time && t.end_time ? `${t.start_time} – ${t.end_time}` : '—'}
                  {t.room ? ` · ${t.room}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyInsight text="No class timetable on file for this class." />
      )}
      {recent.length > 0 ? (
        <>
          <h3 className="qrp-subhead">Recent period records</h3>
          <ul className="qrp-list">
            {recent.slice(0, 10).map((r, i) => (
              <li key={`${r.date}-${r.subject_name}-${i}`} className="qrp-list-item qrp-list-item-row">
                <div>
                  <div className="qrp-list-title">{r.subject_name}</div>
                  <div className="qrp-list-meta">{formatDateLabel(r.date)}</div>
                </div>
                <span className={`qrp-status-pill ${statusPillClass(r.status)}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function BabyeyiTab({ data, student }) {
  if (!data?.babyeyi) {
    return (
      <div className="qrp-tab-panel">
        <EmptyInsight
          text={
            student?.className && student.className !== '-'
              ? `No approved Babyeyi fee document found for class ${student.className} yet.`
              : 'Student class is not set — Babyeyi cannot be loaded.'
          }
        />
      </div>
    );
  }
  const b = data.babyeyi;
  const meta = b.babyeyi || {};
  const fees = b.school_fees || [];
  const reqs = b.requirements || [];
  return (
    <div className="qrp-tab-panel">
      <div className="qrp-stat-row">
        <div className="qrp-stat-card qrp-stat-card-wide">
          <div className="qrp-stat-val">
            {b.combined_total_rwf != null
              ? `${Number(b.combined_total_rwf).toLocaleString()} RWF`
              : '—'}
          </div>
          <div className="qrp-stat-lbl">
            Class Babyeyi · {meta.term || b.term || '—'} · {meta.academic_year || b.academic_year || '—'}
          </div>
        </div>
      </div>
      {fees.length > 0 ? (
        <>
          <h3 className="qrp-subhead">School fees</h3>
          <ul className="qrp-list">
            {fees.map((f) => (
              <li key={f.id} className="qrp-list-item qrp-list-item-row">
                <span className="qrp-list-title">{f.name}</span>
                <span className="qrp-score-pill">{Number(f.amount || 0).toLocaleString()} RWF</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {reqs.length > 0 ? (
        <>
          <h3 className="qrp-subhead">Requirements</h3>
          <ul className="qrp-list">
            {reqs.map((r) => (
              <li key={r.babyeyi_requirement_id || r.requirement_name} className="qrp-list-item qrp-list-item-row">
                <span className="qrp-list-title">{r.requirement_name || r.item}</span>
                <span className="qrp-score-pill">
                  {Number(r.line_total_rwf ?? r.price ?? 0).toLocaleString()} RWF
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <a href={buildStudentFeesUrl(student)} className="qrp-action-btn qrp-action-primary" style={{ marginTop: 14 }}>
        <Wallet size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} />
        Pay school fees online
        <ExternalLink size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} />
      </a>
    </div>
  );
}

/* ─── Main profile card ───────────────────────────────────────────── */
function ProfileCard({ student, insights, insightsLoading, entered, imgError, setImgError }) {
  const [activeTab, setActiveTab] = useState('profile');
  const section = deriveSectionFromClass(student.className);

  const infoItems = [
    { icon: IdCard,       label: 'Student Code', value: student.studentCode, mono: true, accent: true },
    { icon: GraduationCap,label: 'Class',         value: student.className },
    { icon: BookOpen,     label: 'Section',       value: section },
    { icon: CalendarDays, label: 'Academic Year', value: student.academicYear },
    { icon: VenusAndMars, label: 'Gender',        value: student.gender },
    { icon: CalendarDays, label: 'Year of Birth', value: student.dob },
    { icon: CalendarClock,label: 'Registered',    value: student.registrationYear },
  ].filter(i => i.value && i.value !== '-');

  const schoolItems = [
    { icon: School, label: 'School',    value: student.school },
    { icon: MapPin, label: 'Location',  value: student.addressSummary },
    { icon: Phone,  label: 'Phone',     value: student.phone,  href: `tel:${student.phone}` },
    { icon: Mail,   label: 'Email',     value: student.email,  href: `mailto:${student.email}` },
    { icon: Globe,  label: 'Website',   value: student.website, href: student.website ? `https://${student.website}` : null },
  ].filter(i => i.value);

  return (
    <div className={`qrp-card-outer ${entered ? 'qrp-entered' : ''}`}>

      {/* ── Hero section ── */}
      <div className="qrp-hero">
        {/* School logo top-right */}
        {student.schoolLogo && (
          <div className="qrp-school-logo-wrap">
            <img src={student.schoolLogo} alt="School Logo" className="qrp-school-logo" />
          </div>
        )}

        {/* Verified badge */}
        <div className="qrp-verified-badge">
          <span className="qrp-verified-dot" />
          Verified Student
        </div>

        {/* Profile photo */}
        <div className="qrp-photo-ring">
          <div className="qrp-photo-ring-inner">
            {student.photo && !imgError ? (
              <img
                src={student.photo}
                alt={student.fullName}
                className="qrp-photo"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="qrp-photo-placeholder">
                <UserRound size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} />
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <h1 className="qrp-name">{student.fullName}</h1>
        <p className="qrp-school-name">{student.school}</p>

        {/* Quick pills */}
        <div className="qrp-pills">
          {section && section !== '-' && <span className="qrp-pill qrp-pill-blue">{section}</span>}
          {student.className && student.className !== '-' && <span className="qrp-pill qrp-pill-gold">{student.className}</span>}
          {student.gender && student.gender !== '-' && <span className="qrp-pill qrp-pill-slate">{student.gender}</span>}
        </div>
      </div>

      {/* ── School insights tabs ── */}
      <div className="qrp-tabs-wrap">
        <div className="qrp-tabs" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={`qrp-tab ${activeTab === id ? 'qrp-tab-active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={14} strokeWidth={UNIFORM_ICON_STROKE} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        {insightsLoading && activeTab !== 'profile' ? (
          <div className="qrp-insights-loading">
            <Loader2 size={20} className="qrp-spin" strokeWidth={UNIFORM_ICON_STROKE} />
            Loading school records…
          </div>
        ) : null}
        {activeTab === 'discipline' && <DisciplineTab data={insights?.discipline} />}
        {activeTab === 'academic' && <AcademicTab data={insights?.marks} />}
        {activeTab === 'gate' && <GateTab data={insights?.gate} today={insights?.filters?.today} />}
        {activeTab === 'attendance' && (
          <AttendanceTab data={insights?.period_attendance} today={insights?.filters?.today} />
        )}
        {activeTab === 'babyeyi' && <BabyeyiTab data={insights} student={student} />}
      </div>

      {activeTab === 'profile' && (
      <>
      {/* ── Student info grid ── */}
      <div className="qrp-section">
        <div className="qrp-section-header">
          <span className="qrp-section-icon"><User size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} /></span>
          <span className="qrp-section-label">Student Information</span>
        </div>
        <div className="qrp-info-grid">
          {infoItems.map(({ icon: Icon, label, value, mono, accent }) => (
            <div key={label} className={`qrp-info-row ${accent ? 'qrp-info-row-accent' : ''}`}>
              <div className="qrp-info-icon"><Icon size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} /></div>
              <div className="qrp-info-content">
                <div className="qrp-info-label">{label}</div>
                <div className={`qrp-info-value ${mono ? 'qrp-mono' : ''}`}>{value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── School details ── */}
      <div className="qrp-section">
        <div className="qrp-section-header">
          <span className="qrp-section-icon"><School size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} /></span>
          <span className="qrp-section-label">School Details</span>
        </div>
        <div className="qrp-info-grid">
          {schoolItems.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="qrp-info-row">
              <div className="qrp-info-icon"><Icon size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} /></div>
              <div className="qrp-info-content">
                <div className="qrp-info-label">{label}</div>
                {href ? (
                  <a href={href} className="qrp-info-link">{value}</a>
                ) : (
                  <div className="qrp-info-value">{value}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Authentication stamp ── */}
      <div className="qrp-stamp">
        <div className="qrp-stamp-inner">
          <div className="qrp-stamp-left">
            <div className="qrp-stamp-seal"><BadgeCheck size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} /></div>
            <div>
              <div className="qrp-stamp-title">Officially Registered</div>
              <div className="qrp-stamp-sub">Babyeyi Rwanda School System</div>
            </div>
          </div>
          <div className="qrp-stamp-id">
            <div className="qrp-stamp-id-label">ID</div>
            <div className="qrp-stamp-id-val">{student.studentCode}</div>
          </div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div className="qrp-actions">
        <a href={buildStudentFeesUrl(student)} className="qrp-action-btn qrp-action-primary">
          <IdCard size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} />
          Pay school fees for this student
          <ExternalLink size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} />
        </a>
        <a href={PUBLIC_SITE_URL} className="qrp-action-btn qrp-action-primary">
          <Globe size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} />
          Visit School Portal
          <ExternalLink size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} />
        </a>
        {student.phone && (
          <a href={`tel:${student.phone}`} className="qrp-action-btn qrp-action-secondary">
            <Phone size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} />
            Contact School
          </a>
        )}
      </div>

      {/* ── Note ── */}
      <div className="qrp-note">
        <span className="qrp-note-icon"><ShieldCheck size={UNIFORM_ICON_SIZE} strokeWidth={UNIFORM_ICON_STROKE} /></span>
        This profile is publicly accessible via an official QR code issued on the student&apos;s ID card.
        The information displayed is verified and managed by the registered school.
      </div>
      </>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CSS — all-in-one, mobile-first, zero dependencies
═══════════════════════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --navy:        #0a1628;
    --navy-mid:    #0f2044;
    --navy-light:  #1a3572;
    --gold:        #c8a84b;
    --gold-light:  #e8c76a;
    --gold-pale:   rgba(200,168,75,0.12);
    --amber:       #FFBF00;
    --white:       #ffffff;
    --text:        #f0f4ff;
    --text-muted:  rgba(240,244,255,0.55);
    --text-faint:  rgba(240,244,255,0.28);
    --border:      rgba(200,168,75,0.15);
    --card-bg:     rgba(12,24,60,0.72);
    --glass:       rgba(255,255,255,0.04);
    --radius:      24px;
    --radius-sm:   14px;
    --font:        'DM Sans', system-ui, sans-serif;
    --font-display:'Playfair Display', Georgia, serif;
    --font-mono:   'DM Mono', monospace;
  }

  html, body { height: 100%; }

  .qrp-root {
    min-height: 100vh;
    background: var(--navy);
    font-family: var(--font);
    color: var(--text);
    position: relative;
    overflow-x: hidden;
  }

  /* ── Ambient background ── */
  .qrp-orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
  }
  .qrp-orb1 {
    width: 520px; height: 520px;
    background: radial-gradient(circle, rgba(200,168,75,0.14) 0%, transparent 70%);
    top: -160px; right: -160px;
    animation: orbFloat1 14s ease-in-out infinite;
  }
  .qrp-orb2 {
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(26,53,114,0.45) 0%, transparent 70%);
    bottom: 5%; left: -100px;
    animation: orbFloat2 18s ease-in-out infinite;
  }
  .qrp-orb3 {
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(255,191,0,0.08) 0%, transparent 70%);
    top: 45%; right: -80px;
    animation: orbFloat1 22s ease-in-out infinite reverse;
  }

  @keyframes orbFloat1 {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(-30px,20px) scale(1.05); }
    66%      { transform: translate(20px,-15px) scale(0.97); }
  }
  @keyframes orbFloat2 {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(40px,-30px) scale(1.08); }
  }

  /* ── Header ── */
  .qrp-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(10,22,40,0.88);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
  }
  .qrp-header-inner {
    max-width: 560px;
    margin: 0 auto;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .qrp-brand-badge {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .qrp-brand-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 0 8px rgba(200,168,75,0.42));
  }
  .qrp-brand-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }
  .qrp-brand-name {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.3px;
    background: linear-gradient(135deg, var(--gold-light), var(--amber));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .qrp-header-tag {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-muted);
    white-space: nowrap;
  }

  /* ── Main ── */
  .qrp-main {
    position: relative;
    z-index: 1;
    min-height: calc(100vh - 120px);
    padding: 28px 16px 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ── State screens ── */
  .qrp-state-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 55vh;
    gap: 16px;
    text-align: center;
    padding: 32px 24px;
    max-width: 380px;
  }
  .qrp-loader {
    position: relative;
    width: 64px; height: 64px;
    margin-bottom: 8px;
  }
  .qrp-spinner {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid transparent;
    border-top-color: var(--gold);
    animation: spin 1s linear infinite;
  }
  .qrp-spinner2 {
    inset: 10px;
    border-top-color: var(--amber);
    animation-duration: 0.7s;
    animation-direction: reverse;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .qrp-error-icon { font-size: 52px; filter: grayscale(0.3); margin-bottom: 8px; }
  .qrp-state-title {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
  }
  .qrp-state-sub {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .qrp-back-btn {
    display: inline-block;
    margin-top: 8px;
    padding: 12px 24px;
    border-radius: 50px;
    background: linear-gradient(135deg, var(--gold), var(--amber));
    color: var(--navy);
    font-weight: 800;
    font-size: 13px;
    text-decoration: none;
    letter-spacing: 0.3px;
    box-shadow: 0 8px 24px rgba(200,168,75,0.3);
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .qrp-back-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(200,168,75,0.4); }

  /* ── Profile card ── */
  .qrp-card-outer {
    width: 100%;
    max-width: 520px;
    display: flex;
    flex-direction: column;
    gap: 0;
    opacity: 0;
    transform: translateY(32px) scale(0.98);
    transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1);
  }
  .qrp-card-outer.qrp-entered {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  /* ── Hero ── */
  .qrp-hero {
    position: relative;
    background: linear-gradient(165deg, #0f2044 0%, #162d6a 60%, #0a1628 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius) var(--radius) 0 0;
    padding: 40px 24px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    overflow: hidden;
  }
  .qrp-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% -10%, rgba(200,168,75,0.18) 0%, transparent 65%);
    pointer-events: none;
  }
  .qrp-hero::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200,168,75,0.4), transparent);
  }

  .qrp-school-logo-wrap {
    position: absolute;
    top: 18px; right: 18px;
    width: 50px; height: 50px;
    border-radius: 12px;
    overflow: hidden;
    border: 1.5px solid rgba(200,168,75,0.3);
    background: rgba(0,0,0,0.3);
    backdrop-filter: blur(8px);
  }
  .qrp-school-logo {
    width: 100%; height: 100%;
    object-fit: contain;
  }

  .qrp-verified-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(34,197,94,0.12);
    border: 1px solid rgba(34,197,94,0.3);
    border-radius: 50px;
    padding: 5px 14px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #4ade80;
    margin-bottom: 22px;
    position: relative;
    z-index: 1;
  }
  .qrp-verified-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,0.25);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100% { box-shadow: 0 0 0 3px rgba(34,197,94,0.25); }
    50%      { box-shadow: 0 0 0 6px rgba(34,197,94,0.1); }
  }

  /* Photo ring */
  .qrp-photo-ring {
    position: relative;
    width: 130px; height: 130px;
    border-radius: 50%;
    padding: 4px;
    background: conic-gradient(from 180deg, var(--gold) 0%, var(--amber) 35%, var(--gold) 70%, var(--gold-light) 100%);
    margin-bottom: 18px;
    box-shadow: 0 0 0 6px rgba(200,168,75,0.12), 0 20px 60px rgba(0,0,0,0.5);
    animation: ringRotate 8s linear infinite;
    z-index: 1;
  }
  @keyframes ringRotate {
    to { background: conic-gradient(from 540deg, var(--gold) 0%, var(--amber) 35%, var(--gold) 70%, var(--gold-light) 100%); }
  }
  .qrp-photo-ring-inner {
    width: 100%; height: 100%;
    border-radius: 50%;
    overflow: hidden;
    background: var(--navy-mid);
    border: 3px solid var(--navy);
  }
  .qrp-photo {
    width: 100%; height: 100%;
    object-fit: cover;
    object-position: center top;
  }
  .qrp-photo-placeholder {
    width: 100%; height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(200,168,75,0.4);
    background: linear-gradient(135deg, #0f2044, #162d6a);
  }

  .qrp-name {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 900;
    color: var(--white);
    letter-spacing: -0.5px;
    line-height: 1.2;
    margin-bottom: 6px;
    position: relative;
    z-index: 1;
  }
  .qrp-school-name {
    font-size: 13px;
    color: var(--gold);
    font-weight: 600;
    letter-spacing: 0.2px;
    margin-bottom: 18px;
    position: relative;
    z-index: 1;
  }

  .qrp-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    position: relative;
    z-index: 1;
  }
  .qrp-pill {
    padding: 5px 14px;
    border-radius: 50px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.4px;
  }
  .qrp-pill-blue  { background: rgba(26,53,114,0.6); border: 1px solid rgba(99,143,255,0.3); color: #93c5fd; }
  .qrp-pill-gold  { background: rgba(200,168,75,0.15); border: 1px solid rgba(200,168,75,0.35); color: var(--gold-light); }
  .qrp-pill-slate { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.7); }

  /* ── Sections ── */
  .qrp-section {
    background: var(--card-bg);
    backdrop-filter: blur(24px);
    border: 1px solid var(--border);
    border-top: none;
    padding: 22px 20px 20px;
  }
  .qrp-section:last-of-type {
    border-radius: 0 0 var(--radius) var(--radius);
  }

  .qrp-section-header {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .qrp-section-icon { font-size: 16px; }
  .qrp-section-label {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: var(--gold);
  }

  .qrp-info-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .qrp-info-row {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 11px 14px;
    border-radius: var(--radius-sm);
    background: var(--glass);
    transition: background 0.2s;
  }
  .qrp-info-row:hover { background: rgba(255,255,255,0.07); }
  .qrp-info-row-accent {
    background: var(--gold-pale);
    border: 1px solid rgba(200,168,75,0.2);
  }
  .qrp-info-row-accent:hover { background: rgba(200,168,75,0.16); }

  .qrp-info-icon {
    font-size: 16px;
    margin-top: 1px;
    flex-shrink: 0;
    width: 24px;
    text-align: center;
  }
  .qrp-info-content { flex: 1; min-width: 0; }
  .qrp-info-label {
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 3px;
  }
  .qrp-info-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    word-break: break-word;
  }
  .qrp-mono {
    font-family: var(--font-mono);
    font-size: 13.5px;
    letter-spacing: 0.5px;
    color: var(--gold-light);
  }
  .qrp-info-link {
    font-size: 14px;
    font-weight: 600;
    color: #60a5fa;
    text-decoration: none;
    word-break: break-all;
  }
  .qrp-info-link:hover { text-decoration: underline; }

  /* ── Stamp ── */
  .qrp-stamp {
    margin: 16px 0 0;
    border-radius: var(--radius-sm);
    overflow: hidden;
    border: 1px solid rgba(200,168,75,0.25);
  }
  .qrp-stamp-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 20px;
    background: linear-gradient(135deg, rgba(200,168,75,0.08), rgba(255,191,0,0.05));
  }
  .qrp-stamp-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .qrp-stamp-seal { font-size: 24px; }
  .qrp-stamp-title {
    font-size: 14px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 3px;
  }
  .qrp-stamp-sub {
    font-size: 10px;
    color: var(--text-muted);
    letter-spacing: 0.3px;
  }
  .qrp-stamp-id { text-align: right; flex-shrink: 0; }
  .qrp-stamp-id-label {
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 3px;
  }
  .qrp-stamp-id-val {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--gold-light);
    letter-spacing: 0.5px;
  }

  /* ── Actions ── */
  .qrp-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 16px;
  }
  .qrp-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 15px 20px;
    border-radius: var(--radius-sm);
    font-size: 13.5px;
    font-weight: 800;
    letter-spacing: 0.3px;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    cursor: pointer;
  }
  .qrp-action-btn:hover { transform: translateY(-2px); }
  .qrp-action-primary {
    background: linear-gradient(135deg, var(--gold), var(--amber));
    color: var(--navy);
    box-shadow: 0 8px 24px rgba(200,168,75,0.28);
  }
  .qrp-action-primary:hover { box-shadow: 0 12px 32px rgba(200,168,75,0.4); }
  .qrp-action-secondary {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.12);
    color: var(--text);
  }
  .qrp-action-secondary:hover { background: rgba(255,255,255,0.09); }

  /* ── Note ── */
  .qrp-note {
    margin-top: 14px;
    padding: 14px 18px;
    border-radius: var(--radius-sm);
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.6;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .qrp-note-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }

  /* ── Tabs ── */
  .qrp-tabs-wrap {
    background: var(--card-bg);
    backdrop-filter: blur(24px);
    border: 1px solid var(--border);
    border-top: none;
    padding: 16px 12px 20px;
  }
  .qrp-tabs {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 12px;
    margin-bottom: 4px;
    scrollbar-width: none;
  }
  .qrp-tabs::-webkit-scrollbar { display: none; }
  .qrp-tab {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 8px 12px;
    border-radius: 50px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.2s, color 0.2s, border-color 0.2s;
  }
  .qrp-tab-active {
    background: var(--gold-pale);
    border-color: rgba(200,168,75,0.45);
    color: var(--gold-light);
  }
  .qrp-tab-panel { padding: 4px 4px 0; }
  .qrp-insights-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 28px 16px;
    color: var(--text-muted);
    font-size: 13px;
  }
  .qrp-spin { animation: spin 1s linear infinite; }
  .qrp-empty-insight {
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.6;
    padding: 12px 8px;
    text-align: center;
  }
  .qrp-subhead {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--gold);
    margin: 16px 0 10px;
  }
  .qrp-stat-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .qrp-stat-card {
    padding: 12px 10px;
    border-radius: var(--radius-sm);
    background: var(--glass);
    border: 1px solid rgba(255,255,255,0.08);
    text-align: center;
  }
  .qrp-stat-card-wide { grid-column: 1 / -1; }
  .qrp-stat-val {
    font-size: 20px;
    font-weight: 800;
    color: var(--gold-light);
    line-height: 1.2;
  }
  .qrp-stat-lbl {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-top: 4px;
  }
  .qrp-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .qrp-list-item {
    padding: 11px 12px;
    border-radius: var(--radius-sm);
    background: var(--glass);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .qrp-list-item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .qrp-list-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
  }
  .qrp-list-meta {
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 3px;
  }
  .qrp-list-desc {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 6px;
    line-height: 1.45;
  }
  .qrp-score-pill {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 50px;
    background: rgba(200,168,75,0.15);
    border: 1px solid rgba(200,168,75,0.3);
    color: var(--gold-light);
    font-size: 11px;
    font-weight: 800;
  }
  .qrp-status-pill {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 50px;
    font-size: 10px;
    font-weight: 800;
    text-transform: capitalize;
  }
  .qrp-status-present { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
  .qrp-status-late { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
  .qrp-status-absent { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }
  .qrp-status-neutral { background: rgba(255,255,255,0.06); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.1); }
  .qrp-gate-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .qrp-gate-card {
    padding: 14px 12px;
    border-radius: var(--radius-sm);
    background: var(--glass);
    border: 1px solid rgba(255,255,255,0.08);
    text-align: center;
  }
  .qrp-gate-label {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-faint);
    margin-bottom: 6px;
  }
  .qrp-gate-time {
    font-size: 18px;
    font-weight: 800;
    color: var(--text);
    margin-bottom: 8px;
  }

  /* ── Footer ── */
  .qrp-footer {
    position: relative;
    z-index: 1;
    padding: 20px 20px 32px;
    text-align: center;
  }
  .qrp-footer-text {
    font-size: 11px;
    color: var(--text-faint);
    line-height: 1.7;
  }
  .qrp-footer-link {
    color: var(--gold);
    text-decoration: none;
  }
  .qrp-footer-link:hover { text-decoration: underline; }

  /* ── Responsive ── */
  @media (min-width: 480px) {
    .qrp-actions {
      grid-template-columns: 1fr 1fr;
    }
    .qrp-name { font-size: 30px; }
    .qrp-photo-ring { width: 148px; height: 148px; }
    .qrp-section { padding: 26px 28px 24px; }
    .qrp-hero { padding: 44px 32px 40px; }
  }

  @media (min-width: 640px) {
    .qrp-main { padding: 36px 24px 52px; }
    .qrp-card-outer { border-radius: var(--radius); }
    .qrp-hero { border-radius: var(--radius) var(--radius) 0 0; }
  }

  /* ── Reduce motion ── */
  @media (prefers-reduced-motion: reduce) {
    .qrp-photo-ring,
    .qrp-orb1, .qrp-orb2, .qrp-orb3,
    .qrp-verified-dot { animation: none; }
    .qrp-card-outer { transition: opacity 0.3s; }
  }
`;