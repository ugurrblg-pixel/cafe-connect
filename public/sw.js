/// <reference lib="webworker" />

// Service Worker for Push Notifications
const sw = self as unknown as ServiceWorkerGlobalScope;

// Handle push events
sw.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  let data = {
    title: 'Cafe Huddle',
    body: 'Yeni bir bildiriminiz var',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        data: payload.data || data.data,
      };
    }
  } catch (e) {
    console.error('Error parsing push data:', e);
  }

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: data.data,
    vibrate: [100, 50, 100],
    requireInteraction: false,
    tag: 'cafe-huddle-notification',
  };

  event.waitUntil(
    sw.registration.showNotification(data.title, options)
  );
});

// Handle notification click
sw.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing window
        for (const client of clientList) {
          if (client.url.includes(sw.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (sw.clients.openWindow) {
          return sw.clients.openWindow(url);
        }
      })
  );
});

// Handle service worker activation
sw.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(sw.clients.claim());
});

// Handle service worker installation
sw.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  event.waitUntil(sw.skipWaiting());
});

export {};
