import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wallet, MessageSquare, BookOpen, Users, ArrowRight, RefreshCw,
  ClipboardList, Eye, Calendar, GraduationCap, IdCard, LineChart,
  SlidersHorizontal, FileBarChart, TrendingUp, BookMarked,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PORTAL } from '../config/portal';
import { h } from '../utils/href';

const Dashboard = () => {
  const { teacher, proAccessEffective } = useAuth();
  const [stats, setStats] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveOk, setLiveOk] = useState(false);

  const fetchDashboard = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/teacher-portal/dashboard');
      if (res.data.success) {
        setStats(res.data.data.stats || []);
        setSchedule(res.data.data.schedule || []);
        setLiveOk(true);
      } else {
        setLiveOk(false);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard', e);
      setLiveOk(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const quickTools = useMemo(() => {
    const proSuite = proAccessEffective ? [
      { title: 'Full Student Registry', desc: 'School enrollment toolkit and student identity registration.', icon: <IdCard size={18} />, accent: '#000435', path: '/student-records' },
      { title: 'Academic Progress', desc: 'Set learner status and marks by year and term.', icon: <LineChart size={18} />, accent: '#059669', path: '/progress' },
      { title: 'DOS Settings', desc: 'Default total marks for academic progress calculations.', icon: <SlidersHorizontal size={18} />, accent: '#7c3aed', path: '/dos-settings' },
      { title: 'DOS Reports', desc: 'Summaries by status and class; Excel and PDF exports.', icon: <FileBarChart size={18} />, accent: '#2563eb', path: '/reports' },
    ] : [];

    const base = [
      { title: 'Staff & Courses', desc: 'Add teachers, subjects, and build the school timetable.', icon: <GraduationCap size={18} />, accent: '#FEBF10', path: '/academic-setup' },
      { title: 'View Marks', desc: 'Inspect performance by class and subject across the school.', icon: <Eye size={18} />, accent: '#059669', path: '/marks/view' },
      { title: 'Record Marks', desc: 'Enter or align assessments with gradebook columns.', icon: <ClipboardList size={18} />, accent: '#000435', path: '/marks/record' },
      { title: 'Timetable', desc: 'See all classes and periods scheduled for today.', icon: <Calendar size={18} />, accent: '#2563eb', path: '/timetable' },
      { title: 'Student Registry', desc: 'Rosters, codes, and enrollment context.', icon: <Users size={18} />, accent: '#7c3aed', path: '/students' },
      { title: 'TichaAI', desc: 'Draft letters, summaries, and academic notes.', icon: <MessageSquare size={18} />, accent: '#000435', path: '/ticha-ai' },
      { title: 'Shule Avance', desc: 'Staff financial services portal.', icon: <Wallet size={18} />, accent: '#FEBF10', path: '/shule-avance' },
      { title: 'English Club', desc: 'Professional reading and language resources.', icon: <BookOpen size={18} />, accent: '#2563eb', path: '/english-club' },
    ];
    return [...proSuite, ...base];
  }, [proAccessEffective]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-re-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#000435]/20 border-t-[#000435] animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#000435]/50">Loading Dashboard…</p>
        </div>
      </div>
    );
  }

  const heroMeta = `${new Date().getFullYear()} · ${new Date().toLocaleString(undefined, { month: 'long' })} · ${PORTAL.brandLine}`;

  return (
    <div className="relative w-full bg-re-bg min-h-screen animate-in fade-in duration-700" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Hero (teacher-portal style: full-bleed photo + amber wash) ── */}
      <section className="relative p-7 bg-amber-500 md:p-10 text-white overflow-hidden min-h-[230px] md:min-h-[260px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img src="/teacher.png" alt="" className="w-full h-full object-cover object-center shadow-2xl" />
          {/* Warm amber tint + depth for readable white type */}
          
        </div>

        <div className="relative z-10 max-w-5xl w-full">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-3xl">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2 drop-shadow-sm">
                Welcome back, {teacher?.first_name || 'Director'} 
              </h1>
              
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#FEF3C7]/90">
                  {heroMeta}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex bg-black/25 backdrop-blur-md rounded-xl border border-white/25 px-3 py-2">
                <span className="text-[10px] font-black capitalize tracking-widest text-white/95">
                  {refreshing ? 'Updating…' : liveOk ? 'Live data' : 'Offline'}
                </span>
              </div>
              <button
                type="button"
                onClick={fetchDashboard}
                disabled={refreshing}
                className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-black/25 w-11 h-11 text-white backdrop-blur-md hover:bg-white/15 transition-all active:scale-95 disabled:opacity-60"
                title="Refresh"
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT: Stats + Quick Tools ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Stats Grid */}
            {stats.length > 0 && (
              <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden grid grid-cols-2 sm:grid-cols-4">
                {stats.map((stat, i) => (
                  <div
                    key={i}
                    className={`p-5 flex flex-col items-center justify-center text-center
                      ${i % 2 === 0 && i < stats.length - 1 ? 'border-r border-gray-100' : ''}
                      ${i < 2 && stats.length > 2 ? 'border-b border-gray-100 sm:border-b-0' : ''}
                      ${i < stats.length - 2 ? 'sm:border-r border-gray-100' : ''}
                      hover:bg-re-bg/40 transition-all group`}
                  >
                    <span className="text-2xl font-black text-[#000435] tracking-tighter group-hover:text-[#FEBF10] transition-colors">
                      {stat.value}
                    </span>
                    <p className="text-[9px] font-black text-[#000435] uppercase tracking-[0.22em] mt-1 opacity-50">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Tools */}
            <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-re-bg/60 flex items-center gap-2">
                <TrendingUp size={15} className="text-[#000435]" />
                <h3 className="text-[10px] font-black text-[#000435] capitalize tracking-[0.22em]">Quick Access Tools</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickTools.map((tool, i) => (
                  <Link
                    to={h(tool.path)}
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-re-bg/40 border border-black/5 hover:bg-white hover:border-[#000435]/10 hover:shadow-sm transition-all group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-105"
                      style={{ background: tool.accent + '18', color: tool.accent }}
                    >
                      {tool.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[11px] font-black text-[#000435] tracking-tight truncate">{tool.title}</h4>
                      <p className="text-[9px] font-bold text-[#000435]/50 leading-snug mt-0.5 truncate">{tool.desc}</p>
                    </div>
                    <ArrowRight size={13} className="text-[#000435]/30 group-hover:text-[#000435] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT Sidebar ── */}
          <div className="space-y-5 lg:sticky lg:top-5 h-fit">

            {/* Today's Schedule */}
            <div className="bg-white rounded-[24px] border border-black/5 overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-re-bg/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-[#000435]" />
                  <h3 className="text-[10px] font-black text-[#000435] capitalize tracking-[0.22em]">Today's Timetable</h3>
                </div>
                <span className="text-[9px] font-black capitalize tracking-widest text-[#000435]/50">Live</span>
              </div>
              <div className="p-4 space-y-1.5">
                {schedule.length === 0 ? (
                  <p className="text-[10px] font-bold text-[#000435]/40 capitalize tracking-widest py-4 text-center">No classes today</p>
                ) : (
                  schedule.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all
                        ${item.active ? 'bg-[#000435]/5 border border-[#FEBF10]/30' : 'hover:bg-re-bg/60'}`}
                    >
                      <span className={`text-[9px] font-black min-w-[36px] pt-0.5 tabular-nums
                        ${item.active ? 'text-[#FEBF10]' : 'text-[#000435]/30'}`}>
                        {item.time}
                      </span>
                      <div className="min-w-0">
                        <p className="font-black text-[#000435] text-[11px] leading-tight tracking-tight truncate">
                          {item.subject || item.title}
                        </p>
                        <p className="text-[9px] text-[#000435]/40 font-bold uppercase tracking-widest mt-0.5 truncate">
                          {[item.group, item.room].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      {item.active && (
                        <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-[#FEBF10] animate-pulse mt-1" />
                      )}
                    </div>
                  ))
                )}
              </div>
              <div className="px-5 py-3 border-t border-black/5">
                <Link
                  to={h('/timetable')}
                  className="flex items-center justify-center gap-1.5 text-[9px] font-black capitalize tracking-widest text-[#000435]/60 hover:text-[#000435] transition-colors"
                >
                  View full timetable <ArrowRight size={11} />
                </Link>
              </div>
            </div>

            {/* Academic Pulse CTA */}
            <div className="relative rounded-[24px] p-6 text-white overflow-hidden group active:scale-[0.99] transition-all" style={{ background: '#000435' }}>
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent" />
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-[#FEBF10]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <Link to={h('/marks/view')} className="relative z-10 flex flex-col gap-4 block">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(254,191,16,0.15)', border: '1px solid rgba(254,191,16,0.3)' }}>
                  <BookMarked size={18} className="text-[#FEBF10]" />
                </div>
                <div>
                  <h4 className="font-black text-xs tracking-widest uppercase leading-none text-white/90">Academic Pulse</h4>
                  <p className="text-[10px] text-white/60 font-bold leading-snug mt-2">
                    Open school-wide marks to spot classes that need follow-up with teachers.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#FEBF10] group-hover:gap-2.5 transition-all">
                  View Marks <ArrowRight size={12} />
                </div>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;