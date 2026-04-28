import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  Bus,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileUp,
  GraduationCap,
  Languages,
  MessageSquare,
  Moon,
  Send,
  Sun,
  TrendingUp,
  UserCircle2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiOrigin } from '../services/apiClient';
import { fetchDashboardData, fetchGradebookMatrix, fetchRecentPayments } from '../services/studentDashboardApi';

const BRAND = '#000435';
const AMBER = '#f59e0b';

const dictionary = {
  en: {
    dashboard: 'Student Dashboard',
    overview: 'Profile Overview',
    attendance: 'Attendance Tracking',
    discipline: 'Discipline & Behavior',
    academics: 'Academic Performance',
    feedback: 'Teacher Feedback',
    fees: 'Fees & Payments',
    notices: 'Announcements',
    schoolCalendar: 'School Calendar',
    messaging: 'Messaging',
    homework: 'Homework & Assignments',
    transport: 'Transport Tracking',
    insights: 'AI Insights',
    notifications: 'Notifications Center',
    analytics: 'Analytics Summary',
  },
  rw: {
    dashboard: 'Imbonerahamwe y Umunyeshuri',
    overview: 'Incamake ya Profaili',
    attendance: 'Kwitabira',
    discipline: 'Imyitwarire n Imyifatire',
    academics: 'Imitsindire',
    feedback: 'Ibitekerezo by Abarimu',
    fees: 'Amafaranga y Ishuri',
    notices: 'Amatangazo',
    schoolCalendar: 'Kalendari y Ishuri',
    messaging: 'Ubutumwa',
    homework: 'Imikoro',
    transport: 'Urugendo rw Imodoka',
    insights: 'Inama za AI',
    notifications: 'Ikigo cy Amamenyesha',
    analytics: 'Incamake y Imibare',
  },
  fr: {
    dashboard: 'Tableau de Bord Etudiant',
    overview: 'Profil Etudiant',
    attendance: 'Suivi des Presences',
    discipline: 'Discipline et Comportement',
    academics: 'Resultats Academiques',
    feedback: 'Commentaires Enseignants',
    fees: 'Frais et Paiements',
    notices: 'Annonces',
    schoolCalendar: 'Calendrier Scolaire',
    messaging: 'Messagerie',
    homework: 'Devoirs et Travaux',
    transport: 'Suivi du Transport',
    insights: 'Analyses IA',
    notifications: 'Centre de Notifications',
    analytics: 'Resume Analytique',
  },
};

const fallbackTrend = [
  { month: 'Jan', score: 64, attendance: 90 },
  { month: 'Feb', score: 68, attendance: 91 },
  { month: 'Mar', score: 71, attendance: 89 },
  { month: 'Apr', score: 75, attendance: 92 },
  { month: 'May', score: 78, attendance: 90 },
  { month: 'Jun', score: 81, attendance: 93 },
];

const monthMarksFromPercent = (percent) => {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const p = Math.max(0, Math.min(100, Math.round(safePercent)));
  const absent = Math.max(0, Math.round((100 - p) / 10));
  const late = Math.max(0, Math.round((100 - p) / 20));
  const present = Math.max(0, 30 - absent - late);
  return [
    ...Array(present).fill('P'),
    ...Array(absent).fill('A'),
    ...Array(late).fill('L'),
  ].slice(0, 30);
};

const roleFromSession = (sessionRole) => {
  const rc = String(sessionRole || '').toUpperCase();
  if (rc === 'PARENT') return 'parent';
  return 'student';
};

function ProgressRing({ value }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width="86" height="86" className="shrink-0">
      <circle cx="43" cy="43" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
      <circle
        cx="43"
        cy="43"
        r={radius}
        stroke={AMBER}
        strokeWidth="8"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 43 43)"
      />
      <text x="43" y="47" textAnchor="middle" className="fill-current text-[11px] font-black">
        {value}%
      </text>
    </svg>
  );
}

