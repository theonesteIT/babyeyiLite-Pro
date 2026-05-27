import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Loader2, X } from 'lucide-react';
import { apiFetch } from '../utils/api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function DistrictNotificationBell({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/district/babyeyi/notifications?limit=30');
      setItems(Array.isArray(r.data) ? r.data : []);
      setUnread(Number(r.unread) || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const markRead = async (id) => {
    try {
      await apiFetch(`/district/babyeyi/notifications/${id}/read`, { method: 'PATCH' });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch('/district/babyeyi/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  const handleClick = (n) => {
    if (!n.isRead) markRead(n.id);
    setOpen(false);
    if (n.entityType === 'babyeyi' && onNavigate) {
      onNavigate('list');
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#fde68a] bg-amber-50 text-amber-800 transition hover:bg-amber-100"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-[#fde68a] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#fde68a] bg-[#000435] px-4 py-3">
            <span className="text-sm font-bold text-amber-400">Notifications</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="rounded-lg p-1.5 text-amber-200 hover:bg-white/10"
                  title="Mark all read"
                >
                  <Check size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-amber-200 hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No notifications yet</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`flex w-full flex-col gap-0.5 border-b border-gray-100 px-4 py-3 text-left transition hover:bg-amber-50/80 ${
                    !n.isRead ? 'bg-amber-50/60' : ''
                  }`}
                >
                  <span className="text-xs font-bold text-[#000435]">{n.title}</span>
                  {n.body && (
                    <span className="line-clamp-2 text-[11px] text-gray-600">{n.body}</span>
                  )}
                  <span className="text-[10px] text-amber-700">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
