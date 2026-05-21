import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

import {
  Wallet,
  MessageSquare,
  BookOpen,
  Users,
  ArrowRight,
  RefreshCw,
  ClipboardList,
  Eye,
  Calendar,
  GraduationCap,
  IdCard,
  LineChart,
  SlidersHorizontal,
  FileBarChart,
  TrendingUp,
  BookMarked,
  LayoutDashboard,
  ShoppingBag,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { PORTAL } from '../config/portal';
import { h } from '../utils/href';
import DosOchreHero from '../components/DosOchreHero';
import { liteHeroUserSubtitle } from '../../shared/liteHeroUtils';

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

  useEffect(() => {
    fetchDashboard();
  }, []);

  const quickTools = useMemo(() => {
    const proSuite = proAccessEffective
      ? [
          {
            title: 'Full Student Registry',
            desc: 'School enrollment toolkit and student identity registration.',
            icon: <IdCard size={18} />,
            accent: '#000435',
            path: '/student-records',
          },
          {
            title: 'Academic Progress',
            desc: 'Set learner status and marks by year and term.',
            icon: <LineChart size={18} />,
            accent: '#059669',
            path: '/progress',
          },
          {
            title: 'DOS Settings',
            desc: 'Default total marks for academic progress calculations.',
            icon: <SlidersHorizontal size={18} />,
            accent: '#7c3aed',
            path: '/dos-settings',
          },
          {
            title: 'DOS Reports',
            desc: 'Summaries by status and class; Excel and PDF exports.',
            icon: <FileBarChart size={18} />,
            accent: '#2563eb',
            path: '/reports',
          },
        ]
      : [];

    const base = [
      {
        title: 'Staff & Courses',
        desc: 'Add teachers, subjects, and build the school timetable.',
        icon: <GraduationCap size={18} />,
        accent: '#FEBF10',
        path: '/academic-setup',
      },
      {
        title: 'View Marks',
        desc: 'Inspect performance by class and subject across the school.',
        icon: <Eye size={18} />,
        accent: '#059669',
        path: '/marks/view',
      },
      {
        title: 'Record Marks',
        desc: 'Enter or align assessments with gradebook columns.',
        icon: <ClipboardList size={18} />,
        accent: '#000435',
        path: '/marks/record',
      },
      {
        title: 'Timetable',
        desc: 'See all classes and periods scheduled for today.',
        icon: <Calendar size={18} />,
        accent: '#2563eb',
        path: '/timetable',
      },
      {
        title: 'Student Registry',
        desc: 'Rosters, codes, and enrollment context.',
        icon: <Users size={18} />,
        accent: '#7c3aed',
        path: '/students',
      },
      {
        title: 'TichaAI',
        desc: 'Draft letters, summaries, and academic notes.',
        icon: <MessageSquare size={18} />,
        accent: '#000435',
        path: '/ticha-ai',
      },
      {
        title: 'Shule Avance',
        desc: 'Staff financial services portal.',
        icon: <Wallet size={18} />,
        accent: '#FEBF10',
        path: '/shule-avance',
      },
      {
        title: 'Ticha Deals',
        desc: 'Browse staff deals and payroll-friendly purchases.',
        icon: <ShoppingBag size={18} />,
        accent: '#f59e0b',
        path: '/ticha-deals',
      },
      {
        title: 'English Club',
        desc: 'Professional reading and language resources.',
        icon: <BookOpen size={18} />,
        accent: '#2563eb',
        path: '/english-club',
      },
    ];
    return [...proSuite, ...base];
  }, [proAccessEffective]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#000435]/20 border-t-[#000435] animate-spin" />
          <p className="text-sm font-medium text-re-text-muted">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 bg-white min-h-full pb-24 lg:pb-10 font-sans">
      <DosOchreHero
        eyebrow="School operations"
        title="DOS dashboard"
        subtitle={liteHeroUserSubtitle(teacher) || PORTAL.brandLine}
        icon={LayoutDashboard}
        rightSlot={
          <>
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/15 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white">
              {refreshing ? 'Updating…' : liveOk ? 'Live data' : 'Offline'}
            </div>
            <button
              type="button"
              onClick={fetchDashboard}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 w-11 h-11 text-white hover:bg-white/20 transition-all active:scale-95 disabled:opacity-60"
              title="Refresh"
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 space-y-5 pb-10">
        {stats.length > 0 && (
          <div className="bg-white rounded-t-[32px] shadow-sm border border-black/10 overflow-hidden grid grid-cols-2 sm:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={`p-5 flex flex-col items-center justify-center text-center min-h-[6.5rem] hover:bg-slate-50 transition-colors
                  ${i % 2 === 0 && i < stats.length - 1 ? 'border-r border-black/5' : ''}
                  ${i < 2 && stats.length > 2 ? 'border-b border-black/5 sm:border-b-0' : ''}
                  ${i < stats.length - 2 ? 'sm:border-r border-black/5' : ''}`}
              >
                <span className="text-xl sm:text-2xl font-semibold text-[#000435] tabular-nums tracking-tight">{stat.value}</span>
                <p className="text-[8px] sm:text-[9px] font-medium text-re-text-muted uppercase tracking-wider mt-1 opacity-70">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-[24px] border border-black/10 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-slate-50 flex items-center gap-2">
                <TrendingUp size={15} className="text-[#000435]" />
                <h3 className="text-xs font-semibold text-[#000435] tracking-tight">Quick access tools</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quickTools.map((tool, i) => (
                  <Link
                    to={h(tool.path)}
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 border border-black/5 hover:bg-white hover:border-[#000435]/15 hover:shadow-sm transition-all group"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: `${tool.accent}18`, color: tool.accent }}
                    >
                      {tool.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[11px] font-medium text-[#000435] tracking-tight truncate">{tool.title}</h4>
                      <p className="text-[9px] font-normal text-[#000435]/55 leading-snug mt-0.5 line-clamp-2">{tool.desc}</p>
                    </div>
                    <ArrowRight
                      size={13}
                      className="text-[#000435]/25 group-hover:text-[#000435] group-hover:translate-x-0.5 transition-all shrink-0"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-[24px] border border-black/10 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar size={15} className="text-[#000435]" />
                  <h3 className="text-xs font-semibold text-[#000435] tracking-tight">Today&apos;s timetable</h3>
                </div>
                <span className="text-[9px] font-medium text-[#000435]/50 uppercase tracking-wide">Live</span>
              </div>
              <div className="p-4 space-y-1.5">
                {schedule.length === 0 ? (
                  <p className="text-[11px] font-medium text-[#000435]/45 py-4 text-center">No classes today</p>
                ) : (
                  schedule.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-all ${
                        item.active ? 'bg-[#000435]/5 border border-amber-400/30' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`text-[9px] font-medium min-w-[36px] pt-0.5 tabular-nums ${
                          item.active ? 'text-amber-500' : 'text-[#000435]/35'
                        }`}
                      >
                        {item.time}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#000435] text-[11px] leading-tight truncate">
                          {item.subject || item.title}
                        </p>
                        <p className="text-[9px] text-[#000435]/45 font-normal mt-0.5 truncate">
                          {[item.group, item.room].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      {item.active && <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mt-1" />}
                    </div>
                  ))
                )}
              </div>
              <div className="px-5 py-3 border-t border-black/5">
                <Link
                  to={h('/timetable')}
                  className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-[#000435]/60 hover:text-[#000435] transition-colors"
                >
                  View full timetable <ArrowRight size={11} />
                </Link>
              </div>
            </div>

            <div className="relative rounded-[24px] p-6 text-white overflow-hidden border border-[#000435]/10 shadow-sm bg-[#000435]">
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent pointer-events-none" />
              <Link to={h('/marks/view')} className="relative z-10 flex flex-col gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-amber-400/30 bg-amber-400/15">
                  <BookMarked size={18} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="font-medium text-sm text-white/95 tracking-tight">Academic pulse</h4>
                  <p className="text-[10px] text-white/65 font-normal leading-snug mt-1.5">
                    Open school-wide marks to spot classes that need follow-up with teachers.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-amber-400">
                  View marks <ArrowRight size={12} />
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
