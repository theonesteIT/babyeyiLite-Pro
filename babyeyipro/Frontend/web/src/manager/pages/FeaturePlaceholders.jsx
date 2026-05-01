import React from 'react';
import { Link } from 'react-router-dom';
import { h } from '../utils/href';
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
      <div className="relative w-full min-h-[140px] md:min-h-[200px] overflow-hidden bg-[#000435]">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 md:pt-12 pb-10 md:pb-16">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <span className="w-4 h-1 bg-white/40 rounded-full"></span>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Module Intelligence</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none mb-1 mt-1 uppercase">
              {feature} <span className="text-white/30">System</span>
            </h1>
            <p className="text-[10px] md:text-sm font-bold text-white/30 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">Phase 3: Integration & Professional Testing</p>
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
              <h2 className="text-xl md:text-2xl font-black text-re-text tracking-tight uppercase leading-tight">Advanced Module Implementation</h2>
              <p className="text-[11px] md:text-xs font-bold text-re-text-muted opacity-60 uppercase tracking-widest leading-relaxed">
                We are currently finalizing the intelligent backend integrations and automated grading logic for the <span className="text-re-purple">{feature}</span> module. Expect a professional, expert-tuned experience shortly.
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
              <p className="text-[7px] text-center font-black text-re-text-muted uppercase tracking-[0.3em] opacity-40">Phase 3: Security & Data Flow Testing</p>
            </div>

            {/* Roadmap / What's Coming */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl mb-12">
              {[
                { label: 'AI Analytics', detail: 'Behavioral Trend Maps' },
                { label: 'Cloud Sync', detail: 'Real-time Board Updates' },
                { label: 'Expert UI', detail: 'High-Density Mark Sheets' },
                { label: 'Security', detail: 'End-to-End Encryption' }
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
                to={h('/')}
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
