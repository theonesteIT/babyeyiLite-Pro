import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * Head of discipline — settings and summary entry point.
 * Backend: GET /api/discipline/settings, /api/discipline/students-summary (HOD role).
 */
export default function ConductOverview() {
  const [totalMarks, setTotalMarks] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const setRes = await api.get('/discipline/settings');
      if (setRes.data?.success && setRes.data.data?.total_marks != null) {
        setTotalMarks(Number(setRes.data.data.total_marks));
      } else {
        setTotalMarks(null);
        setError('Could not read conduct settings for your school.');
      }
    } catch (e) {
      setTotalMarks(null);
      setError(
        e.response?.data?.message ||
          'Could not load conduct settings. Your account needs Head of Discipline (or school manager) access.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="animate-in fade-in duration-700 bg-re-bg min-h-screen pb-12">
      <div className="relative w-full min-h-[220px] overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/75 z-10 backdrop-blur-[2px]" />
        <img
          src={import.meta.env.BASE_URL + "teacher.jpg"}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-14 pb-16">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Shield size={26} className="text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/90">
                Conduct &amp; discipline
              </p>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight">Overview</h1>
              <p className="text-xs md:text-sm text-white/70 font-bold mt-1 max-w-xl">
                School conduct scale and learner summaries. Use Students and attendance alongside this for full context.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 -mt-10 relative z-30">
        <div className="bg-white rounded-2xl border border-black/5 shadow-xl p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-sm font-black text-re-text uppercase tracking-widest">At a glance</h2>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-black/10 text-xs font-black uppercase tracking-widest hover:bg-re-bg"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              <AlertCircle className="shrink-0 w-5 h-5" />
              <p className="font-bold leading-snug">{error}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-black/5 bg-re-bg/40 p-5 shadow-inner">
              <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted mb-1">
                Conduct scale (school)
              </p>
              <p className="text-2xl font-black text-re-text">
                {loading ? '…' : totalMarks != null ? `${totalMarks} marks` : '—'}
              </p>
              <p className="text-[10px] font-bold text-re-text-muted mt-2 leading-snug">
                Total marks on your school conduct scale before a learner reaches the floor. Full per-learner breakdowns
                use academic year and term (we can add filters here next).
              </p>
            </div>
            <div className="rounded-xl border border-black/5 bg-re-bg/40 p-5 shadow-inner">
              <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted mb-1">
                Responsibilities
              </p>
              <ul className="text-[11px] font-bold text-re-text/90 mt-2 space-y-2 list-disc list-inside leading-relaxed">
                <li>Monitor attendance patterns with class teachers.</li>
                <li>Use marks views to correlate behaviour with academic risk.</li>
                <li>Record discipline cases via school workflow (API: /api/discipline/cases).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
