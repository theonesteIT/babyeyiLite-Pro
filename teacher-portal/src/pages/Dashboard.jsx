import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  MessageSquare,
  BookOpen,
  Users,
  ArrowRight,
  ChevronRight,
  CheckSquare,
  Banknote,
  Gift,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import TeacherOrangeHero from '../components/TeacherOrangeHero';
import TeacherDashboardTimetable from '../components/TeacherDashboardTimetable';
import TeacherDashboardSchoolChart from '../components/TeacherDashboardSchoolChart';

const Dashboard = () => {
  const { teacher } = useAuth();

  const [stats, setStats] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [schoolOverview, setSchoolOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/teacher-portal/dashboard');
        if (res.data.success) {
          setStats(res.data.data.stats || []);
          setSchedule(res.data.data.schedule || []);
          setWeeklySchedule(res.data.data.weeklySchedule || []);
          setSchoolOverview(res.data.data.schoolOverview || null);
        }
      } catch (e) {
        console.error('Failed to fetch dashboard', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const quickTools = [
    { title: 'Ticha AI', desc: 'Lesson planning assistant', icon: MessageSquare, color: 'text-violet-600 bg-violet-50', path: '/ticha-ai' },
    { title: 'Ticha Avance', desc: 'Teacher credit & advances', icon: Wallet, color: 'text-amber-700 bg-amber-50', path: '/shule-avance' },
    { title: 'Ticha Deals', desc: 'Discounts on goods & services', icon: Gift, color: 'text-orange-600 bg-orange-50', path: '/ticha-deals' },
    { title: 'English Club', desc: 'Professional development', icon: BookOpen, color: 'text-sky-600 bg-sky-50', path: '/english-club' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f0f2f9]">
        <div className="w-10 h-10 rounded-full border-4 border-[#000435]/15 border-t-[#000435] animate-spin" />
        <p className="text-sm text-re-text-muted">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 min-h-full pb-24 lg:pb-10">
      <TeacherOrangeHero
        title={`Welcome back, ${teacher?.first_name || 'Teacher'}`}
        subtitle="Ready to inspire your students today?"
      />

      <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 space-y-5 pb-10">
        {stats.length > 0 && (
          <div className="tp-stat-grid shadow-sm">
            {stats.map((stat, i) => {
              let displayLabel = stat.label;
              if (stat.label === 'Total Classes') displayLabel = 'Total classes today';
              if (stat.label === 'Total Sessions') displayLabel = 'Total sessions today';

              const isLast = i === stats.length - 1;
              const isOddCol = i % 2 === 0;
              const showBottomBorder = i < 2 && stats.length > 2;

              return (
                <div
                  key={i}
                  className={`tp-stat-cell border-black/[0.05]
                    ${!isLast && isOddCol ? 'border-r' : ''}
                    ${showBottomBorder ? 'border-b sm:border-b-0' : ''}
                    ${i < stats.length - 1 ? 'sm:border-r' : ''}`}
                >
                  <span className="tp-stat-value">{stat.value}</span>
                  <p className="tp-stat-label">{displayLabel}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
          <div className="lg:col-span-2 min-w-0">
            <TeacherDashboardTimetable schedule={schedule} weeklySchedule={weeklySchedule} />
          </div>

          <div className="lg:col-span-3 min-w-0">
            <TeacherDashboardSchoolChart overview={schoolOverview} />
          </div>
        </div>

        <div className="tp-card overflow-hidden">
          <div className="tp-card-header">
            <Sparkles size={15} className="text-[#c87800]" strokeWidth={1.75} />
            <h3>Quick access</h3>
          </div>

          <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
            {quickTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.path} to={tool.path} className="tp-tool-tile group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tool.color}`}>
                    <Icon size={17} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm text-[#000435] leading-snug font-normal">{tool.title}</h4>
                    <p className="text-xs text-re-text-muted mt-0.5 leading-relaxed">{tool.desc}</p>
                    <span className="inline-flex items-center gap-1 mt-2 text-xs text-[#c87800] group-hover:gap-1.5 transition-all">
                      Open <ArrowRight size={12} strokeWidth={2} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="md:hidden divide-y divide-black/[0.06]">
            {quickTools.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.path}
                  to={tool.path}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50/80 transition-colors ${i === 0 ? 'rounded-t-[inherit]' : ''}`}
                >
                  <Icon size={22} strokeWidth={1.75} className="text-[#c87800]/80 shrink-0" />
                  <span className="text-sm text-[#000435] flex-1">{tool.title}</span>
                  <ChevronRight size={18} className="text-slate-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="md:hidden">
          <p className="text-xs text-re-text-muted mb-2 px-1">Shortcuts</p>
          <div className="tp-card grid grid-cols-3 divide-x divide-black/[0.06]">
            <Link to="/students" className="flex flex-col items-center justify-center gap-1.5 py-4 hover:bg-slate-50/80 transition-colors">
              <Users size={22} strokeWidth={1.75} className="text-[#c87800]/75" />
              <span className="text-[11px] text-re-text-muted">Students</span>
            </Link>
            <Link to="/attendance" className="flex flex-col items-center justify-center gap-1.5 py-4 hover:bg-slate-50/80 transition-colors">
              <CheckSquare size={22} strokeWidth={1.75} className="text-[#c87800]/75" />
              <span className="text-[11px] text-re-text-muted">Attendance</span>
            </Link>
            <Link to="/payroll" className="flex flex-col items-center justify-center gap-1.5 py-4 hover:bg-slate-50/80 transition-colors">
              <Banknote size={22} strokeWidth={1.75} className="text-[#c87800]/75" />
              <span className="text-[11px] text-re-text-muted">Payroll</span>
            </Link>
          </div>
        </div>

        <Link to="/chat" className="tp-support-card hidden md:block group active:scale-[0.99]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Users size={18} strokeWidth={1.75} className="text-white/90" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm text-white font-normal">Need support?</h4>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                Connect with your school admin or Babyeyi assistant.
              </p>
              <span className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#FEBF10] group-hover:gap-2 transition-all">
                Open chat <ArrowRight size={13} strokeWidth={2} />
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
