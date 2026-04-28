import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  CheckCheck,
  CreditCard,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Moon,
  Paperclip,
  Reply,
  Send,
  Sun,
  Trash2,
  UserCircle2,
  Brain,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

const emptyData = {
  profile: null,
  attendance: { percentage: 0, today_status: null, monthly_summary: { present: 0, absent: 0, late: 0 }, calendar: [], period_records: [], gate_records: [], gate_summary: { morning_checked: 0, evening_checked: 0 } },
  marks: { average_grade: 0, latest_by_subject: [], assessments: [], timetable: [] },
  discipline: { score: 100, behavior_grade: 'A', incidents: [], mark_logs: [], current_marks: 0, positive_events: 0, negative_events: 0 },
  fees: { total_due: 0, total_paid: 0, balance: 0, payments: [], transactions: [] },
  filters: { academic_year: '', term: '', available_academic_years: [], available_terms: [] },
  messages: { unread_count: 0, recent: [] },
};

function ProgressRing({ value = 0, dark = false }) {
  const size = 88;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={dark ? 'rgba(255,255,255,.15)' : '#e2e8f0'} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f59e0b"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 900, color: dark ? '#fff' : '#0f172a' }}>
        {value}%
      </div>
    </div>
  );
}

async function apiGet(path, params = {}) {
  const qs = new URLSearchParams(params);
  const url = `${API}${path}${qs.toString() ? `?${qs}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `Request failed: ${path}`);
  return json;
}

