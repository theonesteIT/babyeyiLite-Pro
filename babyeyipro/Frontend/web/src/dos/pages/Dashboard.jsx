import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  RefreshCw,
  Calendar,
  BookMarked,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Radio,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import api from '../services/api';
import { h } from '../utils/href';
import TeacherOrangeHero from '../../shared/components/TeacherOrangeHero';
import QuickAssessToolsDropdown from '../components/QuickAssessToolsDropdown';

const AMBER = '#c87800';
const NAVY = '#000435';

const CHART_TOOLTIP = {
  contentStyle: {
    borderRadius: 12,
    border: '1px solid rgba(0,4,53,0.08)',
    fontSize: 11,
    fontWeight: 600,
  },
};

function ChartEmpty({ message }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-[11px] font-medium text-[#000435]/40">
      {message}
    </div>
  );
}

function AnalyticsPanel({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-[20px] border border-black/10 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5 bg-slate-50/80 flex items-center gap-2">
        {Icon && <Icon size={14} className="text-[#000435]" />}
        <h4 className="text-[11px] font-semibold text-[#000435] tracking-tight">{title}</h4>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

const Dashboard = () => {
  const { teacher, proAccessEffective } = useAuth();
  const [stats, setStats] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [terms, setTerms] = useState([]);
  const [term, setTerm] = useState('');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveOk, setLiveOk] = useState(false);

  const fetchDashboard = useCallback(async (termParam) => {
    if (!termParam) return;
    setRefreshing(true);
    try {
      const [statsRes, timetableRes, insightsRes] = await Promise.all([
        api.get('/dos/dashboard/stats'),
        api.get('/dos/dashboard/today-timetable', { params: { term: termParam } }),
        api.get('/dos/dashboard/academic-insights', { params: { term: termParam } }),
      ]);

      if (statsRes.data?.success) {
        const d = statsRes.data.data;
        setStats([
          { label: 'Total Students', value: String(d.totalStudents ?? 0) },
          { label: 'Teaching Staff', value: String(d.totalTeachingStaff ?? 0) },
          { label: 'Today Attendance', value: `${d.globalAttendance ?? 0}%` },
          { label: 'Institutional GPA', value: `${d.institutionalGPA ?? 0}%` },
        ]);
      }

      if (timetableRes.data?.success) {
        setSchedule(timetableRes.data.data.schedule || []);
      }

      if (insightsRes.data?.success) {
        setInsights(insightsRes.data.data);
      }

      setLiveOk(Boolean(statsRes.data?.success));
    } catch (e) {
      console.error('Failed to fetch dashboard', e);
      setLiveOk(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    api.get('/dos/operations-center/filters')
      .then((res) => {
        if (!res.data?.success) return;
        const fd = res.data.data;
        setTerms(fd.terms || []);
        const initial = fd.selected?.term || fd.current?.term || fd.terms?.[0] || '';
        setTerm(initial);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!term) {
      setLoading(false);
      return;
    }
    fetchDashboard(term);
  }, [term, fetchDashboard]);

  const bestClasses = insights?.bestPerformingClasses || [];
  const worstClasses = insights?.worstPerformingClasses || [];
  const subjectPerf = insights?.subjectPerformance || [];
  const catTrends = insights?.catTrends || [];
  const hasMarks = insights?.hasMarksData;

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
      <TeacherOrangeHero
        title={`Welcome back, ${teacher?.first_name || 'Director'}`}
        subtitle="Ready to inspire your students today?"
        rightSlot={
          <>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-black/25 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-white">
              {refreshing ? 'Updating…' : liveOk ? 'Live data' : 'Offline'}
            </div>
            <button
              type="button"
              onClick={() => fetchDashboard(term)}
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

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 -mt-10 pt-2 relative z-20 space-y-5 pb-10">
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <QuickAssessToolsDropdown proAccessEffective={proAccessEffective} />
              {term && (
                <span className="text-[10px] font-medium text-[#000435]/45 uppercase tracking-wide">
                  Analytics · {term}
                </span>
              )}
            </div>

            <div className="bg-white rounded-[24px] border border-black/10 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-slate-50 flex items-center gap-2">
                <BarChart3 size={15} className="text-[#000435]" />
                <h3 className="text-xs font-semibold text-[#000435] tracking-tight">Student Performance Analytics</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnalyticsPanel title="Best Performing Classes" icon={TrendingUp}>
                  {!hasMarks || bestClasses.length === 0 ? (
                    <ChartEmpty message="No marks data for this term yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={bestClasses} layout="vertical" margin={{ left: 4, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9 }} />
                        <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v}%`, 'Average']} />
                        <Bar dataKey="avg_pct" fill="#059669" radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </AnalyticsPanel>

                <AnalyticsPanel title="Worst Performing Classes" icon={TrendingDown}>
                  {!hasMarks || worstClasses.length === 0 ? (
                    <ChartEmpty message="No marks data for this term yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={worstClasses} layout="vertical" margin={{ left: 4, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 9 }} />
                        <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v}%`, 'Average']} />
                        <Bar dataKey="avg_pct" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </AnalyticsPanel>

                <AnalyticsPanel title="Subject Performance Analysis" icon={BarChart3}>
                  {!hasMarks || subjectPerf.length === 0 ? (
                    <ChartEmpty message="No subject marks for this term yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={subjectPerf} margin={{ bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={0} angle={-25} textAnchor="end" height={52} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v}%`, 'Average']} />
                        <Bar dataKey="avg_pct" radius={[4, 4, 0, 0]} barSize={18}>
                          {subjectPerf.map((_, i) => (
                            <Cell key={i} fill={i % 2 === 0 ? NAVY : AMBER} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </AnalyticsPanel>

                <AnalyticsPanel title="Continuous Assessment Trends" icon={Activity}>
                  {catTrends.length === 0 ? (
                    <ChartEmpty message="No assessment trend data yet" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={catTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Tooltip {...CHART_TOOLTIP} formatter={(v) => [`${v}%`, 'School avg']} />
                        <Line
                          type="monotone"
                          dataKey="avg_pct"
                          stroke={NAVY}
                          strokeWidth={2.5}
                          dot={{ fill: AMBER, r: 4, strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: AMBER }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </AnalyticsPanel>
              </div>
            </div>
          </div>

          <div className="space-y-5 lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-[24px] border border-black/10 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-black/5 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar size={15} className="text-[#000435] shrink-0" />
                  <h3 className="text-xs font-semibold text-[#000435] tracking-tight truncate">Today&apos;s timetable</h3>
                </div>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="dos-filter-input text-[10px] font-semibold py-1.5 pl-2 pr-7 max-w-[120px] shrink-0"
                  aria-label="Select term"
                >
                  {terms.length === 0 && <option value="">Term</option>}
                  {terms.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="p-4 space-y-1.5 max-h-[320px] overflow-y-auto">
                {schedule.length === 0 ? (
                  <p className="text-[11px] font-medium text-[#000435]/45 py-4 text-center">
                    No classes today{term ? ` for ${term}` : ''}
                  </p>
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
                          {item.subject}
                        </p>
                        <p className="text-[9px] text-[#000435]/45 font-normal mt-0.5 truncate">
                          {[item.class_name, item.room].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      {item.active && <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse mt-1" />}
                    </div>
                  ))
                )}
              </div>
              <div className="px-5 py-3 border-t border-black/5">
                <Link
                  to={h('/operations-center')}
                  className="flex items-center justify-center gap-2 text-[10px] font-semibold text-white rounded-xl py-2.5 transition-all hover:brightness-105"
                  style={{ background: NAVY }}
                >
                  <Radio size={12} style={{ color: AMBER }} />
                  View live monitoring
                  <ArrowRight size={11} />
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
