const CACHE_NAME = 'spoonful-pos-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-192.png',
  '/logo-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Skip caching for non-GET requests (e.g. Supabase POST/PATCH mutations)
  if (e.request.method !== 'GET') {
    return;
  }

  // Skip caching for external APIs, Supabase domain, and Deno edge functions
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // Put response copy in cache for offline support
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(e.request);
      })
  );
});

// Handle incoming Web Push notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Order Alert', body: event.data.text() };
    }
  }

  const title = data.title || 'New Order Received!';
  const options = {
    body: data.body || 'Open the dashboard to view order details.',
    icon: '/logo-192.png',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click to open or focus the PWA
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