function Section({ title, icon, children, dark }) {
  const IconComponent = icon;
  return (
    <section className={`rounded-2xl border p-4 md:p-5 ${dark ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
      <div className="mb-4 flex items-center gap-2">
        <IconComponent size={16} className="text-amber-500" />
        <h2 className="text-sm md:text-base font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function StudentDashboard() {
  const [role, setRole] = useState('student');
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState('en');
  const [liveTick, setLiveTick] = useState(0);
  const [socketState, setSocketState] = useState('polling');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subjectScores, setSubjectScores] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [chatDraft, setChatDraft] = useState('');
  const [chat, setChat] = useState([
    { from: 'Teacher', text: 'Please revise kinematics before Friday.', at: '09:10' },
    { from: 'Parent', text: 'Noted. We will review tonight.', at: '09:24' },
  ]);

  const loadData = useCallback(async () => {
    setError('');
    try {
      const data = await fetchDashboardData();
      setDashboardData(data);
      const firstStudent = data.students[0];
      if (firstStudent && !selectedStudentId) setSelectedStudentId(String(firstStudent.id));
      const sessionRole = data.session?.role?.code || data.session?.role_code;
      setRole(roleFromSession(sessionRole));
    } catch {
      setError('Failed to load dashboard data. Please ensure backend is running and you are logged in.');
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!dashboardData?.gradebookPairs?.length) return;
    const pair = dashboardData.gradebookPairs[0];
    let cancelled = false;
    const run = async () => {
      const matrix = await fetchGradebookMatrix(pair.class_name, pair.subject_name);
      if (!matrix || cancelled) return;
      const rows = (matrix.columns || []).slice(0, 6).map((col) => {
        const values = (matrix.students || [])
          .map((student) => Number(student?.scores?.[col.slug]))
          .filter((v) => Number.isFinite(v));
        const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
        return { subject: col.label || col.slug, cat: avg, exam: Math.max(0, avg - 3) };
      });
      setSubjectScores(rows);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [dashboardData]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const payments = await fetchRecentPayments(5);
      if (!cancelled) setRecentPayments(payments);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setLiveTick((n) => n + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let socket;
    let isMounted = true;
    const connect = async () => {
      try {
        const socketModule = await import('socket.io-client');
        const io = socketModule.io;
        socket = io(import.meta.env.VITE_SOCKET_URL || apiOrigin, {
          withCredentials: true,
          transports: ['websocket', 'polling'],
          timeout: 4000,
        });
        socket.on('connect', () => {
          if (!isMounted) return;
          setSocketState('socket');
        });
        socket.on('disconnect', () => {
          if (!isMounted) return;
          setSocketState('polling');
        });
        socket.on('dashboard:update', () => {
          if (!isMounted) return;
          loadData();
        });
      } catch {
        if (isMounted) setSocketState('polling');
      }
    };
    connect();
    const fallbackPolling = setInterval(() => {
      if (socketState !== 'socket') loadData();
    }, 30000);
    return () => {
      isMounted = false;
      clearInterval(fallbackPolling);
      if (socket) socket.disconnect();
    };
  }, [loadData, socketState]);

  const t = dictionary[lang];
  const studentList = useMemo(() => dashboardData?.students || [], [dashboardData]);
  const selected = useMemo(() => {
    if (!studentList.length) return null;
    return studentList.find((s) => String(s.id) === String(selectedStudentId)) || studentList[0];
  }, [studentList, selectedStudentId]);

  const selectedPortal = useMemo(() => {
    const portal = dashboardData?.portalStudents || [];
    const targetName = selected ? `${selected.first_name} ${selected.last_name}`.trim().toLowerCase() : '';
    return portal.find((p) => String(p.name || '').trim().toLowerCase() === targetName) || null;
  }, [dashboardData, selected]);

  const profile = useMemo(() => {
    const fullName = selected ? `${selected.first_name} ${selected.last_name}` : 'No student loaded';
    const avatarSource = fullName.split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase();
    return {
      fullName: role === 'parent' ? `Parent View · ${fullName}` : fullName,
      className: selected?.class_name || 'Unknown Class',
      stream: selectedPortal?.stream || '-',
      studentId: selected?.student_uid || '-',
      academicYear: selected?.academic_year || dashboardData?.defaults?.academicYear || '-',
      status: selectedPortal?.status === 'On leave' ? 'Suspended' : 'Active',
      avatar: avatarSource || 'ST',
    };
  }, [role, selected, selectedPortal, dashboardData]);

  const attendancePercent = Number(selectedPortal?.attendance || dashboardData?.attendanceOverview?.globalAttendance || 0);
  const avgGrade = useMemo(() => {
    if (!subjectScores.length) return Number(dashboardData?.attendanceOverview?.institutionalGPA || 0);
    const arr = subjectScores.flatMap((x) => [x.cat, x.exam]).filter((v) => Number.isFinite(v));
    if (!arr.length) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }, [subjectScores, dashboardData]);
  const disciplineEntry = (dashboardData?.disciplineSummary || []).find((d) => String(d.id) === String(selected?.id));
  const disciplineScore = Math.max(0, Math.round(Number(disciplineEntry?.discipline_remaining || 0)));
  const feeRows = dashboardData?.feeReport?.rows || [];
  const feeForStudent = feeRows.find((r) => String(r.student_id) === String(selected?.id));
  const feesBalance = Math.round(Number(feeForStudent?.remaining || 0));
  const attendanceMonth = useMemo(() => monthMarksFromPercent(attendancePercent), [attendancePercent]);
  const presentDays = useMemo(() => attendanceMonth.filter((d) => d === 'P').length, [attendanceMonth]);
  const absentDays = useMemo(() => attendanceMonth.filter((d) => d === 'A').length, [attendanceMonth]);
  const lateDays = useMemo(() => attendanceMonth.filter((d) => d === 'L').length, [attendanceMonth]);
  const performanceTrend = dashboardData?.attendanceOverview?.attendanceOverview?.sparkline?.length
    ? dashboardData.attendanceOverview.attendanceOverview.sparkline.map((row, index) => ({
      month: `W${index + 1}`,
      score: avgGrade,
      attendance: Number(row?.value || 0),
    }))
    : fallbackTrend;

  const onSendChat = () => {
    const message = chatDraft.trim();
    if (!message) return;
    setChat((prev) => [...prev, { from: role === 'student' ? 'Student' : 'Parent', text: message, at: 'Now' }]);
    setChatDraft('');
  };

  return (
    <div className={`${darkMode ? 'bg-[#050726] text-slate-100' : 'bg-slate-50 text-slate-800'} h-full overflow-auto`}>
      <div className="mx-auto max-w-[1500px] p-4 md:p-6 space-y-4 md:space-y-5">
        <header className={`rounded-2xl border p-4 md:p-5 ${darkMode ? 'bg-[#0a0f3f] border-white/10' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-black text-amber-500">Smart Portal</p>
              <h1 className="text-xl md:text-2xl font-black" style={{ color: darkMode ? '#fff' : BRAND }}>{t.dashboard}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className={`h-10 px-3 rounded-lg text-sm font-semibold border max-w-[240px] ${darkMode ? 'bg-slate-900 border-white/20' : 'bg-white border-slate-300'}`}>
                {studentList.map((s) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={`h-10 px-3 rounded-lg text-sm font-semibold border ${darkMode ? 'bg-slate-900 border-white/20' : 'bg-white border-slate-300'}`}>
                <option value="student">Student</option>
                <option value="parent">Parent</option>
              </select>
              <select value={lang} onChange={(e) => setLang(e.target.value)} className={`h-10 px-3 rounded-lg text-sm font-semibold border ${darkMode ? 'bg-slate-900 border-white/20' : 'bg-white border-slate-300'}`}>
                <option value="en">English</option>
                <option value="rw">Kinyarwanda</option>
                <option value="fr">Francais</option>
              </select>
              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                className="h-10 px-3 rounded-lg font-semibold text-sm border inline-flex items-center gap-2"
                style={{ borderColor: AMBER, color: AMBER }}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                {darkMode ? 'Light' : 'Dark'}
              </button>
              <span className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-3 py-2 bg-emerald-100 text-emerald-700">
                <Activity size={13} />
                {socketState === 'socket' ? 'Socket Live' : 'Polling Live'} {liveTick}
              </span>
            </div>
          </div>
          {loading && <p className="mt-2 text-xs font-semibold text-amber-500">Loading live dashboard data…</p>}
          {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { k: 'Attendance %', v: `${attendancePercent}%`, icon: CheckCircle2 },
            { k: 'Average Grade', v: `${avgGrade}%`, icon: GraduationCap },
            { k: 'Discipline Score', v: disciplineScore, icon: AlertTriangle },
            { k: 'Fees Balance', v: `${feesBalance.toLocaleString()} RWF`, icon: CreditCard },
          ].map((item) => (
            <div key={item.k} className={`rounded-2xl border p-4 ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest font-black text-slate-400">{item.k}</p>
                <item.icon size={16} className="text-amber-500" />
              </div>
              <p className="mt-2 text-xl font-black" style={{ color: darkMode ? '#fff' : BRAND }}>{item.v}</p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Section title={t.overview} icon={UserCircle2} dark={darkMode}>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#000435] text-white flex items-center justify-center font-black">{profile.avatar}</div>
              <div className="space-y-1 text-sm">
                <p className="font-bold">{profile.fullName}</p>
                <p>Class: {profile.className} · {profile.stream}</p>
                <p>ID: {profile.studentId}</p>
                <p>Year: {profile.academicYear}</p>
                <p>Status: <span className="font-bold text-emerald-500">{profile.status}</span></p>
              </div>
              <div className="ml-auto">
                <ProgressRing value={avgGrade} />
              </div>
            </div>
          </Section>

          <Section title={t.attendance} icon={Clock3} dark={darkMode}>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl p-3 bg-emerald-100 text-emerald-700"><p className="text-lg font-black">{presentDays}</p><p>Present</p></div>
              <div className="rounded-xl p-3 bg-red-100 text-red-700"><p className="text-lg font-black">{absentDays}</p><p>Absent</p></div>
              <div className="rounded-xl p-3 bg-amber-100 text-amber-700"><p className="text-lg font-black">{lateDays}</p><p>Late</p></div>
            </div>
            <p className="mt-3 text-xs">RFID / QR live check-in: <span className="font-bold text-emerald-500">Ready for integration API</span></p>
            <p className="text-xs">Parent alert trigger: <span className="font-bold">Enabled on absence</span></p>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {attendanceMonth.map((mark, i) => (
                <div
                  key={`${mark}-${i}`}
                  className={`h-5 rounded ${mark === 'P' ? 'bg-emerald-500' : mark === 'A' ? 'bg-red-500' : 'bg-amber-500'}`}
                  title={`Day ${i + 1}: ${mark}`}
                />
              ))}
            </div>
          </Section>

          <Section title={t.discipline} icon={AlertTriangle} dark={darkMode}>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">Behavior Grade: <span className="text-emerald-500 font-black">{disciplineScore >= 80 ? 'A' : disciplineScore >= 60 ? 'B' : 'C'}</span></p>
              <p>Discipline Score: <span className="font-black">{disciplineScore}</span>/100</p>
              <div className="rounded-lg p-2 bg-emerald-100 text-emerald-700">+5 Good behavior in class discussion</div>
              <div className="rounded-lg p-2 bg-red-100 text-red-700">-10 Late to morning assembly</div>
              <p className="text-xs text-slate-400">Positive vs negative tracking is auto-classified by behavior engine.</p>
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Section title={t.academics} icon={TrendingUp} dark={darkMode}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke={AMBER} strokeWidth={3} />
                  <Line type="monotone" dataKey="attendance" stroke={BRAND} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs mt-2">Rank in class: <span className="font-black">7 / 56</span></p>
          </Section>

          <Section title="CAT vs Exam by Subject" icon={GraduationCap} dark={darkMode}>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectScores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cat" fill={BRAND} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="exam" fill={AMBER} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Section title={t.feedback} icon={MessageSquare} dark={darkMode}>
            <ul className="space-y-2 text-sm">
              <li className="rounded-lg p-2 border border-slate-200">Math: Improve speed in algebraic transformations.</li>
              <li className="rounded-lg p-2 border border-slate-200">Physics: Excellent practical understanding.</li>
              <li className="rounded-lg p-2 border border-slate-200">Chemistry: Revise balancing and stoichiometry.</li>
            </ul>
          </Section>

          <Section title={t.fees} icon={CreditCard} dark={darkMode}>
            <div className="space-y-2 text-sm">
              <p>Total Fees: <span className="font-black">{Math.round(Number(feeForStudent?.total_due || 0)).toLocaleString()} RWF</span></p>
              <p>Paid: <span className="font-black text-emerald-500">{Math.round(Number(feeForStudent?.total_paid || 0)).toLocaleString()} RWF</span></p>
              <p>Balance: <span className="font-black text-red-500">{feesBalance.toLocaleString()} RWF</span></p>
              <p>Payment reminder: Next due date in <span className="font-black">6 days</span></p>
              <a href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5100/api'}/accountant/reports/payments/export.pdf?academic_year=${encodeURIComponent(dashboardData?.defaults?.academicYear || '')}&term=${encodeURIComponent(dashboardData?.defaults?.term || '')}`} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-500 text-white px-3 py-2 text-xs font-bold no-underline">
                <Download size={14} />
                Download Receipt (PDF)
              </a>
            </div>
          </Section>

          <Section title={t.notices} icon={Bell} dark={darkMode}>
            <div className="space-y-2 text-sm">
              <div className="rounded-lg p-2 bg-slate-100">Exam starts Monday.</div>
              <div className="rounded-lg p-2 bg-slate-100">School closed due to rain.</div>
              <div className="rounded-lg p-2 bg-red-100 text-red-700">Emergency: Pickup delayed by 30 minutes.</div>
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Section title={t.schoolCalendar} icon={CalendarDays} dark={darkMode}>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Mid-Term Exams</span><span className="font-bold">May 16</span></li>
              <li className="flex justify-between"><span>Parents Meeting</span><span className="font-bold">May 25</span></li>
              <li className="flex justify-between"><span>National Holiday</span><span className="font-bold">Jun 01</span></li>
            </ul>
          </Section>

          <Section title={t.messaging} icon={MessageSquare} dark={darkMode}>
            <div className="space-y-2">
              <div className="h-32 overflow-auto space-y-2 pr-1">
                {chat.map((m, i) => (
                  <div key={`${m.at}-${i}`} className="rounded-lg p-2 text-xs border border-slate-200">
                    <p className="font-bold">{m.from} · {m.at}</p>
                    <p>{m.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input value={chatDraft} onChange={(e) => setChatDraft(e.target.value)} className={`flex-1 h-10 rounded-lg px-3 text-sm border ${darkMode ? 'bg-slate-900 border-white/20' : 'bg-white border-slate-300'}`} placeholder="Write message..." />
                <button onClick={onSendChat} className="h-10 px-3 rounded-lg bg-[#000435] text-white"><Send size={14} /></button>
                <button className="h-10 px-3 rounded-lg border border-slate-300"><FileUp size={14} /></button>
              </div>
              <p className="text-[11px] text-slate-400">Messaging endpoint is not yet available in backend routes; UI is ready and auto-syncs once `/api/messages` is added.</p>
            </div>
          </Section>

          <Section title={t.homework} icon={FileUp} dark={darkMode}>
            <div className="space-y-2 text-sm">
              <div className="rounded-lg p-2 border border-slate-200">
                <p className="font-bold">Physics Report</p>
                <p>Deadline: Apr 28 · Status: Pending</p>
              </div>
              <div className="rounded-lg p-2 border border-slate-200">
                <p className="font-bold">Math Quiz Corrections</p>
                <p className="text-red-500 font-semibold">Late submission warning</p>
              </div>
              <div className="rounded-lg p-2 border border-slate-200">
                <p className="font-bold">Chem CAT Reflection</p>
                <p>Teacher feedback: Good effort, add references.</p>
              </div>
            </div>
          </Section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Section title={t.transport} icon={Bus} dark={darkMode}>
            <div className="space-y-2 text-sm">
              <p>Bus: <span className="font-black">Route 3 - Kimironko</span></p>
              <p>Current status: <span className="font-black text-emerald-500">On route (ETA 12 mins)</span></p>
              <p>Pickup/drop alerts: <span className="font-bold">Enabled</span></p>
            </div>
          </Section>

          <Section title={t.insights} icon={Languages} dark={darkMode}>
            <div className="space-y-2 text-sm">
              <div className="rounded-lg p-2 bg-amber-100 text-amber-800">Attendance dropped by 15% this month.</div>
              <div className="rounded-lg p-2 bg-sky-100 text-sky-800">Predicted risk: Medium in Biology unless revision increases.</div>
              <div className="rounded-lg p-2 bg-emerald-100 text-emerald-800">Best improvement area: weekly CAT practice.</div>
            </div>
          </Section>

          <Section title={t.notifications} icon={Bell} dark={darkMode}>
            <ul className="space-y-2 text-sm">
              <li className="rounded-lg p-2 border border-slate-200">Attendance alert published.</li>
              <li className="rounded-lg p-2 border border-slate-200">Fee reminder sent by SMS/Email.</li>
              <li className="rounded-lg p-2 border border-slate-200">Discipline report updated.</li>
              <li className="rounded-lg p-2 border border-slate-200">Results are now available.</li>
              {recentPayments.slice(0, 2).map((payment) => (
                <li key={payment.id} className="rounded-lg p-2 border border-slate-200">
                  Payment posted: {Math.round(Number(payment.amount_paid || 0)).toLocaleString()} RWF
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
