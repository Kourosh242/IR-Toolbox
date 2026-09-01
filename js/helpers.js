/* IR-Toolbox — small shared helpers */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const faNum = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[+d]);

/* Number with thousands separators + Persian digits (e.g. ۱۵۰٬۰۰٬۰۰) */
const groupFmt = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 6 });
export const faGroup = (n) => groupFmt.format(Number(n));

export function faBytes(bytes) {
  if (!isFinite(bytes)) return '—';
  const units = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  let i = 0, v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${faNum(v.toFixed(v >= 10 || i === 0 ? 0 : 1))} ${units[i]}`;
}

export const debounce = (fn, ms = 150) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* Highlight query inside text, returning safe HTML with <mark>. */
export function highlight(text, q) {
  const safe = escapeHTML(text);
  if (!q) return safe;
  const qs = escapeHTML(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(new RegExp(qs, 'gi'), (m) => `<mark>${m}</mark>`);
}

export function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
}

export function textBlob(s, mime = 'text/plain') {
  return new Blob([s], { type: `${mime};charset=utf-8` });
}

export function readFileAsText(file) {
  return file.text();
}
export function readFileAsArrayBuffer(file) {
  return file.arrayBuffer();
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return 'هم‌اکنون';
  if (m < 60) return `${faNum(m)} دقیقه پیش`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${faNum(h)} ساعت پیش`;
  return `${faNum(Math.floor(h / 24))} روز پیش`;
}

/* Jalali / Gregorian formatting via Intl (no external lib). */
export const faDate = (d = new Date()) =>
  new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(d);
