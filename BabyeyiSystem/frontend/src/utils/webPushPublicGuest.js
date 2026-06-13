/**
 * Web Push for public/guest users (no parent login required).
 */

import { urlBase64ToUint8Array } from './webPushParentPortal';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5100';

export function isPublicGuestPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getOrCreateSubscription() {
  const keyRes = await fetch(`${API}/api/public/push/vapid-key`);
  const keyJson = await keyRes.json().catch(() => ({}));
  if (!keyJson.publicKey) {
    throw new Error('Web Push is not enabled on the server.');
  }
  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked in your browser.');
  }
  if (Notification.permission === 'default') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw new Error('Notification permission was not granted.');
  }
  const reg = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
    });
  }
  return sub;
}

/** Register this device for fee reminders (optionally tied to a student code). */
export async function subscribePublicGuestPush({ studentCode } = {}) {
  if (!isPublicGuestPushSupported()) {
    throw new Error('This browser does not support Web Push.');
  }
  const sub = await getOrCreateSubscription();
  const res = await fetch(`${API}/api/public/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      student_code: studentCode || undefined,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Failed to enable notifications');
  }
  try {
    localStorage.setItem('babyeyi_guest_push_endpoint', sub.endpoint);
  } catch { /* ignore */ }
  return sub;
}

/** Link the current device subscription to a student after partial pay + promise date. */
export async function linkPublicGuestPushToStudent(studentCode) {
  const code = String(studentCode || '').trim();
  if (!code || !isPublicGuestPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    await fetch(`${API}/api/public/push/link-student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        student_code: code,
        subscription: sub.toJSON(),
      }),
    });
  } catch { /* non-blocking */ }
}
