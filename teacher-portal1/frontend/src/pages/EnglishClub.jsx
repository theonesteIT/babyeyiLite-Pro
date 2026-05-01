import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BookOpen,
  Search,
  Filter,
  Play,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { teacherInnerSearchCls } from '../utils/teacherGradebookUi';

const EnglishClub = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const url = filter === 'all' ? '/teacher-portal/english-club/resources' : `/teacher-portal/english-club/resources?type=${filter}`;
        const res = await api.get(url);
        if (res.data.success) {
          setResources(res.data.resources);
        }
      } catch {
        console.error('Could not load English Club resources.');
      } finally {
        setLoading(false);
      }
    };

    fetchResources();
  }, [filter]);

  const filteredResources = resources.filter(res =>
    res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (res.description && res.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative w-full bg-re-bg min-h-screen">
      {/* ── High-Fidelity Hero Section ── */}
      <div className="relative w-full min-h-[140px] md:min-h-[200px] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,17,31,0.92),rgba(18,35,58,0.84),rgba(33,49,74,0.78))] z-10 backdrop-blur-[2px]"></div>
        <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.20),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,184,0,0.10),transparent_24%)]"></div>
        <img src="/teacher.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover scale-105 grayscale" />

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 md:pt-12 pb-10 md:pb-16">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-1 bg-re-orange rounded-full"></span>
              <p className="text-[9px] font-black text-white/65 uppercase tracking-[0.3em]">Professional Excellence</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none mb-1 mt-1">English <span className="text-re-orange">Club</span></h1>
            <p className="text-[10px] md:text-sm font-bold text-white/55 max-w-lg leading-relaxed uppercase tracking-widest italic">Sharpening Pedagogy through Linguistic Mastery</p>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* ── Main Gallery (Left Column) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Search & Filters Bar */}
            <div className="bg-white rounded-[20px] shadow-sm border border-black/5 overflow-hidden">
              <div className="px-4 py-4 lg:px-3  border-b border-black/5 flex flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-4 lg:gap-2 bg-re-bg/20">
                <div className="flex items-center gap-3 lg:gap-2 w-full lg:w-auto lg:shrink-0">
                  <button
                    onClick={() => setShowMobileFilters(!showMobileFilters)}
                    className="lg:hidden w-full flex justify-between items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <Filter size={14} className="text-re-orange" /> show filters
                    </div>
                    {showMobileFilters ? <ChevronUp size={14} className="text-re-orange" /> : <ChevronDown size={14} />}
                  </button>
                </div>

                <div className={`${showMobileFilters ? 'flex' : 'hidden lg:flex'} flex-col lg:flex-row lg:flex-nowrap lg:items-center gap-3 lg:gap-2 w-full lg:flex-1 lg:min-w-0 animate-in slide-in-from-top-2 duration-300`}>
                  <div className="relative w-full lg:flex-1 lg:min-w-[7rem] lg:max-w-[14rem] group">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-re-orange transition-colors lg:hidden z-[1] pointer-events-none" />
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-re-text-muted/50 group-focus-within:text-re-orange transition-colors hidden lg:block z-[1] pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search resources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`${teacherInnerSearchCls} !pl-10 lg:!pl-8`}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 w-full lg:w-auto lg:items-center lg:shrink-0">
                    {['all', 'video', 'pdf', 'quiz'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`h-10 lg:h-8 px-3 rounded-xl lg:rounded-lg font-black text-[9px] lg:text-[7px] uppercase tracking-widest transition-all whitespace-nowrap border ${filter === f ? 'bg-re-orange text-white border-re-orange shadow-re-glow' : 'bg-white border-black/[0.07] text-re-text-muted hover:bg-re-bg hover:text-re-text'}`}
                      >
                        {f === 'all' ? 'All Resources' : f + 's'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Resource Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-white rounded-[24px] h-64 border border-black/5 animate-pulse flex flex-col p-4 space-y-4">
                    <div className="h-32 bg-re-bg rounded-xl"></div>
                    <div className="h-4 bg-re-bg rounded-full w-2/3"></div>
                    <div className="h-3 bg-re-bg rounded-full w-1/2"></div>
                  </div>
                ))
              ) : filteredResources.length > 0 ? (
                filteredResources.map((res) => (
                  <div key={res.id} className="bg-white rounded-[24px] border border-black/5 flex flex-col group overflow-hidden hover:shadow-re-deep transition-all relative">
                    {/* Thumbnail Frame */}
                    <div className="h-36 relative bg-re-bg overflow-hidden">
                      {res.thumbnail_url ? (
                        <img src={res.thumbnail_url} alt={res.title} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                          <BookOpen size={64} className="text-re-text" />
                        </div>
                      )}

                      {/* Micro Label Type */}
                      <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-md shadow-sm text-[7px] font-black uppercase tracking-widest text-re-text-muted">
                        {res.content_type}
                      </div>

                      {res.content_type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-re-orange shadow-lg">
                            <Play fill="currentColor" size={16} className="translate-x-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Intel */}
                    <div className="p-5 flex flex-col flex-1 bg-white">
                      <div className="flex-1 space-y-1.5 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-1 h-3 bg-re-orange rounded-full"></span>
                          <p className="text-[8px] font-black text-re-orange uppercase tracking-widest opacity-60">Verified Content</p>
                        </div>
                        <h4 className="text-sm font-black text-re-text tracking-tight uppercase leading-tight line-clamp-1">{res.title}</h4>
                        <p className="text-[10px] text-re-text-muted font-bold leading-relaxed line-clamp-2 opacity-60 italic">{res.description}</p>
                      </div>

                      <a
                        href={res.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-re-bg group-hover:bg-re-grad-orange rounded-xl text-re-text group-hover:text-white font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                      >
                        Examine Resource
                        <ChevronRight size={12} />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center space-y-5 bg-white rounded-[24px] border border-black/5 flex flex-col items-center">
                  <img src="/undraw_no-data_ig65 (1).svg" alt="No data" className="w-32 opacity-20 grayscale" />
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-re-text uppercase tracking-tight">Zero trace of activity</h3>
                    <p className="text-[9px] text-re-text-muted font-bold uppercase tracking-widest opacity-40">No matching educational assets found.</p>
                  </div>
                  <button onClick={() => { setFilter('all'); setSearchTerm(''); }} className="text-re-orange font-black text-[9px] uppercase tracking-widest hover:underline px-6 py-2 rounded-lg bg-re-bg">Clear Filters</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar (Right Column) ── */}
          <div className="hidden lg:flex flex-col space-y-6 lg:sticky lg:top-8 h-fit">

            {/* English Excellence Card */}
            <div className="bg-white rounded-[24px] shadow-sm border border-black/5 p-5 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-0.5 h-3 bg-re-orange rounded-full"></span>
                <h3 className="text-[9px] font-black text-re-text uppercase tracking-widest opacity-40">Mastery Stats</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-re-bg/50 border border-black/5">
                  <p className="text-[8px] font-black text-re-text-muted uppercase tracking-[0.2em] mb-1">Weekly Goals</p>
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-black text-re-text tracking-tighter">12 / 20</p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase">On Track</p>
                  </div>
                  <div className="w-full h-1 bg-black/5 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-re-grad-orange w-[60%]"></div>
                  </div>
                </div>

                <button className="w-full py-3 rounded-xl border border-dashed border-re-orange/20 text-[9px] font-black text-re-orange uppercase tracking-widest hover:bg-re-orange/5 transition-all">
                  View Pedagogy Roadmap
                </button>
              </div>
            </div>

            {/* Smart Features Alert */}
            <div className="relative rounded-[24px] p-5 text-white shadow-[0_18px_45px_-20px_rgba(14,31,53,0.8)] overflow-hidden group cursor-pointer bg-[linear-gradient(145deg,#0E1F35,#1F3554)] border border-white/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,140,0,0.24),transparent_34%)]"></div>
              <div className="relative z-10 flex flex-col gap-3">
                <div className="w-8 h-8 bg-re-orange/15 rounded-lg flex items-center justify-center backdrop-blur-md border border-re-orange/20">
                  <Sparkles size={16} className="text-re-orange" />
                </div>
                <div>
                  <h4 className="font-black text-[10px] tracking-widest uppercase opacity-90">Expert Webinar</h4>
                  <p className="text-[9px] text-white/75 font-bold leading-snug mt-1 uppercase tracking-tight">
                    Deep dive into advanced English pedagogy tomorrow at 2PM.
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
            </div>

            <p className="text-center text-[7px] text-re-text-muted font-black uppercase tracking-[0.2em] opacity-30 italic">Continuous Professional Development System</p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EnglishClub;
