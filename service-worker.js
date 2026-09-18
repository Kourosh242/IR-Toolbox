/* IR-Toolbox — service worker: app-shell cache + offline support.
 * Versioned cache, safe update, old-cache cleanup.
 * Never caches sensitive/decrypted content (those live only in memory).
 */
const VERSION = 'ir-v12'; // v1.3.7 — CSP + Worker رگکس + KDF 600k // v1.3.6-fix: صفحات استاتیک SEO/GEO (about · tools · دسته‌ها · ابزارها)
// و اصلاح کش ناوبری — هر آدرس با کلید خودش کش می‌شود، نه زیر './index.html'.
// شمارهٔ کش بالا می‌رود تا کلاینت‌های قبلی کش کهنه (ir-v10) را دور بیندازند.
// نسخهٔ اپ همان 1.3.6 است.
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
  './vendor/jsQR.js',
  './js/url-safety.js',
  './tools/qr-reader.js',
  './tools/fun-data.js',
  './vault/vault.js',
  './vault/file-format.js',
  './vault/crypto-utils.js',
  './assets/fonts/Vazirmatn-var.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  // صفحات استاتیک SEO/GEO (سبک‌اند؛ صفحات ۵۲ ابزار در اولین بازدید کش می‌شوند)
  './css/static.css',
  './about/index.html',
  './tools/index.html',
  './tools/text/index.html',
  './tools/developer/index.html',
  './tools/design/index.html',
  './tools/files/index.html',
  './tools/math/index.html',
  './tools/time/index.html',
  './tools/security/index.html',
  './tools/fun/index.html',
  './tools/brain-games/index.html',
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

  // Navigation: network-first.
  // fix: پیش‌تر پاسخِ هر ناوبری زیر کلید './index.html' ذخیره می‌شد؛ با اضافه‌شدن
  // صفحه‌های /about/ و /tools/ این کار کشِ پوستهٔ اپ را بازنویسی می‌کرد. حالا هر
  // آدرس با کلید خودش کش می‌شود و فقط در نبودِ آن، به پوسته برمی‌گردیم.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
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
