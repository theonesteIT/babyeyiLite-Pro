import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  MessageSquare,
  Users,
  ArrowRight,
  RefreshCw,
  Shield,
  ClipboardCheck,
  Eye,
  Calendar,
  FileSpreadsheet,
  ClipboardList,
  ShoppingBag,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PORTAL } from '../config/portal';
import { h } from '../utils/href';

const Dashboard = () => {
  const { teacher } = useAuth();
  
  const [stats, setStats] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/teacher-portal/dashboard');
        if (res.data.success) {
          setStats(res.data.data.stats || []);
          setSchedule(res.data.data.schedule || []);
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
    {
      title: 'Conduct overview',
      desc: 'Set maximum conduct marks and how this portal fits your role.',
      icon: <Shield size={20} />,
      color: 'text-amber-700',
      path: '/conduct',
    },
    {
      title: 'Students',
      desc: 'Rosters and learner context for follow-ups.',
      icon: <Users size={20} />,
      color: 'text-re-purple',
      path: '/students',
    },
    {
      title: 'Attendance',
      desc: 'See roll patterns alongside behaviour work.',
      icon: <ClipboardCheck size={20} />,
      color: 'text-emerald-600',
      path: '/attendance',
    },
    {
      title: 'View marks',
      desc: 'Academic performance when triaging conduct cases.',
      icon: <Eye size={20} />,
      color: 'text-blue-600',
      path: '/marks/view',
    },
    {
      title: 'Timetable',
      desc: 'School-wide periods for duty and class context.',
      icon: <Calendar size={20} />,
      color: 'text-re-blue',
      path: '/timetable',
    },
    {
      title: 'TichaAI',
      desc: 'Draft letters to parents or incident summaries.',
      icon: <MessageSquare size={20} />,
      color: 'text-re-purple',
      path: '/ticha-ai',
    },
    {
      title: 'Shule Avance',
      desc: 'Teacher service requests and cash support.',
      icon: <Wallet size={20} />,
      color: 'text-re-orange',
      path: '/shule-avance',
    },
    {
      title: 'Ticha Deals',
      desc: 'Staff deals and payroll-friendly purchases.',
      icon: <ShoppingBag size={20} />,
      color: 'text-amber-600',
      path: '/ticha-deals',
    },
    {
      title: 'Requisitions',
      desc: 'Create and track requests for school services.',
      icon: <FileSpreadsheet size={20} />,
      color: 'text-amber-700',
      path: '/requisitions',
    },
    {
      title: 'Set discipline marks',
      desc: 'Record discipline marks and keep a clear audit trail.',
      icon: <ClipboardList size={20} />,
      color: 'text-rose-600',
      path: '/discipline/set-marks',
    },
  ];

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-re-bg"><RefreshCw className="animate-spin text-re-orange" /></div>;
  }

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">
      <section className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/85">Discipline portal</p>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-medium text-white tracking-tight leading-tight">
              Dashboard <span className="text-[#FEBF10]">{teacher?.first_name || 'Team'}</span>
            </h1>
            <p className="text-xs sm:text-sm font-normal text-white/82 max-w-xl leading-relaxed">
              Track discipline, attendance, and student support with a cleaner manager-style dashboard.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-5">

            {/* STATS */}
            <div className="bg-white rounded-[24px] shadow-sm border border-black/10 overflow-hidden grid grid-cols-2">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className={`p-5 flex flex-col items-center justify-center text-center border-gray-100 
                  ${i % 2 === 0 ? 'border-r' : ''} 
                  ${i < 2 ? 'border-b' : ''}`}
                >
                  <span className="text-xl md:text-2xl font-semibold text-re-text">
                    {stat.value}
                  </span>
                  <p className="text-[9px] font-medium text-re-text-muted uppercase tracking-wider mt-1 opacity-60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* TOOLS */}
            <div className="bg-white rounded-[24px] shadow-sm border border-black/5 p-5 space-y-4">
              <h3 className="text-sm font-medium text-re-text uppercase tracking-wide opacity-80">
                Quick access
              </h3>

              <div className="grid grid-cols-1 divide-y-2 divide-gray-200 md:divide-y-0 md:grid-cols-2 gap-3">
                {quickTools.map((tool, i) => (
                  <div key={i} className="p-2.5 md:rounded-lg hover:bg-re-bg transition-all group">

                    <div className="space-y-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-re-bg shadow-inner ${tool.color}`}>
                        {React.cloneElement(tool.icon, { size: 16 })}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-re-text">
                          {tool.title}
                        </h4>
                        <p className="text-[10px] text-re-text-muted font-medium opacity-70 leading-snug pr-2">
                          {tool.desc}
                        </p>
                      </div>

                      <Link
                        to={h(tool.path)}
                        className="flex items-center gap-1 text-re-orange font-medium text-[9px] uppercase tracking-wider group-hover:gap-2 transition-all"
                      >
                        Open Tool <ArrowRight size={11} />
                      </Link>
                    </div>

                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT Sidebar (Sticky Container) */}
          <div className="space-y-5 lg:sticky lg:top-20 h-fit">

            {/* Today's Schedule Card */}
            <div className="bg-white rounded-[24px] shadow-sm border border-black/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-0.5 h-3 bg-re-purple rounded-full"></span>
                <h3 className="text-xs font-medium text-re-text uppercase tracking-wider opacity-70">Today&apos;s timetable</h3>
              </div>

              <div className="space-y-2">
                {schedule.map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2 rounded-lg transition-all
                    ${item.active ? 'bg-orange-50/50 border-b shadow-inner border-orange-100' : 'hover:bg-re-bg'}`}>

                    <span className={`text-[8px] font-medium min-w-[32px] pt-0.5
                      ${item.active ? 'text-re-orange' : 'text-re-text-muted opacity-40'}`}>
                      {item.time}
                    </span>

                    <div>
                      <p className="font-semibold text-re-text text-xs leading-none tracking-tight">
                        {item.subject || item.title}
                      </p>
                      <p className="text-[8px] text-re-text-muted font-medium uppercase tracking-wider opacity-40 mt-1">
                        {[item.group, item.room].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center">
                <Link
                  to={h('/timetable')}
                  className="inline-block text-re-orange font-medium text-[8px] uppercase tracking-wider hover:underline opacity-80"
                >
                  View full timetable
                </Link>
              </div>
            </div>

            {/* Quick Support Card (Rich Gradient + Texture) */}
            <div className="relative rounded-[24px] p-6 text-white shadow-sm border border-black/10 overflow-hidden group active:scale-[0.99] transition-all bg-re-grad-purple">

              {/* Background Texture Overlay */}
              <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                <img src="/teacher.jpg" alt="" className="w-full h-full object-cover grayscale" />
              </div>

              <Link to={h('/conduct')} className="relative z-10 flex flex-col gap-4">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                  <Shield size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs tracking-wider uppercase leading-none opacity-90">Conduct hub</h4>
                  <p className="text-[10px] text-white font-medium leading-snug mt-2 opacity-80">
                    Open the conduct hub to set maximum marks and apply them to learners.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider group-hover:gap-2.5 transition-all">
                  Go to conduct <ArrowRight size={12} />
                </div>
              </Link>

              {/* Premium Glows */}
              <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="absolute -top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;