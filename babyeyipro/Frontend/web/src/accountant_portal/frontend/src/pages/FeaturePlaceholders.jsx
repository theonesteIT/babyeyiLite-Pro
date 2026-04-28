import React from 'react';
import { Link } from 'react-router-dom';
import { PORTAL } from '../config/portal';
import {
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Zap,
  ShieldCheck,
  Cpu
} from 'lucide-react';

const FeaturePlaceholders = ({ feature = 'Module', icon = '🚀' }) => {
  return (
    <div className="relative w-full bg-re-bg min-h-[85vh]">
      {/* ── High-Fidelity Hero Section ── */}
      <div className="relative w-full min-h-[140px] md:min-h-[200px] overflow-hidden">
        <div className="absolute inset-0 bg-re-purple/70 z-10 backdrop-blur-[2px]"></div>
        <img src={PORTAL.heroImage} alt="" className="absolute inset-0 w-full h-full object-cover scale-105 grayscale" />

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 md:pt-12 pb-10 md:pb-16">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="w-4 h-1 bg-white/40 rounded-full"></span>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Conduct portal</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none mb-1 mt-1 uppercase">
              {feature} <span className="text-white/30">System</span>
            </h1>
            <p className="text-[10px] md:text-sm font-bold text-white/30 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">{PORTAL.brandLine} — module in progress</p>
          </div>
        </div>
      </div>

      {/* ── Overlapping Card ── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden flex flex-col items-center p-8 md:p-12 text-center">

            {/* Aesthetic Status Frame */}
            <div className="relative mb-8">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-re-bg rounded-[32px] flex items-center justify-center text-4xl shadow-re-soft relative z-10">
                {icon}
              </div>
              <div className="absolute -top-3 -right-3 w-8 h-8 bg-re-grad-orange rounded-xl flex items-center justify-center text-white shadow-re-glow animate-pulse">
                <Zap size={14} />
              </div>
              <div className="absolute -inset-4 bg-re-purple/5 rounded-full blur-2xl -z-10"></div>
            </div>

            <div className="space-y-2 mb-10 max-w-xl">
              <h2 className="text-xl md:text-2xl font-black text-re-text tracking-tight uppercase leading-tight">Coming soon</h2>
              <p className="text-[11px] md:text-xs font-bold text-re-text-muted opacity-80 tracking-wide leading-relaxed">
                The <span className="text-re-purple font-black">{feature}</span> area is not wired up for the conduct portal yet. Core tools live on the dashboard, students, attendance, and conduct overview.
              </p>
            </div>

            {/* Development Progress Rail */}
            <div className="w-full max-w-md bg-re-bg rounded-2xl p-6 border border-black/5 space-y-4 mb-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu size={12} className="text-re-purple opacity-40" />
                  <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em]">Deployment Readiness</p>
                </div>
                <p className="text-[10px] font-black text-re-purple tracking-tighter">78% COMPLETE</p>
              </div>
              <div className="w-full h-2 bg-white rounded-full overflow-hidden shadow-inner flex">
                <div className="h-full bg-re-grad-purple w-[78%] shadow-re-premium-purple"></div>
              </div>
              <p className="text-[7px] text-center font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Planned for a future release</p>
            </div>

            {/* Roadmap / What's Coming */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mb-12">
              {[
                { label: 'Case log', detail: 'Structured discipline records' },
                { label: 'Alerts', detail: 'At-risk attendance signals' },
                { label: 'Reports', detail: 'Parent communication exports' },
                { label: 'Security', detail: 'Role-based access' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-re-bg/30 border border-black/5 text-left group hover:bg-white hover:border-re-purple/10 transition-all cursor-default">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-re-purple shadow-sm border border-black/5 shrink-0 group-hover:bg-re-purple group-hover:text-white transition-colors">
                    <ShieldCheck size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-re-text uppercase tracking-tight">{item.label}</p>
                    <p className="text-[7px] font-black text-re-text-muted uppercase opacity-40 tracking-wider leading-none mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center">
              <Link
                to="/"
                className="flex items-center gap-2 px-10 py-4 bg-re-grad-purple rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-re-premium-purple hover:scale-[1.02] active:scale-95 transition-all"
              >
                <ArrowLeft size={14} />
                Back to Dashboard
              </Link>
              <button className="flex items-center gap-2 text-[9px] font-black text-re-text-muted hover:text-re-purple uppercase tracking-widest transition-colors">
                Read Roadmap
                <ChevronRight size={12} />
              </button>
            </div>

          </div>

          <p className="text-center text-[8px] text-re-text-muted mt-8 font-black uppercase tracking-[0.3em] opacity-30 italic">Developed & Engineered by Babyeyi Intelligence Systems</p>
        </div>
      </div>
    </div>
  );
};

export default FeaturePlaceholders;
