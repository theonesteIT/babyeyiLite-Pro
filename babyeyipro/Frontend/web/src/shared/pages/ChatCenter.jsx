import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, CheckCheck, Circle, Copy, FileUp, Filter, Forward, Paperclip, Reply, Search, Send, SmilePlus, Trash2, X,
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
            <div className="flex justify-center my-1">
              <span className="px-3 py-1 rounded-full bg-slate-200/80 text-[10px] font-bold tracking-wide uppercase text-slate-600">
                {dayLabel}
              </span>
            </div>
          )}
          <div className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
            <div className={`text-[10px] mb-1 font-bold ${mine ? 'text-[#000435]/70' : 'text-slate-500'}`}>{m.sender_name}</div>
            <div
              className={`max-w-[82%] rounded-2xl border px-3 py-2 ${mine ? 'bg-[#000435] text-white border-[#000435] rounded-br-md' : 'bg-white border-black/10 text-slate-800 rounded-bl-md'}`}
              onDoubleClick={() => setReplyTarget({ id: m.id, sender_name: m.sender_name, body: m.body || (m.attachment_url ? '[Attachment]' : '') })}
              onTouchStart={(e) => startLongPress(m, e)}
              onTouchEnd={clearLongPress}
              onTouchMove={clearLongPress}
              style={pressedMessageId === m.id ? { transform: 'scale(0.985)', transition: 'transform 120ms ease' } : undefined}
            >
              {m.reply_to ? (
                <div className={`mb-2 rounded-lg px-2 py-1 border ${mine ? 'bg-white/10 border-white/25' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-stretch gap-2">
                    <span className={`w-[3px] rounded-full ${mine ? 'bg-amber-200' : 'bg-[#000435]'}`} />
                    <div className="min-w-0">
                      <p className={`text-[10px] leading-[1.1] font-black ${mine ? 'text-amber-200' : 'text-[#000435]'}`}>
                    Reply to {replyLabel(m.reply_to)}
                      </p>
                      <p className={`text-[11px] leading-[1.2] truncate ${mine ? 'text-white/80' : 'text-slate-500'}`}>{m.reply_to.body || '[Attachment]'}</p>
                    </div>
                  </div>
                </div>
              ) : null}
              {m.body ? <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.body}</p> : null}
              {m.attachment_url ? (
                <a href={`${socketUrl}${m.attachment_url}`} target="_blank" rel="noreferrer" className={`mt-2 inline-flex items-center gap-1 text-xs font-bold underline ${mine ? 'text-amber-200' : 'text-[#000435]'}`}>
                  <Paperclip size={12} />
                  Open attachment
                </a>
              ) : null}
            </div>
            <div className={`mt-1 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition ${mine ? 'justify-end' : 'justify-start'}`}>
              <button type="button" onClick={() => setReplyTarget({ id: m.id, sender_name: m.sender_name, body: m.body || (m.attachment_url ? '[Attachment]' : '') })} className="h-6 w-6 rounded-md border border-black/10 bg-white text-slate-500 hover:text-[#000435] inline-flex items-center justify-center" title="Reply">
                <Reply size={12} />
              </button>
              <button type="button" onClick={() => onCopyMessage(m)} className="h-6 w-6 rounded-md border border-black/10 bg-white text-slate-500 hover:text-[#000435] inline-flex items-center justify-center" title="Copy">
                <Copy size={12} />
              </button>
              <button type="button" onClick={() => onForwardMessage(m)} className="h-6 w-6 rounded-md border border-black/10 bg-white text-slate-500 hover:text-[#000435] inline-flex items-center justify-center" title="Forward">
                <Forward size={12} />
              </button>
              <button type="button" onClick={() => setReactTargetId((id) => (id === m.id ? null : m.id))} className="h-6 w-6 rounded-md border border-black/10 bg-white text-slate-500 hover:text-[#000435] inline-flex items-center justify-center" title="React">
                <SmilePlus size={12} />
              </button>
            </div>
            {reactTargetId === m.id ? (
              <div className={`mt-1 inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1 ${mine ? 'self-end' : 'self-start'}`}>
                {['👍', '❤️', '😂', '😮', '🙏'].map((emoji) => (
                  <button key={emoji} type="button" onClick={() => onReactMessage(m, emoji)} className="text-sm hover:scale-110 transition" title={`React ${emoji}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
            <div className={`mt-1 text-[10px] ${mine ? 'text-[#000435]/70' : 'text-slate-500'}`}>
              <span>{formatTime(m.created_at)}</span>
              {mine ? (
                <CheckCheck
                  size={12}
                  className="inline-block ml-1"
                  color={Array.isArray(m.read_by) && m.read_by.some((r) => r?.participant_type !== m.sender_type) ? '#38bdf8' : '#94a3b8'}
                />
              ) : null}
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  const chatPanel = (
    <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-[#000435] text-white text-xs font-black flex items-center justify-center">
            {initialsOf(activeThread?.other_participant?.name || 'CH')}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black text-[#000435] truncate">
              {activeThread?.other_participant?.name || (isParent ? 'Parent Chat' : 'Staff Chat')}
            </div>
            <div className={`text-[11px] font-semibold ${activeThread ? 'text-emerald-600' : 'text-slate-500'}`}>
              {activeThread ? 'Conversation active' : 'Select a conversation'}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{roleCode || 'User'}</span>
      </div>

      <div className="p-3 border-b border-black/5 bg-white">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={messageSearch}
            onChange={(e) => setMessageSearch(e.target.value)}
            placeholder="Search inside this conversation..."
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-black/10 text-xs font-semibold focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/10 outline-none"
          />
        </div>
      </div>

      {activeGroupInfo ? (
        <div className="px-3 py-2 border-b border-black/5 bg-[#f8fbff]">
          <div className="rounded-xl border border-[#000435]/10 bg-white px-3 py-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="font-black text-slate-500 uppercase tracking-wide">Members</p>
              <p className="font-black text-[#000435]">{Number(activeGroupInfo.member_count || 0)}</p>
            </div>
            <div>
              <p className="font-black text-slate-500 uppercase tracking-wide">Scope</p>
              <p className="font-black text-[#000435]">{String(activeGroupInfo.scope_badge || 'GROUP').replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="font-black text-slate-500 uppercase tracking-wide">Created By</p>
              <p className="font-bold text-slate-700 truncate">{activeGroupInfo.created_by || 'Manager'}</p>
            </div>
            <div>
              <p className="font-black text-slate-500 uppercase tracking-wide">Last Active</p>
              <p className="font-bold text-slate-700">{activeGroupInfo.last_active ? new Date(activeGroupInfo.last_active).toLocaleString() : '—'}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={msgListRef} className="flex-1 min-h-0 overflow-auto p-4 bg-[#f6f8fc] space-y-3">
        {activeThread ? (
          <>
            {renderMessages()}
            {typingUsers.length > 0 && (
              <div className="text-xs font-semibold text-slate-500 italic">{typingUsers.join(', ')} typing...</div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500">
            <div className="h-14 w-14 rounded-2xl bg-[#e9edf9] text-[#000435] flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <p className="font-black text-sm">Open a conversation to start chatting</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-black/5 bg-white">
        {replyTarget ? (
          <div className="mb-2 rounded-lg border border-[#000435]/20 bg-[#eef2ff] px-3 py-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-black text-[#000435] inline-flex items-center gap-1"><Reply size={11} /> Replying to {replyTarget.sender_name || 'Message'}</p>
              <p className="text-[11px] text-slate-600 truncate">{replyTarget.body || '[Attachment]'}</p>
            </div>
            <button type="button" onClick={() => setReplyTarget(null)} className="h-6 w-6 rounded-md border border-[#000435]/20 text-slate-500 inline-flex items-center justify-center">
              <X size={12} />
            </button>
          </div>
        ) : null}
        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-[#f7f9fd] px-3 py-2 focus-within:border-[#4f6ef7] focus-within:ring-2 focus-within:ring-[#4f6ef7]/10">
          <textarea
            value={draft}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={onComposerKeyDown}
            disabled={!activeThread?.id}
            placeholder={activeThread?.id ? 'Type message...' : 'Select staff/thread first'}
            rows={2}
            className="flex-1 bg-transparent text-sm font-semibold outline-none text-slate-800 placeholder:text-slate-400 resize-none"
          />
          <label className="h-8 w-8 rounded-lg hover:bg-[#e8edfb] inline-flex items-center justify-center cursor-pointer text-slate-500 hover:text-[#000435] transition">
            <FileUp size={14} />
            <input type="file" className="hidden" onChange={(e) => setAttachment(e.target.files?.[0] || null)} />
          </label>
          <button type="button" onClick={submit} disabled={!activeThread?.id || loadingUpload} className="h-8 w-8 rounded-lg bg-[#000435] text-white inline-flex items-center justify-center disabled:opacity-50">
            <Send size={13} />
          </button>
        </div>
        {attachment && <p className="mt-2 text-[11px] font-bold text-slate-600">Attachment: {attachment.name}</p>}
        {loadingUpload && <p className="mt-2 text-[11px] font-bold text-amber-600">Uploading attachment...</p>}
        <p className="mt-2 text-[10px] font-semibold text-slate-500">
          Enter to send • Ctrl+Alt+Enter for new line
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full bg-[#f1f4fb] p-3 sm:p-4 lg:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(dashboardPath)}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-black/10 px-3 py-2 text-xs sm:text-sm font-black text-[#000435] hover:border-[#000435]/30 hover:bg-[#000435]/5 transition"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </button>
        <div className={`text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full ${socketState === 'socket' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {socketState}
        </div>
      </div>

      <div className="h-[calc(100%-48px)] grid grid-cols-1 lg:grid-cols-[280px_320px_1fr] xl:grid-cols-[300px_340px_1fr] gap-3">
        <div className={`bg-white rounded-2xl border border-black/5 shadow-sm min-h-0 flex flex-col ${isMobile && mobileThreadOpen ? 'hidden' : ''}`}>
          <div className="px-4 pt-4 pb-2 border-b border-black/5">
            <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-500">Directory</p>
            <p className="text-sm font-black text-[#000435] mt-1">{selectedSchoolName}</p>
          </div>
          <div className="p-3">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} placeholder="Search staff..." className="w-full h-9 pl-9 pr-3 rounded-lg border border-black/10 text-sm font-semibold focus:border-[#4f6ef7] focus:ring-2 focus:ring-[#4f6ef7]/10 outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-500" />
              <select value={staffRoleGroup} onChange={(e) => setStaffRoleGroup(e.target.value)} className="h-8 rounded-lg border border-black/10 px-2 text-xs font-bold w-full">
                {roleGroups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
            </div>
            {canManageGroups && (
              <button
                type="button"
                onClick={() => setShowCreateGroup(true)}
                className="mt-2 w-full h-9 rounded-lg bg-[#000435] text-white text-xs font-black tracking-wide"
              >
                + Create Group
              </button>
            )}
          </div>
          <div className="flex-1 overflow-auto px-3 pb-3 space-y-2">
            {staff.map((item) => {
              const key = `U:${item.id}`;
              const online = !!onlineMap[key];
              return (
                <button key={item.id} type="button" onClick={() => openDirect(item.id)} className="w-full rounded-xl border border-black/10 px-3 py-2 text-left hover:border-[#000435]/25 hover:bg-[#f5f8ff] transition">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-slate-800 truncate pr-2">{item.first_name} {item.last_name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black ${online ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Circle size={8} fill="currentColor" />
                      {online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <span className={`mt-1 inline-block px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${roleBadge(item.role_code || item.role_name)}`}>
                    {item.role_name || item.role_code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`bg-white rounded-2xl border border-black/5 shadow-sm min-h-0 flex flex-col ${isMobile && mobileThreadOpen ? 'hidden' : ''}`}>
          <div className="px-4 py-4 border-b border-black/5">
            <p className="text-sm font-black text-[#000435]">Inbox</p>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => openThread(thread)}
                className={`w-full rounded-xl border px-3 py-2 text-left transition ${Number(activeThread?.id) === Number(thread.id) ? 'border-[#000435]/30 bg-[#000435]/5' : 'border-black/10 hover:border-[#000435]/20 hover:bg-[#f5f8ff]'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-800 truncate">
                    {thread.thread_name || thread.other_participant?.name || 'Conversation'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {thread.unread_count > 0 && <span className="text-[10px] font-black bg-red-100 text-red-700 rounded-full px-2 py-0.5">{thread.unread_count}</span>}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); setConfirmRemoveThread(thread); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setConfirmRemoveThread(thread); } }}
                      className="inline-flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Remove conversation"
                    >
                      <Trash2 size={13} />
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-1">
                  {thread.thread_type === 'GROUP' ? (thread.thread_scope ? String(thread.thread_scope).replace(/_/g, ' ') : 'Group') : 'Direct'} · {thread.last_message_preview || 'No messages yet'}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex min-h-0">
          {chatPanel}
        </div>
      </div>

      {isMobile && mobileThreadOpen && (
        <div className="lg:hidden fixed inset-0 z-[120] bg-black/30 backdrop-blur-[2px]">
          <div
            className="absolute inset-x-0 top-0 bottom-0 bg-white rounded-t-3xl flex flex-col overflow-hidden transition-transform duration-200"
            style={{ transform: `translateY(${sheetOffset}px)` }}
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
          >
            <div className="pt-2 pb-1 border-b border-black/5 bg-white relative">
              <div className="mx-auto w-10 h-1.5 rounded-full bg-slate-300" />
              <button type="button" onClick={() => setMobileThreadOpen(false)} className="absolute right-3 top-2 h-8 w-8 rounded-lg border border-black/10 text-slate-500 inline-flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            {chatPanel}
          </div>
        </div>
      )}

      {confirmRemoveThread && (
        <div className="fixed inset-0 z-[140] bg-black/35 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-black/10 shadow-2xl p-4 sm:p-5">
            <p className="text-sm font-black text-slate-900">Remove conversation?</p>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              This will remove <span className="font-bold text-slate-900">{confirmRemoveThread?.other_participant?.name || 'this conversation'}</span> from your inbox.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setConfirmRemoveThread(null)} className="h-9 px-3 rounded-lg border border-black/10 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const threadId = confirmRemoveThread?.id;
                  setConfirmRemoveThread(null);
                  await onRemoveThread(threadId);
                }}
                className="h-9 px-3 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateGroup && (
        <div className="fixed inset-0 z-[150] bg-black/35 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-black/10 shadow-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm sm:text-base font-black text-slate-900">Create Group Broadcast</p>
              <button type="button" onClick={() => setShowCreateGroup(false)} className="h-8 w-8 rounded-lg border border-black/10 inline-flex items-center justify-center text-slate-500">
                <X size={14} />
              </button>
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-slate-600">Group Name</label>
                <input
                  value={groupForm.name}
                  onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. All Parents Updates"
                  className="mt-1 w-full h-10 rounded-lg border border-black/10 px-3 text-sm font-semibold"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-600">Scope</label>
                <select
                  value={groupForm.scope}
                  onChange={(e) => setGroupForm((p) => ({ ...p, scope: e.target.value, memberUserIds: [], parentPhones: '' }))}
                  className="mt-1 w-full h-10 rounded-lg border border-black/10 px-3 text-sm font-semibold"
                >
                  {groupScopes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-2 text-[11px] font-bold text-slate-500">
              Parents: {groupOptions?.all_parents?.count || 0} · Teachers: {groupOptions?.all_teachers?.count || 0} · Staff: {groupOptions?.all_staff?.count || 0}
            </div>

            {groupForm.scope === 'CUSTOM' && (
              <div className="mt-3 grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-slate-600">Select Staff Members</label>
                  <div className="mt-1 max-h-44 overflow-auto border border-black/10 rounded-lg p-2 space-y-1">
                    {staff.map((s) => {
                      const checked = groupForm.memberUserIds.includes(Number(s.id));
                      return (
                        <label key={s.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setGroupForm((p) => ({
                              ...p,
                              memberUserIds: e.target.checked
                                ? [...p.memberUserIds, Number(s.id)]
                                : p.memberUserIds.filter((id) => Number(id) !== Number(s.id)),
                            }))}
                          />
                          <span>{s.first_name} {s.last_name} ({s.role_name || s.role_code})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600">Parent Phones (comma/new line)</label>
                  <textarea
                    value={groupForm.parentPhones}
                    onChange={(e) => setGroupForm((p) => ({ ...p, parentPhones: e.target.value }))}
                    rows={8}
                    placeholder="078xxxxxxx, 079xxxxxxx"
                    className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowCreateGroup(false)} className="h-9 px-3 rounded-lg border border-black/10 text-xs font-bold text-slate-600">
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreateGroup}
                disabled={creatingGroup || !groupForm.name.trim()}
                className="h-9 px-3 rounded-lg bg-[#000435] text-white text-xs font-bold disabled:opacity-50"
              >
                {creatingGroup ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
      {mobileActionMenu && (
        <div className="fixed inset-0 z-[180] bg-black/18 sm:hidden" onClick={() => setMobileActionMenu(null)}>
          <div
            className="absolute rounded-2xl bg-white border border-black/10 shadow-2xl p-2 animate-[fadeIn_.12s_ease-out]"
            style={getMenuAnchorStyle(mobileActionMenu)}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-2 py-1 text-[11px] font-black text-slate-500 truncate">
              {mobileActionMenu.message?.sender_name}: {mobileActionMenu.message?.body || '[Attachment]'}
            </p>
            <div className="grid grid-cols-4 gap-1 mt-1">
              <button type="button" onClick={() => { setReplyTarget({ id: mobileActionMenu.message.id, sender_name: mobileActionMenu.message.sender_name, body: mobileActionMenu.message.body || (mobileActionMenu.message.attachment_url ? '[Attachment]' : '') }); setMobileActionMenu(null); }} className="h-10 rounded-lg border border-black/10 text-[11px] font-bold text-slate-700 inline-flex items-center justify-center gap-1"><Reply size={12} />Reply</button>
              <button type="button" onClick={() => { onCopyMessage(mobileActionMenu.message); setMobileActionMenu(null); }} className="h-10 rounded-lg border border-black/10 text-[11px] font-bold text-slate-700 inline-flex items-center justify-center gap-1"><Copy size={12} />Copy</button>
              <button type="button" onClick={() => { onForwardMessage(mobileActionMenu.message); setMobileActionMenu(null); }} className="h-10 rounded-lg border border-black/10 text-[11px] font-bold text-slate-700 inline-flex items-center justify-center gap-1"><Forward size={12} />Forward</button>
              <button type="button" onClick={() => { setReactTargetId(mobileActionMenu.message.id); setMobileActionMenu(null); }} className="h-10 rounded-lg border border-black/10 text-[11px] font-bold text-slate-700 inline-flex items-center justify-center gap-1"><SmilePlus size={12} />React</button>
            </div>
            <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2 py-1">
              {['👍', '❤️', '😂', '😮', '🙏'].map((emoji) => (
                <button key={emoji} type="button" onClick={() => { onReactMessage(mobileActionMenu.message, emoji); setMobileActionMenu(null); }} className="text-base hover:scale-110 transition">
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
