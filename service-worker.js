/* IVA — service worker: app-shell cache + offline support.
 * Versioned cache, safe update, old-cache cleanup.
 * Never caches sensitive/decrypted content (those live only in memory).
 */
const VERSION = 'iva-v1';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/themes.css',
  './css/components.css',
  './css/responsive.css',
  './js/app.js',
  './js/router.js',
  './js/registry.js',
  './js/storage.js',
  './js/ui.js',
  './js/clipboard.js',
  './js/helpers.js',
  './js/search.js',
  './js/pwa.js',
  './assets/fonts/Vazirmatn-var.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Navigation: network-first, fall back to cached shell for offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Same-origin static assets: cache-first with runtime fill.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }
  // Cross-origin: let the network handle it.
});
