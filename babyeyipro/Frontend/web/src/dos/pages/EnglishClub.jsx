import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  ExternalLink,
  Search,
  Filter,
  Play,
  Sparkles,
  Plus,
  ChevronRight
} from 'lucide-react';

const EnglishClub = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchResources = async () => {
    setLoading(true);
    try {
      const url = filter === 'all' ? '/teacher-portal/english-club/resources' : `/teacher-portal/english-club/resources?type=${filter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setResources(res.data.resources);
      }
    } catch (err) {
      console.error('Could not load English Club resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [filter]);

  const filteredResources = resources.filter(res =>
    res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (res.description && res.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative w-full bg-re-bg min-h-screen" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* ── Hero Banner ── */}
      <section className="relative p-7 md:p-10 text-white overflow-hidden min-h-[200px] flex items-center bg-[#000435]">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-5xl w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-0.5 w-6 rounded-full bg-[#FEBF10]" />
            <p className="text-[10px] font-black capitalize tracking-widest text-[#FEBF10]/80">Professional Excellence</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">English <span className="text-white/40">Club</span></h1>
          <p className="text-xs font-bold text-white/60 max-w-xl mt-2">
            Sharpening Pedagogy through Linguistic Mastery — resources, videos, and quizzes.
          </p>
        </div>
      </section>

      {/* ── Main Content Grid ── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 -mt-10 md:-mt-12 relative z-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* ── Main Gallery (Left Column) ── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Search & Filters Bar */}
            <div className="bg-white rounded-[24px] shadow-re-soft border border-black/5 p-4 md:p-6 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-re-purple transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search resources by title or topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 bg-re-bg rounded-xl pl-11 pr-4 font-bold outline-none border border-black/5 focus:border-re-purple/20 transition-all text-re-text text-xs tracking-tight"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide py-1">
                {['all', 'video', 'pdf', 'quiz'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap border-2 ${filter === f ? 'bg-re-grad-purple border-transparent text-white shadow-re-premium-purple' : 'bg-re-bg border-transparent text-re-text-muted/60 hover:bg-white hover:border-black/10'}`}
                  >
                    {f === 'all' ? 'All' : f + 's'}
                  </button>
                ))}
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
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-re-purple shadow-lg">
                            <Play fill="currentColor" size={16} className="translate-x-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Intel */}
                    <div className="p-5 flex flex-col flex-1 bg-white">
                      <div className="flex-1 space-y-1.5 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-1 h-3 bg-re-purple rounded-full"></span>
                          <p className="text-[8px] font-black text-re-purple uppercase tracking-widest opacity-60">Verified Content</p>
                        </div>
                        <h4 className="text-sm font-black text-re-text tracking-tight uppercase leading-tight line-clamp-1">{res.title}</h4>
                        <p className="text-[10px] text-re-text-muted font-bold leading-relaxed line-clamp-2 opacity-60 italic">{res.description}</p>
                      </div>

                      <a
                        href={res.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-re-bg group-hover:bg-re-grad-purple rounded-xl text-re-text group-hover:text-white font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
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
                  <button onClick={() => { setFilter('all'); setSearchTerm(''); }} className="text-re-purple font-black text-[9px] uppercase tracking-widest hover:underline px-6 py-2 rounded-lg bg-re-bg">Clear Filters</button>
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar (Right Column) ── */}
          <div className="hidden lg:flex flex-col space-y-6 lg:sticky lg:top-8 h-fit">

            {/* English Excellence Card */}
            <div className="bg-white rounded-[24px] shadow-sm border border-black/5 p-5 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-0.5 h-3 bg-re-purple rounded-full"></span>
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
                    <div className="h-full bg-re-grad-purple w-[60%]"></div>
                  </div>
                </div>

                <button className="w-full py-3 rounded-xl border border-dashed border-re-purple/20 text-[9px] font-black text-re-purple uppercase tracking-widest hover:bg-re-purple/5 transition-all">
                  View Pedagogy Roadmap
                </button>
              </div>
            </div>

            {/* Smart Features Alert */}
            <div className="relative rounded-[24px] p-5 text-white shadow-re-premium-purple overflow-hidden group cursor-pointer bg-re-grad-orange">
              <div className="relative z-10 flex flex-col gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="font-black text-[10px] tracking-widest uppercase opacity-90">Expert Webinar</h4>
                  <p className="text-[9px] text-white font-bold leading-snug mt-1 opacity-80 uppercase tracking-tight">
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
