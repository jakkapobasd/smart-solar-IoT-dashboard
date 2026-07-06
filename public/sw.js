const CACHE_NAME = 'lekise-iot-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/public/manifest.json',
  '/public/images/Lekise-icon.png',
  '/public/images/bg_login_lekise.png'
];

// Install Service Worker and Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Initial asset caching skipped, active fetch strategy will cache as we run:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate & Remove Stale Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-First with Network Fallback strategy for app shell assets, API exception
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Exclude API calls and hot reloads from Service Worker caching
  if (requestUrl.pathname.includes('/api/') || requestUrl.hostname.includes('localhost') || requestUrl.pathname.includes('hot-update')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        // Cache newly fetched static assets on the fly
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for offline routing
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Click notification handler to open/focus PWA window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing open window if possible
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Or open a new tab/window if none exists
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Support manual background pushes or other message transfers
self.addEventListener('push', (event) => {
  let data = { title: 'Lekise IoT Notification', body: 'ตรวจพบการอัปเดตระบบหรือสัญญาณไฟ' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Lekise IoT Notification', body: event.data.text() };
    }
  }
  
  const options = {
    body: data.body,
    icon: '/public/images/Lekise-icon.png',
    badge: '/public/images/Lekise-icon.png',
    vibrate: [200, 100, 200],
    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
