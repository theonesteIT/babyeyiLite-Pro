/* global self, clients */
// Service worker for Web Push (Shule Avance). Served from site root as `/sw.js`.

self.addEventListener('push', (event) => {
  let payload = { title: 'Shule Avance', body: '', tag: 'shule-avance', url: '/dos/shule-avance' };
  try {
    if (event.data) {
      const j = event.data.json();
      payload = {
        title: j.title || payload.title,
        body: j.body || '',
        tag: j.tag || payload.tag,
        url: j.url || payload.url,
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
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag,
    renotify: true,
    data: { url: payload.url || '/dos/shule-avance' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dos/shule-avance';
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
