import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, CheckCheck, Circle, Copy, FileUp, Filter, Forward, Paperclip, Reply, Search, Send, SmilePlus, Trash2, X, Users, MessageSquare
} from 'lucide-react';
import {
  socketUrl,
  getSessionMe,
  getSchools,
  getStaff,
  getThreads,
  createDirectThread,
  createGroupThread,
  getGroupOptions,
  getMessages,
  markRead,
  uploadAttachment,
  sendMessage,
  removeThread,
} from '../services/chatApi';

const roleGroups = [
  { id: 'all', label: 'All Staff' },
  { id: 'teachers', label: 'Only Teachers' },
  { id: 'leadership', label: 'Only Leadership' },
  { id: 'support', label: 'Only Support' },
];

const groupScopes = [
  { id: 'ALL_PARENTS', label: 'All Parents' },
  { id: 'ALL_TEACHERS', label: 'All Teachers' },
  { id: 'ALL_STAFF', label: 'All Staff' },
  { id: 'CUSTOM', label: 'Custom Members' },
];

function roleBadge(role) {
  const code = String(role || '').toUpperCase();
  if (code.includes('TEACH')) return 'bg-emerald-100 text-emerald-700';
  if (code.includes('MANAGER') || code.includes('ADMIN') || code.includes('DOS') || code.includes('HOD')) return 'bg-indigo-100 text-indigo-700';
  if (code.includes('LIB') || code.includes('ACCOUNT') || code.includes('STORE') || code.includes('DISCIPLINE')) return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function parseDate(value) {
  const d = new Date(value || '');
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatTime(value) {
  const d = parseDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatDayLabel(value) {
  const d = parseDate(value);
  if (!d) return '';
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }).format(d);
}

function initialsOf(name = '') {
  return String(name).trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

export default function ChatCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleGroup, setStaffRoleGroup] = useState('all');
  const [staff, setStaff] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineMap, setOnlineMap] = useState({});
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [reactTargetId, setReactTargetId] = useState(null);
  const [mobileActionMenu, setMobileActionMenu] = useState(null);
  const [pressedMessageId, setPressedMessageId] = useState(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [socketState, setSocketState] = useState('polling');
  const [messageSearch, setMessageSearch] = useState('');
  const [confirmRemoveThread, setConfirmRemoveThread] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('inbox');
  const [sheetOffset, setSheetOffset] = useState(0);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupOptions, setGroupOptions] = useState({});
  const [groupForm, setGroupForm] = useState({
    name: '',
    scope: 'ALL_PARENTS',
    memberUserIds: [],
    parentPhones: '',
  });
  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);
  const touchStartYRef = useRef(0);
  const draggingRef = useRef(false);
  const msgListRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const roleCode = String(me?.role?.code || me?.role_code || '').toUpperCase();
  const isParent = roleCode === 'PARENT';
  const canManageGroups = ['SCHOOL_MANAGER', 'SCHOOL_ADMIN', 'DOS'].includes(roleCode);
  const dashboardPath = useMemo(() => {
    const p = String(location.pathname || '').replace(/\/+$/, '');
    if (p.endsWith('/chat')) return p.slice(0, -5) || '/';
    return '/';
  }, [location.pathname]);

  const selectedSchoolName = useMemo(() => {
    return schools.find((s) => String(s.id) === String(schoolId))?.school_name || 'School';
  }, [schools, schoolId]);
  const activeGroupInfo = activeThread?.thread_type === 'GROUP' ? (activeThread?.group_info || null) : null;

  const replyLabel = (replyTo) => {
    if (!replyTo) return 'Message';
    const mine = (replyTo.sender_type === 'USER' && Number(replyTo.sender_user_id) === Number(me?.id))
      || (replyTo.sender_type === 'PARENT' && isParent);
    return mine ? 'You' : (replyTo.sender_name || 'Message');
  };

  const refreshThreads = async (sid) => {
    if (!sid) return;
    const list = await getThreads(sid);
    setThreads(list);
    if (!activeThread && list[0]) setActiveThread(list[0]);
  };

  const refreshMessages = async (sid, threadId, q = '') => {
    if (!sid || !threadId) return;
    const list = await getMessages(sid, threadId, q);
    setMessages(list);
    await markRead(sid, threadId).catch(() => {});
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [session, schoolRows] = await Promise.all([getSessionMe(), getSchools()]);
        if (!mounted) return;
        setMe(session);
        setSchools(schoolRows);
        if (schoolRows[0]?.id) setSchoolId(String(schoolRows[0].id));
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    getStaff(schoolId, staffSearch, staffRoleGroup).then(setStaff).catch(() => setStaff([]));
  }, [schoolId, staffSearch, staffRoleGroup]);

  useEffect(() => {
    if (!schoolId || !canManageGroups) return;
    getGroupOptions(schoolId).then(setGroupOptions).catch(() => setGroupOptions({}));
  }, [schoolId, canManageGroups]);

  useEffect(() => {
    if (!schoolId) return;
    refreshThreads(schoolId);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !activeThread?.id) return;
    refreshMessages(schoolId, activeThread.id, messageSearch);
  }, [schoolId, activeThread?.id, messageSearch]);

  useEffect(() => {
    if (msgListRef.current) msgListRef.current.scrollTop = msgListRef.current.scrollHeight;
  }, [messages, mobileThreadOpen]);

  useEffect(() => {
    if (!schoolId) return;
    let socket = null;
    let mounted = true;
    const connect = async () => {
      try {
        const { io } = await import('socket.io-client');
        socket = io(socketUrl, { withCredentials: true, transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
          if (!mounted) return;
          setSocketState('socket');
          socket.emit('chat:presence-subscribe', { school_id: Number(schoolId) });
          if (activeThread?.id) socket.emit('chat:join-thread', { school_id: Number(schoolId), thread_id: Number(activeThread.id) });
        });
        socket.on('disconnect', () => { if (mounted) setSocketState('polling'); });
        socket.on('chat:new-message', (payload) => {
          if (Number(payload?.school_id) !== Number(schoolId)) return;
          refreshThreads(schoolId);
          if (Number(payload?.thread_id) === Number(activeThread?.id)) refreshMessages(schoolId, activeThread.id, messageSearch);
        });
        socket.on('chat:typing', (payload) => {
          if (Number(payload?.thread_id) !== Number(activeThread?.id)) return;
          const label = payload?.sender?.type === 'USER' ? `Staff ${payload?.sender?.user_id}` : 'Parent';
          if (payload?.is_typing) setTypingUsers((p) => Array.from(new Set([...p, label])));
          else setTypingUsers((p) => p.filter((x) => x !== label));
        });
        socket.on('chat:presence-changed', (payload) => {
          if (Number(payload?.school_id) !== Number(schoolId)) return;
          const key = payload?.identity?.type === 'USER'
            ? `U:${payload?.identity?.user_id}`
            : `P:${payload?.identity?.parent_phone}`;
          setOnlineMap((p) => ({ ...p, [key]: payload?.status === 'online' }));
        });
      } catch {
        if (mounted) setSocketState('polling');
      }
    };
    connect();
    return () => { mounted = false; if (socket) socket.disconnect(); };
  }, [schoolId, activeThread?.id, messageSearch]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileThreadOpen(false);
      setSheetOffset(0);
    }
  }, [isMobile]);

  const openDirect = async (userId) => {
    const out = await createDirectThread(Number(schoolId), Number(userId));
    if (!out?.thread_id) return;
    await refreshThreads(schoolId);
    setActiveThread((prev) => (prev?.id === out.thread_id ? prev : { id: out.thread_id }));
    if (socketRef.current) {
      socketRef.current.emit('chat:join-thread', { school_id: Number(schoolId), thread_id: Number(out.thread_id) });
    }
    if (isMobile) {
      setMobileThreadOpen(true);
      setSheetOffset(0);
    }
    setReplyTarget(null);
    setReactTargetId(null);
  };

  const onType = (value) => {
    setDraft(value);
    if (!activeThread?.id || !socketRef.current) return;
    socketRef.current.emit('chat:typing', { school_id: Number(schoolId), thread_id: Number(activeThread.id), is_typing: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('chat:typing', { school_id: Number(schoolId), thread_id: Number(activeThread.id), is_typing: false });
    }, 1200);
  };

  const onCopyMessage = async (m) => {
    const txt = String(m?.body || '').trim() || String(m?.attachment_url ? `${socketUrl}${m.attachment_url}` : '');
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
    } catch {}
  };

  const onForwardMessage = (m) => {
    const txt = String(m?.body || '').trim();
    const attachmentTxt = m?.attachment_url ? `${socketUrl}${m.attachment_url}` : '';
    const merged = [txt, attachmentTxt].filter(Boolean).join(' ');
    if (!merged) return;
    setDraft((prev) => (prev ? `${prev}\n↪ ${merged}` : `↪ ${merged}`));
  };

  const onReactMessage = async (m, emoji) => {
    if (!activeThread?.id || !emoji) return;
    await sendMessage(Number(schoolId), Number(activeThread.id), emoji, null, m?.id || null);
    setReactTargetId(null);
    await refreshMessages(schoolId, activeThread.id, messageSearch);
    await refreshThreads(schoolId);
  };

  const onComposerKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    if (e.ctrlKey && e.altKey) {
      e.preventDefault();
      const start = e.currentTarget.selectionStart || 0;
      const end = e.currentTarget.selectionEnd || 0;
      const next = `${draft.slice(0, start)}\n${draft.slice(end)}`;
      setDraft(next);
      requestAnimationFrame(() => {
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1;
      });
      return;
    }
    e.preventDefault();
    submit();
  };

  const startLongPress = (m, e) => {
    if (!isMobile) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    const touch = e?.touches?.[0];
    const elRect = e?.currentTarget?.getBoundingClientRect?.();
    longPressTimerRef.current = setTimeout(() => {
      setPressedMessageId(m?.id || null);
      const x = touch?.clientX || (elRect ? elRect.left + (elRect.width / 2) : window.innerWidth / 2);
      const y = touch?.clientY || (elRect ? elRect.top : window.innerHeight / 2);
      setMobileActionMenu({ message: m, x, y });
      setTimeout(() => setPressedMessageId(null), 160);
    }, 420);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const getMenuAnchorStyle = (anchor) => {
    const vw = window.innerWidth || 360;
    const vh = window.innerHeight || 640;
    const pad = 8;
    const menuW = Math.min(320, vw - (pad * 2));
    const menuH = 176;
    const x = Number(anchor?.x || (vw / 2));
    const y = Number(anchor?.y || (vh / 2));

    const spaceAbove = y - pad;
    const spaceBelow = vh - y - pad;
    const placeAbove = spaceAbove >= menuH || spaceAbove > spaceBelow;
    const top = placeAbove ? (y - menuH - 10) : (y + 10);
    const clampedTop = Math.max(pad, Math.min(top, vh - menuH - pad));

    const placeRightAligned = x > (vw * 0.6);
    const leftRaw = placeRightAligned ? (x - menuW + 28) : (x - 24);
    const clampedLeft = Math.max(pad, Math.min(leftRaw, vw - menuW - pad));

    return {
      width: menuW,
      left: clampedLeft,
      top: clampedTop,
      transformOrigin: `${placeRightAligned ? 'right' : 'left'} ${placeAbove ? 'bottom' : 'top'}`,
    };
  };

  const submit = async () => {
    if (!activeThread?.id) return;
    const text = draft.trim();
    if (!text && !attachment) return;
    let attachmentUrl = null;
    if (attachment) {
      setLoadingUpload(true);
      const uploaded = await uploadAttachment(attachment);
      attachmentUrl = uploaded?.url || null;
      setLoadingUpload(false);
    }
    setDraft('');
    setAttachment(null);
    await sendMessage(Number(schoolId), Number(activeThread.id), text, attachmentUrl, replyTarget?.id || null);
    setReplyTarget(null);
    setReactTargetId(null);
    await refreshMessages(schoolId, activeThread.id, messageSearch);
    await refreshThreads(schoolId);
  };

  const onRemoveThread = async (threadId) => {
    if (!threadId || !schoolId) return;
    await removeThread(Number(schoolId), Number(threadId)).catch(() => {});
    if (Number(activeThread?.id) === Number(threadId)) {
      setActiveThread(null);
      setMessages([]);
      if (isMobile) setMobileThreadOpen(false);
    }
    await refreshThreads(schoolId);
  };

  const openThread = (thread) => {
    setActiveThread(thread);
    setReplyTarget(null);
    setReactTargetId(null);
    if (isMobile) {
      setMobileThreadOpen(true);
      setSheetOffset(0);
    }
  };

  const onCreateGroup = async () => {
    if (!canManageGroups || !schoolId) return;
    const name = String(groupForm.name || '').trim();
    if (!name) return;
    setCreatingGroup(true);
    try {
      const payload = {
        school_id: Number(schoolId),
        name,
        scope: groupForm.scope,
      };
      if (groupForm.scope === 'CUSTOM') {
        payload.member_user_ids = groupForm.memberUserIds;
        payload.member_parent_phones = String(groupForm.parentPhones || '')
          .split(/[,\n]/)
          .map((x) => x.trim())
          .filter(Boolean);
      }
      const out = await createGroupThread(payload);
      await refreshThreads(schoolId);
      if (out?.thread_id) setActiveThread({ id: out.thread_id, thread_name: name, thread_type: 'GROUP' });
      setShowCreateGroup(false);
      setGroupForm({ name: '', scope: 'ALL_PARENTS', memberUserIds: [], parentPhones: '' });
    } finally {
      setCreatingGroup(false);
    }
  };

  const onSheetTouchStart = (e) => {
    touchStartYRef.current = e.touches?.[0]?.clientY || 0;
    draggingRef.current = true;
  };

  const onSheetTouchMove = (e) => {
    if (!draggingRef.current) return;
    const y = e.touches?.[0]?.clientY || 0;
    setSheetOffset(Math.max(0, y - touchStartYRef.current));
  };

  const onSheetTouchEnd = () => {
    draggingRef.current = false;
    if (sheetOffset > 120) setMobileThreadOpen(false);
    setSheetOffset(0);
  };

  const renderMessages = () => {
    let prevDay = '';
    return messages.map((m) => {
      const mine = (m.sender_type === 'USER' && Number(m.sender_user_id) === Number(me?.id))
        || (m.sender_type === 'PARENT' && roleCode === 'PARENT');
      const dayLabel = formatDayLabel(m.created_at);
      const showDivider = dayLabel && dayLabel !== prevDay;
      prevDay = dayLabel;
      return (
        <React.Fragment key={m.id}>
          {showDivider && (
            <div className="flex justify-center my-4">
              <span className="px-4 py-1.5 rounded-full bg-slate-200/50 backdrop-blur-md border border-white/50 text-[10px] font-black tracking-[0.1em] uppercase text-slate-500 shadow-sm">
                {dayLabel}
              </span>
            </div>
          )}
          <div className={`group flex flex-col mb-4 ${mine ? 'items-end' : 'items-start'}`}>
            <div className={`text-[10px] mb-1 font-bold ${mine ? 'text-[#000435]/70' : 'text-slate-500'} px-1`}>{m.sender_name}</div>
            <div
              className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl px-4 py-3 shadow-[0_2px_12px_rgb(0,0,0,0.06)] border ${mine ? 'bg-gradient-to-br from-[#000435] to-[#0a116b] text-white border-[#000435]/20 rounded-br-md' : 'bg-white border-black/5 text-slate-800 rounded-bl-md'}`}
              onDoubleClick={() => setReplyTarget({ id: m.id, sender_name: m.sender_name, body: m.body || (m.attachment_url ? '[Attachment]' : '') })}
              onTouchStart={(e) => startLongPress(m, e)}
              onTouchEnd={clearLongPress}
              onTouchMove={clearLongPress}
              style={pressedMessageId === m.id ? { transform: 'scale(0.985)', transition: 'transform 120ms ease' } : { transition: 'transform 120ms ease' }}
            >
              {m.reply_to ? (
                <div className={`mb-2 rounded-xl px-3 py-2 border ${mine ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200/60'}`}>
                  <div className="flex items-stretch gap-2">
                    <span className={`w-1 rounded-full ${mine ? 'bg-[#f59e0b]' : 'bg-[#000435]'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[10px] uppercase tracking-wide font-black ${mine ? 'text-[#f59e0b]' : 'text-[#000435]'}`}>
                        Reply to {replyLabel(m.reply_to)}
                      </p>
                      <p className={`text-[11px] leading-relaxed truncate mt-0.5 ${mine ? 'text-white/80' : 'text-slate-500'}`}>{m.reply_to.body || '[Attachment]'}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {m.body ? <p className="text-[13px] sm:text-sm whitespace-pre-wrap leading-relaxed font-medium">{m.body}</p> : null}
              {m.attachment_url ? (
                <a href={`${socketUrl}${m.attachment_url}`} target="_blank" rel="noreferrer" className={`mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-colors ${mine ? 'bg-white/10 hover:bg-white/20 text-[#f59e0b]' : 'bg-slate-50 hover:bg-slate-100 text-[#000435]'}`}>
                  <Paperclip size={14} />
                  Open attachment
                </a>
              ) : null}
            </div>
            
            {/* Action Bar */}
            <div className={`mt-1.5 inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${mine ? 'justify-end' : 'justify-start'} px-1`}>
              {[
                { icon: Reply, title: 'Reply', action: () => setReplyTarget({ id: m.id, sender_name: m.sender_name, body: m.body || (m.attachment_url ? '[Attachment]' : '') }) },
                { icon: Copy, title: 'Copy', action: () => onCopyMessage(m) },
                { icon: Forward, title: 'Forward', action: () => onForwardMessage(m) },
                { icon: SmilePlus, title: 'React', action: () => setReactTargetId((id) => (id === m.id ? null : m.id)) },
              ].map((btn, i) => (
                <button key={i} type="button" onClick={btn.action} className="h-7 w-7 rounded-lg border border-black/5 bg-white shadow-sm text-slate-400 hover:text-[#000435] hover:border-black/10 inline-flex items-center justify-center transition-all hover:scale-105 active:scale-95" title={btn.title}>
                  <btn.icon size={12} />
                </button>
              ))}
            </div>

            {reactTargetId === m.id ? (
              <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-black/10 shadow-lg bg-white/90 backdrop-blur-md px-3 py-1.5 ${mine ? 'self-end' : 'self-start'}`}>
                {['👍', '❤️', '😂', '😮', '🙏'].map((emoji) => (
                  <button key={emoji} type="button" onClick={() => onReactMessage(m, emoji)} className="text-base hover:scale-125 hover:-translate-y-1 transition-all" title={`React ${emoji}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <div className={`mt-1 text-[9px] font-bold uppercase tracking-wider ${mine ? 'text-[#000435]/50' : 'text-slate-400'} px-1 flex items-center`}>
              <span>{formatTime(m.created_at)}</span>
              {mine ? (
                <CheckCheck
                  size={14}
                  className="inline-block ml-1"
                  color={Array.isArray(m.read_by) && m.read_by.some((r) => r?.participant_type !== m.sender_type) ? '#f59e0b' : '#cbd5e1'}
                />
              ) : null}
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  const chatPanel = (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-white rounded-3xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-[#000435] to-[#0a116b] text-white text-sm sm:text-base font-black flex items-center justify-center shadow-md shrink-0">
            {initialsOf(activeThread?.other_participant?.name || 'CH')}
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-black text-[#000435] truncate leading-tight">
              {activeThread?.other_participant?.name || (isParent ? 'Parent Chat' : 'Staff Chat')}
            </div>
            <div className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-0.5 ${activeThread ? 'text-[#f59e0b]' : 'text-slate-400'}`}>
              {activeThread ? 'Conversation active' : 'Select a conversation'}
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-wide text-slate-500">
          {roleCode || 'User'}
        </span>
      </div>

      {/* Search Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="relative group">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#000435] transition-colors" />
          <input
            value={messageSearch}
            onChange={(e) => setMessageSearch(e.target.value)}
            placeholder="Search inside this conversation..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-black/5 bg-white text-sm font-semibold focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/10 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Group Info */}
      {activeGroupInfo ? (
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-[#f8fbff]">
          <div className="rounded-2xl border border-black/5 bg-white p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 shadow-sm">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Members</p>
              <p className="text-sm font-black text-[#000435]">{Number(activeGroupInfo.member_count || 0)}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Scope</p>
              <p className="text-xs font-black text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-md inline-block">{String(activeGroupInfo.scope_badge || 'GROUP').replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Created By</p>
              <p className="text-xs font-bold text-slate-700 truncate">{activeGroupInfo.created_by || 'Manager'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Last Active</p>
              <p className="text-xs font-bold text-slate-700">{activeGroupInfo.last_active ? new Intl.DateTimeFormat(undefined, {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}).format(new Date(activeGroupInfo.last_active)) : '—'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Chat Area */}
      <div ref={msgListRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6 bg-[#f8f9fc] scroll-smooth">
        {activeThread ? (
          <>
            {renderMessages()}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 mt-4 text-xs font-bold text-[#f59e0b] bg-[#f59e0b]/10 px-4 py-2 rounded-full w-fit">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-bounce" style={{ animationDelay: '0ms' }}/>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-bounce" style={{ animationDelay: '150ms' }}/>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-bounce" style={{ animationDelay: '300ms' }}/>
                </div>
                <span>{typingUsers.join(', ')} typing</span>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500">
            <div className="h-20 w-20 rounded-[28px] bg-white border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-[#000435]/20 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300">
              <MessageSquare size={36} />
            </div>
            <div className="text-center">
              <p className="font-black text-lg text-[#000435]">Your Workspace Chat</p>
              <p className="text-xs font-bold text-slate-400 mt-1">Select a conversation from the sidebar to begin.</p>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="p-4 sm:p-6 border-t border-slate-100 bg-white">
        {replyTarget ? (
          <div className="mb-3 rounded-2xl border border-[#000435]/10 bg-[#f8f9fc] px-4 py-3 flex items-start justify-between gap-3 shadow-sm animate-[fadeIn_.2s_ease-out]">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#f59e0b] inline-flex items-center gap-1.5 mb-0.5">
                <Reply size={12} /> Replying to {replyTarget.sender_name || 'Message'}
              </p>
              <p className="text-xs font-medium text-slate-600 truncate">{replyTarget.body || '[Attachment]'}</p>
            </div>
            <button type="button" onClick={() => setReplyTarget(null)} className="h-7 w-7 shrink-0 rounded-lg bg-white border border-black/5 text-slate-400 hover:text-red-500 hover:border-red-100 inline-flex items-center justify-center transition-colors">
              <X size={14} />
            </button>
          </div>
        ) : null}
        
        <div className="flex items-end gap-2 sm:gap-3 rounded-2xl border border-black/10 bg-[#f8f9fc] p-2 focus-within:border-[#000435]/30 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#000435]/5 transition-all shadow-sm">
          <label className="h-10 w-10 shrink-0 rounded-xl hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer text-slate-400 hover:text-[#000435] transition-colors mb-0.5">
            <Paperclip size={18} />
            <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
          </label>
          <textarea
            value={draft}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={onComposerKeyDown}
            disabled={!activeThread?.id}
            placeholder={activeThread?.id ? 'Write a message...' : 'Select a conversation first...'}
            rows={draft.split('\n').length > 1 ? Math.min(draft.split('\n').length, 5) : 1}
            className="flex-1 bg-transparent text-sm sm:text-base font-medium outline-none text-slate-800 placeholder:text-slate-400 resize-none py-2.5 min-h-[44px] leading-relaxed custom-scrollbar"
          />
          <button 
            type="button" 
            onClick={submit} 
            disabled={!activeThread?.id || loadingUpload || (!draft.trim() && !attachment)} 
            className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl bg-gradient-to-br from-[#000435] to-[#0a116b] text-white inline-flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all hover:shadow-lg hover:scale-105 active:scale-95 mb-0.5"
          >
            {loadingUpload ? <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full"/> : <Send size={18} className="ml-1" />}
          </button>
        </div>
        
        <div className="mt-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400">
            <span className="hidden sm:inline">Press <kbd className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">Enter</kbd> to send</span>
            <span className="hidden sm:inline">•</span>
            <span><kbd className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-500">Shift+Enter</kbd> for new line</span>
          </div>
          {attachment && <span className="text-[10px] sm:text-xs font-black text-[#f59e0b] flex items-center gap-1"><Paperclip size={12}/> {attachment.name}</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen sm:h-[calc(100vh-60px)] max-w-full overflow-hidden bg-[#f0f2f9] flex flex-col p-2 sm:p-4 lg:p-6 font-sans">
      {/* Top Navigation */}
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0 px-1">
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="inline-flex items-center gap-2 rounded-xl bg-white shadow-sm border border-black/5 px-4 py-2.5 text-xs sm:text-sm font-black text-[#000435] hover:border-[#000435]/20 hover:bg-[#000435]/5 transition-all"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border shadow-sm ${socketState === 'socket' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${socketState === 'socket' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
            {socketState === 'socket' ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto overflow-hidden grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)] gap-4 lg:gap-6">
        
        {/* Sidebar */}
        <div className={`bg-white rounded-3xl border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] min-h-0 min-w-0 flex flex-col ${isMobile && mobileThreadOpen ? 'hidden' : 'flex'}`}>
          
          {/* Sidebar Tabs */}
          <div className="p-4 border-b border-slate-100 shrink-0">
            <h2 className="text-xl font-black text-[#000435] mb-4">Messages</h2>
            <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl">
              <button 
                onClick={() => setSidebarTab('inbox')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${sidebarTab === 'inbox' ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <MessageSquare size={14}/> Inbox {threads.reduce((a,b) => a + (b.unread_count || 0), 0) > 0 && <span className="w-2 h-2 rounded-full bg-red-500"/>}
              </button>
              <button 
                onClick={() => setSidebarTab('directory')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${sidebarTab === 'directory' ? 'bg-white text-[#000435] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Users size={14}/> Directory
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative bg-slate-50/30">
            {sidebarTab === 'inbox' ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
                {threads.length === 0 ? (
                  <div className="text-center p-6 text-slate-400 text-sm font-bold">No conversations yet. Check the directory to start one!</div>
                ) : threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => openThread(thread)}
                    className={`w-full group rounded-2xl border p-3 text-left transition-all ${Number(activeThread?.id) === Number(thread.id) ? 'border-[#000435]/20 bg-gradient-to-r from-[#000435]/5 to-transparent shadow-sm' : 'border-black/5 hover:border-[#000435]/10 hover:bg-white bg-white hover:shadow-md'}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-10 h-10 shrink-0 rounded-[14px] flex items-center justify-center text-sm font-black text-white shadow-sm ${thread.thread_type === 'GROUP' ? 'bg-[#f59e0b]' : 'bg-[#000435]'}`}>
                          {thread.thread_type === 'GROUP' ? <Users size={18}/> : initialsOf(thread.other_participant?.name || 'CH')}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[13px] font-black truncate ${Number(activeThread?.id) === Number(thread.id) ? 'text-[#000435]' : 'text-slate-700'}`}>
                            {thread.thread_name || thread.other_participant?.name || 'Conversation'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              {thread.thread_type === 'GROUP' ? (thread.thread_scope ? String(thread.thread_scope).replace(/_/g, ' ') : 'Group') : 'Direct'}
                            </span>
                            {thread.unread_count > 0 && <span className="text-[10px] font-black bg-red-500 text-white rounded-full px-1.5 py-0.5 shadow-sm leading-none">{thread.unread_count}</span>}
                          </div>
                        </div>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); setConfirmRemoveThread(thread); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setConfirmRemoveThread(thread); } }}
                        className="opacity-0 group-hover:opacity-100 shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Remove conversation"
                      >
                        <Trash2 size={14} />
                      </span>
                    </div>
                    <p className={`text-[11px] truncate mt-2 pl-12 font-medium ${thread.unread_count > 0 ? 'text-[#000435] font-black' : 'text-slate-500'}`}>
                      {thread.last_message_preview || 'No messages yet'}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 pb-2 shrink-0">
                  <div className="relative mb-3 group">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#000435] transition-colors" />
                    <input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Search staff..." className="w-full h-10 pl-9 pr-4 rounded-xl border border-black/5 bg-white text-sm font-semibold focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/20 outline-none shadow-sm transition-all" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select value={staffRoleGroup} onChange={(e) => setStaffRoleGroup(e.target.value)} className="w-full h-9 pl-8 pr-3 rounded-xl border border-black/5 bg-white text-xs font-bold shadow-sm outline-none appearance-none">
                        {roleGroups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {canManageGroups && (
                    <button
                      type="button"
                      onClick={() => setShowCreateGroup(true)}
                      className="mt-3 w-full h-10 rounded-xl bg-gradient-to-r from-[#000435] to-[#0a116b] text-white text-xs font-black tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                      <Users size={14}/> Create Group
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
                  <div className="px-2 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff List</div>
                  {staff.map((item) => {
                    const key = `U:${item.id}`;
                    const online = !!onlineMap[key];
                    return (
                      <button key={item.id} type="button" onClick={() => openDirect(item.id)} className="w-full group rounded-2xl border border-black/5 bg-white p-3 text-left hover:border-[#000435]/20 hover:shadow-md transition-all flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[14px] bg-slate-100 flex items-center justify-center text-sm font-black text-slate-500 group-hover:bg-[#000435] group-hover:text-white transition-colors relative">
                          {initialsOf(`${item.first_name} ${item.last_name}`)}
                          {online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-black text-[#000435] truncate">{item.first_name} {item.last_name}</p>
                          <span className={`mt-1 inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${roleBadge(item.role_code || item.role_name)}`}>
                            {item.role_name || item.role_code}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Chat Panel */}
        <div className="hidden lg:flex min-h-0 flex-col h-full">
          {chatPanel}
        </div>
      </div>

      {/* Mobile Thread View (Bottom Sheet / Overlay) */}
      {isMobile && mobileThreadOpen && (
        <div className="lg:hidden fixed inset-0 z-[120] bg-[#000435]/40 backdrop-blur-sm transition-opacity duration-300">
          <div
            className="absolute inset-x-0 top-6 bottom-0 bg-white rounded-t-[32px] flex flex-col overflow-hidden shadow-[0_-8px_40px_rgb(0,0,0,0.12)] transition-transform duration-300 ease-out"
            style={{ transform: `translateY(${sheetOffset}px)` }}
          >
            <div 
              className="pt-3 pb-2 bg-white relative flex justify-center items-center cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={onSheetTouchStart}
              onTouchMove={onSheetTouchMove}
              onTouchEnd={onSheetTouchEnd}
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-200" />
              <button type="button" onClick={() => setMobileThreadOpen(false)} className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-slate-100 text-slate-500 inline-flex items-center justify-center active:scale-95 transition-transform">
                <X size={14} />
              </button>
            </div>
            {chatPanel}
          </div>
        </div>
      )}

      {/* Modals */}
      {confirmRemoveThread && (
        <div className="fixed inset-0 z-[140] bg-[#000435]/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_.2s_ease-out]">
          <div className="w-full max-w-sm rounded-[24px] bg-white shadow-2xl p-6 transform transition-all">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 size={24} />
            </div>
            <p className="text-xl font-black text-[#000435] mb-2">Remove conversation?</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              This will remove <span className="font-bold text-slate-900">{confirmRemoveThread?.other_participant?.name || 'this conversation'}</span> from your inbox. You can't undo this action.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmRemoveThread(null)} className="flex-1 h-11 rounded-xl border border-black/10 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const threadId = confirmRemoveThread?.id;
                  setConfirmRemoveThread(null);
                  await onRemoveThread(threadId);
                }}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 shadow-md hover:shadow-lg transition-all"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateGroup && (
        <div className="fixed inset-0 z-[150] bg-[#000435]/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[24px] bg-white shadow-2xl overflow-hidden animate-[fadeIn_.2s_ease-out]">
            <div className="px-6 py-4 border-b border-black/5 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#000435] to-[#0a116b] text-white flex items-center justify-center shadow-sm">
                  <Users size={18}/>
                </div>
                <div>
                  <p className="text-base font-black text-[#000435]">Create Broadcast Group</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]">Manager Only</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowCreateGroup(false)} className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 inline-flex items-center justify-center transition-colors">
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1">Group Name</label>
                  <input
                    value={groupForm.name}
                    onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. All Parents Updates"
                    className="mt-1.5 w-full h-11 rounded-xl border border-black/10 px-4 text-sm font-bold focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/10 outline-none shadow-sm transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1">Scope</label>
                  <select
                    value={groupForm.scope}
                    onChange={(e) => setGroupForm((p) => ({ ...p, scope: e.target.value, memberUserIds: [], parentPhones: '' }))}
                    className="mt-1.5 w-full h-11 rounded-xl border border-black/10 px-4 text-sm font-bold focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/10 outline-none shadow-sm transition-all bg-white"
                  >
                    {groupScopes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="mt-4 p-3 rounded-xl bg-white border border-black/5 shadow-sm flex items-center justify-around text-center">
                <div>
                  <p className="text-xs font-black text-[#000435]">{groupOptions?.all_parents?.count || 0}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Parents</p>
                </div>
                <div className="w-px h-8 bg-slate-100"/>
                <div>
                  <p className="text-xs font-black text-[#000435]">{groupOptions?.all_teachers?.count || 0}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Teachers</p>
                </div>
                <div className="w-px h-8 bg-slate-100"/>
                <div>
                  <p className="text-xs font-black text-[#000435]">{groupOptions?.all_staff?.count || 0}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Staff</p>
                </div>
              </div>

              {groupForm.scope === 'CUSTOM' && (
                <div className="mt-6 grid sm:grid-cols-2 gap-5 animate-[fadeIn_.2s_ease-out]">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1">Select Staff Members</label>
                    <div className="mt-1.5 max-h-48 overflow-y-auto border border-black/10 bg-white rounded-xl p-2 space-y-1 shadow-sm custom-scrollbar">
                      {staff.map((s) => {
                        const checked = groupForm.memberUserIds.includes(Number(s.id));
                        return (
                          <label key={s.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#000435]/5' : 'hover:bg-slate-50'}`}>
                            <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${checked ? 'bg-[#f59e0b] border-[#f59e0b] text-white' : 'border-slate-300'}`}>
                              {checked && <CheckCheck size={12}/>}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              className="hidden"
                              onChange={(e) => setGroupForm((p) => ({
                                ...p,
                                memberUserIds: e.target.checked
                                  ? [...p.memberUserIds, Number(s.id)]
                                  : p.memberUserIds.filter((id) => Number(id) !== Number(s.id)),
                              }))}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{s.first_name} {s.last_name}</p>
                              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5 truncate">{s.role_name || s.role_code}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 ml-1">Parent Phones</label>
                    <textarea
                      value={groupForm.parentPhones}
                      onChange={(e) => setGroupForm((p) => ({ ...p, parentPhones: e.target.value }))}
                      placeholder="Enter numbers separated by comma or new line...&#10;e.g. 078xxxxxxx, 079xxxxxxx"
                      className="mt-1.5 flex-1 w-full rounded-xl border border-black/10 bg-white p-4 text-sm font-medium focus:border-[#f59e0b] focus:ring-4 focus:ring-[#f59e0b]/10 outline-none shadow-sm transition-all resize-none min-h-[120px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-black/5 bg-white flex items-center justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setShowCreateGroup(false)} className="h-11 px-5 rounded-xl border border-black/10 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreateGroup}
                disabled={creatingGroup || !groupForm.name.trim()}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#000435] to-[#0a116b] text-white text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2"
              >
                {creatingGroup ? <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/> Creating...</> : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mobileActionMenu && (
        <div className="fixed inset-0 z-[180] bg-[#000435]/20 backdrop-blur-sm sm:hidden animate-[fadeIn_.15s_ease-out]" onClick={() => setMobileActionMenu(null)}>
          <div
            className="absolute rounded-[20px] bg-white shadow-[0_12px_40px_rgb(0,0,0,0.16)] p-2 animate-[tvPop_.2s_ease-out]"
            style={getMenuAnchorStyle(mobileActionMenu)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-black/5 mb-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#f59e0b] mb-0.5 truncate">{mobileActionMenu.message?.sender_name}</p>
              <p className="text-xs font-semibold text-slate-600 truncate">{mobileActionMenu.message?.body || '[Attachment]'}</p>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { icon: Reply, label: 'Reply', action: () => { setReplyTarget({ id: mobileActionMenu.message.id, sender_name: mobileActionMenu.message.sender_name, body: mobileActionMenu.message.body || (mobileActionMenu.message.attachment_url ? '[Attachment]' : '') }); setMobileActionMenu(null); } },
                { icon: Copy, label: 'Copy', action: () => { onCopyMessage(mobileActionMenu.message); setMobileActionMenu(null); } },
                { icon: Forward, label: 'Forward', action: () => { onForwardMessage(mobileActionMenu.message); setMobileActionMenu(null); } },
                { icon: SmilePlus, label: 'React', action: () => { setReactTargetId(mobileActionMenu.message.id); setMobileActionMenu(null); } },
              ].map((btn, i) => (
                <button key={i} type="button" onClick={btn.action} className="flex flex-col items-center justify-center gap-1.5 h-14 rounded-xl hover:bg-slate-50 transition-colors text-slate-500 hover:text-[#000435]">
                  <btn.icon size={16} />
                  <span className="text-[9px] font-bold">{btn.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-black/5 flex justify-between px-2 pb-1">
              {['👍', '❤️', '😂', '😮', '🙏'].map((emoji) => (
                <button key={emoji} type="button" onClick={() => { onReactMessage(mobileActionMenu.message, emoji); setMobileActionMenu(null); }} className="text-xl hover:scale-125 transition-transform">
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}