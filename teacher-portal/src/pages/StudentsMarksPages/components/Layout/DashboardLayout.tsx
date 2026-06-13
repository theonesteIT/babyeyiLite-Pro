import { Outlet, useLocation } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useState } from 'react';
import AIAssistant from '../AIAssistant';
import '../../marksHub.css';

const PAGE_TITLES = {
  '/marks': { title: 'Marks dashboard', subtitle: 'Overview of classes, performance, and pending work' },
  '/marks/insights': { title: 'Teacher insights', subtitle: 'AI-powered academic insights for your classes' },
  '/marks/record-marks': { title: 'Record marks', subtitle: 'Guided wizard to enter and publish student assessment scores' },
  '/marks/marks-center': { title: 'Marks center', subtitle: 'Full gradebook, analytics, and inline mark editing for your assigned classes' },
  '/marks/register-marks': { title: 'Record marks', subtitle: 'Guided wizard to enter and publish student assessment scores' },
  '/marks/assessments': { title: 'Assessments', subtitle: 'Create and manage CATs, exams, and assignments' },
  '/marks/grade-book': { title: 'Grade book', subtitle: 'Full grade overview across subjects and classes' },
  '/marks/question-bank': { title: 'Question bank', subtitle: 'Store and reuse assessment questions' },
  '/marks/student-profiles': { title: 'Student profiles', subtitle: 'Individual learner records and history' },
  '/marks/at-risk': { title: 'At-risk students', subtitle: 'Learners who need early intervention' },
  '/marks/student-performance': { title: 'Student performance', subtitle: 'Analytics and trends per learner' },
  '/marks/competencies': { title: 'CBC competencies', subtitle: 'Competency-based curriculum tracking' },
  '/marks/rankings': { title: 'Rankings', subtitle: 'Class and subject leaderboards' },
  '/marks/predictions': { title: 'AI predictions', subtitle: 'Forecasted outcomes and risk signals' },
  '/marks/learning-gaps': { title: 'Learning gaps', subtitle: 'Topics and skills needing reinforcement' },
  '/marks/class-performance': { title: 'Class performance', subtitle: 'Compare classes and subject averages' },
  '/marks/attendance': { title: 'Marks attendance', subtitle: 'Attendance linked to academic sessions' },
  '/marks/attendance-analytics': { title: 'Attendance analytics', subtitle: 'Correlation between attendance and results' },
  '/marks/parent-communication': { title: 'Parent communication', subtitle: 'Messages and updates to guardians' },
  '/marks/notifications': { title: 'Notifications', subtitle: 'Alerts for marks, deadlines, and reviews' },
  '/marks/meetings': { title: 'Meetings', subtitle: 'Parent meetings and follow-ups' },
  '/marks/reports': { title: 'Academic reports', subtitle: 'Generate and export report documents' },
  '/marks/cbc-reports': { title: 'CBC reports', subtitle: 'Competency-based curriculum reports' },
  '/marks/performance-reports': { title: 'Performance reports', subtitle: 'Detailed performance summaries' },
  '/marks/interventions': { title: 'Intervention plans', subtitle: 'Structured support for struggling learners' },
};

export default function DashboardLayout() {
  const location = useLocation();
  const [aiOpen, setAiOpen] = useState(false);
  const meta = PAGE_TITLES[location.pathname] || { title: 'Marks & Exams', subtitle: '' };

  return (
    <div className="marks-layout-root w-full">
      <div className="mb-5 md:mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#000435]/40 mb-1">Marks &amp; Exams</p>
        <h2 className="text-lg font-black text-[#000435]">{meta.title}</h2>
        {meta.subtitle && <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>}
      </div>
      <div className="marks-hub">
        <Outlet />
      </div>
      <button
        type="button"
        onClick={() => setAiOpen((o) => !o)}
        className="fixed bottom-24 md:bottom-8 right-6 w-12 h-12 rounded-2xl bg-[#000435] text-white shadow-lg flex items-center justify-center hover:bg-[#0a116b] transition-all z-40 border border-white/10"
        title="AI assistant"
      >
        <Brain size={22} />
      </button>
      {aiOpen && <AIAssistant onClose={() => setAiOpen(false)} />}
    </div>
  );
}
