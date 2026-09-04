/* IR-Toolbox — service worker: app-shell cache + offline support.
 * Versioned cache, safe update, old-cache cleanup.
 * Never caches sensitive/decrypted content (those live only in memory).
 */
const VERSION = 'ir-v6'; // v1.3.4 — کلاینت‌ها کش قدیمی را دور می‌اندازند و خودکار به‌روز می‌شوند
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
  './js/helpers.js',
  './js/search.js',
  './js/pwa.js',
  './js/clipboard.js',
  './js/helps.js',
  './js/changelog.js',
  './js/jalaali.js',
  './js/hashes-sync.js',
  './tools/text.js',
  './tools/dev.js',
  './tools/design.js',
  './tools/files.js',
  './tools/math.js',
  './tools/time.js',
  './tools/security.js',
  './tools/fun.js',
  './tools/brain.js',
  './tools/qr.js',
  './tools/cron.js',
  './tools/pomodoro.js',
  './tools/lorem.js',
  './tools/passman.js',
  './vendor/qrcode.js',
  './tools/fun-data.js',
  './vault/vault.js',
  './vault/file-format.js',
  './vault/crypto-utils.js',
  './assets/fonts/Vazirmatn-var.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
];

self.addEventListener('install', (e) => {
  // fix: addAll() اتمی است — اگر حتی یک فایل (مثلاً فونت/آیکون) در دسترس نباشد، کل نصب
  // سرویس‌ورکر شکست می‌خورد و اپ هرگز آفلاین نمی‌شد. حالا هر فایل جداگانه کش می‌شود.
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(CORE.map((url) =>
        fetch(url, { cache: 'no-cache' }).then((res) => { if (res && res.ok) return c.put(url, res); })
      )))
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
