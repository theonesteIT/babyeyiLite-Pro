import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Building2, MessageSquare, Search, Send, ShieldCheck, UserRound } from 'lucide-react';
import {
  getChatSchools,
  getSchoolStaff,
  getChatThreads,
  openDirectThread,
  getThreadMessages,
  sendThreadMessage,
  markThreadRead,
  getSessionProfile,
  resolveSocketUrl,
} from '../services/chatApi';

const BRAND = '#000435';

function roleBadgeColor(role) {
  const code = String(role || '').toUpperCase();
  if (code.includes('MANAGER') || code.includes('ADMIN')) return 'bg-indigo-100 text-indigo-700';
  if (code.includes('DOS') || code.includes('HOD')) return 'bg-cyan-100 text-cyan-700';
  if (code.includes('TEACHER')) return 'bg-emerald-100 text-emerald-700';
  if (code.includes('LIB')) return 'bg-amber-100 text-amber-700';
  if (code.includes('ACCOUNT')) return 'bg-violet-100 text-violet-700';
  return 'bg-slate-100 text-slate-700';
}

export default function ChatCenter() {
  const [session, setSession] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('Loading chat…');
  const [socketMode, setSocketMode] = useState('polling');

  const roleCode = String(session?.role?.code || session?.role_code || '').toUpperCase();
  const isParent = roleCode === 'PARENT';

  const loadThreads = async (sid) => {
    if (!sid) return;
    const data = await getChatThreads(sid);
    setThreads(data);
    if (!activeThread && data[0]) setActiveThread(data[0]);
  };

  const loadMessages = async (sid, threadId) => {
    if (!sid || !threadId) return;
    const data = await getThreadMessages(sid, threadId, 150);
    setMessages(data);
    await markThreadRead(sid, threadId).catch(() => {});
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const [profile, schoolRows] = await Promise.all([getSessionProfile(), getChatSchools()]);
        if (!mounted) return;
        setSession(profile);
        setSchools(schoolRows);
        const firstSchool = schoolRows[0]?.id ? String(schoolRows[0].id) : '';
        setSchoolId(firstSchool);
        setStatus(firstSchool ? 'Connected' : 'No school found for this account');
      } catch {
        if (!mounted) return;
        setStatus('Failed to initialize chat');
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    getSchoolStaff(schoolId, staffSearch).then(setStaffList).catch(() => setStaffList([]));
  }, [schoolId, staffSearch]);

  useEffect(() => {
    if (!schoolId) return;
    loadThreads(schoolId);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !activeThread?.id) return;
    loadMessages(schoolId, activeThread.id);
  }, [schoolId, activeThread?.id]);

  useEffect(() => {
    if (!schoolId) return;
    let socket;
    let mounted = true;
    const run = async () => {
      try {
        const socketClient = await import('socket.io-client');
        socket = socketClient.io(resolveSocketUrl(), { withCredentials: true, transports: ['websocket', 'polling'] });
        socket.on('connect', () => {
          if (!mounted) return;
          setSocketMode('socket');
          if (activeThread?.id) socket.emit('chat:join-thread', { school_id: Number(schoolId), thread_id: Number(activeThread.id) });
        });
        socket.on('disconnect', () => {
          if (!mounted) return;
          setSocketMode('polling');
        });
        socket.on('chat:new-message', (payload) => {
          if (!mounted) return;
          if (Number(payload?.school_id) !== Number(schoolId)) return;
          loadThreads(schoolId);
          if (Number(payload?.thread_id) === Number(activeThread?.id)) {
            loadMessages(schoolId, activeThread.id);
          }
        });
      } catch {
        if (mounted) setSocketMode('polling');
      }
    };
    run();
    const poll = setInterval(() => {
      if (socketMode !== 'socket') {
        loadThreads(schoolId);
        if (activeThread?.id) loadMessages(schoolId, activeThread.id);
      }
    }, 20000);
    return () => {
      mounted = false;
      clearInterval(poll);
      if (socket) socket.disconnect();
    };
  }, [schoolId, activeThread?.id, socketMode]);

  const selectedSchoolName = useMemo(() => {
    const match = schools.find((s) => String(s.id) === String(schoolId));
    return match?.school_name || 'School';
  }, [schools, schoolId]);

  const openStaffThread = async (userId) => {
    if (!schoolId || !userId) return;
    const data = await openDirectThread(Number(schoolId), Number(userId));
    if (!data?.thread_id) return;
    await loadThreads(schoolId);
    setActiveThread((prev) => (prev?.id === data.thread_id ? prev : { id: data.thread_id }));
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !schoolId || !activeThread?.id) return;
    setDraft('');
    await sendThreadMessage(Number(schoolId), Number(activeThread.id), text);
    await loadMessages(schoolId, activeThread.id);
    await loadThreads(schoolId);
  };

  return (
    <div className="h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1500px] h-full flex flex-col gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 md:px-5 md:py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-500">Realtime Communication</p>
            <h1 className="text-xl font-black" style={{ color: BRAND }}>
              {isParent ? 'Parent Chat Center' : 'Staff Communication Hub'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="h-10 px-3 rounded-lg border border-slate-300 text-sm font-semibold bg-white">
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.school_name}</option>
              ))}
            </select>
            <span className={`rounded-full px-3 py-2 text-xs font-bold ${socketMode === 'socket' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {socketMode === 'socket' ? 'Socket Live' : 'Polling'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[340px_360px_1fr] gap-4 flex-1 min-h-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 min-h-0 flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <Building2 size={16} className="text-amber-500" />
              <p className="text-sm font-bold">{selectedSchoolName}</p>
            </div>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Search teachers, DOS, manager, librarian..." className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div className="overflow-auto space-y-2 pr-1">
              {staffList.map((staff) => (
                <button key={staff.id} type="button" onClick={() => openStaffThread(staff.id)} className="w-full text-left rounded-xl border border-slate-200 px-3 py-2 hover:border-[#000435]/30 hover:bg-slate-50 transition">
                  <p className="text-sm font-bold">{staff.first_name} {staff.last_name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${roleBadgeColor(staff.role_code || staff.role_name)}`}>
                      {staff.role_name || staff.role_code}
                    </span>
                    <span className="text-[10px] text-slate-400">Start chat</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 min-h-0 flex flex-col">
            <div className="mb-2 flex items-center gap-2">
              <Bell size={16} className="text-amber-500" />
              <p className="text-sm font-bold">Conversations</p>
            </div>
            <div className="overflow-auto space-y-2 pr-1">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThread(thread)}
                  className={`w-full text-left rounded-xl border px-3 py-2 transition ${Number(activeThread?.id) === Number(thread.id) ? 'border-[#000435]/35 bg-[#000435]/5' : 'border-slate-200 hover:border-[#000435]/20 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold truncate">{thread.other_participant?.name || 'Chat thread'}</p>
                    {thread.unread_count > 0 && <span className="text-[10px] font-black bg-red-100 text-red-700 rounded-full px-2 py-0.5">{thread.unread_count}</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-1">{thread.last_message_preview || 'No messages yet'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{thread.other_participant?.role_name || ''}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white min-h-0 flex flex-col overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-amber-500" />
                <div>
                  <p className="text-sm font-bold">{activeThread?.other_participant?.name || 'Select conversation'}</p>
                  <p className="text-[11px] text-slate-400">{activeThread?.other_participant?.role_name || status}</p>
                </div>
              </div>
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50">
              {messages.map((msg) => {
                const mine = (msg.sender_type === 'USER' && msg.sender_user_id === session?.id)
                  || (msg.sender_type === 'PARENT' && roleCode === 'PARENT');
                return (
                  <div key={msg.id} className={`max-w-[76%] rounded-2xl px-3 py-2 border ${mine ? 'ml-auto bg-[#000435] text-white border-[#000435]' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <p className={`text-[11px] mb-1 ${mine ? 'text-white/75' : 'text-slate-400'}`}>{msg.sender_name} · {msg.sender_role}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 p-3 flex items-center gap-2">
              <UserRound size={15} className="text-slate-400" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={activeThread?.id ? 'Write message…' : 'Select a chat first'}
                className="flex-1 h-10 rounded-lg border border-slate-300 px-3 text-sm"
                disabled={!activeThread?.id}
              />
              <button
                type="button"
                onClick={send}
                disabled={!activeThread?.id || !draft.trim()}
                className="h-10 px-3 rounded-lg bg-[#000435] text-white disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Send size={14} />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
