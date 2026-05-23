/* global self, clients */
// Service worker for Web Push (Ticha Avance). Keep this file at /sw.js (Vite public/).

self.addEventListener('push', (event) => {
  let payload = { title: 'Ticha Avance', body: '', tag: 'ticha-avance', url: '/shule-avance' };
  try {
    if (event.data) {
      const j = event.data.json();
      payload = {
        title: j.title || payload.title,
        body: j.body || '',
        tag: j.tag || payload.tag,
        url: j.url || payload.url,
        icon: j.icon || payload.icon,
        badge: j.badge || payload.badge,
      };
    }
  } catch (_) {
    try {
      const t = event.data && event.data.text();
      if (t) payload.body = t;
    } catch (__) {
      /* ignore */
    }
  }

  const title = payload.title;
  const options = {
    body: payload.body,
    icon: payload.icon || '/babyeyilogo.png',
    badge: payload.badge || '/babyeyilogo.png',
    tag: payload.tag,
    renotify: true,
    data: { url: payload.url || '/shule-avance' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/shule-avance';
  const openUrl = new URL(url, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const c of windowClients) {
        if (c.url === openUrl && 'focus' in c) {
          return c.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(openUrl);
      }
      return undefined;
    })
  );
});
