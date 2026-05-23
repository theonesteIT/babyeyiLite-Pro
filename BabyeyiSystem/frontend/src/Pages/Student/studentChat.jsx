/**
 * StudentChat.jsx — Modern student chat dashboard
 * Babyeyi Smart School System · #000435 navy + amber accent
 * Matches the professional chat design from the reference image
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Send, Paperclip, Smile, Phone, Video,
  Info, X, Check, CheckCheck, Circle, MoreVertical, Pin,
  Users, Bell, BellOff, Trash2, Image, FileText, Link2,
  Mic, ChevronDown, Plus, Filter, Moon, Sun, Settings,
  GraduationCap, BookOpen, MessageSquare, Clock,
} from "lucide-react";
import {
  getSessionMe, getThreads, getMessages, markRead, sendMessage,
  getStaff, createDirectThread,
  uploadAttachment, socketUrl, getChatSchools,
} from "../services/chatApi";

/* ─── helpers ────────────────────────────────────────────────── */
function parseDate(v) { const d = new Date(v || ""); return isNaN(d) ? null : d; }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function formatTime(v) { const d = parseDate(v); if (!d) return ""; return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d); }
function formatDayLabel(v) {
  const d = parseDate(v); if (!d) return "";
  const now = new Date(), yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, yesterday)) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "2-digit", month: "short" }).format(d);
}
function initialsOf(name = "") { return String(name).trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join(""); }
function avatarColor(name = "") {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
  let h = 0; for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
}
function resolveAttachmentUrl(url) {
  if (!url) return "";
  if (String(url).startsWith("http")) return String(url);
  return `${socketUrl}${url}`;
}
function isImageAttachment(url = "") {
  const u = String(url || "").toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].some((ext) => u.includes(ext));
}
function lastSeenText(ts) {
  if (!ts) return "Away";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Away · just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `Away · ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Away · ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `Away · ${days}d ago`;
}

/** Whether this message was sent by the current session (student user, parent phone, or student proxy). */
function messageIsFromMe(m, me) {
  if (!m || !me) return false;
  if (Number(m.sender_user_id) > 0 && Number(me.id) > 0 && Number(m.sender_user_id) === Number(me.id)) {
    return true;
  }
  if (String(m.sender_type || "").toUpperCase() === "PARENT") {
    const sp = String(m.sender_parent_phone || "").trim();
    if (!sp) return false;
    if (sp.toLowerCase().startsWith("student:")) {
      const sid = Number(sp.split(":")[1] || 0);
      return sid > 0 && Number(me.student_id || 0) === sid;
    }
    const phones = [me.parent_phone, me.phone].filter(Boolean).map((p) => String(p).trim());
    return phones.some((p) => p === sp);
  }
  return false;
}

/* ─── Avatar ─────────────────────────────────────────────────── */
function Avatar({ name = "", size = 40, online = false, src }) {
  const initials = initialsOf(name);
  const bg = avatarColor(name);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="rounded-full w-full h-full object-cover" />
      ) : (
        <div className="rounded-full w-full h-full flex items-center justify-center text-white font-black text-xs" style={{ background: bg, fontSize: size * 0.35 }}>
          {initials}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" style={{ width: size * 0.28, height: size * 0.28 }}/>
      )}
    </div>
  );
}

/* ─── Thread item ────────────────────────────────────────────── */
function ThreadItem({ thread, active, onClick, me, onlineMap }) {
  const name = thread.thread_name || thread.other_participant?.name || "Conversation";
  const preview = thread.last_message_preview || "No messages yet";
  const time = formatTime(thread.last_message_at || thread.updated_at);
  const unread = thread.unread_count || 0;
  const isGroup = thread.thread_type === "GROUP";
  const online =
    thread?.other_participant?.participant_type === "USER"
      ? !!onlineMap?.[`U:${thread?.other_participant?.user_id}`]
      : !!thread.other_participant?.is_online;

  return (
    <button type="button" onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all relative ${
        active ? "bg-[#f0f2ff] border-r-[3px] border-[#000435]" : "hover:bg-slate-50 border-r-[3px] border-transparent"
      }`}>
      {isGroup ? (
        <div className="relative flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Users size={18} className="text-white"/>
        </div>
      ) : (
        <Avatar name={name} size={44} online={online}/>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={`text-sm font-bold truncate ${active ? "text-[#000435]" : "text-slate-800"}`}>{name}</span>
          <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-[12px] text-slate-500 truncate font-medium">{preview}</p>
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[20px] h-5 rounded-full bg-[#000435] text-white text-[10px] font-black flex items-center justify-center px-1.5">{unread}</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Message bubble ─────────────────────────────────────────── */
function MessageBubble({ m, mine, showSender, prevMine, onReply }) {
  const [menuPos, setMenuPos] = useState(null);
  const holdTimerRef = useRef(null);
  const bubbleBg = mine ? "bg-[#000435] text-white" : "bg-white text-slate-800 border border-slate-200";
  const roundedClass = mine
    ? `rounded-2xl rounded-br-md`
    : `rounded-2xl rounded-bl-md`;

  const openMenuAtEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX || (rect.left + rect.width / 2);
    const y = event.clientY || (rect.top + 10);
    setMenuPos({ x, y });
  };

  const clearHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"} ${prevMine === mine ? "mt-0.5" : "mt-4"}`}
      onContextMenu={(e) => { e.preventDefault(); openMenuAtEvent(e); }}
      onTouchStart={(e) => {
        clearHold();
        const touch = e.touches?.[0];
        holdTimerRef.current = setTimeout(() => {
          if (touch) openMenuAtEvent({ currentTarget: e.currentTarget, clientX: touch.clientX, clientY: touch.clientY });
        }, 500);
      }}
      onTouchEnd={clearHold}
      onTouchCancel={clearHold}>
      {showSender && !mine && (
        <span className="text-[11px] font-bold text-slate-500 mb-1 ml-1">{m.sender_name}</span>
      )}
      <div className="relative flex items-end gap-2">
        {!mine && !prevMine && <Avatar name={m.sender_name || ""} size={28}/>}
        {!mine && prevMine === false && <div className="w-7 flex-shrink-0"/>}

        <div className={`max-w-[68%] px-4 py-2.5 shadow-sm ${bubbleBg} ${roundedClass}`}>
          {m.reply_to && (
            <div className={`mb-2 pl-2 border-l-2 ${mine ? "border-amber-300" : "border-[#000435]"} rounded`}>
              <p className={`text-[10px] font-black mb-0.5 ${mine ? "text-amber-200" : "text-[#000435]"}`}>↩ {m.reply_to.sender_name || "Reply"}</p>
              <p className={`text-[11px] truncate ${mine ? "text-white/70" : "text-slate-500"}`}>{m.reply_to.body || "[Attachment]"}</p>
            </div>
          )}
          {m.body && <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>}
          {m.attachment_url && (
            isImageAttachment(m.attachment_url) ? (
              <a href={resolveAttachmentUrl(m.attachment_url)} target="_blank" rel="noreferrer" className="mt-2 block">
                <img
                  src={resolveAttachmentUrl(m.attachment_url)}
                  alt="attachment"
                  className="max-w-[220px] max-h-[240px] rounded-xl border border-white/20 object-cover"
                />
              </a>
            ) : (
              <a href={resolveAttachmentUrl(m.attachment_url)} target="_blank" rel="noreferrer"
                className={`mt-2 flex items-center gap-2 text-xs font-bold underline ${mine ? "text-amber-200" : "text-[#000435]"}`}>
                <Paperclip size={12}/>Attachment
              </a>
            )
          )}
        </div>

        {menuPos && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-20 cursor-default"
              onClick={() => setMenuPos(null)}
              aria-label="Close message actions"
            />
            <div
              className="fixed z-30 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 min-w-[130px]"
              style={{ left: Math.max(8, menuPos.x - 60), top: Math.max(8, menuPos.y - 8) }}
            >
              <button
                type="button"
                onClick={() => { onReply?.(m); setMenuPos(null); }}
                className="w-full text-left px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reply
              </button>
            </div>
          </>
        )}
      </div>

      <div className={`flex items-center gap-1 mt-1 ${mine ? "justify-end" : "justify-start ml-9"}`}>
        <span className="text-[10px] text-slate-400 font-medium">{formatTime(m.created_at)}</span>
        {mine && (
          <CheckCheck size={12} className={m.read_by?.length > 1 ? "text-blue-500" : "text-slate-400"}/>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function StudentChat({
  dashboardBackPath = "/online-service/dashboard",
  audienceSubtitle = "Stay connected with your teachers",
  hideTopBar = false,
} = {}) {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [chatSessionLoading, setChatSessionLoading] = useState(true);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [staff, setStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState("all");
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [msgSearch, setMsgSearch] = useState("");
  const [tab, setTab] = useState("all"); // all | unread | groups
  const [showInfo, setShowInfo] = useState(false);
  const [dark, setDark] = useState(false);
  const [typing, setTyping] = useState(false);
  const [onlineMap, setOnlineMap] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  const [mobileView, setMobileView] = useState("list"); // list | chat
  const msgListRef = useRef(null);
  const socketRef = useRef(null);
  const [resolvedSchoolId, setResolvedSchoolId] = useState(null);

  const schoolId = resolvedSchoolId || Number(me?.school_id || me?.schoolId || 0) || null;

  const dashPath = dashboardBackPath;

  /* load session + school (parents may not have school_id on session; use /chat/schools) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await getSessionMe();
        if (cancelled) return;
        setMe(m);
        let sid = Number(m?.school_id || m?.schoolId || 0);
        if (!sid) {
          const schools = await getChatSchools().catch(() => []);
          sid = Number(schools[0]?.id || 0);
        }
        if (!cancelled && sid) setResolvedSchoolId(sid);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setChatSessionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!schoolId) return [];
    const list = await getThreads(schoolId).catch(() => []);
    setThreads(list);
    if (!activeThread && list[0]) setActiveThread(list[0]);
    return list;
  }, [schoolId, activeThread]);

  /* load threads */
  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  /* load all school staff for new chat */
  useEffect(() => {
    if (!schoolId) return;
    getStaff(schoolId, staffSearch.trim(), "all").then(setStaff).catch(() => setStaff([]));
  }, [schoolId, staffSearch]);

  /* load messages */
  useEffect(() => {
    if (!schoolId || !activeThread?.id) return;
    getMessages(schoolId, activeThread.id, msgSearch).then(async (list) => {
      setMessages(list);
      markRead(schoolId, activeThread.id).catch(() => {});
      await refreshThreads();
    }).catch(() => {});
  }, [schoolId, activeThread?.id, msgSearch, refreshThreads]);

  /* scroll to bottom */
  useEffect(() => {
    if (msgListRef.current) msgListRef.current.scrollTop = msgListRef.current.scrollHeight;
  }, [messages]);

  /* socket */
  useEffect(() => {
    if (!schoolId) return;
    let sock = null, mounted = true;
    (async () => {
      try {
        const { io } = await import("socket.io-client");
        sock = io(socketUrl, { withCredentials: true, transports: ["websocket","polling"] });
        socketRef.current = sock;
        sock.on("connect", () => {
          sock.emit("chat:presence-subscribe", { school_id: Number(schoolId) });
        });
        sock.on("chat:new-message", (payload) => {
          if (!mounted) return;
          refreshThreads();
          if (Number(payload?.thread_id) === Number(activeThread?.id)) {
            getMessages(schoolId, activeThread.id, msgSearch).then(setMessages).catch(() => {});
          }
        });
        sock.on("chat:presence-changed", (payload) => {
          const key =
            payload?.participant_type === "USER"
              ? `U:${payload?.user_id}`
              : `P:${payload?.parent_phone}`;
          if (!key) return;
          const isOnline = payload?.status === "online";
          setOnlineMap((p) => ({ ...p, [key]: isOnline }));
          if (!isOnline) setLastSeenMap((p) => ({ ...p, [key]: Date.now() }));
        });
        sock.on("chat:typing", (payload) => {
          if (Number(payload?.thread_id) === Number(activeThread?.id)) {
            setTyping(!!payload?.is_typing);
            if (payload?.is_typing) setTimeout(() => setTyping(false), 2000);
          }
        });
      } catch {}
    })();
    return () => { mounted = false; sock?.disconnect(); };
  }, [schoolId, activeThread?.id, msgSearch, refreshThreads]);

  /* fallback sync (ensure unread counts always refresh) */
  useEffect(() => {
    if (!schoolId) return;
    const timer = setInterval(() => {
      refreshThreads();
    }, 10000);
    return () => clearInterval(timer);
  }, [schoolId, refreshThreads]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const openThread = (t) => {
    setActiveThread(t);
    if (isMobile) setMobileView("chat");
  };

  const submit = async () => {
    if (!activeThread?.id || (!draft.trim() && !attachment)) return;
    let attachmentUrl = null;
    if (attachment) {
      setLoadingUpload(true);
      const up = await uploadAttachment(attachment).catch(() => ({}));
      attachmentUrl = up?.url || null;
      setLoadingUpload(false);
    }
    const text = draft.trim();
    setDraft(""); setAttachment(null);
    await sendMessage(
      Number(schoolId),
      Number(activeThread.id),
      text,
      attachmentUrl,
      replyTarget?.id || null
    ).catch(() => {});
    setReplyTarget(null);
    const list = await getMessages(schoolId, activeThread.id, msgSearch).catch(() => []);
    setMessages(list);
    await refreshThreads();
  };

  const startDirectChat = async (staffUserId) => {
    if (!schoolId || !staffUserId) return;
    const created = await createDirectThread(Number(schoolId), Number(staffUserId)).catch(() => null);
    const tlist = await refreshThreads();
    const createdThreadId = Number(created?.thread_id || 0);
    const opened =
      (createdThreadId > 0 && tlist.find((t) => Number(t.id) === createdThreadId)) ||
      tlist.find((t) => Number(t.other_participant?.user_id || 0) === Number(staffUserId));
    if (opened) {
      setActiveThread(opened);
      if (isMobile) setMobileView("chat");
    }
  };

  const filteredThreads = useMemo(() => {
    let list = threads;
    if (tab === "unread") list = list.filter(t => t.unread_count > 0);
    if (tab === "groups") list = list.filter(t => t.thread_type === "GROUP");
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => (t.thread_name || t.other_participant?.name || "").toLowerCase().includes(q));
    }
    return list;
  }, [threads, tab, searchQuery]);

  const schoolName = useMemo(() => {
    return String(
      me?.school_name ||
      me?.school?.school_name ||
      me?.school?.name ||
      activeThread?.school_name ||
      "School Directory"
    ).toUpperCase();
  }, [me, activeThread]);

  const roleOptions = useMemo(() => {
    const raw = Array.from(new Set(staff.map((s) => String(s.role_code || "STAFF"))));
    return ["all", ...raw];
  }, [staff]);

  const visibleStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return staff.filter((s) => {
      const roleCode = String(s.role_code || "STAFF");
      if (staffRoleFilter !== "all" && roleCode !== staffRoleFilter) return false;
      const name = `${s.first_name || ""} ${s.last_name || ""}`.trim().toLowerCase();
      return !q || name.includes(q) || roleCode.toLowerCase().replace(/_/g, " ").includes(q);
    });
  }, [staff, staffSearch, staffRoleFilter]);

  const unreadTotal = threads.reduce((sum, t) => sum + Number(t.unread_count || 0), 0);
  const activeIsGroup = activeThread?.thread_type === "GROUP";
  const activeName = activeThread?.thread_name || activeThread?.other_participant?.name || "Chat";
  const activeOnline =
    activeThread?.other_participant?.participant_type === "USER"
      ? !!onlineMap[`U:${activeThread?.other_participant?.user_id}`]
      : !!activeThread?.other_participant?.is_online;
  const activeSeen =
    activeThread?.other_participant?.participant_type === "USER"
      ? lastSeenMap[`U:${activeThread?.other_participant?.user_id}`]
      : null;

  /* Sidebar */
  const Sidebar = (
    <div className={`flex flex-col bg-white border-r border-slate-200 ${isMobile ? "w-full h-full" : "w-[340px]"} flex-shrink-0`}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-[#000435]">Chat</h2>
            <p className="text-xs text-slate-500 font-medium">{audienceSubtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDark(d => !d)} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition">
              {dark ? <Sun size={15}/> : <Moon size={15}/>}
            </button>
            <button className="w-9 h-9 rounded-xl bg-[#000435] flex items-center justify-center text-white hover:bg-[#000870] transition">
              <Plus size={15}/>
            </button>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages or users..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:bg-slate-200 transition"/>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-3 border-b border-slate-100">
        {[["all","All"],["unread",`Unread ${unreadTotal > 0 ? unreadTotal : ""}`],["groups","Groups"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 h-8 rounded-lg text-[12px] font-bold transition-all ${
              tab === key ? "bg-[#000435] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
            }`}>{label}</button>
        ))}
      </div>

      <div className="px-3 py-3 border-b border-slate-100 bg-white max-h-[300px] overflow-auto space-y-2">
        {visibleStaff.map((s, idx) => {
          const staffName = `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Staff";
          const role = String(s.role_code || "STAFF").replace(/_/g, " ");
          const online = !!onlineMap[`U:${s.id}`];
          const seen = lastSeenMap[`U:${s.id}`];
          const rolePill = idx % 2 === 0 ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700";
          return (
            <button
              key={`${s.id}-${s.role_code || ""}`}
              type="button"
              onClick={() => startDirectChat(s.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#f8fafc] hover:bg-slate-100 transition text-left"
            >
              <Avatar name={staffName} size={44} online={online}/>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-slate-800 truncate">{staffName}</p>
                <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${rolePill}`}>{role}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Circle size={8} className={`${online ? "text-emerald-500 fill-emerald-500" : "text-slate-400 fill-slate-400"}`}/>
                <span className="text-[11px] font-bold">{online ? "Online" : lastSeenText(seen)}</span>
              </div>
            </button>
          );
        })}
        {visibleStaff.length === 0 && (
          <p className="text-[11px] text-slate-400 px-2 py-2">No staff found for this school.</p>
        )}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-auto divide-y divide-slate-100/80">
        {/* Pinned section */}
        {filteredThreads.some(t => t.pinned) && (
          <div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50">
              <Pin size={11} className="text-slate-400"/>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pinned</span>
            </div>
            {filteredThreads.filter(t => t.pinned).map(t => (
              <ThreadItem key={t.id} thread={t} active={activeThread?.id === t.id} onClick={() => openThread(t)} me={me} onlineMap={onlineMap}/>
            ))}
          </div>
        )}

        {/* Recent */}
        <div>
          {filteredThreads.some(t => !t.pinned) && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50">
              <Clock size={11} className="text-slate-400"/>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recent</span>
            </div>
          )}
          {filteredThreads.filter(t => !t.pinned).map(t => (
            <ThreadItem key={t.id} thread={t} active={activeThread?.id === t.id} onClick={() => openThread(t)} me={me} onlineMap={onlineMap}/>
          ))}
        </div>

        {filteredThreads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <MessageSquare size={32} className="mb-3 opacity-30"/>
            <p className="text-sm font-semibold">No conversations found</p>
          </div>
        )}
      </div>

    </div>
  );

  /* Chat panel */
  const ChatPanel = (
    <div className="flex-1 min-w-0 flex flex-col bg-[#f6f8fc]">
      {activeThread ? (
        <>
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-slate-200 shadow-sm">
            {isMobile && (
              <button onClick={() => setMobileView("list")} className="mr-1 text-slate-500 hover:text-[#000435] transition">
                <ArrowLeft size={20}/>
              </button>
            )}
            <Avatar name={activeName} size={40} online={activeOnline}/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-[#000435] truncate">{activeName}</p>
              <p className={`text-[11px] font-semibold ${activeOnline ? "text-emerald-600" : "text-slate-400"}`}>
                {typing ? <span className="text-amber-600 animate-pulse">Typing...</span> : activeOnline ? "● Online" : lastSeenText(activeSeen)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"><Phone size={16}/></button>
              <button className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"><Video size={16}/></button>
              <button onClick={() => setShowInfo(s => !s)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${showInfo ? "bg-[#000435] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}><Info size={16}/></button>
            </div>
          </div>

          {/* Messages */}
          <div ref={msgListRef} className="flex-1 overflow-auto px-4 py-5 space-y-0.5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-[#e9edf9] flex items-center justify-center mb-3">
                  <MessageSquare size={28} className="text-[#000435]/40"/>
                </div>
                <p className="text-sm font-bold">Start the conversation!</p>
              </div>
            )}
            {(() => {
              let prevDay = "", prevMine = null, prevSender = null;
              return messages.map((m, i) => {
                const mine = messageIsFromMe(m, me);
                const dayLabel = formatDayLabel(m.created_at);
                const showDay = dayLabel !== prevDay;
                const showSender = !mine && m.sender_name !== prevSender;
                const pMine = prevMine;
                prevDay = dayLabel; prevMine = mine; prevSender = m.sender_name;
                return (
                  <React.Fragment key={m.id}>
                    {showDay && (
                      <div className="flex justify-center my-4">
                        <span className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-500 shadow-sm">{dayLabel}</span>
                      </div>
                    )}
                    <MessageBubble
                      m={m}
                      mine={mine}
                      showSender={showSender}
                      prevMine={pMine}
                      onReply={(msg) => setReplyTarget({ id: msg.id, sender_name: msg.sender_name, body: msg.body || "[Attachment]" })}
                    />
                  </React.Fragment>
                );
              });
            })()}
          </div>

          {/* Composer */}
          <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-200">
            {replyTarget && (
              <div className="flex items-center justify-between gap-2 mb-2 px-3 py-2 bg-slate-100 rounded-xl border border-slate-200">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-[#000435] mb-0.5">Replying to {replyTarget.sender_name || "message"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{replyTarget.body || "[Attachment]"}</p>
                </div>
                <button type="button" onClick={() => setReplyTarget(null)} className="text-slate-400 hover:text-slate-700">
                  <X size={14}/>
                </button>
              </div>
            )}
            {attachment && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
                <Paperclip size={13} className="text-amber-600"/>
                <span className="text-xs font-bold text-amber-700 truncate flex-1">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="text-amber-500 hover:text-amber-700"><X size={13}/></button>
              </div>
            )}
            <div className="flex items-end gap-2 bg-slate-100 rounded-2xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-[#000435]/15 transition">
              <label className="text-slate-400 hover:text-[#000435] cursor-pointer transition pb-0.5">
                <Paperclip size={18}/>
                <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" className="hidden" onChange={e => setAttachment(e.target.files?.[0] || null)}/>
              </label>
              <textarea value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder="Type a message..." rows={1}
                className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none resize-none max-h-32"/>
              <button className="text-slate-400 hover:text-[#000435] pb-0.5 transition"><Smile size={18}/></button>
              <button type="button" onClick={submit} disabled={!draft.trim() && !attachment}
                className="w-9 h-9 rounded-xl bg-[#000435] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#000870] transition shadow-sm">
                {loadingUpload ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Send size={15}/>}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <div className="w-20 h-20 rounded-3xl bg-[#e9edf9] flex items-center justify-center mb-4">
            <GraduationCap size={36} className="text-[#000435]/40"/>
          </div>
          <p className="text-base font-black text-slate-600 mb-1">Open a conversation</p>
          <p className="text-sm text-slate-400">Select a thread from the left to start chatting</p>
        </div>
      )}
    </div>
  );

  /* Info panel */
  const InfoPanel = showInfo && activeThread && (
    <div className="w-[280px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-[#000435]">Chat Info</span>
        <button onClick={() => setShowInfo(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"><X size={13}/></button>
      </div>

      <div className="flex flex-col items-center px-5 pt-6 pb-4 border-b border-slate-100">
        <Avatar name={activeName} size={72} online={activeOnline}/>
        <p className="mt-3 text-base font-black text-[#000435]">{activeName}</p>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{activeIsGroup ? "Group Chat" : "Teacher"}</p>
        <div className="flex items-center gap-3 mt-4">
          {[["Call", Phone], ["Video", Video], ["Search", Search], ["More", MoreVertical]].map(([label, Icon]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <button className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-[#000435] hover:text-white transition">
                <Icon size={15}/>
              </button>
              <span className="text-[10px] font-bold text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
        {[["Shared Media","128 files", Image],["Files","24 files", FileText],["Links","12 links", Link2],["Voice Messages","6 messages", Mic]].map(([label, count, Icon]) => (
          <button key={label} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[#000435]"><Icon size={16}/></div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black text-slate-800">{label}</p>
              <p className="text-[10px] text-slate-400 font-medium">{count}</p>
            </div>
            <ChevronDown size={13} className="-rotate-90 text-slate-300"/>
          </button>
        ))}
      </div>

      <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chat Settings</p>
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition">
          <div className="flex items-center gap-2.5">
            <Bell size={15} className="text-slate-500"/>
            <span className="text-xs font-bold text-slate-700">Mute Notifications</span>
          </div>
          <div className="w-9 h-5 rounded-full bg-slate-200 relative cursor-pointer">
            <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition"/>
          </div>
        </div>
        <button className="w-full flex items-center gap-2.5 p-3 rounded-xl text-red-500 hover:bg-red-50 transition">
          <Trash2 size={15}/>
          <span className="text-xs font-bold">Delete Chat</span>
        </button>
      </div>
    </div>
  );

  if (chatSessionLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f4fb] gap-3" style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}>
        <div className="w-10 h-10 border-2 border-[#000435] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-600">Loading messages…</p>
      </div>
    );
  }

  if (!schoolId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f4fb] p-6 text-center" style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}>
        <MessageSquare className="w-14 h-14 text-slate-300 mb-2" />
        <p className="text-lg font-black text-[#000435]">No school linked for chat</p>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          We could not match your account to a school. Add your child in Parent portal or ensure your phone matches the school record.
        </p>
        <button
          type="button"
          onClick={() => navigate(dashPath)}
          className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#000435] text-white text-sm font-bold"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f1f4fb]" style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      {!hideTopBar && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 z-10">
          <button onClick={() => navigate(dashPath)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-[#000435] hover:border-[#000435]/30 hover:bg-[#000435]/5 transition">
            <ArrowLeft size={14}/> Back to dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
              <span className="text-[10px] font-black text-emerald-700">Connected</span>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar: always visible on desktop, conditionally on mobile */}
        {(!isMobile || mobileView === "list") && Sidebar}

        {/* Chat + Info: visible on desktop always, on mobile only when thread open */}
        {(!isMobile || mobileView === "chat") && (
          <div className="flex-1 min-w-0 flex overflow-hidden">
            {ChatPanel}
            {InfoPanel}
          </div>
        )}
      </div>
    </div>
  );
}