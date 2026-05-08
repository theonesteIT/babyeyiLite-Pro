import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { PORTAL } from '../config/portal';
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
      <div className="relative w-full min-h-[200px] sm:min-h-[220px] overflow-hidden bg-[#c87800]">
        <div className="absolute -top-28 -right-28 w-[22rem] h-[22rem] rounded-full border border-white/[0.07] pointer-events-none" aria-hidden />
        <div className="absolute -top-14 -right-14 w-[15rem] h-[15rem] rounded-full border border-white/[0.06] pointer-events-none" aria-hidden />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FEBF10]/30 to-transparent pointer-events-none" aria-hidden />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 pt-10 sm:pt-12 pb-20 sm:pb-24 flex items-center justify-between">
          <div className="space-y-1 max-w-3xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-5 h-1 rounded-full bg-[#FEBF10]" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEBF10]">Cognitive Core</p>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight leading-none mb-1 mt-1 uppercase">
              TichaAI
            </h1>
            <p className="text-[10px] sm:text-[11px] font-medium text-white/60 tracking-wider">
              Draft parent letters, incident summaries, and talking points for {PORTAL.brandLine}.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-12 -mt-12 sm:-mt-16 relative z-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          {/* ── Left Column (Chat Interface) ── */}
          <div className="lg:col-span-2 flex flex-col h-[calc(100vh-220px)] md:h-[calc(100vh-280px)] min-h-[450px] bg-white rounded-[24px] shadow-2xl border border-black/5 overflow-hidden relative">
            <header className="px-5 py-3 md:py-4 border-b border-black/5 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 md:w-9 md:h-9 bg-re-grad-purple rounded-lg flex items-center justify-center text-white shadow-re-premium-purple">
                  <Sparkles className="size-4 md:size-5" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-semibold text-re-text tracking-tight uppercase">Assistant Engine</h2>
                  <p className="text-[8px] md:text-[9px] font-bold text-re-text-muted/50 uppercase tracking-[0.2em]">Verified Secure Session</p>
                </div>
              </div>

              {/* Mobile History Toggle Icon */}
              <button
                onClick={() => setShowHistoryMob(!showHistoryMob)}
                className="lg:hidden w-9 h-9 rounded-lg bg-re-bg flex items-center justify-center text-re-text-muted border border-black/5 active:scale-95 transition-all"
              >
                <History size={18} />
              </button>
            </header>

            {/* Mobile History Overlay (Slide down inside the card) */}
            {showHistoryMob && (
              <div className="lg:hidden absolute top-[56px] md:top-[68px] inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/10 shadow-2xl max-h-[350px] overflow-y-auto animate-in slide-in-from-top duration-300">
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-0.5 h-2 bg-re-purple rounded-full"></span>
                      <h3 className="text-[8px] font-semibold text-re-text uppercase tracking-widest opacity-40">Previous Inquiries</h3>
                    </div>
                    <button onClick={() => setShowHistoryMob(false)} className="text-[8px] font-semibold text-re-purple uppercase tracking-widest">Close</button>
                  </div>
                  {history.length > 0 ? history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setInput(item.prompt); setShowHistoryMob(false); }}
                      className="w-full text-left p-4 rounded-xl bg-re-bg/50 border border-black/5 active:bg-white transition-all"
                    >
                      <p className="text-[10px] font-semibold text-re-text truncate uppercase tracking-tight">{item.prompt}</p>
                      <p className="text-[7px] text-re-text-muted font-bold mt-0.5 opacity-40 uppercase">{new Date(item.created_at).toLocaleDateString()}</p>
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
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 md:py-8 space-y-6 custom-scrollbar bg-re-bg/20">
              {messages.length === 0 ? (
                <div className="max-w-2xl mx-auto pt-8 md:pt-10 text-center space-y-5">
                  <div className="w-14 h-14 md:w-16 md:h-16 bg-white shadow-re-soft rounded-2xl flex items-center justify-center mx-auto ring-1 ring-black/5 relative">
                    <Bot size={22} className="text-re-purple" />
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 md:border-4 border-white"></div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base md:text-lg font-semibold text-re-text tracking-tight uppercase leading-tight">Muraho! How can I help?</h3>
                    <p className="text-[9px] md:text-[10px] text-re-text-muted font-bold uppercase tracking-widest opacity-60">Guidance • Curriculum • Planning</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 px-4 max-w-sm mx-auto">
                    {[
                      "Plan Senior 3 Physics",
                      "English REB Goals",
                      "Management Tips"
                    ].map((text, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(text)}
                        className="p-3 rounded-lg bg-white hover:bg-re-purple/5 text-[8px] md:text-[9px] font-semibold text-re-text-muted hover:text-re-purple border border-black/5 text-left transition-all uppercase tracking-widest shadow-sm"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-5">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-2 md:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-white/20 ${msg.role === 'user' ? 'bg-re-grad-orange text-white' : 'bg-re-grad-purple text-white'}`}>
                        {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                      </div>
                      <div className={`p-3.5 md:p-4 rounded-[18px] md:rounded-[20px] shadow-sm border border-black/5 leading-relaxed max-w-[88%] md:max-w-[85%] text-[12px] md:text-[13px] font-medium ${msg.role === 'user' ? 'bg-re-grad-orange text-white rounded-tr-none' : 'bg-white text-re-text rounded-tl-none'}`}>
                        {msg.content}
                        <div className={`text-[7px] font-semibold uppercase tracking-widest mt-1.5 opacity-40 ${msg.role === 'user' ? 'text-white text-right' : 'text-re-text-muted'}`}>
                          {msg.role === 'user' ? 'Sent' : 'TichaAI Responded'}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-re-grad-purple text-white flex items-center justify-center shadow-sm">
                        <Bot size={12} />
                      </div>
                      <div className="bg-white p-3.5 rounded-[18px] rounded-tl-none shadow-sm border border-black/5 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-re-purple/40 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-re-purple/70 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-re-purple/90 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3.5 md:p-5 border-t border-black/5 bg-white/50 backdrop-blur-md">
              <form className="max-w-4xl mx-auto relative group flex gap-1.5" onSubmit={handleSend}>
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Ask about curriculum..."
                    className="w-full h-11 md:h-12 bg-re-bg rounded-xl pl-10 pr-10 font-bold outline-none border border-black/5 focus:border-re-purple/30 shadow-inner focus:ring-8 focus:ring-re-purple/5 transition-all text-re-text text-[11px] md:text-xs"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-re-text-muted/40 group-focus-within:text-re-purple transition-colors">
                    <MessageSquare size={14} />
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button type="button" className="text-re-text-muted hover:text-re-purple transition-colors">
                      <Mic size={16} />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="w-11 h-11 md:w-12 md:h-12 bg-re-grad-purple rounded-xl flex items-center justify-center text-white shadow-re-glow hover:scale-[1.02] active:scale-95 transition-all shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
              <p className="text-center text-[7px] text-re-text-muted mt-2 font-semibold uppercase tracking-[0.2em] opacity-30 italic">Intelligent Support by Babyeyi AI Engine</p>
            </div>
          </div>

          {/* ── Right Column (Sidebar & History) ── */}
          <div className="hidden lg:flex flex-col space-y-6 lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-[24px] shadow-sm border border-black/5 p-5 pt-4 flex flex-col max-h-[600px]">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-0.5 h-3 bg-re-purple rounded-full"></span>
                <h3 className="text-[9px] font-semibold text-re-text uppercase tracking-widest opacity-40">Previous Inquiries</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setInput(item.prompt)}
                    className="w-full text-left p-4 rounded-xl bg-re-bg/50 hover:bg-white hover:shadow-re-soft border border-transparent hover:border-re-purple/10 transition-all group"
                  >
                    <p className="text-[10px] font-semibold text-re-text truncate group-hover:text-re-purple uppercase tracking-tight">{item.prompt}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[7px] text-re-text-muted font-semibold uppercase tracking-wider opacity-40">
                        {new Date(item.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </span>
                      <div className="w-1 h-1 bg-black/10 rounded-full"></div>
                      <span className="text-[7px] text-re-purple font-semibold uppercase tracking-wider opacity-60">Verified</span>
                    </div>
                  </button>
                ))}
                {history.length === 0 && (
                  <div className="py-12 text-center space-y-4 opacity-20 flex flex-col items-center">
                    <img src="/undraw_no-data_ig65 (1).svg" alt="No data" className="w-24 mx-auto grayscale" />
                    <p className="text-[8px] font-semibold text-re-text-muted uppercase tracking-[0.3em]">Zero trace of activity</p>
                  </div>
                )}
              </div>
            </div>
            <div className="relative rounded-[24px] p-5 text-white shadow-re-premium-purple overflow-hidden group cursor-pointer bg-re-grad-orange">
              <div className="relative z-10 flex flex-col gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-md">
                  <Plus size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-[10px] tracking-widest uppercase opacity-90">Incident &amp; letter drafts</h4>
                  <p className="text-[9px] text-white font-bold leading-snug mt-1 opacity-80 uppercase tracking-tight">Turn bullet notes into clear, professional messages for families and staff.</p>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-white/20 rounded-full blur-2xl group-hover:scale-150 transition-transform"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TichaAI;
