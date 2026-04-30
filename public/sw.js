const CACHE_NAME = 'crousty-hub-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler to satisfy PWA installability requirements
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
