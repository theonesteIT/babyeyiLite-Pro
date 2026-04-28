import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  MessageSquare,
  BookOpen,
  Users,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

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
    { title: 'TichaAI', desc: 'Get help with lesson planning', icon: <MessageSquare size={20} />, color: 'text-re-purple', path: '/ticha-ai' },
    { title: 'ShuleAvance', desc: 'Apply for teacher credit', icon: <Wallet size={20} />, color: 'text-re-orange', path: '/shule-avance' },
    { title: 'Requisitions', desc: 'Request supplies & services', icon: <FileSpreadsheet size={20} />, color: 'text-amber-600', path: '/requisitions' },
    { title: 'English Club', desc: 'Professional development', icon: <BookOpen size={20} />, color: 'text-re-blue', path: '/english-club' },
  ];

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center bg-re-bg"><RefreshCw className="animate-spin text-re-orange" /></div>;
  }

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">

      {/* HERO */}
      <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[230px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src="/teacher.jpg" className="w-full h-full object-cover shadow-2xl" />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
        </div>

        <div className="relative z-10 max-w-4xl">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
            Welcome back, {teacher?.first_name || 'Main'} 👋
          </h1>
          <p className="text-sm md:text-base font-bold opacity-90 max-w-2xl">
            Ready to inspire your students today?
          </p>
        </div>
      </section>

      {/* MAIN */}
      <div className="max-w-[1300px] mx-auto px-5 md:px-8 -mt-10 relative z-20 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-5">

            {/* STATS */}
            <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden grid grid-cols-2">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className={`p-5 flex flex-col items-center justify-center text-center border-gray-100 
                  ${i % 2 === 0 ? 'border-r' : ''} 
                  ${i < 2 ? 'border-b' : ''}`}
                >
                  <span className="text-xl md:text-2xl font-black text-re-text">
                    {stat.value}
                  </span>
                  <p className="text-[9px] font-black text-re-text-muted uppercase tracking-widest mt-1 opacity-60">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* TOOLS */}
            <div className="bg-white rounded-[24px] shadow-sm border border-black/5 p-5 space-y-4">
              <h3 className="text-sm font-black text-re-text uppercase opacity-80">
                Quick Access Tools
              </h3>

              <div className="grid grid-cols-1 divide-y-2 divide-gray-200 md:divide-y-0 md:grid-cols-2 gap-3">
                {quickTools.map((tool, i) => (
                  <div key={i} className="p-2.5 md:rounded-lg hover:bg-re-bg transition-all group">

                    <div className="space-y-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-re-bg shadow-inner ${tool.color}`}>
                        {React.cloneElement(tool.icon, { size: 16 })}
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-re-text">
                          {tool.title}
                        </h4>
                        <p className="text-[10px] text-re-text-muted font-bold opacity-60 leading-snug pr-2">
                          {tool.desc}
                        </p>
                      </div>

                      <Link
                        to={tool.path}
                        className="flex items-center gap-1 text-re-orange font-black text-[9px] uppercase tracking-widest group-hover:gap-2 transition-all"
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
            <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-0.5 h-3 bg-re-purple rounded-full"></span>
                <h3 className="text-xs font-black text-re-text uppercase tracking-widest opacity-70">Today's Schedule</h3>
              </div>

              <div className="space-y-2">
                {schedule.map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2 rounded-lg transition-all
                    ${item.active ? 'bg-orange-50/50 border-b shadow-inner border-orange-100' : 'hover:bg-re-bg'}`}>

                    <span className={`text-[8px] font-black min-w-[32px] pt-0.5
                      ${item.active ? 'text-re-orange' : 'text-re-text-muted opacity-40'}`}>
                      {item.time}
                    </span>

                    <div>
                      <p className="font-black text-re-text text-xs leading-none tracking-tight">
                        {item.title}
                      </p>
                      <p className="text-[8px] text-re-text-muted font-bold uppercase tracking-widest opacity-40 mt-1">
                        {item.room}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-center">
                <button className="text-re-orange font-black text-[8px] uppercase tracking-widest hover:underline opacity-80">
                  View Full Timetable
                </button>
              </div>
            </div>

            {/* Quick Support Card (Rich Gradient + Texture) */}
            <Link
              to="/chat"
              className="relative block rounded-[24px] p-6 text-white shadow-re-premium-purple overflow-hidden group cursor-pointer active:scale-95 transition-all bg-re-grad-purple"
            >

              {/* Background Texture Overlay */}
              <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                <img src="/teacher.jpg" alt="" className="w-full h-full object-cover grayscale" />
              </div>

              <div className="relative z-10 flex flex-col gap-4">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                  <Users size={18} className="text-white" />
                </div>
                <div>
                  <h4 className="font-black text-xs tracking-widest uppercase leading-none opacity-90">Need Support?</h4>
                  <p className="text-[10px] text-white font-bold leading-snug mt-2 opacity-80">
                    Connect with a Babyeyi assistant for help with classes or records.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest group-hover:gap-2.5 transition-all">
                  Chat Now <ArrowRight size={12} />
                </div>
              </div>

              {/* Premium Glows */}
              <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
              <div className="absolute -top-10 -left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;