import { apiFetch, NESA_API } from './api';

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

export async function getNesaPushState() {
  if (!isWebPushEnvironmentSupported()) {
    return { supported: false, permission: 'unsupported', subscribed: false, configured: false };
  }
  let configured = false;
  try {
    const keyRes = await apiFetch(`${NESA_API}/push/vapid-key`);
    configured = !!keyRes.configured && !!keyRes.publicKey;
  } catch {
    configured = false;
  }
  const perm = Notification.permission;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return { supported: true, permission: perm, subscribed: !!sub, configured };
  } catch {
    return { supported: true, permission: perm, subscribed: false, configured };
  }
}

export async function subscribeNesaPush() {
  if (!isWebPushEnvironmentSupported()) {
    throw new Error('This browser does not support Web Push.');
  }
  const keyRes = await apiFetch(`${NESA_API}/push/vapid-key`);
  if (!keyRes.publicKey) {
    throw new Error('Web Push is not configured on the server (VAPID keys).');
  }
  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked in your browser settings.');
  }
  if (Notification.permission === 'default') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw new Error('Notification permission was not granted.');
  }
  const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  await reg.update().catch(() => {});
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey),
  });
  await apiFetch(`${NESA_API}/push/subscribe`, {
    method: 'POST',
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return sub;
}

export async function unsubscribeNesaPush() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const json = sub.toJSON();
  try {
    await apiFetch(`${NESA_API}/push/unsubscribe`, {
      method: 'POST',
      body: JSON.stringify({ endpoint: json.endpoint }),
    });
  } finally {
    await sub.unsubscribe();
  }
}
