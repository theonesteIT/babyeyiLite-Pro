import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import {
  MessageSquare,
  Send,
  User,
  Bot,
  History,
  Sparkles,
  Mic,
  Plus
} from 'lucide-react';

const TichaAI = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistoryMob, setShowHistoryMob] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/tools/ticha-ai/history');
      if (res.data.success) {
        setHistory(res.data.history);
      }
    } catch (err) {
      console.error('Could not load AI history.');
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/tools/ticha-ai/assist', { prompt: userMessage.content });
      if (res.data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
        fetchHistory();
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full bg-re-bg min-h-screen">
      {/* ── High-Fidelity Hero Section ── */}
      <div className="relative w-full min-h-[140px] md:min-h-[200px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" />

        <div className="relative z-20 max-w-[1600px] mx-auto px-6 md:px-12 pt-8 md:pt-12 pb-10 md:pb-16 flex items-center gap-6">
          <div className="hidden md:flex shrink-0 w-24 h-24 rounded-[32px] border border-white/10 bg-white/5 items-center justify-center backdrop-blur-xl shadow-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <Sparkles size={40} style={{ color: "#FEBF10" }} className="" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-4 h-1 bg-white/40 rounded-full animate-pulse" style={{ background: "#FEBF10" }}></span>
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em]" style={{ color: "#FEBF10" }}>Cognitive Core</p>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>TichaAI</h1>
            <p className="text-[10px] md:text-sm font-bold text-white/40 max-w-lg leading-relaxed uppercase tracking-widest italic opacity-60">Empowering Educators with Intelligent Design</p>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-12 -mt-4 sm:-mt-5 md:-mt-6 pt-2 relative z-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* ── Left Column (Chat Interface) ── */}
          <div className="lg:col-span-2 flex flex-col h-[calc(100vh-220px)] md:h-[calc(100vh-280px)] min-h-[450px] bg-white rounded-[32px] shadow-sm border border-black/10 overflow-hidden relative">
            <header className="px-6 py-4 md:py-5 border-b border-black/5 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white shadow-sm border border-white/15" style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)" }}>
                  <Bot className="size-5 md:size-6" style={{ color: "#FEBF10" }} />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-[#1E3A5F] tracking-tight uppercase">Assistant Engine</h2>
                  <p className="text-[8px] md:text-[9px] font-bold text-re-text-muted/50 uppercase tracking-[0.2em]">Verified Secure Session</p>
                </div>
              </div>

              {/* Mobile History Toggle Icon */}
              <button
                onClick={() => setShowHistoryMob(!showHistoryMob)}
                className="lg:hidden w-10 h-10 rounded-xl bg-re-bg flex items-center justify-center text-re-text-muted border border-black/5 hover:bg-re-navy/5 transition-all text-[#1E3A5F]"
              >
                <History size={18} />
              </button>
            </header>

            {/* Mobile History Overlay (Slide down inside the card) */}
            {showHistoryMob && (
              <div className="lg:hidden absolute top-[70px] md:top-[85px] inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/10 shadow-sm max-h-[350px] overflow-y-auto animate-in slide-in-from-top duration-300">
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-0.5 h-2 rounded-full" style={{ background: "#FEBF10" }}></span>
                      <h3 className="text-[8px] font-semibold text-[#1E3A5F] uppercase tracking-widest">Previous Inquiries</h3>
                    </div>
                    <button onClick={() => setShowHistoryMob(false)} className="text-[8px] font-semibold uppercase tracking-widest text-red-500 hover:opacity-80">Close</button>
                  </div>
                  {history.length > 0 ? history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setInput(item.prompt); setShowHistoryMob(false); }}
                      className="w-full text-left p-4 rounded-xl bg-re-bg/50 border border-black/5 active:bg-white transition-all shadow-sm focus:ring-2 focus:ring-[#1E3A5F]/20"
                    >
                      <p className="text-[10px] font-semibold text-[#1E3A5F] truncate uppercase tracking-tight">{item.prompt}</p>
                      <p className="text-[7px] text-re-text-muted font-bold mt-1 opacity-60 uppercase">{new Date(item.created_at).toLocaleDateString()}</p>
                    </button>
                  )) : (
                    <div className="py-12 text-center space-y-4 opacity-20 flex flex-col items-center">
                      <img src="/undraw_no-data_ig65 (1).svg" alt="No data" className="w-20 mx-auto grayscale" />
                      <p className="text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.3em]">Zero trace of activity</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-10 space-y-8 custom-scrollbar bg-re-bg/20">
              {messages.length === 0 ? (
                <div className="max-w-2xl mx-auto pt-8 md:pt-12 text-center space-y-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white shadow-sm rounded-[24px] flex items-center justify-center mx-auto border border-black/5 relative relative transition-transform duration-300">
                    <Bot size={28} className="text-[#1E3A5F]" />
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-4 border-white"></div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg md:text-2xl font-semibold text-[#1E3A5F] tracking-tighter uppercase leading-tight">Muraho! How can I help?</h3>
                    <p className="text-[9px] md:text-[10px] text-re-text-muted font-semibold uppercase tracking-[0.3em] opacity-60 pt-2">Guidance • Curriculum • Planning</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-6 px-4 max-w-lg mx-auto">
                    {[
                      "Plan Senior 3 Physics",
                      "English REB Goals",
                      "Management Tips",
                      "Classroom Management",
                    ].map((text, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(text)}
                        className="p-4 rounded-2xl bg-white hover:bg-re-navy/5 text-[9px] font-semibold text-[#1E3A5F] border border-black/5 text-left transition-all uppercase tracking-widest shadow-sm hover:shadow-md hover:-translate-y-0.5 group"
                      >
                        <span className="opacity-80 group-hover:opacity-100 transition-opacity">{text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10 ${msg.role === 'user' ? 'text-[#1E3A5F]' : 'text-white'}`}
                        style={{ background: msg.role === 'user' ? '#FEBF10' : 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                      >
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={16} />}
                      </div>
                      <div
                        className={`p-4 md:p-5 rounded-[24px] shadow-sm leading-relaxed max-w-[88%] md:max-w-[75%] text-[13px] md:text-sm font-bold border ${msg.role === 'user' ? 'bg-[#FEBF10]/10 text-[#1E3A5F] rounded-tr-none border-[#FEBF10]/20' : 'bg-white text-re-text rounded-tl-none border-black/5'}`}
                      >
                        {msg.content}
                        <div className={`text-[8px] font-semibold uppercase tracking-widest mt-2 pt-2 border-t ${msg.role === 'user' ? 'border-[#1E3A5F]/10 text-[#1E3A5F] text-right opacity-60' : 'border-black/5 text-[#1E3A5F] opacity-40'}`}>
                          {msg.role === 'user' ? 'Sent' : 'TichaAI Responded'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-start gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl text-white flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}>
                        <Bot size={16} />
                      </div>
                      <div className="bg-white p-4 md:p-5 rounded-[24px] rounded-tl-none shadow-sm border border-black/5 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#FEBF10" }}></div>
                        <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: "#FEBF10" }}></div>
                        <div className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.4s]" style={{ background: "#FEBF10" }}></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 border-t border-black/5 bg-white/80 backdrop-blur-lg">
              <form className="max-w-4xl mx-auto relative group flex gap-2 md:gap-3" onSubmit={handleSend}>
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Ask about curriculum..."
                    className="w-full h-12 md:h-14 bg-re-bg rounded-2xl pl-12 pr-12 font-semibold outline-none border border-black/5 focus:border-[#1E3A5F]/20 shadow-inner focus:ring-4 focus:ring-[#1E3A5F]/5 transition-all text-[#1E3A5F] text-xs md:text-sm placeholder:text-[#1E3A5F]/30"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-re-text-muted/30 group-focus-within:text-[#1E3A5F] transition-colors">
                    <MessageSquare size={16} />
                  </div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <button type="button" className="text-re-text-muted/40 hover:text-[#1E3A5F] transition-colors">
                      <Mic size={18} />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white shadow-sm active:scale-95 transition-all shrink-0 disabled:opacity-50 disabled:hover:scale-100"
                  style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2644 100%)' }}
                >
                  <Send size={18} />
                </button>
              </form>
              <p className="text-center text-[8px] text-[#1E3A5F] mt-3 font-semibold uppercase tracking-[0.2em] opacity-30 italic">Intelligent Support by Babyeyi AI Engine</p>
            </div>
          </div>

          {/* ── Right Column (Sidebar & History) ── */}
          <div className="hidden lg:flex flex-col space-y-6 lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-[32px] shadow-sm border border-black/5 p-6 md:p-8 flex flex-col max-h-[600px]">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-3 rounded-full" style={{ background: "#FEBF10" }}></span>
                <h3 className="text-[10px] font-semibold text-[#1E3A5F] uppercase tracking-[0.2em]">Previous Inquiries</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setInput(item.prompt)}
                    className="w-full text-left p-4 rounded-xl bg-re-bg/50 hover:bg-white hover:shadow-md border border-transparent hover:border-[#1E3A5F]/10 transition-all group focus:ring-2 focus:ring-[#FEBF10]/30"
                  >
                    <p className="text-[10px] md:text-xs font-semibold text-[#1E3A5F] truncate group-hover:text-[#FEBF10] uppercase tracking-tight transition-colors">{item.prompt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[8px] text-[#1E3A5F] font-semibold uppercase tracking-widest opacity-40">
                        {new Date(item.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </span>
                      <div className="w-1 h-1 bg-[#1E3A5F]/20 rounded-full"></div>
                      <span className="text-[8px] text-[#FEBF10] font-semibold uppercase tracking-widest opacity-80">Verified</span>
                    </div>
                  </button>
                ))}
                {history.length === 0 && (
                  <div className="py-12 text-center space-y-4 opacity-30 flex flex-col items-center">
                    <img src="/undraw_no-data_ig65 (1).svg" alt="No data" className="w-24 mx-auto grayscale opacity-50" />
                    <p className="text-[9px] font-semibold text-[#1E3A5F] uppercase tracking-[0.3em]">Zero trace of activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Promo Card */}
            <div className="relative rounded-[32px] p-8 text-white shadow-sm overflow-hidden group cursor-pointer" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0a192f 100%)' }}>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Plus size={20} style={{ color: "#FEBF10" }} />
                </div>
                <div>
                  <h4 className="font-semibold text-xs tracking-widest uppercase opacity-90" style={{ color: "#FEBF10" }}>Auto-Lesson Plan</h4>
                  <p className="text-[10px] text-white/80 font-bold leading-relaxed mt-2 uppercase tracking-widest">Generate structured lesson plans in seconds with AI.</p>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 opacity-20 bg-[#FEBF10] rounded-full blur-3xl group-hover:scale-150 group-hover:opacity-40 transition-transform duration-700"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TichaAI;
