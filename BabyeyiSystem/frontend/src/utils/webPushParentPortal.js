/**
 * Web Push for Babyeyi Parent Portal (/parents/*).
 */

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isWebPushEnvironmentSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Request failed');
  }
  return json;
}

export async function fetchParentPushStatus() {
  const json = await apiFetch('/api/parent-portal/push/status');
  return json.data || {};
}

export async function getParentPushState() {
  if (!isWebPushEnvironmentSupported()) {
    return { supported: false, permission: 'unsupported', subscribed: false, configured: false };
  }
  let serverStatus = { subscribed: false, configured: false };
  try {
    serverStatus = await fetchParentPushStatus();
  } catch {
    /* not logged in or server error */
  }
  const perm = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      return {
        supported: true,
        permission: perm,
        subscribed: !!serverStatus.subscribed,
        configured: true,
        preferences: serverStatus.preferences,
      };
    }
    const sub = await reg.pushManager.getSubscription();
    return {
      supported: true,
      permission: perm,
      subscribed: !!sub && !!serverStatus.subscribed,
      configured: true,
      preferences: serverStatus.preferences,
    };
  } catch {
    return {
      supported: true,
      permission: perm,
      subscribed: !!serverStatus.subscribed,
      configured: true,
      preferences: serverStatus.preferences,
    };
  }
}

export async function subscribeParentPush(preferences = {}) {
  if (!isWebPushEnvironmentSupported()) {
    throw new Error('This browser does not support Web Push.');
  }
  const keyRes = await apiFetch('/api/parent-portal/push/vapid-key');
  if (!keyRes.publicKey) {
    throw new Error('Web Push is not enabled on the server. Ask your school to configure VAPID keys.');
  }
  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked. Enable them in your browser settings for this site.');
  }
  if (Notification.permission === 'default') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') {
      throw new Error('Permission was not granted for notifications.');
    }
  }
  const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  await reg.update().catch(() => {});
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey),
  });
  await apiFetch('/api/parent-portal/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      subscription: sub.toJSON(),
      preferences: {
        notify_fee_reminders: preferences.notify_fee_reminders !== false,
        notify_discipline: preferences.notify_discipline !== false,
        notify_school_activity: preferences.notify_school_activity !== false,
      },
    }),
  });
  return sub;
}

export async function unsubscribeParentPush() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const json = sub.toJSON();
  try {
    await apiFetch('/api/parent-portal/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint: json.endpoint }),
    });
  } finally {
    await sub.unsubscribe();
  }
}

export async function updateParentPushPreferences(preferences) {
  const json = await apiFetch('/api/parent-portal/push/preferences', {
    method: 'PATCH',
    body: JSON.stringify(preferences),
  });
  return json.data;
}
