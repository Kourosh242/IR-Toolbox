/* IR-Toolbox — PWA: service worker + install UX (real prompt only, honest iOS guidance). */

let deferredPrompt = null;
const listeners = new Set();

export function onInstallAvailable(fn) { listeners.add(fn); }

export function canInstall() { return !!deferredPrompt; }

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') deferredPrompt = null;
  return outcome === 'accepted';
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone;
}

export function register() {
  if (!('serviceWorker' in navigator)) return;
  // Only register on http(s) — SW won't run on file://.
  if (!/^https?:$/.test(location.protocol)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });

  // v1.3.3: اعمال خودکار اپدیت — بدون پاک‌کردن داده و بدون ریلود دستی.
  // وقتی سرویس‌ورکرِ جدید فعال شد (controllerchange)، صفحه یک‌بار خودکار
  // ریلود می‌شود تا نسخهٔ جدید بالا بیاید؛ داده‌های کاربر (localStorage) دست‌نخورده می‌ماند.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // نخستین نصب: صفحه همین حالا جدید است
    if (sessionStorage.getItem('ir-sw-reloaded')) { sessionStorage.removeItem('ir-sw-reloaded'); return; }
    sessionStorage.setItem('ir-sw-reloaded', '1');
    location.reload();
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });
}