export default function StudentDashboard() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [dark, setDark] = useState(false);
  const [liveNow, setLiveNow] = useState(new Date());
  const [activePage, setActivePage] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 980 : false));
  const [dash, setDash] = useState(emptyData);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const [staff, setStaff] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [chatFile, setChatFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [chatInfo, setChatInfo] = useState('');
  const [chatError, setChatError] = useState('');
  const activeThread = useMemo(
    () => threads.find((t) => Number(t.id) === Number(activeThreadId)) || null,
    [threads, activeThreadId]
  );

  const formatMoney = (v) => `RWF ${Number(v || 0).toLocaleString()}`;
  const formatDate = (v) => (v ? new Date(v).toLocaleDateString() : '—');
  const formatDateTime = (v) => (v ? new Date(v).toLocaleString() : '—');

  useEffect(() => {
    if (!auth.loading && (!auth.isLoggedIn || String(auth.role || '').toUpperCase() !== 'STUDENT')) {
      navigate('/online-service', { replace: true });
    }
  }, [auth.loading, auth.isLoggedIn, auth.role, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 980);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (auth.loading || !auth.isLoggedIn || String(auth.role || '').toUpperCase() !== 'STUDENT') return;
      setDataLoading(true);
      setDataError('');
      try {
        const json = await apiGet('/api/online-service/dashboard-data', {
          academic_year: selectedAcademicYear || undefined,
          term: selectedTerm || undefined,
        });
        setDash({
          ...emptyData,
          ...(json.data || {}),
          attendance: { ...emptyData.attendance, ...(json.data?.attendance || {}) },
          marks: { ...emptyData.marks, ...(json.data?.marks || {}) },
          discipline: { ...emptyData.discipline, ...(json.data?.discipline || {}) },
          fees: { ...emptyData.fees, ...(json.data?.fees || {}) },
          filters: { ...emptyData.filters, ...(json.data?.filters || {}) },
          messages: { ...emptyData.messages, ...(json.data?.messages || {}) },
        });
        if (!selectedAcademicYear && json.data?.filters?.academic_year) {
          setSelectedAcademicYear(String(json.data.filters.academic_year));
        }
      } catch (e) {
        setDataError(e.message || 'Cannot load dashboard data.');
      } finally {
        setDataLoading(false);
      }
    };
    fetchDashboardData();
  }, [auth.loading, auth.isLoggedIn, auth.role, selectedAcademicYear, selectedTerm]);

  useEffect(() => {
    if (activePage !== 'chat') return;
    const loadChat = async () => {
      setChatError('');
      setChatInfo('');
      try {
        const schoolId = Number(dash.profile?.school_id || auth.user?.school_id || auth.user?.school?.id || 0);
        if (!schoolId) return;
        const [staffRes, threadsRes] = await Promise.all([
          apiGet('/api/chat/staff', { school_id: schoolId }),
          apiGet('/api/chat/threads', { school_id: schoolId }),
        ]);
        setStaff(Array.isArray(staffRes.data) ? staffRes.data : []);
        const t = Array.isArray(threadsRes.data) ? threadsRes.data : [];
        setThreads(t);
        if (t.length && !activeThreadId) setActiveThreadId(Number(t[0].id));
      } catch (e) {
        setChatError(e.message || 'Chat unavailable.');
      }
    };
    loadChat();
  }, [activePage, dash.profile?.school_id, auth.user?.school_id, auth.user?.school?.id, activeThreadId]);

  useEffect(() => {
    if (activePage !== 'chat' || !activeThreadId) return;
    const loadMessages = async () => {
      try {
        const schoolId = Number(dash.profile?.school_id || auth.user?.school_id || auth.user?.school?.id || 0);
        if (!schoolId) return;
        const res = await apiGet(`/api/chat/threads/${activeThreadId}/messages`, { school_id: schoolId });
        setThreadMessages(Array.isArray(res.data) ? res.data : []);
      } catch {
        setThreadMessages([]);
      }
    };
    loadMessages();
  }, [activePage, activeThreadId, dash.profile?.school_id, auth.user?.school_id, auth.user?.school?.id]);

  const user = auth.user || {};
  const mustChange = !!user?.force_password_change;

  const summaryCards = useMemo(() => ([
    { k: 'Attendance %', v: `${Number(dash.attendance?.percentage || 0)}%`, c: '#16a34a' },
    { k: 'Average Grade', v: `${Number(dash.marks?.average_grade || 0)}%`, c: '#2563eb' },
    { k: 'Discipline Score', v: String(dash.discipline?.behavior_grade || 'A'), c: '#7c3aed' },
    { k: 'Fees Balance', v: `RWF ${Number(dash.fees?.balance || 0).toLocaleString()}`, c: '#f59e0b' },
  ]), [dash]);

  const doLogout = async () => {
    await auth.logout();
    navigate('/online-service', { replace: true });
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    if (form.newPassword.length < 8) return setPwdError('New password must be at least 8 characters.');
    if (form.newPassword !== form.confirmPassword) return setPwdError('New password and confirm password do not match.');
    setPwdLoading(true);
    try {
      const res = await fetch(`${API}/api/online-service/change-password`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) return setPwdError(json.message || 'Failed to change password');
      setPwdSuccess('Password changed successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await auth.refresh();
    } catch {
      setPwdError('Cannot reach server. Please try again.');
    } finally {
      setPwdLoading(false);
    }
  };

  const sendChat = async () => {
    setChatError('');
    setChatInfo('');
    try {
      const schoolId = Number(dash.profile?.school_id || auth.user?.school_id || auth.user?.school?.id || 0);
      if (!schoolId || !activeThreadId || (!chatText.trim() && !chatFile)) return;
      let attachmentUrl = null;
      if (chatFile) {
        setUploadingFile(true);
        const formData = new FormData();
        formData.append('file', chatFile);
        const upRes = await fetch(`${API}/api/chat/uploads`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const upJson = await upRes.json().catch(() => ({}));
        setUploadingFile(false);
        if (!upRes.ok || !upJson.success) throw new Error(upJson.message || 'Attachment upload failed');
        attachmentUrl = upJson.data?.url || null;
      }
      const sendRes = await fetch(`${API}/api/chat/threads/${activeThreadId}/messages?school_id=${schoolId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, body: chatText.trim(), attachment_url: attachmentUrl, reply_to_message_id: replyTarget?.id || null }),
      });
      const sendJson = await sendRes.json().catch(() => ({}));
      if (!sendRes.ok || !sendJson.success) throw new Error(sendJson.message || 'Failed to send message');
      setChatText('');
      setReplyTarget(null);
      setChatFile(null);
      const res = await apiGet(`/api/chat/threads/${activeThreadId}/messages`, { school_id: schoolId });
      setThreadMessages(Array.isArray(res.data) ? res.data : []);
      const threadsRes = await apiGet('/api/chat/threads', { school_id: schoolId });
      setThreads(Array.isArray(threadsRes.data) ? threadsRes.data : []);
      setChatInfo('Message sent.');
    } catch (e) {
      setUploadingFile(false);
      setChatError(e.message || 'Failed to send message.');
    }
  };

  const deleteThread = async (threadId) => {
    setChatError('');
    setChatInfo('');
    try {
      const schoolId = Number(dash.profile?.school_id || auth.user?.school_id || auth.user?.school?.id || 0);
      if (!schoolId || !threadId) return;
      const res = await fetch(`${API}/api/chat/threads/${threadId}?school_id=${schoolId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete conversation');
      const threadsRes = await apiGet('/api/chat/threads', { school_id: schoolId });
      const nextThreads = Array.isArray(threadsRes.data) ? threadsRes.data : [];
      setThreads(nextThreads);
      if (Number(activeThreadId) === Number(threadId)) {
        const nextId = nextThreads[0]?.id ? Number(nextThreads[0].id) : null;
        setActiveThreadId(nextId);
      }
      setChatInfo('Conversation removed.');
    } catch (e) {
      setChatError(e.message || 'Unable to remove conversation.');
    }
  };

  const createThreadWithStaff = async (staffUserId) => {
    setChatError('');
    try {
      const schoolId = Number(dash.profile?.school_id || auth.user?.school_id || auth.user?.school?.id || 0);
      if (!schoolId || !staffUserId) return;
      const res = await fetch(`${API}/api/chat/threads`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, participant_user_id: Number(staffUserId) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not open chat');
      setActiveThreadId(Number(json.data?.thread_id || 0) || null);
      const threadsRes = await apiGet('/api/chat/threads', { school_id: schoolId });
      setThreads(Array.isArray(threadsRes.data) ? threadsRes.data : []);
    } catch (e) {
      setChatError(e.message || 'Unable to create conversation.');
    }
  };

  const pageBg = dark ? '#020617' : '#f1f5f9';
  const panelBg = dark ? '#0f172a' : '#ffffff';
  const panelBorder = dark ? '#1e293b' : '#e2e8f0';
  const txt = dark ? '#e2e8f0' : '#0f172a';
  const sub = dark ? '#94a3b8' : '#64748b';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', Icon: CalendarDays },
    { id: 'academics', label: 'Academics', Icon: GraduationCap },
    { id: 'discipline', label: 'Discipline', Icon: FileText },
    { id: 'fees', label: 'Fees', Icon: CreditCard },
    { id: 'chat', label: 'Chat Center', Icon: MessageSquare },
    { id: 'security', label: 'Security', Icon: KeyRound },
  ];

  const mobileNavItems = [
    { id: 'dashboard', label: 'Home', Icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', Icon: CalendarDays },
    { id: 'academics', label: 'Academics', Icon: GraduationCap },
    { id: 'discipline', label: 'Discipline', Icon: FileText },
    { id: 'fees', label: 'Fees', Icon: CreditCard },
  ];

  const appShellPaddingBottom = isMobile ? 86 : 0;

  return (
    <div style={{ minHeight: '100vh', background: pageBg, color: txt, padding: '0.8rem', paddingBottom: appShellPaddingBottom }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap: 12 }}>
        {!isMobile ? (
        <aside style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 18, padding: '0.85rem', height: isMobile ? 'auto' : 'calc(100vh - 1.6rem)', position: isMobile ? 'relative' : 'sticky', top: 8, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: `1px solid ${panelBorder}` }}>
            <UserCircle2 size={30} color="#fbbf24" />
            <div>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 14 }}>{dash.profile?.full_name || user.full_name || 'Student'}</p>
              <p style={{ margin: 0, color: sub, fontSize: 12 }}>{dash.profile?.school_name || user?.school?.name || 'School'}</p>
            </div>
          </div>
          <nav style={{ marginTop: 10, display: isMobile ? 'flex' : 'grid', gap: 6, overflowX: isMobile ? 'auto' : 'visible', paddingBottom: isMobile ? 4 : 0 }}>
            {navItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePage(id)}
                style={{
                  border: activePage === id ? 'none' : `1px solid ${panelBorder}`,
                  background: activePage === id ? '#000435' : 'transparent',
                  color: activePage === id ? '#fff' : txt,
                  borderRadius: 11,
                  minHeight: 38,
                  minWidth: isMobile ? 140 : 0,
                  padding: '0 10px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  cursor: 'pointer',
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
          <div style={{ marginTop: 'auto', display: 'grid', gap: 7 }}>
            <button type="button" onClick={() => setDark((d) => !d)} style={{ border: `1px solid ${panelBorder}`, background: 'transparent', color: txt, borderRadius: 10, minHeight: 34, padding: '0 10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
              {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button type="button" onClick={doLogout} style={{ border: 'none', background: '#dc2626', color: '#fff', borderRadius: 10, minHeight: 36, padding: '0 10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
              <LogOut size={14} /> Logout
            </button>
          </div>
        </aside>
        ) : null}

        <main style={{ minWidth: 0 }}>
          <div style={{ background: dark ? '#111827' : '#000435', color: '#fff', borderRadius: 18, padding: isMobile ? '0.8rem 0.9rem' : '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 900 }}>Student Dashboard</p>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.95 }}>Live: {liveNow.toLocaleTimeString()} • Class {dash.profile?.class_name || '-'}</p>
            </div>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <ProgressRing value={Number(dash.marks?.average_grade || 0)} dark />
            </div>
          </div>

          {isMobile ? (
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button type="button" onClick={() => setDark((d) => !d)} style={{ border: `1px solid ${panelBorder}`, background: panelBg, color: txt, borderRadius: 10, minHeight: 36, padding: '0 10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? 'Light' : 'Dark'}
              </button>
              <button type="button" onClick={doLogout} style={{ border: 'none', background: '#dc2626', color: '#fff', borderRadius: 10, minHeight: 36, padding: '0 10px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          ) : null}

          <section style={{ marginTop: 10, background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: isMobile ? '0.7rem' : '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))', gap: 8 }}>
              <label style={{ display: 'grid', gap: 4, fontSize: 12, color: sub }}>
                Academic Year
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  style={{ minHeight: 38, borderRadius: 10, border: `1px solid ${panelBorder}`, background: dark ? '#0b1220' : '#fff', color: txt, padding: '0 10px', fontWeight: 700 }}
                >
                  <option value="">All years</option>
                  {(dash.filters?.available_academic_years || []).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 4, fontSize: 12, color: sub }}>
                Term
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  style={{ minHeight: 38, borderRadius: 10, border: `1px solid ${panelBorder}`, background: dark ? '#0b1220' : '#fff', color: txt, padding: '0 10px', fontWeight: 700 }}
                >
                  <option value="">All terms</option>
                  {(dash.filters?.available_terms || []).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSelectedAcademicYear('');
                  setSelectedTerm('');
                }}
                style={{ alignSelf: 'end', minHeight: 38, borderRadius: 10, border: `1px solid ${panelBorder}`, background: 'transparent', color: txt, fontWeight: 800, cursor: 'pointer' }}
              >
                Reset Filters
              </button>
            </div>
          </section>

          {dataLoading ? <Banner type="info" text="Loading live attendance, marks, discipline, fees and messages..." /> : null}
          {dataError ? <Banner type="error" text={dataError} /> : null}

          {activePage === 'dashboard' && (
            <>
              <section style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                {summaryCards.map((c) => (
                  <div key={c.k} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 14, padding: '0.85rem' }}>
                    <p style={{ margin: 0, color: sub, fontSize: 12 }}>{c.k}</p>
                    <p style={{ margin: '4px 0 0', fontWeight: 900, color: c.c }}>{c.v}</p>
                  </div>
                ))}
              </section>
              <section style={{ marginTop: 12, background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: '0.95rem' }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>Analytics Trend</h3>
                <p style={{ margin: '3px 0 10px', color: sub, fontSize: 12 }}>Latest subject performance</p>
                <div style={{ display: 'grid', gap: 8 }}>
                  {(dash.marks?.latest_by_subject || []).slice(0, 6).map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 44px', gap: 8, alignItems: 'center', fontSize: 12 }}>
                      <span style={{ color: sub }}>{String(row.subject_name || `Subject ${i + 1}`).slice(0, 10)}</span>
                      <div style={{ height: 8, borderRadius: 99, background: dark ? '#1f2937' : '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${Number(row.percent || 0)}%`, height: '100%', background: '#2563eb' }} />
                      </div>
                      <span style={{ fontWeight: 800 }}>{Number(row.percent || 0)}%</span>
                    </div>
                  ))}
                  {(dash.marks?.latest_by_subject || []).length === 0 ? <p style={{ margin: 0, color: sub, fontSize: 12 }}>No live marks yet.</p> : null}
                </div>
              </section>
            </>
          )}

          {activePage === 'attendance' && (
            <PageCard title="Attendance Tracking (Real-time)">
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                <MetricCard title="Attendance %" value={`${Number(dash.attendance?.percentage || 0)}%`} />
                <MetricCard title="Today" value={String(dash.attendance?.today_status || 'N/A')} />
                <MetricCard title="Period checks" value={String((dash.attendance?.period_records || []).length)} />
                <MetricCard title="Gate logs" value={String((dash.attendance?.gate_records || []).length)} />
              </section>

              <h4 style={{ margin: '12px 0 8px', fontSize: 14 }}>Class Period Attendance</h4>
              <DataTable
                columns={['Date', 'Subject', 'Day', 'Time', 'Status']}
                rows={(dash.attendance?.period_records || []).slice(0, 120).map((r) => ([
                  formatDate(r.date),
                  r.subject_name || '—',
                  r.day_of_week || '—',
                  r.time_range || '—',
                  String(r.status || '—'),
                ]))}
                emptyText="No period attendance recorded for selected filters."
              />

              <h4 style={{ margin: '12px 0 8px', fontSize: 14 }}>Gate Entry & Exit (Morning / Evening)</h4>
              <DataTable
                columns={['Date', 'Morning Entry', 'Morning Status', 'Evening Exit', 'Evening Status']}
                rows={(dash.attendance?.gate_records || []).slice(0, 120).map((r) => ([
                  formatDate(r.attendance_date),
                  formatDateTime(r.morning_check_in),
                  r.morning_status || '—',
                  formatDateTime(r.evening_check_out),
                  r.evening_status || '—',
                ]))}
                emptyText="No gate attendance logs for selected filters."
              />
            </PageCard>
          )}

          {activePage === 'academics' && (
            <PageCard title="Academic Performance">
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                <MetricCard title="Average Grade" value={`${Number(dash.marks?.average_grade || 0)}%`} />
                <MetricCard title="Assessments" value={String((dash.marks?.assessments || []).length)} />
                <MetricCard title="Class" value={dash.profile?.class_name || '—'} />
              </section>

              <h4 style={{ margin: '12px 0 8px', fontSize: 14 }}>Class Timetable (Assigned Teachers)</h4>
              <DataTable
                columns={['Day', 'Start', 'End', 'Subject', 'Teacher', 'Room']}
                rows={(dash.marks?.timetable || []).map((r) => ([
                  r.day_of_week || '—',
                  r.start_time || '—',
                  r.end_time || '—',
                  r.subject_name || '—',
                  r.teacher_name || 'Not assigned',
                  r.room || '—',
                ]))}
                emptyText="No timetable configured for your class and selected filters."
              />
            </PageCard>
          )}

          {activePage === 'discipline' && (
            <PageCard title="Discipline & Behavior">
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                <MetricCard title="Current Marks" value={String(Number(dash.discipline?.current_marks || 0))} />
                <MetricCard title="Behavior Grade" value={dash.discipline?.behavior_grade || 'A'} />
                <MetricCard title="History Records" value={String((dash.discipline?.mark_logs || []).length)} />
              </section>

              <h4 style={{ margin: '12px 0 8px', fontSize: 14 }}>Discipline Mark History</h4>
              <DataTable
                columns={['Date', 'Action', 'Marks', 'Reason', 'Notes']}
                rows={(dash.discipline?.mark_logs || []).slice(0, 150).map((r) => ([
                  formatDate(r.action_date || r.created_at),
                  String(r.action || '—').toUpperCase(),
                  String(Number(r.marks || 0)),
                  r.reason || '—',
                  r.notes || '—',
                ]))}
                emptyText="No discipline mark changes found."
              />
            </PageCard>
          )}

          {activePage === 'fees' && (
            <PageCard title="Fees & Payments Tracking">
              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                <MetricCard title="Total Due" value={formatMoney(dash.fees?.total_due)} />
                <MetricCard title="Total Paid" value={formatMoney(dash.fees?.total_paid)} />
                <MetricCard title="Balance" value={formatMoney(dash.fees?.balance)} />
              </section>

              <h4 style={{ margin: '12px 0 8px', fontSize: 14 }}>All Fee Transactions</h4>
              <DataTable
                columns={['Date', 'Academic Year', 'Term', 'Class', 'Due', 'Paid', 'Balance', 'Notes']}
                rows={(dash.fees?.transactions || dash.fees?.payments || []).slice(0, 200).map((r) => ([
                  formatDate(r.created_at),
                  r.academic_year || '—',
                  r.term || '—',
                  r.class_name || '—',
                  formatMoney(r.total_due),
                  formatMoney(r.amount_paid),
                  formatMoney(r.balance_remaining),
                  r.notes || '—',
                ]))}
                emptyText="No fee transactions found for selected filters."
              />
            </PageCard>
          )}

          {activePage === 'chat' && (
            <section style={{ marginTop: 12, background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: '0.8rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '240px 260px 1fr', gap: 10, minHeight: 520 }}>
              <div style={{ border: `1px solid ${panelBorder}`, borderRadius: 12, padding: '0.7rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 13 }}>Teachers (Your Class + Stream)</p>
                <div style={{ marginTop: 8, display: 'grid', gap: 6, overflow: 'auto' }}>
                  {staff.map((s) => (
                    <button
                      key={`${s.id}-${s.role_code}`}
                      type="button"
                      onClick={() => createThreadWithStaff(s.id)}
                      style={{ border: `1px solid ${panelBorder}`, background: 'transparent', color: txt, borderRadius: 9, minHeight: 34, padding: '0 8px', textAlign: 'left', fontSize: 12, cursor: 'pointer' }}
                    >
                      {s.first_name} {s.last_name} • {s.role_code}
                    </button>
                  ))}
                  {staff.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: sub }}>No teachers assigned to your exact class/stream yet.</p> : null}
                </div>
              </div>

              <div style={{ border: `1px solid ${panelBorder}`, borderRadius: 12, padding: '0.7rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 13 }}>Inbox</p>
                <div style={{ marginTop: 8, display: 'grid', gap: 6, overflow: 'auto' }}>
                  {threads.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        border: activeThreadId === Number(t.id) ? 'none' : `1px solid ${panelBorder}`,
                        background: activeThreadId === Number(t.id) ? '#000435' : 'transparent',
                        color: activeThreadId === Number(t.id) ? '#fff' : txt,
                        borderRadius: 9,
                        minHeight: 42,
                        padding: '6px 8px',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveThreadId(Number(t.id))}
                        style={{ border: 'none', background: 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer', padding: 0, fontSize: 12 }}
                      >
                        {t.thread_name || t.other_participant?.name || 'Thread'} {Number(t.unread_count || 0) > 0 ? `(${t.unread_count})` : ''}
                        <div style={{ fontSize: 11, opacity: 0.8 }}>
                          {t.thread_type === 'GROUP' ? (t.thread_scope ? String(t.thread_scope).replace(/_/g, ' ') : 'Group') : 'Direct'}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteThread(Number(t.id))}
                        style={{ border: 'none', background: 'transparent', color: activeThreadId === Number(t.id) ? '#fecaca' : '#dc2626', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                        title="Delete conversation"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {threads.length === 0 ? <p style={{ margin: 0, fontSize: 12, color: sub }}>No conversations yet.</p> : null}
                </div>
              </div>

              <div style={{ border: `1px solid ${panelBorder}`, borderRadius: 12, padding: '0.7rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <p style={{ margin: 0, fontWeight: 900 }}>
                    {activeThread?.other_participant?.participant_type === 'USER'
                      ? `Teacher: ${activeThread?.other_participant?.name || 'Teacher'}`
                      : (activeThread?.other_participant?.role_name || 'Parent • Student')}
                  </p>
                  <span style={{ fontSize: 11, color: sub }}>Modern chat workspace</span>
                </div>
                {activeThread?.other_participant?.teacher_courses ? (
                  <p style={{ margin: '5px 0 0', color: sub, fontSize: 12 }}>
                    Courses: {activeThread.other_participant.teacher_courses}
                  </p>
                ) : null}

                {chatInfo ? <Banner type="success" text={chatInfo} compact /> : null}
                {chatError ? <Banner type="error" text={chatError} compact /> : null}

                <div style={{ marginTop: 8, flex: 1, border: `1px solid ${panelBorder}`, borderRadius: 10, padding: '0.55rem', overflow: 'auto', minHeight: 0 }}>
                  {threadMessages.map((m) => (
                    <div key={m.id} style={{ marginBottom: 8, display: 'grid', gap: 3, justifyItems: m.sender_type === 'PARENT' ? 'end' : 'start' }}>
                      <span style={{ fontSize: 11, color: sub, maxWidth: '82%', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span>
                          {m.sender_name || 'User'}
                          {m.sender_courses ? ` (${m.sender_courses})` : ''}
                          {' • '}
                          {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                        </span>
                        {m.sender_type === 'PARENT' ? (
                          <CheckCheck
                            size={12}
                            strokeWidth={2.2}
                            color={(m.read_by || []).some((rb) => rb?.participant_type === 'USER') ? '#38bdf8' : (dark ? '#64748b' : '#94a3b8')}
                          />
                        ) : null}
                      </span>
                      <div
                        style={{
                          position: 'relative',
                          background: m.sender_type === 'PARENT'
                            ? (dark ? '#1e293b' : '#dbeafe')
                            : (dark ? '#0b1220' : '#f8fafc'),
                          border: m.sender_type === 'PARENT'
                            ? `1px solid ${dark ? '#334155' : '#93c5fd'}`
                            : `1px solid ${panelBorder}`,
                          borderRadius: 10,
                          padding: '8px 9px',
                          fontSize: 13,
                          color: m.sender_type === 'PARENT'
                            ? (dark ? '#e2e8f0' : '#1e3a8a')
                            : txt,
                          maxWidth: '82%',
                          minWidth: 88,
                          boxShadow: m.sender_type === 'PARENT'
                            ? (dark ? '0 4px 10px rgba(15,23,42,.35)' : '0 4px 12px rgba(37,99,235,.12)')
                            : (dark ? '0 4px 10px rgba(2,6,23,.35)' : '0 4px 10px rgba(15,23,42,.08)'),
                        }}
                      >
                        {m.reply_to ? (
                          <div style={{ marginBottom: 6, borderRadius: 8, padding: '6px 8px', border: `1px solid ${panelBorder}`, background: m.sender_type === 'PARENT' ? (dark ? 'rgba(255,255,255,.08)' : '#eff6ff') : (dark ? '#111827' : '#f8fafc') }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                              <span style={{ width: 3, borderRadius: 99, background: m.sender_type === 'PARENT' ? (dark ? '#bfdbfe' : '#1d4ed8') : (dark ? '#64748b' : '#334155') }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 11, lineHeight: 1.1, fontWeight: 800, color: m.sender_type === 'PARENT' ? (dark ? '#bfdbfe' : '#1d4ed8') : sub }}>
                                  Reply to {((m.reply_to?.sender_type === 'PARENT') ? 'You' : (m.reply_to?.sender_name || 'Message'))}
                                </div>
                                <div style={{ fontSize: 12, lineHeight: 1.2, color: m.sender_type === 'PARENT' ? (dark ? '#e2e8f0' : '#1e3a8a') : sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {m.reply_to?.body || '[Attachment]'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <span
                          aria-hidden
                          style={{
                            position: 'absolute',
                            top: 10,
                            width: 10,
                            height: 10,
                            transform: 'rotate(45deg)',
                            right: m.sender_type === 'PARENT' ? -5 : 'auto',
                            left: m.sender_type === 'PARENT' ? 'auto' : -5,
                            background: m.sender_type === 'PARENT'
                              ? (dark ? '#1e293b' : '#dbeafe')
                              : (dark ? '#0b1220' : '#f8fafc'),
                            borderRight: m.sender_type === 'PARENT'
                              ? `1px solid ${dark ? '#334155' : '#93c5fd'}`
                              : 'none',
                            borderBottom: m.sender_type === 'PARENT'
                              ? `1px solid ${dark ? '#334155' : '#93c5fd'}`
                              : 'none',
                            borderLeft: m.sender_type === 'PARENT'
                              ? 'none'
                              : `1px solid ${panelBorder}`,
                            borderTop: m.sender_type === 'PARENT'
                              ? 'none'
                              : `1px solid ${panelBorder}`,
                            boxShadow: m.sender_type === 'PARENT'
                              ? (dark ? '2px 2px 6px rgba(15,23,42,.22)' : '2px 2px 6px rgba(37,99,235,.1)')
                              : (dark ? '-2px 2px 6px rgba(2,6,23,.22)' : '-2px 2px 6px rgba(15,23,42,.07)'),
                          }}
                        />
                        {m.body || '(Attachment)'}
                        {m.attachment_url ? (
                          <div style={{ marginTop: 6 }}>
                            <a
                              href={`${API}${m.attachment_url}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: m.sender_type === 'PARENT'
                                  ? (dark ? '#93c5fd' : '#1d4ed8')
                                  : '#2563eb',
                                fontSize: 12,
                                fontWeight: 700,
                              }}
                            >
                              Open attachment
                            </a>
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyTarget({ id: m.id, sender_name: m.sender_name || 'User', body: m.body || (m.attachment_url ? '[Attachment]' : '') })}
                        style={{ border: 'none', background: 'transparent', color: sub, fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                      >
                        Reply
                      </button>
                    </div>
                  ))}
                  {threadMessages.length === 0 ? <p style={{ margin: 0, color: sub, fontSize: 12 }}>Select or create a conversation with a teacher/staff member.</p> : null}
                </div>

                <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                  {replyTarget ? (
                    <div style={{ border: `1px solid ${panelBorder}`, borderRadius: 10, padding: '6px 8px', background: dark ? '#111827' : '#eef2ff', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: dark ? '#bfdbfe' : '#1d4ed8' }}>Replying to {replyTarget.sender_name}</div>
                        <div style={{ fontSize: 12, color: sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{replyTarget.body || '[Attachment]'}</div>
                      </div>
                      <button type="button" onClick={() => setReplyTarget(null)} style={{ border: `1px solid ${panelBorder}`, background: 'transparent', color: txt, borderRadius: 8, minHeight: 26, padding: '0 8px', cursor: 'pointer' }}>×</button>
                    </div>
                  ) : null}
                  <textarea
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' || uploadingFile) return;
                      if (e.ctrlKey && e.altKey) {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart || 0;
                        const end = e.currentTarget.selectionEnd || 0;
                        const next = `${chatText.slice(0, start)}\n${chatText.slice(end)}`;
                        setChatText(next);
                        requestAnimationFrame(() => {
                          e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1;
                        });
                        return;
                      }
                        e.preventDefault();
                        sendChat();
                    }}
                    placeholder="Type message to your teacher..."
                    rows={2}
                    style={{ border: `1px solid ${panelBorder}`, background: dark ? '#0b1220' : '#fff', color: txt, borderRadius: 10, minHeight: 44, padding: '8px 10px', fontSize: 13, resize: 'vertical' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8 }}>
                    <label style={{ border: `1px solid ${panelBorder}`, borderRadius: 10, minHeight: 38, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 10px', cursor: 'pointer', fontSize: 12, color: txt }}>
                      <Paperclip size={13} />
                      {chatFile ? String(chatFile.name).slice(0, 28) : 'Add attachment'}
                      <input type="file" style={{ display: 'none' }} onChange={(e) => setChatFile(e.target.files?.[0] || null)} />
                    </label>
                    {chatFile ? (
                      <button type="button" onClick={() => setChatFile(null)} style={{ border: `1px solid ${panelBorder}`, background: 'transparent', color: txt, borderRadius: 10, minHeight: 38, padding: '0 10px', cursor: 'pointer', fontSize: 12 }}>
                        Clear
                      </button>
                    ) : (
                      <div />
                    )}
                  <button
                    type="button"
                    onClick={sendChat}
                    disabled={uploadingFile}
                    style={{ border: 'none', background: '#000435', color: '#fff', borderRadius: 10, minHeight: 38, padding: '0 12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  >
                    <Send size={13} /> {uploadingFile ? 'Uploading...' : 'Send'}
                  </button>
                </div>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: sub, fontWeight: 700 }}>
                  Enter to send • Ctrl+Alt+Enter for new line
                </p>
              </div>
            </section>
          )}

          {activePage === 'security' && (
            <section style={{ marginTop: 12, background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: 16, padding: '0.95rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <KeyRound size={16} />
                <p style={{ margin: 0, fontWeight: 900 }}>Security: Change Password</p>
              </div>
              {mustChange ? <Banner type="warn" text="First login detected. Please set your own private password now." compact /> : null}
              {pwdError ? <Banner type="error" text={pwdError} compact /> : null}
              {pwdSuccess ? <Banner type="success" text={pwdSuccess} compact /> : null}
              <form onSubmit={changePassword} style={{ display: 'grid', gap: 8 }}>
                <input type="password" value={form.currentPassword} onChange={(e) => setForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder={mustChange ? 'Current password (optional first change)' : 'Current password'} style={{ border: `1px solid ${panelBorder}`, background: dark ? '#0b1220' : '#fff', color: txt, borderRadius: 10, minHeight: 40, padding: '8px 10px', fontSize: 14 }} />
                <input type="password" value={form.newPassword} onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="New password (min 8 characters)" style={{ border: `1px solid ${panelBorder}`, background: dark ? '#0b1220' : '#fff', color: txt, borderRadius: 10, minHeight: 40, padding: '8px 10px', fontSize: 14 }} />
                <input type="password" value={form.confirmPassword} onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm new password" style={{ border: `1px solid ${panelBorder}`, background: dark ? '#0b1220' : '#fff', color: txt, borderRadius: 10, minHeight: 40, padding: '8px 10px', fontSize: 14 }} />
                <button type="submit" disabled={pwdLoading} style={{ border: 'none', borderRadius: 11, minHeight: 42, background: '#000435', color: '#fff', fontWeight: 800, cursor: pwdLoading ? 'not-allowed' : 'pointer' }}>
                  {pwdLoading ? 'Saving...' : 'Update Password'}
                </button>
              </form>
            </section>
          )}
        </main>
      </div>

      {isMobile ? (
        <>
          <button
            type="button"
            onClick={() => setActivePage('chat')}
            style={{
              position: 'fixed',
              right: 14,
              bottom: 86,
              width: 54,
              height: 54,
              borderRadius: 999,
              border: 'none',
              background: '#000435',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 10px 24px rgba(2,6,23,.25)',
              zIndex: 60,
              cursor: 'pointer',
            }}
            title="Open chat"
          >
            <MessageSquare size={20} />
          </button>

          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              background: dark ? 'rgba(15,23,42,.98)' : 'rgba(255,255,255,.98)',
              borderTop: `1px solid ${panelBorder}`,
              display: 'grid',
              gridTemplateColumns: 'repeat(5,1fr)',
              padding: '6px 8px calc(6px + env(safe-area-inset-bottom, 0px))',
              gap: 6,
              zIndex: 55,
              backdropFilter: 'blur(8px)',
            }}
          >
            {mobileNavItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActivePage(id)}
                style={{
                  border: 'none',
                  background: activePage === id ? (dark ? '#1e293b' : '#e0e7ff') : 'transparent',
                  color: activePage === id ? '#1d4ed8' : (dark ? '#cbd5e1' : '#334155'),
                  borderRadius: 12,
                  minHeight: 56,
                  display: 'grid',
                  placeItems: 'center',
                  gap: 2,
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Banner({ type = 'info', text, compact = false }) {
  const map = {
    info: { bg: '#dbeafe', fg: '#1e40af' },
    error: { bg: '#fee2e2', fg: '#991b1b' },
    success: { bg: '#dcfce7', fg: '#166534' },
    warn: { bg: '#fef3c7', fg: '#92400e' },
  };
  const m = map[type] || map.info;
  return (
    <div style={{ marginTop: compact ? 8 : 10, borderRadius: 10, padding: compact ? '7px 9px' : '8px 10px', background: m.bg, color: m.fg, fontSize: 13 }}>
      {text}
    </div>
  );
}

function PageCard({ title, children }) {
  return (
    <section style={{ marginTop: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '0.95rem' }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>{title}</h3>
      <div style={{ marginTop: 10 }}>{children}</div>
    </section>
  );
}

function InfoGrid({ items = [] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
      {items.map((it) => (
        <div key={it} style={{ border: '1px solid #dbeafe', borderRadius: 12, padding: '0.8rem', background: '#f8fafc', color: '#334155', fontSize: 13, lineHeight: 1.6 }}>
          {it}
        </div>
      ))}
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div style={{ border: '1px solid #dbeafe', borderRadius: 12, padding: '0.8rem', background: '#f8fafc' }}>
      <p style={{ margin: 0, color: '#64748b', fontSize: 12 }}>{title}</p>
      <p style={{ margin: '4px 0 0', fontWeight: 900, fontSize: 15, color: '#0f172a' }}>{value}</p>
    </div>
  );
}

function DataTable({ columns = [], rows = [], emptyText = 'No records' }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              {columns.map((c) => (
                <th key={c} style={{ textAlign: 'left', padding: '10px 8px', fontSize: 11, color: '#64748b', fontWeight: 900, borderBottom: '1px solid #e2e8f0' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, columns.length)} style={{ padding: '12px 8px', fontSize: 13, color: '#64748b' }}>
                  {emptyText}
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, idx) => (
                  <td key={`${i}-${idx}`} style={{ padding: '10px 8px', fontSize: 13, color: '#0f172a', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
