// ================================================================
// ParentShellContext — theme (light / dark / system) + notifications
// Scoped to parent dashboard routes only.
// ================================================================

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_THEME = "babyeyi_parent_theme";
const STORAGE_NOTIFS = "babyeyi_parent_notifications_v1";
const API = import.meta.env.VITE_API_URL || "http://localhost:5100";

const ParentShellContext = createContext(null);

function loadThemeMode() {
  try {
    const v = localStorage.getItem(STORAGE_THEME);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch { /* ignore */ }
  return "system";
}

function resolveTheme(mode) {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function defaultNotifications() {
  const now = Date.now();
  return [
    {
      id: "welcome",
      title: "Welcome to Babyeyi Parent",
      body: "Search by student code or SDM ID in the header, explore Services for Classkit, and track school applications anytime.",
      createdAt: new Date(now - 86400000).toISOString(),
      read: false,
    },
    {
      id: "classkit-tip",
      title: "Order Classkit in a few taps",
      body: "Open Services → Classkit voucher to choose your child, review supplies, delivery, and payment (demo flow).",
      createdAt: new Date(now - 3600000).toISOString(),
      read: false,
    },
  ];
}

function loadNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFS);
    if (!raw) return defaultNotifications();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultNotifications();
    return parsed;
  } catch {
    return defaultNotifications();
  }
}

function saveNotifications(items) {
  try {
    localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(items));
  } catch { /* ignore */ }
}

export function ParentShellProvider({ children }) {
  const [themeMode, setThemeModeState] = useState(loadThemeMode);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(loadThemeMode()));
  const [notifications, setNotifications] = useState(loadNotifications);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_THEME, themeMode);
    } catch { /* ignore */ }
    setResolvedTheme(resolveTheme(themeMode));
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== "system") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(resolveTheme("system"));
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themeMode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/parent-portal/notifications?limit=40`, {
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success || !Array.isArray(json.data) || cancelled) return;
        setNotifications((prev) => {
          const existing = new Set((prev || []).map((n) => String(n.id)));
          const incoming = json.data
            .map((n) => ({
              id: `srv-${n.id}`,
              title: n.title || "Notification",
              body: n.body || "",
              createdAt: n.created_at || new Date().toISOString(),
              read: !!n.read,
            }))
            .filter((n) => !existing.has(String(n.id)));
          if (!incoming.length) return prev;
          const next = [...incoming, ...prev];
          saveNotifications(next);
          return next;
        });
      } catch {
        // silent: local notifications still work
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeMode = useCallback((mode) => {
    if (mode === "light" || mode === "dark" || mode === "system") setThemeModeState(mode);
  }, []);

  const cycleThemeMode = useCallback(() => {
    setThemeModeState((m) => (m === "system" ? "light" : m === "light" ? "dark" : "system"));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next);
      return next;
    });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }, []);

  const addNotification = useCallback((item) => {
    setNotifications((prev) => {
      const row = {
        id: item.id || `n-${Date.now()}`,
        title: item.title,
        body: item.body,
        createdAt: item.createdAt || new Date().toISOString(),
        read: false,
      };
      const next = [row, ...prev];
      saveNotifications(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      themeMode,
      setThemeMode,
      cycleThemeMode,
      resolvedTheme,
      notifications,
      notificationsOpen,
      setNotificationsOpen,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      addNotification,
    }),
    [
      themeMode,
      setThemeMode,
      cycleThemeMode,
      resolvedTheme,
      notifications,
      notificationsOpen,
      unreadCount,
      markNotificationRead,
      markAllNotificationsRead,
      addNotification,
    ]
  );

  return <ParentShellContext.Provider value={value}>{children}</ParentShellContext.Provider>;
}

export function useParentShell() {
  const ctx = useContext(ParentShellContext);
  if (!ctx) throw new Error("useParentShell must be used within ParentShellProvider");
  return ctx;
}
