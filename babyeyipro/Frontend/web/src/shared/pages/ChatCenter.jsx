/**
 * ChatCenter.jsx — Modern professional school chat (redesigned)
 * Babyeyi Smart School System · #000435 navy + amber
 * Reference design: chat UI with sidebar, thread list, message panel, and info panel
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Building2, CheckCheck, Circle, Copy, FileUp, Filter,
  Forward, Paperclip, Reply, Search, Send, SmilePlus, Trash2, X,
  Users, Bell, BellOff, Phone, Video, Info, MoreVertical, Pin,
  Image, FileText, Link2, Mic, ChevronDown, Plus, Moon, Sun,
  MessageSquare, Clock, Check, Settings, ChevronRight, Loader2,
} from "lucide-react";
import {
  socketUrl, getSessionMe, getSchools, getStaff, getThreads,
  createDirectThread, createGroupThread, getGroupOptions,
  getMessages, markRead, uploadAttachment, sendMessage, removeThread,
} from "../services/chatApi";

const ROLE_GROUPS = [
  { id: "all", label: "All Staff" },
  { id: "teachers", label: "Teachers" },
  { id: "leadership", label: "Leadership" },
  { id: "support", label: "Support" },
];

const GROUP_SCOPES = [
  { id: "ALL_PARENTS", label: "All Parents" },
  { id: "ALL_TEACHERS", label: "All Teachers" },
  { id: "ALL_STAFF", label: "All Staff" },
  { id: "CUSTOM", label: "Custom" },
];

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
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "2-digit", month: "short", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined }).format(d);
}
function initialsOf(name = "") { return String(name).trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join(""); }
function avatarColor(name = "") {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6","#f97316"];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[h % colors.length];
}
function roleBadgeClass(role) {
  const code = String(role || "").toUpperCase();
  if (code.includes("TEACH")) return "bg-emerald-100 text-emerald-700";
  if (code.includes("MANAGER") || code.includes("ADMIN") || code.includes("DOS")) return "bg-indigo-100 text-indigo-700";
  if (code.includes("LIB") || code.includes("ACCOUNT")) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
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

/* ─── Avatar ─────────────────────────────────────────────────── */
function Avatar({ name = "", size = 40, online, src }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={name} className="rounded-full w-full h-full object-cover"/>
      ) : (
        <div className="rounded-full w-full h-full flex items-center justify-center text-white font-black"
          style={{ background: avatarColor(name), fontSize: size * 0.35 }}>
          {initialsOf(name)}
        </div>
      )}
      {online !== undefined && (
        <span className="absolute bottom-0 right-0 rounded-full border-2 border-white"
          style={{ width: size * 0.28, height: size * 0.28, background: online ? "#22c55e" : "#94a3b8" }}/>
      )}
    </div>
  );
}

