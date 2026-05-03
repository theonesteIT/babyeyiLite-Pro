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
  ChevronRight,
  CheckSquare,
  Banknote,
  Gift,
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
    { title: 'Ticha AI', desc: 'Get help with lesson planning', icon: <MessageSquare size={20} />, color: 'text-re-purple', path: '/ticha-ai' },
    { title: 'Ticha Avance', desc: 'Apply for teacher credit', icon: <Wallet size={20} />, color: 'text-re-orange', path: '/shule-avance' },
    { title: 'Ticha Deals', desc: 'Get discounts on goods & services', icon: <Gift size={20} />, color: 'text-amber-600', path: '/ticha-deals' },
    { title: 'English Club', desc: 'Professional development', icon: <BookOpen size={20} />, color: 'text-re-blue', path: '/english-club' },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-re-bg"><RefreshCw className="animate-spin text-re-orange" /></div>;
  }

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen">

      {/* HERO — same visual language as Login.jsx left panel (#000435, teacher.png, blobs, gradients) */}
      <section className="relative min-h-[260px] md:min-h-[300px] overflow-hidden bg-[#000435] text-white flex items-center">
        {/* Ambient blobs (match Login lp-blob) */}
        <div
          className="pointer-events-none absolute -left-20 -top-24 h-[420px] w-[420px] rounded-full blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 right-5 h-[320px] w-[320px] rounded-full blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%)' }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute left-[52%] top-[42%] h-40 w-40 rounded-full blur-[90px]"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }}
          aria-hidden
        />

        {/* Decorative dots — same spirit as Login lp-dots */}
        <div
          className="pointer-events-none absolute top-10 right-8 z-[2] hidden sm:grid grid-cols-5 gap-2 opacity-[0.18]"
          aria-hidden
        >
          {Array.from({ length: 25 }).map((_, i) => (
            <span key={i} className="h-[3px] w-[3px] rounded-full bg-amber-500" />
          ))}
        </div>

        {/* Teacher image + Login-style overlays (lp-img-overlay-1 / lp-img-overlay-2) */}
        <div className="absolute inset-0 z-[1]">
          <img
            src="/teacher.png"
            alt=""
            className="h-full w-full object-cover object-top block transition-transform duration-[8s] ease-in-out hover:scale-[1.04]"
          />
          <div
            className="absolute inset-0 z-[2]"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,4,53,0.45) 0%, rgba(0,4,53,0.1) 40%, rgba(0,4,53,0.75) 100%)',
            }}
          />
          <div
            className="absolute inset-0 z-[2]"
            style={{
              background:
                'linear-gradient(90deg, rgba(0,4,53,0.15) 0%, rgba(0,4,53,0.05) 60%, rgba(0,4,53,0) 100%)',
            }}
          />
        </div>

        {/* Secure pill — aligned with Login lp-pill */}
        <div className="absolute top-6 left-6 z-10 hidden md:flex items-center gap-2 rounded-full border border-amber-400/25 bg-[#000435]/55 px-4 py-1.5 text-[10px] font-semibold font-montserrat  text-[20px] tracking-[0.14em] text-white/90 backdrop-blur-md">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 shadow-[0_0_0_0_rgba(245,158,11,0.5)]" />
          ShuleTicha · Secure
        </div>

        <div className="relative z-10 w-full px-7 pb-10 pt-14 md:px-10 md:pb-12 md:pt-12 max-w-4xl">
          <h1 className="font-sans text-2xl md:text-3xl font-extrabold mb-2 tracking-tight drop-shadow-md">
            Welcome back, {teacher?.first_name || 'Teacher'}
          </h1>
          <p className="text-sm md:text-base font-semibold text-white/90 max-w-2xl drop-shadow">
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
            <div className="bg-white rounded-xl md:rounded-[24px] shadow-lg md:shadow-2xl border border-black/5 overflow-hidden grid grid-cols-2">
              {stats.map((stat, i) => {
                let displayLabel = stat.label;
                if (stat.label === 'Total Classes') displayLabel = 'Total classes Today';
                if (stat.label === 'Total Sessions') displayLabel = 'Total sessions today';

                return (
                  <div
                    key={i}
                    className={`p-5 flex flex-col items-center justify-center text-center border-gray-100 
                    ${i % 2 === 0 ? 'border-r' : ''} 
                    ${i < 2 ? 'border-b' : ''}`}
                  >
                    <span className="text-2xl md:text-3xl font-bold text-re-text">
                      {stat.value}
                    </span>
                    <p className="text-[16px] font-medium text-re-text-muted mt-1 opacity-60">
                      {displayLabel}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* TOOLS */}
            <h3 className="text-xs block md:hidden ml-1 mt-8 font-semibold text-re-text">
              Quick Access Tools
            </h3>

            <div className="bg-white rounded-xl md:rounded-[24px] shadow-lg md:shadow-sm border border-black/5 p-0 md:p-5 md:space-y-4">
              <h3 className="text-[16px] hidden md:block font-bold text-re-text opacity-80">
                Quick Access Tools
              </h3>

              <div className=" hidden md:grid grid-cols-1 divide-y-2 divide-gray-200 md:divide-y-0 md:grid-cols-2 gap-3">
                {quickTools.map((tool, i) => (
                  <div key={i} className="p-2.5 md:rounded-lg hover:bg-re-bg transition-all group">

                    <div className="space-y-2 flex items-center md:items-start gap-2 md:flex-col">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-re-bg shadow-inner ${tool.color}`} >
                        {React.cloneElement(tool.icon, { size: 16 })}
                      </div>
                      <div>
                        <h4 className="text-[20px] text-re-text">
                          {tool.title}
                        </h4>
                        <p className="text-[12px] hidden md:block text-re-text-muted pr-2">
                          {tool.desc}
                        </p>
                      </div>

                      <Link
                        to={tool.path}
                        className="flex items-center text-[14px] gap-1 text-re-orange font-bold text-[10px] group-hover:gap-2 transition-all ml-auto md:ml-0"
                      >
                        <span className='hidden md:block '> Open Tool </span>  <ChevronRight size={18} className='block md:hidden' /> <ArrowRight className='hidden md:block' size={11} />
                      </Link>
                    </div>

                  </div>
                ))}
              </div>
              <div className="md:hidden grid grid-cols-1">
                {quickTools.map((tool, i) => (
                  <Link to={tool.path} key={i} className={`hover:bg-re-bg cursor-pointer ${i == quickTools.length - 1 && 'rounded-b-xl'} ${i == 0 && 'rounded-t-xl'} transition-all group  `}>

                    <div className="space-y-2 flex items-center gap-3">
                      <div className={`pl-4 pt-3  flex  items-center justify-center  `} >
                        {React.cloneElement(tool.icon, { size: 25 })}
                      </div>
                      <div className={`flex py-3 pr-3  ${i !== 0 ? 'border-t-1' : ''} border-gray-300 flex-1`}>
                        <div>
                          <h4 className="text-xs font-medium">
                            {tool.title}
                          </h4>
                        </div>
                        <div
                          className="flex items-center gap-1 text-gray-500  font-semibold  ml-auto "
                        >
                          <ChevronRight size={18} />
                        </div>
                      </div>

                    </div>

                  </Link>
                ))}
              </div>
            </div>

            {/* QUICK LINKS - MOBILE ONLY */}
            <div className="md:hidden mt-8 px-1">
              <div className="bg-white border border-black/5 divide-x divide-gray-300 rounded-xl p-3 flex items-center justify-between shadow-xl">
                <Link to="/students" className="flex-1 flex flex-col items-center justify-center gap-1.5">
                  <Users size={25} className="text-re-orange/70" />
                  <span className='text-xs'> Student list</span>
                </Link>
                <Link to="/attendance" className="flex-1 flex flex-col items-center justify-center gap-1.5">
                  <CheckSquare size={25} className="text-re-orange/70" />
                  <span className='text-xs'> Attendance</span>
                </Link>
                <Link to="/payroll" className="flex-1 flex flex-col items-center justify-center gap-1.5">
                  <Banknote size={25} className="text-re-orange/70" />
                  <span className='text-xs'> My payroll</span>
                </Link>
              </div>
            </div>

          </div>

          {/* RIGHT Sidebar (Sticky Container) */}
          <div className="space-y-5 lg:sticky lg:top-20 h-fit">

            <h3 className="text-xs block md:hidden ml-1 mt-8 font-semibold text-re-text">
              Today's Schedule
            </h3>

            {/* Today's Schedule Card */}
            <div className="bg-white rounded-xl md:rounded-[24px] shadow-lg md:shadow-2xl border border-black/5 p-0 md:p-5">
              <div className="hidden md:flex items-center gap-2 mb-4">
                <span className="w-0.5 h-3 bg-re-purple rounded-full"></span>
                <h3 className="text-[16px] font-bold text-re-text opacity-70">Today's Schedule</h3>
              </div>

              {/* Desktop Schedule */}
              <div className="hidden md:block space-y-2">
                {schedule.map((item, i) => (
                  <div key={i} className={`flex items-start gap-3 p-2 rounded-lg transition-all
                    ${item.active ? 'bg-orange-50/50 border-b shadow-inner border-orange-100' : 'hover:bg-re-bg'}`}>

                    <span className={`text-[10px] font-bold min-w-[32px] pt-0.5
                      ${item.active ? 'text-re-orange' : 'text-re-text-muted opacity-40'}`}>
                      {item.time}
                    </span>

                    <div>
                      <p className="font-bold text-re-text text-xs leading-none">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-re-text-muted font-medium opacity-40 mt-1">
                        {item.room}
                      </p>
                    </div>
                  </div>
                ))}
                {schedule.length === 0 && (
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    
                    <p className="text-[13px] font-bold text-re-text-muted opacity-60">
                      No classes scheduled.
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile Schedule */}
              <div className="md:hidden grid grid-cols-1">
                {schedule.map((item, i) => (
                  <div key={i} className={`hover:bg-re-bg cursor-pointer ${i === schedule.length - 1 && 'rounded-b-xl'} ${i === 0 && 'rounded-t-xl'} transition-all group`}>
                    <div className="flex items-center gap-3">
                      <div className="pl-4 py-3 flex flex-col items-center justify-center min-w-[60px]">
                        <span className={`text-[10px] font-bold ${item.active ? 'text-re-orange' : 'text-re-text-muted'}`}>
                          {item.time}
                        </span>
                      </div>
                      <div className={`flex py-3 pr-3 ${i !== 0 ? 'border-t' : ''} border-gray-100 flex-1 items-center justify-between`}>
                        <div className="min-w-0">
                          <h4 className={`text-xs font-medium truncate ${item.active ? 'text-re-orange font-bold' : 'text-re-text'}`}>
                            {item.title}
                          </h4>
                          <p className="text-[10px] text-re-text-muted opacity-60 truncate">
                            {item.room}
                          </p>
                        </div>
                        <div className="text-gray-400 ml-2">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {schedule.length === 0 && (
                  <div className="p-10 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
                   
                    <p className="text-[16px]  text-re-text-muted">
                      No classes scheduled for today.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 md:p-0 md:mt-4 text-center border-t md:border-t-0 border-black/5">
                <Link to="/timetable" className="text-re-orange  text-[13px] font-bold text-[10px] hover:underline opacity-80 block w-full">
                  View Full Timetable
                </Link>
              </div>
            </div>

            {/* Quick Support Card (Rich Gradient + Texture) */}
            <Link
              to="/chat"
              className="relative hidden md:block rounded-[24px] p-6 text-white shadow-re-premium-purple overflow-hidden group cursor-pointer active:scale-95 transition-all bg-re-grad-purple"
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
                  <h4 className="font-bold text-xs opacity-90">Need Support?</h4>
                  <p className="text-[10px] text-white font-bold leading-snug mt-2 opacity-80">
                    Connect with a Babyeyi assistant for help with classes or records.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold group-hover:gap-2.5 transition-all">
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