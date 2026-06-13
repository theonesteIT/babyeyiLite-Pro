/* global self, clients */
// Web Push service worker for Ticha Avance (Lite + staff). Served at /sw.js from Vite public/.

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Ticha Avance',
    body: '',
    tag: 'ticha-avance',
    url: '/parents/home',
  };
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
    icon: payload.icon || '/babyeyi-icon.png',
    badge: payload.badge || '/babyeyi-icon.png',
    tag: payload.tag,
    renotify: true,
    data: { url: payload.url || '/lite/shule-avance' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const raw = (event.notification.data && event.notification.data.url) || '/lite/shule-avance';
  const openUrl = new URL(raw, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const c of windowClients) {
        try {
          const same = new URL(c.url).pathname === new URL(openUrl).pathname;
          if (same && 'focus' in c) return c.focus();
        } catch {
          /* ignore malformed client url */
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(openUrl);
      }
      return undefined;
    })
  );
});