/* ─── Thread item ────────────────────────────────────────────── */
function ThreadItem({ thread, active, onClick, onDelete, onlineMap }) {
  const name = thread.thread_name || thread.other_participant?.name || "Conversation";
  const unread = thread.unread_count || 0;
  const isGroup = thread.thread_type === "GROUP";
  const online =
    thread?.other_participant?.participant_type === "USER"
      ? !!onlineMap?.[`U:${thread?.other_participant?.user_id}`]
      : !!thread.other_participant?.is_online;
  const time = formatTime(thread.last_message_at || thread.updated_at);
  const preview = thread.last_message_preview || "No messages yet";
  const [hover, setHover] = useState(false);

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className={`relative flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all border-r-[3px] ${
        active ? "bg-[#f0f2ff] border-[#000435]" : "hover:bg-slate-50/80 border-transparent"
      }`} onClick={onClick}>
      {isGroup ? (
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-white"/>
        </div>
      ) : (
        <Avatar name={name} size={44} online={online}/>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className={`text-[13px] font-bold truncate ${active ? "text-[#000435]" : "text-slate-800"}`}>{name}</span>
          <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-[12px] text-slate-500 truncate font-medium leading-none">{preview}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {unread > 0 && <span className="min-w-[20px] h-5 rounded-full bg-[#000435] text-white text-[10px] font-black flex items-center justify-center px-1.5">{unread}</span>}
            {hover && onDelete && (
              <button type="button" onClick={e => { e.stopPropagation(); onDelete(thread); }}
                className="w-6 h-6 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition">
                <Trash2 size={12}/>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Message bubble ─────────────────────────────────────────── */
function MessageBubble({ m, mine, meId, showSender, replyLabelFor, onReply, onCopy, onForward, onReact, reactTargetId, setReactTargetId }) {
  const [hover, setHover] = useState(false);
  const isReactTarget = reactTargetId === m.id;
  const readByOther = Array.isArray(m.read_by) && m.read_by.some((r) => {
    if (r?.participant_type === "USER") {
      return Number(r?.user_id) > 0 && Number(r?.user_id) !== Number(m?.sender_user_id || 0);
    }
    if (r?.participant_type === "PARENT") {
      return String(r?.parent_phone || "") && String(r?.parent_phone || "") !== String(m?.sender_parent_phone || "");
    }
    return false;
  });

  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"} group`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {showSender && !mine && (
        <span className="text-[11px] font-bold text-slate-500 mb-1.5 ml-12">{m.sender_name}</span>
      )}
      <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
        {!mine && <Avatar name={m.sender_name || ""} size={30}/>}

        <div className="max-w-[68%]">
          {/* Bubble */}
          <div className={`px-4 py-2.5 shadow-sm ${
            mine ? "bg-[#000435] text-white rounded-2xl rounded-br-md" : "bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-bl-md"
          }`}>
            {m.reply_to && (
              <div className={`mb-2.5 pl-2.5 border-l-2 ${mine ? "border-amber-300" : "border-[#000435]"}`}>
                <p className={`text-[10px] font-black mb-0.5 ${mine ? "text-amber-200" : "text-[#000435]"}`}>
                  ↩ {replyLabelFor(m.reply_to)}
                </p>
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
                  className={`mt-2 inline-flex items-center gap-1.5 text-xs font-bold underline ${mine ? "text-amber-200" : "text-[#000435]"}`}>
                  <Paperclip size={11}/>Open attachment
                </a>
              )
            )}
          </div>

          {/* Hover actions */}
          {hover && (
            <div className={`flex items-center gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
              {[
                ["Reply", Reply, () => onReply(m)],
                ["Copy", Copy, () => onCopy(m)],
                ["Forward", Forward, () => onForward(m)],
                ["React", SmilePlus, () => setReactTargetId(id => id === m.id ? null : m.id)],
              ].map(([title, Icon, handler]) => (
                <button key={title} type="button" onClick={handler} title={title}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-[#000435] hover:border-[#000435]/30 flex items-center justify-center transition shadow-sm">
                  <Icon size={12}/>
                </button>
              ))}
            </div>
          )}

          {/* Emoji reactions picker */}
          {isReactTarget && (
            <div className={`flex items-center gap-1 mt-1 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-md w-fit ${mine ? "ml-auto" : ""}`}>
              {["👍","❤️","😂","😮","🙏"].map(emoji => (
                <button key={emoji} type="button" onClick={() => onReact(m, emoji)} className="text-base hover:scale-125 transition">{emoji}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className={`flex items-center gap-1 mt-1 ${mine ? "mr-1" : "ml-10"}`}>
        <span className="text-[10px] text-slate-400 font-medium">{formatTime(m.created_at)}</span>
        {mine && (
          readByOther
            ? <CheckCheck size={12} className="text-blue-500"/>
            : <Check size={12} className="text-slate-400"/>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function ChatCenter() {
  const navigate = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState(null);
  const [schools, setSchools] = useState([]);
  const [schoolId, setSchoolId] = useState("");
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [staff, setStaff] = useState([]);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRoleGroup, setStaffRoleGroup] = useState("all");
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineMap, setOnlineMap] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [reactTargetId, setReactTargetId] = useState(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [socketState, setSocketState] = useState("polling");
  const [msgSearch, setMsgSearch] = useState("");
  const [threadSearch, setThreadSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [showInfo, setShowInfo] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupOptions, setGroupOptions] = useState({});
  const [groupForm, setGroupForm] = useState({ name: "", scope: "ALL_PARENTS", memberUserIds: [], parentPhones: "" });
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  const [mobileView, setMobileView] = useState("list"); // list | chat

  const msgListRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimer = useRef(null);

  const roleCode = String(me?.role?.code || me?.role_code || "").toUpperCase();
  const isParent = roleCode === "PARENT";
  const canManageGroups = ["SCHOOL_MANAGER", "SCHOOL_ADMIN", "DOS"].includes(roleCode);

  const dashPath = useMemo(() => {
    const p = String(location.pathname || "").replace(/\/+$/, "");
    if (p.endsWith("/chat")) return p.slice(0, -5) || "/";
    return "/";
  }, [location.pathname]);

  const selectedSchoolName = useMemo(() => schools.find(s => String(s.id) === String(schoolId))?.school_name || "School", [schools, schoolId]);

  /* load me + schools */
  useEffect(() => {
    (async () => {
      try {
        const [session, schoolRows] = await Promise.all([getSessionMe(), getSchools()]);
        setMe(session);
        setSchools(schoolRows);
        if (schoolRows[0]?.id) setSchoolId(String(schoolRows[0].id));
      } catch {}
    })();
  }, []);

  /* load staff */
  useEffect(() => {
    if (!schoolId) return;
    getStaff(schoolId, staffSearch, staffRoleGroup).then(setStaff).catch(() => setStaff([]));
  }, [schoolId, staffSearch, staffRoleGroup]);

  /* load group options */
  useEffect(() => {
    if (!schoolId || !canManageGroups) return;
    getGroupOptions(schoolId).then(setGroupOptions).catch(() => setGroupOptions({}));
  }, [schoolId, canManageGroups]);

  const refreshThreads = useCallback(async (sid) => {
    if (!sid) return;
    const list = await getThreads(sid).catch(() => []);
    setThreads(list);
  }, []);

  const refreshMessages = useCallback(async (sid, threadId, q = "") => {
    if (!sid || !threadId) return;
    const list = await getMessages(sid, threadId, q).catch(() => []);
    setMessages(list);
    await markRead(sid, threadId).catch(() => {});
    refreshThreads(sid);
  }, [refreshThreads]);

  useEffect(() => { if (schoolId) refreshThreads(schoolId); }, [schoolId]);

  useEffect(() => {
    if (!schoolId || !activeThread?.id) return;
    refreshMessages(schoolId, activeThread.id, msgSearch);
  }, [schoolId, activeThread?.id, msgSearch]);

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
          if (!mounted) return;
          setSocketState("socket");
          sock.emit("chat:presence-subscribe", { school_id: Number(schoolId) });
          if (activeThread?.id) sock.emit("chat:join-thread", { school_id: Number(schoolId), thread_id: Number(activeThread.id) });
        });
        sock.on("disconnect", () => { if (mounted) setSocketState("polling"); });
        sock.on("chat:new-message", (payload) => {
          if (!mounted || Number(payload?.school_id) !== Number(schoolId)) return;
          refreshThreads(schoolId);
          if (Number(payload?.thread_id) === Number(activeThread?.id)) refreshMessages(schoolId, activeThread.id, msgSearch);
        });
        sock.on("chat:typing", (payload) => {
          if (!mounted || Number(payload?.thread_id) !== Number(activeThread?.id)) return;
          const label = payload?.sender?.type === "USER" ? `Staff ${payload?.sender?.user_id}` : "Someone";
          if (payload?.is_typing) setTypingUsers(p => Array.from(new Set([...p, label])));
          else setTypingUsers(p => p.filter(x => x !== label));
        });
        sock.on("chat:presence-changed", (payload) => {
          if (!mounted || Number(payload?.school_id) !== Number(schoolId)) return;
          const key = payload?.identity?.type === "USER" ? `U:${payload?.identity?.user_id}` : `P:${payload?.identity?.parent_phone}`;
          const isOnline = payload?.status === "online";
          setOnlineMap(p => ({ ...p, [key]: isOnline }));
          if (!isOnline) setLastSeenMap(p => ({ ...p, [key]: Date.now() }));
        });
      } catch { if (mounted) setSocketState("polling"); }
    })();
    return () => { mounted = false; sock?.disconnect(); };
  }, [schoolId, activeThread?.id, msgSearch]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const openThread = (thread) => {
    setActiveThread(thread);
    setReplyTarget(null);
    setReactTargetId(null);
    if (isMobile) setMobileView("chat");
  };

  const openDirect = async (userId) => {
    const out = await createDirectThread(Number(schoolId), Number(userId)).catch(() => null);
    if (!out?.thread_id) return;
    await refreshThreads(schoolId);
    setActiveThread(p => p?.id === out.thread_id ? p : { id: out.thread_id });
    if (socketRef.current) socketRef.current.emit("chat:join-thread", { school_id: Number(schoolId), thread_id: Number(out.thread_id) });
    if (isMobile) setMobileView("chat");
    setReplyTarget(null);
  };

  const onType = (value) => {
    setDraft(value);
    if (!activeThread?.id || !socketRef.current) return;
    socketRef.current.emit("chat:typing", { school_id: Number(schoolId), thread_id: Number(activeThread.id), is_typing: true });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socketRef.current?.emit("chat:typing", { school_id: Number(schoolId), thread_id: Number(activeThread.id), is_typing: false }), 1200);
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
    await sendMessage(Number(schoolId), Number(activeThread.id), text, attachmentUrl, replyTarget?.id || null).catch(() => {});
    setReplyTarget(null);
    await refreshMessages(schoolId, activeThread.id, msgSearch);
  };

  const onCopy = async (m) => {
    const txt = m?.body || (m?.attachment_url ? `${socketUrl}${m.attachment_url}` : "");
    if (txt) await navigator.clipboard.writeText(txt).catch(() => {});
  };

  const onForward = (m) => {
    const txt = [m?.body, m?.attachment_url ? `${socketUrl}${m.attachment_url}` : ""].filter(Boolean).join(" ");
    if (txt) setDraft(p => p ? `${p}\n↪ ${txt}` : `↪ ${txt}`);
  };

  const onReact = async (m, emoji) => {
    if (!activeThread?.id || !emoji) return;
    await sendMessage(Number(schoolId), Number(activeThread.id), emoji, null, m?.id || null).catch(() => {});
    setReactTargetId(null);
    await refreshMessages(schoolId, activeThread.id, msgSearch);
  };

  const onRemoveThread = async (threadId) => {
    if (!threadId || !schoolId) return;
    await removeThread(Number(schoolId), Number(threadId)).catch(() => {});
    if (Number(activeThread?.id) === Number(threadId)) { setActiveThread(null); setMessages([]); if (isMobile) setMobileView("list"); }
    await refreshThreads(schoolId);
  };

  const onCreateGroup = async () => {
    if (!canManageGroups || !schoolId || !groupForm.name.trim()) return;
    setCreatingGroup(true);
    try {
      const payload = { school_id: Number(schoolId), name: groupForm.name.trim(), scope: groupForm.scope };
      if (groupForm.scope === "CUSTOM") {
        payload.member_user_ids = groupForm.memberUserIds;
        payload.member_parent_phones = String(groupForm.parentPhones || "").split(/[,\n]/).map(x => x.trim()).filter(Boolean);
      }
      const out = await createGroupThread(payload).catch(() => null);
      await refreshThreads(schoolId);
      if (out?.thread_id) setActiveThread({ id: out.thread_id, thread_name: groupForm.name, thread_type: "GROUP" });
      setShowCreateGroup(false);
      setGroupForm({ name: "", scope: "ALL_PARENTS", memberUserIds: [], parentPhones: "" });
    } finally { setCreatingGroup(false); }
  };

  /* derived */
  const filteredThreads = useMemo(() => {
    let list = threads;
    if (tab === "unread") list = list.filter(t => t.unread_count > 0);
    if (tab === "groups") list = list.filter(t => t.thread_type === "GROUP");
    if (threadSearch) { const q = threadSearch.toLowerCase(); list = list.filter(t => (t.thread_name || t.other_participant?.name || "").toLowerCase().includes(q)); }
    return list;
  }, [threads, tab, threadSearch]);

  const unreadTotal = threads.filter(t => t.unread_count > 0).length;
  const activeName = activeThread?.thread_name || activeThread?.other_participant?.name || "Chat";
  const activeOnline =
    activeThread?.other_participant?.participant_type === "USER"
      ? !!onlineMap[`U:${activeThread?.other_participant?.user_id}`]
      : !!activeThread?.other_participant?.is_online;
  const activeSeen =
    activeThread?.other_participant?.participant_type === "USER"
      ? lastSeenMap[`U:${activeThread?.other_participant?.user_id}`]
      : null;
  const activeIsGroup = activeThread?.thread_type === "GROUP";
  const activeGroupInfo = activeThread?.group_info || null;

  const replyLabelFor = (replyTo) => {
    if (!replyTo) return "Message";
    const mine = (replyTo.sender_type === "USER" && Number(replyTo.sender_user_id) === Number(me?.id)) || (replyTo.sender_type === "PARENT" && isParent);
    return mine ? "You" : (replyTo.sender_name || "Message");
  };

  /* ─── Panels ─────────────────────────────────────────────── */

  // Staff directory panel
  const DirectoryPanel = (
    <div className="w-[280px] xl:w-[300px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      <div className="px-4 pt-5 pb-3 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Directory</p>
        <p className="text-sm font-black text-[#000435] mt-0.5">{selectedSchoolName}</p>
      </div>
      <div className="px-3 py-3 space-y-2 border-b border-slate-100">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Search staff..."
            className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 placeholder:text-slate-400 outline-none focus:bg-slate-200 transition"/>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-slate-400 flex-shrink-0"/>
          <select value={staffRoleGroup} onChange={e => setStaffRoleGroup(e.target.value)}
            className="flex-1 h-8 rounded-xl border border-slate-200 px-2 text-xs font-bold text-slate-700 outline-none bg-white">
            {ROLE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>
        {canManageGroups && (
          <button type="button" onClick={() => setShowCreateGroup(true)}
            className="w-full h-9 rounded-xl bg-[#000435] text-white text-xs font-black hover:bg-[#000870] transition flex items-center justify-center gap-1.5">
            <Plus size={13}/>Create Group
          </button>
        )}
      </div>
      <div className="flex-1 overflow-auto py-2 space-y-1 px-2">
        {staff.map(s => {
          const online = !!onlineMap[`U:${s.id}`];
          const seen = lastSeenMap[`U:${s.id}`];
          return (
            <button key={s.id} type="button" onClick={() => openDirect(s.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-left transition">
              <Avatar name={`${s.first_name} ${s.last_name}`} size={36} online={online}/>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-800 truncate">{s.first_name} {s.last_name}</p>
                <span className={`text-[10px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full ${roleBadgeClass(s.role_code || s.role_name)}`}>
                  {s.role_name || s.role_code}
                </span>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold ${online ? "text-emerald-600" : "text-slate-400"}`}>
                <Circle size={7} fill="currentColor"/>
                <span className="hidden xl:inline">{online ? "Online" : lastSeenText(seen)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Inbox panel
  const InboxPanel = (
    <div className="w-[320px] xl:w-[340px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-[#000435]">Chat</h2>
            <p className="text-xs text-slate-500 font-medium">Stay connected with your school community</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`text-[10px] font-black px-2 py-1 rounded-full border ${socketState === "socket" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              {socketState === "socket" ? "● Live" : "● Polling"}
            </div>
          </div>
        </div>
        <div className="relative">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input value={threadSearch} onChange={e => setThreadSearch(e.target.value)} placeholder="Search messages, users, groups..."
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-100 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:bg-slate-200 transition"/>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 border-b border-slate-100">
        {[["all","All"],["unread",`Unread ${unreadTotal || ""}`],["groups","Groups"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 h-8 rounded-xl text-xs font-bold transition-all ${tab === key ? "bg-[#000435] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>
            {label.trim()}
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-auto divide-y divide-slate-100/80">
        {filteredThreads.some(t => t.pinned) && (
          <div>
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/80">
              <Pin size={10} className="text-slate-400"/><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pinned</span>
            </div>
            {filteredThreads.filter(t => t.pinned).map(t => (
              <ThreadItem key={t.id} thread={t} active={Number(activeThread?.id) === Number(t.id)} onClick={() => openThread(t)} onDelete={setConfirmRemove} onlineMap={onlineMap}/>
            ))}
          </div>
        )}
        <div>
          {filteredThreads.some(t => !t.pinned) && (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50/80">
              <Clock size={10} className="text-slate-400"/><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recent</span>
            </div>
          )}
          {filteredThreads.filter(t => !t.pinned).map(t => (
            <ThreadItem key={t.id} thread={t} active={Number(activeThread?.id) === Number(t.id)} onClick={() => openThread(t)} onDelete={setConfirmRemove} onlineMap={onlineMap}/>
          ))}
        </div>
        {filteredThreads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <MessageSquare size={28} className="mb-2 opacity-30"/>
            <p className="text-sm font-semibold">No conversations</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100">
        <button className="w-full h-11 rounded-xl bg-[#000435] text-white text-sm font-black hover:bg-[#000870] transition flex items-center justify-center gap-2 shadow-lg shadow-[#000435]/20">
          <Plus size={16}/> New Chat
        </button>
      </div>
    </div>
  );

  // Chat panel
  const ChatPanel = (
    <div className="flex-1 min-w-0 flex flex-col bg-[#f6f8fc]">
      {activeThread ? (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-slate-200 shadow-sm">
            {isMobile && (
              <button onClick={() => setMobileView("list")} className="text-slate-500 hover:text-[#000435] transition mr-1">
                <ArrowLeft size={20}/>
              </button>
            )}
            <Avatar name={activeName} size={40} online={activeOnline}/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-[#000435] truncate">{activeName}</p>
              <p className={`text-[11px] font-semibold ${activeOnline ? "text-emerald-600" : "text-slate-400"}`}>
                {typingUsers.length > 0 ? <span className="text-amber-500 animate-pulse italic">{typingUsers[0]} typing...</span> : activeOnline ? "● Online" : lastSeenText(activeSeen)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"><Phone size={15}/></button>
              <button className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition"><Video size={15}/></button>
              <button onClick={() => setShowInfo(s => !s)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${showInfo ? "bg-[#000435] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}><Info size={15}/></button>
            </div>
          </div>

          {/* Msg search */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-100">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder="Search inside this conversation..."
                className="w-full h-8 pl-8 pr-3 rounded-xl bg-slate-100 text-xs font-semibold text-slate-600 placeholder:text-slate-400 outline-none focus:bg-slate-200 transition"/>
            </div>
          </div>

          {/* Group info strip */}
          {activeGroupInfo && (
            <div className="px-4 py-2 bg-white border-b border-slate-100">
              <div className="grid grid-cols-4 gap-2 text-[11px]">
                {[
                  ["Members", Number(activeGroupInfo.member_count || 0)],
                  ["Scope", String(activeGroupInfo.scope_badge || "GROUP").replace(/_/g," ")],
                  ["Created by", activeGroupInfo.created_by || "Manager"],
                  ["Last active", activeGroupInfo.last_active ? formatTime(activeGroupInfo.last_active) : "—"],
                ].map(([label, value]) => (
                  <div key={label} className="bg-slate-50 rounded-xl px-2 py-1.5 border border-slate-100">
                    <p className="font-black text-slate-400 uppercase tracking-wide text-[9px]">{label}</p>
                    <p className="font-black text-[#000435] truncate text-xs">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={msgListRef} className="flex-1 min-h-0 overflow-auto px-5 py-5 space-y-2">
            {(() => {
              let prevDay = "", prevMine = null, prevSender = null;
              return messages.map(m => {
                const mine = (m.sender_type === "USER" && Number(m.sender_user_id) === Number(me?.id)) || (m.sender_type === "PARENT" && isParent);
                const dayLabel = formatDayLabel(m.created_at);
                const showDay = dayLabel !== prevDay;
                const showSender = activeIsGroup && !mine && m.sender_name !== prevSender;
                const pMine = prevMine;
                prevDay = dayLabel; prevMine = mine; prevSender = m.sender_name;
                return (
                  <React.Fragment key={m.id}>
                    {showDay && (
                      <div className="flex justify-center my-4">
                        <span className="px-4 py-1.5 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-slate-500 shadow-sm">{dayLabel}</span>
                      </div>
                    )}
                    <MessageBubble m={m} mine={mine} meId={me?.id} showSender={showSender} replyLabelFor={replyLabelFor}
                      onReply={m => setReplyTarget({ id: m.id, sender_name: m.sender_name, body: m.body || (m.attachment_url ? "[Attachment]" : "") })}
                      onCopy={onCopy} onForward={onForward} onReact={onReact}
                      reactTargetId={reactTargetId} setReactTargetId={setReactTargetId}/>
                  </React.Fragment>
                );
              });
            })()}
          </div>

          {/* Composer */}
          <div className="px-4 pb-4 pt-2 bg-white border-t border-slate-200">
            {replyTarget && (
              <div className="flex items-center justify-between gap-2 mb-2.5 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply size={12} className="text-[#000435] flex-shrink-0"/>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-[#000435]">Replying to {replyTarget.sender_name}</p>
                    <p className="text-[11px] text-slate-500 truncate font-medium">{replyTarget.body || "[Attachment]"}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setReplyTarget(null)} className="w-6 h-6 rounded-lg border border-indigo-200 text-slate-500 flex items-center justify-center flex-shrink-0"><X size={11}/></button>
              </div>
            )}
            {attachment && (
              <div className="flex items-center gap-2 mb-2.5 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
                <Paperclip size={12} className="text-amber-600"/>
                <span className="text-xs font-bold text-amber-700 truncate flex-1">{attachment.name}</span>
                <button onClick={() => setAttachment(null)} className="text-amber-500 hover:text-amber-700 flex-shrink-0"><X size={12}/></button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 focus-within:border-[#000435]/30 focus-within:ring-2 focus-within:ring-[#000435]/10 transition">
              <label className="text-slate-400 hover:text-[#000435] cursor-pointer transition pb-0.5 flex-shrink-0">
                <Paperclip size={17}/>
                <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" className="hidden" onChange={e => setAttachment(e.target.files?.[0] || null)}/>
              </label>
              <textarea value={draft} onChange={e => onType(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                disabled={!activeThread?.id} placeholder="Type a message..." rows={2}
                className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none resize-none"/>
              <button className="text-slate-400 hover:text-[#000435] pb-0.5 flex-shrink-0 transition"><SmilePlus size={17}/></button>
              <button type="button" onClick={submit} disabled={(!draft.trim() && !attachment) || loadingUpload}
                className="w-10 h-10 rounded-xl bg-[#000435] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#000870] transition shadow-md flex-shrink-0">
                {loadingUpload ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <div className="w-20 h-20 rounded-3xl bg-[#e9edf9] flex items-center justify-center mb-4">
            <Building2 size={36} className="text-[#000435]/40"/>
          </div>
          <p className="text-base font-black text-slate-600 mb-1">Open a conversation to start chatting</p>
          <p className="text-sm text-slate-400">Select a staff member or thread from the left</p>
        </div>
      )}
    </div>
  );

  // Info panel
  const InfoPanel = showInfo && activeThread && (
    <div className="w-[280px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-sm font-black text-[#000435]">Chat Info</span>
        <button onClick={() => setShowInfo(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition"><X size={13}/></button>
      </div>
      <div className="flex flex-col items-center px-5 pt-6 pb-4 border-b border-slate-100">
        <Avatar name={activeName} size={72} online={activeOnline}/>
        <p className="mt-3 text-base font-black text-[#000435]">{activeName}</p>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5">{activeIsGroup ? "Group Chat" : "Staff Member"}</p>
        <div className="flex items-center gap-3 mt-4">
          {[["Call", Phone],["Video", Video],["Search", Search],["More", MoreVertical]].map(([label, Icon]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <button className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-[#000435] hover:text-white transition">
                <Icon size={15}/>
              </button>
              <span className="text-[10px] font-bold text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-5 py-4 space-y-2">
        {[["Shared Media","128 files",Image],["Files","24 files",FileText],["Links","12 links",Link2],["Voice Messages","6 messages",Mic]].map(([label, count, Icon]) => (
          <button key={label} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[#000435]"><Icon size={16}/></div>
            <div className="flex-1 text-left">
              <p className="text-xs font-black text-slate-800">{label}</p>
              <p className="text-[10px] text-slate-400 font-medium">{count}</p>
            </div>
            <ChevronRight size={13} className="text-slate-300"/>
          </button>
        ))}
      </div>
      <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Chat Settings</p>
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition">
          <div className="flex items-center gap-2.5">
            <Bell size={14} className="text-slate-500"/>
            <span className="text-xs font-bold text-slate-700">Mute Notifications</span>
          </div>
          <div className="w-9 h-5 rounded-full bg-slate-200 relative cursor-pointer"><div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"/></div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition">
          <div className="flex items-center gap-2.5">
            <Clock size={14} className="text-slate-500"/>
            <span className="text-xs font-bold text-slate-700">Disappearing Messages</span>
          </div>
          <span className="text-[11px] font-bold text-slate-400">Off</span>
        </div>
        <button onClick={() => setConfirmRemove(activeThread)} className="w-full flex items-center gap-2.5 p-3 rounded-xl text-red-500 hover:bg-red-50 transition">
          <Trash2 size={14}/><span className="text-xs font-bold">Delete Chat</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#f1f4fb]" style={{ fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>

      {/* Top bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between z-10">
        <button onClick={() => navigate(dashPath)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-[#000435] hover:border-[#000435]/30 hover:bg-[#000435]/5 transition">
          <ArrowLeft size={14}/> Back to dashboard
        </button>
        <div className="flex items-center gap-2">
          {schools.length > 1 && (
            <select value={schoolId} onChange={e => setSchoolId(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 outline-none bg-white">
              {schools.map(s => <option key={s.id} value={String(s.id)}>{s.school_name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Directory — hidden on mobile, always visible on desktop */}
        {!isMobile && DirectoryPanel}

        {/* Inbox — visible on mobile list view or always on desktop */}
        {(!isMobile || mobileView === "list") && InboxPanel}

        {/* Chat + Info */}
        {(!isMobile || mobileView === "chat") && (
          <div className="flex-1 min-w-0 flex overflow-hidden">
            {ChatPanel}
            {!isMobile && InfoPanel}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-2xl p-5">
            <p className="text-sm font-black text-slate-900 mb-1">Remove conversation?</p>
            <p className="text-xs text-slate-500 mb-5">
              This will remove <span className="font-bold text-slate-800">{confirmRemove?.other_participant?.name || "this conversation"}</span> from your inbox.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmRemove(null)} className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={async () => { const id = confirmRemove?.id; setConfirmRemove(null); await onRemoveThread(id); }}
                className="h-9 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition">Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Create group modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-black text-[#000435]">Create Group Broadcast</p>
              <button onClick={() => setShowCreateGroup(false)} className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition"><X size={14}/></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-black text-slate-600 block mb-1.5">Group Name *</label>
                <input value={groupForm.name} onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. All Parents Updates"
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#000435]/40 transition"/>
              </div>
              <div>
                <label className="text-xs font-black text-slate-600 block mb-1.5">Scope</label>
                <select value={groupForm.scope} onChange={e => setGroupForm(p => ({ ...p, scope: e.target.value, memberUserIds: [], parentPhones: "" }))}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#000435]/40 transition bg-white">
                  {GROUP_SCOPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4 text-xs font-bold text-slate-500">
              <span>👥 Parents: {groupOptions?.all_parents?.count || 0}</span>
              <span>📚 Teachers: {groupOptions?.all_teachers?.count || 0}</span>
              <span>🏫 Staff: {groupOptions?.all_staff?.count || 0}</span>
            </div>
            {groupForm.scope === "CUSTOM" && (
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1.5">Select Staff Members</label>
                  <div className="max-h-40 overflow-auto border border-slate-200 rounded-xl p-2 space-y-1">
                    {staff.map(s => {
                      const checked = groupForm.memberUserIds.includes(Number(s.id));
                      return (
                        <label key={s.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-[#000435] py-1">
                          <input type="checkbox" checked={checked} onChange={e => setGroupForm(p => ({ ...p, memberUserIds: e.target.checked ? [...p.memberUserIds, Number(s.id)] : p.memberUserIds.filter(id => Number(id) !== Number(s.id)) }))} className="rounded"/>
                          {s.first_name} {s.last_name} <span className="text-slate-400">({s.role_name || s.role_code})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-600 block mb-1.5">Parent Phones</label>
                  <textarea value={groupForm.parentPhones} onChange={e => setGroupForm(p => ({ ...p, parentPhones: e.target.value }))}
                    rows={6} placeholder="078xxxxxxx, 079xxxxxxx"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-[#000435]/40 transition resize-none"/>
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setShowCreateGroup(false)} className="h-9 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={onCreateGroup} disabled={creatingGroup || !groupForm.name.trim()}
                className="h-9 px-4 rounded-xl bg-[#000435] text-white text-xs font-black hover:bg-[#000870] transition disabled:opacity-50 flex items-center gap-1.5">
                {creatingGroup && <Loader2 size={12} className="animate-spin"/>}
                {creatingGroup ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}