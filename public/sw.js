// Only the public offline document and application icons are cached.
// Authenticated HTML, API responses, messages and photos are never cached here.
const STATIC_CACHE = 'riyo-public-shell-v1';
const OFFLINE_URL = '/offline.html';
const STATIC_PATHS = [OFFLINE_URL, '/icons/riyo-192.png', '/icons/riyo-512.png', '/icons/riyo-maskable-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_PATHS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('riyo-public-shell-') && key !== STATIC_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    // A server error retains its actual response; only a network failure falls back.
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(STATIC_CACHE);
      return await cache.match(OFFLINE_URL) || new Response('İnternet bağlantısı gerekiyor.', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
    }));
  } else if (STATIC_PATHS.includes(url.pathname) && !url.search) {
    event.respondWith(caches.open(STATIC_CACHE).then(async cache => await cache.match(request) || fetch(request)));
  }
});

function notificationUrl(value) {
  try {
    const url = new URL(typeof value === 'string' ? value : '/notifications', self.location.origin);
    if (url.origin === self.location.origin && ['http:', 'https:'].includes(url.protocol)) return url.href;
  } catch { /* Use the owned notification center for malformed targets. */ }
  return self.location.origin + '/notifications';
}

// Delivery is not enabled by this worker; a server subscription is still required.
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Generic notification. */ }
  if (!payload || typeof payload !== 'object') payload = {};
  event.waitUntil(self.registration.showNotification('Riyo', {
    // Do not expose sender names or private message previews on a locked device.
    body: 'Riyo’da yeni bir bildirimin var.',
    icon: '/icons/riyo-192.png',
    badge: '/icons/riyo-192.png',
    data: {url: notificationUrl(payload.data?.url)},
    tag: 'riyo-notification'
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = notificationUrl(event.notification.data?.url);
  event.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(async clients => {
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        if (client.url !== url) await client.navigate(url);
        return client.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
